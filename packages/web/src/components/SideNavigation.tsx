import React, { useEffect, useState } from 'react';

interface TopicItem {
  id: string;
  label: string;
  icon: (active: boolean) => React.ReactNode;
}

const TOPICS: TopicItem[] = [
  {
    id: 'hero',
    label: 'Overview',
    icon: (active) => (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={active ? '#00f2fe' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
      </svg>
    )
  },
  {
    id: 'terminal-simulator',
    label: 'Terminal Demo',
    icon: (active) => (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={active ? '#00f2fe' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 17 10 11 4 5"></polyline>
        <line x1="12" y1="19" x2="20" y2="19"></line>
      </svg>
    )
  },
  {
    id: 'tool-scanners',
    label: 'Supported Tools',
    icon: (active) => (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={active ? '#00f2fe' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
        <line x1="8" y1="21" x2="16" y2="21"></line>
        <line x1="12" y1="17" x2="12" y2="21"></line>
      </svg>
    )
  },
  {
    id: 'cost-calculator',
    label: 'Spend Estimator',
    icon: (active) => (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={active ? '#00f2fe' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2"></rect>
        <line x1="8" y1="6" x2="16" y2="6"></line>
        <line x1="16" y1="14" x2="16" y2="18"></line>
        <path d="M16 10h.01"></path>
        <path d="M12 10h.01"></path>
        <path d="M8 10h.01"></path>
        <path d="M12 14h.01"></path>
        <path d="M8 14h.01"></path>
        <path d="M12 18h.01"></path>
        <path d="M8 18h.01"></path>
      </svg>
    )
  },
  {
    id: 'privacy-architecture',
    label: 'Privacy & Storage',
    icon: (active) => (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={active ? '#00f2fe' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
      </svg>
    )
  }
];

export const SideNavigation: React.FC = () => {
  const [activeSection, setActiveSection] = useState('hero');

  useEffect(() => {
    const observerCallback: IntersectionObserverCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, {
      root: null,
      rootMargin: '-25% 0px -45% 0px',
      threshold: 0.1
    });

    TOPICS.forEach((t) => {
      const element = document.getElementById(t.id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <aside
      className="side-nav-container"
      style={{
        position: 'fixed',
        left: '1.5rem',
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 40,
        display: 'none',
        flexDirection: 'column',
        gap: '0.35rem',
        background: 'rgba(9, 13, 22, 0.4)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        padding: '0.6rem 0.5rem',
        opacity: 0.35,
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = '1';
        e.currentTarget.style.background = 'rgba(9, 13, 22, 0.85)';
        e.currentTarget.style.borderColor = 'rgba(0, 242, 254, 0.3)';
        e.currentTarget.style.transform = 'translateY(-50%) scale(1.02)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = '0.35';
        e.currentTarget.style.background = 'rgba(9, 13, 22, 0.4)';
        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
        e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
      }}
    >
      <div style={{ fontSize: '0.62rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0.2rem 0.5rem 0.3rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        Navigation
      </div>

      {TOPICS.map((topic) => {
        const isActive = activeSection === topic.id;
        return (
          <button
            key={topic.id}
            onClick={() => scrollTo(topic.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.38rem 0.65rem',
              borderRadius: '6px',
              border: 'none',
              background: isActive ? 'rgba(0, 242, 254, 0.12)' : 'transparent',
              color: isActive ? '#00f2fe' : '#94a3b8',
              fontWeight: isActive ? 600 : 400,
              fontSize: '0.8rem',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease',
              outline: 'none',
              borderLeft: isActive ? '2px solid #00f2fe' : '2px solid transparent'
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', opacity: isActive ? 1 : 0.7 }}>
              {topic.icon(isActive)}
            </span>
            <span>{topic.label}</span>
          </button>
        );
      })}
    </aside>
  );
};
