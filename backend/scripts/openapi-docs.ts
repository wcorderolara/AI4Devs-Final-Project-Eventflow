// Documentación local/demo (US-098 / BE-003, AC-06). Genera backend/openapi-docs.html (gitignored)
// que renderiza el snapshot con Redoc, consumiendo ./openapi.json (fuente única, sin contrato manual).
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { writeFileSync, existsSync } from 'node:fs';

const here = dirname(fileURLToPath(import.meta.url));
if (!existsSync(resolve(here, '../openapi.json'))) {
  console.error('[openapi] Falta backend/openapi.json. Ejecuta: npm run openapi:generate');
  process.exit(1);
}
const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>EventFlow API — OpenAPI</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <redoc spec-url="./openapi.json"></redoc>
    <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
  </body>
</html>
`;
const out = resolve(here, '../openapi-docs.html');
writeFileSync(out, html, 'utf8');
console.info('[openapi] docs listo: abre backend/openapi-docs.html (Redoc consume ./openapi.json)');
