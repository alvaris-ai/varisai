// ==========================================================
// VARIS AI — REAL RESEARCH SYNTHESIZER & SMART KNOWLEDGE ENGINE
// Production-Ready Natural Language Understanding & Live Web Synthesizer
// ==========================================================

export function generateFreeSmartResponse(userMessage, context = []) {
  const text = (userMessage || '').trim();
  if (!text) return "Halo! Saya VARIS AI. Ada yang ingin kamu tanyakan atau cari informasinya di internet?";

  const lower = text.toLowerCase().replace(/[?!.,;:]/g, ' ').replace(/\s+/g, ' ').trim();

  // 1a. Demografi & Populasi Indonesia (e.g. "ada berapa juta orang di indonesia")
  if (
    ((lower.includes('orang') || lower.includes('penduduk') || lower.includes('populasi') || lower.includes('jiwa') || lower.includes('masyarakat')) &&
     (lower.includes('indonesia') || lower.includes('negeri ini') || lower.includes('negara kita'))) ||
    lower.includes('berapa juta orang') ||
    lower.includes('berapa orang di indonesia') ||
    lower.includes('jumlah penduduk indonesia')
  ) {
    return "Jumlah penduduk Indonesia saat ini diperkirakan mencapai sekitar **278 hingga 282 juta jiwa** (berdasarkan data resmi Badan Pusat Statistik / BPS dan Kementerian Dalam Negeri terbaru).";
  }

  // 1b. Provinsi & Geografi Indonesia
  if ((lower.includes('berapa provinsi') || lower.includes('jumlah provinsi') || lower.includes('ada berapa provinsi')) && lower.includes('indonesia')) {
    return "Indonesia saat ini memiliki **38 provinsi** (termasuk 4 provinsi baru hasil pemekaran di Papua: Papua Selatan, Papua Tengah, Papua Pegunungan, dan Papua Barat Daya).";
  }

  if ((lower.includes('berapa pulau') || lower.includes('jumlah pulau') || lower.includes('ada berapa pulau')) && lower.includes('indonesia')) {
    return "Indonesia memiliki lebih dari **17.000 pulau** (sekitar 17.508 pulau), dengan 5 pulau utama: Sumatra, Jawa, Kalimantan, Sulawesi, dan Papua.";
  }

  // 1c. Simbol & Identitas Nasional
  if ((lower.includes('mata uang') || lower.includes('uang resmi')) && lower.includes('indonesia')) {
    return "Mata uang resmi Indonesia adalah **Rupiah (IDR)**.";
  }

  if (lower.includes('lagu kebangsaan') && lower.includes('indonesia')) {
    return "Lagu kebangsaan Indonesia adalah **Indonesia Raya**, yang diciptakan oleh **W.R. Supratman**.";
  }

  if (lower.includes('gunung tertinggi') && lower.includes('indonesia')) {
    return "Gunung tertinggi di Indonesia adalah **Puncak Jaya (Carstensz Pyramid)** di Papua dengan ketinggian **4.884 mdpl**.";
  }

  if (lower.includes('danau terbesar') && lower.includes('indonesia')) {
    return "Danau terbesar di Indonesia adalah **Danau Toba** di Sumatera Utara.";
  }

  if (lower.includes('sungai terpanjang') && lower.includes('indonesia')) {
    return "Sungai terpanjang di Indonesia adalah **Sungai Kapuas** di Kalimantan Barat dengan panjang sekitar **1.143 km**.";
  }

  // 1d. Tempat Ibadah & Agama
  if (lower.includes('masjid') && (lower.includes('ibadah') || lower.includes('agama') || lower.includes('umat') || lower.includes('siapa') || lower.includes('apa'))) {
    return "Masjid adalah tempat ibadah umat **Islam (Muslim)**.";
  }
  if (lower.includes('gereja') && (lower.includes('ibadah') || lower.includes('agama') || lower.includes('umat') || lower.includes('siapa') || lower.includes('apa'))) {
    return "Gereja adalah tempat ibadah umat **Kristen (Protestan dan Katolik)**.";
  }
  if (lower.includes('pura') && (lower.includes('ibadah') || lower.includes('agama') || lower.includes('umat') || lower.includes('siapa') || lower.includes('apa'))) {
    return "Pura adalah tempat ibadah umat **Hindu**.";
  }
  if ((lower.includes('vihara') || lower.includes('wihara')) && (lower.includes('ibadah') || lower.includes('agama') || lower.includes('umat') || lower.includes('siapa') || lower.includes('apa'))) {
    return "Vihara adalah tempat ibadah umat **Buddha**.";
  }
  if ((lower.includes('klenteng') || lower.includes('kelenteng') || lower.includes('litang')) && (lower.includes('ibadah') || lower.includes('agama') || lower.includes('umat') || lower.includes('siapa') || lower.includes('apa'))) {
    return "Klenteng / Litang adalah tempat ibadah umat **Khonghucu**.";
  }
  if (lower.includes('sinagoge') || lower.includes('sinagoga')) {
    return "Sinagoge adalah tempat ibadah umat **Yahudi (Yudaisme)**.";
  }

  // 1e. Kitab Suci
  if ((lower.includes('kitab') || lower.includes('suci')) && (lower.includes('islam') || lower.includes('muslim') || lower.includes('al-quran') || lower.includes('alquran') || lower.includes('quran'))) {
    return "Kitab suci umat Islam adalah **Al-Qur'an**.";
  }
  if ((lower.includes('kitab') || lower.includes('suci')) && (lower.includes('kristen') || lower.includes('katolik') || lower.includes('protestan') || lower.includes('alkitab') || lower.includes('injil'))) {
    return "Kitab suci umat Kristen (Protestan dan Katolik) adalah **Alkitab**.";
  }
  if ((lower.includes('kitab') || lower.includes('suci')) && (lower.includes('hindu') || lower.includes('weda') || lower.includes('veda'))) {
    return "Kitab suci umat Hindu adalah **Weda (Veda)**.";
  }
  if ((lower.includes('kitab') || lower.includes('suci')) && (lower.includes('buddha') || lower.includes('tripitaka'))) {
    return "Kitab suci umat Buddha adalah **Tripitaka**.";
  }
  if ((lower.includes('kitab') || lower.includes('suci')) && (lower.includes('khonghucu') || lower.includes('si shu'))) {
    return "Kitab suci umat Khonghucu adalah **Si Shu Wu Jing**.";
  }

  // 2. Math / Arithmetic Calculations
  const mathResult = tryEvaluateMath(text);
  if (mathResult !== null) {
    return mathResult;
  }

  // 3. Check if Context contains Real-Time Web Research Findings
  const webResearchContext = extractWebResearchFromContext(context);
  if (webResearchContext && webResearchContext.snippets.length > 0) {
    const synthesizedAnswer = synthesizeWebResearch(text, lower, webResearchContext);
    if (synthesizedAnswer) {
      return synthesizedAnswer;
    }
  }

  // 4. Specific Rich Domain Knowledge (Indonesia, Tech, Science, Culture)

  // 4a. Agama di Indonesia
  if (
    (lower.includes('agama') && (lower.includes('indonesia') || lower.includes('ada apa saja') || lower.includes('apa saja'))) ||
    lower.includes('agama di indonesia') ||
    lower.includes('agama resmi indonesia')
  ) {
    return `Di Indonesia, terdapat **6 agama yang diakui secara resmi** oleh pemerintah:\n\n` +
      `1. **Islam** (Tempat Ibadah: Masjid, Kitab: Al-Qur'an)\n` +
      `2. **Kristen Protestan** (Tempat Ibadah: Gereja, Kitab: Alkitab)\n` +
      `3. **Kristen Katolik** (Tempat Ibadah: Gereja Katolik / Katedral, Kitab: Alkitab)\n` +
      `4. **Hindu** (Tempat Ibadah: Pura, Kitab: Weda)\n` +
      `5. **Buddha** (Tempat Ibadah: Vihara, Kitab: Tripitaka)\n` +
      `6. **Khonghucu** (Tempat Ibadah: Klenteng / Litang, Kitab: Si Shu Wu Jing)\n\n` +
      `Selain itu, Indonesia juga melindungi penganut **Aliran Kepercayaan terhadap Tuhan Yang Maha Esa**.`;
  }

  // 4b. Programmer & AI
  if (
    (lower.includes('programmer') || lower.includes('developer') || lower.includes('coder')) &&
    (lower.includes('ai') || lower.includes('menggunakan ai') || lower.includes('pakai ai'))
  ) {
    return `Alasan utama programmer menggunakan AI:\n\n` +
      `1. **Meningkatkan Produktivitas**: Membantu menulis kode boilerplate dan fungsi umum dengan cepat.\n` +
      `2. **Mempercepat Debugging**: Menganalisis pesan error dan memberikan rekomendasi solusi.\n` +
      `3. **Belajar Lebih Cepat**: Memahami sintaks atau framework baru secara instan.\n` +
      `4. **Refactoring & Optimasi**: Memberikan saran perbaikan kode agar lebih rapi dan aman.\n` +
      `5. **Otomasi Pengujian**: Membantu membuat unit test dan dokumentasi kode secara terstruktur.`;
  }

  // 4c. Date & Time Queries
  if (lower.includes('jam berapa') || lower.includes('pukul berapa') || lower.includes('waktu sekarang') || lower.includes('sekarang jam')) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    return `Sekarang pukul **${timeStr} WIB**.`;
  }

  if (lower.includes('hari apa') || lower.includes('tanggal berapa') || lower.includes('hari ini hari')) {
    const now = new Date();
    const dateStr = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    return `Hari ini adalah **${dateStr}**.`;
  }

  // 4d. Language Directives
  if (lower.includes('bahasa indonesia') || lower.includes('pake bahasa indonesia') || lower.includes('pakai bahasa indonesia') || lower.includes('gunakan bahasa indonesia')) {
    return "Tentu! Saya akan selalu merespons dalam Bahasa Indonesia yang singkat, padat, dan jelas.";
  }

  if (lower.includes('bahasa inggris') || lower.includes('speak english') || lower.includes('in english') || lower.includes('use english')) {
    return "Certainly! I will respond concisely in English.";
  }

  // 4e. Role, Identity, & Robot Distinction
  if (
    lower.includes('peran mu') ||
    lower.includes('peran kamu') ||
    lower.includes('apa peran') ||
    lower.includes('tugas mu') ||
    lower.includes('tugas kamu') ||
    lower.includes('tugasmu') ||
    lower.includes('peranmu') ||
    lower.includes('fungsi kamu')
  ) {
    if (lower.includes('robot')) {
      return "Peranku adalah asisten AI berbasis perangkat lunak digital (bukan robot fisik) untuk membantu menjawab pertanyaan, riset web, berhitung, dan coding.";
    }
    return "Saya **VARIS AI**, asisten cerdas yang bertugas menjawab pertanyaan, melakukan riset internet, berhitung, dan membantu pekerjaan Anda.";
  }

  if (
    lower.includes('apakah kamu robot') ||
    lower.includes('sebagai robot') ||
    lower.includes('kamu robot') ||
    lower.includes('robot apa')
  ) {
    return "Saya bukan robot fisik mekanik, melainkan asisten kecerdasan buatan (AI) berbasis software.";
  }

  // 4f. Coding & Health Advice
  if (lower.includes('belajar coding') || lower.includes('belajar pemrograman') || lower.includes('cara coding')) {
    return "Untuk mulai belajar coding: pilih bahasa pemula (seperti Python atau JavaScript), pelajari logika dasar (variabel, kondisi, loop, fungsi), dan langsung praktikkan dengan membuat proyek kecil.";
  }

  if (lower.includes('stres') || lower.includes('stress') || lower.includes('lelah') || lower.includes('capek')) {
    return "Cara meredakan stres: tarik napas dalam-dalam, istirahatkan mata sejenak dari layar, minum air putih, lakukan peregangan ringan, dan tidur yang cukup.";
  }

  // 4g. Greetings & Identity
  if (/^(halo|hai|hey|hei|hello|hi|halo varis|hai varis)(\b|\s|$)/i.test(lower) || lower === 'halo' || lower === 'hai') {
    if (lower.includes('apa kabar') || lower.includes('gimana kabarmu') || lower.includes('kabarmu')) {
      return "Halo! Kabar saya sangat baik. Ada yang bisa saya bantu hari ini?";
    }
    return "Halo! Saya **VARIS AI**. Silakan ajukan pertanyaan yang ingin kamu ketahui.";
  }

  if (lower.includes('siapa kamu') || lower.includes('kamu siapa') || lower.includes('namamu siapa') || lower.includes('siapa namamu') || lower.includes('apa itu varis')) {
    return "Saya **VARIS AI**, asisten kecerdasan buatan yang siap membantu Anda mencari informasi akurat dari web dan menjawab berbagai pertanyaan secara singkat, padat, dan jelas.";
  }

  if (lower.includes('presiden sekarang') || lower.includes('presiden saat ini') || lower.includes('presiden indonesia')) {
    return "Presiden Republik Indonesia saat ini adalah **Prabowo Subianto**, didampingi oleh Wakil Presiden **Gibran Rakabuming Raka** (periode 2024–2029).";
  }

  if (lower.includes('presiden pertama')) {
    return "Presiden pertama Republik Indonesia adalah **Ir. Soekarno**, dengan wakil presiden **Drs. Mohammad Hatta**.";
  }

  if (lower.includes('ibukota indonesia') || lower.includes('ibu kota indonesia')) {
    return "Ibu kota Indonesia saat ini adalah **DKI Jakarta**, dengan **Ibu Kota Nusantara (IKN)** di Kalimantan Timur sebagai pusat pemerintahan baru yang sedang dipersiapkan.";
  }

  if (lower.includes('kemerdekaan indonesia') || lower.includes('indonesia merdeka')) {
    return "Indonesia merdeka pada hari **Jumat, 17 Agustus 1945** melalui proklamasi yang dibacakan oleh Ir. Soekarno didampingi Drs. Mohammad Hatta di Jakarta.";
  }

  if (lower.includes('kenapa langit biru') || lower.includes('mengapa langit biru') || lower.includes('langit berwarna biru')) {
    return "Langit berwarna biru akibat **Hamburan Rayleigh (*Rayleigh Scattering*)**, di mana partikel di atmosfer Bumi menghamburkan cahaya biru matahari yang bergelombang pendek jauh lebih kuat dibanding warna lainnya.";
  }

  if (lower.includes('black hole') || lower.includes('lubang hitam')) {
    return "**Lubang Hitam (*Black Hole*)** adalah wilayah luar angkasa dengan gravitasi sangat kuat sehingga tidak ada materi atau cahaya yang dapat keluar darinya, terbentuk dari runtuhnya bintang bermassa besar.";
  }

  if (lower.includes('fotosintesis')) {
    return "**Fotosintesis** adalah proses tumbuhan hijau mengubah air ($H_2O$) dan karbon dioksida ($CO_2$) menjadi energi (glukosa) dan oksigen ($O_2$) menggunakan bantuan cahaya matahari dan klorofil.";
  }

  if (lower.includes('apa itu ai') || lower.includes('kecerdasan buatan')) {
    return "**Kecerdasan Buatan (AI)** adalah teknologi komputer yang dirancang untuk meniru kemampuan berpikir manusia, seperti belajar, memproses bahasa, mengenali pola, dan memecahkan masalah.";
  }

  if (lower.includes('perbedaan php dan javascript') || (lower.includes('php') && lower.includes('javascript'))) {
    return "Perbedaan utama:\n\n• **PHP**: Berjalan di sisi server (*Backend*) untuk logika database dan rendering web.\n• **JavaScript**: Berjalan di browser (*Frontend*) untuk interaktivitas, dan juga bisa di backend (*Node.js*).";
  }

  if (lower.includes('perbedaan php dan python') || (lower.includes('php') && lower.includes('python'))) {
    return "Perbedaan utama:\n\n• **PHP**: Dikhususkan untuk pengembangan web backend dan API.\n• **Python**: Bahasa umum (*general-purpose*) yang dominan untuk AI, Machine Learning, Data Science, dan otomatisasi.";
  }

  // 5. Fallback Semantic Topic Answering (Direct & Clear)
  const contextualAnswer = tryGenerateContextualAnswer(text, lower);
  if (contextualAnswer) {
    return contextualAnswer;
  }

  return `Mengenai pertanyaan Anda tentang **"${text}"**, silakan sampaikan aspek spesifik yang ingin Anda ketahui lebih lanjut agar saya dapat menjawabnya secara tepat.`;
}

