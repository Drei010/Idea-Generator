# Lucky Idea

A TypeScript Expo application for web, iOS, and Android. Pull the red lever or use the spin button to combine a domain, approach, and audience. The three-dimensional reels stop in sequence before the server asks `gpt-6-luna` for a concise project idea.

## Run locally

```sh
npm ci
npm run web
npm run ios
npm run android
```

Use Expo Go compatible with SDK 57. Native development requests use the running Expo server; keep the computer and physical device on the same network. Android requires a connected Android device or an installed Android SDK/emulator. A standalone native production build needs a hosted API origin; hosting is outside this local-delivery scope.

The OpenAI and Exa keys are stored only in `.env.local`, ignored by Git. For another checkout, `.env.example` documents both server variables. Never prefix either key with `EXPO_PUBLIC_`. The client sends only category strings to `/api/idea`; it never imports provider SDKs or server environment modules. Idea generation drafts a candidate, searches Exa for similar implementations, and refines the idea around a meaningful difference. If Exa is unavailable, the app returns the candidate with a research warning.

## Controls

- Click/tap the lever, activate it with Enter/Space, or use **Give it a spin**.
- Drag the lever down 60 pixels of its 100-pixel travel and release to spin. A shorter drag returns without spinning.
- Pulling the lever immediately requests an idea; reels keep turning until the response arrives, then settle on the chosen combination. Input stays locked until all reels land. Reduced motion keeps the drums still while waiting.
- **Retry this combination** resends the stopped selection without moving the reels.
- Reduced-motion preferences skip the reel animation.
- The lever and reel stops have quiet sound effects. Use **Sound on/off** beside the spin button to mute them; device silent mode is respected.

## Structure

- `app/`: thin Expo Router screen, shared layout, and server API route.
- `src/domain/`: category lists in separate JSON files, index mapping, and injectable randomness. Each reel has 46 category options.
- `src/three/`: cabinet, lever, ten-faced reels, local shape-font geometry, platform canvases, pure reel math.
- `src/state/`: Zustand state machine; generation starts on activation; all three real reel callbacks must match the target indexes before revealing the result.
- `src/components/slot-machine/`: responsive screen and platform lever interactions.
- `src/services/`: API client, timeout, typed errors, at most one retry for transient failures.
- `src/server/`: exact-membership validation, bounded request parsing, prompt, environment, Responses API call.

Related concerns share files where a separate wrapper would add no behavior. Font geometry is locally bundled; there are no runtime font downloads. Category text wraps only in its mesh, preserving the canonical API value.

## Checks

```sh
npm run typecheck
npm test
npm run test:unit
npm run test:integration
npx playwright install chromium firefox webkit
npm run test:e2e
npm run test:e2e:ui
npm run test:coverage
npm run test:all
npx expo export --platform all
node scripts/check-secrets.cjs
```

Playwright covers Chromium, Firefox, WebKit, and a mobile WebKit viewport. The development-only injected target seam is removed from production. Unit tests cover the 97,336 combinations, expanded category selection, rotation boundaries, validation, and transition guards; integration tests mock the provider and network failures. Screenshots are written to `test-screenshots/`, traces to `test-results/`, and HTML reports to `playwright-report/`.

On macOS, the test configuration gives bundled Firefox a separate application name and temporary launcher to avoid the macOS 27 shared-profile collision documented in [Playwright issue 42768](https://github.com/microsoft/playwright/issues/42768). It does not modify the installed browser or its profile.

Physical-device results are recorded separately in `tests/device/smoke-test-checklist.md`; browser emulation and bundle export do not count as physical-device verification.

## Local scope

No authentication, database, saved history, credit system, deployment, or app-store release. Run the API locally as requested; public deployment would need its own access and cost controls.

Expo API routing follows the [Expo API routes documentation](https://docs.expo.dev/router/web/api-routes/). Native rendering uses [Expo GLView](https://docs.expo.dev/versions/v57.0.0/sdk/gl-view/).
