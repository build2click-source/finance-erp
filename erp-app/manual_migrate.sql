-- Add columns to ERP.invoices
ALTER TABLE "ERP"."invoices" ADD COLUMN IF NOT EXISTS "consignee_id" UUID;
ALTER TABLE "ERP"."invoices" ADD COLUMN IF NOT EXISTS "buyer_id" UUID;
ALTER TABLE "ERP"."invoices" ADD COLUMN IF NOT EXISTS "delivery_note" TEXT;
ALTER TABLE "ERP"."invoices" ADD COLUMN IF NOT EXISTS "delivery_note_date" DATE;
ALTER TABLE "ERP"."invoices" ADD COLUMN IF NOT EXISTS "payment_terms" TEXT;
ALTER TABLE "ERP"."invoices" ADD COLUMN IF NOT EXISTS "suppliers_ref" TEXT;
ALTER TABLE "ERP"."invoices" ADD COLUMN IF NOT EXISTS "other_ref" TEXT;
ALTER TABLE "ERP"."invoices" ADD COLUMN IF NOT EXISTS "buyers_order_no" TEXT;
ALTER TABLE "ERP"."invoices" ADD COLUMN IF NOT EXISTS "buyers_order_date" DATE;
ALTER TABLE "ERP"."invoices" ADD COLUMN IF NOT EXISTS "dispatch_doc_no" TEXT;
ALTER TABLE "ERP"."invoices" ADD COLUMN IF NOT EXISTS "dispatched_through" TEXT;
ALTER TABLE "ERP"."invoices" ADD COLUMN IF NOT EXISTS "destination" TEXT;
ALTER TABLE "ERP"."invoices" ADD COLUMN IF NOT EXISTS "terms_of_delivery" TEXT;
ALTER TABLE "ERP"."invoices" ADD COLUMN IF NOT EXISTS "bank_details" TEXT;
ALTER TABLE "ERP"."invoices" ADD COLUMN IF NOT EXISTS "pan_no" TEXT;

-- Add columns to ERP.invoice_lines
ALTER TABLE "ERP"."invoice_lines" ADD COLUMN IF NOT EXISTS "per" TEXT;

-- Add sub_type to ERP.accounts
ALTER TABLE "ERP"."accounts" ADD COLUMN IF NOT EXISTS "sub_type" TEXT;
