const fs = require('fs');
const path = require('path');
const os = require('os');

const baseDir = path.join(os.homedir(), '.gemini', 'antigravity-ide', 'brain');
const convDirs = fs.readdirSync(baseDir);

for (const convId of convDirs) {
  const p = path.join(baseDir, convId, '.system_generated', 'logs', 'transcript.jsonl');
  if (fs.existsSync(p)) {
    const raw = fs.readFileSync(p, 'utf8');
    if (raw.includes('comment-on-this-change-if-the-user-doesn')) {
      console.log('FOUND in Conv:', convId);
      const lines = raw.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('comment-on-this-change-if-the-user-doesn')) {
          console.log('Line index:', i);
          console.log(lines[i].slice(0, 500));
        }
      }
    }
  }
}
