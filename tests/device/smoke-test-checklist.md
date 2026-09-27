# Native smoke tests

Record physical-device results independently from the simulator and mobile browser tests.

| Check | iPhone physical | Android physical | iOS simulator |
|---|---|---|---|
| App launches | Pending | Pending | Pass |
| Scene renders, no blank canvas | Pending | Pending | Failed: blank GL canvas on iOS 26.5 |
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

Environment: Expo SDK 57; iPhone 17 simulator on iOS 26.5. The native screen renders, but its GL scene is blank and tapping the spin control did not change state. A paired physical iPhone was discovered but was locked/unavailable during testing. Android SDK/ADB/emulator were absent at implementation time.
