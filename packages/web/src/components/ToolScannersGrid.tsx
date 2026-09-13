import React from 'react';
import { CompanyLogos } from './CompanyLogos';

interface ToolInfo {
  name: string;
  badge: string;
  badgeColor: string;
  logo: React.ReactNode;
  path: string;
  description: string;
}

const TOOLS: ToolInfo[] = [
  {
    name: 'Google Antigravity IDE',
    badge: 'ANTIGRAVITY',
    badgeColor: 'pill-cyan',
    logo: <CompanyLogos.GoogleGemini />,
    path: '~/.gemini/antigravity-ide/brain/*/transcript.jsonl',
    description: 'Parses complex multi-turn conversation logs, rules, tool invocations, and workspace paths automatically.'
  },
  {
    name: 'Anthropic Claude Code',
    badge: 'CLAUDE',
    badgeColor: 'pill-purple',
    logo: <CompanyLogos.Anthropic />,
    path: '~/.claude/projects/*/*.jsonl',
    description: 'Decodes sanitized directory names, project hashes, and conversation turn payloads with subagent tracking.'
  },
  {
    name: 'OpenAI Codex / ChatGPT CLI',
    badge: 'CODEX',
    badgeColor: 'pill-emerald',
    logo: <CompanyLogos.OpenAI />,
    path: '~/.codex/sessions/YYYY/MM/DD/*.jsonl',
    description: 'Indexes session metadata, token usage metrics, and exact model responses with 0ms startup overhead.'
  },
  {
    name: 'Kiro IDE',
    badge: 'KIRO',
    badgeColor: 'pill-cyan',
    logo: <CompanyLogos.Kiro />,
    path: '~/.kiro/workspaces/*/*.json',
    description: 'Tracks workspace contexts, root path metadata, and turn histories across multi-folder developer environments.'
  },
  {
    name: 'OpenCode',
    badge: 'OPENCODE',
    badgeColor: 'pill-purple',
    logo: <CompanyLogos.OpenCode />,
    path: '~/.local/share/opencode/opencode.db',
    description: 'Directly queries local OpenCode SQLite databases and legacy session directories with incremental caching.'
  }
];

export const ToolScannersGrid: React.FC = () => {
  return (
    <section id="tool-scanners" style={{ padding: '4rem 0' }}>
      <div className="container">
        
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div className="pill-badge pill-purple" style={{ marginBottom: '0.75rem' }}>
            Pluggable Engine
          </div>
          <h2 style={{ fontSize: '2.2rem', marginBottom: '0.75rem' }}>One Tool for All Your AI Coding Assistants</h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: '640px', margin: '0 auto' }}>
            PromptLens automatically discovers and normalizes logs from your installed developer tools without requiring manual imports or API keys.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem'
        }}>
          {TOOLS.map((tool) => (
            <div key={tool.name} className="glass-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      padding: '8px'
                    }}>
                      {tool.logo}
                    </div>
                    <h3 style={{ fontSize: '1.15rem' }}>{tool.name}</h3>
                  </div>
                  <span className={`pill-badge ${tool.badgeColor}`}>{tool.badge}</span>
                </div>

                <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                  {tool.description}
                </p>
              </div>

              <div style={{ background: '#040812', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Authoritative Source Path
                </div>
                <code className="mono" style={{ fontSize: '0.78rem', color: '#38bdf8', wordBreak: 'break-all' }}>
                  {tool.path}
                </code>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
