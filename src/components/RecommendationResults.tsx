import React, { useState, useEffect, useMemo } from 'react';
import { Paper, RecommendationMode } from '../types/paper';
import { TrendingCard, TrendingSkeletonCard } from './TrendingCard';
import { useTrendingPapers } from '../hooks/useTrendingPapers';

interface RecommendationResultsProps {
  query: string;
  papers: Paper[];
  isLoading: boolean;
  onSelectPaper: (paper: Paper) => void;
  savedPaperIds: string[];
  onToggleSave: (paper: Paper) => void;
  onNewSearch: (query: string) => void;
  recommendationMode?: RecommendationMode;
  onChangeMode?: (mode: RecommendationMode) => void;
}

export const RESEARCH_DOMAINS = [
  'All Disciplines',
  'Artificial Intelligence',
  'Mental Health',
  'Digital Payments',
  'Climate Change',
  'Online Education',
  'Cybersecurity',
] as const;

export const RecommendationResults: React.FC<RecommendationResultsProps> = ({
  query,
  papers,
  isLoading,
  onSelectPaper,
  savedPaperIds,
  onToggleSave,
  onNewSearch,
}) => {
  const [searchInput, setSearchInput] = useState(query);
  const [selectedCategory, setSelectedCategory] = useState<string>('All Disciplines');
  const [selectedYear, setSelectedYear] = useState<string>('latest');
  const [showTrendingWhenSearching, setShowTrendingWhenSearching] = useState(false);

  const isSearchingTopic = Boolean(query && query.trim() !== '');

  // Automatically hide trending papers whenever a new search query is issued
  useEffect(() => {
    setShowTrendingWhenSearching(false);
  }, [query]);

  // Fetch real trending papers for the currently active domain
  const {
    timeframe: trendingTimeframe,
    setTimeframe: setTrendingTimeframe,
    trendingPapers,
    isLoading: isLoadingTrending,
    error: trendingError,
    refetch: refetchTrending,
  } = useTrendingPapers(selectedCategory !== 'All Disciplines' ? selectedCategory : undefined, 3);

  // Compute available recent years from dataset and recent calendar years
  const availableYears = useMemo(() => {
    const paperYears = papers.map((p) => p.publicationYear).filter(Boolean);
    const standardRecentYears = [2026, 2025, 2024, 2023, 2022, 2021, 2020];
    const allYears = Array.from(new Set([...paperYears, ...standardRecentYears]))
      .filter((y) => typeof y === 'number' && y >= 2018)
      .sort((a, b) => b - a);
    return allYears;
  }, [papers]);

  // Sync input and selectedCategory when query prop changes
  useEffect(() => {
    setSearchInput(query);
    const matched = RESEARCH_DOMAINS.find((d) => d.toLowerCase() === query.toLowerCase());
    if (matched) {
      setSelectedCategory(matched);
    } else if (query.trim() === '' || query === 'research') {
      setSelectedCategory('All Disciplines');
    }
  }, [query]);

  // When domain filter changes, recommend relevant research papers for that domain
  const handleDomainChange = (domain: string) => {
    setSelectedCategory(domain);
    if (domain === 'All Disciplines') {
      onNewSearch('research');
    } else {
      setSearchInput(domain);
      onNewSearch(domain);
    }
  };

  // Filter & Sort
  const filteredPapers = papers.filter((p) => {
    // 1. Domain filter
    if (selectedCategory !== 'All Disciplines' && selectedCategory !== 'all') {
      const target = selectedCategory.toLowerCase();
      const cat = (p.primaryCategory || '').toLowerCase();
      const topics = (p.topics || []).map((t) => t.toLowerCase()).join(' ');
      const title = (p.title || '').toLowerCase();
      if (!cat.includes(target) && !topics.includes(target) && !title.includes(target)) {
        return false;
      }
    }

    // 2. Year filter: if a specific year is chosen (not 'latest')
    if (selectedYear !== 'latest') {
      const targetYear = parseInt(selectedYear, 10);
      if (!isNaN(targetYear) && p.publicationYear !== targetYear) {
        return false;
      }
    }

    return true;
  });

  const sortedPapers = [...filteredPapers].sort((a, b) => {
    if (selectedYear === 'latest') {
      if (b.publicationYear !== a.publicationYear) {
        return b.publicationYear - a.publicationYear;
      }
    }
    return b.similarityScore - a.similarityScore;
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      onNewSearch(searchInput.trim());
    }
  };

  return (
    <section className="w-full max-w-[1440px] mx-auto px-6 md:px-12 py-8 md:py-12">
      {/* Top Query Header Bar */}
      <div className="mb-8 pb-6 border-b border-[#122b1e]/15">
        {/* Editorial Subtitle / Kicker */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-2 text-xs font-editorial-mono text-[#122b1e]/60 uppercase tracking-wider">
            <div className="w-2 h-2 rounded-full bg-[#dc5b34]" />
            <span>Recommended for you · Hybrid Intelligence</span>
          </div>

          <div className="text-xs font-editorial-mono text-[#122b1e]/60">
            {papers.length} papers retrieved · OpenAlex 250M+ Academic Graph
          </div>
        </div>

        {/* Search Input Bar for Refinement */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="flex-1 max-w-2xl">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#122b1e] tracking-tight leading-tight mb-4">
              {query ? `Recommendations for "${query}"` : 'Curated Research Recommendations'}
            </h1>
            <p className="text-xs md:text-sm text-[#122b1e]/70 leading-relaxed">
              Synthesized using semantic embeddings and TF-IDF vectors from titles, abstracts, and concept graphs fused with collaborative citation affinity.
            </p>
          </div>

          <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full lg:w-auto">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Refine topic, author, or keyword..."
              className="px-4 py-2 text-sm bg-[#f5f8f4] border border-[#122b1e]/20 rounded-md text-[#122b1e] focus:outline-none focus:border-[#122b1e] w-full lg:w-72 font-medium"
            />
            <button
              type="submit"
              disabled={isLoading || !searchInput.trim()}
              className="px-4 py-2 bg-[#122b1e] hover:bg-[#1a3d2e] text-white text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap shadow-sm disabled:opacity-50"
            >
              {isLoading ? 'Updating...' : 'Search'}
            </button>
          </form>
        </div>

        {/* Control Bar: Domain & Year Filter Controls */}
        <div className="mt-8 pt-6 border-t border-[#122b1e]/10 flex flex-wrap items-center justify-between gap-4">
          {/* Domain Filter */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#122b1e]/50 font-editorial-mono uppercase text-[11px]">Domain:</span>
            <select
              value={selectedCategory}
              onChange={(e) => handleDomainChange(e.target.value)}
              className="bg-transparent border-b border-[#122b1e]/30 text-[#122b1e] font-semibold py-1 px-1 focus:outline-none cursor-pointer"
            >
              {RESEARCH_DOMAINS.map((domain) => (
                <option key={domain} value={domain} className="bg-[#edf2ec] text-[#122b1e]">
                  {domain}
                </option>
              ))}
            </select>
          </div>

          {/* Year Filter: Dropdown of recent years with 'Latest' option */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#122b1e]/50 font-editorial-mono uppercase text-[11px]">Year:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-transparent border-b border-[#122b1e]/30 text-[#122b1e] font-semibold py-1 px-1 focus:outline-none cursor-pointer"
            >
              <option value="latest" className="bg-[#edf2ec] text-[#122b1e]">
                Latest
              </option>
              {availableYears.map((yr) => (
                <option key={yr} value={String(yr)} className="bg-[#edf2ec] text-[#122b1e]">
                  {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Toggle for trending research when searching */}
          {isSearchingTopic && (
            <button
              type="button"
              onClick={() => setShowTrendingWhenSearching((prev) => !prev)}
              className="text-xs font-editorial-mono text-[#122b1e]/70 hover:text-[#122b1e] cursor-pointer flex items-center gap-1.5 transition-colors px-2.5 py-1 rounded border border-[#122b1e]/20 hover:border-[#122b1e]/40 bg-[#f5f8f4]"
            >
              <span>{showTrendingWhenSearching ? 'Hide Trending Papers ▲' : 'Show Trending Papers ▼'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Trending Research Papers Section: hidden when searching a topic unless toggled */}
      {(!isSearchingTopic || showTrendingWhenSearching) && (
        <div className="mb-10 p-6 md:p-8 bg-[#e5ece3]/50 border border-[#122b1e]/15 rounded-xl">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-editorial-mono uppercase tracking-wider text-[#122b1e]/60 mb-1">
                <span className="w-2 h-2 rounded-full bg-[#dc5b34]" />
                <span>
                  Trending Now · {selectedCategory !== 'All Disciplines' ? selectedCategory : 'All Disciplines'}
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold tracking-tight text-[#122b1e]">
                Trending Research in this Field
              </h2>
              <p className="text-xs text-[#122b1e]/70 mt-1">
                High-impact literature with accelerating citation momentum and peer community attention.
              </p>
            </div>

            {/* Timeframe Toggle */}
            <div className="flex items-center gap-1 p-1 bg-[#edf2ec] border border-[#122b1e]/10 rounded-lg text-xs font-medium font-editorial-mono self-start md:self-auto">
              {(['week', 'month', 'all'] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTrendingTimeframe(tf)}
                  className={`px-2.5 py-1 rounded transition-colors cursor-pointer capitalize ${
                    trendingTimeframe === tf
                      ? 'bg-white text-[#122b1e] font-semibold shadow-xs'
                      : 'text-[#122b1e]/60 hover:text-[#122b1e]'
                  }`}
                >
                  {tf === 'week' ? 'This week' : tf === 'month' ? 'This month' : 'All time'}
                </button>
              ))}
            </div>
          </div>

          {/* Trending State Handling */}
          {isLoadingTrending ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <TrendingSkeletonCard />
              <TrendingSkeletonCard />
              <TrendingSkeletonCard />
            </div>
          ) : trendingError ? (
            <div className="p-6 bg-[#f5f8f4] border border-[#122b1e]/15 rounded-xl text-center space-y-3">
              <p className="text-xs text-[#122b1e]/70">{trendingError}</p>
              <button
                onClick={refetchTrending}
                className="px-4 py-1.5 text-xs font-semibold bg-[#122b1e] text-white rounded cursor-pointer hover:bg-[#1a3d2e] transition-colors"
              >
                Retry
              </button>
            </div>
          ) : trendingPapers.length === 0 ? (
            <div className="p-6 bg-[#f5f8f4] border border-[#122b1e]/15 rounded-xl text-center text-xs text-[#122b1e]/60">
              No trending research papers found for this timeframe and domain filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {trendingPapers.slice(0, 3).map((paper, idx) => (
                <TrendingCard
                  key={paper.id}
                  paper={paper}
                  index={idx}
                  onInspect={(p) => onSelectPaper(p)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Loading Skeleton / Status */}
      {isLoading && (
        <div className="py-16 text-center space-y-4">
          <div className="inline-block w-8 h-8 border-3 border-[#122b1e]/20 border-t-[#122b1e] rounded-full animate-spin" />
          <p className="text-sm font-editorial-mono text-[#122b1e]/70">
            Synthesizing hybrid recommendations from research paper backend and repository...
          </p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && sortedPapers.length === 0 && (
        <div className="py-16 text-center space-y-3 bg-[#f5f8f4] border border-[#122b1e]/10 rounded-xl p-8">
          <h3 className="text-lg font-bold text-[#122b1e]">
            {query ? 'No matching research papers found' : 'Ready to discover research papers'}
          </h3>
          <p className="text-xs text-[#122b1e]/70 max-w-md mx-auto">
            {query
              ? 'Try refining your query, selecting a different discipline, or checking the trending publications above.'
              : 'Enter a research topic, keyword, or author above, or select a discipline to begin exploring.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {['Artificial Intelligence', 'Climate Change', 'Cybersecurity', 'Digital Payments'].map((topic) => (
              <button
                key={topic}
                onClick={() => onNewSearch(topic)}
                className="px-3 py-1.5 bg-[#122b1e] text-white text-xs font-semibold rounded cursor-pointer hover:bg-[#1a3d2e] transition-colors"
              >
                Explore {topic}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results List */}
      {!isLoading && sortedPapers.length > 0 && (
        <div className="space-y-5">
          <div className="flex items-center justify-between text-xs font-editorial-mono text-[#122b1e]/60 mb-2">
            <span>RECOMMENDED RESEARCH PAPERS</span>
            <span>{sortedPapers.length} Matches</span>
          </div>

          {sortedPapers.map((paper, idx) => {
            const isSaved = savedPaperIds.includes(paper.id);
            const matchPercent = Math.round(paper.similarityScore * 100);

            return (
              <article
                key={paper.id}
                className="bg-[#f5f8f4] border border-[#122b1e]/15 rounded-xl p-6 md:p-8 hover:border-[#122b1e]/40 transition-all duration-200 shadow-xs hover:shadow-md relative group flex flex-col justify-between"
              >
                <div>
                  {/* Top Metadata Row with clear distinguishing badge */}
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3 text-xs text-[#122b1e]/65">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-editorial-mono text-[#122b1e]/50 text-[11px] font-medium">
                        [{String(idx + 1).padStart(2, '0')}]
                      </span>

                      {/* Distinguish trending papers from personalized recommendations */}
                      {paper.isTrending ? (
                        <span className="px-2 py-0.5 text-[10px] font-editorial-mono font-bold bg-[#dc5b34]/15 text-[#dc5b34] rounded uppercase tracking-wider">
                          {paper.trendBadge || 'Trending Research'}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-editorial-mono text-[#122b1e]/70 bg-[#122b1e]/5 rounded uppercase tracking-wider">
                          Recommended For You
                        </span>
                      )}

                      <span className="font-semibold text-[#122b1e]">{paper.primaryCategory}</span>
                      <span aria-hidden="true" className="text-[#122b1e]/30">·</span>
                      <span>{paper.publicationYear}</span>
                      {paper.venue && (
                        <>
                          <span aria-hidden="true" className="text-[#122b1e]/30">·</span>
                          <span className="italic">{paper.venue}</span>
                        </>
                      )}
                      {paper.citationCount > 0 && (
                        <>
                          <span aria-hidden="true" className="text-[#122b1e]/30">·</span>
                          <span className="font-editorial-mono tabular-nums">
                            {paper.citationCount.toLocaleString()} citations
                          </span>
                        </>
                      )}
                    </div>

                    {/* Relevance / Match Metric */}
                    <div className="flex items-center gap-1.5 font-editorial-mono text-xs">
                      <span className="w-2 h-2 rounded-full bg-[#dc5b34]" />
                      <span className="font-bold text-[#122b1e] tabular-nums">
                        {matchPercent}% Match
                      </span>
                    </div>
                  </div>

                  {/* Paper Title */}
                  <h2
                    onClick={() => onSelectPaper(paper)}
                    className="text-lg md:text-xl lg:text-2xl font-bold text-[#122b1e] leading-snug tracking-tight hover:underline cursor-pointer mb-3"
                  >
                    {paper.title}
                  </h2>

                  {/* Authors Line */}
                  <p className="text-xs md:text-sm text-[#122b1e]/80 font-medium mb-3">
                    {paper.authors.join(', ')}
                  </p>

                  {/* Abstract / Snippet Preview */}
                  <p className="text-xs md:text-sm text-[#122b1e]/75 leading-relaxed line-clamp-3 mb-4 font-normal">
                    {paper.abstract}
                  </p>

                  {/* Topics */}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#122b1e]/60 mb-5">
                    <span className="font-editorial-mono uppercase text-[10px] text-[#122b1e]/40 mr-1">
                      Topics:
                    </span>
                    {paper.topics.slice(0, 4).map((topic, i) => (
                      <React.Fragment key={topic}>
                        <span className="font-medium text-[#122b1e]/80">{topic}</span>
                        {i < Math.min(paper.topics.length, 4) - 1 && (
                          <span className="text-[#122b1e]/25 select-none">/</span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {/* Card Footer: "Why this paper?" Explanation + Primary Actions */}
                <div className="pt-4 border-t border-[#122b1e]/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  {/* Subtle "Why this paper?" explanation */}
                  <div className="flex items-center gap-2 text-xs text-[#122b1e]/75 font-editorial-mono">
                    <span className="w-1.5 h-1.5 bg-[#122b1e]/40 rounded-full shrink-0" />
                    <span>{paper.whyThisPaper}</span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                    <button
                      onClick={() => onToggleSave(paper)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
                        isSaved
                          ? 'bg-[#dc5b34] text-white hover:bg-[#c44f2b]'
                          : 'bg-[#122b1e]/5 text-[#122b1e] hover:bg-[#122b1e]/15'
                      }`}
                    >
                      {isSaved ? 'Saved ✓' : 'Save'}
                    </button>

                    <button
                      onClick={() => onSelectPaper(paper)}
                      className="px-4 py-1.5 text-xs font-semibold bg-[#122b1e] hover:bg-[#1a3d2e] text-white rounded transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                    >
                      <span>Inspect Paper</span>
                      <span aria-hidden="true">→</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
