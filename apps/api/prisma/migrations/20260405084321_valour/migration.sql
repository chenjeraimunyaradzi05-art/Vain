-- CreateTable
CREATE TABLE "UserPurpose" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "primary" TEXT NOT NULL,
    "secondary" TEXT,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPurpose_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessInvoice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientEmail" TEXT,
    "clientPhone" TEXT,
    "clientAddress" TEXT,
    "clientAbn" TEXT,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'AUD',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "termsAndConditions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessInvoiceLineItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessInvoiceLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessInvoicePayment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'BANK_TRANSFER',
    "reference" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BusinessInvoicePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RadarRule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "employmentType" TEXT,
    "salaryMin" INTEGER,
    "salaryMax" INTEGER,
    "skills" JSONB,
    "industries" JSONB,
    "keywords" TEXT,
    "matchScore" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RadarRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RadarMatch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "radarRuleId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "matchScore" DOUBLE PRECISION NOT NULL,
    "matchedSkills" JSONB,
    "matchedLocation" BOOLEAN NOT NULL,
    "matchedSalary" BOOLEAN NOT NULL,
    "matchedKeywords" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RadarMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RadarNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "radarRuleId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "actionUrl" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RadarNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RadarDigest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalMatches" INTEGER NOT NULL DEFAULT 0,
    "newMatches" INTEGER NOT NULL DEFAULT 0,
    "updatedMatches" INTEGER NOT NULL DEFAULT 0,
    "sampleJobs" JSONB NOT NULL,
    "sentAt" TIMESTAMP(3),
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RadarDigest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserPurpose_userId_key" ON "UserPurpose"("userId");

-- CreateIndex
CREATE INDEX "UserPurpose_userId_idx" ON "UserPurpose"("userId");

-- CreateIndex
CREATE INDEX "UserPurpose_primary_idx" ON "UserPurpose"("primary");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessInvoice_invoiceNumber_key" ON "BusinessInvoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "BusinessInvoice_userId_idx" ON "BusinessInvoice"("userId");

-- CreateIndex
CREATE INDEX "BusinessInvoice_status_idx" ON "BusinessInvoice"("status");

-- CreateIndex
CREATE INDEX "BusinessInvoice_dueDate_idx" ON "BusinessInvoice"("dueDate");

-- CreateIndex
CREATE INDEX "BusinessInvoiceLineItem_invoiceId_idx" ON "BusinessInvoiceLineItem"("invoiceId");

-- CreateIndex
CREATE INDEX "BusinessInvoicePayment_invoiceId_idx" ON "BusinessInvoicePayment"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "RadarRule_userId_key" ON "RadarRule"("userId");

-- CreateIndex
CREATE INDEX "RadarRule_userId_idx" ON "RadarRule"("userId");

-- CreateIndex
CREATE INDEX "RadarRule_isActive_idx" ON "RadarRule"("isActive");

-- CreateIndex
CREATE INDEX "RadarMatch_userId_expiresAt_idx" ON "RadarMatch"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "RadarMatch_matchScore_idx" ON "RadarMatch"("matchScore");

-- CreateIndex
CREATE UNIQUE INDEX "RadarMatch_userId_jobId_radarRuleId_key" ON "RadarMatch"("userId", "jobId", "radarRuleId");

-- CreateIndex
CREATE INDEX "RadarNotification_userId_isRead_idx" ON "RadarNotification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "RadarNotification_userId_type_idx" ON "RadarNotification"("userId", "type");

-- CreateIndex
CREATE INDEX "RadarDigest_userId_sentAt_idx" ON "RadarDigest"("userId", "sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "RadarDigest_userId_date_key" ON "RadarDigest"("userId", "date");

-- AddForeignKey
ALTER TABLE "UserPurpose" ADD CONSTRAINT "UserPurpose_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessInvoiceLineItem" ADD CONSTRAINT "BusinessInvoiceLineItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "BusinessInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessInvoicePayment" ADD CONSTRAINT "BusinessInvoicePayment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "BusinessInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RadarRule" ADD CONSTRAINT "RadarRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RadarMatch" ADD CONSTRAINT "RadarMatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RadarNotification" ADD CONSTRAINT "RadarNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RadarDigest" ADD CONSTRAINT "RadarDigest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
