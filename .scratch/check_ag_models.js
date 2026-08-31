const fs = require('fs');
const path = require('path');
const os = require('os');
const { AntigravityScanner } = require('./packages/scanners/dist/index.js');

const scanner = new AntigravityScanner();
scanner.scan().then(sessions => {
  console.log('Total AG sessions:', sessions.length);
  for (const s of sessions) {
    console.log(s.id, '-> Model:', s.model, '| Project:', s.projectName);
  }
});
