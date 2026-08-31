const fs = require('fs');
const path = require('path');
const os = require('os');

const p = path.join(os.homedir(), '.gemini', 'antigravity-ide', 'brain', 'ccca3f7c-78b1-480e-a97a-907fce740027', '.system_generated', 'logs', 'transcript.jsonl');
const rawText = fs.readFileSync(p, 'utf8');
const modelChangeMatch = rawText.match(/Model Selection[`'\s]+from[^\n]+to\s+([A-Za-z0-9_.\s-]+)/i);
console.log('modelChangeMatch[0]:', modelChangeMatch[0].slice(0, 300));
console.log('modelChangeMatch[1]:', modelChangeMatch[1].slice(0, 300));
