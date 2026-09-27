export function openAIKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key?.trim()) throw new Error('OpenAI is not configured on the server.');
  return key;
}
