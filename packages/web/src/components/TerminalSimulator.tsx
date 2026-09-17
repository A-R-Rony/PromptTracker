import React, { useState, useEffect } from 'react';

interface MockSession {
  id: string;
  date: string;
  tool: string;
  toolColor: string;
  project: string;
  summary: string;
  tokens: number;
  cost: number;
  turns: Array<{
    userPrompt: string;
    assistantSummary: string;
    tokens: number;
  }>;
}

const MOCK_SESSIONS: MockSession[] = [
  {
    id: '1',
    date: '2026-09-13',
    tool: 'ANTIGRAVITY',
    toolColor: '#00f2fe',
    project: 'PromptTracker',
    summary: 'Implement date filtering pills and rescan lifecycle',
    tokens: 42180,
    cost: 0.1245,
    turns: [
      {
        userPrompt: 'Implement date filter hotkeys [1-5] in Header and TUI App',
        assistantSummary: 'Created DateFilterModal and updated Header pills with smooth keyboard triggers.',
        tokens: 18450
      },
      {
        userPrompt: 'Ensure AntigravityScanner discovers all subdirectories under .gemini',
        assistantSummary: 'Added multi-base directory parsing and regex cleaning for workspace paths.',
        tokens: 23730
      }
    ]
  },
  {
    id: '2',
    date: '2026-09-13',
    tool: 'CLAUDE',
    toolColor: '#c084fc',
    project: 'BackendService',
    summary: 'Refactor SQL SQLite connection pool & indices',
    tokens: 38400,
    cost: 0.3456,
    turns: [
      {
        userPrompt: 'Refactor SQLite transaction WAL mode and add index on sessions(date)',
        assistantSummary: 'Added WAL pragma and created composite index on sessions(date, projectPath).',
        tokens: 38400
      }
    ]
  },
  {
    id: '3',
    date: '2026-09-12',
    tool: 'CODEX',
    toolColor: '#00f5a0',
    project: 'WebDashboard',
    summary: 'Fix responsive flexbox layout in Ink UI list items',
    tokens: 12500,
    cost: 0.0312,
    turns: [
      {
        userPrompt: 'Why are inline items wrapping awkwardly on smaller terminal windows?',
        assistantSummary: 'Wrapped inline text elements inside single truncate container to prevent Yoga split.',
        tokens: 12500
      }
    ]
  },
  {
    id: '4',
    date: '2026-09-10',
    tool: 'OPENCODE',
    toolColor: '#fb7185',
    project: 'ApiGateway',
    summary: 'Benchmark OpenRouter live pricing sync background task',
    tokens: 89400,
    cost: 0.2682,
    turns: [
      {
        userPrompt: 'Implement non-blocking 24h background model pricing sync',
        assistantSummary: 'Created PricingEngine singleton with 24-hour mtime cache check.',
        tokens: 89400
      }
    ]
  }
];

