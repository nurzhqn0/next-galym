ALTER TABLE "archives" ADD COLUMN "image_url" text;--> statement-breakpoint
-- file_type and file_size now describe the optional photo; the document values saved before that mean nothing now.
UPDATE "archives" SET "file_type" = NULL, "file_size" = NULL;--> statement-breakpoint
-- The seminar recordings folder used to be hard-coded in the pages; it is now an ordinary archive entry.
WITH a AS (
  INSERT INTO "archives" ("file_url") VALUES ('https://drive.google.com/drive/folders/1J3BJJuPv-uovWnG4IUEjy-ZcWCPNYHCs?usp=sharing') RETURNING "id"
)
INSERT INTO "archive_translations" ("archive_id", "locale", "title", "description")
SELECT a."id", v."locale"::"locale", v."title", v."description"
FROM a, (VALUES
  ('en', 'Seminar recordings', 'The recordings of Next Galym seminars, in a shared Google Drive folder.'),
  ('kk', 'Семинар жазбалары', 'Next Galym семинарларының жазбалары ортақ Google Drive қалтасында.'),
  ('ru', 'Записи семинаров', 'Записи семинаров Next Galym в общей папке Google Drive.')
) AS v("locale", "title", "description");
