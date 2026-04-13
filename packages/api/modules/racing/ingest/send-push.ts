/**
 * Push notification bridge
 *
 * Re-exports from the push service module. This file originally held
 * a no-op stub for S2-04 — the real implementation now lives in
 * packages/api/modules/push/service.ts.
 *
 * Existing callers (ingest worker, news publish) import from here
 * so we keep this re-export for backwards compatibility.
 */

export { sendPush, type PushRequest as SendPushParams } from "../../push/service";
