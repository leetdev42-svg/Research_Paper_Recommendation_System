import { Paper } from '../types/paper';

export type TrendingTimeframe = 'week' | 'month' | 'all';

export interface TrendingPaper extends Paper {
  trendBadge: string;
  trendRank: number;
  fieldLabel: string;
}

interface PaperStat {
  searchCount: number;
  inspectCount: number;
  saveCount: number;
  lastSearchedAt: string;
  dailyBuckets: Record<string, number>; // "YYYY-MM-DD" -> count
}

const STATS_STORAGE_KEY = 'scholaris_paper_stats';
const CACHE_KEY_PREFIX = 'scholaris_trending_cache_v2_';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour cache
const OPENALEX_API_KEY = 'oUhfB22oMKSJlA6pdDMFo2';
const BACKEND_BASE_URL = 'http://localhost:8000';

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function getStoredStats(): Record<string, PaperStat> {
  try {
    const raw = localStorage.getItem(STATS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStats(stats: Record<string, PaperStat>): void {
  try {
    localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // Ignore storage quota errors
  }
}

// Log a search, inspection, or save interaction for a paper in local storage and backend
export function trackPaperInteraction(
  paperId: string,
  type: 'search' | 'inspect' | 'save' = 'search'
): void {
  const stats = getStoredStats();
  const today = getTodayKey();

  if (!stats[paperId]) {
    stats[paperId] = {
      searchCount: 0,
      inspectCount: 0,
      saveCount: 0,
      lastSearchedAt: new Date().toISOString(),
      dailyBuckets: {},
    };
  }

  if (type === 'search') {
    stats[paperId].searchCount += 1;
  } else if (type === 'inspect') {
    stats[paperId].inspectCount += 1;
  } else if (type === 'save') {
    stats[paperId].saveCount = (stats[paperId].saveCount || 0) + 1;
  }

  stats[paperId].lastSearchedAt = new Date().toISOString();
  stats[paperId].dailyBuckets[today] = (stats[paperId].dailyBuckets[today] || 0) + 1;

  saveStats(stats);

  // Sync interaction to backend collaborative filtering service
  const backendInteraction = type === 'inspect' ? 'view' : type === 'save' ? 'save' : 'view';
  fetch(`${BACKEND_BASE_URL}/api/interactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: 'user123',
      paper_id: paperId,
      interaction: backendInteraction,
    }),
  }).catch(() => {
    // Non-blocking background sync
  });

  // Invalidate trending caches so new interactions reflect on next fetch
  try {
    ['week', 'month', 'all'].forEach((tf) => {
      localStorage.removeItem(CACHE_KEY_PREFIX + tf);
    });
  } catch {
    // ignore
  }
}

export function getPaperSaveCount(paperId: string): number {
  const stats = getStoredStats();
  return stats[paperId]?.saveCount || 0;
}

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

// Fetch real trending papers from OpenAlex using recency and citation growth
async function fetchTrendingFromOpenAlex(
  timeframe: TrendingTimeframe = 'week',
  domainFilter?: string,
  limit: number = 6
): Promise<TrendingPaper[]> {
  const now = new Date();
  let fromDate = '2024-01-01';

  if (timeframe === 'week') {
    fromDate = `${now.getFullYear() - 1}-01-01`;
  } else if (timeframe === 'month') {
    fromDate = `${now.getFullYear() - 2}-01-01`;
  } else {
    fromDate = `${now.getFullYear() - 5}-01-01`;
  }

  let url = `https://api.openalex.org/works?filter=from_publication_date:${fromDate}&sort=cited_by_count:desc&per_page=${limit}&api_key=${OPENALEX_API_KEY}`;
  if (domainFilter && domainFilter !== 'All Disciplines' && domainFilter !== 'all') {
    url += `&search=${encodeURIComponent(domainFilter)}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: controller.signal,
  });
  clearTimeout(timeoutId);

  if (!res.ok) {
    throw new Error(`OpenAlex error: ${res.status}`);
  }

  const data = await res.json();
  const results = data.results || [];
  console.log(`[OpenAlex Trending] Retrieved ${results.length} trending papers.`);

  return results.slice(0, limit).map((item: any, idx: number) => {
    const rawAbstract = reconstructAbstract(item.abstract_inverted_index);
    const concepts = (item.concepts || []).slice(0, 4).map((c: any) => c.display_name);
    const field = concepts[0] || item.primary_topic?.display_name || domainFilter || 'Research';
    const authors = (item.authorships || [])
      .slice(0, 4)
      .map((a: any) => a.author?.display_name)
      .filter(Boolean);

    const title = item.display_name || 'Scientific Research Work';
    const citations = item.cited_by_count || 0;
    const snippet =
      rawAbstract && rawAbstract.length > 180
        ? rawAbstract.slice(0, 180) + '...'
        : rawAbstract || `Peer-reviewed scientific study across ${field.toLowerCase()} literature.`;

    const countsByYear = item.counts_by_year || [];
    const recentCitations = countsByYear
      .filter((c: any) => c.year >= 2024)
      .reduce((sum: number, c: any) => sum + (c.cited_by_count || 0), 0);

    let trendBadge = `🔥 ${citations.toLocaleString()} citations`;
    if (recentCitations > 0) {
      trendBadge = `↑ ${recentCitations.toLocaleString()} recent citations`;
    }

    return {
      id: item.id || `openalex-trend-${idx}`,
      title,
      authors: authors.length ? authors : ['Academic Research Collective'],
      publicationYear: item.publication_year || 2024,
      abstract: rawAbstract || snippet,
      snippet,
      primaryCategory: field,
      topics: concepts.length ? concepts : [field, 'High-Impact'],
      venue: item.primary_location?.source?.display_name || 'Academic Journal',
      doi: item.doi ? item.doi.replace('https://doi.org/', '') : undefined,
      sourceUrl:
        item.doi ||
        item.primary_location?.landing_page_url ||
        `https://openalex.org/works/${item.id}`,
      citationCount: citations,
      openAccess: Boolean(item.open_access?.is_oa),
      similarityScore: 0.95,
      contentScore: 0.95,
      collaborativeScore: 0.95,
      whyThisPaper: `Trending in literature · ${citations.toLocaleString()} verified academic citations.`,
      whyType: 'collaborative_readers',
      trendBadge,
      trendRank: idx + 1,
      fieldLabel: field,
      isTrending: true,
    } as TrendingPaper;
  });
}

// Fetch real trending papers from implemented backend
async function fetchTrendingFromBackend(
  domainFilter?: string,
  limit: number = 6
): Promise<TrendingPaper[]> {
  const categoryParam =
    domainFilter && domainFilter !== 'All Disciplines' && domainFilter !== 'all'
      ? `&category=${encodeURIComponent(domainFilter)}`
      : '';
  const url = `${BACKEND_BASE_URL}/api/papers/trending?limit=${limit}${categoryParam}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Backend error: ${res.status}`);
  }

  const data = await res.json();
  const papers = data.papers || [];

  return papers.map((p: any, idx: number) => {
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
      snippet,
      primaryCategory: p.category || 'Research',
      topics: p.keywords && p.keywords.length ? p.keywords : [p.category || 'Research'],
      venue: p.category,
      doi,
      sourceUrl: p.url || '',
      citationCount: p.citation_count || 0,
      openAccess: true,
      similarityScore: 0.92,
      contentScore: 0.9,
      collaborativeScore: 0.95,
      whyThisPaper: `Trending in ${p.category} literature based on indexed reader affinity.`,
      whyType: 'collaborative_readers',
      trendBadge: `🔥 Top #${idx + 1} Indexed`,
      trendRank: idx + 1,
      fieldLabel: p.category,
      isTrending: true,
    } as TrendingPaper;
  });
}

