import type { Combination } from '../domain/categories';
import type { GeneratedIdea } from '../domain/idea';
import { request } from './httpClient';
export class IdeaApiError extends Error {
  constructor(message: string, public status = 0) { super(message); this.name = 'IdeaApiError'; }
}
export async function generateIdea(combination: Combination): Promise<GeneratedIdea> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  try {
    const response = await request('/api/idea', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(combination), signal: controller.signal });
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new IdeaApiError(typeof body?.error === 'string' ? body.error : 'Generation failed. Please retry.', response.status);
    if (typeof body?.idea !== 'string' || !body.idea.trim() || !['checked', 'no_matches', 'unavailable'].includes(body.researchStatus)) throw new IdeaApiError('The server returned an invalid idea. Please retry.', 502);
    return { idea: body.idea.trim(), researchStatus: body.researchStatus };
  } catch (error) {
    if (error instanceof IdeaApiError) throw error;
    throw new IdeaApiError(controller.signal.aborted ? 'Generation timed out. Please retry this combination.' : 'Could not connect. Check your connection and retry.');
  } finally {
    clearTimeout(timeout);
  }
}
