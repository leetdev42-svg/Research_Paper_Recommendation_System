import React, { useState } from 'react';
import researchBooksImg from '../assets/images/research_books_magnifier_1791434438876.jpg';
import geometricFacetsImg from '../assets/images/editorial_geometric_facets_1791433105813.jpg';

interface HeroLandingProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
}

const QUICK_TOPICS = [
  'Artificial Intelligence',
  'Mental Health',
  'Digital Payments',
  'Climate Change',
  'Online Education',
  'Cybersecurity',
];

export const HeroLanding: React.FC<HeroLandingProps> = ({ onSearch, isLoading }) => {
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSearch(inputValue.trim());
    }
  };

  const handleQuickTopic = (topic: string) => {
    setInputValue(topic);
    onSearch(topic);
  };

  return (
    <section className="w-full max-w-[1440px] mx-auto px-6 md:px-12 py-8 md:py-14">
      {/* Split Poster Composition matching the Reference Design */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
        
        {/* Left Dark Poster Card (Deep Pine Green with White Typography & 3D Spherical Composition) */}
        <div className="lg:col-span-5 bg-[#122b1e] text-white rounded-xl md:rounded-2xl p-8 md:p-12 flex flex-col justify-between relative overflow-hidden shadow-xl border border-[#1a3d2e]">
          {/* Subtle top metadata */}
          <div className="flex items-center justify-between text-[11px] font-editorial-mono uppercase tracking-wider text-white/50 mb-8">
            <span>Scholaris · Vol. 26</span>
            <span>250M+ Records</span>
          </div>

          {/* Primary Headline */}
          <div className="space-y-6 z-10">
            <h1 className="text-3xl sm:text-4xl md:text-[44px] font-extrabold leading-[1.08] tracking-[-0.035em] text-white text-balance">
              Find the research that moves your idea forward.
            </h1>
            
            <p className="text-sm md:text-base text-white/75 font-normal leading-relaxed max-w-md">
              Discover relevant research papers from your topic, query, or existing paper. Powered by hybrid semantic content similarity and collaborative citation graphs.
            </p>
          </div>

          {/* Academic Research Visual Asset */}
          <div className="mt-8 md:mt-12 relative w-full aspect-[4/3] rounded-lg overflow-hidden bg-[#0d2116] border border-white/10 group shadow-inner">
            <img
              src={researchBooksImg}
              alt="Academic research books and magnifying glass over global literature index"
              className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
              referrerPolicy="no-referrer"
            />
            {/* Subtle editorial caption tag inside artwork */}
            <div className="absolute bottom-3 left-3 bg-[#122b1e]/85 backdrop-blur-sm px-2.5 py-1 rounded text-[10px] font-editorial-mono text-white/80 border border-white/10">
              Figure 1.0 · Global Scientific Corpus Discovery
            </div>
          </div>

          {/* Small editorial baseline text matching reference left footer */}
          <div className="mt-6 pt-6 border-t border-white/10 text-[11px] text-white/60 font-editorial-mono leading-relaxed">
            Scholaris indexes peer-reviewed preprints and journal literature with sub-second hybrid ranking and transparent rationale.
          </div>
        </div>

        {/* Right Light Editorial Canvas (Pale Sage / Linen Ecru Canvas matching Reference) */}
        <div className="lg:col-span-7 flex flex-col justify-between py-2 md:py-4">
          
          <div>
            {/* Supporting Section Headline & Floating Facets */}
            <div className="relative mb-8 md:mb-10">
              <div className="max-w-xl">
                <span className="text-xs font-semibold tracking-wider uppercase text-[#122b1e]/60 font-editorial-mono mb-3 block">
                  Interactive Recommendation Portal
                </span>
                <h2 className="text-3xl sm:text-4xl md:text-[46px] font-extrabold text-[#122b1e] leading-[1.08] tracking-[-0.035em] text-balance">
                  Professionals who know a lot about discovering breakthrough papers
                </h2>
              </div>

              {/* Floating geometric crystal prism image preview in corner */}
              <div className="hidden sm:block absolute -top-4 right-0 w-28 h-28 md:w-36 md:h-36 rounded-lg overflow-hidden border border-[#122b1e]/10 shadow-sm opacity-90 hover:opacity-100 transition-opacity">
                <img
                  src={geometricFacetsImg}
                  alt="Architectural floating polyhedra facets"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>

            {/* Description text matching reference subtitle */}
            <p className="text-sm md:text-base text-[#122b1e]/80 leading-relaxed max-w-xl mb-8">
              Shouldering your complete academic discovery pipeline. From exploratory keywords to deeply related co-cited literature, our hybrid engine surfaces pivotal work in seconds.
            </p>

            {/* Prominent Search Input Box */}
            <div className="bg-[#f5f8f4] border border-[#122b1e]/20 rounded-xl p-3 md:p-4 shadow-sm hover:border-[#122b1e]/40 transition-colors mb-6">
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Search research papers, topics, authors, or DOIs..."
                    className="w-full bg-transparent px-3 py-2.5 text-base md:text-lg text-[#122b1e] placeholder:text-[#122b1e]/40 focus:outline-none tracking-tight font-medium"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading || !inputValue.trim()}
                  className="px-6 py-3 bg-[#122b1e] hover:bg-[#1a3d2e] text-white text-sm font-semibold rounded-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap shadow-sm"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Retrieving...</span>
                    </>
                  ) : (
                    <>
                      <span>Recommend Papers</span>
                      <span aria-hidden="true">→</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Quick Inspiration Queries (Clean unboxed text, no pills) */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-[#122b1e]/75 mb-10">
              <span className="font-editorial-mono text-[11px] text-[#122b1e]/50 uppercase tracking-wider">
                Sample Queries:
              </span>
              {QUICK_TOPICS.map((topic, idx) => (
                <React.Fragment key={topic}>
                  <button
                    onClick={() => handleQuickTopic(topic)}
                    className="hover:text-[#122b1e] hover:underline cursor-pointer transition-colors text-left font-medium"
                  >
                    {topic}
                  </button>
                  {idx < QUICK_TOPICS.length - 1 && (
                    <span className="text-[#122b1e]/30 select-none" aria-hidden="true">·</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Architectural Schematic / Wireframe Box (matching the reference right bottom section: Enterprise-Ready + schematics) */}
          <div className="pt-8 border-t border-[#122b1e]/15">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-2 h-2 rounded-full bg-[#dc5b34]" />
              <span className="text-xs font-semibold uppercase tracking-wider font-editorial-mono text-[#122b1e]/70">
                Hybrid Architecture · Content + Collaborative
              </span>
            </div>

            <h3 className="text-xl md:text-2xl font-bold text-[#122b1e] tracking-tight mb-6 max-w-xl">
              Built-in content vectors, citation graphs, and hybrid retrieval to suit rigorous scientific inquiry
            </h3>

            {/* Two-Column Technical Wireframe Schematics matching the reference drawings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              {/* Box 1: Content-Based Filtering */}
              <div className="p-4 rounded-lg bg-[#e5ece3]/50 border border-[#122b1e]/10">
                {/* Architectural Blueprint Icon (nested rectangles wireframe) */}
                <div className="w-10 h-10 mb-3 flex items-center justify-center border border-[#122b1e]/40 rounded bg-white/40">
                  <div className="w-6 h-4 border border-[#122b1e]/60 flex items-center justify-center">
                    <div className="w-3 h-2 border-t border-l border-[#122b1e]/70" />
                  </div>
                </div>
                <h4 className="text-sm font-bold text-[#122b1e] mb-1.5">
                  1. Content-Based Semantic Filter
                </h4>
                <p className="text-xs text-[#122b1e]/75 leading-relaxed">
                  Evaluates deep linguistic embeddings, title keywords, and concept taxonomy to pinpoint exact contextual alignment with your query or seed paper.
                </p>
              </div>

              {/* Box 2: Collaborative Filtering */}
              <div className="p-4 rounded-lg bg-[#e5ece3]/50 border border-[#122b1e]/10">
                {/* Architectural Blueprint Icon (aperture wireframe) */}
                <div className="w-10 h-10 mb-3 flex items-center justify-center border border-[#122b1e]/40 rounded bg-white/40">
                  <div className="w-5 h-5 rounded-full border border-[#122b1e]/60 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-[#122b1e]/60" />
                  </div>
                </div>
                <h4 className="text-sm font-bold text-[#122b1e] mb-1.5">
                  2. Collaborative Reader Topology
                </h4>
                <p className="text-xs text-[#122b1e]/75 leading-relaxed">
                  Synthesizes co-citation networks, peer reading patterns, and multidisciplinary citations to discover high-value papers beyond literal keyword overlap.
                </p>
              </div>

            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
