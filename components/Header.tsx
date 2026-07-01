import React from 'react';
import { ThemeType } from '../app/types';

interface HeaderProps {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
}

export default function Header({ theme, setTheme }: HeaderProps) {
  return (
    <header className="header">
      <div className="header-top-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div className="title-wrapper" style={{ margin: 0, gap: '1.2rem' }}>
          <span className="radar-icon-pulse"></span>
          <h1 id="app-title" className="gradient-text font-mono">What&apos;s Over My Head</h1>
        </div>
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value as ThemeType)}
          className="secondary-btn font-mono theme-select-dropdown"
          style={{ fontSize: '1.1rem', padding: '0.4rem 0.8rem', cursor: 'pointer', appearance: 'auto', outline: 'none' }}
        >
          <option value="default">THEME: DEFAULT (DARK)</option>
          <option value="dark-blue">THEME: DARK BLUE</option>
          <option value="pink">THEME: GIRLY PINK (LIGHT)</option>
          <option value="light-blue">THEME: LIGHT BLUE</option>
        </select>
      </div>
    </header>
  );
}
