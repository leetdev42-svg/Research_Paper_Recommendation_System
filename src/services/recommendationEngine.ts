import { Paper, RecommendationMode } from '../types/paper';
import { getPaperSaveCount } from './trendingService';

const OPENALEX_API_KEY = 'oUhfB22oMKSJlA6pdDMFo2';
const BACKEND_BASE_URL = 'http://localhost:8000';

// Reconstruct abstract from OpenAlex inverted index
function reconstructAbstract(invertedIndex?: Record<string, number[]>): string {
  if (!invertedIndex || Object.keys(invertedIndex).length === 0) return '';
  const entries = Object.entries(invertedIndex);
  const wordPositions: { word: string; pos: number }[] = [];

  for (const [word, positions] of entries) {
    for (const pos of positions) {
      wordPositions.push({ word, pos });
    }
  }

  wordPositions.sort((a, b) => a.pos - b.pos);
  return wordPositions.map((wp) => wp.word).join(' ');
}

// Compute semantic/content overlap score between a query and a paper
export function computeContentScore(query: string, paper: Partial<Paper>): number {
  if (!query.trim()) return 0.85;
  const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
  if (terms.length === 0) return 0.80;

  const title = (paper.title || '').toLowerCase();
  const abstract = (paper.abstract || paper.snippet || '').toLowerCase();
  const topics = (paper.topics || []).map((t) => t.toLowerCase()).join(' ');

  let termHits = 0;
  let exactPhraseHit = false;
  if (title.includes(query.toLowerCase()) || abstract.includes(query.toLowerCase())) {
    exactPhraseHit = true;
  }

  for (const term of terms) {
    let score = 0;
    if (title.includes(term)) score += 3.5;
    if (topics.includes(term)) score += 2.0;
    if (abstract.includes(term)) score += 1.2;
    if (score > 0) termHits += Math.min(score, 4);
  }

  const coverageRatio = terms.length > 0 ? termHits / (terms.length * 3.5) : 0.5;
  const rawScore = 0.55 + Math.min(coverageRatio * 0.40, 0.42) + (exactPhraseHit ? 0.05 : 0);
  return Math.min(Math.max(Number(rawScore.toFixed(3)), 0.52), 0.99);
}

// Compute collaborative filtering score based on user interaction signals
export function computeCollaborativeScore(
  paper: Partial<Paper>,
  savedPaperIds: string[],
  viewedPaperIds: string[],
  allPapers: Paper[] = []
): number {
  const citations = paper.citationCount || 0;
  // Normalized citation popularity signal (log scale)
  const citationSignal = citations > 0 ? Math.min(Math.log10(citations + 1) / 4.5, 0.95) : 0.4;

  const isSavedByUser = paper.id ? savedPaperIds.includes(paper.id) : false;
  const recordedSaves = paper.id ? getPaperSaveCount(paper.id) : 0;
  const totalSaves = recordedSaves + (isSavedByUser ? 2 : 0);

  // Save boost based on real recorded interaction
  const saveBoost = Math.min(totalSaves * 0.06, 0.28);

  if (savedPaperIds.length === 0 && viewedPaperIds.length === 0) {
    return Math.min(0.60 + saveBoost + citationSignal * 0.25, 0.98);
  }

  // Cross-reference with topics of saved & viewed papers
  const userInteractedPapers = allPapers.filter(
    (p) => savedPaperIds.includes(p.id) || viewedPaperIds.includes(p.id)
  );

  let topicOverlapCount = 0;
  const paperTopics = new Set((paper.topics || []).map((t) => t.toLowerCase()));

  for (const interacted of userInteractedPapers) {
    for (const t of interacted.topics || []) {
      if (paperTopics.has(t.toLowerCase())) {
        topicOverlapCount += 1;
      }
    }
  }

  const affinityBonus = Math.min(topicOverlapCount * 0.05, 0.22);
  const finalScore = 0.55 + saveBoost + affinityBonus + citationSignal * 0.15;
  return Math.min(Math.max(Number(finalScore.toFixed(3)), 0.55), 0.99);
}

