// ExpireQuoteRequestsJob (US-055 / BE-004). Tech Spec §7 Job. AC-01, AC-02. Jitter
// `JOBS_EXPIRE_QUOTE_REQUESTS_JITTER_MAX_MS` (el cron coincide con `ExpireQuotesJob` a las
// 01:00 UTC); logs `quote_request.expired.run.*` (ver `ExpireBatchJob`).
import type { ExpireQuoteRequestsUs055UseCase } from '../modules/quote-flow/application/expire-quote-requests.us055.use-case.js';
import { ExpireBatchJob, type ExpireBatchJobDeps } from './expire-batch.job.js';

export type ExpireQuoteRequestsJobDeps = ExpireBatchJobDeps<ExpireQuoteRequestsUs055UseCase>;

export class ExpireQuoteRequestsJob extends ExpireBatchJob {
  protected readonly eventPrefix = 'quote_request';
}
