// ==========================================================
// VARIS AI — REAL RESEARCH AGENT SUBSYSTEM
// Production-Ready Modular Web Research Agent Architecture:
// ├── QueryPlanner
// ├── SearchProvider (Wikipedia, DuckDuckGo)
// ├── SourceRetriever
// ├── SourceRanker
// ├── SourceValidator
// ├── ContentExtractor
// ├── ResearchContextBuilder
// └── CitationBuilder
// ==========================================================

import { URL } from 'node:url';

// ----------------------------------------------------------
// 1. IN-MEMORY RESEARCH CACHE WITH TTL & FRESHNESS POLICY
// ----------------------------------------------------------
export class ResearchCache {
  #store = new Map();

  constructor({ defaultTtlMs = 15 * 60 * 1000 } = {}) {
    this.defaultTtlMs = defaultTtlMs;
  }

  get(key) {
    if (!key) return null;
    const normalizedKey = String(key).trim().toLowerCase();
    const entry = this.#store.get(normalizedKey);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.#store.delete(normalizedKey);
      return null;
    }
    return entry.value;
  }

  set(key, value, ttlMs = this.defaultTtlMs) {
    if (!key) return;
    const normalizedKey = String(key).trim().toLowerCase();
    this.#store.set(normalizedKey, {
      value,
      expiresAt: Date.now() + (ttlMs || this.defaultTtlMs),
      createdAt: Date.now(),
    });
  }

  has(key) {
    return this.get(key) !== null;
  }

  clear() {
    this.#store.clear();
  }

  size() {
    const now = Date.now();
    for (const [k, v] of this.#store.entries()) {
      if (now > v.expiresAt) this.#store.delete(k);
    }
    return this.#store.size;
  }
}

