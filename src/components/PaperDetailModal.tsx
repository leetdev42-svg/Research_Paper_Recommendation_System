import React from 'react';
import { Paper } from '../types/paper';

interface PaperDetailModalProps {
  paper: Paper | null;
  onClose: () => void;
  onSelectPaper: (paper: Paper) => void;
  isSaved: boolean;
  onToggleSave: (paper: Paper) => void;
  relatedPapers: Paper[];
}

export const PaperDetailModal: React.FC<PaperDetailModalProps> = ({
  paper,
  onClose,
  onSelectPaper,
  isSaved,
  onToggleSave,
  relatedPapers,
}) => {
  if (!paper) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-[#0c1c14]/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-3xl max-h-[90vh] bg-[#edf2ec] rounded-xl md:rounded-2xl border border-[#122b1e]/20 shadow-2xl flex flex-col overflow-hidden text-[#122b1e]"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="p-6 md:p-8 border-b border-[#122b1e]/15 flex items-start justify-between gap-4 bg-[#f5f8f4]">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2 text-xs font-editorial-mono text-[#122b1e]/60">
              <span>{paper.primaryCategory}</span>
              <span aria-hidden="true">·</span>
              <span>{paper.publicationYear}</span>
              {paper.venue && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-semibold text-[#122b1e]">{paper.venue}</span>
                </>
              )}
            </div>
            
            <h2 className="text-xl md:text-2xl font-bold leading-tight tracking-tight text-[#122b1e]">
              {paper.title}
            </h2>

            <p className="text-xs md:text-sm text-[#122b1e]/80">
              {paper.authors.join(', ')}
            </p>
          </div>

          <button
            onClick={onClose}
            aria-label="Close details"
            className="w-8 h-8 rounded-full border border-[#122b1e]/20 flex items-center justify-center hover:bg-[#122b1e]/10 text-lg transition-colors cursor-pointer shrink-0"
          >
            ×
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 md:p-8 overflow-y-auto space-y-6">
          
          {/* Recommendation Rationale Callout */}
          <div className="p-4 rounded-lg bg-[#e2ebe0] border border-[#122b1e]/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-[#dc5b34]" />
                <span className="text-xs font-bold uppercase tracking-wider font-editorial-mono text-[#122b1e]">
                  Recommendation Breakdown
                </span>
              </div>
              <p className="text-xs text-[#122b1e]/85">
                {paper.whyThisPaper}
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs font-editorial-mono shrink-0">
              <div className="text-right">
                <span className="text-[#122b1e]/60 block text-[10px]">Content Match</span>
                <span className="font-bold text-[#122b1e]">{Math.round(paper.contentScore * 100)}%</span>
              </div>
              <div className="text-right">
                <span className="text-[#122b1e]/60 block text-[10px]">Reader Graph</span>
                <span className="font-bold text-[#122b1e]">{Math.round(paper.collaborativeScore * 100)}%</span>
              </div>
              <div className="text-right pl-3 border-l border-[#122b1e]/20">
                <span className="text-[#dc5b34] block text-[10px] font-bold">Hybrid Rank</span>
                <span className="font-extrabold text-[#dc5b34] text-sm">{Math.round(paper.similarityScore * 100)}%</span>
              </div>
            </div>
          </div>

          {/* Full Abstract Section */}
          <div>
            <h3 className="text-xs font-editorial-mono uppercase tracking-wider text-[#122b1e]/60 mb-2">
              Abstract
            </h3>
            <p className="text-sm md:text-base leading-relaxed text-[#122b1e]/90 font-normal">
              {paper.abstract}
            </p>
          </div>

          {/* Research Topics (Zero-Pill: Clean unboxed text with slashes) */}
          <div>
            <h3 className="text-xs font-editorial-mono uppercase tracking-wider text-[#122b1e]/60 mb-2">
              Research Index Topics
            </h3>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#122b1e]/80">
              {paper.topics.map((topic, i) => (
                <React.Fragment key={topic}>
                  <span className="font-medium text-[#122b1e]">{topic}</span>
                  {i < paper.topics.length - 1 && (
                    <span className="text-[#122b1e]/30 select-none">/</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Related / Semantically Similar Papers */}
          {relatedPapers.length > 0 && (
            <div className="pt-4 border-t border-[#122b1e]/15">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-editorial-mono uppercase tracking-wider text-[#122b1e]/70">
                  Related Discoveries · Reader Also Explored
                </h3>
                <span className="text-[11px] font-editorial-mono text-[#122b1e]/50">
                  Semantic Cluster
                </span>
              </div>

              <div className="space-y-2">
                {relatedPapers.map((rel) => (
                  <div
                    key={rel.id}
                    onClick={() => onSelectPaper(rel)}
                    className="p-3 rounded-lg bg-[#f5f8f4] border border-[#122b1e]/10 hover:border-[#122b1e]/30 cursor-pointer transition-all flex items-center justify-between gap-4 group"
                  >
                    <div className="min-w-0">
                      <h4 className="text-xs md:text-sm font-semibold text-[#122b1e] group-hover:underline truncate">
                        {rel.title}
                      </h4>
                      <p className="text-[11px] text-[#122b1e]/60 truncate">
                        {rel.authors.slice(0, 2).join(', ')} · {rel.publicationYear} · {rel.venue || rel.primaryCategory}
                      </p>
                    </div>
                    <span className="font-editorial-mono text-xs font-semibold text-[#dc5b34] shrink-0">
                      {Math.round(rel.similarityScore * 100)}% match →
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 md:p-6 border-t border-[#122b1e]/15 bg-[#f5f8f4] flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs text-[#122b1e]/60 font-editorial-mono">
            {paper.citationCount.toLocaleString()} Citations · {paper.openAccess ? 'Open Access Available' : 'Subscription/DOI Access'}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onToggleSave(paper)}
              className={`px-4 py-2 text-xs font-semibold rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
                isSaved 
                  ? 'bg-[#dc5b34] text-white hover:bg-[#c44f2b]' 
                  : 'bg-[#122b1e]/10 text-[#122b1e] hover:bg-[#122b1e]/20'
              }`}
            >
              <span>{isSaved ? 'Saved to Library ✓' : 'Save to Library'}</span>
            </button>

            <a
              href={paper.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2 text-xs font-semibold bg-[#122b1e] hover:bg-[#1a3d2e] text-white rounded transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <span>View Source / PDF</span>
              <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>

      </div>
    </div>
  );
};
