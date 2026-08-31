const fs = require('fs');
const path = require('path');
const os = require('os');

const p = path.join(os.homedir(), '.gemini', 'antigravity-ide', 'brain', 'ccca3f7c-78b1-480e-a97a-907fce740027', '.system_generated', 'logs', 'transcript.jsonl');
const rawText = fs.readFileSync(p, 'utf8');
const lines = rawText.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) continue;
  try {
    const entry = JSON.parse(line);
    if (entry.model || entry.metadata?.model) {
      console.log('Line', i, 'entry.model:', entry.model, 'entry.metadata.model:', entry.metadata?.model);
    }
  } catch (e) {}
}

const jsonModelMatch = rawText.match(/"model(?:_name)?"\s*:\s*"([^"]+)"/i);
console.log('jsonModelMatch:', jsonModelMatch ? jsonModelMatch[0] : 'null');
if (jsonModelMatch) console.log('captured:', jsonModelMatch[1]);
