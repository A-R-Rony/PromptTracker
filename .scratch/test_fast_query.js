const fs = require('fs');
const path = require('path');
const os = require('os');
const cp = require('child_process');

const dbPath = path.join(os.homedir(), '.local', 'share', 'opencode', 'opencode.db');

// Compare query times
console.log('Comparing full scan query approaches...');

let t0 = performance.now();
const partsQueryJoined = `
  SELECT 
    m.session_id,
    m.id AS message_id,
    m.time_created,
    m.data AS message_data,
    p.data AS part_data
  FROM message m
  JOIN part p ON p.message_id = m.id
  ORDER BY m.time_created ASC, p.id ASC;
`;
const raw1 = cp.execSync(`sqlite3 -json "${dbPath}" "${partsQueryJoined.replace(/\n/g, ' ')}"`, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
let t1 = performance.now();
console.log('Old Full JOIN query:', (t1 - t0).toFixed(2) + 'ms', 'Data size:', raw1.length);

t0 = performance.now();
// Optimized: query only parts directly with session_id
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
t1 = performance.now();
console.log('Fast targeted parts query:', (t1 - t0).toFixed(2) + 'ms', 'Data size:', raw2.length);
