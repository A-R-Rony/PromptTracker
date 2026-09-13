"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportSessionToMarkdown = exportSessionToMarkdown;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
function exportSessionToMarkdown(session) {
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
