import { validateCombination } from './validation.server';
import type { Combination } from '../domain/categories';
import type { GeneratedIdea } from '../domain/idea';
export const json = (body: object, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
export async function handleIdea(request: Request, generate: (combination: Combination) => Promise<GeneratedIdea>): Promise<Response> {
  if (request.method !== 'POST') return new Response(JSON.stringify({ error: 'Use POST to generate an idea.' }), { status: 405, headers: { Allow: 'POST', 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  if (!request.headers.get('content-type')?.includes('application/json')) return json({ error: 'Send a JSON request.' }, 415);
  let body: unknown;
  try {
    const reader = request.body?.getReader();
    if (!reader) return json({ error: 'A selection is required.' }, 400);
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.length;
      if (size > 2048) { await reader.cancel(); return json({ error: 'Request is too large.' }, 413); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    body = JSON.parse(new TextDecoder().decode(bytes));
  } catch { return json({ error: 'Request must contain valid JSON.' }, 400); }
  const combination = validateCombination(body);
  if (!combination) return json({ error: 'Choose one valid domain, approach, and niche.' }, 400);
  try { return json(await generate(combination)); }
  catch (error) {
    const status = error && typeof error === 'object' && 'status' in error ? error.status : undefined;
    if (status === 429) return json({ error: 'Generation is temporarily limited. Wait a moment, then retry this combination.' }, 429);
    if (status === 401 || status === 403 || status === 404) return json({ error: 'The generation service needs server configuration. Your combination is saved; try again after it is restored.' }, 503);
    return json({ error: 'We could not generate an idea. Please retry this combination.' }, 502);
  }
}
