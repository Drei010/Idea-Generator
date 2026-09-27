import OpenAI from 'openai';
import type { Combination } from '../domain/categories';
import type { GeneratedIdea } from '../domain/idea';
import { openAIKey } from './env.server';
import { searchSimilarImplementations } from './exa.server';
import { ideaPrompt, refineIdeaPrompt } from './ideaPrompt.server';

function completeText(output: string | null | undefined, status: string | null | undefined) {
  const text = output?.trim();
  if (!text || status !== 'completed') throw new Error('The model did not return a complete idea.');
  return text;
}

export async function generateWithOpenAI(combination: Combination): Promise<GeneratedIdea> {
  const client = new OpenAI({ apiKey: openAIKey(), timeout: 20_000, maxRetries: 0 });
  const draft = await client.responses.create({ model: 'gpt-6-luna', input: ideaPrompt(combination), max_output_tokens: 600, store: false });
  const candidate = completeText(draft.output_text, draft.status);
  const candidateIdea = candidate.replace(/^(Problem and feature|MVP):\s*/gim, '').replace(/\s*\n\s*/g, ' ').trim() || candidate;
  const research = await searchSimilarImplementations(combination, candidate);
  if (research.status === 'unavailable') return { idea: candidateIdea, researchStatus: 'unavailable' };
  const evidence = research.evidence.length ? JSON.stringify(research.evidence) : 'No usable similar implementations were found in this search.';
  const refined = await client.responses.create({ model: 'gpt-6-luna', input: refineIdeaPrompt(candidate, evidence), max_output_tokens: 600, store: false });
  return { idea: completeText(refined.output_text, refined.status), researchStatus: research.status };
}