export const TerminalSimulator: React.FC = () => {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [isGlobal, setIsGlobal] = useState(false);
  const [activeDatePreset, setActiveDatePreset] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');

  const activeSessions = isGlobal 
    ? MOCK_SESSIONS 
    : MOCK_SESSIONS.filter(s => s.project === 'PromptTracker');

  const currentSession = activeSessions[selectedIdx] || activeSessions[0];

  const totalPrompts = activeSessions.reduce((acc, s) => acc + s.turns.length, 0);
  const totalTokens = activeSessions.reduce((acc, s) => acc + s.tokens, 0);
  const totalCost = activeSessions.reduce((acc, s) => acc + s.cost, 0);

  // Keyboard navigation simulation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['1', '2', '3', '4', '5'].includes(e.key)) {
        const presets = ['today', 'yesterday', '7d', '30d', 'all'];
        setActiveDatePreset(presets[parseInt(e.key) - 1]);
      } else if (e.key.toLowerCase() === 'a') {
        setIsGlobal(prev => !prev);
      } else if (e.key === 'ArrowDown' || e.key === 'j') {
        setSelectedIdx(prev => Math.min(activeSessions.length - 1, prev + 1));
      } else if (e.key === 'ArrowUp' || e.key === 'k') {
        setSelectedIdx(prev => Math.max(0, prev - 1));
      } else if (e.key === 'Enter') {
        setViewMode(prev => prev === 'list' ? 'detail' : 'list');
      } else if (e.key.toLowerCase() === 'b' || e.key === 'Escape') {
        setViewMode('list');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSessions.length]);

  return (
    <section id="terminal-simulator" style={{ padding: '2rem 0 5rem' }}>
      <div className="container" style={{ maxWidth: '1050px' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div className="pill-badge pill-emerald" style={{ marginBottom: '0.75rem' }}>
            Interactive Demo
          </div>
          <h2 style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>Experience PromptLens in Your Browser</h2>
          <p style={{ color: 'var(--text-muted)' }}>
            Try pressing <kbd style={{ background: '#1e293b', padding: '0.2rem 0.5rem', borderRadius: '4px', color: '#38bdf8' }}>1-5</kbd> for date filters, <kbd style={{ background: '#1e293b', padding: '0.2rem 0.5rem', borderRadius: '4px', color: '#38bdf8' }}>a</kbd> for scope toggle, or <kbd style={{ background: '#1e293b', padding: '0.2rem 0.5rem', borderRadius: '4px', color: '#38bdf8' }}>Enter</kbd> to inspect conversation turns!
          </p>
        </div>

        {/* Terminal Window Box */}
        <div className="terminal-window">
          {/* Window Chrome Header */}
          <div className="terminal-header">
            <div className="terminal-dots">
              <span className="dot dot-red"></span>
              <span className="dot dot-yellow"></span>
              <span className="dot dot-green"></span>
            </div>
            <span className="terminal-title mono">prompt-lens — bash (100x28)</span>
            <div style={{ width: '40px' }}></div>
          </div>

          {/* Terminal Display Body */}
          <div className="terminal-body" style={{ minHeight: '380px' }}>
            
            {/* Header Box */}
            <div style={{
              border: '1px solid #00f2fe',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              marginBottom: '1rem',
              background: 'rgba(0, 242, 254, 0.03)'
            }}>
              {/* Row 1: Scope & Date Presets */}
              <div className="terminal-header-row">
                <div style={{ wordBreak: 'break-word' }}>
                  <span style={{ color: '#00f2fe', fontWeight: 'bold' }}>🔍 PROMPT-LENS</span>
                  <span style={{ color: '#64748b' }}> │ </span>
                  <span style={{ color: '#ffffff', fontWeight: 'bold' }}>Scope: </span>
                  <span style={{ color: isGlobal ? '#facc15' : '#00f5a0', fontWeight: 'bold' }}>
                    {isGlobal ? 'All Projects (Global)' : 'Project: PromptTracker'}
                  </span>
                  <span style={{ color: '#64748b', cursor: 'pointer' }} onClick={() => setIsGlobal(!isGlobal)}> [a]</span>
                </div>

                <div className="terminal-presets-list">
                  {[
                    { key: '1', label: 'Today', val: 'today' },
                    { key: '2', label: 'Yesterday', val: 'yesterday' },
                    { key: '3', label: '7D', val: '7d' },
                    { key: '4', label: '30D', val: '30d' },
                    { key: '5', label: 'All', val: 'all' }
                  ].map(p => {
                    const active = activeDatePreset === p.val;
                    return (
                      <span
                        key={p.val}
                        onClick={() => setActiveDatePreset(p.val)}
                        style={{
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          background: active ? '#00f2fe' : 'transparent',
                          color: active ? '#040812' : '#38bdf8',
                          fontWeight: active ? 'bold' : 'normal',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        [{p.key}] {p.label}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Row 2: Aggregate Metrics Bar */}
              <div className="terminal-metrics-row">
                <div>
                  <span style={{ color: '#ffffff' }}>Prompts: </span>
                  <strong style={{ color: '#00f5a0' }}>{totalPrompts}</strong>
                  <span style={{ color: '#64748b' }}> │ </span>
                </div>
                <div>
                  <span style={{ color: '#ffffff' }}>Est. Tokens: </span>
                  <strong style={{ color: '#00f2fe' }}>{totalTokens.toLocaleString()}</strong>
                  <span style={{ color: '#64748b' }}> │ </span>
                </div>
                <div>
                  <span style={{ color: '#ffffff' }}>Est. Cost: </span>
                  <strong style={{ color: '#facc15' }}>${totalCost.toFixed(4)}</strong>
                </div>
              </div>
            </div>

            {/* Main Area: List vs Detail */}
            {viewMode === 'list' ? (
              <div style={{
                border: '1px solid rgba(0, 242, 254, 0.4)',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                background: 'rgba(0, 0, 0, 0.5)',
                overflowX: 'auto'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.6rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.4rem' }}>
                  <span style={{ color: '#00f2fe', fontWeight: 'bold', fontSize: '0.85rem' }}>
                    📋 SESSIONS LIST ({selectedIdx + 1} of {activeSessions.length})
                  </span>
                  <span style={{ color: '#64748b', fontSize: '0.8rem' }}>
                    [Enter] Inspect turns • [o] Open in IDE
                  </span>
                </div>

                {activeSessions.map((sess, idx) => {
                  const isSelected = idx === selectedIdx;
                  return (
                    <div
                      key={sess.id}
                      className="terminal-session-row"
                      onClick={() => setSelectedIdx(idx)}
                      onDoubleClick={() => setViewMode('detail')}
                      style={{
                        background: isSelected ? 'rgba(0, 242, 254, 0.12)' : 'transparent',
                      }}
                    >
                      <div className="terminal-session-left">
                        <span style={{ color: isSelected ? '#00f2fe' : 'transparent', fontWeight: 'bold', flexShrink: 0 }}>▶</span>
                        <span style={{ color: isSelected ? '#ffffff' : '#94a3b8', flexShrink: 0 }}>{sess.date}</span>
                        <span style={{ color: '#64748b', flexShrink: 0 }}>│</span>
                        <span style={{ color: sess.toolColor, fontWeight: 'bold', fontSize: '0.8rem', flexShrink: 0 }}>[{sess.tool}]</span>
                        <span style={{ color: '#64748b', flexShrink: 0 }}>│</span>
                        <span style={{ color: isSelected ? '#facc15' : '#e2e8f0', fontWeight: isSelected ? '600' : '400', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {sess.summary} <span style={{ color: '#64748b' }}>[{sess.project}]</span>
                        </span>
                      </div>

                      <div className="terminal-session-right">
                        <span style={{ color: '#64748b' }}>│</span>
                        <span style={{ color: isSelected ? '#00f2fe' : '#94a3b8' }}>{sess.tokens.toLocaleString()} tok</span>
                        <span style={{ color: '#64748b' }}>│</span>
                        <span style={{ color: isSelected ? '#00f5a0' : '#94a3b8' }}>${sess.cost.toFixed(4)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{
                border: '1px solid rgba(0, 245, 160, 0.4)',
                borderRadius: '8px',
                padding: '1rem',
                background: 'rgba(0, 0, 0, 0.6)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                  <div>
                    <span style={{ color: '#00f5a0', fontWeight: 'bold', wordBreak: 'break-word' }}>🔍 TURN INSPECTION: {currentSession?.summary}</span>
                  </div>
                  <span style={{ color: '#38bdf8', cursor: 'pointer', fontSize: '0.85rem' }} onClick={() => setViewMode('list')}>
                    [b] Back to List
                  </span>
                </div>

                {currentSession?.turns.map((turn, tIdx) => (
                  <div key={tIdx} style={{ marginBottom: '1rem', background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '6px' }}>
                    <div style={{ color: '#facc15', fontWeight: 'bold', marginBottom: '0.3rem', fontSize: '0.85rem' }}>
                      🧑 Turn #{tIdx + 1} Prompt:
                    </div>
                    <div style={{ color: '#e2e8f0', marginBottom: '0.5rem', fontSize: '0.9rem', wordBreak: 'break-word' }}>
                      {turn.userPrompt}
                    </div>
                    <div style={{ color: '#00f2fe', fontWeight: 'bold', marginBottom: '0.2rem', fontSize: '0.85rem' }}>
                      🤖 Assistant Response ({turn.tokens.toLocaleString()} tokens):
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: '0.85rem', wordBreak: 'break-word' }}>
                      {turn.assistantSummary}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Footer Status Bar */}
            <div className="terminal-footer-bar">
              <div>
                <span style={{ color: '#38bdf8' }}>↑↓/jk</span> Move • <span style={{ color: '#38bdf8' }}>1-5</span> Dates • <span style={{ color: '#38bdf8' }}>a</span> Scope • <span style={{ color: '#38bdf8' }}>Enter</span> Inspect • <span style={{ color: '#38bdf8' }}>q</span> Quit
              </div>
              <div style={{ color: '#00f5a0' }}>
                ● Local SQLite (~/.prompttracker/data.db) Active
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};
