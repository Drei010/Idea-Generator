import { defineConfig, devices, firefox } from '@playwright/test';
import { mkdtempSync, readFileSync, writeFileSync, symlinkSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
// macOS 27 protects Firefox's shared app-data folder. Isolate the test app name.
// https://github.com/microsoft/playwright/issues/42768
let firefoxExecutable: string | undefined;
if (process.platform === 'darwin') {
  const binary = firefox.executablePath();
  const folder = mkdtempSync(join(tmpdir(), 'lucky-idea-firefox-'));
  const config = readFileSync(resolve(dirname(binary), '../Resources/application.ini'), 'utf8').replace('Vendor=Mozilla', 'Vendor=Playwright').replace('Name=Firefox', 'Name=LuckyIdeaTests');
  const ini = join(folder, 'application.ini');
  writeFileSync(ini, config);
  symlinkSync(resolve(dirname(binary), '../Resources/browser/omni.ja'), join(folder, 'omni.ja')); 
  firefoxExecutable = join(folder, 'firefox');
  const quote = (value: string) => "'" + value.replaceAll("'", "'\\''") + "'";
  writeFileSync(firefoxExecutable, `#!/bin/sh\nexec ${quote(binary)} -app ${quote(ini)} "$@"\n`, { mode: 0o755 });
}
const port = process.env.EXPO_PORT || '8081';
const baseURL = `http://localhost:${port}`;
export default defineConfig({
  testDir: './tests/e2e', outputDir: 'test-results', timeout: 40_000,
  fullyParallel: false, workers: 2, retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'], launchOptions: { executablePath: firefoxExecutable }, viewport: { width: 1440, height: 1000 } } },
    { name: 'webkit', use: { ...devices['Desktop Safari'], viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'webkit' } },
  ],
  webServer: { command: `CI=1 npx expo start --web --port ${port}`, url: baseURL, reuseExistingServer: true, timeout: 120_000 },
});
