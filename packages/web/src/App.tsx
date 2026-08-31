import React, { useState, useEffect } from 'react';
import type { NormalizedSession } from '../../core/dist/types';
import { fetchSessions, fetchSummary, openSessionInIDE, TelemetrySummary } from './api';
import { filterSessionsByDatePreset, searchSessions, DatePreset } from './filters';
import { formatTokens, formatCost } from './format';

export const App: React.FC = () => {
  const [sessions, setSessions] = useState<NormalizedSession[]>([]);
  const [summary, setSummary] = useState<TelemetrySummary | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [loading, setLoading] = useState(true);
  const [openingIDE, setOpeningIDE] = useState(false);

  const loadData = async (force = false) => {
    try {
      setLoading(true);
      const [sessData, summData] = await Promise.all([fetchSessions(force), fetchSummary()]);
      setSessions(sessData);
      setSummary(summData);
      if (sessData.length > 0 && !selectedSessionId) {
        setSelectedSessionId(sessData[0].id);
      }
    } catch (err) {
      console.error('Failed to load telemetry data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenIDE = async (sessionId: string) => {
    try {
      setOpeningIDE(true);
      await openSessionInIDE(sessionId);
    } catch (err) {
      console.error('Failed to launch IDE:', err);
    } finally {
      setOpeningIDE(false);
    }
  };

  const filteredByDate = filterSessionsByDatePreset(sessions, datePreset);
  const filteredSessions = searchSessions(filteredByDate, searchQuery);
  const selectedSession = sessions.find(s => s.id === selectedSessionId) || filteredSessions[0] || null;

  const maxDailyCost = Math.max(...(summary?.daily.map(d => d.totalCostUsd) || [1]), 0.01);

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header glass-panel">
        <div className="logo-group">
          <div className="logo-badge">🔥</div>
          <div className="title-wrap">
            <h1>PromptTracker</h1>
            <p>Universal AI Coding Telemetry & Token Intelligence</p>
          </div>
        </div>
        <div className="header-controls">
          <button className="pill-btn" onClick={() => loadData(true)} disabled={loading}>
            {loading ? 'Refreshing...' : '⚡ Refresh Data'}
          </button>
        </div>
      </header>

      {/* KPI Cards */}
      <section className="kpi-grid">
        <div className="kpi-card glass-card">
          <div className="kpi-icon" style={{ background: 'rgba(56, 189, 248, 0.15)', color: 'var(--accent-cyan)' }}>
            📊
          </div>
          <div className="kpi-data">
            <h4>Total Tokens</h4>
            <div className="kpi-value">{formatTokens(summary?.totalTokens || 0)}</div>
          </div>
        </div>

        <div className="kpi-card glass-card">
          <div className="kpi-icon" style={{ background: 'rgba(168, 85, 247, 0.15)', color: 'var(--accent-purple)' }}>
            💬
          </div>
          <div className="kpi-data">
            <h4>Total Prompts</h4>
            <div className="kpi-value">{(summary?.totalPrompts || 0).toLocaleString()}</div>
          </div>
        </div>

        <div className="kpi-card glass-card">
          <div className="kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-emerald)' }}>
            💵
          </div>
          <div className="kpi-data">
            <h4>Est. Spend</h4>
            <div className="kpi-value">{formatCost(summary?.totalCostUsd || 0)}</div>
          </div>
        </div>

        <div className="kpi-card glass-card">
          <div className="kpi-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-amber)' }}>
            🧰
          </div>
          <div className="kpi-data">
            <h4>Active Tools</h4>
            <div className="kpi-value">{Object.keys(summary?.byTool || {}).length}</div>
          </div>
        </div>
      </section>

      {/* Analytics & Charts */}
      <section className="analytics-grid">
        {/* Daily Spend Bar Chart */}
        <div className="chart-card glass-panel">
          <h3 className="section-title">📅 Daily Spend Analytics</h3>
          <div className="bar-chart-container">
            {summary?.daily.slice(0, 10).reverse().map((day) => {
              const heightPct = Math.max((day.totalCostUsd / maxDailyCost) * 100, 8);
              return (
                <div key={day.date} className="bar-column">
                  <div className="bar-track">
                    <div className="bar-fill" style={{ height: `${heightPct}%` }} title={`${day.date}: ${formatCost(day.totalCostUsd)} (${day.totalPrompts} prompts)`} />
                  </div>
                  <span className="bar-label">{day.date.slice(5)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Model Spend Breakdown */}
        <div className="breakdown-card glass-panel">
          <h3 className="section-title">🧠 Spend by Model</h3>
          <div className="breakdown-list">
            {Object.entries(summary?.byModel || {}).slice(0, 5).map(([modelName, agg], idx) => {
              const colors = ['var(--accent-indigo)', 'var(--accent-cyan)', 'var(--accent-purple)', 'var(--accent-emerald)', 'var(--accent-amber)'];
              const color = colors[idx % colors.length];
              const pct = summary?.totalCostUsd ? Math.min((agg.cost / summary.totalCostUsd) * 100, 100) : 0;

              return (
                <div key={modelName} className="breakdown-row">
                  <div className="breakdown-info">
                    <span className="breakdown-name">{modelName}</span>
                    <span className="breakdown-cost">{formatCost(agg.cost)}</span>
                  </div>
                  <div className="breakdown-progress">
                    <div className="breakdown-fill" style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Split-Screen Conversation Explorer */}
      <section className="explorer-container">
        {/* Left Sidebar: Sessions List */}
        <div className="sessions-sidebar glass-panel">
          <div className="sidebar-header">
            <input
              type="text"
              className="search-input"
              placeholder="🔍 Search prompts, projects, or tools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="date-preset-pills">
              {(['all', 'today', 'yesterday', '7d', '30d'] as DatePreset[]).map((preset) => (
                <button
                  key={preset}
                  className={`pill-btn ${datePreset === preset ? 'active' : ''}`}
                  onClick={() => setDatePreset(preset)}
                >
                  {preset.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="sessions-list">
            {filteredSessions.map((s) => (
              <div
                key={s.id}
                className={`session-item glass-card ${selectedSession?.id === s.id ? 'selected' : ''}`}
                onClick={() => setSelectedSessionId(s.id)}
              >
                <div className="session-item-header">
                  <span className={`tool-tag ${s.toolSource}`}>{s.toolSource}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.date}</span>
                </div>
                <div className="session-item-title">{s.projectName}</div>
                <div className="session-item-meta">
                  <span>{s.turns.length} turns</span>
                  <span>{formatTokens(s.totalTokens.total)} tok</span>
                  <span>{formatCost(s.estimatedCostUsd)}</span>
                </div>
              </div>
            ))}
            {filteredSessions.length === 0 && (
              <div className="empty-state">No sessions match your filter.</div>
            )}
          </div>
        </div>

        {/* Right Pane: Conversation Reader */}
        <div className="conversation-reader glass-panel">
          {selectedSession ? (
            <>
              <div className="reader-header">
                <div className="reader-title-area">
                  <h2>{selectedSession.projectName}</h2>
                  <div className="reader-meta-pills">
                    <span>Tool: <b>{selectedSession.toolSource}</b></span>
                    <span>Model: <b>{selectedSession.model}</b></span>
                    <span>Date: <b>{selectedSession.date}</b></span>
                    <span>Cost: <b>{formatCost(selectedSession.estimatedCostUsd)}</b></span>
                  </div>
                </div>
                <button
                  className="open-ide-btn"
                  onClick={() => handleOpenIDE(selectedSession.id)}
                  disabled={openingIDE}
                >
                  {openingIDE ? 'Opening...' : '🔥 Open in IDE'}
                </button>
              </div>

              <div className="turns-scroll">
                {selectedSession.turns.map((turn) => (
                  <div key={turn.turnIndex} className="turn-card glass-card">
                    <div className="turn-header">
                      <span>🧑 DEVELOPER (Turn #{turn.turnIndex})</span>
                      <span>{turn.tokens.input.toLocaleString()} in-tokens</span>
                    </div>
                    <div className="user-prompt-text">{turn.userPrompt}</div>

                    {(turn.assistantResponse || turn.assistantSummary) && (
                      <div className="assistant-response-block">
                        <div className="assistant-response-title">
                          🤖 ASSISTANT ({turn.tokens.output.toLocaleString()} out-tokens)
                        </div>
                        <div className="assistant-response-text">
                          {turn.assistantResponse || turn.assistantSummary}
                        </div>
                      </div>
                    )}

                    {turn.toolCalls && turn.toolCalls.length > 0 && (
                      <details className="tool-calls-details">
                        <summary>🛠️ Tool Calls ({turn.toolCalls.length})</summary>
                        <pre className="tool-call-code">
                          {JSON.stringify(turn.toolCalls, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state">Select a session from the list to view the full conversation transcript.</div>
          )}
        </div>
      </section>
    </div>
  );
};
