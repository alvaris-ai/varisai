// ==========================================================
// VARIS AI — REAL WEB RESEARCH ENGINE
// Multi-Source Live Retrieval, Query Planning, Credibility Ranking,
// Anti-Hallucination Evidence Synthesis & Research Caching
// ==========================================================

import { URL } from 'node:url';

// ----------------------------------------------------------
// 1. IN-MEMORY RESEARCH CACHE WITH TTL
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
    // Purge expired keys on size calculation
    const now = Date.now();
    for (const [k, v] of this.#store.entries()) {
      if (now > v.expiresAt) this.#store.delete(k);
    }
    return this.#store.size;
  }
}

// ----------------------------------------------------------
// 2. QUERY ANALYZER & PLANNER
// ----------------------------------------------------------
export class QueryPlanner {
  /**
   * Cleans conversational filler words from queries
   */
  static cleanQuery(text) {
    if (!text || typeof text !== 'string') return '';
    let result = text.trim();
    const prefixRegex = /^(tolong\s+carikan|tolong\s+cari|tolong\s+search|tolong|bisa\s+tolong|coba\s+carikan|coba\s+cari|cari|search|googling|carikan|info\s+tentang|informasi\s+tentang|berikan\s+informasi\s+tentang|mohon\s+jelaskan|siapakah|apakah\s+kamu\s+tahu|apakah\s+anda\s+tahu|apa\s+itu|jelaskan\s+tentang|jelaskan)\s+/i;
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
   * Analyzes user intent and builds 1 to 3 optimized web search queries
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

    // Primary cleaned query
    if (cleaned) {
      addQuery(cleaned);
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

    // Pattern 5: Recent News / Events
    if (/berita|terbaru|terkini|update|hari ini|skor|jadwal|gempa|cuaca/i.test(lowerRaw)) {
      const date = new Date();
      const currentYear = date.getFullYear();
      addQuery(`${cleaned} berita terbaru ${currentYear}`);
    }

    // Return at most 3 focused search queries
    return queries.slice(0, 3);
  }
}

// ----------------------------------------------------------
// 3. SOURCE RANKER & CREDIBILITY EVALUATOR
// ----------------------------------------------------------
export class SourceRanker {
  /**
   * Scores domain authority and credibility (0 - 100)
   */
  static scoreDomain(rawUrl) {
    if (!rawUrl) return 50;
    try {
      const parsed = new URL(rawUrl);
      const host = parsed.hostname.toLowerCase();

      // Indonesian Government & Global Government (Highest tier)
      if (host.endsWith('.go.id') || host.endsWith('.gov') || host.endsWith('.mil')) return 98;

      // Academic & Educational
      if (host.endsWith('.ac.id') || host.endsWith('.edu')) return 95;

      // Official Tech Documentation & Verified Repos
      if (
        host === 'developer.mozilla.org' ||
        host === 'docs.python.org' ||
        host === 'developers.google.com' ||
        host === 'learn.microsoft.com' ||
        host === 'nodejs.org' ||
        host === 'github.com' ||
        host === 'w3.org'
      ) return 94;

      // High-authority Encyclopedias
      if (host.includes('wikipedia.org') || host.includes('britannica.com')) return 88;

      // Established Indonesian & International News Agencies
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

      // General reputable domains
      return 70;
    } catch {
      return 50;
    }
  }

  /**
   * Normalizes URL to prevent duplicates with tracking query parameters
   */
  static normalizeUrl(rawUrl) {
    if (!rawUrl) return '';
    try {
      const parsed = new URL(rawUrl);
      parsed.hash = '';
      // Remove common tracking search params
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid', 'ref'].forEach(p => {
        parsed.searchParams.delete(p);
      });
      return parsed.toString().replace(/\/+$/, '');
    } catch {
      return rawUrl.trim();
    }
  }

  /**
   * Ranks, deduplicates, and validates retrieved sources
   */
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

      // Calculate title/snippet relevance to planned queries
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
        snippet: (source.snippet || '').replace(/<[^>]+>/g, '').trim(),
        source_name: source.source_name || domain,
        domain,
        score: Math.round(totalScore),
        type: source.type || 'web_result',
        published_date: source.published_date || null,
      });
    }

    // Sort descending by score
    ranked.sort((a, b) => b.score - a.score);

    return ranked.slice(0, maxSources);
  }
}

// ----------------------------------------------------------
// 4. PLUGGABLE SEARCH PROVIDERS
// ----------------------------------------------------------

export class BaseWebSearchProvider {
  constructor(name) {
    this.name = name;
  }

  async search(query, options = {}) {
    throw new Error('search() must be implemented by subclass');
  }
}

/**
 * Wikipedia Provider (Indonesian & Global English with full REST Summary extraction)
 */
export class WikipediaSearchProvider extends BaseWebSearchProvider {
  constructor({ timeoutMs = 4500 } = {}) {
    super('wikipedia');
    this.timeoutMs = timeoutMs;
  }

