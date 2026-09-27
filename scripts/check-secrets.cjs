const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const env = fs.readFileSync('.env.local', 'utf8');
const secrets = ['OPENAI_API_KEY', 'EXA_API_KEY'].map(name => [name, process.env[name]?.trim() || env.match(new RegExp(`^${name}=(.*)$`, 'm'))?.[1]?.trim().replace(/^["']|["']$/g, '')]).filter(([, value]) => value);
if (!secrets.some(([name]) => name === 'OPENAI_API_KEY')) throw new Error('A local OpenAI key is required for the secret-leak check.');
execFileSync('git', ['check-ignore', '--quiet', '.env.local']);
let files = 0;
function scan(folder) {
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    const file = path.join(folder, entry.name);
    if (entry.isDirectory()) scan(file);
    else {
      files++;
      const content = fs.readFileSync(file);
      if (secrets.some(([, value]) => content.includes(Buffer.from(value)))) throw new Error('Secret detected in exported output.');
    }
  }
}
scan('dist');
console.log(`Checked ${files} exported files: no configured server key found; .env.local is ignored.`);
