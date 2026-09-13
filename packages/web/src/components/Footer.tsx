import React from 'react';
import { CompanyLogos } from './CompanyLogos';

export const Footer: React.FC = () => {
  return (
    <footer style={{
      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
      padding: '3.5rem 0 2.5rem',
      background: '#040812',
      color: 'var(--text-muted)',
      fontSize: '0.9rem'
    }}>
      <div className="container" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1.5rem' }}>
        
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.25rem',
              background: 'linear-gradient(135deg, rgba(0,242,254,0.15), rgba(0,245,160,0.15))',
              border: '1px solid rgba(0,242,254,0.4)',
              borderRadius: '8px',
              boxShadow: '0 0 10px rgba(0,242,254,0.15)'
            }}>
              <CompanyLogos.PromptLensLogo />
            </div>
            <strong style={{ color: '#ffffff', fontSize: '1.1rem', letterSpacing: '-0.02em' }}>
              Prompt<span className="gradient-text">Lens</span>
            </strong>
            <span className="pill-badge pill-cyan" style={{ fontSize: '0.7rem', padding: '0.1rem 0.45rem' }}>MIT License</span>
          </div>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>
            Universal AI Coding Prompt & Token Usage Telemetry Tracker.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <a
            href="https://www.npmjs.com/package/@ar_rony1/prompt-lens"
            target="_blank"
            rel="noreferrer"
            style={{ color: '#00f2fe', textDecoration: 'none', fontWeight: 500 }}
          >
            npm Package
          </a>
          <a
            href="https://github.com/A-R-Rony/PromptTracker"
            target="_blank"
            rel="noreferrer"
            style={{ color: '#e2e8f0', textDecoration: 'none' }}
          >
            GitHub Repository
          </a>
          <a
            href="https://www.linkedin.com/in/ar-rony1/"
            target="_blank"
            rel="noreferrer"
            style={{ color: '#38bdf8', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
            </svg>
            LinkedIn
          </a>
          <a
            href="https://github.com/A-R-Rony/PromptTracker/blob/main/LICENSE"
            target="_blank"
            rel="noreferrer"
            style={{ color: 'var(--text-dim)', textDecoration: 'none' }}
          >
            License
          </a>
        </div>

      </div>

      <div className="container" style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.04)', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
        Created with ❤️ by <a href="https://www.linkedin.com/in/ar-rony1/" target="_blank" rel="noreferrer" style={{ color: '#00f2fe', fontWeight: 600, textDecoration: 'none' }}>A R Rony</a>. Free and Open Source.
      </div>
    </footer>
  );
};
