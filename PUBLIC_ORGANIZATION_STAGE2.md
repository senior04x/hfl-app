# SPECTATOR-001 — public organization choice, stage 2

Date: 2026-10-25. Branch: feature/public-organization-choice.

## Local implementation

- Authenticated personal Telegram users (`role=user`, `appUserId`) must choose an organization before the main navigator mounts. Persisted choice is hydrated first.
- Choice is keyed to the personal account. Missing, invalid or another account's choice cannot imply organization 1.
- Home, Calendar, News and Tournaments share the public choice. Sports profiles keep their profile organization; anonymous guest behavior remains separate.
- The existing Tournaments dropdown changes the choice. Organization switches remount the content navigator, clearing old screen state and returning to the initial tab.
- Organization lists load 20 rows per page plus one lookahead. Public competition lists load at most 20 leagues and 20 tournaments per page. Errors offer retries; no fake organizations are inserted.
- Match, news and slider queries use the selected organization. News cache keys include organization; Home/Calendar caches already include organization and user scope.
- This content preference grants no membership or admin access. Auth, RLS, migrations, native build settings and production environments were not changed.

## Verification

- 28 local mocked tests passed: selection, account isolation, malformed persisted choices, bounded queries, organization-specific news cache/matches, member scope, API cache, Calendar cache, Home realtime and player paging.
- TypeScript: 13 diagnostics in the baseline and 13 after changes; no new diagnostics. Full-project type checking is not green.
- Anonymous read-only checks confirmed requested organization/news columns exist (HTTP 200); no writes, OTPs or notifications were sent.
- Local SDK57 iOS and Android exports passed. The first online CLI export stalled and was cancelled; direct offline CI exports completed.

## Device check (pending)

In this checkout run `npx expo start` with an SDK57-compatible test client.

1. A personal Telegram account without a saved choice must see the picker first. Choose an organization; inspect Home, Tournaments, Calendar and News.
2. Switch to another organization from Tournaments. The initial tab opens with its content; revisit all four tabs and check old content is absent. Close/reopen and confirm the choice persists.
3. Switch accounts: another personal account must not inherit the previous choice. A player/manager account must retain its own organization.
4. Test offline loading/retry and an organization with no competitions/news.

No OTA or store submission was made. Existing SDK54 TestFlight/Play installations will not receive this local code. After device review, backport this feature to both SDK54 release worktrees while preserving their scorer pagination and realtime fixes, export, and release as a separate stage.

Existing Home slider aggregation still reads organization-wide datasets. This stage scopes those queries but does not replace that aggregation or prove 50,000 concurrent-user capacity.
