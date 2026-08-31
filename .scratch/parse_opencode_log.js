const fs = require('fs');
const path = require('path');
const os = require('os');
const logFile = path.join(os.homedir(), '.local', 'share', 'opencode', 'log', 'opencode.log');

const text = fs.readFileSync(logFile, 'utf8');
const lines = text.split('\n');

const sessionMap = {};
for (const l of lines) {
  if (!l.trim()) continue;
  const timeMatch = l.match(/^timestamp=([^ ]+)/);
  const sessMatch = l.match(/session\.id=([A-Za-z0-9_]+)/);
  const modelMatch = l.match(/modelID=([A-Za-z0-9_.-]+)/);
  const cwdMatch = l.match(/cwd="([^"]+)"/);
  const stepMatch = l.match(/step=(\d+)/);

  if (sessMatch) {
    const sId = sessMatch[1];
    if (!sessionMap[sId]) {
      sessionMap[sId] = { id: sId, timestamp: timeMatch ? timeMatch[1] : '', models: new Set(), cwd: '', steps: 0 };
    }
    if (modelMatch) sessionMap[sId].models.add(modelMatch[1]);
    if (cwdMatch) sessionMap[sId].cwd = cwdMatch[1];
    if (stepMatch) sessionMap[sId].steps = Math.max(sessionMap[sId].steps, parseInt(stepMatch[1], 10));
  }
}

console.log('Discovered OpenCode Sessions from log:', Object.keys(sessionMap).length);
for (const [id, data] of Object.entries(sessionMap)) {
  console.log(id, 'Date:', data.timestamp, 'Models:', Array.from(data.models), 'CWD:', data.cwd, 'Steps:', data.steps);
}