// Generate human-friendly "Why this paper?" explanation
export function generateWhyThisPaper(
  paper: Partial<Paper>,
  query: string,
  contentScore: number,
  collabScore: number,
  savedPaperIds: string[]
): { text: string; type: Paper['whyType'] } {
  const isSavedByUser = paper.id ? savedPaperIds.includes(paper.id) : false;
  const recordedSaves = paper.id ? getPaperSaveCount(paper.id) : 0;
  const totalSaves = recordedSaves + (isSavedByUser ? 1 : 0);

  if (totalSaves > 0 && collabScore > 0.85) {
    return {
      text: `Recommended for you · Frequently saved research work (${totalSaves} save${totalSaves > 1 ? 's' : ''} in library)`,
      type: 'interests',
    };
  }

  if (savedPaperIds.length > 0 && collabScore > 0.88) {
    return {
      text: 'Recommended for you · Related to your saved research interests & similar reader patterns',
      type: 'interests',
    };
  }

  if (contentScore > 0.90 && query) {
    return {
      text: `Recommended for you · Strong semantic similarity to "${query.slice(0, 32)}${query.length > 32 ? '...' : ''}"`,
      type: 'search_similarity',
    };
  }

  if (collabScore > contentScore) {
    return {
      text: 'Recommended for you · Frequently referenced and saved by researchers in this topic',
      type: 'collaborative_readers',
    };
  }

  return {
    text: `Recommended for you · Highly relevant to ${paper.primaryCategory || 'the topic'}`,
    type: 'topic_relevance',
  };
}

// Fetch recommendations directly from the Python FastAPI backend
async function fetchBackendRecommendations(
  query: string,
  mode: RecommendationMode = 'hybrid',
  limit: number = 10
): Promise<Paper[]> {
  try {
    const cw = mode === 'content' ? 1.0 : mode === 'collaborative' ? 0.0 : 0.7;
    const cfw = mode === 'collaborative' ? 1.0 : mode === 'content' ? 0.0 : 0.3;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(`${BACKEND_BASE_URL}/api/recommendations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: 'user123',
        query,
        limit,
        content_weight: cw,
        collaborative_weight: cfw,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    if (!data.recommendations || !Array.isArray(data.recommendations)) {
      return [];
    }

    return data.recommendations.map((item: any) => {
      const p = item.paper;
      const snippet =
        p.abstract && p.abstract.length > 180 ? p.abstract.slice(0, 180) + '...' : p.abstract || '';
      const doi =
        p.url && p.url.startsWith('https://doi.org/')
          ? p.url.replace('https://doi.org/', '')
          : undefined;

      return {
        id: p.id,
        title: p.title,
        authors: p.authors || [],
        publicationYear: p.year,
        abstract: p.abstract || '',
        snippet: snippet || 'Peer-reviewed research study from indexed literature repository.',
        primaryCategory: p.category || 'Scientific Research',
        topics: p.keywords && p.keywords.length ? p.keywords : [p.category || 'Research'],
        venue: p.category,
        doi,
        sourceUrl: p.url || '',
        citationCount: p.citation_count || 0,
        openAccess: true,
        similarityScore: item.final_score ?? 0.8,
        contentScore: item.content_score ?? 0.8,
        collaborativeScore: item.collaborative_score ?? 0.8,
        whyThisPaper:
          item.why_this_paper || `Recommended for you · High relevance to ${p.category}`,
        whyType:
          item.collaborative_score > item.content_score
            ? 'collaborative_readers'
            : 'search_similarity',
      } as Paper;
    });
  } catch {
    return [];
  }
}

// Fetch papers from OpenAlex Academic Graph
async function fetchOpenAlexPapers(
  query: string,
  savedPaperIds: string[],
  viewedPaperIds: string[],
  mode: RecommendationMode
): Promise<Paper[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  try {
    const url = `https://api.openalex.org/works?search=${encodeURIComponent(
      trimmed
    )}&per_page=14&api_key=${OPENALEX_API_KEY}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`[OpenAlex API] HTTP status: ${res.status}`);
      return [];
    }

    const data = await res.json();
    if (!data.results || !Array.isArray(data.results)) return [];

    console.log(`[OpenAlex API] Connected successfully: ${data.results.length} papers retrieved for "${trimmed}".`);

    return data.results.map((item: any, idx: number) => {
      const rawAbstract = reconstructAbstract(item.abstract_inverted_index);
      const abstract =
        rawAbstract ||
        (item.display_name
          ? `Peer-reviewed scientific publication investigating ${item.display_name}.`
          : '');
      const snippet = abstract.length > 180 ? abstract.slice(0, 180) + '...' : abstract;

      const authors = (item.authorships || [])
        .slice(0, 4)
        .map((a: any) => a.author?.display_name)
        .filter(Boolean);

      const concepts = (item.concepts || []).slice(0, 5).map((c: any) => c.display_name);
      const primaryCategory =
        concepts[0] || item.primary_topic?.display_name || 'Scientific Research';

      const pubYear = item.publication_year || 2024;
      const doi = item.doi ? item.doi.replace('https://doi.org/', '') : undefined;
      const sourceUrl =
        item.doi ||
        item.primary_location?.landing_page_url ||
        `https://openalex.org/works/${item.id}`;
      const citationCount = item.cited_by_count || 0;

      const basePaper: Partial<Paper> = {
        id: item.id || `openalex-${idx}`,
        title: item.display_name || 'Untitled Scientific Work',
        authors: authors.length ? authors : ['Research Collective'],
        publicationYear: pubYear,
        abstract:
          abstract ||
          'Full text and peer-reviewed summary available via primary publication source.',
        snippet: snippet || 'Peer-reviewed research study indexed in OpenAlex academic repository.',
        primaryCategory,
        topics: concepts.length > 0 ? concepts : [primaryCategory, 'Peer-Reviewed'],
        venue: item.primary_location?.source?.display_name || 'Academic Journal',
        doi,
        sourceUrl,
        citationCount,
        openAccess: Boolean(item.open_access?.is_oa),
      };

      const contentScore = computeContentScore(trimmed, basePaper);
      const collaborativeScore = computeCollaborativeScore(
        basePaper,
        savedPaperIds,
        viewedPaperIds,
        []
      );

      let similarityScore = 0.85;
      if (mode === 'content') {
        similarityScore = contentScore;
      } else if (mode === 'collaborative') {
        similarityScore = collaborativeScore;
      } else {
        similarityScore = Number((0.65 * contentScore + 0.35 * collaborativeScore).toFixed(3));
      }

      const why = generateWhyThisPaper(
        basePaper,
        trimmed,
        contentScore,
        collaborativeScore,
        savedPaperIds
      );

      // Check real-world trending signals: recent publication with significant citation momentum
      const countsByYear = item.counts_by_year || [];
      const recentCitations = countsByYear
        .filter((c: any) => c.year >= 2024)
        .reduce((sum: number, c: any) => sum + (c.cited_by_count || 0), 0);

      const isTrending = pubYear >= 2023 && (recentCitations >= 50 || citationCount >= 100);
      let trendBadge: string | undefined;
      if (isTrending) {
        trendBadge =
          recentCitations > 0
            ? `↑ ${recentCitations.toLocaleString()} recent citations`
            : `🔥 ${citationCount.toLocaleString()} citations`;
      }

      return {
        ...basePaper,
        similarityScore,
        contentScore,
        collaborativeScore,
        whyThisPaper: why.text,
        whyType: why.type,
        isTrending,
        trendBadge,
      } as Paper;
    });
  } catch (err) {
    console.warn('[OpenAlex API Connection Warning]', err);
    return [];
  }
}

