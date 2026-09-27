import { handleIdea } from '../../src/server/ideaHandler.server';
import { generateWithOpenAI } from '../../src/server/openai.server';
export const POST = (request: Request) => handleIdea(request, generateWithOpenAI);
export const GET = POST;
export const PUT = POST;
export const PATCH = POST;
export const DELETE = POST;
export const OPTIONS = POST;
export const HEAD = POST;
