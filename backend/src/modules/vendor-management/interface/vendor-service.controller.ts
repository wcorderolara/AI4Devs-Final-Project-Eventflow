// Controller — VendorService (US-044 / BE-007). Delgado, delega en use cases.
import type { Request, Response } from 'express';
import { z } from 'zod';
import { success } from '../../../shared/response/index.js';
import { UnauthorizedError } from '../../../shared/domain/errors/unauthorized.error.js';
import type { CreateVendorServiceUseCase } from '../application/create-vendor-service.use-case.js';
import type { UpdateVendorServiceUseCase } from '../application/update-vendor-service.use-case.js';
import type { DeactivateVendorServiceUseCase } from '../application/deactivate-vendor-service.use-case.js';
import type { ListVendorServicesUseCase } from '../application/list-vendor-services.use-case.js';
import type { CreateVendorServiceRequest } from './dto/create-vendor-service.request.js';
import type { UpdateVendorServiceRequest } from './dto/update-vendor-service.request.js';
import {
  toVendorServiceResponse,
  type VendorServiceListResponse,
} from './dto/vendor-service.response.js';
import { ValidationError } from '../../../shared/domain/errors/validation.error.js';
import { ErrorCodes } from '../../../shared/domain/errors/error-codes.js';

const UUID_SCHEMA = z.string().uuid();

function requireUserId(req: Request): string {
  const id = req.user?.id;
  if (typeof id !== 'string' || id.length === 0) throw new UnauthorizedError();
  return id;
}

function extractServiceId(req: Request): string {
  const raw = req.params.id;
  const parsed = UUID_SCHEMA.safeParse(raw);
  if (!parsed.success) {
    throw new ValidationError('service id must be a valid UUID', [
      { field: 'id', message: ErrorCodes.INVALID_UUID },
    ]);
  }
  return parsed.data;
}

export interface VendorServiceUseCases {
  create: CreateVendorServiceUseCase;
  update: UpdateVendorServiceUseCase;
  deactivate: DeactivateVendorServiceUseCase;
  list: ListVendorServicesUseCase;
}

export class VendorServiceController {
  constructor(private readonly uc: VendorServiceUseCases) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const result = await this.uc.list.execute({ vendorUserId: requireUserId(req) });
    const body: VendorServiceListResponse = { items: result.items.map(toVendorServiceResponse) };
    res.status(200).json(success(body, req.correlationId ?? ''));
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const body = req.validated?.body as CreateVendorServiceRequest;
    const result = await this.uc.create.execute(
      { vendorUserId: requireUserId(req), body },
      { correlationId: req.correlationId },
    );
    res
      .status(201)
      .json(success(toVendorServiceResponse(result.service), req.correlationId ?? ''));
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const body = req.validated?.body as UpdateVendorServiceRequest;
    const result = await this.uc.update.execute(
      {
        vendorUserId: requireUserId(req),
        serviceId: extractServiceId(req),
        body,
      },
      { correlationId: req.correlationId },
    );
    res
      .status(200)
      .json(success(toVendorServiceResponse(result.service), req.correlationId ?? ''));
  };

  deactivate = async (req: Request, res: Response): Promise<void> => {
    await this.uc.deactivate.execute(
      {
        vendorUserId: requireUserId(req),
        serviceId: extractServiceId(req),
      },
      { correlationId: req.correlationId },
    );
    res.status(204).end();
  };
}
