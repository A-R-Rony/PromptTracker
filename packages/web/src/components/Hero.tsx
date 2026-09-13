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
    <section id="hero" style={{ padding: '3.5rem 0 2.5rem', textAlign: 'center', position: 'relative' }}>
      <div className="container" style={{ maxWidth: '820px' }}>
        
        {/* Animated Live on npm Pill */}
        <a
          href="https://www.npmjs.com/package/@ar_rony1/prompt-lens"
          target="_blank"
          rel="noreferrer"
          style={{ textDecoration: 'none', display: 'inline-flex', marginBottom: '1.25rem' }}
        >
          <div className="pill-badge live-npm-badge" style={{ gap: '0.6rem', padding: '0.35rem 1rem', fontSize: '0.8rem', color: '#f1f5f9', cursor: 'pointer' }}>
            <span className="live-beacon"></span>
            <span style={{ fontWeight: 600 }}>
              <span style={{ color: '#00f2fe' }}>Live on npm</span> • Universal AI Coding Assistant Tracker ↗
            </span>
          </div>
        </a>

        {/* Main Headline */}
        <h1 style={{
          fontSize: 'clamp(2rem, 3.5vw, 2.9rem)',
          lineHeight: 1.22,
          fontWeight: 800,
          marginBottom: '1rem',
          letterSpacing: '-0.035em'
        }}>
          All Your AI Coding Prompts <br />
          <span className="gradient-text">Unified Across Every Assistant</span>
        </h1>

        {/* Crisp, clean Hero Subtitle */}
        <p style={{
          fontSize: '1.05rem',
          color: 'var(--text-muted)',
          maxWidth: '600px',
          margin: '0 auto 2rem',
          lineHeight: 1.5,
          fontWeight: 400
        }}>
          A developer-first terminal interface to navigate, inspect, and analyze all your local AI coding sessions with zero cloud telemetry.
        </p>

        {/* 1-Click Copy Box */}
        <div style={{ maxWidth: '480px', margin: '0 auto 1.5rem' }}>
          <div className="code-box" style={{ padding: '0.75rem 1.1rem' }}>
            <span style={{ color: 'var(--text-dim)' }}>$</span>
            <code style={{ fontSize: '0.95rem', fontWeight: 600 }}>npx @ar_rony1/prompt-lens</code>
            <button
              className="copy-btn"
              onClick={copyCommand}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 0.85rem' }}
            >
              {copied ? (
                <>
                  <CompanyLogos.CheckIcon />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <CompanyLogos.CopyIcon />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Feature Highlights Row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1.25rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ color: 'var(--accent-emerald)' }}>✓</span> 100% Local Prompts & Data
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ color: 'var(--accent-cyan)' }}>✓</span> 24h Live Model Pricing Sync
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ color: 'var(--accent-emerald)' }}>✓</span> Exact Local Tokens & Cost
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ color: 'var(--accent-emerald)' }}>✓</span> Smart Project Scoping
          </div>
        </div>
      </div>
    </section>
  );
};
