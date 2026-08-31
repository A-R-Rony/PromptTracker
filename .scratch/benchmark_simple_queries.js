const cp = require('child_process');
const os = require('os');
const path = require('path');
const dbPath = path.join(os.homedir(), '.local', 'share', 'opencode', 'opencode.db');

let t0 = performance.now();

// 1. Query sessions
const sessionQuery = 'SELECT s.id, s.title, s.directory, s.model, s.cost, s.tokens_input, s.tokens_output, s.tokens_reasoning, s.time_created FROM session s ORDER BY s.time_created DESC;';
const rawSessions = cp.execSync(`sqlite3 -json "${dbPath}" "${sessionQuery}"`, { encoding: 'utf8' });
const sessions = JSON.parse(rawSessions);

// 2. Query messages
const msgQuery = 'SELECT id, session_id, time_created, data FROM message;';
const rawMsgs = cp.execSync(`sqlite3 -json "${dbPath}" "${msgQuery}"`, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
const messages = JSON.parse(rawMsgs);

// 3. Query parts
const partQuery = 'SELECT message_id, session_id, time_created, data FROM part;';
const rawParts = cp.execSync(`sqlite3 -json "${dbPath}" "${partQuery}"`, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
const parts = JSON.parse(rawParts);

let t1 = performance.now();
console.log('Total 3 simple queries time:', (t1 - t0).toFixed(2) + 'ms');
console.log('Sessions:', sessions.length, 'Messages:', messages.length, 'Parts:', parts.length);
