# API reference (`/api/v1`)

JSON in, JSON out. Auth is a `session` cookie (httpOnly, 30 days) set by login/register.
Writes from a browser must come from the same origin (`Origin` header checked, 403 otherwise).

Errors: `{ "error": "message" }` with 400 (invalid input, plus `issues`), 401 (not signed in), 403 (forbidden), 404, 409 (conflict), 410 (gone), 422, 429 (rate limited), 502 (Google Sheet unreachable), 500.

Roles: `user` < `admin` < `superuser`. "Admin" below means admin or superuser.

Paginated lists take `limit` (1-100, default 20) and `offset`. Admin lists return `{ items, total }`; public lists return a plain array.

## Public

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | `{ ok: true }` or 503. Checks the database. |
| GET | `/news?lang=en\|kk\|ru` | Published news. Falls back to English. |
| GET | `/news/:slug?lang=` | One published item. |
| GET | `/archives?lang=` | Archive links (`fileUrl`) with title, description and optional `imageUrl`. |
| GET | `/applications?formId=` | Live listings: `{ id, formId, formTitle, applyUrl, data }`. `data` holds only columns marked public; the link column is never in `data`. |
| GET | `/applications/:id` | One live listing. 404 if closed or removed. |

## Accounts

| Method | Path | Body / notes |
|---|---|---|
| POST | `/auth/register` | `{ email, password (10+), fullName }`. Signs in. Limited per IP. |
| POST | `/auth/login` | `{ email, password }`. Limited per IP and email. |
| POST | `/auth/logout` | |
| GET | `/auth/me` | Current user. |
| POST | `/auth/password` | `{ currentPassword, newPassword (10+) }`. Signs out every other session. |
| POST | `/applications/:id/submissions` | Apply. 201; 409 already applied; 410 closed. `external: true` when the listing has `applyUrl`: the student's own claim, never confirmed. |
| GET | `/me/submissions` | Own submissions: `{ id, applicationId, formTitle, status, external, data, listingRemoved, createdAt }`. |

## Admin

All routes need an admin session.

### News: `/admin/news`
- `GET ?limit&offset` list with all translations. `GET /:id`.
- `POST` `{ slug, status?: draft|published|archived, coverImageUrl?, translations: { en (required), kk?, ru? : { title, content } } }`.
- `PATCH /:id` any subset of the same fields; `kk: null` or `ru: null` in `translations` removes that translation (English cannot be removed). `DELETE /:id`.
- `coverImageUrl` must be a URL returned by `POST /admin/images`; `null` removes the cover. Replacing or removing a cover, or deleting the post, deletes the old file.

### Images: `/admin/images`
- `POST` `multipart/form-data` with the field `file`: a JPEG, PNG or WebP up to 4 MB, checked from the file's bytes. `201 { url, contentType, size }`, stored in Vercel Blob. `413` too large, `415` not one of those types.

### Archives: `/admin/archives`
- `GET ?limit&offset`, `GET /:id`.
- `POST` `{ fileUrl, imageUrl?, fileType?, fileSize?, translations: { en (required), kk?, ru? : { title, description? } } }`. An entry is a public link to a file, folder, video or page, with an optional photo.
- The photo: `imageUrl` is a URL from `POST /admin/images`, and `fileType` and `fileSize` are the `contentType` and `size` it returned (required with `imageUrl`). `imageUrl: null` removes the photo; replacing or removing it, or deleting the entry, deletes the old file.
- `PATCH /:id` any subset; `kk: null` or `ru: null` removes that translation, as for news. `DELETE /:id`.

### Forms (Google Sheets): `/admin/forms`
- `GET` list, `GET /:id`.
- `POST` `{ title, googleSheetId (id or full sheet URL), sheetName, keyColumn, linkColumn?, statusColumn?, deadlineColumn? }`.
- `PATCH /:id` any subset, plus `isActive` and `publicColumns: string[]` (every other column becomes private). Send `null` to clear an optional column.
- `DELETE /:id` 409 if it has submissions: deactivate instead.
- `POST /:id/sync` returns `{ total, closed, skipped[{row,reason}], warnings[{row,reason}], removed }`.

How a sync treats rows:
- Sheet must be shared "anyone with the link can view". Hyperlink targets are read from the Link cell.
- `keyColumn` identifies a row. Renaming the key creates a new listing and soft-removes the old one.
- With `statusColumn`: a row with empty status is skipped (notes under the table). Status `expired` closes it.
- With `deadlineColumn`: a `dd.mm.yyyy` date before today (Asia/Almaty) closes the row. `no deadline` is open.
- Closed and removed rows disappear from listings and answer 410 to apply; existing submissions keep showing.
- New columns start private until marked public.
- A sheet with no rows never wipes existing listings (422).

### Submissions: `/admin/submissions`
- `GET ?limit&offset&status=&formId=&q=` (`q` matches name or email). Items: `{ id, status, external, data, createdAt, applicationId, formId, formTitle, user }`.
- `PATCH /:id` `{ status: pending|reviewed|accepted|rejected }`.

### Users: `/admin/users`
- `GET ?limit&offset&q=&role=`, `GET /:id`.
- `POST` `{ email, password (10+), fullName, role?: user|admin }`. Only the superuser may create admins. 409 on duplicate email.
- `PATCH /:id` any of `{ role, isActive, fullName, email, password }`. Rules: not yourself, never the superuser, only the superuser changes roles, admins manage only regular users. Deactivating or changing a password signs the user out.
- `DELETE /:id` superuser only, never self or the superuser. Removes the user's sessions and submissions; news and archives stay.

## Scheduled

`GET /cron/sync-applications` with `Authorization: Bearer $CRON_SECRET`. Syncs every active form, then deletes expired sessions and old rate-limit rows. Runs daily at 20:00 UTC (see `vercel.json`).

## Environment

See `.env.example`. Required in production: `DATABASE_URL`, `CRON_SECRET`, `BLOB_READ_WRITE_TOKEN` (news cover uploads). `SUPERUSER_*` and `GOOGLE_SHEET_*` are used only by `npm run db:seed`.
