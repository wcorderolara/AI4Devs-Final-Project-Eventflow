export { ApiError, type ApiErrorInit } from './ApiError';
export { parseErrorEnvelope, type ParsedErrorEnvelope } from './parseErrorEnvelope';
export {
  attachCorrelationId,
  generateCorrelationId,
  CORRELATION_ID_HEADER,
} from './attachCorrelationId';
export {
  httpGet,
  httpPost,
  httpPatch,
  httpPut,
  httpDelete,
  httpGetData,
  httpPostData,
  httpPatchData,
  httpPutData,
  httpDeleteData,
  unwrap,
  type Envelope,
} from './httpClient';
export type { HttpClientOptions } from './types';