  async search(query, { limit = 3 } = {}) {
    const cleanQuery = query.trim();
    if (!cleanQuery) return [];

    const results = [];
    const seenTitles = new Set();

    // 1. Query Indonesian Wikipedia
    try {
      const idUrl = `https://id.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleanQuery)}&format=json&utf8=1`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      const res = await fetch(idUrl, {
        headers: { 'User-Agent': 'VarisAI/2.0 (https://varisai.vercel.app; support@varis.ai)' },
        signal: controller.signal,
      }).finally(() => clearTimeout(timer));

      if (res.ok) {
        const data = await res.json();
        const searchItems = data?.query?.search || [];

        for (const item of searchItems.slice(0, limit)) {
          if (seenTitles.has(item.title.toLowerCase())) continue;
          seenTitles.add(item.title.toLowerCase());

          let snippet = (item.snippet || '').replace(/<[^>]+>/g, '').trim();

          // Fetch rich extract from REST summary API
          try {
            const sumController = new AbortController();
            const sumTimer = setTimeout(() => sumController.abort(), 2500);
            const sumRes = await fetch(
              `https://id.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(item.title.replace(/\s+/g, '_'))}`,
              { headers: { 'User-Agent': 'VarisAI-Research/2.0' }, signal: sumController.signal }
            ).finally(() => clearTimeout(sumTimer));

            if (sumRes.ok) {
              const sumData = await sumRes.json();
              if (sumData.extract) {
                snippet = sumData.extract;
              }
            }
          } catch {}

          results.push({
            title: item.title,
            url: `https://id.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/\s+/g, '_'))}`,
            snippet,
            source_name: 'Wikipedia (ID)',
            domain: 'id.wikipedia.org',
            type: 'encyclopedic_id',
          });
        }
      }
    } catch {}

    // 2. Query English Wikipedia if results are few
    if (results.length < limit) {
      try {
        const enUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleanQuery)}&format=json&utf8=1`;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);
        const res = await fetch(enUrl, {
          headers: { 'User-Agent': 'VarisAI/2.0 (https://varisai.vercel.app; support@varis.ai)' },
          signal: controller.signal,
        }).finally(() => clearTimeout(timer));

        if (res.ok) {
          const data = await res.json();
          const searchItems = (data?.query?.search || []).slice(0, limit - results.length);

          for (const item of searchItems) {
            if (seenTitles.has(item.title.toLowerCase())) continue;
            seenTitles.add(item.title.toLowerCase());

            let snippet = (item.snippet || '').replace(/<[^>]+>/g, '').trim();
            try {
              const sumController = new AbortController();
              const sumTimer = setTimeout(() => sumController.abort(), 2500);
              const sumRes = await fetch(
                `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(item.title.replace(/\s+/g, '_'))}`,
                { headers: { 'User-Agent': 'VarisAI-Research/2.0' }, signal: sumController.signal }
              ).finally(() => clearTimeout(sumTimer));

              if (sumRes.ok) {
                const sumData = await sumRes.json();
                if (sumData.extract) snippet = sumData.extract;
              }
            } catch {}

            results.push({
              title: item.title,
              url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/\s+/g, '_'))}`,
              snippet,
              source_name: 'Wikipedia (Global)',
              domain: 'en.wikipedia.org',
              type: 'encyclopedic_en',
            });
          }
        }
      } catch {}
    }

    return results;
  }
}

/**
 * DuckDuckGo Instant Answer & Knowledge Graph Provider
 */
export class DuckDuckGoSearchProvider extends BaseWebSearchProvider {
  constructor({ timeoutMs = 4500 } = {}) {
    super('duckduckgo');
    this.timeoutMs = timeoutMs;
  }

