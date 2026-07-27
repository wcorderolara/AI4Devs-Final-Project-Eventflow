// Controller — Directorio público de vendors. Monta `GET /public/vendors`.
//
// Es el listado equivalente al perfil público por slug (US-046): misma superficie anónima, misma
// política de caché. Reutiliza `SearchVendorsUseCase` y `toVendorCardResponse` del directorio
// autenticado (US-045) — el filtro «sólo `approved` y no borrados» vive en el repository y es el
// mismo, así que no hay una segunda definición de qué vendor es visible.
//
// Diferencias respecto al controller autenticado:
//   - `currentUser: null` — sin sesión no hay vendor a quien auto-excluir (SEC-03 no aplica).
//   - `Cache-Control` en el happy path, igual que `PublicVendorController`: es contenido público
//     y cacheable, y evita que cada crawler golpee la base.
//
// El shape de respuesta es idéntico al autenticado a propósito: los campos que expone
// (`businessName`, `locationCode`, `categories`, `ratingAvg`, `reviewsCount`, `priceRange`) ya son
// públicos hoy en `GET /public/vendors/:slug` para cualquier visitante. No se amplía la
// exposición de datos; sólo se permite descubrirlos sin conocer el slug de antemano.
import type { Request, Response } from 'express';
import { success } from '../../../shared/response/success.js';
import type { SearchVendorsUseCase } from '../application/search-vendors.use-case.js';
import type { SearchVendorsQuery } from './dto/search-vendors.query.js';
import {
  toVendorCardResponse,
  type VendorSearchResponse,
} from './dto/search-vendors.response.js';

const CACHE_CONTROL_HEADER = 'public, max-age=60, stale-while-revalidate=300';

export class PublicVendorSearchController {
  constructor(private readonly useCase: SearchVendorsUseCase) {}

  search = async (req: Request, res: Response): Promise<void> => {
    const query = req.validated?.query as SearchVendorsQuery;

    const result = await this.useCase.execute({ currentUser: null, query });

    const body: VendorSearchResponse = {
      items: result.items.map(toVendorCardResponse),
      page: result.page,
    };

    res.setHeader("Cache-Control", CACHE_CONTROL_HEADER);
    res.status(200).json(success(body, req.correlationId ?? ""));
  };
}
