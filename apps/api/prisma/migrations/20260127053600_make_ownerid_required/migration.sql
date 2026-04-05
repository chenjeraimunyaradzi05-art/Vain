-- 1) Ensure placeholder owner exists
INSERT INTO "User" ("id", "email", "userType", "createdAt", "updatedAt", "name")
VALUES ('business_owner_placeholder', 'no-owner@system.local', 'MEMBER', NOW(), NOW(), 'No Owner')
ON CONFLICT ("id") DO NOTHING;

-- 2) Backfill existing businesses to reference placeholder owner
UPDATE "Business" SET "ownerId" = 'business_owner_placeholder' WHERE "ownerId" IS NULL;

-- 3) Drop old foreign key if present
ALTER TABLE "Business" DROP CONSTRAINT IF EXISTS "Business_ownerId_fkey";

-- 4) Make ownerId NOT NULL
ALTER TABLE "Business" ALTER COLUMN "ownerId" SET NOT NULL;

-- 5) Add foreign key constraint with RESTRICT on delete to avoid accidental deletions
ALTER TABLE "Business" ADD CONSTRAINT "Business_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 6) Ensure index exists
CREATE INDEX IF NOT EXISTS "Business_ownerId_idx" ON "Business"("ownerId");
