# World map for the applications page

Goal: the public `/[lang]/applications` page gets an interactive 2D world map (server-rendered SVG). Clicking a country filters the list below it to the live listings for that country. The selection lives in the URL as `?country=XX` (ISO 3166-1 alpha-2). An "Online / Any" chip (`?country=none`) shows listings that have no country.

Harness: run each stage with `/map-stage <N>`. `stage-implementer` (Sonnet 5.5, low effort) builds it. `stage-reviewer` (Opus 5.5, high effort) reviews it. The user approves each stage before the next one starts.

## Shared rules

- Follow `CLAUDE.md`: minimal code, surgical diffs, match existing style.
- Locales are `en`, `ru`, `kk` (not `kz`). Dictionaries live in `app/[lang]/dictionaries/{en,ru,kk}.ts`.
- Country codes are uppercase ISO alpha-2. Country names are never stored; render them with `Intl.DisplayNames([lang], { type: "region" })`.
- DB commands use the Neon scratch branch only: `set -a; source .env.test.local; set +a; <command>`. Never inline or print connection strings. Never run migrations or backfill against production.
- Standard gates:
  - `npm run lint`
  - `npx tsc --noEmit`
  - `set -a; source .env.test.local; set +a; npx vitest run <files>`
  - `npm run build`, when listed.
- Design language is `DESIGN.md` ("The Answer Sheet"):
  - Colors are gold stock `#ffd576` and one crimson ink, `ink` `#a8042b`, with `ink-deep` for text.
  - Structure comes from rules, not shadows or cards.
  - The active state uses the `.on-ink` inversion.
- Reuse what exists:
  - In `lib/services/applications.ts`: `liveWhere()`, `publicShape`, the Zod `base` / `values()`.
  - In `lib/data.ts`: the `"use cache"` + `cacheTag("applications")` + `cacheLife("minutes")` pattern.
  - In `lib/application-import.ts`: `ALIASES` / `addField`.
  - `tests/helpers.ts` for DB tests.
  - `.label`, `.bubble` and `.on-ink` in `app/globals.css`.
- `AnswerRow` and `PageShell` stay unchanged.

---

## Stage 1 — Country data layer

Gives listings a real `countries` column, filtering, and counts. Backfills the column from the existing `Location` custom field.

**Files**
- `lib/countries.ts` (new, isomorphic, no `server-only`):
  - `ALPHA2_TO_NUMERIC: Record<string, string>` for all ISO 3166-1 countries. world-atlas features use numeric ids such as `"756"`; keep the zero-padded 3-digit strings.
  - `isCountryCode(code): boolean`.
  - `countryName(code, lang): string` via `Intl.DisplayNames`.
  - `parseCountries(text: string): { codes: string[]; unknown: string[] }`:
    - Splits on `&`, `,`, `/`, `;`, ` and `, ` и `, then trims and matches case-insensitively.
    - Matches against a reverse map built from `Intl.DisplayNames` in `en` and `ru` over all codes, plus aliases: USA, US, United States of America, UK, Great Britain, UAE, South Korea, North Korea, Russia, Czech Republic, Turkey/Türkiye, Iran, Vietnam, Taiwan, Hong Kong.
    - Non-country tokens map to nothing and are not counted as unknown: `online`, `remote`, `-`, `—`, empty, `any`, `worldwide`, `онлайн`.
    - Dedupes while keeping order.
- `lib/db/schema.ts` (applications table, around line 126):
  - Add `countries: varchar("countries", { length: 2 }).array().notNull().default(sql\`'{}'::varchar[]\`)`.
  - Add a GIN index `applications_countries_idx`.
- `drizzle/0005_*.sql` plus the journal and snapshot via `npm run db:generate`. drizzle-kit can prompt interactively; if it does, hand-write the SQL and the journal entry to match the 0004 conventions.
- `scripts/backfill-countries.ts`:
  - For every application, read the value of the field whose label is `Location` (case-insensitive) and run `parseCountries`.
  - Print a table: title, Location, codes, unknown.
  - Writes `countries` only when passed `--apply`, and only for rows whose `countries` is empty.
- `lib/services/applications.ts`:
  - `listListings(limit, offset, country?: string)`:
    - `country` is either an alpha-2 code, which filters with `= ANY(countries)`, or `"none"`, which filters with `cardinality(countries) = 0`.
    - Anything else is ignored.
    - Always combine with `liveWhere()`.
  - `publicShape` includes `countries`.
  - New `countryCounts(): Promise<{ countries: { code: string; count: number }[]; none: number }>` over live listings, sorted by count desc then code.
  - The Zod `base` gets `countries: z.array(z.string().refine(isCountryCode)).max(30).optional()`, uppercasing input first. `values()` maps it, deduped.
- `lib/data.ts`:
  - `openApplications(limit, country?)` keeps the cache pattern; the arguments become part of the cache key.
  - New `openCountryCounts()` uses the same cache pattern.
  - Confirm that the admin create, update, delete and import paths already revalidate the `applications` tag.
