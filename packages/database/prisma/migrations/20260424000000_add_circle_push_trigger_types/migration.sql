-- AlterEnum: extend PushTriggerType with Circle-origin categories (S6-01 T10)
ALTER TYPE "PushTriggerType" ADD VALUE 'CIRCLE_MENTION';
ALTER TYPE "PushTriggerType" ADD VALUE 'CIRCLE_REPLY';
ALTER TYPE "PushTriggerType" ADD VALUE 'CIRCLE_REACTION';
ALTER TYPE "PushTriggerType" ADD VALUE 'CIRCLE_DM';
ALTER TYPE "PushTriggerType" ADD VALUE 'CIRCLE_HORSE_DISCUSSION';
