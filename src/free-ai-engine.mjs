// ==========================================================
// VARIS FREE SMART CONVERSATIONAL ENGINE
// 100% Free, zero-quota fallback for Indonesian Voice Interaction
// ==========================================================

export function generateFreeSmartResponse(userMessage) {
  const text = (userMessage || '').trim();
  if (!text) return "Aku di sini mendengarkanmu. Ada yang ingin kamu bicarakan atau tanyakan?";

  const lower = text.toLowerCase().replace(/[?!.,;:]/g, ' ').replace(/\s+/g, ' ').trim();

  // 1. Math / Calculations
  const mathResult = tryEvaluateMath(text);
  if (mathResult !== null) {
    return mathResult;
  }

  // 2. Date & Time Queries
  if (lower.includes('jam berapa') || lower.includes('pukul berapa') || lower.includes('waktu sekarang') || lower.includes('sekarang jam')) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    return `Sekarang pukul ${timeStr} WIB. Ada yang perlu kujadwalkan untukmu?`;
  }

  if (lower.includes('hari apa') || lower.includes('tanggal berapa') || lower.includes('hari ini hari')) {
    const now = new Date();
    const dateStr = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    return `Hari ini adalah ${dateStr}. Ada kegiatan penting hari ini?`;
  }

  // 3. Greetings & Pleasantries
  if (/^(halo|hai|hey|hei|hello|hi|halo varis|hai varis)(\b|\s|$)/i.test(lower) || lower === 'halo' || lower === 'hai') {
    if (lower.includes('apa kabar') || lower.includes('gimana kabarmu') || lower.includes('kabarmu')) {
      return "Halo! Kabarku sangat baik dan siap membantumu. Bagaimana dengan kabarmu hari ini?";
    }
    const greetings = [
      "Halo! Senang bisa mengobrol denganmu. Ada yang bisa kubantu hari ini?",
      "Hai! Aku di sini mendengarkanmu. Ceritakan, apa yang ingin kita bahas?",
      "Halo! Aku VARIS, siap membantumu. Mau tanya atau bahas apa hari ini?"
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  if (lower.includes('apa kabar') || lower.includes('gimana kabarmu') || lower.includes('bagaimana kabar')) {
    return "Kabarku luar biasa baik! Semoga harimu juga menyenangkan ya. Sedang ada hal seru yang dikerjakan?";
  }

  // 4. Identity, Role & Nature (Direct User Queries)
  if (
    lower.includes('peran mu disini') ||
    lower.includes('peran kamu') ||
    lower.includes('apa peran mu') ||
    lower.includes('tugas mu disini') ||
    lower.includes('tugasmu') ||
    lower.includes('fungsi kamu') ||
    lower.includes('peranmu')
  ) {
    return "Peranku di sini adalah sebagai VARIS, asisten AI pribadi yang siap membantumu menjawab pertanyaan, mencari informasi, berhitung, dan berdiskusi lewat suara secara langsung!";
  }

  if (
    lower.includes('apakah kamu robot') ||
    lower.includes('sebagai robot') ||
    lower.includes('apakah robot') ||
    lower.includes('kamu robot') ||
    lower.includes('robot apa')
  ) {
    return "Aku bukan robot fisik mekanik, melainkan asisten kecerdasan buatan berbasis perangkat lunak suara. Jadi aku beroperasi secara digital seperti teman diskusi cerdas yang siap membantumu kapan saja!";
  }

  if (
    lower.includes('siapa kamu') ||
    lower.includes('kamu siapa') ||
    lower.includes('namamu siapa') ||
    lower.includes('siapa namamu')
  ) {
    return "Aku VARIS, asisten kecerdasan buatan interaktif yang dirancang untuk percakapan suara secara langsung layaknya teman bicara!";
  }

  if (
    lower.includes('siapa yang buat kamu') ||
    lower.includes('siapa penciptamu') ||
    lower.includes('siapa pembuatmu') ||
    lower.includes('dibuat oleh siapa')
  ) {
    return "Aku dikembangkan sebagai sistem kecerdasan buatan bernama VARIS, dirancang untuk percakapan lisan dan teks yang alami, responsif, dan interaktif!";
  }

  if (
    lower.includes('bisa apa') ||
    lower.includes('apa yang bisa kamu lakukan') ||
    lower.includes('fiturmu apa') ||
    lower.includes('kelebihanmu') ||
    lower.includes('kemampuanmu')
  ) {
    return "Aku bisa membantumu menjawab berbagai pertanyaan, menjelaskan konsep ilmu pengetahuan, berhitung matematika, mengecek tanggal dan waktu, memberikan saran praktis, serta mengobrol santai!";
  }

  // 5. Artificial Intelligence & Technology Concepts
  if (lower.includes('beda ai dan robot') || lower.includes('perbedaan ai dan robot') || lower.includes('ai vs robot')) {
    return "Perbedaannya: AI adalah sistem kecerdasan atau otaknya yang berbasis perangkat lunak, sedangkan robot adalah wujud fisik mekaniknya. Sistem cerdas seperti aku bisa bekerja tanpa butuh badan robot fisik!";
  }

  if (lower.includes('apa itu ai') || lower.includes('apa itu kecerdasan buatan') || lower.includes('arti ai')) {
    return "Kecerdasan buatan atau AI adalah teknologi komputer yang meniru kemampuan berpikir manusia, seperti belajar dari pengalaman, memahami bahasa alami, dan memecahkan masalah secara cerdas.";
  }

  if (lower.includes('machine learning') || lower.includes('pembelajaran mesin')) {
    return "Machine learning adalah cabang AI di mana sistem belajar membuat prediksi atau keputusan berdasarkan pola data tanpa harus diprogram secara kaku satu per satu.";
  }

  if (lower.includes('belajar coding') || lower.includes('belajar pemrograman') || lower.includes('cara coding') || lower.includes('cara ngoding')) {
    return "Untuk mulai belajar coding, kamu bisa mulai dengan bahasa ramah pemula seperti Python atau JavaScript. Kuasai logika dasar seperti variabel dan kondisi, lalu langsung praktikkan membuat proyek kecil!";
  }

  if (lower.includes('bahasa pemrograman')) {
    return "Bahasa pemrograman populer saat ini antara lain Python untuk kecerdasan buatan dan data, JavaScript untuk web, serta C++, Java, dan Go untuk sistem performa tinggi.";
  }

  if (lower.includes('apa itu internet') || lower.includes('cara kerja internet')) {
    return "Internet adalah jaringan global yang menghubungkan miliaran komputer di seluruh dunia, memungkinkan pertukaran data dan komunikasi secara instan melalui protokol standar.";
  }

  if (lower.includes('cloud computing') || lower.includes('apa itu cloud')) {
    return "Cloud computing adalah penyimpanan dan pemrosesan data di server internet jarak jauh, sehingga kamu bisa mengakses file dan aplikasi dari perangkat mana saja.";
  }

  // 6. Science, Nature & Astronomy
  if (lower.includes('kenapa langit biru') || lower.includes('mengapa langit biru') || lower.includes('langit berwarna biru')) {
    return "Langit tampak biru karena fenomena Hamburan Rayleigh di atmosfer Bumi, di mana cahaya biru matahari yang bergelombang pendek dihamburkan ke segala arah lebih banyak daripada warna lainnya.";
  }

  if (lower.includes('fotosintesis')) {
    return "Fotosintesis adalah proses tumbuhan hijau mengubah air dan karbon dioksida menjadi glukosa dan oksigen dengan memanfaatkan energi cahaya matahari.";
  }

  if (lower.includes('gravitasi')) {
    return "Gravitasi adalah gaya tarik alami antara massa di alam semesta. Gravitasi Bumi menarik semua benda ke arah pusatnya sehingga kita tetap berpijak dan tidak melayang.";
  }

  if (lower.includes('tata surya') || lower.includes('planet')) {
    return "Tata surya kita berpusat pada Matahari dengan delapan planet: Merkurius, Venus, Bumi, Mars, Jupiter, Saturnus, Uranus, dan Neptunus.";
  }

  // 7. Indonesian History & Geography
  if (lower.includes('presiden pertama')) {
    return "Presiden pertama Republik Indonesia adalah Ir. Soekarno, didampingi oleh Drs. Mohammad Hatta sebagai wakil presiden pertama setelah proklamasi kemerdekaan 17 Agustus 1945.";
  }

  if (lower.includes('presiden sekarang') || lower.includes('presiden saat ini') || lower.includes('presiden indonesia')) {
    return "Presiden Republik Indonesia saat ini adalah Prabowo Subianto, didampingi Wakil Presiden Gibran Rakabuming Raka.";
  }

  if (lower.includes('ibukota indonesia') || lower.includes('ibu kota indonesia')) {
    return "Ibu kota Indonesia saat ini adalah DKI Jakarta, dengan Ibu Kota Nusantara atau IKN di Kalimantan Timur yang sedang dipersiapkan sebagai pusat pemerintahan baru.";
  }

  if (lower.includes('merdeka') || lower.includes('kemerdekaan indonesia')) {
    return "Indonesia memproklamasikan kemerdekaannya pada hari Jumat, 17 Agustus 1945 di Jakarta oleh Ir. Soekarno dan Mohammad Hatta atas nama bangsa Indonesia.";
  }

  // 8. Health, Lifestyle & Practical Advice
  if (lower.includes('stres') || lower.includes('lelah') || lower.includes('capek') || lower.includes('pusing')) {
    return "Untuk meredakan stres dan lelah: tarik napas dalam-dalam, istirahatkan mata sejenak dari layar, minum air putih, lakukan peregangan ringan, atau dengarkan musik yang menenangkan!";
  }

  if (lower.includes('tidur nyenyak') || lower.includes('insomnia') || lower.includes('susah tidur')) {
    return "Agar tidur lebih nyenyak: redupkan lampu kamar, jauhkan gadget 30 menit sebelum tidur, jaga suhu kamar tetap sejuk, dan hindari kafein menjelang malam hari.";
  }

  if (lower.includes('nasi goreng') || lower.includes('resep')) {
    return "Untuk nasi goreng lezat: tumis bawang merah, bawang putih, dan cabai halus sampai harum. Masukkan telur lalu orak-arik, masukkan nasi dingin, beri kecap manis, garam, dan lada, lalu aduk cepat di api besar!";
  }

  // 9. Gratitude & Compliments
  if (lower.includes('terima kasih') || lower.includes('makasih') || lower.includes('tengkyu') || lower.includes('thanks')) {
    return "Sama-sama! Senang sekali bisa membantumu. Jangan ragu bertanya lagi kalau ada hal lain ya!";
  }

  if (lower.includes('kamu pintar') || lower.includes('kamu hebat') || lower.includes('keren') || lower.includes('mantap')) {
    return "Terima kasih banyak atas apresiasinya! Aku senang bisa memberikan respons yang bermanfaat untukmu.";
  }

  // 10. Humor / Jokes
  if (lower.includes('lelucon') || lower.includes('cerita lucu') || lower.includes('tebak-tebakan') || lower.includes('hibur')) {
    const jokes = [
      "Kenapa komputer suka kedinginan? Karena sering buka banyak Windows!",
      "Kenapa keyboard sering lembur? Karena ada tombol Shift malam!",
      "Ikan apa yang pintar matematika? Ikan Tongkol... eh salah, kalkulator air!",
      "Kenapa smartphone nggak pernah kesepian? Karena selalu ada notifikasi yang setia menemani!"
    ];
    return jokes[Math.floor(Math.random() * jokes.length)];
  }

  // 11. Contextual Semantic Synthesizer (Zero Non-Sense, Subject-Tied Responses)
  const contextualAnswer = tryGenerateContextualAnswer(text, lower);
  if (contextualAnswer) {
    return contextualAnswer;
  }

  return `Aku siap mendiskusikan topik "${text}" bersamamu. Ada detail atau pertanyaan khusus yang ingin kamu ketahui lebih lanjut?`;
}

function tryGenerateContextualAnswer(rawText, lower) {
  // Extract core topic by removing common stop words
  const cleanTopic = lower
    .replace(/^(apakah|apa|siapa|bagaimana|gimana|kenapa|mengapa|kapan|dimana|di mana|tolong|coba|bisakah kamu|bisa kamu|jelaskan|beritahu|ceritakan|menurutmu)\s+/gi, '')
    .replace(/\s+(sih|ya|dong|kah|nih|deh|kan|nya|itu|ini)\b/gi, '')
    .trim();

  if (!cleanTopic || cleanTopic.length < 3) return null;

  // Question: "Bagaimana cara ..." / "Gimana cara ..."
  if (lower.startsWith('bagaimana') || lower.startsWith('gimana') || lower.includes('cara')) {
    return `Untuk ${cleanTopic}, langkah terbaik adalah memulainya secara bertahap dari konsep paling dasar, mempraktikkannya dengan teratur, dan mengevaluasi hasilnya. Ada bagian spesifik yang ingin kamu dalami?`;
  }

  // Question: "Kenapa ..." / "Mengapa ..."
  if (lower.startsWith('kenapa') || lower.startsWith('mengapa')) {
    return `Hal mengenai ${cleanTopic} terjadi karena adanya faktor penyebab logis serta kondisi yang memengaruhinya. Mau aku bantu uraikan faktor-faktor pentingnya?`;
  }

  // Question: "Apa itu ..." / "Apa arti ..." / "Apa yang dimaksud ..."
  if (lower.includes('apa itu') || lower.includes('apa arti') || lower.includes('apa yang dimaksud')) {
    return `${cleanTopic} merupakan konsep penting yang merujuk pada prinsip utama dalam bidangnya. Apakah kamu ingin tahu contoh penerapannya atau fungsi utamanya?`;
  }

  // Question: "Siapa ..."
  if (lower.startsWith('siapa')) {
    return `Mengenai figur atau tokoh terkait ${cleanTopic}, peran dan kontribusinya sangat menarik. Ada aspek riwayat atau karyanya yang ingin kamu ketahui lebih detail?`;
  }

  // General conversational topic response that directly echoes the user's specific subject
  return `Mengenai ${cleanTopic}, ini topik yang sangat menarik untuk dibahas. Bagian mana yang paling ingin kamu eksplorasi saat ini?`;
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
        return `Hasil perhitungannya adalah ${cleanVal}. Mau hitung angka lain lagi?`;
      }
    } catch {}
  }
  return null;
}
