import React from 'react';

interface HistoryViewProps {
  searches: string[];
  inspectedTitles: string[];
  onSelectSearch: (query: string) => void;
  onClearHistory: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  searches,
  inspectedTitles,
  onSelectSearch,
  onClearHistory,
}) => {
  return (
    <section className="w-full max-w-[1440px] mx-auto px-6 md:px-12 py-8 md:py-12">
      <div className="mb-8 pb-6 border-b border-[#122b1e]/15 flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-editorial-mono text-[#122b1e]/60 uppercase tracking-wider mb-2">
            <span className="w-2 h-2 rounded-full bg-[#dc5b34]" />
            <span>Audit Trail & Session Memory</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#122b1e] tracking-tight">
            Research History
          </h1>
        </div>

        {(searches.length > 0 || inspectedTitles.length > 0) && (
          <button
            onClick={onClearHistory}
            className="text-xs font-editorial-mono text-[#dc5b34] hover:underline cursor-pointer"
          >
            Clear History
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Past Search Runs */}
        <div className="bg-[#f5f8f4] border border-[#122b1e]/15 rounded-xl p-6">
          <h2 className="text-sm font-bold uppercase tracking-wider font-editorial-mono text-[#122b1e] mb-4">
            Recent Queries ({searches.length})
          </h2>

          {searches.length === 0 ? (
            <p className="text-xs text-[#122b1e]/60">No recent queries in this session.</p>
          ) : (
            <ul className="space-y-2">
              {searches.map((s, idx) => (
                <li key={idx}>
                  <button
                    onClick={() => onSelectSearch(s)}
                    className="w-full text-left py-2 px-3 rounded hover:bg-[#122b1e]/5 text-xs md:text-sm font-medium text-[#122b1e] flex items-center justify-between group cursor-pointer transition-colors"
                  >
                    <span>{s}</span>
                    <span className="text-[#122b1e]/40 group-hover:text-[#122b1e]">→</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recently Inspected Papers */}
        <div className="bg-[#f5f8f4] border border-[#122b1e]/15 rounded-xl p-6">
          <h2 className="text-sm font-bold uppercase tracking-wider font-editorial-mono text-[#122b1e] mb-4">
            Inspected Works ({inspectedTitles.length})
          </h2>

          {inspectedTitles.length === 0 ? (
            <p className="text-xs text-[#122b1e]/60">No papers inspected in detail yet.</p>
          ) : (
            <ul className="space-y-2">
              {inspectedTitles.map((title, idx) => (
                <li key={idx} className="py-2 px-3 text-xs md:text-sm text-[#122b1e]/85 border-b border-[#122b1e]/5 last:border-b-0">
                  <span className="font-editorial-mono text-[10px] text-[#122b1e]/50 mr-2">[{idx + 1}]</span>
                  <span>{title}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
};
