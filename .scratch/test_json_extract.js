const fs = require('fs');
const path = require('path');
const os = require('os');
const cp = require('child_process');

const dbPath = path.join(os.homedir(), '.local', 'share', 'opencode', 'opencode.db');

console.log('Testing optimized 2-step scan...');

let t0 = performance.now();

// 1. Fetch sessions
const sessionQuery = `
  SELECT 
    s.id, 
    s.title, 
    s.directory, 
    s.model, 
    s.cost, 
    s.tokens_input, 
    s.tokens_output, 
    s.tokens_reasoning,
    s.time_created
  FROM session s
  ORDER BY s.time_created DESC
  LIMIT 100;
`;
const rawSessions = cp.execSync(`sqlite3 -json "${dbPath}" "${sessionQuery.replace(/\n/g, ' ')}"`, { encoding: 'utf8' });
const sessions = JSON.parse(rawSessions);

// 2. Fetch all message roles (tiny payload)
const rawMsgs = cp.execSync(`sqlite3 -json "${dbPath}" "SELECT id, session_id, time_created, json_extract(data, '$.role') as role FROM message;"`, { encoding: 'utf8' });
const msgs = JSON.parse(rawMsgs);
const msgRoleMap = {};
for (const m of msgs) {
  msgRoleMap[m.id] = { role: m.role, time: m.time_created };
}

// 3. Fetch only text and finish parts
const rawParts = cp.execSync(`sqlite3 -json "${dbPath}" "SELECT message_id, session_id, time_created, json_extract(data, '$.type') as type, json_extract(data, '$.text') as text, json_extract(data, '$.tokens') as tokens FROM part WHERE json_extract(data, '$.type') IN ('text', 'step-finish');"`, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
const parts = JSON.parse(rawParts);

let t1 = performance.now();
console.log('Optimized extraction time:', (t1 - t0).toFixed(2) + 'ms');
console.log('Sessions:', sessions.length, 'Messages:', msgs.length, 'Parts:', parts.length);
