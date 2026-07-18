import React from 'react';

export default function Footer() {
  return (
    <footer className="app-footer font-mono">
      {/* <p>Data Source: Community ODbL transponder aggregates.</p> */}
      <p className="privacy-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center', color: 'var(--text-muted)', fontWeight: 500 }}>
        <svg className="privacy-lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        Coordinates parsed locally only.
      </p>
      <p className="made-by" style={{ marginTop: '0.8rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
        Made by{' '}
        <a
          href="https://aayushsaini.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#0369a1', textDecoration: 'underline', fontWeight: 'bold' }}
        >
          alpher03
        </a>
        <span className="nerd-barcode" aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center', gap: '1px', marginLeft: '4px', opacity: 0.6 }}>
          {[1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4, 1, 2, 3].map((w, idx) => (
            <span
              key={idx}
              style={{
                display: 'inline-block',
                width: `${w}px`,
                height: '12px',
                backgroundColor: 'currentColor'
              }}
            />
          ))}
        </span>
      </p>
    </footer>
  );
}
