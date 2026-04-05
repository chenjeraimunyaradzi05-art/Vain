-- Add nullable ownerId to Business so existing rows won't fail
ALTER TABLE "Business" ADD COLUMN "ownerId" TEXT;

-- Add index for lookups by owner
CREATE INDEX "Business_ownerId_idx" ON "Business"("ownerId");

-- Add foreign key: set to NULL if the user is deleted
ALTER TABLE "Business" ADD CONSTRAINT "Business_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
