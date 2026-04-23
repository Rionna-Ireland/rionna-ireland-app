-- Remove existing duplicate push-log rows before adding the uniqueness guard.
-- We keep the earliest-created row for a given device-level trigger replay key.
DELETE FROM "push_log" AS p
USING (
  SELECT
    ctid,
    ROW_NUMBER() OVER (
      PARTITION BY "organizationId", "expoPushToken", "triggerType", "triggerRefId"
      ORDER BY "createdAt" ASC, id ASC
    ) AS rn
  FROM "push_log"
  WHERE "expoPushToken" IS NOT NULL
    AND "triggerRefId" IS NOT NULL
) AS ranked
WHERE p.ctid = ranked.ctid
  AND ranked.rn > 1;

CREATE UNIQUE INDEX "push_log_dedup_unique_idx"
ON "push_log"("organizationId", "expoPushToken", "triggerType", "triggerRefId")
WHERE "expoPushToken" IS NOT NULL
  AND "triggerRefId" IS NOT NULL;
