-- CreateEnum
CREATE TYPE "PurchaseType" AS ENUM ('SUBSCRIPTION', 'ONE_TIME');

-- CreateEnum
CREATE TYPE "NotificationTarget" AS ENUM ('IN_APP', 'EMAIL');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('WELCOME', 'APP_UPDATE');

-- CreateEnum
CREATE TYPE "HorseStatus" AS ENUM ('PRE_TRAINING', 'IN_TRAINING', 'REHAB', 'RETIRED', 'SOLD');

-- CreateEnum
CREATE TYPE "RaceEntryStatus" AS ENUM ('ENTERED', 'DECLARED', 'NON_RUNNER', 'RAN', 'DISQUALIFIED', 'VOID');

-- CreateEnum
CREATE TYPE "DevicePlatform" AS ENUM ('IOS', 'ANDROID');

-- CreateEnum
CREATE TYPE "PushTriggerType" AS ENUM ('HORSE_DECLARED', 'HORSE_NON_RUNNER', 'RACE_RESULT', 'TRAINER_POST', 'NEWS_POST', 'SYSTEM');

-- CreateEnum
CREATE TYPE "PushStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "username" TEXT,
    "role" TEXT,
    "banned" BOOLEAN,
    "banReason" TEXT,
    "banExpires" TIMESTAMP(3),
    "onboardingComplete" BOOLEAN NOT NULL DEFAULT false,
    "paymentsCustomerId" TEXT,
    "locale" TEXT,
    "displayUsername" TEXT,
    "twoFactorEnabled" BOOLEAN,
    "lastActiveOrganizationId" TEXT,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT true,
    "pushPreferences" JSONB NOT NULL DEFAULT '{}',
    "emailPreferences" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,
    "impersonatedBy" TEXT,
    "activeOrganizationId" TEXT,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "password" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "passkey" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "publicKey" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "credentialID" TEXT NOT NULL,
    "counter" INTEGER NOT NULL,
    "deviceType" TEXT NOT NULL,
    "backedUp" BOOLEAN NOT NULL,
    "transports" TEXT,
    "aaguid" TEXT,
    "createdAt" TIMESTAMP(3),

    CONSTRAINT "passkey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "twoFactor" (
    "id" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "backupCodes" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "twoFactor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "logo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "metadata" TEXT,
    "paymentsCustomerId" TEXT,

    CONSTRAINT "organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "circleMemberId" TEXT,
    "circleProvisionedAt" TIMESTAMP(3),
    "circleStatus" TEXT,

    CONSTRAINT "member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT,
    "status" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "inviterId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "userId" TEXT,
    "type" "PurchaseType" NOT NULL,
    "customerId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "priceId" TEXT NOT NULL,
    "status" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "link" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_notification_preference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "target" "NotificationTarget" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_notification_preference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "horse" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "providerEntityId" TEXT,
    "providerLastSync" TIMESTAMP(3),
    "status" "HorseStatus" NOT NULL DEFAULT 'IN_TRAINING',
    "bio" TEXT,
    "trainerNotes" TEXT,
    "photos" JSONB NOT NULL DEFAULT '[]',
    "pedigree" JSONB,
    "ownershipBlurb" TEXT,
    "circleSpaceId" TEXT,
    "trainerId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "latestEntryId" TEXT,
    "nextEntryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "horse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trainer" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "providerEntityId" TEXT,
    "name" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trainer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jockey" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "providerEntityId" TEXT,
    "name" TEXT NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jockey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "providerEntityId" TEXT,
    "name" TEXT NOT NULL,
    "country" TEXT,
    "surface" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meeting" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "providerEntityId" TEXT,
    "courseId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "race" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "providerEntityId" TEXT,
    "meetingId" TEXT NOT NULL,
    "postTime" TIMESTAMP(3) NOT NULL,
    "name" TEXT,
    "raceType" TEXT,
    "distanceFurlongs" INTEGER,
    "className" TEXT,
    "prizeMoney" INTEGER,
    "goingDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "race_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "race_entry" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "providerEntityId" TEXT,
    "horseId" TEXT NOT NULL,
    "raceId" TEXT NOT NULL,
    "status" "RaceEntryStatus" NOT NULL,
    "draw" INTEGER,
    "weightLbs" INTEGER,
    "jockeyId" TEXT,
    "trainerId" TEXT,
    "finishingPosition" INTEGER,
    "beatenLengths" DECIMAL(5,2),
    "ratingAchieved" INTEGER,
    "timeformComment" TEXT,
    "performanceRating" INTEGER,
    "starRating" INTEGER,
    "notifiedStates" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "race_entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news_post" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "featuredImageUrl" TEXT,
    "contentJson" JSONB NOT NULL,
    "contentHtml" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "notifyMembersOnPublish" BOOLEAN NOT NULL DEFAULT false,
    "notificationSentAt" TIMESTAMP(3),
    "authorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "news_post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_token" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expoPushToken" TEXT NOT NULL,
    "deviceLabel" TEXT,
    "platform" "DevicePlatform" NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_log" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "expoPushToken" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "triggerType" "PushTriggerType" NOT NULL,
    "triggerRefId" TEXT,
    "status" "PushStatus" NOT NULL DEFAULT 'QUEUED',
    "error" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stripe_event_log" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stripe_event_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_username_key" ON "user"("username");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE INDEX "passkey_userId_idx" ON "passkey"("userId");