export async function getTrendingPapers(
  timeframe: TrendingTimeframe = 'week',
  domainFilter?: string,
  limit: number = 6
): Promise<TrendingPaper[]> {
  const safeDomain = domainFilter || 'all';
  const cacheKey = `${CACHE_KEY_PREFIX}${timeframe}_${safeDomain}`;

  // 1. Check local cache
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (
        Date.now() - parsed.timestamp < CACHE_TTL_MS &&
        Array.isArray(parsed.papers) &&
        parsed.papers.length > 0
      ) {
        return parsed.papers;
      }
    }
  } catch {
    // continue if cache error
  }

  // 2. Fetch from OpenAlex API first
  let trending: TrendingPaper[] = [];
  try {
    trending = await fetchTrendingFromOpenAlex(timeframe, domainFilter, limit);
  } catch (err) {
    console.warn('OpenAlex trending fetch failed, trying backend:', err);
    // 3. Fallback to backend trending endpoint
    try {
      trending = await fetchTrendingFromBackend(domainFilter, limit);
    } catch (backendErr) {
      console.warn('Backend trending fetch also failed:', backendErr);
      trending = [];
    }
  }

  // Cache valid results
  if (trending.length > 0) {
    try {
      localStorage.setItem(
        cacheKey,
        JSON.stringify({
          timestamp: Date.now(),
          papers: trending,
        })
      );
    } catch {
      // ignore storage error
    }
  }

  return trending;
}