- `app/api/v1/applications/route.ts`: optional `country` query param, validated (alpha-2 or `none`). Invalid values get the repo's usual 400 shape.
- `components/answer-row.tsx`: add `countries: string[]` to the `Listing` type only if tsc requires it. No visual change.
- Tests:
  - New `tests/countries.test.ts`, covering at least:
    - "Switzerland" → CH
    - "Singapore & Japan" → SG, JP
    - "USA" → US
    - "Online" → nothing
    - "-" → nothing
    - "Швейцария" → CH
    - "Narnia" → unknown
    - duplicates deduped
  - Extend `tests/applications.test.ts`:
    - the country filter
    - `none` filter
    - closed or expired listings excluded from filter and counts
    - counts
    - invalid code rejected on create

**Acceptance**
- The migration applies cleanly on the scratch branch, and existing rows get `{}`.
- The backfill dry-run on the scratch branch maps the 9 existing listings:
  - KAUST → SA
  - OIST → JP
  - Yessenov → none
  - EPFL ×2 → CH
  - NUS → SG, JP
  - Caltech → US
  - Max Planck → DE
  - USTC → CN
  - Zero unknowns.
- `--apply` on the scratch branch writes them.
- All gates pass.

**Gates**
- lint
- tsc
- vitest `tests/countries.test.ts tests/applications.test.ts tests/import.test.ts`
- `set -a; source .env.test.local; set +a; npm run db:migrate`
- the backfill dry-run, then `--apply`, on the scratch branch.

---

## Stage 2 — Admin form and import/export

Lets admins set countries by hand and through CSV/Markdown import, and puts them in the export.

**Files**
- `components/admin/application-form.tsx`:
  - Add a country multi-select: a text input that filters the localized country list (`countryName` over `ALPHA2_TO_NUMERIC` keys), with picked countries shown as removable chips.
  - Add `countries` to `ApplicationInitial` and the payload.
  - Keyboard: Enter picks the first match, Backspace on an empty input removes the last chip.
- `app/[lang]/admin/applications/[id]/page.tsx`: pass the initial `countries`.
- `lib/application-import.ts`:
  - `ApplicationDraftInput` gets `countries: string[]` and `unknownCountries: string[]`.
  - `ALIASES` gets `countries: ["country", "countries", "страна", "страны", "ел"]`, parsed with `parseCountries`.
  - If a row has no country column but has a `Location` field, derive countries from it, and keep `Location` as a custom field.
  - `toCsv` adds a `Country` column, codes joined with `; `.
- `components/admin/import-applications.tsx`:
  - The preview shows the resolved codes per row.
  - `unknownCountries` appear as a visible warning on that row and are not silently dropped.
  - Update the built-in examples to include a `Country` column on at least one example.
- `lib/services/applications.ts`: `listAdminApplications`, `exportApplications` and the import schema include `countries`.
- `app/[lang]/dictionaries/{en,ru,kk}.ts`: admin strings for the country field label, the placeholder and the unknown-country warning.
- `tests/import.test.ts`: Country column parsing, Location fallback, unknown warning, and a CSV export round-trip.

**Acceptance**
- Create, edit, import and export all round-trip `countries`.
- An unknown country name shows a warning in the import preview.
- The form works with keyboard only.
- All gates pass.

**Gates**
- lint
- tsc
- vitest `tests/import.test.ts tests/applications.test.ts`

---

## Stage 3 — Public country filter (no globe yet)

Delivers a working, JS-free filter UI. It ships on its own and stays as the accessible fallback once the globe is added.

**Files**
- `app/[lang]/applications/page.tsx`:
  - Read `searchParams.country` inside a child component wrapped in `<Suspense>`, as required by `cacheComponents`.
  - Normalize the value: an uppercase valid code, `none`, or undefined.
  - Pass it to `openApplications(100, country)`.
  - Render `CountryFilter` above the list.
  - When a filter is active and nothing matches, show the existing empty-state box with `emptyCountry` copy.
- `components/country-filter.tsx` (new, server component):
  - A `<nav aria-label={mapLabel}>` of plain `<a href>` links:
    - "All"
    - one chip per country from `openCountryCounts()`, showing the localized name and count
    - "Online / Any" with the `none` count, hidden when the count is 0
  - The active link uses `aria-current="page"` and the `.on-ink` inversion.
- `app/[lang]/dictionaries/{en,ru,kk}.ts`, `open` block: `all`, `online`, `emptyCountry`, `mapLabel`.

**Acceptance**
- `/en/applications?country=CH` shows only live Swiss listings.
- `?country=none` shows only live listings without countries.
- `?country=zz` and `?country=XX` (not a real code) show everything, with "All" active.
- `?country=ch` (lowercase) works like `CH`.
- Works with JS disabled.
- Country names are localized on `/ru` and `/kk`.
- The build passes, and the page remains partially prerendered: the static shell plus the dynamic list sits under Suspense.

**Gates**
- lint
- tsc
- `npm run build`
- Main session: `/run` and check `/en/applications`, `?country=CH`, `?country=none`, and `/ru/applications?country=JP`.