// ----------------------------------------------------------
// 2. QUERY PLANNER (ADAPTIVE 1–5 QUERIES)
// ----------------------------------------------------------
export class QueryPlanner {
  /**
   * Cleans conversational filler words from queries
   */
  static cleanQuery(text) {
    if (!text || typeof text !== 'string') return '';
    let result = text.trim();
    
    // 1. Remove instruction prefixes & brevity modifiers
    result = result.replace(/\b(jawab\s+dengan\s+singkat\s+padat\s+dan\s+jelas|jawab\s+dengan\s+singkat\s+padat\s+jelas|jawab\s+singkat\s+padat\s+jelas|jawab\s+dengan\s+singkat|jawab\s+singkat|secara\s+singkat|singkat\s+padat\s+jelas|singkat\s+jelas|singkat\s+saja|dengan\s+singkat|ambil\s+poinnya|ambil\s+point\s+nya|ambil\s+poin\s+nya|to\s+the\s+point)\b/gi, '');

    const prefixRegex = /^(tolong\s+carikan|tolong\s+cari|tolong\s+search|tolong\s+jawab|tolong\s+sebutkan|tolong|bisa\s+tolong|coba\s+carikan|coba\s+cari|coba\s+jawab|coba\s+sebutkan|cari|search|googling|carikan|info\s+tentang|informasi\s+tentang|berikan\s+informasi\s+tentang|mohon\s+jelaskan|siapakah|apakah\s+kamu\s+tahu|apakah\s+anda\s+tahu|apa\s+itu|jelaskan\s+tentang|jelaskan|sebutkan|beritahu|kasih\s+tahu)\s+/i;
    let changed = true;
    while (changed) {
      const next = result.replace(prefixRegex, '');
      if (next === result) {
        changed = false;
      } else {
        result = next.trim();
      }
    }
    return result
      .replace(/[?!.,;:"'(){}\[\]]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Analyzes user intent, query complexity, and freshness policy
   * Produces 1 query for simple topics, up to 2–5 queries for complex tasks.
   */
  static plan(userMessage, { recentContext = [] } = {}) {
    const raw = (userMessage || '').trim();
    if (!raw) return [];

    const cleaned = this.cleanQuery(raw);
    const lowerRaw = raw.toLowerCase();
    const queries = [];
    const seen = new Set();

    const addQuery = (q) => {
      const normalized = q.trim().replace(/\s+/g, ' ');
      if (normalized.length > 2 && !seen.has(normalized.toLowerCase())) {
        seen.add(normalized.toLowerCase());
        queries.push(normalized);
      }
    };

    if (cleaned) {
      addQuery(cleaned);
    }

    // Pattern 0: Population & Demographics (e.g. "ada berapa juta orang di indonesia", "populasi indonesia")
    if (
      (lowerRaw.includes('orang') || lowerRaw.includes('penduduk') || lowerRaw.includes('populasi') || lowerRaw.includes('jiwa') || lowerRaw.includes('masyarakat')) &&
      (lowerRaw.includes('indonesia') || lowerRaw.includes('negeri ini') || lowerRaw.includes('negara kita'))
    ) {
      addQuery('Demografi Indonesia');
      addQuery('Jumlah penduduk Indonesia');
      addQuery('Populasi Indonesia');
    }

    // Pattern 0b: Provinces & Geography
    if ((lowerRaw.includes('provinsi') || lowerRaw.includes('propinsi')) && lowerRaw.includes('indonesia')) {
      addQuery('Daftar provinsi di Indonesia');
      addQuery('Provinsi di Indonesia');
    }

    if (lowerRaw.includes('pulau') && lowerRaw.includes('indonesia')) {
      addQuery('Daftar pulau di Indonesia');
      addQuery('Geografi Indonesia');
    }

    // Pattern 0c: National Symbols & Currency
    if (lowerRaw.includes('mata uang') && lowerRaw.includes('indonesia')) {
      addQuery('Rupiah');
    }
    if (lowerRaw.includes('lagu kebangsaan') && lowerRaw.includes('indonesia')) {
      addQuery('Indonesia Raya');
    }
    if ((lowerRaw.includes('ibu kota') || lowerRaw.includes('ibukota')) && lowerRaw.includes('indonesia')) {
      addQuery('Ibu kota Indonesia');
      addQuery('Nusantara (kota terencana)');
    }

    // Pattern 0d: Places of Worship
    if (lowerRaw.includes('masjid') && (lowerRaw.includes('ibadah') || lowerRaw.includes('umat') || lowerRaw.includes('agama'))) {
      addQuery('Masjid');
    }
    if (lowerRaw.includes('gereja') && (lowerRaw.includes('ibadah') || lowerRaw.includes('umat') || lowerRaw.includes('agama'))) {
      addQuery('Gereja');
    }
    if (lowerRaw.includes('pura') && (lowerRaw.includes('ibadah') || lowerRaw.includes('umat') || lowerRaw.includes('agama'))) {
      addQuery('Pura (tempat ibadah)');
    }
    if ((lowerRaw.includes('vihara') || lowerRaw.includes('wihara')) && (lowerRaw.includes('ibadah') || lowerRaw.includes('umat') || lowerRaw.includes('agama'))) {
      addQuery('Vihara');
    }
    if ((lowerRaw.includes('klenteng') || lowerRaw.includes('kelenteng') || lowerRaw.includes('litang')) && (lowerRaw.includes('ibadah') || lowerRaw.includes('umat') || lowerRaw.includes('agama'))) {
      addQuery('Kelenteng');
    }

    // Pattern 1: Comparisons (e.g. "RTX 5060 vs RTX 4060", "Python vs Go")
    const vsMatch = cleaned.match(/(.+?)\s+(?:vs|versus|dibandingkan dengan|dibanding|bandingkan)\s+(.+)/i);
    if (vsMatch) {
      const itemA = vsMatch[1].trim();
      const itemB = vsMatch[2].trim();
      addQuery(`${itemA} specs`);
      addQuery(`${itemB} specs`);
      addQuery(`${itemA} vs ${itemB} comparison review`);
    }

    // Pattern 2: Current Indonesian Leaders / Government
    if (/presiden\s+indonesia/i.test(cleaned) || /wakil\s+presiden/i.test(cleaned) || /menteri/i.test(cleaned)) {
      addQuery('Presiden Republik Indonesia terbaru');
      addQuery('Prabowo Subianto Presiden Indonesia');
    }

    // Pattern 3: Pricing / Market Info
    if (/harga|biaya|tarif|price|cost|beli/i.test(cleaned)) {
      addQuery(`${cleaned} harga resmi`);
    }

    // Pattern 4: Technical Documentation / Code Specs
    if (/dokumentasi|setup|install|cara pakai|api|sdk|library|tutorial/i.test(cleaned)) {
      addQuery(`${cleaned} official documentation`);
    }

    // Pattern 5: Recent News / Freshness Policy (news, stock, sports, events)
    if (/berita|terbaru|terkini|update|hari ini|skor|jadwal|gempa|cuaca/i.test(lowerRaw)) {
      const currentYear = new Date().getFullYear();
      addQuery(`${cleaned} berita terbaru ${currentYear}`);
    }

    // Adaptively bound query count: 1 to 4 max
    return queries.slice(0, 4);
  }
}

// ----------------------------------------------------------
// 3. PLUGGABLE SEARCH PROVIDERS
// ----------------------------------------------------------
export class BaseSearchProvider {
  constructor(name) {
    this.name = name;
  }

  async search(query, options = {}) {
    throw new Error('search() must be implemented by subclass');
  }
}

export class WikipediaSearchProvider extends BaseSearchProvider {
  constructor({ timeoutMs = 4500 } = {}) {
    super('wikipedia');
    this.timeoutMs = timeoutMs;
  }

  async search(query, { limit = 3 } = {}) {
    const cleanQuery = query.trim();
    if (!cleanQuery) return [];

    const results = [];
    const seenTitles = new Set();
    const userAgent = 'VarisAI/2.0 (https://varisai.vercel.app; support@varis.ai)';

    // 1. Indonesian Wikipedia
    try {
      const idUrl = `https://id.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleanQuery)}&format=json&utf8=1`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      const res = await fetch(idUrl, {
        headers: { 'User-Agent': userAgent },
        signal: controller.signal,
      }).finally(() => clearTimeout(timer));

      if (res.ok) {
        const data = await res.json();
        const searchItems = data?.query?.search || [];

        for (const item of searchItems.slice(0, limit)) {
          if (seenTitles.has(item.title.toLowerCase())) continue;
          seenTitles.add(item.title.toLowerCase());

          let snippet = (item.snippet || '').replace(/<[^>]+>/g, '').trim();
          let fullContent = snippet;

          try {
            const sumController = new AbortController();
            const sumTimer = setTimeout(() => sumController.abort(), 2500);
            const sumRes = await fetch(
              `https://id.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(item.title.replace(/\s+/g, '_'))}`,
              { headers: { 'User-Agent': userAgent }, signal: sumController.signal }
            ).finally(() => clearTimeout(sumTimer));

            if (sumRes.ok) {
              const sumData = await sumRes.json();
              if (sumData.extract) {
                snippet = sumData.extract;
                fullContent = sumData.extract;
              }
            }
          } catch {}

          results.push({
            title: item.title,
            url: `https://id.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/\s+/g, '_'))}`,
            snippet,
            content: fullContent,
            source_name: 'Wikipedia (ID)',
            domain: 'id.wikipedia.org',
            publishedAt: item.timestamp ? item.timestamp.slice(0, 10) : new Date().toISOString().slice(0, 10),
            retrievedAt: new Date().toISOString(),
            type: 'encyclopedic_id',
          });
        }
      }
    } catch {}

    // 2. Global English Wikipedia Fallback
    if (results.length < limit) {
      try {
        const enUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleanQuery)}&format=json&utf8=1`;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);
        const res = await fetch(enUrl, {
          headers: { 'User-Agent': userAgent },
          signal: controller.signal,
        }).finally(() => clearTimeout(timer));

        if (res.ok) {
          const data = await res.json();
          const searchItems = (data?.query?.search || []).slice(0, limit - results.length);

          for (const item of searchItems) {
            if (seenTitles.has(item.title.toLowerCase())) continue;
            seenTitles.add(item.title.toLowerCase());

            let snippet = (item.snippet || '').replace(/<[^>]+>/g, '').trim();
            let fullContent = snippet;

            try {
              const sumController = new AbortController();
              const sumTimer = setTimeout(() => sumController.abort(), 2500);
              const sumRes = await fetch(
                `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(item.title.replace(/\s+/g, '_'))}`,
                { headers: { 'User-Agent': userAgent }, signal: sumController.signal }
              ).finally(() => clearTimeout(sumTimer));

              if (sumRes.ok) {
                const sumData = await sumRes.json();
                if (sumData.extract) {
                  snippet = sumData.extract;
                  fullContent = sumData.extract;
                }
              }
            } catch {}

            results.push({
              title: item.title,
              url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/\s+/g, '_'))}`,
              snippet,
              content: fullContent,
              source_name: 'Wikipedia (Global)',
              domain: 'en.wikipedia.org',
              publishedAt: item.timestamp ? item.timestamp.slice(0, 10) : new Date().toISOString().slice(0, 10),
              retrievedAt: new Date().toISOString(),
              type: 'encyclopedic_en',
            });
          }
        }
      } catch {}
    }

    return results;
  }
}