-- CreateIndex
CREATE INDEX "passkey_credentialID_idx" ON "passkey"("credentialID");

-- CreateIndex
CREATE INDEX "twoFactor_secret_idx" ON "twoFactor"("secret");

-- CreateIndex
CREATE INDEX "twoFactor_userId_idx" ON "twoFactor"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "organization_slug_key" ON "organization"("slug");

-- CreateIndex
CREATE INDEX "member_organizationId_idx" ON "member"("organizationId");

-- CreateIndex
CREATE INDEX "member_userId_idx" ON "member"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "member_organizationId_userId_key" ON "member"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "invitation_organizationId_idx" ON "invitation"("organizationId");

-- CreateIndex
CREATE INDEX "invitation_email_idx" ON "invitation"("email");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_subscriptionId_key" ON "purchase"("subscriptionId");

-- CreateIndex
CREATE INDEX "purchase_subscriptionId_idx" ON "purchase"("subscriptionId");

-- CreateIndex
CREATE INDEX "notification_userId_idx" ON "notification"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_notification_preference_userId_type_target_key" ON "user_notification_preference"("userId", "type", "target");

-- CreateIndex
CREATE UNIQUE INDEX "horse_latestEntryId_key" ON "horse"("latestEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "horse_nextEntryId_key" ON "horse"("nextEntryId");

-- CreateIndex
CREATE INDEX "horse_organizationId_publishedAt_idx" ON "horse"("organizationId", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "horse_organizationId_slug_key" ON "horse"("organizationId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "horse_organizationId_providerEntityId_key" ON "horse"("organizationId", "providerEntityId");

-- CreateIndex
CREATE INDEX "trainer_organizationId_name_idx" ON "trainer"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "trainer_organizationId_providerEntityId_key" ON "trainer"("organizationId", "providerEntityId");

-- CreateIndex
CREATE UNIQUE INDEX "jockey_organizationId_providerEntityId_key" ON "jockey"("organizationId", "providerEntityId");

-- CreateIndex
CREATE UNIQUE INDEX "course_organizationId_providerEntityId_key" ON "course"("organizationId", "providerEntityId");

-- CreateIndex
CREATE INDEX "meeting_organizationId_date_idx" ON "meeting"("organizationId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "meeting_organizationId_providerEntityId_key" ON "meeting"("organizationId", "providerEntityId");

-- CreateIndex
CREATE INDEX "race_organizationId_postTime_idx" ON "race"("organizationId", "postTime");

-- CreateIndex
CREATE UNIQUE INDEX "race_organizationId_providerEntityId_key" ON "race"("organizationId", "providerEntityId");

-- CreateIndex
CREATE INDEX "race_entry_organizationId_status_idx" ON "race_entry"("organizationId", "status");

-- CreateIndex
CREATE INDEX "race_entry_horseId_status_idx" ON "race_entry"("horseId", "status");

-- CreateIndex
CREATE INDEX "race_entry_raceId_idx" ON "race_entry"("raceId");

-- CreateIndex
CREATE UNIQUE INDEX "race_entry_organizationId_providerEntityId_key" ON "race_entry"("organizationId", "providerEntityId");

-- CreateIndex
CREATE INDEX "news_post_organizationId_publishedAt_idx" ON "news_post"("organizationId", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "news_post_organizationId_slug_key" ON "news_post"("organizationId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "push_token_expoPushToken_key" ON "push_token"("expoPushToken");

-- CreateIndex
CREATE INDEX "push_token_userId_idx" ON "push_token"("userId");

-- CreateIndex
CREATE INDEX "push_log_organizationId_createdAt_idx" ON "push_log"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "push_log_triggerType_triggerRefId_idx" ON "push_log"("triggerType", "triggerRefId");

-- CreateIndex
CREATE INDEX "stripe_event_log_type_processedAt_idx" ON "stripe_event_log"("type", "processedAt");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "passkey" ADD CONSTRAINT "passkey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "twoFactor" ADD CONSTRAINT "twoFactor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member" ADD CONSTRAINT "member_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member" ADD CONSTRAINT "member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase" ADD CONSTRAINT "purchase_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase" ADD CONSTRAINT "purchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_notification_preference" ADD CONSTRAINT "user_notification_preference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "horse" ADD CONSTRAINT "horse_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "horse" ADD CONSTRAINT "horse_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "trainer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainer" ADD CONSTRAINT "trainer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jockey" ADD CONSTRAINT "jockey_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course" ADD CONSTRAINT "course_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting" ADD CONSTRAINT "meeting_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting" ADD CONSTRAINT "meeting_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "race" ADD CONSTRAINT "race_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "race" ADD CONSTRAINT "race_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "meeting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "race_entry" ADD CONSTRAINT "race_entry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "race_entry" ADD CONSTRAINT "race_entry_horseId_fkey" FOREIGN KEY ("horseId") REFERENCES "horse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "race_entry" ADD CONSTRAINT "race_entry_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "race"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "race_entry" ADD CONSTRAINT "race_entry_jockeyId_fkey" FOREIGN KEY ("jockeyId") REFERENCES "jockey"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "race_entry" ADD CONSTRAINT "race_entry_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "trainer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_post" ADD CONSTRAINT "news_post_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_post" ADD CONSTRAINT "news_post_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_token" ADD CONSTRAINT "push_token_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_log" ADD CONSTRAINT "push_log_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
