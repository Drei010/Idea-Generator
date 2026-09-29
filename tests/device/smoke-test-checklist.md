# Native smoke tests

Record physical-device results independently from the simulator and mobile browser tests.

| Check | iPhone physical | Android physical | iOS simulator |
|---|---|---|---|
| App launches | Pending | Pending | Pass |
| Scene renders, no blank canvas | Pending | Pending | Failed: blank GL canvas on iOS 27.0 |
| Cabinet fits screen | Pending | Pending | Pending |
| All labels readable, no clipping | Pending | Pending | Pending |
| Touch lever responds | Pending | Pending | Pending: tap did not trigger |
| Short pull resets without spinning | Pending | Pending | Pending |
| Full pull triggers once | Pending | Pending | Pending |
| Reels animate and stop accurately | Pending | Pending | Pending |
| Selected text matches visible reel | Pending | Pending | Pending |
| Loading state appears | Pending | Pending | Pending: generation was not triggered |
| Live generation succeeds | Pending | Pending | Pending |
| Retry preserves selection | Pending | Pending | Pending |
| Orientation and layout remain usable | Pending | Pending | Pending |
| No key in client logs/bundle | Pending logs | Pending logs | Bundle checked |

Earlier run: Expo SDK 57 on iPhone 17 simulator, iOS 26.5. The native screen rendered with a blank GL scene; tapping the spin control did not change state. A paired physical iPhone was locked/unavailable, and Android SDK/ADB/emulator were absent.

## Audio crash fix (2026-09-28)

The native player rate update now uses `setPlaybackRate()`. The spin-audio state effect no longer pauses its player during teardown, and pending sound seeks check that the screen is still active before playback.

| Check | iOS | Android |
|---|---|---|
| Native bundle export | Pass | Pass |
| Expo Go launch without audio exception | Pass on iPhone 18 Pro simulator (iOS 27.0, Metro port 8082); port 8081 served a stale bundle | Pending: no emulator/device available |
| 3D scene rendering | Main scene remains blank; separate GL diagnostic logged unsupported `EXT_color_buffer_float` | Pending native run |
| Spin, settle, mute, reload, background/resume | Pending: simulator UI automation timed out before interaction | Pending native run |
| Native screenshots and logs | Captured 8082 blank-canvas screen; Metro showed no playback-rate or pause exception after loading the current bundle | Pending native run |

Screenshots: `test-screenshots/native-ios-18-pro-stale-8081-redbox.png` shows the old bundle; `test-screenshots/native-ios-18-pro-current-8082-magenta-canvas.png` is the GL diagnostic probe; `tests/device/artifacts/ios-18-pro-8082-blank-canvas.png` shows the app after the audio fix with the unresolved blank scene. A paired iPhone 15 was visible to CoreDevice but was in use, so physical-device verification remains pending.

Automated regression coverage: getter-only playback-rate mock, settling speed/reset, and delayed seek after screen teardown. TypeScript and all 28 unit/integration tests pass; iOS and Android Expo exports pass. The previous Playwright run passed 53 tests with 3 expected skips across Chromium, Firefox, WebKit, and mobile browser emulation. A rerun on 2026-09-28 timed out before executing tests because its Expo web server could not start while port 8081 was held by the existing Metro process; a separate web-server start on port 8083 also did not bind in this restricted session. These browser checks do not verify native Expo Go player disposal.

## Casino layout and lever update (2026-09-29)

- Cabinet-body width and receipt width now share the same scale; stacked layouts align their centerlines and reserve space for the side lever.
- Controls and status have moved below the machine-and-receipt group. The supplied icon atlas supplies category-specific casino medallions, paired with raised uppercase labels.
- The lever remains interactive while the store rejects additional spins during an active request. A held full pull is no longer reset by the busy-state timer.
- TypeScript and all 28 unit/integration checks pass. Updated iOS and Android bundle exports pass.
- Fresh Expo Go launch at `exp://127.0.0.1:8082` still shows a blank GL scene on iPhone 18 Pro / iOS 27. A room-reflection capability guard did not fix it and was removed. Native lever, audio lifecycle, and spin-to-idea verification remain pending; browser verification does not replace them. Screenshot: `tests/device/artifacts/ios-18-pro-8082-casino-blank.jpg`.

Final browser verification: **57 passed, 3 expected skips** across Chromium, Firefox, WebKit, and iPhone browser emulation. Run with `EXPO_PORT=8082 npx playwright test --workers=1 --headed --trace=off --timeout=120000`. The tests measure rendered cabinet-body width and stacked alignment against the receipt, verify that controls are below the letter, and repeatedly drag/hold/release the lever while checking real rendered movement and exactly one request. Screenshots include `test-screenshots/casino-reels-chromium.png` (638px stacked view), `casino-reels-mobile.png`, and `labels-0.png` through `labels-9.png`.

The audio regression check caught redundant `play()` calls during settling. Playback and speed/volume effects are now separate; seven intended sound starts, mute/resume, final stop, and no extra generation requests all pass. Final TypeScript and all 28 unit/integration tests pass.

Spring/compact-controls follow-up: the lever now tracks dragging directly and returns with a damped spring; reduced motion returns immediately. Controls are 76px tall as a group, with 48px touch targets, and remain below the letter. TypeScript and 28 unit/integration tests pass. All 10 targeted desktop/mobile browser cases pass after correcting pointer-test synchronization: repeated lever pulls, short/full pulls, compact idle/loading/success states, keyboard/reduced-motion access, and audio. The initial desktop short-pull test clicked before its hit area settled; it now waits for actionability before measuring coordinates. Screenshots: `test-screenshots/compact-controls-{idle,loading,success}-{chromium,mobile}.png`.
