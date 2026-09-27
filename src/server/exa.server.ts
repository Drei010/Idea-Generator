import type { Combination } from '../domain/categories';

export type Evidence = { title: string; url: string; highlights: string[] };
export type SearchResult = { status: 'checked' | 'no_matches'; evidence: Evidence[] } | { status: 'unavailable'; evidence: [] };

export async function searchSimilarImplementations(combination: Combination, candidate: string): Promise<SearchResult> {
  const key = process.env.EXA_API_KEY;
  if (!key?.trim()) return { status: 'unavailable', evidence: [] };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const candidateDetails = candidate.split('\n').find(line => /^Problem and feature:/i.test(line.trim())) || candidate;
    const response = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key },
      body: JSON.stringify({
        query: `Find products and implementations addressing this problem, audience, and core feature: ${candidateDetails}. Audience: ${combination.niche}. Domain: ${combination.domain}. Approach: ${combination.approach}.`,
        type: 'auto',
        contents: { highlights: true },
      }),
      signal: controller.signal,
    });
    if (!response.ok) return { status: 'unavailable', evidence: [] };
    const payload: unknown = await response.json();
    if (!payload || typeof payload !== 'object' || !Array.isArray((payload as { results?: unknown }).results)) return { status: 'unavailable', evidence: [] };
    const evidence: Evidence[] = [];
    const seen = new Set<string>();
    for (const item of (payload as { results: unknown[] }).results) {
      if (!item || typeof item !== 'object') continue;
      const result = item as { title?: unknown; url?: unknown; highlights?: unknown };
      if (typeof result.title !== 'string' || !result.title.trim() || typeof result.url !== 'string') continue;
      try {
        const url = new URL(result.url);
        if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) continue;
        url.hash = '';
        if (seen.has(url.href)) continue;
        seen.add(url.href);
        const highlights = Array.isArray(result.highlights)
          ? result.highlights.filter((highlight): highlight is string => typeof highlight === 'string').slice(0, 2).map(highlight => highlight.slice(0, 350))
          : [];
        evidence.push({ title: result.title.trim().slice(0, 180), url: url.href.slice(0, 500), highlights });
        if (evidence.length === 5) break;
      } catch { /* Ignore malformed result URLs. */ }
    }
    return { status: evidence.length ? 'checked' : 'no_matches', evidence };
  } catch {
    return { status: 'unavailable', evidence: [] };
  } finally {
    clearTimeout(timeout);
  }
}
