import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { categories, combinationFromIndexes } from '../../src/domain/categories';
const indexes = { domain: 2, approach: 7, niche: 4 };
const selection = combinationFromIndexes(indexes);
const idea = 'Build a spatial budgeting tool that helps seniors see everyday expenses as simple objects around their home.';
const researched = { idea, researchStatus: 'checked' };
async function ready(page: Page, duration = 0.12) {
  await page.addInitScript(values => { (window as any).__IDEA_TEST__ = values; }, { indexes, duration });
  await page.goto('/');
  await expect(page.getByTestId('lever')).toBeEnabled({ timeout: 60_000 });
  await page.evaluate(() => document.fonts.ready);
}
async function screenshot(page: Page, name: string, project: string) {
  await mkdir('test-screenshots', { recursive: true });
  await page.screenshot({ path: `test-screenshots/${name}-${project}.png`, fullPage: true });
}
test('initial cabinet and idle state', async ({ page }, info) => {
  await ready(page);
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.getByTestId('machine-state')).toHaveText('idle');
  await expect(page.getByTestId('generated-idea')).toHaveCount(0);
  for (const name of ['domain', 'approach', 'niche']) await expect(page.getByTestId(`${name}-reel`)).not.toBeEmpty();
  await screenshot(page, 'initial', info.project.name);
});
test('casino cabinet matches the receipt width and renders three colored medallions', async ({ page }, info) => {
  if (info.project.name === 'chromium') await page.setViewportSize({ width: 638, height: 1600 });
  await ready(page);
  const receipt = (await page.getByTestId('idea-receipt').boundingBox())!;
  const canvas = page.locator('canvas');
  const rendered = await canvas.evaluate(source => {
    const canvas = source as HTMLCanvasElement;
    const sample = document.createElement('canvas');
    sample.width = canvas.width; sample.height = canvas.height;
    const context = sample.getContext('2d')!;
    context.drawImage(canvas, 0, 0);
    const pixels = context.getImageData(0, 0, sample.width, sample.height).data;
    let left = sample.width, right = 0;
    const colors = [0, 0, 0];
    for (let y = 0; y < sample.height; y++) for (let x = 0; x < sample.width; x++) {
      const offset = (y * sample.width + x) * 4;
      if (pixels[offset + 3] < 128) continue;
      // The cabinet plinth defines its visual width; the lever sits outside it.
      if (y > sample.height * .88 && y < sample.height * .97) {
        left = Math.min(left, x); right = Math.max(right, x);
      }
      const r = pixels[offset], g = pixels[offset + 1], b = pixels[offset + 2];
      // Check the reel area, excluding the red cabinet and gold header.
      if (y > sample.height * .39 && y < sample.height * .56) {
        if (r > 90 && r > g * 1.5 && r > b * 1.5) colors[0]++;
        if (b > 75 && b > r * 1.4 && b > g * 1.1) colors[1]++;
        if (g > 55 && g > r * 1.25 && g > b * 1.15) colors[2]++;
      }
    }
    return { width: (right - left) * canvas.clientWidth / canvas.width, center: canvas.getBoundingClientRect().x + (right + left) / 2 * canvas.clientWidth / canvas.width, colors };
  });
  expect(rendered.width / receipt.width).toBeGreaterThan(.90);
  expect(rendered.width / receipt.width).toBeLessThan(1.1);
  if (page.viewportSize()!.width < 900) expect(Math.abs(rendered.center - receipt.x - receipt.width / 2)).toBeLessThan(4);
  const controls = (await page.getByTestId('machine-controls').boundingBox())!;
  expect(controls.y).toBeGreaterThan(receipt.y + receipt.height);
  for (const color of rendered.colors) expect(color).toBeGreaterThan(40);
  await screenshot(page, 'casino-reels', info.project.name);
});
test('lever stays playful during a spin without starting another request', async ({ page }, info) => {
  const requests: unknown[] = [];
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/idea', async route => { requests.push(route.request().postDataJSON()); await pending; await route.fulfill({ json: researched }); });
  await ready(page, 2.3);
  if (info.project.name === 'mobile') await page.getByTestId('lever').tap();
  else { await page.getByTestId('lever').focus(); await page.keyboard.press('Enter'); }
  await expect(page.getByTestId('machine-state')).toHaveText('spinning');
  await expect.poll(() => requests.length).toBe(1);
  const lever = page.getByTestId('lever');
  await expect(lever).toBeEnabled();
  await expect(page.getByTestId('spin-button')).toBeDisabled();
  await lever.scrollIntoViewIfNeeded();
  const box = (await lever.boundingBox())!;
  const x = box.x + box.width / 2, y = box.y + 20;
  const leverPixels = () => page.locator('canvas').evaluate(source => {
    const canvas = source as HTMLCanvasElement;
    const sample = document.createElement('canvas'); sample.width = 80; sample.height = 160;
    const context = sample.getContext('2d')!;
    context.drawImage(canvas, canvas.width * .8, canvas.height * .25, canvas.width * .2, canvas.height * .65, 0, 0, 80, 160);
    return sample.toDataURL();
  });
  await page.waitForTimeout(1800); // Let the initial spring return settle before comparing pixels.
  const resting = await leverPixels();
  for (const distance of [40, 100, 75]) {
    await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x, y + distance, { steps: 5 });
    await expect(lever).toHaveAttribute('data-phase', 'dragging');
    await page.waitForTimeout(400); // Holding a full pull must not trigger the spring-back timer.
    expect(await leverPixels()).not.toBe(resting);
    await page.mouse.up();
    await expect(lever).toHaveAttribute('data-phase', 'idle');
    await expect.poll(leverPixels).toBe(resting);
  }
  await lever.focus(); await page.keyboard.press('Enter');
  await expect.poll(leverPixels).toBe(resting);
  await expect(page.getByTestId('spin-id')).toHaveText('1');
  expect(requests).toEqual([selection]);
  await page.getByTestId('spin-button').dispatchEvent('click');
  // Hold the server beyond the old animation duration and verify real reel motion.
  await page.waitForTimeout(3300);
  await expect(page.getByTestId('machine-state')).toHaveText('spinning');
  await expect(page.getByTestId('generated-idea')).toHaveCount(0);
  await expect(page.getByTestId('celebration-state')).toHaveText('off');
  const reelPixels = () => page.locator('canvas').evaluate(source => {
    const canvas = source as HTMLCanvasElement;
    const sample = document.createElement('canvas'); sample.width = 100; sample.height = 60;
    const context = sample.getContext('2d')!;
    context.drawImage(canvas, canvas.width * .3, canvas.height * .4, canvas.width * .4, canvas.height * .15, 0, 0, 100, 60);
    return sample.toDataURL();
  });
  const moving = await reelPixels();
  await expect.poll(reelPixels).not.toBe(moving);
  await screenshot(page, 'awaiting-idea', info.project.name);
  await expect(page.getByTestId('generation-status')).toHaveText('Turning chance into an idea…');
  expect(requests).toEqual([selection]);
  release();
  await expect(page.getByTestId('machine-state')).toHaveText('success');
  for (const name of ['domain', 'approach', 'niche'] as const) {
    await expect(page.getByTestId(`${name}-reel`)).toHaveText(selection[name]);
    await expect(page.getByTestId(`selected-${name}`)).toHaveText(selection[name]);
  }
  await expect(page.getByTestId('generated-idea')).toHaveText(idea);
  await expect(page.getByTestId('research-warning')).toHaveCount(0);
  await expect(page.getByTestId('spin-id')).toHaveText('1');
  await expect(page.getByTestId('lever')).toBeEnabled();
  await screenshot(page, 'stopped', info.project.name);
});
test('compact controls retain full touch targets in idle, loading and success states', async ({ page }, info) => {
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/idea', async route => { await pending; await route.fulfill({ json: researched }); });
  await ready(page);
  const controls = page.getByTestId('machine-controls');
  const checkSize = async (state: string) => {
    await controls.scrollIntoViewIfNeeded();
    expect((await controls.boundingBox())!.height).toBeLessThanOrEqual(90);
    for (const name of ['spin-button', 'sound-toggle']) {
      const box = (await page.getByTestId(name).boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(48);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    }
    await controls.screenshot({ path: `test-screenshots/compact-controls-${state}-${info.project.name}.png` });
  };
  await checkSize('idle');
  await page.getByTestId('spin-button').click();
  await expect(page.getByTestId('spin-button')).toHaveText('Generating…');
  await checkSize('loading');
  release();
  await expect(page.getByTestId('machine-state')).toHaveText('success');
  await checkSize('success');
});
test('short pull resets; full pull starts exactly one spin', async ({ page }, info) => {
  let requests = 0;
  await page.route('**/api/idea', route => { requests++; return route.fulfill({ json: researched }); });
  await ready(page);
  await page.getByTestId('lever').hover({ position: { x: 28, y: 30 } });
  const box = (await page.getByTestId('lever').boundingBox())!;
  const x = box.x + box.width / 2, y = box.y + 30;
  await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x, y + 40, { steps: 5 });
  await expect(page.getByTestId('lever')).toHaveAttribute('data-phase', 'dragging');
  await page.mouse.up();
  await expect(page.getByTestId('machine-state')).toHaveText('idle'); expect(requests).toBe(0);
  await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x, y + 75, { steps: 5 }); await page.mouse.up();
  await expect(page.getByTestId('generated-idea')).toHaveText(idea);
  expect(requests).toBe(1);
});
test('generation failure and retry preserve the combination without reel movement', async ({ page }, info) => {
  const requests: unknown[] = [];
  await page.route('**/api/idea', route => { requests.push(route.request().postDataJSON()); return requests.length === 1 ? route.fulfill({ status: 429, json: { error: 'Generation is temporarily limited. Retry this combination.' } }) : route.fulfill({ json: researched }); });
  await ready(page); await page.getByTestId('spin-button').click();
  await expect(page.getByRole('alert')).toContainText('temporarily limited');
  await screenshot(page, 'generation-error', info.project.name);
  const retry = page.getByTestId('retry-button');
  await retry.focus(); await page.keyboard.press('Enter');
  await expect(page.getByTestId('generated-idea')).toHaveText(idea);
  await expect(page.getByTestId('research-warning')).toHaveCount(0);
  expect(requests).toEqual([selection, selection]);
  await expect(page.getByTestId('spin-id')).toHaveText('1');
  await expect(page.getByRole('alert')).toHaveCount(0);
});
test('API rejects invalid JSON, values and unsupported methods', async ({ request }) => {
  expect((await request.post('/api/idea', { data: { ...selection, domain: 'Anything' } })).status()).toBe(400);
  expect((await request.post('/api/idea', { data: '{', headers: { 'Content-Type': 'application/json' } })).status()).toBe(400);
  expect((await request.get('/api/idea')).status()).toBe(405);
});
test('all thirty labels align and fit their windows', async ({ page }, info) => {
  test.setTimeout(120_000);
  test.skip(info.project.name !== 'chromium', 'One contact sheet covers all thirty shared geometry labels.');
  await ready(page);
  await page.route('**/api/idea', route => route.fulfill({ json: researched }));
  for (let i = 0; i < 10; i++) {
    await page.evaluate(index => { (window as any).__IDEA_TEST__.indexes = { domain: index, approach: index, niche: index }; }, i);
    await page.getByTestId('spin-button').click();
    await expect(page.getByTestId('machine-state')).toHaveText('success');
    for (const name of ['domain', 'approach', 'niche'] as const) await expect(page.getByTestId(`${name}-reel`)).toHaveText(categories[name][i]);
    await page.locator('canvas').screenshot({ path: `test-screenshots/labels-${i}.png` });
  }
});

