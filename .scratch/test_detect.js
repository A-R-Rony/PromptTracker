const fs = require('fs');
const path = require('path');
const os = require('os');
const { AntigravityScanner } = require(path.resolve('./packages/scanners/dist/index.js'));

const p = path.join(os.homedir(), '.gemini', 'antigravity-ide', 'brain', 'ccca3f7c-78b1-480e-a97a-907fce740027', '.system_generated', 'logs', 'transcript.jsonl');
const rawText = fs.readFileSync(p, 'utf8');

// Check detectDynamicModel directly
const modelChangeMatch = rawText.match(/Model Selection[`'\s]+from[^\n]+to\s+([A-Za-z0-9_.\s-]+)/i);
console.log('modelChangeMatch:', modelChangeMatch);

const jsonModelMatch = rawText.match(/"model(?:_name)?"\s*:\s*"([^"]+)"/i);
console.log('jsonModelMatch:', jsonModelMatch);

const scanner = new AntigravityScanner();
scanner.scan().then(sessions => {
  const ourSess = sessions.find(s => s.id.includes('ccca3f7c'));
  console.log('Our session model:', ourSess?.model);
});
