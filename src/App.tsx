import { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { HeroLanding } from './components/HeroLanding';
import { RecommendationResults } from './components/RecommendationResults';
import { PaperDetailModal } from './components/PaperDetailModal';
import { SavedPapersView } from './components/SavedPapersView';
import { HistoryView } from './components/HistoryView';
import { TrendingCard, TrendingSkeletonCard } from './components/TrendingCard';
import { useTrendingPapers } from './hooks/useTrendingPapers';
import { Paper, RecommendationMode } from './types/paper';
import { searchResearchPapers, getRelatedPapers } from './services/recommendationEngine';

export default function App() {
  const [activeTab, setActiveTab] = useState<'discover' | 'recommendations' | 'saved' | 'history'>('discover');
  const [query, setQuery] = useState<string>('');
  const [papers, setPapers] = useState<Paper[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);

  // Initialize state from local storage or empty array (no mock data)
  const [savedPapers, setSavedPapers] = useState<Paper[]>(() => {
    try {
      const stored = localStorage.getItem('scholaris_saved_papers');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('scholaris_search_history');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [inspectedHistory, setInspectedHistory] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('scholaris_inspected_history');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [recommendationMode, setRecommendationMode] = useState<RecommendationMode>('hybrid');

  const {
    timeframe,
    setTimeframe,
    trendingPapers,
    isLoading: isLoadingTrending,
    error: trendingError,
    refetch: refetchTrending,
    recordInteraction,
  } = useTrendingPapers();

  const executeSearch = useCallback(
    async (searchQuery: string, mode: RecommendationMode = recommendationMode) => {
      setIsLoading(true);
      setQuery(searchQuery);

      // Track query history
      setSearchHistory((prev) => {
        const filtered = prev.filter((s) => s.toLowerCase() !== searchQuery.toLowerCase());
        const updated = [searchQuery, ...filtered].slice(0, 15);
        try {
          localStorage.setItem('scholaris_search_history', JSON.stringify(updated));
        } catch {
          // ignore
        }
        return updated;
      });

      try {
        const savedIds = savedPapers.map((p) => p.id);
        const results = await searchResearchPapers(searchQuery, savedIds, [], mode);
        setPapers(results);
        if (results.length > 0) {
          recordInteraction(results[0].id, 'search');
        }
      } catch (err) {
        console.error('Error fetching recommendations from backend:', err);
        setPapers([]);
      } finally {
        setIsLoading(false);
      }
    },
    [savedPapers, recommendationMode, recordInteraction]
  );

  const handleHeroSearch = (newQuery: string) => {
    executeSearch(newQuery);
    setActiveTab('recommendations');
  };

  const handleToggleSave = (paper: Paper) => {
    setSavedPapers((prev) => {
      const exists = prev.some((p) => p.id === paper.id);
      const updated = exists ? prev.filter((p) => p.id !== paper.id) : [paper, ...prev];
      try {
        localStorage.setItem('scholaris_saved_papers', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
    recordInteraction(paper.id, 'save');
  };

  const handleSelectPaper = (paper: Paper) => {
    setSelectedPaper(paper);
    recordInteraction(paper.id, 'inspect');
    setInspectedHistory((prev) => {
      const filtered = prev.filter((t) => t !== paper.title);
      const updated = [paper.title, ...filtered].slice(0, 20);
      try {
        localStorage.setItem('scholaris_inspected_history', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const handleClearHistory = () => {
    setSearchHistory([]);
    setInspectedHistory([]);
    try {
      localStorage.removeItem('scholaris_search_history');
      localStorage.removeItem('scholaris_inspected_history');
    } catch {
      // ignore
    }
  };

  const handleChangeMode = (mode: RecommendationMode) => {
    setRecommendationMode(mode);
    if (query) {
      executeSearch(query, mode);
    }
  };

  const savedPaperIds = savedPapers.map((p) => p.id);
  const isSelectedPaperSaved = selectedPaper ? savedPaperIds.includes(selectedPaper.id) : false;
  const relatedPapers = selectedPaper ? getRelatedPapers(selectedPaper, papers) : [];

  return (
    <div className="min-h-screen flex flex-col bg-[#edf2ec] text-[#122b1e]">
      {/* Top Bar Navigation */}
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        savedCount={savedPapers.length}
      />

      {/* Main Content Areas */}
      <main className="flex-1">
        {activeTab === 'discover' && (
          <>
            <HeroLanding
              onSearch={handleHeroSearch}
              isLoading={isLoading}
            />
            {/* Trending Research Papers Section on Discover Page */}
            <div className="max-w-[1440px] mx-auto px-6 md:px-12 pb-16">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 pt-10 border-t border-[#122b1e]/15">
                <div>
                  <span className="text-xs font-editorial-mono uppercase tracking-wider text-[#122b1e]/60 block mb-1">
                    TRENDING NOW
                  </span>
                  <h3 className="text-xl md:text-2xl font-bold tracking-tight text-[#122b1e]">
                    Most Searched Research Papers
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  {/* Timeframe Toggle: This week | This month | All time */}
                  <div className="flex items-center gap-1 p-1 bg-[#e2ebe0]/70 rounded-lg text-xs font-medium font-editorial-mono">
                    {(['week', 'month', 'all'] as const).map((tf) => (
                      <button
                        key={tf}
                        onClick={() => setTimeframe(tf)}
                        className={`px-2.5 py-1 rounded transition-colors cursor-pointer capitalize ${
                          timeframe === tf
                            ? 'bg-white text-[#122b1e] font-semibold shadow-xs'
                            : 'text-[#122b1e]/60 hover:text-[#122b1e]'
                        }`}
                      >
                        {tf === 'week' ? 'This week' : tf === 'month' ? 'This month' : 'All time'}
                      </button>
                    ))}
                  </div>

                  {/* Explore all trending link */}
                  <button
                    onClick={() => setActiveTab('recommendations')}
                    className="text-xs md:text-sm font-semibold text-[#122b1e] hover:text-[#dc5b34] transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    <span>Explore all trending</span>
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
              </div>

              {/* Grid: 3 columns on desktop, 1 on mobile */}
              {isLoadingTrending ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <TrendingSkeletonCard />
                  <TrendingSkeletonCard />
                  <TrendingSkeletonCard />
                </div>
              ) : trendingError ? (
                <div className="p-8 bg-[#f5f8f4] border border-[#122b1e]/15 rounded-xl text-center space-y-3">
                  <p className="text-xs text-[#122b1e]/70">{trendingError}</p>
                  <button
                    onClick={refetchTrending}
                    className="px-4 py-1.5 text-xs font-semibold bg-[#122b1e] text-white rounded cursor-pointer hover:bg-[#1a3d2e] transition-colors"
                  >
                    Retry
                  </button>
                </div>
              ) : trendingPapers.length === 0 ? (
                <div className="p-8 bg-[#f5f8f4] border border-[#122b1e]/15 rounded-xl text-center text-xs text-[#122b1e]/60">
                  No trending research papers found for this timeframe.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {trendingPapers.slice(0, 3).map((paper, idx) => (
                    <TrendingCard
                      key={paper.id}
                      paper={paper}
                      index={idx}
                      onInspect={(p) => {
                        handleSelectPaper(p);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'recommendations' && (
          <RecommendationResults
            query={query}
            papers={papers}
            isLoading={isLoading}
            onSelectPaper={handleSelectPaper}
            savedPaperIds={savedPaperIds}
            onToggleSave={handleToggleSave}
            onNewSearch={(q) => executeSearch(q)}
            recommendationMode={recommendationMode}
            onChangeMode={handleChangeMode}
          />
        )}

        {activeTab === 'saved' && (
          <SavedPapersView
            savedPapers={savedPapers}
            onSelectPaper={handleSelectPaper}
            onRemoveSaved={handleToggleSave}
            onExploreTopic={(t) => {
              executeSearch(t);
              setActiveTab('recommendations');
            }}
          />
        )}

        {activeTab === 'history' && (
          <HistoryView
            searches={searchHistory}
            inspectedTitles={inspectedHistory}
            onSelectSearch={(q) => {
              executeSearch(q);
              setActiveTab('recommendations');
            }}
            onClearHistory={handleClearHistory}
          />
        )}
      </main>

      {/* Paper Detailed Inspection Modal */}
      {selectedPaper && (
        <PaperDetailModal
          paper={selectedPaper}
          onClose={() => setSelectedPaper(null)}
          onSelectPaper={handleSelectPaper}
          isSaved={isSelectedPaperSaved}
          onToggleSave={handleToggleSave}
          relatedPapers={relatedPapers}
        />
      )}

      {/* Architectural Editorial Footer */}
      <footer className="w-full border-t border-[#122b1e]/15 bg-[#e5ece3]/40 py-10 mt-auto">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 text-xs text-[#122b1e]/70">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-bold text-[#122b1e]">
              <div className="w-2 h-2 bg-[#122b1e]" />
              <span>Scholaris Research Systems</span>
            </div>
            <p className="font-editorial-mono text-[11px] text-[#122b1e]/55">
              Hybrid Recommendation Architecture · Content-Based Filtering & Collaborative Reader Affinity
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 font-medium">
            <span>OpenAlex Academic Graph</span>
            <span>Zero-Slop Architectural Layout</span>
            <span>DOI & ArXiv Connected</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