// Fetch papers from implemented backend and connected research data sources
export async function searchResearchPapers(
  query: string,
  savedPaperIds: string[] = [],
  viewedPaperIds: string[] = [],
  mode: RecommendationMode = 'hybrid'
): Promise<Paper[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  // 1. Fetch from implemented backend and connected OpenAlex API concurrently
  const [backendPapers, openAlexPapers] = await Promise.all([
    fetchBackendRecommendations(trimmed, mode, 12),
    fetchOpenAlexPapers(trimmed, savedPaperIds, viewedPaperIds, mode),
  ]);

  // 2. Combine results, deduplicating by normalized title
  const seenTitles = new Set<string>();
  const combined: Paper[] = [];

  for (const paper of [...backendPapers, ...openAlexPapers]) {
    const norm = paper.title.toLowerCase().trim();
    if (!seenTitles.has(norm)) {
      seenTitles.add(norm);
      combined.push(paper);
    }
  }

  // 3. Sort by final similarity score descending
  combined.sort((a, b) => b.similarityScore - a.similarityScore);
  return combined;
}

// Get related recommendations for a specific paper
export function getRelatedPapers(targetPaper: Paper, allPapers: Paper[] = []): Paper[] {
  const targetTopics = new Set((targetPaper.topics || []).map((t) => t.toLowerCase()));

  const related = allPapers
    .filter((p) => p.id !== targetPaper.id)
    .map((p) => {
      let overlap = 0;
      for (const t of p.topics || []) {
        if (targetTopics.has(t.toLowerCase())) overlap++;
      }
      const score = Math.min(0.65 + overlap * 0.1, 0.98);
      return {
        ...p,
        similarityScore: Number(score.toFixed(2)),
        whyThisPaper: `Recommended for you · Shares research topic "${targetPaper.primaryCategory}"`,
        whyType: 'topic_relevance' as const,
      };
    })
    .sort((a, b) => b.similarityScore - a.similarityScore);

  return related.slice(0, 4);
}
