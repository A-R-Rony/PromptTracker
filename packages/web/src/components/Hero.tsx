import React, { useState } from 'react';
import { CompanyLogos } from './CompanyLogos';

export const Hero: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const copyCommand = () => {
    navigator.clipboard.writeText('npx @ar_rony1/prompt-lens');
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <section id="hero" style={{ padding: '5rem 0 3.5rem', textAlign: 'center', position: 'relative' }}>
      <div className="container" style={{ maxWidth: '900px' }}>
        
        {/* Release Pill */}
        <div style={{ display: 'inline-flex', marginBottom: '1.5rem' }}>
          <div className="pill-badge pill-cyan" style={{ gap: '0.6rem', padding: '0.45rem 1.1rem', fontSize: '0.85rem' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#00f2fe', boxShadow: '0 0 10px #00f2fe' }}></span>
            <span>Live on npm • Universal AI Coding Telemetry</span>
          </div>
        </div>

        {/* Main Headline */}
        <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', lineHeight: 1.15, marginBottom: '1.5rem' }}>
          Stop Guessing Your <br />
          <span className="gradient-text">AI Token Burn & Model Costs</span>
        </h1>

        {/* Subtitle */}
        <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', maxWidth: '720px', margin: '0 auto 2.5rem', lineHeight: 1.6 }}>
          Automatically aggregate, analyze, and navigate prompt histories, exact tokens, and spend across 
          <strong style={{ color: '#fff' }}> Google Antigravity</strong>, 
          <strong style={{ color: '#fff' }}> Claude Code</strong>, 
          <strong style={{ color: '#fff' }}> Codex</strong>, 
          <strong style={{ color: '#fff' }}> Kiro</strong>, and 
          <strong style={{ color: '#fff' }}> OpenCode</strong> directly in your terminal.
        </p>

        {/* 1-Click Copy Box */}
        <div style={{ maxWidth: '540px', margin: '0 auto 2rem' }}>
          <div className="code-box" style={{ padding: '0.9rem 1.25rem' }}>
            <span style={{ color: 'var(--text-dim)' }}>$</span>
            <code style={{ fontSize: '1.05rem', fontWeight: 600 }}>npx @ar_rony1/prompt-lens</code>
            <button
              className="copy-btn"
              onClick={copyCommand}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem' }}
            >
              {copied ? (
                <>
                  <CompanyLogos.CheckIcon />
                  <span>Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <CompanyLogos.CopyIcon />
                  <span>Copy Command</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Feature Highlights Row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1.75rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ color: 'var(--accent-emerald)' }}>✓</span> 100% Offline & Private
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ color: 'var(--accent-emerald)' }}>✓</span> Zero Configuration
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ color: 'var(--accent-emerald)' }}>✓</span> Multi-Tool Scanner
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ color: 'var(--accent-emerald)' }}>✓</span> Smart Monorepo Scoping
          </div>
        </div>
      </div>
    </section>
  );
};
