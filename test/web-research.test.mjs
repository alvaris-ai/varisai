import test from 'node:test';
import assert from 'node:assert/strict';
import {
  QueryPlanner,
  SourceRanker,
  ResearchCache,
  WikipediaSearchProvider,
  DuckDuckGoSearchProvider,
  MultiWebSearchEngine,
  buildResearchContext,
  getDefaultWebSearchEngine,
} from '../src/web-research.mjs';

test('QueryPlanner: generates targeted search queries for various intents', () => {
  // 1. Comparison
  const compQueries = QueryPlanner.plan('Perbandingan GPU RTX 5060 vs RTX 4060');
  assert.ok(compQueries.length >= 2);
  assert.ok(compQueries.some(q => q.toLowerCase().includes('rtx 5060')));
  assert.ok(compQueries.some(q => q.toLowerCase().includes('rtx 4060')));

  // 2. Current Indonesian leader / politics
  const presQueries = QueryPlanner.plan('Siapa presiden Indonesia saat ini?');
  assert.ok(presQueries.length >= 1);
  assert.ok(presQueries.some(q => q.toLowerCase().includes('presiden')));

  // 3. Pricing / Market
  const priceQueries = QueryPlanner.plan('Berapa harga resmi iPhone 16 Pro Max?');
  assert.ok(priceQueries.some(q => q.toLowerCase().includes('harga')));

  // 4. Technical Docs
  const techQueries = QueryPlanner.plan('Cara setup Google Identity Services GIS SDK');
  assert.ok(techQueries.some(q => q.toLowerCase().includes('google identity') || q.toLowerCase().includes('official documentation')));

  // 5. Clean query removes conversational fluff
  assert.equal(QueryPlanner.cleanQuery('tolong carikan info tentang Kecerdasan Buatan'), 'Kecerdasan Buatan');
  assert.equal(QueryPlanner.cleanQuery('apakah kamu tahu siapakah Albert Einstein?'), 'Albert Einstein');
});

test('SourceRanker: domain credibility scoring and URL normalization', () => {
  // Domain credibility scoring
  assert.equal(SourceRanker.scoreDomain('https://presiden.go.id/berita/123'), 98);
  assert.equal(SourceRanker.scoreDomain('https://whitehouse.gov/briefing-room'), 98);
  assert.equal(SourceRanker.scoreDomain('https://itb.ac.id/news/456'), 95);
  assert.equal(SourceRanker.scoreDomain('https://mit.edu/research/789'), 95);
  assert.equal(SourceRanker.scoreDomain('https://developer.mozilla.org/en-US/docs/Web'), 94);
  assert.equal(SourceRanker.scoreDomain('https://docs.python.org/3/library/'), 94);
  assert.equal(SourceRanker.scoreDomain('https://id.wikipedia.org/wiki/Indonesia'), 88);
  assert.equal(SourceRanker.scoreDomain('https://antaranews.com/berita/12345'), 85);
  assert.equal(SourceRanker.scoreDomain('https://random-blog-123.com/post/abc'), 70);

  // URL normalization strips tracking queries
  const messyUrl = 'https://example.com/article?utm_source=twitter&utm_medium=social&utm_campaign=launch#comments';
  const cleanUrl = SourceRanker.normalizeUrl(messyUrl);
  assert.equal(cleanUrl, 'https://example.com/article');
});

