CREATE TYPE "public"."application_status" AS ENUM('open', 'closed');--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "title" varchar(300);--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "category" varchar(200);--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "apply_url" text;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "deadline" date;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "status" "application_status" DEFAULT 'open' NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "fields" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "created_by" uuid;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
-- Listings that came from a Google Sheet become ordinary applications. "dd.mm.yyyy" becomes a real date; an impossible one stays out.
CREATE FUNCTION pg_temp.safe_date(t text) RETURNS date LANGUAGE plpgsql AS $$
DECLARE d date;
BEGIN
  IF t IS NULL OR t !~ '^\s*\d{1,2}\.\d{1,2}\.\d{4}\s*$' THEN RETURN NULL; END IF;
  d := to_date(btrim(t), 'DD.MM.YYYY');
  IF extract(day FROM d)::int <> split_part(btrim(t), '.', 1)::int THEN RETURN NULL; END IF;
  RETURN d;
EXCEPTION WHEN others THEN RETURN NULL;
END $$;--> statement-breakpoint
UPDATE "applications" a SET
  "title" = coalesce(nullif(btrim(a."data" ->> f."key_column"), ''), f."title"),
  "category" = f."title",
  "apply_url" = nullif(btrim(coalesce(a."data" ->> f."link_column", '')), ''),
  "deadline" = pg_temp.safe_date(a."data" ->> f."deadline_column"),
  "status" = (CASE WHEN a."removed_at" IS NOT NULL OR NOT f."is_active" THEN 'closed' ELSE 'open' END)::"application_status",
  "created_by" = f."created_by",
  "created_at" = a."parsed_at",
  "fields" = coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'label', c ->> 'header',
      'type', 'text',
      'value', a."data" ->> (c ->> 'header'),
      'public', coalesce((c ->> 'public')::boolean, false)
    ) ORDER BY ord)
    FROM jsonb_array_elements(f."schema_definition" -> 'columns') WITH ORDINALITY AS t(c, ord)
    WHERE c ->> 'header' IS DISTINCT FROM f."key_column"
      AND c ->> 'header' IS DISTINCT FROM f."link_column"
      AND c ->> 'header' IS DISTINCT FROM f."status_column"
      AND coalesce(btrim(a."data" ->> (c ->> 'header')), '') <> ''
      AND NOT (c ->> 'header' IS NOT DISTINCT FROM f."deadline_column"
               AND (pg_temp.safe_date(a."data" ->> (c ->> 'header')) IS NOT NULL
                    OR lower(btrim(a."data" ->> (c ->> 'header'))) = 'no deadline'))
  ), '[]'::jsonb)
FROM "application_forms" f WHERE f."id" = a."form_id";--> statement-breakpoint
-- A student's saved answer keeps the same public values, now as title, category and ordered fields.
UPDATE "application_submissions" s SET "data_snapshot" = jsonb_build_object(
  'title', coalesce(nullif(btrim(s."data_snapshot" ->> f."key_column"), ''), a."title"),
  'category', f."title",
  'fields', coalesce((
    SELECT jsonb_agg(jsonb_build_object('label', c ->> 'header', 'type', 'text', 'value', s."data_snapshot" ->> (c ->> 'header')) ORDER BY ord)
    FROM jsonb_array_elements(f."schema_definition" -> 'columns') WITH ORDINALITY AS t(c, ord)
    WHERE c ->> 'header' IS DISTINCT FROM f."key_column"
      AND coalesce(btrim(s."data_snapshot" ->> (c ->> 'header')), '') <> ''
  ), '[]'::jsonb)
)
FROM "applications" a JOIN "application_forms" f ON f."id" = a."form_id"
WHERE a."id" = s."application_id";--> statement-breakpoint
ALTER TABLE "applications" ALTER COLUMN "title" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" DROP CONSTRAINT "applications_form_id_application_forms_id_fk";
--> statement-breakpoint
DROP INDEX "applications_form_key_uq";--> statement-breakpoint
DROP INDEX "applications_form_order_idx";--> statement-breakpoint
ALTER TABLE "applications" DROP COLUMN "form_id";--> statement-breakpoint
ALTER TABLE "applications" DROP COLUMN "external_key";--> statement-breakpoint
ALTER TABLE "applications" DROP COLUMN "row_number";--> statement-breakpoint
ALTER TABLE "applications" DROP COLUMN "data";--> statement-breakpoint
ALTER TABLE "applications" DROP COLUMN "removed_at";--> statement-breakpoint
ALTER TABLE "applications" DROP COLUMN "parsed_at";--> statement-breakpoint
DROP TABLE "application_forms" CASCADE;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "applications_status_deadline_idx" ON "applications" USING btree ("status","deadline");