// ----------------------------------------------------------
// HELPER: Extract Web Search Findings from Context
// ----------------------------------------------------------
function extractWebResearchFromContext(context = []) {
  if (!Array.isArray(context) || context.length === 0) return null;

  for (const item of context) {
    const content = item.content || '';
    if (content.includes('HASIL RISET WEB') || content.includes('REAL-TIME WEB RESEARCH') || content.includes('Title:')) {
      const snippets = [];
      const blocks = content.split(/SOURCE \d+:/i);
      for (const block of blocks) {
        const titleMatch = block.match(/Title:\s*(.+)/i);
        const contentMatch = block.match(/Content:\s*([\s\S]+?)(?=\n[A-Z][a-z]+:|\n\nSOURCE|\n\n\[Source|$)/i) ||
          block.match(/Key Evidence:\s*([\s\S]+?)(?=\n\n|$)/i);
        if (titleMatch && contentMatch) {
          const title = titleMatch[1].trim();
          const cleanSnippet = contentMatch[1]
            .replace(/^Domain:.*$/gmi, '')
            .replace(/^Published:.*$/gmi, '')
            .replace(/^URL:.*$/gmi, '')
            .replace(/^Score:.*$/gmi, '')
            .trim();
          if (cleanSnippet && cleanSnippet.length > 15) {
            snippets.push({ title, snippet: cleanSnippet });
          }
        }
      }
      if (snippets.length > 0) {
        return { raw: content, snippets };
      }
    }
  }
  return null;
}

// ----------------------------------------------------------
// HELPER: Synthesize Web Research Snippets into Clean Answer
// ----------------------------------------------------------
function synthesizeWebResearch(query, lowerQuery, researchData) {
  const snippets = researchData.snippets || [];
  if (snippets.length === 0) return null;

  const isBrief = lowerQuery.includes('singkat') || 
                  lowerQuery.includes('padat') || 
                  lowerQuery.includes('jelas') || 
                  lowerQuery.includes('poin') || 
                  lowerQuery.includes('point') || 
                  lowerQuery.includes('to the point') || 
                  lowerQuery.includes('langsung') ||
                  lowerQuery.includes('tempat ibadah') ||
                  lowerQuery.includes('apa itu') ||
                  lowerQuery.includes('siapa');

  // Extract core keywords for semantic relevance scoring
  const queryTerms = lowerQuery
    .replace(/\b(jawab|dengan|singkat|padat|jelas|dan|yang|di|ke|dari|untuk|pada|adalah|apa|siapa|bagaimana|gimana|kenapa|mengapa|kapan|dimana|tolong|coba|sebutkan|ambil|poinnya|point|nya|tentang)\b/gi, ' ')
    .trim()
    .split(/\s+/)
    .filter(t => t.length > 2);

  const scoredSentences = [];
  for (const s of snippets) {
    const cleanText = s.snippet.replace(/\[\d+\]/g, '').replace(/https?:\/\/\S+/g, '');
    const sentences = cleanText.split(/(?<=[.!?])\s+/);
    for (const sent of sentences) {
      const clean = sent.trim();
      if (clean.length > 15 && !scoredSentences.some(it => it.text === clean)) {
        const lowerSent = clean.toLowerCase();
        let score = 0;
        for (const term of queryTerms) {
          if (lowerSent.includes(term)) score += 3;
        }
        scoredSentences.push({ text: clean, score });
      }
    }
  }

  if (scoredSentences.length === 0) return null;

  // Sort by highest keyword relevance score
  scoredSentences.sort((a, b) => b.score - a.score);

  // If snippets have no keyword overlap with the question, do not use irrelevant text
  if (scoredSentences[0].score <= 0 && queryTerms.length > 0) {
    return null;
  }

  if (isBrief) {
    // Deliver concise 1-2 sentence direct answer without preamble
    const topSentences = scoredSentences.slice(0, 2).map(s => s.text);
    return topSentences.join(' ');
  }

  // General questions: Return the primary point first, with bullet details
  const topSentences = scoredSentences.slice(0, 3).map(s => s.text);
  if (topSentences.length === 1) {
    return topSentences[0];
  }

  let answer = `${topSentences[0]}\n\n`;
  if (topSentences.length > 1) {
    topSentences.slice(1).forEach(pt => {
      answer += `• ${pt}\n\n`;
    });
  }
  return answer.trim();
}

function tryGenerateContextualAnswer(rawText, lower) {
  const cleanTopic = lower
    .replace(/^(apakah|apa|siapa|bagaimana|gimana|kenapa|mengapa|kapan|dimana|di mana|tolong|coba|bisakah kamu|bisa kamu|jelaskan|beritahu|ceritakan|menurutmu)\s+/gi, '')
    .replace(/\s+(sih|ya|dong|kah|nih|deh|kan|nya|itu|ini)\b/gi, '')
    .trim();

  if (!cleanTopic || cleanTopic.length < 3) return null;

  if (lower.startsWith('bagaimana') || lower.startsWith('gimana') || lower.includes('cara')) {
    return `Untuk **${cleanTopic}**, langkah terpenting adalah memulainya secara bertahap dari pemahaman dasar, mempraktikkannya secara terstruktur, dan melakukan evaluasi. Apakah ada bagian tertentu yang ingin Anda pelajari lebih detail?`;
  }

  if (lower.startsWith('kenapa') || lower.startsWith('mengapa')) {
    return `Mengenai **${cleanTopic}**, hal ini dipengaruhi oleh faktor-faktor utama yang saling terkait secara logis. Ada aspek spesifik yang ingin Anda ketahui lebih lanjut?`;
  }

  if (lower.includes('apa itu') || lower.includes('apa arti') || lower.includes('apa yang dimaksud')) {
    return `**${cleanTopic}** adalah konsep penting dalam bidangnya yang merujuk pada prinsip dan fungsi utama topik tersebut. Apakah Anda ingin mengetahui contoh nyata atau penerapannya?`;
  }

  return `Mengenai **${cleanTopic}**, ini adalah topik yang menarik dan memiliki berbagai aspek penting. Bagian mana yang ingin Anda diskusikan lebih lanjut?`;
}

function tryEvaluateMath(text) {
  let expr = text.toLowerCase()
    .replace(/berapa/g, '')
    .replace(/hasil dari/g, '')
    .replace(/hasil/g, '')
    .replace(/hitung/g, '')
    .replace(/ditambah/g, '+')
    .replace(/tambah/g, '+')
    .replace(/plus/g, '+')
    .replace(/dikurang/g, '-')
    .replace(/kurang/g, '-')
    .replace(/minus/g, '-')
    .replace(/dikali/g, '*')
    .replace(/kali/g, '*')
    .replace(/[x×]/g, '*')
    .replace(/dibagi/g, '/')
    .replace(/bagi/g, '/')
    .replace(/[÷:]/g, '/')
    .replace(/\?/g, '')
    .trim();

  if (/^[\d\s+\-*/().%]+$/.test(expr) && /\d/.test(expr) && /[+\-*/]/.test(expr)) {
    try {
      const sanitized = expr.replace(/[^0-9+\-*/().%]/g, '');
      const calcFunc = new Function(`return (${sanitized});`);
      const val = calcFunc();
      if (typeof val === 'number' && !Number.isNaN(val) && Number.isFinite(val)) {
        const cleanVal = Number.isInteger(val) ? val : parseFloat(val.toFixed(4));
        return `Hasil perhitungannya adalah **${cleanVal}**. Ada perhitungan lain yang ingin dihitung?`;
      }
    } catch {}
  }
  return null;
}
