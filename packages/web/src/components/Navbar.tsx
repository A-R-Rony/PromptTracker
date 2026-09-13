import React, { useState } from 'react';
import { CompanyLogos } from './CompanyLogos';

export const Navbar: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const copyCommand = () => {
    navigator.clipboard.writeText('npx @ar_rony1/prompt-lens');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      background: 'rgba(9, 13, 22, 0.85)',
      borderBottom: '1px solid rgba(56, 189, 248, 0.12)',
      padding: '0.85rem 0'
    }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0.35rem',
            background: 'linear-gradient(135deg, rgba(0,242,254,0.15), rgba(0,245,160,0.15))',
            border: '1px solid rgba(0,242,254,0.4)',
            borderRadius: '10px',
            boxShadow: '0 0 15px rgba(0,242,254,0.2)'
          }}>
            <CompanyLogos.PromptLensLogo />
          </div>
          <div>
            <span style={{ fontWeight: 800, fontSize: '1.2rem', color: '#ffffff', letterSpacing: '-0.02em' }}>
              Prompt<span className="gradient-text">Lens</span>
            </span>
            <span className="pill-badge pill-cyan" style={{ marginLeft: '0.6rem', padding: '0.15rem 0.5rem', fontSize: '0.7rem' }}>
              v0.1.1
            </span>
          </div>
        </div>

        {/* Links & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="code-box" style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem' }}>
            <code>npx @ar_rony1/prompt-lens</code>
            <button className="copy-btn" onClick={copyCommand} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.65rem', fontSize: '0.78rem' }}>
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

          <a
            href="https://github.com/A-R-Rony/PromptTracker"
            target="_blank"
            rel="noreferrer"
            className="btn-secondary"
            style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
          >
            ★ Star on GitHub
          </a>
        </div>
      </div>
    </nav>
  );
};
