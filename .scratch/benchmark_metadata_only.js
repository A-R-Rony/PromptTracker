const fs = require('fs');
const path = require('path');
const os = require('os');
const cp = require('child_process');

const dbPath = path.join(os.homedir(), '.local', 'share', 'opencode', 'opencode.db');

// Test 1: Query without `data` column
let t0 = performance.now();
let out1 = cp.execSync(`sqlite3 -json "${dbPath}" "SELECT id, session_id, time_created FROM message;"`, { encoding: 'utf8' });
let t1 = performance.now();
console.log('1. Message without data column:', (t1 - t0).toFixed(2) + 'ms', 'Rows:', JSON.parse(out1).length);

// Test 2: Query without `data` for part
t0 = performance.now();
let out2 = cp.execSync(`sqlite3 -json "${dbPath}" "SELECT id, message_id, session_id, time_created FROM part;"`, { encoding: 'utf8' });
t1 = performance.now();
console.log('2. Part without data column:', (t1 - t0).toFixed(2) + 'ms', 'Rows:', JSON.parse(out2).length);

// Test 3: Query session metadata alone with pre-calculated tokens
t0 = performance.now();
let out3 = cp.execSync(`sqlite3 -json "${dbPath}" "SELECT s.id, s.title, s.directory, s.model, s.cost, s.tokens_input, s.tokens_output, s.tokens_reasoning, s.time_created FROM session s ORDER BY s.time_created DESC;"`, { encoding: 'utf8' });
t1 = performance.now();
console.log('3. Session query alone:', (t1 - t0).toFixed(2) + 'ms', 'Rows:', JSON.parse(out3).length);
