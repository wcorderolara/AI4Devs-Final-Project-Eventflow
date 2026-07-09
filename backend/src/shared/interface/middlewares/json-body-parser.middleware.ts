// jsonBodyParserMiddleware (US-091 / BE-003, Global). Doc 14 §8.2.
// Parseo de body JSON con límite `JSON_BODY_LIMIT`. Un body que excede el límite produce un
// error de body-parser que el errorHandlerMiddleware mapea a 400.
import express, { type RequestHandler } from 'express';
import { config } from '../../../config/env.js';

export const jsonBodyParserMiddleware: RequestHandler = express.json({ limit: config.JSON_BODY_LIMIT });