test('accessible controls, status announcements and reduced-motion spin', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/api/idea', route => route.fulfill({ json: researched }));
  await ready(page);
  const lever = page.getByRole('button', { name: 'Pull lever to generate an idea' });
  await expect(lever).toHaveAccessibleName('Pull lever to generate an idea');
  await expect(page.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  await lever.focus(); await expect(lever).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page.getByTestId('generated-idea')).toHaveText(idea);
  await expect(lever).toBeFocused();
  await expect(page.getByTestId('generated-idea').locator('..')).toHaveAttribute('aria-live', 'polite');
  await expect(page.getByTestId('spin-button')).toBeEnabled();
});

test('shows an accessible warning when Exa research is unavailable', async ({ page }, info) => {
  await page.route('**/api/idea', route => route.fulfill({ json: { idea, researchStatus: 'unavailable' } }));
  await ready(page);
  await page.getByTestId('spin-button').click();
  await expect(page.getByTestId('generated-idea')).toHaveText(idea);
  await expect(page.getByTestId('research-warning')).toHaveText('Market research unavailable; this idea was not checked.');
  await expect(page.getByTestId('research-warning')).toHaveAttribute('aria-live', 'polite');
  await screenshot(page, 'research-unavailable', info.project.name);
});

test('selects categories beyond the original ten and submits those reel labels', async ({ page }, info) => {
  const categoryIndexes = { domain: 45, approach: 44, niche: 43 };
  const expandedSelection = {
    domain: categories.domain[categoryIndexes.domain],
    approach: categories.approach[categoryIndexes.approach],
    niche: categories.niche[categoryIndexes.niche],
  };
  const requests: unknown[] = [];
  await page.route('**/api/idea', route => { requests.push(route.request().postDataJSON()); return route.fulfill({ json: researched }); });
  await ready(page);
  await page.evaluate(values => { (window as any).__IDEA_TEST__.categoryIndexes = values; }, categoryIndexes);
  await page.getByTestId('spin-button').click();
  await expect(page.getByTestId('generated-idea')).toHaveText(idea);
  for (const name of ['domain', 'approach', 'niche'] as const) await expect(page.getByTestId(`selected-${name}`)).toHaveText(expandedSelection[name]);
  expect(requests).toEqual([expandedSelection]);
  await screenshot(page, 'expanded-category-selection', info.project.name);
});

