import { it, expect, vi, afterEach } from 'vitest';
import { handleIdea } from '../../src/server/ideaHandler.server';
import { generateIdea } from '../../src/services/ideaApi';
const combination = { domain: 'Finance', approach: 'Automation', niche: 'Freelancers' } as const;
const result = { idea: 'A bookkeeping assistant.', researchStatus: 'checked' as const };
const request = (body: string, method = 'POST') => new Request('http://localhost/api/idea', { method, ...(method === 'POST' ? { body } : {}), headers: { 'Content-Type': 'application/json' } });
afterEach(() => vi.unstubAllGlobals());
it('validates before calling the generation service', async () => {
  const generate = vi.fn().mockResolvedValue(result);
  const response = await handleIdea(request(JSON.stringify(combination)), generate);
  expect(response.status).toBe(200); expect(await response.json()).toEqual(result); expect(generate).toHaveBeenCalledExactlyOnceWith(combination);
  generate.mockClear();
  for (const input of ['{', '{}', 'null', '[]', JSON.stringify({ ...combination, domain: 'invalid' })]) expect((await handleIdea(request(input), generate)).status).toBe(400);
  expect((await handleIdea(request('', 'GET'), generate)).status).toBe(405);
  expect((await handleIdea(request('x'.repeat(2049)), generate)).status).toBe(413);
  expect(generate).not.toHaveBeenCalled();
});
it('sanitizes provider failures and handles rate limits', async () => {
  for (const [status, expected] of [[429, 429], [401, 503], [500, 502]]) {
    const result = await handleIdea(request(JSON.stringify(combination)), vi.fn().mockRejectedValue({ status, message: 'sensitive upstream detail' }));
    expect(result.status).toBe(expected); expect(await result.text()).not.toContain('sensitive');
  }
});
it('client preserves research status and does not repeat paid generation after a failure', async () => {
  const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ idea: 'Recovered', researchStatus: 'unavailable' }));
  vi.stubGlobal('fetch', fetcher);
  expect(await generateIdea(combination)).toEqual({ idea: 'Recovered', researchStatus: 'unavailable' }); expect(fetcher).toHaveBeenCalledTimes(1);
  fetcher.mockReset().mockResolvedValue(Response.json({ error: 'Invalid' }, { status: 400 }));
  await expect(generateIdea(combination)).rejects.toMatchObject({ status: 400 }); expect(fetcher).toHaveBeenCalledTimes(1);
});
it('client reports invalid responses and network failure after bounded attempts', async () => {
  const fetcher = vi.fn().mockResolvedValue(Response.json({ idea: '', researchStatus: 'checked' })); vi.stubGlobal('fetch', fetcher);
  await expect(generateIdea(combination)).rejects.toThrow('invalid idea'); expect(fetcher).toHaveBeenCalledTimes(1);
  fetcher.mockReset().mockRejectedValue(new TypeError('network'));
  await expect(generateIdea(combination)).rejects.toThrow('Could not connect'); expect(fetcher).toHaveBeenCalledTimes(1);
});
