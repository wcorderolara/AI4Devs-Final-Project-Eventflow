// ExpireQuotesJob (US-053 / BE-002). Tech Spec §7 Job. AC-02. Jitter
// `JOBS_EXPIRE_QUOTES_JITTER_MAX_MS`; logs `quote.expired.run.*` (ver `ExpireBatchJob`).
import type { ExpireQuotesUs053UseCase } from '../modules/quote-flow/application/expire-quotes.us053.use-case.js';
import { ExpireBatchJob, type ExpireBatchJobDeps } from './expire-batch.job.js';

export type ExpireQuotesJobDeps = ExpireBatchJobDeps<ExpireQuotesUs053UseCase>;

export class ExpireQuotesJob extends ExpireBatchJob {
  protected readonly eventPrefix = 'quote';
}
