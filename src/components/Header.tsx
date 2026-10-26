import React from 'react';

interface HeaderProps {
  activeTab: 'discover' | 'recommendations' | 'saved' | 'history';
  onSelectTab: (tab: 'discover' | 'recommendations' | 'saved' | 'history') => void;
  savedCount: number;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, onSelectTab, savedCount }) => {
  return (
    <header className="w-full border-b border-[#122b1e]/10 bg-[#edf2ec]/90 backdrop-blur-md sticky top-0 z-40 transition-colors">
      <div className="max-w-[1440px] mx-auto px-6 md:px-12 h-18 flex items-center justify-between">
        
        {/* Zone 1: Navigation Links (Left) */}
        <nav className="flex-1 flex items-center gap-6 md:gap-8 text-xs md:text-sm font-medium tracking-tight text-[#122b1e]/75">
          <button
            onClick={() => onSelectTab('discover')}
            className={`transition-colors hover:text-[#122b1e] cursor-pointer whitespace-nowrap ${
              activeTab === 'discover' ? 'text-[#122b1e] font-semibold underline underline-offset-8 decoration-1 decoration-[#122b1e]' : ''
            }`}
          >
            Discover
          </button>
          <button
            onClick={() => onSelectTab('recommendations')}
            className={`transition-colors hover:text-[#122b1e] cursor-pointer whitespace-nowrap ${
              activeTab === 'recommendations' ? 'text-[#122b1e] font-semibold underline underline-offset-8 decoration-1 decoration-[#122b1e]' : ''
            }`}
          >
            Recommendations
          </button>
          <button
            onClick={() => onSelectTab('saved')}
            className={`transition-colors hover:text-[#122b1e] cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'saved' ? 'text-[#122b1e] font-semibold underline underline-offset-8 decoration-1 decoration-[#122b1e]' : ''
            }`}
          >
            <span>Saved Papers</span>
            {savedCount > 0 && (
              <span className="font-editorial-mono text-[11px] text-[#dc5b34] font-semibold tabular-nums">
                ({savedCount})
              </span>
            )}
          </button>
          <button
            onClick={() => onSelectTab('history')}
            className={`hidden sm:inline-block transition-colors hover:text-[#122b1e] cursor-pointer whitespace-nowrap ${
              activeTab === 'history' ? 'text-[#122b1e] font-semibold underline underline-offset-8 decoration-1 decoration-[#122b1e]' : ''
            }`}
          >
            History
          </button>
        </nav>

        {/* Zone 2: Wordmark Brand (Center - exactly like the reference design's [■] Tribeca) */}
        <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => onSelectTab('discover')}>
          <div className="w-2.5 h-2.5 bg-[#122b1e] shrink-0" aria-hidden="true" />
          <span className="text-base md:text-lg font-bold tracking-tight text-[#122b1e]">
            Scholaris
          </span>
        </div>

        {/* Zone 3: Balanced spacer keeping brand perfectly centered */}
        <div className="flex-1 hidden md:flex items-center justify-end" aria-hidden="true" />

      </div>
    </header>
  );
};
