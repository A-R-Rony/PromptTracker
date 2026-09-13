import React, { useState } from 'react';
import { CompanyLogos } from './CompanyLogos';

interface CommandItem {
  id: string;
  category: 'Interactive' | 'Analytics' | 'Scripting' | 'Export' | 'Cache';
  title: string;
  command: string;
  description: string;
  flags: Array<{ flag: string; desc: string }>;
}

const COMMANDS: CommandItem[] = [
  {
    id: 'tui-scoped',
    category: 'Interactive',
    title: 'Interactive Terminal UI',
    command: 'prompt-lens',
    description: 'Launch interactive TUI scoped to active project with instant hotkeys.',
    flags: [
      { flag: '-a', desc: 'Global machine-wide scope' },
      { flag: '-r', desc: 'Force rescan all transcripts' },
      { flag: '--since 7d', desc: 'Filter by relative date' }
    ]
  },
  {
    id: 'stats-cmd',
    category: 'Analytics',
    title: 'Telemetry Analytics Summary',
    command: 'prompt-lens stats',
    description: 'Detailed prompt counts, token burn, and costs grouped by tool & model.',
    flags: [
      { flag: '-a', desc: 'Machine-wide aggregate' },
      { flag: '-d <date>', desc: 'Filter by exact date' },
      { flag: '--since 30d', desc: 'Filter by date range' }
    ]
  },
  {
    id: 'list-cmd',
    category: 'Scripting',
    title: 'Tabular & JSON Output',
    command: 'prompt-lens list --json',
    description: 'Output structured JSON or clean ASCII tables for scripts and CI/CD.',
    flags: [
      { flag: '--json', desc: 'Raw JSON output' },
      { flag: '-p <name>', desc: 'Filter by project name' }
    ]
  },
  {
    id: 'export-cmd',
    category: 'Export',
    title: 'Conversation Exporter',
    command: 'prompt-lens export [id]',
    description: 'Export full conversations with code and collapsible tool calls.',
    flags: [
      { flag: '--format md', desc: 'Export Markdown doc' },
      { flag: '--out <path>', desc: 'Custom output destination' }
    ]
  },
  {
    id: 'cache-cmd',
    category: 'Cache',
    title: 'SQLite Cache Management',
    command: 'prompt-lens cache status',
    description: 'Inspect cache size, force resync, or safely clear cached turns.',
    flags: [
      { flag: 'cache rescan', desc: 'Force full rescan' },
      { flag: 'cache clear', desc: 'Safely clear turn content' }
    ]
  }
];

export const CommandReference: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const categories = ['All', 'Interactive', 'Analytics', 'Scripting', 'Export', 'Cache'];

  const filteredCommands = activeCategory === 'All'
    ? COMMANDS
    : COMMANDS.filter(c => c.category === activeCategory);

  const copyCommand = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <section id="commands" style={{ padding: '3.5rem 0' }}>
      <div className="container" style={{ maxWidth: '1050px' }}>
        
        {/* Section Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div className="pill-badge pill-cyan" style={{ marginBottom: '0.75rem' }}>
            Command Surface
          </div>
          <h2 style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>Every Command You Need</h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: '640px', margin: '0 auto' }}>
            From rich interactive navigation to headless JSON pipelines, explore the PromptLens CLI.
          </p>
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          {categories.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  background: isActive ? 'linear-gradient(135deg, #00f2fe 0%, #00c6ff 100%)' : 'rgba(255, 255, 255, 0.04)',
                  color: isActive ? '#040812' : '#94a3b8',
                  fontWeight: isActive ? 700 : 500,
                  border: isActive ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
                  padding: '0.35rem 0.85rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  transition: 'all 0.15s ease'
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Compact 2-Column Responsive Layout */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))',
          gap: '1.25rem'
        }}>
          {filteredCommands.map((item) => {
            const isCopied = copiedId === item.id;
            return (
              <div
                key={item.id}
                className="glass-panel"
                style={{
                  padding: '1.25rem 1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem'
                }}
              >
                {/* Card Top: Title & Code Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{item.title}</h3>
                      <span className="pill-badge pill-purple" style={{ fontSize: '0.68rem', padding: '0.1rem 0.45rem' }}>
                        {item.category}
                      </span>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', lineHeight: 1.4 }}>
                      {item.description}
                    </p>
                  </div>
                </div>

                {/* Compact Copy Code Box */}
                <div
                  className="code-box"
                  style={{
                    padding: '0.5rem 0.85rem',
                    background: '#040812',
                    borderRadius: '8px',
                    fontSize: '0.84rem'
                  }}
                >
                  <code style={{ color: '#00f2fe', fontWeight: 600 }}>{item.command}</code>
                  <button
                    className="copy-btn"
                    onClick={() => copyCommand(item.id, item.command)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      padding: '0.25rem 0.6rem',
                      fontSize: '0.75rem'
                    }}
                  >
                    {isCopied ? (
                      <>
                        <CompanyLogos.CheckIcon />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <CompanyLogos.CopyIcon />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Horizontal Inline Flags Row */}
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.4rem 0.75rem',
                  paddingTop: '0.5rem',
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                  fontSize: '0.78rem'
                }}>
                  {item.flags.map((f) => (
                    <div key={f.flag} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <code className="mono" style={{ color: '#facc15', background: 'rgba(250,204,21,0.08)', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>
                        {f.flag}
                      </code>
                      <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>{f.desc}</span>
                    </div>
                  ))}
                </div>

              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