export class DuckDuckGoSearchProvider extends BaseSearchProvider {
  constructor({ timeoutMs = 4500 } = {}) {
    super('duckduckgo');
    this.timeoutMs = timeoutMs;
  }

  async search(query, { limit = 4 } = {}) {
    const cleanQuery = query.trim();
    if (!cleanQuery) return [];

    const results = [];
    const userAgent = 'VarisAI/2.0 (https://varisai.vercel.app; support@varis.ai)';

    try {
      const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(cleanQuery)}&format=json&no_html=1&skip_disambig=1`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      const res = await fetch(url, {
        headers: { 'User-Agent': userAgent },
        signal: controller.signal,
      }).finally(() => clearTimeout(timer));

      if (res.ok) {
        const data = await res.json();
        
        if (data.AbstractText && data.AbstractURL) {
          results.push({
            title: data.Heading || cleanQuery,
            url: data.AbstractURL,
            snippet: data.AbstractText,
            content: data.AbstractText,
            source_name: data.AbstractSource || 'DuckDuckGo Knowledge',
            publishedAt: new Date().toISOString().slice(0, 10),
            retrievedAt: new Date().toISOString(),
            type: 'direct_answer',
          });
        }

        if (Array.isArray(data.RelatedTopics)) {
          for (const topic of data.RelatedTopics) {
            if (results.length >= limit) break;
            if (topic.Text && topic.FirstURL) {
              const title = topic.Text.split(' - ')[0] || cleanQuery;
              results.push({
                title,
                url: topic.FirstURL,
                snippet: topic.Text,
                content: topic.Text,
                source_name: 'DuckDuckGo Topic',
                publishedAt: new Date().toISOString().slice(0, 10),
                retrievedAt: new Date().toISOString(),
                type: 'web_result',
              });
            } else if (Array.isArray(topic.Topics)) {
              for (const subTopic of topic.Topics) {
                if (results.length >= limit) break;
                if (subTopic.Text && subTopic.FirstURL) {
                  results.push({
                    title: subTopic.Text.split(' - ')[0] || cleanQuery,
                    url: subTopic.FirstURL,
                    snippet: subTopic.Text,
                    content: subTopic.Text,
                    source_name: 'DuckDuckGo SubTopic',
                    publishedAt: new Date().toISOString().slice(0, 10),
                    retrievedAt: new Date().toISOString(),
                    type: 'web_result',
                  });
                }
              }
            }
          }
        }
      }
    } catch {}

    return results;
  }
}

// ----------------------------------------------------------
// 4. SOURCE RETRIEVER (PARALLEL MULTI-PROVIDER COORDINATOR)
// ----------------------------------------------------------
export class SourceRetriever {
  constructor(providers = []) {
    this.providers = providers.length > 0 ? providers : [
      new WikipediaSearchProvider(),
      new DuckDuckGoSearchProvider(),
    ];
  }

  async retrieve(queries = [], options = {}) {
    const rawResults = [];
    const searchPromises = [];

    for (const query of queries) {
      for (const provider of this.providers) {
        searchPromises.push(
          provider.search(query, options)
            .then(items => {
              if (Array.isArray(items)) {
                rawResults.push(...items);
              }
            })
            .catch(() => {})
        );
      }
    }

    await Promise.all(searchPromises);
    return rawResults;
  }
}

// ----------------------------------------------------------
// 5. SOURCE RANKER & CREDIBILITY EVALUATOR
// ----------------------------------------------------------
export class SourceRanker {
  /**
   * Scores domain authority according to Section 38 hierarchy:
   * Official/Gov (98) > Academic/Edu (95) > Docs (94) > Wikipedia (88) > Reputable News (85) > General (70)
   */
  static scoreDomain(rawUrl) {
    if (!rawUrl) return 50;
    try {
      const parsed = new URL(rawUrl);
      const host = parsed.hostname.toLowerCase();

      // 1. Indonesian & Global Government
      if (host.endsWith('.go.id') || host.endsWith('.gov') || host.endsWith('.mil')) return 98;

      // 2. Academic & Educational
      if (host.endsWith('.ac.id') || host.endsWith('.edu')) return 95;

      // 3. Official Documentation & Verified Dev Platforms
      if (
        host === 'developer.mozilla.org' ||
        host === 'docs.python.org' ||
        host === 'developers.google.com' ||
        host === 'learn.microsoft.com' ||
        host === 'nodejs.org' ||
        host === 'github.com' ||
        host === 'w3.org'
      ) return 94;

      // 4. Encyclopedias
      if (host.includes('wikipedia.org') || host.includes('britannica.com')) return 88;

      // 5. Reputable News & Industry Sources
      if (
        host.includes('antaranews.com') ||
        host.includes('reuters.com') ||
        host.includes('bbc.com') ||
        host.includes('apnews.com') ||
        host.includes('bloomberg.com') ||
        host.includes('kompas.com') ||
        host.includes('tempo.co') ||
        host.includes('detik.com') ||
        host.includes('theverge.com') ||
        host.includes('techcrunch.com')
      ) return 85;

      return 70;
    } catch {
      return 50;
    }
  }

  static normalizeUrl(rawUrl) {
    if (!rawUrl) return '';
    try {
      const parsed = new URL(rawUrl);
      parsed.hash = '';
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid', 'ref'].forEach(p => {
        parsed.searchParams.delete(p);
      });
      return parsed.toString().replace(/\/+$/, '');
    } catch {
      return rawUrl.trim();
    }
  }

  static rankAndFilter(sources = [], { targetQueries = [], maxSources = 6 } = {}) {
    if (!Array.isArray(sources) || sources.length === 0) return [];

    const seenUrls = new Set();
    const seenTitles = new Set();
    const ranked = [];

    for (const source of sources) {
      if (!source || !source.title || !source.url) continue;

      const normalizedUrl = this.normalizeUrl(source.url);
      const normalizedTitle = source.title.trim().toLowerCase();

      if (seenUrls.has(normalizedUrl) || seenTitles.has(normalizedTitle)) {
        continue;
      }

      seenUrls.add(normalizedUrl);
      seenTitles.add(normalizedTitle);

      const domainScore = this.scoreDomain(source.url);
      const snippetLength = (source.snippet || '').trim().length;
      const snippetScore = snippetLength > 80 ? 15 : snippetLength > 30 ? 10 : 5;

      let queryMatchBonus = 0;
      const combinedText = `${source.title} ${source.snippet || ''}`.toLowerCase();
      for (const q of targetQueries) {
        const words = q.toLowerCase().split(' ').filter(w => w.length > 2);
        const matchCount = words.filter(w => combinedText.includes(w)).length;
        if (words.length > 0) {
          queryMatchBonus += Math.min(15, (matchCount / words.length) * 15);
        }
      }

      const totalScore = domainScore + snippetScore + queryMatchBonus;
      const normalizedRelevance = Math.min(0.99, Number((totalScore / 130).toFixed(2)));

      let domain = '';
      try {
        domain = new URL(source.url).hostname.replace(/^www\./, '');
      } catch {
        domain = source.source_name || 'web';
      }

      ranked.push({
        id: source.id || `src-${ranked.length + 1}`,
        title: source.title.trim(),
        url: normalizedUrl,
        domain,
        snippet: (source.snippet || '').replace(/<[^>]+>/g, '').trim(),
        content: (source.content || source.snippet || '').replace(/<[^>]+>/g, '').trim(),
        source_name: source.source_name || domain,
        publishedAt: source.publishedAt || new Date().toISOString().slice(0, 10),
        retrievedAt: source.retrievedAt || new Date().toISOString(),
        relevanceScore: normalizedRelevance,
        score: Math.round(totalScore),
        type: source.type || 'web_result',
      });
    }

    ranked.sort((a, b) => b.score - a.score);
    return ranked.slice(0, maxSources);
  }
}

// ----------------------------------------------------------
// 6. SOURCE VALIDATOR & CONTENT EXTRACTOR
// ----------------------------------------------------------
export class SourceValidator {
  static isValid(source) {
    if (!source || typeof source !== 'object') return false;
    if (!source.title || typeof source.title !== 'string' || source.title.length < 2) return false;
    if (!source.url || typeof source.url !== 'string' || !source.url.startsWith('http')) return false;
    if (!source.snippet && !source.content) return false;
    return true;
  }

  static validateAll(sources = []) {
    return (sources || []).filter(s => this.isValid(s));
  }
}

export class ContentExtractor {
  static extract(source) {
    return {
      title: source.title.trim(),
      url: source.url.trim(),
      domain: source.domain || (source.url ? new URL(source.url).hostname.replace(/^www\./, '') : 'web'),
      snippet: source.snippet || source.content || '',
      content: source.content || source.snippet || '',
      publishedAt: source.publishedAt || new Date().toISOString().slice(0, 10),
      retrievedAt: source.retrievedAt || new Date().toISOString(),
      relevanceScore: source.relevanceScore || 0.85,
    };
  }
}

// ----------------------------------------------------------
// 7. RESEARCH CONTEXT & CITATION BUILDER
// ----------------------------------------------------------
export class ResearchContextBuilder {
  static build(sources = [], userQuery = '') {
    if (!Array.isArray(sources) || sources.length === 0) {
      return '';
    }

    const sourcesBlock = sources.map((s, idx) => {
      const num = idx + 1;
      return `SOURCE ${num}:
Title: "${s.title}"
URL: ${s.url}
Domain: ${s.domain}
Published: ${s.publishedAt || 'N/A'}
Content: ${s.content || s.snippet}`;
    }).join('\n\n');

    return `HASIL RISET WEB REAL-TIME TERKINI (RESEARCH SOURCES):
USER QUESTION:
"${userQuery}"

VERIFIED SOURCES (${sources.length} Sumber Terverifikasi):

${sourcesBlock}

INSTRUKSI PENGGUNAAN SUMBER (INSTRUCTIONS):
1. Answer the user's question accurately using the research evidence above as the primary ground truth.
2. Gunakan fakta terverifikasi dari sumber di atas untuk menyusun jawaban.
3. Do not invent unsupported facts or imaginary URLs (Jangan mengarang fakta atau URL palsu).
4. If sources disagree, explain the disagreement neutrally and objectively.
5. Cite the sources used using explicit markdown citations like "[Source Name](URL)" or "[1]".`;
  }
}

export class CitationBuilder {
  static buildCitations(sources = []) {
    return (sources || []).map((s, idx) => ({
      index: idx + 1,
      id: s.id || `src-${idx + 1}`,
      title: s.title,
      url: s.url,
      domain: s.domain,
      snippet: s.snippet,
      relevanceScore: s.relevanceScore,
    }));
  }
}

// ----------------------------------------------------------
// 8. RESEARCH AGENT (MASTER FACADE)
// ----------------------------------------------------------
export class ResearchAgent {
  constructor({
    providers = [],
    cache = new ResearchCache(),
    maxSources = 5,
  } = {}) {
    this.retriever = new SourceRetriever(providers);
    this.cache = cache;
    this.maxSources = maxSources;
  }

  async research(userMessage, { maxSources = this.maxSources, bypassCache = false } = {}) {
    const raw = (userMessage || '').trim();
    if (!raw) {
      return {
        query: '',
        planned_queries: [],
        sources: [],
        formatted_context: '',
        status: 'empty_query',
        timestamp: Date.now(),
      };
    }

    const cacheKey = `research:${raw.toLowerCase()}`;
    if (!bypassCache) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return { ...cached, from_cache: true };
      }
    }

    // 1. QueryPlanner
    const plannedQueries = QueryPlanner.plan(raw);
    if (plannedQueries.length === 0) {
      plannedQueries.push(QueryPlanner.cleanQuery(raw) || raw);
    }

    // 2. SourceRetriever
    const rawSources = await this.retriever.retrieve(plannedQueries, { limit: 3 });

    // 3. SourceValidator
    const validSources = SourceValidator.validateAll(rawSources);

    // 4. SourceRanker
    const rankedSources = SourceRanker.rankAndFilter(validSources, {
      targetQueries: plannedQueries,
      maxSources,
    });

    // 5. ContentExtractor
    const extractedSources = rankedSources.map(s => ContentExtractor.extract(s));

    // 6. ResearchContextBuilder & CitationBuilder
    const formattedContext = ResearchContextBuilder.build(extractedSources, raw);
    const citations = CitationBuilder.buildCitations(extractedSources);

    const result = {
      query: raw,
      planned_queries: plannedQueries,
      total_sources_found: rawSources.length,
      sources: extractedSources,
      citations,
      formatted_context: formattedContext,
      status: extractedSources.length > 0 ? 'success' : 'no_sources_found',
      timestamp: Date.now(),
    };

    this.cache.set(cacheKey, result, 10 * 60 * 1000);
    return result;
  }
}

// Backward Compatibility Aliases & Singleton
export const MultiWebSearchEngine = ResearchAgent;
export function buildResearchContext(sources, userQuery) {
  return ResearchContextBuilder.build(sources, userQuery);
}

let defaultAgentInstance = null;
export function getDefaultResearchAgent() {
  if (!defaultAgentInstance) {
    defaultAgentInstance = new ResearchAgent();
  }
  return defaultAgentInstance;
}

export function getDefaultWebSearchEngine() {
  return getDefaultResearchAgent();
}