test('combination lights flash on landing, settle, and restart on the next spin', async ({ page }, info) => {
  await page.route('**/api/idea', route => route.fulfill({ json: researched }));
  await ready(page);
  const lights = page.getByTestId('celebration-state');
  await expect(lights).toHaveText('off');
  await page.getByTestId('spin-button').click();
  await expect(lights).toHaveText('flashing');
  await screenshot(page, 'combination-lights', info.project.name);
  await expect(lights).toHaveText('off', { timeout: 6000 });
  await page.getByTestId('spin-button').click();
  await expect(lights).toHaveText('flashing');
});

test('reduced motion uses steady combination lights', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/api/idea', route => route.fulfill({ json: researched }));
  await ready(page);
  await page.getByTestId('spin-button').click();
  await expect(page.getByTestId('celebration-state')).toHaveText('steady');
  await expect(page.getByTestId('celebration-state')).toHaveText('off', { timeout: 6000 });
});


test('plays mechanical sounds and a final win chime, and respects the sound toggle', async ({ page }, info) => {
  await page.addInitScript(() => {
    (window as any).__AUDIO_PLAYS__ = 0;
    (window as any).__AUDIO_ELEMENTS__ = new Set<HTMLMediaElement>();
    (window as any).__AUDIO_URLS__ = [];
    (window as any).__AUDIO_STARTED_URLS__ = [];
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      (window as any).__AUDIO_PLAYS__++;
      (window as any).__AUDIO_ELEMENTS__.add(this);
      const url = this.currentSrc || this.src;
      (window as any).__AUDIO_URLS__.push(url);
      const playback = play.call(this);
      void playback.then(() => (window as any).__AUDIO_STARTED_URLS__.push(url), () => {});
      return playback;
    };
  });
  await page.route('**/api/idea', route => route.fulfill({ json: researched }));
  await ready(page);
  await screenshot(page, 'win-sound-before', info.project.name);
  await page.getByTestId('spin-button').click();
  await expect(page.getByTestId('generated-idea')).toHaveText(idea);
  await screenshot(page, 'win-sound-on', info.project.name);
  await expect.poll(() => page.evaluate(() => (window as any).__AUDIO_PLAYS__)).toBe(7);
  expect(await page.evaluate(() => new Set((window as any).__AUDIO_URLS__).size)).toBe(5);
  await expect.poll(() => page.evaluate(() => (window as any).__AUDIO_STARTED_URLS__)).toHaveLength(7);

  expect(await page.evaluate(() => [...(window as any).__AUDIO_ELEMENTS__].filter((audio: HTMLMediaElement) => audio.loop).every((audio: HTMLMediaElement) => audio.paused))).toBe(true);
  await page.getByTestId('sound-toggle').click();
  await page.getByTestId('spin-button').click();
  await expect(page.getByTestId('generated-idea')).toHaveText(idea);
  await screenshot(page, 'win-sound-muted', info.project.name);
  await expect.poll(() => page.evaluate(() => (window as any).__AUDIO_PLAYS__)).toBe(7);
  await expect.poll(() => page.evaluate(() => (window as any).__AUDIO_STARTED_URLS__)).toHaveLength(7);
});

