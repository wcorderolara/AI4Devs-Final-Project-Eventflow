# Runbook — RDS PostgreSQL gestionado (US-137 / PB-P2-023)

> Provisión, seguridad (security group), backups/snapshots, `DATABASE_URL` (SSM), migraciones en
> el pipeline y **restore** de la base de datos de EventFlow.
> Fuente de verdad de diseño: `docs/21-Deployment-and-DevOps-Design.md` §11 · ADR-DB-001.
> Artefacto versionado: [`infra/rds/provision-rds.sh`](../../infra/rds/provision-rds.sh).

## Estado actual (2026-07-24)

| Dato | Valor |
| --- | --- |
| Instancia | `eventflow-db` — `db.t4g.micro`, PostgreSQL 16, gp3 20GB, **Single-AZ**, región `us-east-1` |
| Bases de datos | `eventflow_demo` y `eventflow_qa` (misma instancia — decisión de topología) |
| Backups | automáticos, retención **7 días** |
| Acceso | **publicly-accessible + security group `eventflow-rds-sg`** restringido a la IP del operador (129.222.59.144/32) + el backend (App Runner SG) |
| Secreto | `DATABASE_URL` por ambiente en **SSM Parameter Store** SecureString: `/eventflow/demo/DATABASE_URL`, `/eventflow/qa/DATABASE_URL` |

> **Nota de postura de red (decisión usuario 2026-07-24):** RDS es publicly-accessible con SG
> restringido por IP para permitir migraciones desde el operador y verificación en vivo. Es una
> **deviación documentada y reversible** de "sin acceso público" (SEC-04). Endurecimiento futuro:
> RDS privada + VPC connector de App Runner (SG dedicado, sin IP pública).

---

## 1. Provisión (OPS-001/OPS-002 · AC-01/AC-02)

[`infra/rds/provision-rds.sh`](../../infra/rds/provision-rds.sh) (idempotente): crea el SG restringido,
la instancia RDS (Single-AZ, gp3, backups 7d) y guarda `DATABASE_URL` en SSM. La contraseña se
genera fuera y **nunca se imprime**.

```bash
AWS_REGION=us-east-1 DB_PASSWORD="$(openssl rand -hex 24)" bash infra/rds/provision-rds.sh
```

Añadir el backend a la allowlist del SG (cuando exista el SG de App Runner, US-136):
`BACKEND_SG=sg-xxxx` como env, o `aws ec2 authorize-security-group-ingress ... --source-group sg-xxxx`.

**DoD:** RDS provisionada; SG solo permite operador + backend; sin acceso público abierto.

---

## 2. Bases de datos y migraciones (OPS-003 · AC-03/AC-04)

Crear la 2ª base (la instancia crea `eventflow_demo` inicial):

```bash
DEMO_URL="$(aws ssm get-parameter --name /eventflow/demo/DATABASE_URL --with-decryption --query Parameter.Value --output text --region us-east-1)"
docker run --rm postgres:16 psql "$DEMO_URL" -c 'CREATE DATABASE eventflow_qa'
```

Aplicar migraciones Prisma contra cada ambiente (desde `backend/`):

```bash
cd backend
DATABASE_URL="$(aws ssm get-parameter --name /eventflow/demo/DATABASE_URL --with-decryption --query Parameter.Value --output text --region us-east-1)" npx prisma migrate deploy
DATABASE_URL="$(aws ssm get-parameter --name /eventflow/qa/DATABASE_URL   --with-decryption --query Parameter.Value --output text --region us-east-1)" npx prisma migrate deploy
```

- **Pool Prisma moderado:** `DATABASE_URL` incluye `connection_limit=5` (acorde a App Runner min1/max3).
- **CI valida** migraciones (`prisma migrate diff` / `migrate status`) — job `migrations-validate` en
  `.github/workflows/pr.yml` (US-139, pre-existente).
- **Pipeline aplica** (`prisma migrate deploy`) — paso `migrate` en
  [`.github/workflows/deploy-backend.yml`](../../.github/workflows/deploy-backend.yml) antes del deploy.
- **Migración destructiva** requiere plan documentado (Doc 21 §11.3 / VR-04 / EC-02).

**DoD:** migraciones aplicadas contra RDS; validadas en CI; pool moderado.

