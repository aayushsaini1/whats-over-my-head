import React from 'react';

export default function Header() {
  return (
    <header className="header">
      <div className="header-top-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div className="title-wrapper" style={{ margin: 0, gap: '1.2rem' }}>
          {/* <span className="radar-icon-pulse"></span> */}
          <h1 id="app-title" className="gradient-text font-mono">What&apos;s Over My Head</h1>
        </div>
      </div>
    </header>
  );
}

