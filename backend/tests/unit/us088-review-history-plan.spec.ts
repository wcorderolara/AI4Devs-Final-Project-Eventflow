// Seed demo — plan puro del historial de reseñas (sin BD). Verifica que cada reseña seed tenga una
// reserva confirmada válida (una por reseña, sin repetir categoría confirmada en un evento) y que el
// catálogo de proveedores visibles tenga reseñas variadas.
import { describe, expect, it } from 'vitest';
import { buildReviewHistoryPlan } from '../../src/modules/seed-demo/application/review-history-plan.js';
import {
  CORE_VENDOR_COUNT,
  LOCAL_CURRENCY,
  REVIEW_EVENTS,
  REVIEWER_ORGANIZER_NAMES,
  REVIEWS,
  VENDORS,
  seedCountryOf,
} from '../../src/modules/seed-demo/infrastructure/data/latam-data.js';

// Proveedores fuera del directorio por escenario: 2 oculto, 3 moderado (is_hidden), 4 rechazado.
const NOT_VISIBLE = new Set([2, 3, 4]);
const WORK_LABEL_REGEX = /^[a-zA-Z0-9\-_ ]{1,80}$/;

describe('Seed demo — historial de reseñas', () => {
  const plan = buildReviewHistoryPlan();
  const bookings = plan.flatMap((e) => e.bookings.map((b) => ({ ...b, event: e })));

  it('33 proveedores (30 visibles) con nombres únicos', () => {
    expect(VENDORS).toHaveLength(33);
    expect(CORE_VENDOR_COUNT).toBe(12);
    expect(new Set(VENDORS.map((v) => v.businessName)).size).toBe(VENDORS.length);
    expect(VENDORS.filter((_, i) => !NOT_VISIBLE.has(i))).toHaveLength(30);
  });

  it('cada reseña tiene exactamente una reserva planificada', () => {
    const indices = bookings.map((b) => b.reviewIndex).sort((a, b) => a - b);
    expect(indices).toEqual(REVIEWS.map((_, i) => i));
  });

  it('un evento no repite categoría confirmada y cotiza en la moneda del país del proveedor', () => {
    for (const event of plan) {
      const categories = event.bookings.map((b) => VENDORS[b.vendorIndex]!.categoryCode);
      expect(new Set(categories).size).toBe(categories.length);
      for (const b of event.bookings) {
        const vendor = VENDORS[b.vendorIndex]!;
        expect(seedCountryOf(vendor.locationCode)).toBe(seedCountryOf(event.locationCode));
        expect(event.currency).toBe(LOCAL_CURRENCY[vendor.locationCode]);
        expect(b.amount).toBeGreaterThan(0);
      }
    }
  });

  it('eventos del historial en el pasado, con títulos únicos y organizador existente', () => {
    expect(new Set(REVIEW_EVENTS.map((e) => e.title)).size).toBe(REVIEW_EVENTS.length);
    for (const e of REVIEW_EVENTS) {
      expect(e.daysFromSeed).toBeLessThanOrEqual(-20);
      expect(REVIEWER_ORGANIZER_NAMES[e.organizer]).toBeDefined();
    }
  });

  it('cada proveedor visible tiene entre 2 y 8 reseñas publicadas y los promedios son variados', () => {
    const averages: number[] = [];
    VENDORS.forEach((vendor, i) => {
      if (NOT_VISIBLE.has(i)) return;
      const ratings = REVIEWS.filter((r) => r.vendor === vendor.businessName && (r.status ?? 'published') === 'published').map(
        (r) => r.rating,
      );
      expect(ratings.length, vendor.businessName).toBeGreaterThanOrEqual(2);
      expect(ratings.length, vendor.businessName).toBeLessThanOrEqual(8);
      averages.push(ratings.reduce((a, b) => a + b, 0) / ratings.length);
    });
    expect(Math.min(...averages)).toBeLessThan(2.6);
    expect(Math.max(...averages)).toBeGreaterThan(4.8);
    expect(REVIEWS.filter((r) => (r.status ?? 'published') === 'published' && r.rating <= 2).length).toBeGreaterThanOrEqual(6);
  });

  it('reseñas publicadas sin datos de contacto (sólo las moderadas los traen)', () => {
    const contact = /\d{4}-\d{4}|@|correo|contáct/i;
    for (const r of REVIEWS.filter((x) => (x.status ?? 'published') === 'published')) {
      expect(contact.test(r.comment), r.comment).toBe(false);
    }
  });

  it('los trabajos del portafolio de los proveedores nuevos cumplen el formato de etiqueta', () => {
    for (const v of VENDORS.slice(CORE_VENDOR_COUNT)) {
      expect(v.portfolioWorkLabel).toMatch(WORK_LABEL_REGEX);
    }
  });
});
