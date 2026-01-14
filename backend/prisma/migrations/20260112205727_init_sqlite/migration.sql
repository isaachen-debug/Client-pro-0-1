-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trialStart" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "trialEnd" TIMESTAMP(3),
    "planStatus" TEXT NOT NULL DEFAULT 'TRIAL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "companyName" TEXT,
    "primaryColor" TEXT DEFAULT '#22c55e',
    "avatarUrl" TEXT,
    "preferredTheme" TEXT NOT NULL DEFAULT 'light',
    "preferredLanguage" TEXT NOT NULL DEFAULT 'pt',
    "role" TEXT NOT NULL DEFAULT 'OWNER',
    "companyId" TEXT,
    "whatsappNumber" TEXT,
    "contactPhone" TEXT,
    "reviewLinks" TEXT,
    "companyWebsite" TEXT,
    "companyShowcase" TEXT,
    "helperPayoutMode" TEXT NOT NULL DEFAULT 'FIXED',
    "helperPayoutValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "googleAccessToken" TEXT,
    "googleRefreshToken" TEXT,
    "googleTokenExpiry" TIMESTAMP(3),
    "googleCalendarId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "phone_e164" TEXT,
    "sms_opt_out" BOOLEAN NOT NULL DEFAULT false,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "serviceType" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "defaultPrice" DOUBLE PRECISION,
    "clientPreferences" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "accessToken" TEXT,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "assignedHelperId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "helperFee" DOUBLE PRECISION DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'AGENDADO',
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceRule" TEXT,
    "notes" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "estimatedDurationMinutes" INTEGER,
    "invoiceNumber" TEXT,
    "invoiceToken" TEXT,
    "invoiceSentAt" TIMESTAMP(3),
    "recurrenceSeriesId" TEXT,
    "checklistSnapshot" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "googleEventId" TEXT,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HelperExpense" (
    "id" TEXT NOT NULL,
    "helperId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,

    CONSTRAINT "HelperExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "pdfUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "clientNotes" TEXT,
    "ownerNotes" TEXT,
    "placeholders" TEXT,
    "gallery" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentChecklistItem" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "completedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppointmentChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentPhoto" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "uploadedById" TEXT,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppointmentPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "twilio_numbers" (
    "id" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "is_shared" BOOLEAN NOT NULL DEFAULT true,
    "user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "twilio_numbers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "provider_message_sid" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error_code" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inbound_router_links" (
    "id" TEXT NOT NULL,
    "phone_e164" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "confidence" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inbound_router_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inbound_conflicts" (
    "id" TEXT NOT NULL,
    "from_phone" TEXT NOT NULL,
    "to_phone" TEXT NOT NULL,
    "candidate_user_ids" TEXT NOT NULL,
    "message_preview" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "resolved_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inbound_conflicts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_accessToken_key" ON "Customer"("accessToken");

-- CreateIndex
CREATE INDEX "Customer_phone_e164_idx" ON "Customer"("phone_e164");

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_invoiceToken_key" ON "Appointment"("invoiceToken");

-- CreateIndex
CREATE INDEX "Appointment_recurrenceSeriesId_idx" ON "Appointment"("recurrenceSeriesId");

-- CreateIndex
CREATE INDEX "Appointment_assignedHelperId_idx" ON "Appointment"("assignedHelperId");

-- CreateIndex
CREATE INDEX "Appointment_googleEventId_idx" ON "Appointment"("googleEventId");

-- CreateIndex
CREATE INDEX "HelperExpense_helperId_date_idx" ON "HelperExpense"("helperId", "date");

-- CreateIndex
CREATE INDEX "HelperExpense_ownerId_date_idx" ON "HelperExpense"("ownerId", "date");

-- CreateIndex
CREATE INDEX "Contract_ownerId_clientId_status_idx" ON "Contract"("ownerId", "clientId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_appointmentId_type_key" ON "Transaction"("appointmentId", "type");

-- CreateIndex
CREATE INDEX "AppointmentChecklistItem_appointmentId_idx" ON "AppointmentChecklistItem"("appointmentId");

-- CreateIndex
CREATE INDEX "AppointmentPhoto_appointmentId_idx" ON "AppointmentPhoto"("appointmentId");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "twilio_numbers_phone_number_key" ON "twilio_numbers"("phone_number");

-- CreateIndex
CREATE INDEX "conversations_user_id_customer_id_idx" ON "conversations"("user_id", "customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "messages_provider_message_sid_key" ON "messages"("provider_message_sid");

-- CreateIndex
CREATE INDEX "messages_provider_message_sid_idx" ON "messages"("provider_message_sid");

-- CreateIndex
CREATE INDEX "messages_conversation_id_created_at_idx" ON "messages"("conversation_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "inbound_router_links_phone_e164_key" ON "inbound_router_links"("phone_e164");

-- CreateIndex
CREATE INDEX "inbound_router_links_phone_e164_idx" ON "inbound_router_links"("phone_e164");

-- CreateIndex
CREATE INDEX "inbound_conflicts_status_created_at_idx" ON "inbound_conflicts"("status", "created_at");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_assignedHelperId_fkey" FOREIGN KEY ("assignedHelperId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HelperExpense" ADD CONSTRAINT "HelperExpense_helperId_fkey" FOREIGN KEY ("helperId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HelperExpense" ADD CONSTRAINT "HelperExpense_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentChecklistItem" ADD CONSTRAINT "AppointmentChecklistItem_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentChecklistItem" ADD CONSTRAINT "AppointmentChecklistItem_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentPhoto" ADD CONSTRAINT "AppointmentPhoto_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentPhoto" ADD CONSTRAINT "AppointmentPhoto_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "twilio_numbers" ADD CONSTRAINT "twilio_numbers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

