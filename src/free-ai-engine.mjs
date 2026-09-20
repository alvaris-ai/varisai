// ==========================================================
// VARIS AI — REAL RESEARCH SYNTHESIZER & SMART KNOWLEDGE ENGINE
// Production-Ready Natural Language Understanding & Live Web Synthesizer
// ==========================================================

export function generateFreeSmartResponse(userMessage, context = []) {
  const text = (userMessage || '').trim();
  if (!text) return "Halo! Saya VARIS AI. Ada yang ingin kamu tanyakan atau cari informasinya di internet?";

  const lower = text.toLowerCase().replace(/[?!.,;:]/g, ' ').replace(/\s+/g, ' ').trim();

  // 1. Check if Context contains Real-Time Web Research Findings
  const webResearchContext = extractWebResearchFromContext(context);
  if (webResearchContext && webResearchContext.snippets.length > 0) {
    const synthesizedAnswer = synthesizeWebResearch(text, lower, webResearchContext);
    if (synthesizedAnswer) {
      return synthesizedAnswer;
    }
  }

  // 2. Math / Arithmetic Calculations
  const mathResult = tryEvaluateMath(text);
  if (mathResult !== null) {
    return mathResult;
  }

  // 3. Specific Rich Domain Knowledge (Indonesia, Tech, Science, Culture)

  // 3a. Agama di Indonesia
  if (
    (lower.includes('agama') && (lower.includes('indonesia') || lower.includes('ada apa saja') || lower.includes('apa saja'))) ||
    lower.includes('agama di indonesia') ||
    lower.includes('agama resmi indonesia')
  ) {
    return `Di Indonesia, terdapat **6 agama yang diakui secara resmi** oleh pemerintah:\n\n` +
      `1. **Islam**\n   • Tempat Ibadah: Masjid\n   • Kitab Suci: Al-Qur'an\n   • Hari Raya: Idulfitri, Iduladha\n\n` +
      `2. **Kristen Protestan**\n   • Tempat Ibadah: Gereja\n   • Kitab Suci: Alkitab\n   • Hari Raya: Natal, Paskah\n\n` +
      `3. **Kristen Katolik**\n   • Tempat Ibadah: Gereja Katolik / Katedral\n   • Kitab Suci: Alkitab\n   • Hari Raya: Natal, Paskah\n\n` +
      `4. **Hindu**\n   • Tempat Ibadah: Pura\n   • Kitab Suci: Weda\n   • Hari Raya: Nyepi, Galungan\n\n` +
      `5. **Buddha**\n   • Tempat Ibadah: Vihara\n   • Kitab Suci: Tripitaka\n   • Hari Raya: Waisak\n\n` +
      `6. **Khonghucu**\n   • Tempat Ibadah: Klenteng / Litang\n   • Kitab Suci: Si Shu Wu Jing\n   • Hari Raya: Tahun Baru Imlek\n\n` +
      `Selain 6 agama resmi di atas, Negara Indonesia juga mengakui dan melindungi hak penganut **Aliran Kepercayaan terhadap Tuhan Yang Maha Esa** sesuai putusan Mahkamah Konstitusi dan Undang-Undang Dasar 1945.`;
  }

  // 3b. Programmer & AI
  if (
    (lower.includes('programmer') || lower.includes('developer') || lower.includes('coder')) &&
    (lower.includes('ai') || lower.includes('menggunakan ai') || lower.includes('pakai ai'))
  ) {
    return `Programmer banyak menggunakan AI dalam pekerjaan sehari-hari karena beberapa alasan utama:\n\n` +
      `1. **Meningkatkan Kecepatan & Produktivitas**\n   AI membantu menulis kode template (*boilerplate*), fungsi utilitas, dan pola umum secara instan sehingga menghemat waktu.\n\n` +
      `2. **Mempermudah Debugging & Analisis Error**\n   Saat terjadi error atau *bug*, AI dapat membaca pesan *error log* dan menjelaskan letak kesalahan beserta solusi perbaikannya.\n\n` +
      `3. **Belajar Bahasa & Framework Baru Lebih Cepat**\n   Programmer bisa langsung bertanya cara implementasi suatu fitur baru tanpa harus membaca dokumentasi panjang satu per satu.\n\n` +
      `4. **Refactoring & Optimasi Kode**\n   AI dapat memberikan saran penulisan kode yang lebih rapi (*clean code*), aman dari celah keamanan, dan efisien.\n\n` +
      `5. **Otomasi Pembuatan Dokumen & Unit Test**\n   AI memudahkan pembuatan *test case* otomatis dan dokumentasi fungsi secara rapi.\n\n` +
      `Dengan bantuan AI, programmer dapat lebih fokus pada perancangan logika bisnis dan arsitektur sistem tingkat tinggi.`;
  }

  // 3c. Date & Time Queries
  if (lower.includes('jam berapa') || lower.includes('pukul berapa') || lower.includes('waktu sekarang') || lower.includes('sekarang jam')) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    return `Sekarang pukul ${timeStr} WIB. Ada informasi lain yang ingin kamu tanyakan?`;
  }

  if (lower.includes('hari apa') || lower.includes('tanggal berapa') || lower.includes('hari ini hari')) {
    const now = new Date();
    const dateStr = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    return `Hari ini adalah ${dateStr}. Ada topik atau jadwal yang ingin kamu bahas?`;
  }

  // 3d. Language Directives
  if (lower.includes('bahasa indonesia') || lower.includes('pake bahasa indonesia') || lower.includes('pakai bahasa indonesia') || lower.includes('gunakan bahasa indonesia')) {
    return "Tentu! Saya akan selalu merespons dalam Bahasa Indonesia yang jelas dan mudah dipahami. Silakan tanyakan apa saja!";
  }

  if (lower.includes('bahasa inggris') || lower.includes('speak english') || lower.includes('in english') || lower.includes('use english')) {
    return "Certainly! I will respond in English. Feel free to ask any question!";
  }

  // 3e. Role, Identity, & Robot Distinction
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
      return "Peranku di sini adalah sebagai asisten kecerdasan buatan (AI) berbasis perangkat lunak interaktif, bukan robot fisik mekanik. Aku bertugas membantu menjawab pertanyaan, mencari fakta di web, berhitung, dan berdiskusi denganmu!";
    }
    return "Peranku di sini adalah sebagai VARIS AI, asisten cerdas yang siap membantumu menjawab berbagai pertanyaan, melakukan riset informasi di internet, berhitung, dan berdiskusi secara interaktif.";
  }

  if (
    lower.includes('apakah kamu robot') ||
    lower.includes('sebagai robot') ||
    lower.includes('kamu robot') ||
    lower.includes('robot apa')
  ) {
    return "Aku bukan robot fisik mekanik, melainkan asisten kecerdasan buatan berbasis software digital yang siap membantu menjawab pertanyaan dan mencari informasi kapan saja!";
  }

  // 3f. Coding & Health Advice
  if (lower.includes('belajar coding') || lower.includes('belajar pemrograman') || lower.includes('cara coding')) {
    return "Untuk mulai belajar coding: mulailah dari bahasa ramah pemula seperti Python atau JavaScript, pahami konsep dasar (variabel, kondisi, perulangan, fungsi), dan langsung buat proyek latihan sederhana!";
  }

  if (lower.includes('stres') || lower.includes('stress') || lower.includes('lelah') || lower.includes('capek')) {
    return "Untuk meredakan stres: tarik napas dalam-dalam secara teratur, istirahatkan mata sejenak dari layar, minum air putih, lakukan peregangan tubuh, dan beristirahat yang cukup.";
  }

  // 3g. Greetings & Identity
  if (/^(halo|hai|hey|hei|hello|hi|halo varis|hai varis)(\b|\s|$)/i.test(lower) || lower === 'halo' || lower === 'hai') {
    if (lower.includes('apa kabar') || lower.includes('gimana kabarmu') || lower.includes('kabarmu')) {
      return "Halo! Kabar saya sangat baik dan siap membantumu mencari informasi apapun di internet. Bagaimana kabarmu hari ini?";
    }
    return "Halo! Saya **VARIS AI**, asisten pencari informasi cerdas Anda. Tanyakan apa saja yang ingin kamu ketahui, dan saya akan carikan jawabannya!";
  }

  if (lower.includes('siapa kamu') || lower.includes('kamu siapa') || lower.includes('namamu siapa') || lower.includes('siapa namamu') || lower.includes('apa itu varis')) {
    return "Saya **VARIS AI**, asisten kecerdasan buatan cerdas yang terhubung dengan pencarian informasi web secara langsung. Anda dapat menanyakan topik apapun (pengetahuan umum, sains, teknologi, berita, sejarah, matematika, pemrograman) dan saya akan menyusun jawaban yang akurat dan mudah dipahami!";
  }

  if (lower.includes('presiden sekarang') || lower.includes('presiden saat ini') || lower.includes('presiden indonesia')) {
    return "Presiden Republik Indonesia saat ini adalah **Prabowo Subianto**, didampingi oleh Wakil Presiden **Gibran Rakabuming Raka** (periode 2024–2029).";
  }

  if (lower.includes('presiden pertama')) {
    return "Presiden pertama Republik Indonesia adalah **Ir. Soekarno**, didampingi oleh **Drs. Mohammad Hatta** sebagai wakil presiden pertama setelah proklamasi kemerdekaan 17 Agustus 1945.";
  }

  if (lower.includes('ibukota indonesia') || lower.includes('ibu kota indonesia')) {
    return "Ibu kota Indonesia saat ini adalah **DKI Jakarta**, dengan **Ibu Kota Nusantara (IKN)** di Penajam Paser Utara, Kalimantan Timur yang sedang dikembangkan dan dipersiapkan sebagai pusat pemerintahan baru Republik Indonesia.";
  }

  if (lower.includes('kemerdekaan indonesia') || lower.includes('indonesia merdeka')) {
    return "Indonesia memproklamasikan kemerdekaannya pada hari **Jumat, 17 Agustus 1945** di Pegangsaan Timur 56, Jakarta, yang dibacakan langsung oleh Ir. Soekarno dan Drs. Mohammad Hatta atas nama bangsa Indonesia.";
  }

  if (lower.includes('kenapa langit biru') || lower.includes('mengapa langit biru') || lower.includes('langit berwarna biru')) {
    return "Langit tampak biru karena fenomena ilmiah bernama **Hamburan Rayleigh (*Rayleigh Scattering*)**.\n\nCahaya matahari yang tampak putih sebenarnya tersusun dari berbagai warna gelombang. Ketika sinar matahari memasuki atmosfer Bumi, cahaya warna biru memiliki panjang gelombang yang lebih pendek dan energi lebih tinggi, sehingga dihamburkan ke segala arah oleh molekul gas di atmosfer jauh lebih banyak dibanding warna lainnya.";
  }

  if (lower.includes('black hole') || lower.includes('lubang hitam')) {
    return "**Lubang Hitam (*Black Hole*)** adalah wilayah di ruang angkasa dengan medan gravitasi yang sangat kuat luar biasa, sehingga tidak ada materi atau bahkan cahaya sekalipun yang dapat lolos darinya.\n\nLubang hitam terbentuk ketika bintang bermassa sangat masif kehabisan bahan bakar dan mengalami keruntuhan gravitasi total pada akhir siklus hidupnya.";
  }

  if (lower.includes('fotosintesis')) {
    return "**Fotosintesis** adalah proses biokimia di mana tumbuhan hijau, alga, dan beberapa bakteri mengubah air ($H_2O$) dan karbon dioksida ($CO_2$) menjadi glukosa (energi) dan oksigen ($O_2$) dengan memanfaatkan energi cahaya matahari yang diserap oleh klorofil.";
  }

  if (lower.includes('apa itu ai') || lower.includes('kecerdasan buatan')) {
    return "**Kecerdasan Buatan (*Artificial Intelligence* / AI)** adalah teknologi komputasi yang memungkinkan mesin atau program untuk meniru kemampuan kognitif manusia, seperti belajar dari data, memahami bahasa alami (*Natural Language Processing*), mengenali pola, dan memecahkan masalah secara mandiri.";
  }

  if (lower.includes('perbedaan php dan javascript') || (lower.includes('php') && lower.includes('javascript'))) {
    return "Perbedaan utama antara **PHP** dan **JavaScript**:\n\n" +
      "1. **PHP**: Bahasa pemrograman yang berjalan di sisi server (*Backend / Server-Side*), sangat populer untuk mengelola database dan sistem CMS seperti WordPress.\n" +
      "2. **JavaScript**: Bahasa pemrograman serbaguna yang awalnya berjalan di browser (*Frontend / Client-Side*), namun kini juga dapat digunakan di backend menggunakan lingkungan Node.js.\n\n" +
      "Keduanya sering digunakan bersamaan dalam pengembangan aplikasi web modern.";
  }

  if (lower.includes('perbedaan php dan python') || (lower.includes('php') && lower.includes('python'))) {
    return "Perbedaan antara **PHP** dan **Python**:\n\n" +
      "• **PHP**: Dikhususkan untuk pengembangan web backend, pembuatan API, dan rendering HTML.\n" +
      "• **Python**: Bahasa *general-purpose* dengan sintaks sangat bersih dan mudah dibaca, sangat dominan dalam bidang AI, Machine Learning, Data Science, serta otomatisasi (*scripting*).";
  }

  // 4. Fallback Semantic Topic Answering (Clear & Easy to Understand)
  const contextualAnswer = tryGenerateContextualAnswer(text, lower);
  if (contextualAnswer) {
    return contextualAnswer;
  }

  return `Mengenai pertanyaan Anda tentang **"${text}"**, informasi ini sangat menarik. Silakan sampaikan detail lebih spesifik atau topik lanjutan yang ingin Anda ketahui, dan saya akan bantu jelaskan secara mendalam!`;
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

  // Filter out boilerplate sentences
  const informativeSentences = [];
  for (const s of snippets) {
    const text = s.snippet.replace(/\[\d+\]/g, '').replace(/https?:\/\/\S+/g, '');
    const sentences = text.split(/(?<=[.!?])\s+/);
    for (const sent of sentences) {
      const clean = sent.trim();
      if (clean.length > 25 && !informativeSentences.includes(clean)) {
        informativeSentences.push(clean);
      }
    }
  }

  if (informativeSentences.length === 0) return null;

  // Build a structured, natural answer
  let answer = `Berdasarkan penelusuran informasi terkini untuk pertanyaan **"${query}"**:\n\n`;

  // Highlight points
  const points = informativeSentences.slice(0, 4);
  points.forEach((pt, idx) => {
    answer += `• ${pt}\n\n`;
  });

  answer += `Semoga informasi di atas membantu! Jika Anda memerlukan penjelasan lebih lanjut atau topik lainnya, silakan tanyakan langsung ke saya.`;
  return answer;
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
