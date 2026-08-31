const fs = require('fs');
const path = require('path');
const os = require('os');
const cp = require('child_process');

const dbPath = path.join(os.homedir(), '.local', 'share', 'opencode', 'opencode.db');

console.log('--- Timing OpenCode Queries ---');

// Test 1: Sessions only
let t0 = performance.now();
let out1 = cp.execSync(`sqlite3 -json "${dbPath}" "SELECT id, title, directory, model, cost, tokens_input, tokens_output, tokens_reasoning, time_created FROM session ORDER BY time_created DESC;"`, { encoding: 'utf8' });
let t1 = performance.now();
console.log('Session query time:', (t1 - t0).toFixed(2) + 'ms', 'Rows:', JSON.parse(out1).length);

// Test 2: Parts with session_message or part session index
t0 = performance.now();
let out2 = cp.execSync(`sqlite3 -json "${dbPath}" "SELECT p.session_id, p.data FROM part p WHERE p.session_id IS NOT NULL LIMIT 500;"`, { encoding: 'utf8' });
t1 = performance.now();
console.log('Direct part query by part_session_idx time:', (t1 - t0).toFixed(2) + 'ms');

// Test 3: Parts only text types
t0 = performance.now();
let out3 = cp.execSync(`sqlite3 -json "${dbPath}" "SELECT p.session_id, p.message_id, p.data, p.time_created FROM part p WHERE p.data LIKE '%\"type\":\"text\"%' LIMIT 500;"`, { encoding: 'utf8' });
t1 = performance.now();
console.log('Text parts query time:', (t1 - t0).toFixed(2) + 'ms');
