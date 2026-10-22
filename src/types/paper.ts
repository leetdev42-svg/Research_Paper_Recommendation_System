export interface Author {
  name: string;
  institution?: string;
}

export interface Paper {
  id: string;
  title: string;
  authors: string[];
  publicationYear: number;
  abstract: string;
  snippet: string;
  primaryCategory: string;
  topics: string[];
  venue?: string;
  doi?: string;
  sourceUrl: string;
  citationCount: number;
  openAccess: boolean;
  
  // Recommendation Scores (0 - 1)
  similarityScore: number;
  contentScore: number;
  collaborativeScore: number;
  
  // Subtle "Why this paper?" rationale
  whyThisPaper: string;
  whyType: 'search_similarity' | 'interests' | 'collaborative_readers' | 'topic_relevance';

  // Real-world trending signals
  isTrending?: boolean;
  trendBadge?: string;
}

export type RecommendationMode = 'hybrid' | 'content' | 'collaborative';
export type SortOption = 'relevance' | 'year' | 'citations';
