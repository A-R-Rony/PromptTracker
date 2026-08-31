const fs = require('fs');
const path = require('path');
const os = require('os');

const p = path.join(os.homedir(), '.gemini', 'antigravity-ide', 'brain', 'ccca3f7c-78b1-480e-a97a-907fce740027', '.system_generated', 'logs', 'transcript.jsonl');
const rawText = fs.readFileSync(p, 'utf8');
const lines = rawText.split('\n');

let currentModel = 'gemini-3.7-flash';
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) continue;
  try {
    const entry = JSON.parse(line);
    if (entry.model || entry.metadata?.model) {
      console.log('L' + i, 'Direct model:', entry.model || entry.metadata?.model);
      currentModel = entry.model || entry.metadata?.model;
    }
  } catch (e) {}
}
console.log('Final currentModel from direct entry fields:', currentModel);
