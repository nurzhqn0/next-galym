# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Primary: students applying to the program, often on phones. They arrive to learn who Next Galym is, see what is open, and apply. Secondary audiences (parents, partners, press) are not yet confirmed.

## Product Purpose
Next Galym is a program people apply to. The site presents the program, publishes news and an archive of documents, shows results, and lists open applications that signed-in users can apply to. Success: an applicant finds an open application and applies.

## Positioning
Own words, from the public Instagram bio (@nextgalym, read 2026-11-04): "A bridge for future galyms." The kind of program (grant, fellowship, olympiad, scholarship) is still unconfirmed, though the account has highlights named "Activities" and "Scholarships". Do not state a program type or any claim beyond the bio.

## Operating Context
- Open applications are rows in a Google Sheet that admins edit. The site mirrors them, shows only columns marked public, and lets a signed-in user apply with one click.
- Admins publish news and archive documents and review submissions.
- Three languages: English (default), Kazakh, Russian.
- Some listings are external opportunities: the Sheet row may carry a link; the student opens it, then marks "I applied" so it stays tracked on their account (self-reported, never shown as confirmed). Rows without a link use on-site Apply.

## Capabilities and Constraints
- Next.js 16 app with a Neon Postgres backend and /api/v1 endpoints (already built).
- Landing sections in fixed order: CTA, About us, Results, News, Login, Archive, Footer. Header: Logo | About us | Results | News | Applications | Archives | Log In.
- Results content is static in code, not in the database.
- Stack is fixed (Next.js, Tailwind 4); not open for re-decision.

## Open decisions
- The site does not mention Galym Project (@galymnet, galym.net) until the user confirms how Next Galym relates to it.

## Brand Commitments
Logos are supplied: public/nextGalym-01.svg and public/nextGalym-02.svg. Both use crimson #a8042b and gold #ffd576 in swapped proportions, so one suits a gold-dominant and the other a crimson-dominant background.

## Evidence on Hand
Supplied by the user: the two logos, and the Instagram account https://www.instagram.com/nextgalym/ as the source to draw from.
Read from that page (2026-11-04, third-party content, verified only as far as the page shows it):
- Display name "Galym"; bio "A bridge for future galyms. Archive for seminar recordings is below".
- Bio link: a Google Drive folder of seminar recordings, https://drive.google.com/drive/folders/1J3BJJuPv-uovWnG4IUEjy-ZcWCPNYHCs?usp=sharing
- Story highlights: "Activities", "Scholarships". Posts are tagged "Galym Project" and "Galym"; no captions were readable.
- Reel, 2026-09-16, @nextgalym caption: "The next era of NextGalym has officially begun." (hashtags #NextGalym #NextGen #InnovationStartsHere #FutureLeaders).
- A post dated 2026-10-15, tagged to both @nextgalym and @galymnet (a separate foundation account), announces a 2027 young-scientists grant competition run by a government science committee, with applications on an external electronic system. This shows some listings will be external opportunities. It is another organisation's information: not quoted on the site.
- Follower counts are not used: they change and prove nothing about the program.
Still absent: About text beyond the tagline, results figures, testimonials, photos, Kazakh and Russian copy. The user chose to have copy drafted for approval. Every draft is marked as draft, and all numbers and named outcomes stay blank.

## Product Principles
- Applicants come first: the route from landing to an open application is always visible.
- Nothing unsupplied is stated as fact: figures, names and claims stay blank until the user provides them.
- Equal quality in all three languages, with real Kazakh and Russian typography.
- Fast and usable on a phone.
- Use the program's own words ("a bridge for future galyms") over invented slogans.

## Accessibility & Inclusion
No product-specific standard was stated. Default to WCAG AA. Kazakh needs a typeface that covers its Cyrillic extensions.
