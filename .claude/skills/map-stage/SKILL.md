---
name: map-stage
description: Run one stage of docs/plans/world-map.md through the implementer→reviewer harness (stage-implementer on Sonnet 5.5 low, stage-reviewer on Opus 5.5 high). Use when the user types /map-stage <N> or asks to run/continue a world-map stage.
---

# /map-stage <N>

The main session runs this loop itself. It does not write the stage code.

## Preconditions

- `docs/plans/world-map.md` has a section for stage N.
- Earlier stages are approved by the user. Check `git log` and ask if unclear.
- `.env.test.local` exists and sets both `DATABASE_URL` and `DATABASE_URL_UNPOOLED` to the Neon scratch branch. Never read its values into the conversation. To check, use `grep -c '^DATABASE_URL\(_UNPOOLED\)\?=' .env.test.local`, which should print `2`.

## Loop (max 3 rounds)

1. **Implement**: spawn the `stage-implementer` agent with the prompt `Implement stage N of docs/plans/world-map.md.` Keep its agent ID.
2. **Review**: spawn a **fresh** `stage-reviewer` agent with the prompt `Review stage N of docs/plans/world-map.md against the current working tree.` Don't pass it the implementer's receipt.
3. **Decide**:
   - On `VERDICT: PASS`, go to Report.
   - On `VERDICT: FIX`, `SendMessage` the numbered findings verbatim to the same implementer ID. Then go back to step 2 with a fresh reviewer.
   - After round 3 still FIX, stop. Report the remaining findings to the user and ask how to proceed.

## Report to the user

- Stage N: PASS after K rounds, or BLOCKED.
- `git diff --stat`.
- Gate results from the last reviewer run.
- Acceptance checklist from the last reviewer run, with any `[?]` UNVERIFIED items called out. UI stages need a `/run` check by the main session.
- Implementer deviations and open questions.

Then stop. Don't start stage N+1 and don't commit until the user says so.
