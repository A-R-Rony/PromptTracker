import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { NormalizedSession } from '../../core/dist';

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
    md += '```markdown\n' + t.userPrompt + '\n```\n\n';

    const fullResponse = t.assistantResponse || t.assistantSummary;
    if (fullResponse) {
      md += '### 🤖 Assistant Response\n\n';
      md += '> **Output Tokens**: ' + t.tokens.output.toLocaleString() + '\n\n';
      md += fullResponse + '\n\n';
    }

    if (t.toolCalls && t.toolCalls.length > 0) {
      md += '<details>\n<summary>🛠️ <b>Tool Invocations (' + t.toolCalls.length + ')</b></summary>\n\n';
      for (const tc of t.toolCalls) {
        md += '- **' + tc.name + '**\n';
        if (tc.args) {
          md += '  ```json\n  ' + JSON.stringify(tc.args, null, 2).replace(/\n/g, '\n  ') + '\n  ```\n';
        }
      }
      md += '\n</details>\n\n';
    }

    md += '---\n\n';
  }

  fs.writeFileSync(filePath, md, 'utf8');
  return filePath;
}