---

## 3. `DATABASE_URL` en SSM (SEC-001 · AC-03)

- Guardada como **SecureString** en SSM Parameter Store (`/eventflow/<env>/DATABASE_URL`), cifrada
  con KMS; **nunca** en repo/imagen/logs (SEC-02/SEC-03).
- El backend (App Runner, US-136) la referencia como secreto de runtime; el frontend nunca accede
  a la BD (Doc 21 §11.8).
- Recuperar (sin imprimir en scripts): `aws ssm get-parameter --name /eventflow/demo/DATABASE_URL --with-decryption`.
- Rotación: cambiar la master password en RDS + `aws ssm put-parameter --overwrite`.

**DoD:** `DATABASE_URL` en SSM; acceso externo bloqueado por SG; sin secretos en logs.

---

## 4. Backups y snapshots (OPS-002 · AC-02)

- **Backups automáticos:** retención 7 días (`--backup-retention-period 7`).
- **Snapshot manual** antes de cambios mayores / pre-demo:
  ```bash
  aws rds create-db-snapshot --db-instance-identifier eventflow-db \
    --db-snapshot-identifier eventflow-db-pre-<motivo>-$(fecha) --region us-east-1
  ```

**DoD:** backups automáticos habilitados; snapshot manual posible.

---

## 5. Restore (DOC-001 · AC-05)

Ante incidente de datos (Doc 21 §11.4):

1. **Restaurar snapshot a una NUEVA instancia** (no sobrescribe la actual):
   ```bash
   aws rds restore-db-instance-from-db-snapshot --region us-east-1 \
     --db-instance-identifier eventflow-db-restored \
     --db-snapshot-identifier <snapshot-id> \
     --db-instance-class db.t4g.micro --no-multi-az --publicly-accessible \
     --vpc-security-group-ids <sg-id>
   aws rds wait db-instance-available --db-instance-identifier eventflow-db-restored --region us-east-1
   ```
2. **Rotar `DATABASE_URL`** al nuevo endpoint:
   ```bash
   NEW_EP="$(aws rds describe-db-instances --db-instance-identifier eventflow-db-restored --query 'DBInstances[0].Endpoint.Address' --output text --region us-east-1)"
   # reconstruir la URL con el nuevo endpoint y put-parameter --overwrite en SSM (sin imprimir)
   ```
3. **Redeploy del backend** (App Runner toma la nueva `DATABASE_URL`).
4. Verificar (`/health/ready` 200) y, si todo OK, retirar la instancia vieja.

**DoD:** procedimiento de restore documentado (snapshot → nueva instancia → rotar `DATABASE_URL`).

---

## 6. Estrategia por entorno (DOC-001)

Se adoptó **una instancia `eventflow-db` con dos bases** (`eventflow_demo`, `eventflow_qa`) —
mismo cluster, DBs distintas (Tech Spec §16, opción de menor costo para MVP). Aislamiento lógico por
base; cada ambiente usa su propia `DATABASE_URL` en SSM. Alternativa (mayor aislamiento/costo):
instancias separadas — no elegida para el MVP.

---

## 7. Documentation Alignment (DOC-001)

- **Prioridad P0 → P2:** la metadata original marcaba P0; el backlog ubica PB-P2-023 en **P2**
  (fuente autoritativa). Reconciliado en la US.
- **Estrategia por entorno:** resuelta (1 instancia, 2 DBs).
- **Secrets Manager (PB-P2-024):** se usó **SSM Parameter Store** (dentro del set permitido
  "Secrets Manager/SSM"). Migrar a Secrets Manager cuando exista PB-P2-024, si se decide.
- **Postura de red:** publicly-accessible + SG por IP (deviación documentada, §Estado).

---

## 8. Checklist (operador)

- [x] Instancia RDS Single-AZ provisionada; SG restringido.
- [x] Backups automáticos 7 días.
- [x] `DATABASE_URL` (demo/qa) en SSM SecureString.
- [ ] Bases `eventflow_demo` + `eventflow_qa` creadas; migraciones aplicadas.
- [ ] Backend (App Runner, US-136) añadido a la allowlist del SG.
- [ ] Verificado `/health/ready` 200 desde el backend.
- [ ] Restore probado (opcional pre-demo).
