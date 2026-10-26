import React from 'react';
import { Paper } from '../types/paper';

interface SavedPapersViewProps {
  savedPapers: Paper[];
  onSelectPaper: (paper: Paper) => void;
  onRemoveSaved: (paper: Paper) => void;
  onExploreTopic: (topic: string) => void;
}

export const SavedPapersView: React.FC<SavedPapersViewProps> = ({
  savedPapers,
  onSelectPaper,
  onRemoveSaved,
  onExploreTopic,
}) => {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const handleCopyBibtex = (paper: Paper) => {
    const bibtex = `@article{${paper.authors[0]?.split(' ').pop()?.toLowerCase() || 'author'}${paper.publicationYear},
  title={${paper.title}},
  author={${paper.authors.join(' and ')}},
  year={${paper.publicationYear}},
  journal={${paper.venue || 'Preprint'}},
  doi={${paper.doi || 'N/A'}}
}`;
    navigator.clipboard.writeText(bibtex);
    setCopiedId(paper.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <section className="w-full max-w-[1440px] mx-auto px-6 md:px-12 py-8 md:py-12">
      <div className="mb-8 pb-6 border-b border-[#122b1e]/15 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-editorial-mono text-[#122b1e]/60 uppercase tracking-wider mb-2">
            <span className="w-2 h-2 rounded-full bg-[#dc5b34]" />
            <span>Curated Research Collection</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-[#122b1e] tracking-tight">
            Saved Papers ({savedPapers.length})
          </h1>
          <p className="text-xs md:text-sm text-[#122b1e]/75 mt-1">
            Your saved reading list informs your collaborative recommendation weights.
          </p>
        </div>

        {savedPapers.length > 0 && (
          <div className="text-xs font-editorial-mono text-[#122b1e]/70">
            {savedPapers.reduce((sum, p) => sum + p.citationCount, 0).toLocaleString()} Total Citations across collection
          </div>
        )}
      </div>

      {savedPapers.length === 0 ? (
        <div className="py-20 text-center bg-[#f5f8f4] border border-[#122b1e]/10 rounded-xl p-8 space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full border border-[#122b1e]/20 flex items-center justify-center text-xl text-[#122b1e]">
            ⌕
          </div>
          <h3 className="text-lg font-bold text-[#122b1e]">No papers saved yet</h3>
          <p className="text-xs md:text-sm text-[#122b1e]/70 max-w-md mx-auto">
            Save papers while browsing recommendations to build your personal library and calibrate the collaborative recommendation filter.
          </p>
          <button
            onClick={() => onExploreTopic('Artificial Intelligence')}
            className="mt-2 px-5 py-2.5 bg-[#122b1e] text-white text-xs font-semibold rounded hover:bg-[#1a3d2e] transition-colors cursor-pointer"
          >
            Discover Research Papers →
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {savedPapers.map((paper, idx) => (
            <div
              key={paper.id}
              className="bg-[#f5f8f4] border border-[#122b1e]/15 rounded-xl p-6 hover:border-[#122b1e]/30 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs text-[#122b1e]/60 font-editorial-mono mb-1.5">
                  <span>[{String(idx + 1).padStart(2, '0')}]</span>
                  <span>{paper.primaryCategory}</span>
                  <span aria-hidden="true">·</span>
                  <span>{paper.publicationYear}</span>
                  {paper.venue && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-medium text-[#122b1e]">{paper.venue}</span>
                    </>
                  )}
                </div>

                <h2
                  onClick={() => onSelectPaper(paper)}
                  className="text-base md:text-lg font-bold text-[#122b1e] hover:underline cursor-pointer leading-snug mb-2"
                >
                  {paper.title}
                </h2>

                <p className="text-xs text-[#122b1e]/75">
                  {paper.authors.join(', ')}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                <button
                  onClick={() => handleCopyBibtex(paper)}
                  className="px-3 py-1.5 text-xs font-editorial-mono bg-[#122b1e]/5 hover:bg-[#122b1e]/10 text-[#122b1e] rounded transition-colors cursor-pointer"
                >
                  {copiedId === paper.id ? 'Copied BibTeX ✓' : 'BibTeX'}
                </button>

                <button
                  onClick={() => onSelectPaper(paper)}
                  className="px-4 py-1.5 text-xs font-semibold bg-[#122b1e] hover:bg-[#1a3d2e] text-white rounded transition-colors cursor-pointer"
                >
                  Inspect
                </button>

                <button
                  onClick={() => onRemoveSaved(paper)}
                  title="Remove from saved"
                  className="w-8 h-8 rounded border border-[#122b1e]/20 flex items-center justify-center text-xs text-[#122b1e]/60 hover:text-[#dc5b34] hover:border-[#dc5b34] transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