test('beacon visibly flashes after landing and stays steady with reduced motion', async ({ page }, info) => {
  await page.route('**/api/idea', route => route.fulfill({ json: researched }));
  await ready(page);
  // Measure rendered beacon pixels, not the React celebration flag.
  const changingPixels = () => page.locator('canvas').evaluate(async source => {
    const canvas = source as HTMLCanvasElement;
    const capture = document.createElement('canvas');
    capture.width = 100; capture.height = 100;
    const context = capture.getContext('2d')!;
    const min = new Uint8ClampedArray(40000).fill(255);
    const max = new Uint8ClampedArray(40000);
    const start = performance.now();
    while (performance.now() - start < 900) {
      await new Promise(requestAnimationFrame);
      context.drawImage(canvas, canvas.width * 0.35, canvas.height * 0.04, canvas.width * 0.25, canvas.height * 0.18, 0, 0, 100, 100);
      const pixels = context.getImageData(0, 0, 100, 100).data;
      for (let i = 0; i < pixels.length; i++) { min[i] = Math.min(min[i], pixels[i]); max[i] = Math.max(max[i], pixels[i]); }
    }
    let changed = 0;
    for (let i = 0; i < max.length; i += 4) if (max[i] - min[i] > 40 || max[i + 1] - min[i + 1] > 40) changed++;
    return changed;
  });
  expect(await changingPixels()).toBeLessThan(5);
  await screenshot(page, 'front-facing-idle', info.project.name);
  await page.getByTestId('spin-button').click();
  await expect(page.getByTestId('celebration-state')).toHaveText('flashing');
  expect(await changingPixels()).toBeGreaterThan(20);
  await screenshot(page, 'front-facing-flashing', info.project.name);
  await expect(page.getByTestId('celebration-state')).toHaveText('off', { timeout: 6000 });
  expect(await changingPixels()).toBeLessThan(5);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByTestId('spin-button').click();
  await expect(page.getByTestId('celebration-state')).toHaveText('steady');
  expect(await changingPixels()).toBeLessThan(5);
});

