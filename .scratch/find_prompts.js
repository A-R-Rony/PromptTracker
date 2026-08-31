const fs = require('fs');
const path = require('path');
const os = require('os');
const logFile = path.join(os.homedir(), '.local', 'share', 'opencode', 'log', 'opencode.log');

const text = fs.readFileSync(logFile, 'utf8');
const lines = text.split('\n');

const promptMatches = [];
for (let i = 0; i < lines.length; i++) {
  const l = lines[i];
  if (l.includes('ses_fa972cda5ffe6vt83RBrEWKksF') || l.includes('glm-5.3') || l.includes('prompt') || l.includes('message')) {
    if (l.includes('user') || l.includes('prompt') || l.includes('msg_')) {
      promptMatches.push(l);
    }
  }
}
console.log('Total matches:', promptMatches.length);
console.log('Sample matches:');
console.log(promptMatches.slice(0, 15).join('\n'));