---

## Stage 4 — 2D world map

The user asked for a flat 2D map instead of the 3D globe on 2026-11-18. It is server-rendered SVG: no WebGL, no three.js, and it works with JS disabled.

**Deps** (exact majors):
- `world-atlas@^2`
- `topojson-client@^3`
- `d3-geo@^3`
- dev: `@types/topojson-client`, `@types/d3-geo`
- Do NOT add `three`, `@react-three/*` or any client map library.

**Files**
- `components/applications-map.tsx` (new, server component, no `"use client"`):
  - Props: `counts: { code: string; count: number }[]`, `selected?: string`, `lang`, `labels: Record<string, string>` (code → localized name, only for codes in `counts`).
  - **Geometry, computed once per process** (module-level cache, not per request):
    - Import `world-atlas/countries-110m.json` and convert it with `topojson-client` `feature()`.
    - Drop Antarctica (numeric id `010`).
    - Map each numeric feature id to alpha-2 via the inverse of `ALPHA2_TO_NUMERIC`. Features with no mapping are drawn as plain land.
    - Project with `geoEqualEarth().fitSize([960, 500], collection)`, and build path strings with `geoPath(projection).digits(1)` to keep the HTML small.
  - **Render**: `<svg viewBox="0 0 960 500" className="w-full h-auto">`, one `<path>` per country.
    - Land with no listings: fill `--color-stock-deep`, not interactive.
    - Countries with listings: fill `--color-ink`, wrapped in `next/link` `<Link href={`/${lang}/applications?country=${code}`} scroll={false}>`.
      - If the country is `selected`, the link instead goes to `/${lang}/applications` (clears the filter) and the path is filled `--color-ink-deep`.
      - Hover/focus-visible: fill `--color-ink-deep`.
    - Borders: stroke `--color-stock` at about 0.5px, `vector-effect: non-scaling-stroke`.
    - Each linked country has an SVG `<title>` with "{localized name} — {count}", which gives the native hover tooltip.
    - No ocean fill (the page `stock` background shows through). No graticule.
  - **Accessibility**: the chips stay the accessible path. Put `aria-hidden="true"` on the `<svg>`, and `tabIndex={-1}` on the map links, so keyboard and screen-reader users don't get duplicate links.
- `app/[lang]/applications/page.tsx`: render `<ApplicationsMap>` above `CountryFilter` inside the existing Suspense'd `Listings`, passing counts, the normalized selection, `lang` and `labels`. Build `labels` on the server only for the codes in `counts` (use `countryName`).
- `package.json` / lockfile: the deps listed above.

**Acceptance**
- `/en/applications` shows the map; countries with live listings are crimson and others are muted gold.
- Clicking Switzerland goes to `?country=CH` without a scroll jump, the list shows EPFL, and Switzerland is drawn `ink-deep`.
- Clicking Switzerland again clears the filter.
- Clicking a country with no listings does nothing (it is not a link).
- Hovering Japan shows the native tooltip with its localized name and count (`/ru` → Япония).
- Works with JS disabled: the map links are plain anchors in server HTML.
- No map JS in the client bundle: no `"use client"`, and `world-atlas` / `d3-geo` are not in any client chunk.
- The page stays partially prerendered (◐) in the build output.
- No console errors.

**Gates**
- lint
- tsc
- `set -a; source .env.test.local; set +a; npm run build`
- Main session: `/run`, check at 1280px and 390px, click Switzerland twice, check the console.

---

## Stage 5 — Polish, performance, docs

**Files**
- `components/applications-map.tsx`, `app/[lang]/applications/page.tsx`:
  - Mobile: at 390px the map stays readable and doesn't overflow horizontally; tune spacing above the chips.
  - Measure the HTML weight the SVG adds to `/en/applications`. If it's over ~150 KB uncompressed, lower `digits` or simplify.
- `docs/API.md`: the `country` query param and `countries` in the public listing shape, plus the admin create, update, import and export fields.
- `docs/ERD.mermaid`: the `countries` column.
- `DESIGN.md`: a short "Map" component entry covering colors, states, and that the chips are the accessible path.

**Acceptance**
- No horizontal overflow at 390px.
- Docs match the code.
- The full test suite passes on the scratch branch.
- `npm run build` passes.
- No map code ships to the client.

**Gates**
- lint
- tsc
- `set -a; source .env.test.local; set +a; npm test`
- `set -a; source .env.test.local; set +a; npm run build`
- Main session: `/run` screenshots. Optionally pass them to `impeccable-finish-reviewer`.

---

## Production rollout (manual, after all stages)

The user approves each step explicitly:
1. `set -a; source .env.local; set +a; npm run db:migrate` against production. drizzle.config.ts no longer falls back to `.env.local`. 0005 is already on `main` (applied by accident on 2026-11-18), so this is a no-op unless later stages add migrations.
2. Run the backfill dry-run against production (load `.env.local` the same way) and show its output to the user.
3. Run `--apply`.
