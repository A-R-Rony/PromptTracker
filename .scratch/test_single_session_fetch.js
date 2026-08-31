const fs = require('fs');
const path = require('path');
const os = require('os');
const cp = require('child_process');

const dbPath = path.join(os.homedir(), '.local', 'share', 'opencode', 'opencode.db');

// Test: Fetch prompts and summaries for only 1 specific session on demand
let t0 = performance.now();
const targetSession = 'ses_fa972cda5ffe6vt83RBrEWKksF';
const query = `
  SELECT 
    p.message_id,
    p.time_created,
    p.data AS part_data
  FROM part p
  WHERE p.session_id = '${targetSession}' AND (p.data LIKE '%"type":"text"%' OR p.data LIKE '%"type":"step-finish"%')
  ORDER BY p.time_created ASC;
`;

const res = cp.execSync(`sqlite3 -json "${dbPath}" "${query.replace(/\n/g, ' ')}"`, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
let t1 = performance.now();
console.log('Single session lazy drill-down time:', (t1 - t0).toFixed(2) + 'ms', 'Records:', JSON.parse(res).length);
