// Rutas de catálogos (US-009). Solo `/api/v1/locations` — público y sólo lectura (decisión PO
// 2026-10-14): el directorio público de proveedores filtra por ciudad. Es data de referencia sin
// datos personales. Sin body.
//
// El endpoint `/api/v1/event-types` fue movido en US-076 (PB-P1-043) al nuevo módulo
// `event-catalog` (`publicEventTypeRouter`) con shape superset spec-compliant. Este archivo
// conserva únicamente `locationsRouter` porque `Location` no tuvo su propio módulo CRUD todavía.
import { Router } from 'express';
import { asyncHandler } from '../../../shared/interface/http/async-handler.js';
import { PrismaLocationRepository } from '../infrastructure/prisma-catalog.repository.js';
import { ListActiveLocationsUseCase } from '../application/list-locations.use-case.js';
import { CatalogController } from './catalog.controller.js';

const locationRepo = new PrismaLocationRepository();

const controller = new CatalogController({
  listLocations: new ListActiveLocationsUseCase(locationRepo),
});

export const locationsRouter = Router();
locationsRouter.get('/', asyncHandler(controller.listLocations));
