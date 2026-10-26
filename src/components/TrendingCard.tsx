import React from 'react';
import { TrendingPaper } from '../services/trendingService';

interface TrendingCardProps {
  paper: TrendingPaper;
  index: number;
  onInspect: (paper: TrendingPaper) => void;
}

export const TrendingCard: React.FC<TrendingCardProps> = ({ paper, index, onInspect }) => {
  return (
    <article
      onClick={() => onInspect(paper)}
      className="bg-[#f5f8f4] border border-[#122b1e]/15 rounded-xl p-6 hover:border-[#122b1e]/40 transition-all cursor-pointer flex flex-col justify-between group shadow-xs hover:shadow-md"
    >
      <div>
        {/* Top Header: Rank Tag on Left, Trend Metric on Right */}
        <div className="flex items-center justify-between text-xs text-[#122b1e]/60 font-editorial-mono mb-2">
          <span className="font-medium text-[#122b1e]">
            [{String(index + 1).padStart(2, '0')}] #{paper.trendRank} Trending · {paper.fieldLabel}
          </span>
          <span className="text-[#dc5b34] font-bold font-editorial-mono tabular-nums flex items-center gap-1">
            {paper.trendBadge}
          </span>
        </div>

        {/* Paper Title */}
        <h4 className="text-base font-bold text-[#122b1e] group-hover:underline leading-snug mb-2 line-clamp-2">
          {paper.title}
        </h4>

        {/* 2-line Abstract Snippet */}
        <p className="text-xs text-[#122b1e]/75 line-clamp-2 mb-4 leading-relaxed font-normal">
          {paper.snippet || paper.abstract}
        </p>
      </div>

      {/* Card Footer: Year · Venue on left, Inspect button on right */}
      <div className="pt-3 border-t border-[#122b1e]/10 flex items-center justify-between text-xs text-[#122b1e]/70">
        <span className="truncate max-w-[200px]">
          {paper.publicationYear} · {paper.venue || 'Academic Journal'}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onInspect(paper);
          }}
          className="font-semibold text-[#122b1e] group-hover:text-[#dc5b34] transition-colors cursor-pointer flex items-center gap-1 shrink-0"
        >
          <span>Inspect</span>
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </article>
  );
};

export const TrendingSkeletonCard: React.FC = () => {
  return (
    <div className="bg-[#f5f8f4] border border-[#122b1e]/10 rounded-xl p-6 flex flex-col justify-between animate-pulse min-h-[190px]">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="h-3 bg-[#122b1e]/10 rounded w-1/2" />
          <div className="h-3 bg-[#dc5b34]/20 rounded w-1/4" />
        </div>
        <div className="h-4 bg-[#122b1e]/15 rounded w-full mb-2" />
        <div className="h-4 bg-[#122b1e]/10 rounded w-4/5 mb-3" />
        <div className="h-3 bg-[#122b1e]/10 rounded w-full mb-1.5" />
        <div className="h-3 bg-[#122b1e]/10 rounded w-3/4 mb-4" />
      </div>
      <div className="pt-3 border-t border-[#122b1e]/10 flex items-center justify-between">
        <div className="h-3 bg-[#122b1e]/10 rounded w-1/3" />
        <div className="h-3 bg-[#122b1e]/15 rounded w-16" />
      </div>
    </div>
  );
};
