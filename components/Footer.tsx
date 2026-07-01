import React from 'react';

export default function Footer() {
  return (
    <footer className="app-footer font-mono">
      <p>Data Source: Community ODbL transponder aggregates.</p>
      <p className="privacy-badge">🔒 Coordinates parsed locally only.</p>
      <p className="made-by" style={{ marginTop: '0.8rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
        made by{' '}
        <a
          href="https://alpher03.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#ffffff', textDecoration: 'underline', fontWeight: 'bold' }}
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
