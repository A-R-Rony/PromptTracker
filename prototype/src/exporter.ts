import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { NormalizedSession } from './types';

export function exportSessionToMarkdown(session: NormalizedSession): string {
  const exportDir = path.join(os.homedir(), '.prompttracker', 'exports');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  const safeTitle = session.projectName.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
  const fileName = session.date + '_' + session.toolSource + '_' + safeTitle + '.md';
  const filePath = path.join(exportDir, fileName);

  let md = '# Conversation: ' + session.projectName + '\n\n';
  md += '- **Date**: ' + session.date + '\n';
  md += '- **Tool / Assistant**: ' + session.toolSource.toUpperCase() + '\n';
  md += '- **Model**: ' + session.model + '\n';
  md += '- **Total Tokens**: ' + session.totalTokens.total.toLocaleString() + ' (Input: ' + session.totalTokens.input.toLocaleString() + ', Output: ' + session.totalTokens.output.toLocaleString() + ')\n';
  md += '- **Estimated Cost**: $' + session.estimatedCostUsd.toFixed(4) + '\n';
  if (session.rawFilePath) {
    md += '- **Original Source File**: ' + session.rawFilePath + '\n';
  }
  md += '\n---\n\n';

  for (const t of session.turns) {
    md += '## 🧑 Turn #' + t.turnIndex + ' (Developer)\n\n';
    md += '> **Input Tokens**: ' + t.tokens.input.toLocaleString() + ' | **Time**: ' + t.timestamp + '\n\n';
    md += '`markdown\n' + t.userPrompt + '\n`\n\n';

    if (t.assistantSummary) {
      md += '### 🤖 Assistant Response\n\n';
      md += '> **Output Tokens**: ' + t.tokens.output.toLocaleString() + '\n\n';
      md += t.assistantSummary + '\n\n';
    }
    md += '---\n\n';
  }

  fs.writeFileSync(filePath, md, 'utf8');
  return filePath;
}