  async search(query, { limit = 4 } = {}) {
    const cleanQuery = query.trim();
    if (!cleanQuery) return [];

    const results = [];
    try {
      const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(cleanQuery)}&format=json&no_html=1&skip_disambig=1`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      const res = await fetch(url, {
        headers: { 'User-Agent': 'VarisAI/2.0 (https://varisai.vercel.app; support@varis.ai)' },
        signal: controller.signal,
      }).finally(() => clearTimeout(timer));

      if (res.ok) {
        const data = await res.json();
        
        // 1. Direct Abstract / Direct Answer
        if (data.AbstractText && data.AbstractURL) {
          results.push({
            title: data.Heading || cleanQuery,
            url: data.AbstractURL,
            snippet: data.AbstractText,
            source_name: data.AbstractSource || 'DuckDuckGo Knowledge',
            type: 'direct_answer',
          });
        }

        // 2. Related Topics
        if (Array.isArray(data.RelatedTopics)) {
          for (const topic of data.RelatedTopics) {
            if (results.length >= limit) break;
            if (topic.Text && topic.FirstURL) {
              const title = topic.Text.split(' - ')[0] || cleanQuery;
              results.push({
                title,
                url: topic.FirstURL,
                snippet: topic.Text,
                source_name: 'DuckDuckGo Topic',
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
                    source_name: 'DuckDuckGo SubTopic',
                    type: 'web_result',
                  });
                }
              }
            }
          }
        }

        // 3. Results field (if available)
        if (Array.isArray(data.Results)) {
          for (const item of data.Results) {
            if (results.length >= limit) break;
            if (item.FirstURL && item.Text) {
              results.push({
                title: item.Text.split(' - ')[0] || cleanQuery,
                url: item.FirstURL,
                snippet: item.Text,
                source_name: 'DuckDuckGo Direct Link',
                type: 'web_result',
              });
            }
          }
        }
      }
    } catch {}

    return results;
  }
}

// ----------------------------------------------------------
// 5. MULTI-SOURCE WEB RESEARCH ENGINE
// ----------------------------------------------------------
export class MultiWebSearchEngine {
  constructor({
    providers = [],
    cache = new ResearchCache(),
    maxSources = 5,
  } = {}) {
    this.providers = providers.length > 0 ? providers : [
      new WikipediaSearchProvider(),
      new DuckDuckGoSearchProvider(),
    ];
    this.cache = cache;
    this.maxSources = maxSources;
  }

  /**
   * Executes multi-query parallel research workflow
   */
  async research(userMessage, { maxSources = this.maxSources, bypassCache = false } = {}) {
    const raw = (userMessage || '').trim();
    if (!raw) {
      return {
        query: '',
        planned_queries: [],
        sources: [],
        formatted_context: '',
        status: 'empty_query',
      };
    }

    const cacheKey = `research:${raw.toLowerCase()}`;
    if (!bypassCache) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return { ...cached, from_cache: true };
      }
    }

    // 1. Plan queries
    const plannedQueries = QueryPlanner.plan(raw);
    if (plannedQueries.length === 0) {
      plannedQueries.push(QueryPlanner.cleanQuery(raw) || raw);
    }

    const rawCollectedSources = [];

    // 2. Fetch from all providers for each planned query in parallel
    const searchPromises = [];
    for (const query of plannedQueries) {
      for (const provider of this.providers) {
        searchPromises.push(
          provider.search(query, { limit: 3 })
            .then(res => {
              if (Array.isArray(res)) {
                rawCollectedSources.push(...res);
              }
            })
            .catch(() => {
              // Silently absorb individual provider timeout/failure
            })
        );
      }
    }

    await Promise.all(searchPromises);

    // 3. Rank, deduplicate, and validate credibility
    const rankedSources = SourceRanker.rankAndFilter(rawCollectedSources, {
      targetQueries: plannedQueries,
      maxSources,
    });

    // 4. Build Structured Research Context
    const formattedContext = buildResearchContext(rankedSources, raw);

    const result = {
      query: raw,
      planned_queries: plannedQueries,
      total_sources_found: rawCollectedSources.length,
      sources: rankedSources,
      formatted_context: formattedContext,
      status: rankedSources.length > 0 ? 'success' : 'no_sources_found',
      timestamp: Date.now(),
    };

    // Save in cache (10 mins TTL)
    this.cache.set(cacheKey, result, 10 * 60 * 1000);

    return result;
  }
}

// ----------------------------------------------------------
// 6. STRUCTURED RESEARCH CONTEXT BUILDER
// ----------------------------------------------------------
export function buildResearchContext(sources = [], userQuery = '') {
  if (!Array.isArray(sources) || sources.length === 0) {
    return '';
  }

  const citationsList = sources.map((s, idx) => {
    const num = idx + 1;
    return `[${num}] "${s.title}" (${s.source_name || s.domain})\nURL: ${s.url}\nRingkasan: ${s.snippet}`;
  }).join('\n\n');

  return `=== HASIL RISET WEB REAL-TIME TERKINI ===
Topik/Pertanyaan: "${userQuery}"
Jumlah Sumber Terverifikasi: ${sources.length}

${citationsList}

INSTRUKSI PENGGUNAAN SUMBER:
1. Gunakan fakta di atas sebagai landasan utama jawaban yang akurat dan terkini.
2. Cantumkan rujukan berupa tautan markdown langsung ke sumber asli, contoh: "[Nama Sumber](URL)" atau gunakan nomor rujukan seperti "[1]".
3. Jangan pernah mengarang data atau URL fiktif di luar sumber yang terverifikasi.
4. Jika ada perbedaan informasi antar sumber, jelaskan perbedaannya secara netral.`;
}

// Singleton Default Engine
let defaultEngineInstance = null;

export function getDefaultWebSearchEngine() {
  if (!defaultEngineInstance) {
    defaultEngineInstance = new MultiWebSearchEngine();
  }
  return defaultEngineInstance;
}
