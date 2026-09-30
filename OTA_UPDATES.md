# AMATORA OTA updates

The app uses the existing EAS Update project and channels in `eas.json`.
The bottom banner appears only when a compatible update is available or downloaded.
It does not appear in Expo Go, development mode, or on the website.
Native startup checks remain enabled. Additional foreground checks are limited
to once per 30 minutes, with no polling. The banner reserves layout space and
safe-area padding so it does not cover the navigation bar.

## Verify before production

1. Build and install a **release** APK for the preview channel:
   `npx eas-cli build --platform android --profile preview`.
   This requires an EAS login and may consume build quota.
2. Publish this banner to preview before testing a subsequent update:
   `npx eas-cli update --channel preview --platform android --message "Preview update banner"`.
   If the installed preview build predates the banner, reopen it to apply the
   downloaded update first. Expo Go cannot validate OTA delivery.
3. Make a small visible JS-only change, then publish another update to preview.
   Keep the app version, SDK, native dependencies and runtime unchanged.
4. Cold-start the app with internet. Wait for the native update check/download;
   verify the orange banner in light/dark mode and Uzbek/Russian/English.
5. Tap Update app. Confirm the app restarts and the visible change is present.
6. For a download failure, disconnect before tapping an available, undownloaded
   update. Confirm a friendly retry message and that normal navigation works.
   A fully downloaded pending update should restart even while offline.
7. Repeated taps must trigger only one download/restart. Confirm the banner
   disappears when no update is available. Repeat on an iOS preview release build.

Only after device verification, publish the tested JS/assets to production:
`npx eas-cli update --channel production --message "Describe tested changes"`.
Do not publish a bundle containing unrelated unfinished working-tree changes.
Check channel-to-branch mappings in EAS and the installed build's channel/runtime
when delivery fails; preview and production are separate.

## Compatibility and rollback

Current runtime policy is appVersion. SDK or native-library changes require a
new native build and a distinct compatible runtime. Do not reuse runtime 1.0.0
for a different native SDK. OTA updates change JS/assets, not the installed SDK.
Keep a known-good update in EAS; use the EAS dashboard's rollback/republish tools
for the affected channel if a published update has a regression. Do not alter
authentication, signing credentials or production build profiles for this flow.

Automated failure/concurrency checks:
`node --test tests/otaUpdateActions.test.cjs`.
These checks do not prove live EAS delivery, native reload, or device layout.
