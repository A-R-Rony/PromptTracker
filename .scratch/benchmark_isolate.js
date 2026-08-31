const fs = require('fs');
const path = require('path');
const os = require('os');
const cp = require('child_process');

const dbPath = path.join(os.homedir(), '.local', 'share', 'opencode', 'opencode.db');

let t0 = performance.now();
let out1 = cp.execSync(`sqlite3 -json "${dbPath}" "SELECT id, title, directory, model, cost, tokens_input, tokens_output, tokens_reasoning, time_created FROM session ORDER BY time_created DESC;"`, { encoding: 'utf8' });
let t1 = performance.now();
console.log('1. Session query:', (t1 - t0).toFixed(2) + 'ms');

t0 = performance.now();
let out2 = cp.execSync(`sqlite3 -json "${dbPath}" "SELECT id, session_id, time_created, data FROM message;"`, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
t1 = performance.now();
console.log('2. Message query:', (t1 - t0).toFixed(2) + 'ms', 'Size:', out2.length);

t0 = performance.now();
let out3 = cp.execSync(`sqlite3 -json "${dbPath}" "SELECT message_id, session_id, time_created, data FROM part;"`, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
t1 = performance.now();
console.log('3. Part query:', (t1 - t0).toFixed(2) + 'ms', 'Size:', out3.length);