test('SourceRanker: deduplication, ranking, and filtering', () => {
  const mockSources = [
    {
      title: 'Indonesia - Wikipedia bahasa Indonesia',
      url: 'https://id.wikipedia.org/wiki/Indonesia?utm_source=google',
      snippet: 'Indonesia adalah negara kepulauan di Asia Tenggara yang memiliki 38 provinsi.',
      source_name: 'Wikipedia',
    },
    {
      title: 'Indonesia - Wikipedia bahasa Indonesia', // Duplicate URL/title
      url: 'https://id.wikipedia.org/wiki/Indonesia',
      snippet: 'Indonesia adalah negara kepulauan di Asia Tenggara.',
      source_name: 'Wikipedia',
    },
    {
      title: 'Portal Resmi Pemerintah Indonesia',
      url: 'https://indonesia.go.id/profil',
      snippet: 'Informasi resmi mengenai profil negara, kementerian, dan lembaga pemerintah Republik Indonesia.',
      source_name: 'Indonesia.go.id',
    },
    {
      title: 'Koleksi Artikel Blog Bebas',
      url: 'https://generic-blog.xyz/post/1',
      snippet: 'Tulisan singkat tentang liburan di pulau dewata.',
      source_name: 'Generic Blog',
    },
  ];

  const ranked = SourceRanker.rankAndFilter(mockSources, {
    targetQueries: ['Indonesia profil', 'pemerintah'],
    maxSources: 3,
  });

  assert.equal(ranked.length, 3);
  // .go.id should rank first due to highest credibility + query relevance
  assert.equal(ranked[0].domain, 'indonesia.go.id');
  // Wikipedia should rank second
  assert.equal(ranked[1].domain, 'id.wikipedia.org');
  // Duplicate Wikipedia was removed
  assert.equal(ranked.filter(s => s.domain === 'id.wikipedia.org').length, 1);
});

test('ResearchCache: manages TTL and eviction accurately', async () => {
  const cache = new ResearchCache({ defaultTtlMs: 50 });

  cache.set('query:indonesia', { result: 'data1' });
  assert.equal(cache.has('query:indonesia'), true);
  assert.deepEqual(cache.get('query:indonesia'), { result: 'data1' });

  // Key normalization case-insensitivity
  assert.deepEqual(cache.get('QUERY:INDONESIA '), { result: 'data1' });

  // Wait for TTL expiration
  await new Promise(r => setTimeout(r, 70));
  assert.equal(cache.get('query:indonesia'), null);
  assert.equal(cache.has('query:indonesia'), false);
});

test('buildResearchContext: formats structured evidence for LLM prompt injection', () => {
  const sampleSources = [
    {
      title: 'Prabowo Subianto',
      url: 'https://id.wikipedia.org/wiki/Prabowo_Subianto',
      snippet: 'Prabowo Subianto Djojohadikusumo adalah Presiden Indonesia ke-8 yang mulai menjabat sejak Oktober 2024.',
      source_name: 'Wikipedia (ID)',
      domain: 'id.wikipedia.org',
    },
    {
      title: 'Pelantikan Presiden RI',
      url: 'https://indonesia.go.id/berita/pelantikan-presiden',
      snippet: 'Pengucapan sumpah jabatan Presiden Republik Indonesia.',
      source_name: 'indonesia.go.id',
      domain: 'indonesia.go.id',
    },
  ];

  const context = buildResearchContext(sampleSources, 'Siapa presiden Indonesia saat ini?');
  assert.ok(context.includes('HASIL RISET WEB REAL-TIME TERKINI'));
  assert.ok(context.includes('https://id.wikipedia.org/wiki/Prabowo_Subianto'));
  assert.ok(context.includes('https://indonesia.go.id/berita/pelantikan-presiden'));
  assert.ok(context.includes('INSTRUKSI PENGGUNAAN SUMBER'));
});

test('MultiWebSearchEngine: live research execution and caching', async () => {
  const engine = new MultiWebSearchEngine({ maxSources: 3 });
  const res = await engine.research('Indonesia');

  assert.equal(res.query, 'Indonesia');
  assert.ok(Array.isArray(res.planned_queries));
  assert.ok(Array.isArray(res.sources));
  assert.ok(res.sources.length > 0);
  assert.ok(res.formatted_context.length > 0);

  // Second identical call should return from cache
  const cachedRes = await engine.research('Indonesia');
  assert.equal(cachedRes.from_cache, true);
  assert.equal(cachedRes.sources.length, res.sources.length);
});

test('getDefaultWebSearchEngine: returns singleton instance', () => {
  const engine1 = getDefaultWebSearchEngine();
  const engine2 = getDefaultWebSearchEngine();
  assert.equal(engine1, engine2);
});
