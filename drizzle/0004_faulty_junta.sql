ALTER TYPE "public"."user_role" ADD VALUE 'ATENDENTE';--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "active" boolean DEFAULT true NOT NULL;