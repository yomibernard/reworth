export type SearchHit = {
  id: string;
  score: number;
  title: string;
  snippet?: string;
};

export type SearchQuery = {
  q: string;
  community?: string;
  limit?: number;
  offset?: number;
};

export type SearchResult = {
  total: number;
  hits: SearchHit[];
};

/** Full-text search abstraction (Postgres FTS / OpenSearch later). */
export interface SearchProvider {
  readonly name: string;
  search(query: SearchQuery): Promise<SearchResult>;
  indexDocument?(doc: {
    id: string;
    title: string;
    body: string;
    community?: string;
  }): Promise<void>;
}

export const SEARCH_PROVIDER = Symbol('SEARCH_PROVIDER');

/** In-memory stub that mimics Postgres FTS until Phase 1 wiring. */
export class PostgresFtsStub implements SearchProvider {
  readonly name = 'postgres-fts-stub';
  private readonly docs: Array<{
    id: string;
    title: string;
    body: string;
    community?: string;
  }> = [];

  async indexDocument(doc: {
    id: string;
    title: string;
    body: string;
    community?: string;
  }): Promise<void> {
    const idx = this.docs.findIndex((d) => d.id === doc.id);
    if (idx >= 0) this.docs[idx] = doc;
    else this.docs.push(doc);
  }

  async search(query: SearchQuery): Promise<SearchResult> {
    const q = query.q.trim().toLowerCase();
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    const filtered = this.docs.filter((d) => {
      const hay = `${d.title} ${d.body}`.toLowerCase();
      const matchesQ = !q || hay.includes(q);
      const matchesCommunity =
        !query.community || d.community === query.community;
      return matchesQ && matchesCommunity;
    });

    const hits = filtered.slice(offset, offset + limit).map((d, i) => ({
      id: d.id,
      score: 1 / (i + 1),
      title: d.title,
      snippet: d.body.slice(0, 160),
    }));

    return { total: filtered.length, hits };
  }
}