test('rolling audio mutes mid-spin, resumes, and stops on an error; short pulls creak', async ({ page }, info) => {
  await page.addInitScript(() => {
    (window as any).__MECHANICAL_AUDIO__ = new Set<HTMLMediaElement>();
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      (window as any).__MECHANICAL_AUDIO__.add(this);
      return play.call(this);
    };
  });
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/idea', async route => {
    await pending;
    await route.fulfill({ status: 500, json: { error: 'Try again later.' } });
  });
  await ready(page);
  await page.getByTestId('lever').hover({ position: { x: 28, y: 30 } });
  const box = (await page.getByTestId('lever').boundingBox())!;
  await page.mouse.move(box.x + 28, box.y + 30);
  await page.mouse.down();
  await page.mouse.move(box.x + 28, box.y + 60, { steps: 5 });
  await page.mouse.up();
  await expect(page.getByTestId('machine-state')).toHaveText('idle');
  await expect.poll(() => page.evaluate(() => [...(window as any).__MECHANICAL_AUDIO__].some((audio: HTMLMediaElement) => audio.src.includes('lever-creak')))).toBe(true);
  await page.getByTestId('spin-button').click();
  const loopPlaying = () => page.evaluate(() => [...(window as any).__MECHANICAL_AUDIO__].some((audio: HTMLMediaElement) => audio.loop && !audio.paused && audio.volume > 0));
  await expect.poll(loopPlaying).toBe(true);
  await screenshot(page, 'mechanical-spinning', info.project.name);
  await page.getByTestId('sound-toggle').click();
  await expect.poll(loopPlaying).toBe(false);
  expect(await page.evaluate(() => [...(window as any).__MECHANICAL_AUDIO__].every((audio: HTMLMediaElement) => audio.paused))).toBe(true);
  await page.getByTestId('sound-toggle').click();
  await expect.poll(loopPlaying).toBe(true);
  release();
  await expect(page.getByTestId('machine-state')).toHaveText('error');
  await expect.poll(loopPlaying).toBe(false);
  expect(await page.evaluate(() => [...(window as any).__MECHANICAL_AUDIO__].some((audio: HTMLMediaElement) => audio.src.includes('win-chime')))).toBe(false);
  await screenshot(page, 'mechanical-error-stopped', info.project.name);
});
