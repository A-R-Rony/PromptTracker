import React from 'react';
import { CompanyLogos } from './CompanyLogos';

export const PrivacyArchitecture: React.FC = () => {
  return (
    <section id="privacy-architecture" style={{ padding: '4rem 0' }}>
      <div className="container" style={{ maxWidth: '1000px' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div className="pill-badge pill-emerald" style={{ marginBottom: '0.75rem' }}>
            Privacy & Architecture
          </div>
          <h2 style={{ fontSize: '2.2rem', marginBottom: '0.75rem' }}>100% Local. Zero Cloud Tracking.</h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: '640px', margin: '0 auto' }}>
            PromptLens runs entirely on your local machine with strict data privacy guarantees.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
          
          <div className="glass-panel" style={{ padding: '1.75rem' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              background: 'rgba(0, 242, 254, 0.1)',
              border: '1px solid rgba(0, 242, 254, 0.25)',
              marginBottom: '1rem'
            }}>
              <CompanyLogos.ShieldIcon />
            </div>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>Zero Telemetry Teleportation</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
              Your prompts, code completions, and model responses never leave your laptop. There are no remote databases or third-party analytics servers.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '1.75rem' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              background: 'rgba(250, 204, 21, 0.1)',
              border: '1px solid rgba(250, 204, 21, 0.25)',
              marginBottom: '1rem'
            }}>
              <CompanyLogos.ZapIcon />
            </div>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>Disposable SQLite Cache</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
              PromptLens keeps a fast local index in <code className="mono" style={{ color: '#38bdf8' }}>~/.prompttracker/data.db</code> with a strict 30-day / 250MB auto-eviction policy.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '1.75rem' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              background: 'rgba(0, 245, 160, 0.1)',
              border: '1px solid rgba(0, 245, 160, 0.25)',
              marginBottom: '1rem'
            }}>
              <CompanyLogos.DatabaseIcon />
            </div>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem' }}>Authoritative Source Truth</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
              Your native tool logs remain the single source of truth. Even if cached turns are purged, 90-day-old sessions rehydrate directly from your disk on demand.
            </p>
          </div>

        </div>

        {/* Cache Command Reference Callout */}
        <div className="glass-panel" style={{ padding: '1.5rem 2rem', background: 'rgba(4, 8, 18, 0.85)', border: '1px solid rgba(0, 242, 254, 0.25)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
            <div>
              <h4 style={{ fontSize: '1.05rem', color: '#00f2fe', marginBottom: '0.2rem' }}>Full Control Over Local Storage</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Inspect or purge your disposable cache at any time with built-in CLI commands.</p>
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              <code className="mono" style={{ background: '#090d16', padding: '0.4rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', color: '#facc15', border: '1px solid rgba(255,255,255,0.1)' }}>
                prompt-lens cache status
              </code>
              <code className="mono" style={{ background: '#090d16', padding: '0.4rem 0.75rem', borderRadius: '6px', fontSize: '0.8rem', color: '#00f5a0', border: '1px solid rgba(255,255,255,0.1)' }}>
                prompt-lens cache clear
              </code>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
