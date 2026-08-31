const fs = require('fs');
const path = require('path');
const os = require('os');
const cp = require('child_process');

const dbPath = path.join(os.homedir(), '.local', 'share', 'opencode', 'opencode.db');

// Let's test the fast part query alone
let t0 = performance.now();
const partsQueryFast = `
  SELECT 
    p.session_id,
    p.message_id,
    p.time_created,
    p.data AS part_data
  FROM part p
  WHERE p.data LIKE '%"type":"text"%' OR p.data LIKE '%"type":"step-finish"%'
  ORDER BY p.time_created ASC;
`;
const raw2 = cp.execSync(`sqlite3 -json "${dbPath}" "${partsQueryFast.replace(/\n/g, ' ')}"`, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
let t1 = performance.now();
console.log('Fast targeted parts query:', (t1 - t0).toFixed(2) + 'ms', 'Data size:', raw2.length);
