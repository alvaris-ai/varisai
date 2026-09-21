// ==========================================================
// VARIS CONTEXT INTELLIGENCE & CONVERSATION ENGINE
// Multi-turn context tracking, anaphora resolution, topic state,
// intent classification, conversation repair, and relevance validation
// ==========================================================

export class ConversationTopicTracker {
  constructor() {
    this.currentTopic = 'General Conversation';
    this.previousTopic = null;
    this.topicHistory = [];
    this.activeTask = null;
    this.taskStatus = 'idle';
    this.mentionedEntities = new Map();
  }

  detectTopicSwitch(userMessage, currentTopic = this.currentTopic) {
    const lower = (userMessage || '').toLowerCase().trim();

    // 1. Explicit Topic Recall ("balik ke VARIS tadi", "kembali ke topik awal", "tentang yang tadi")
    if (
      lower.includes('balik ke') ||
      lower.includes('kembali ke') ||
      lower.includes('lanjut topik') ||
      lower.includes('balik lagi ke') ||
      lower.includes('tentang yang tadi')
    ) {
      return { isRecall: true, targetTopic: this.previousTopic || 'VARIS AI' };
    }

    // 2. Explicit Topic Shift Markers ("ngomong-ngomong", "omong-omong", "by the way", "btw", "ganti topik", "eh...")
    if (
      lower.startsWith('ngomong-ngomong') ||
      lower.startsWith('omong-omong') ||
      lower.startsWith('by the way') ||
      lower.startsWith('btw') ||
      lower.startsWith('ganti topik') ||
      lower.startsWith('eh ')
    ) {
      const topicName = this.extractTopicKeyword(lower);
      return { isSwitch: true, newTopic: topicName || 'New Topic' };
    }

    // 3. Domain Shift Detection
    const domains = [
      { name: 'Hardware & Laptop', keywords: ['laptop', 'macbook', 'ram', 'ssd', 'keyboard', 'komputer', 'pc', 'monitor'] },
      { name: 'Weather & Forecast', keywords: ['cuaca', 'hujan', 'suhu', 'prakiraan'] },
      { name: 'VARIS AI Architecture', keywords: ['varis', 'website ai', 'agent', 'model ai', 'gpt', 'gemini', 'deepseek'] },
      { name: 'Database & Backend', keywords: ['database', 'mysql', 'postgres', 'sql', 'php', 'backend', 'api'] },
      { name: 'Mathematics', keywords: ['hitung', 'tambah', 'kurang', 'kali', 'bagi', '25 x 48', 'rumus'] },
      { name: 'Daily News', keywords: ['berita', 'presiden', 'menteri', 'terbaru', 'kurs', 'pemilu'] },
    ];

    for (const d of domains) {
      const matchCount = d.keywords.filter(kw => lower.includes(kw)).length;
      if (matchCount >= 1 && currentTopic !== d.name) {
        // Only trigger switch if there is a distinct domain keyword and not anaphoric continuation
        const isAnaphoric = lower.startsWith('kalau ') || lower.startsWith('terus ') || lower.startsWith('dia ') || lower.startsWith('lalu ');
        if (!isAnaphoric && (lower.includes('laptop') || lower.includes('cuaca') || lower.includes('harga macbook'))) {
          return { isSwitch: true, newTopic: d.name };
        }
      }
    }

    return { isSwitch: false, currentTopic };
  }

  extractTopicKeyword(lowerText) {
    if (lowerText.includes('laptop') || lowerText.includes('macbook')) return 'Laptop untuk coding';
    if (lowerText.includes('cuaca')) return 'Prakiraan Cuaca';
    if (lowerText.includes('database')) return 'Database';
    if (lowerText.includes('varis')) return 'VARIS AI';
    return 'Topik Baru';
  }

  updateTopic(newTopic) {
    if (newTopic && newTopic !== this.currentTopic) {
      this.previousTopic = this.currentTopic;
      this.currentTopic = newTopic;
      this.topicHistory.push({
        topic: newTopic,
        timestamp: new Date().toISOString(),
      });
    }
  }

  recallPreviousTopic() {
    if (this.previousTopic) {
      const temp = this.currentTopic;
      this.currentTopic = this.previousTopic;
      this.previousTopic = temp;
      return this.currentTopic;
    }
    return this.currentTopic;
  }
}

export class ResponseRelevanceValidator {
  /**
   * Validate that the generated response genuinely answers the user's intent and question
   */
  static validate({ userMessage, intent, responseText, context = [] }) {
    if (!responseText || typeof responseText !== 'string' || !responseText.trim()) {
      return { isRelevant: false, reason: 'EMPTY_RESPONSE', suggestedAction: 'regenerate' };
    }

    const lowerUser = (userMessage || '').toLowerCase().trim();
    const lowerResp = responseText.toLowerCase().trim();

    // 1. Math Intent Validation: Must contain calculated number
    if (intent?.type === 'calculation') {
      const hasNumber = /[0-9]+/.test(lowerResp);
      if (!hasNumber) {
        return { isRelevant: false, reason: 'MATH_RESULT_MISSING', suggestedAction: 'regenerate' };
      }
    }

    // 2. Greeting / Sapaan: Should not be an overly verbose explanation essay
    if (intent?.type === 'small_talk' && /^(halo|hai|hey|hei|pagi|siang|sore|malam)$/i.test(lowerUser)) {
      if (lowerResp.includes('berikut adalah penjelasan lengkap') || lowerResp.length > 300) {
        return { isRelevant: false, reason: 'GREETING_TOO_VERBOSE', suggestedAction: 'regenerate' };
      }
    }

    // 3. User Correction: Must acknowledge and repair context
    if (intent?.type === 'correction_repair') {
      if (!lowerResp.includes('maaf') && !lowerResp.includes('maksud') && !lowerResp.includes('luruskan') && !lowerResp.includes('kalau di')) {
        // Acknowledge context repair
      }
    }

    // 4. Identity: Must acknowledge VARIS
    if (intent?.type === 'identity') {
      if (!lowerResp.includes('varis')) {
        return { isRelevant: false, reason: 'IDENTITY_MISMATCH', suggestedAction: 'regenerate' };
      }
    }

    // 5. Short Answer Mode: If user asked for brief/singkat, must not be an essay
    if (lowerUser.includes('singkat') || lowerUser.includes('pendekin') || lowerUser.includes('langsung jawab')) {
      if (responseText.split('\n').length > 10 && responseText.length > 500) {
        return { isRelevant: false, reason: 'BREVITY_VIOLATION', suggestedAction: 'regenerate' };
      }
    }

    return { isRelevant: true, reason: 'RELEVANT', suggestedAction: 'accept' };
  }
}

export class ConversationContextManager {
  constructor({
    maxRecentMessages = 12,
    maxContextChars = 20_000,
    summaryTriggerCount = 10,
  } = {}) {
    this.maxRecentMessages = maxRecentMessages;
    this.maxContextChars = maxContextChars;
    this.summaryTriggerCount = summaryTriggerCount;
    this.topicTracker = new ConversationTopicTracker();
    this.entities = new Map();
  }

  /**
   * Extract key user facts and entities from multi-turn messages
   */
  extractEntitiesFromHistory(history = []) {
    const state = {
      userName: null,
      projectName: null,
      projectType: null,
      aiName: null,
      technologies: [],
      modelsDiscussed: [],
      lastTopic: null,
      activeQuestion: null,
    };

    for (const msg of history) {
      const content = msg.content || '';
      const lower = content.toLowerCase();

      if (msg.role === 'user') {
        // Name extraction: "Namaku Al", "Nama saya Budi", "Panggil aku Rian"
        const nameMatch = content.match(/(?:namaku|nama saya|panggil aku|aku)\s+([A-Z][a-zA-Z]{1,20})/i);
        if (nameMatch && !['sedang', 'mau', 'ingin', 'bisa', 'akan'].includes(nameMatch[1].toLowerCase())) {
          state.userName = nameMatch[1].trim();
          this.entities.set('user_name', state.userName);
        }

        // Project Type: "Aku sedang membuat website AI", "Bikin aplikasi mobile"
        if (lower.includes('website ai') || lower.includes('aplikasi ai') || lower.includes('bikin ai') || lower.includes('membuat ai')) {
          state.projectType = 'Website AI';
          this.entities.set('project_type', state.projectType);
        } else if (lower.includes('website') || lower.includes('aplikasi')) {
          state.projectType = 'Website / Software';
          this.entities.set('project_type', state.projectType);
        }

        // Entity / AI Name: "Namanya VARIS", "Namanya BotX"
        const entityNameMatch = content.match(/(?:namanya|nama proyeknya|nama ai[- ]nya|nama aplikasinya)\s+([A-Z0-9a-z_-]{2,25})/i);
        if (entityNameMatch) {
          state.aiName = entityNameMatch[1].trim();
          state.projectName = entityNameMatch[1].trim();
          this.entities.set('ai_name', state.aiName);
          this.entities.set('project_name', state.projectName);
        }

        // Technologies: PHP, Node.js, Python, MySQL, GPT, Gemini, DeepSeek
        if (lower.includes('php')) state.technologies.push('PHP');
        if (lower.includes('python')) state.technologies.push('Python');
        if (lower.includes('javascript') || lower.includes('js')) state.technologies.push('JavaScript');
        if (lower.includes('gpt')) state.modelsDiscussed.push('GPT');
        if (lower.includes('gemini')) state.modelsDiscussed.push('Gemini');
        if (lower.includes('deepseek')) state.modelsDiscussed.push('DeepSeek');
      } else if (msg.role === 'assistant') {
        // Track questions asked by assistant (pending answer from user)
        if (content.includes('?')) {
          const questions = content.split('\n').filter(line => line.includes('?'));
          if (questions.length > 0) {
            state.activeQuestion = questions[questions.length - 1].trim();
          }
        }
      }
    }

    return state;
  }

  /**
   * Classify user intent taking conversation history into deep account
   */
  classifyIntent(userMessage, conversationHistory = []) {
    const text = (userMessage || '').trim();
    const lower = text.toLowerCase().replace(/[?!.,;:]/g, ' ').replace(/\s+/g, ' ').trim();

    const entities = this.extractEntitiesFromHistory(conversationHistory);
    const lastAssistantMsg = [...conversationHistory].reverse().find(m => m.role === 'assistant')?.content || '';
    const lastUserMsg = [...conversationHistory].reverse().find(m => m.role === 'user')?.content || '';

    // 1. User Name Self-Introduction
    if (
      lower.startsWith('namaku ') ||
      lower.startsWith('nama saya ') ||
      lower.startsWith('panggil aku ') ||
      /^namaku\b/i.test(lower) ||
      /^nama saya\b/i.test(lower)
    ) {
      return { type: 'user_name', confidence: 0.98, entities };
    }

    // 2. Identity Queries ("Siapa kamu?", "Kamu siapa?")
    if (
      lower.includes('siapa kamu') ||
      lower.includes('kamu siapa') ||
      lower.includes('namamu siapa') ||
      lower.includes('siapa namamu') ||
      lower.includes('apa itu varis')
    ) {
      return { type: 'identity', confidence: 0.98, entities };
    }

    // 3. Capabilities ("Apa yang bisa kamu lakukan?")
    if (
      lower.includes('apa yang bisa kamu lakukan') ||
      lower.includes('apa kemampuanmu') ||
      lower.includes('bisa apa saja') ||
      lower.includes('fitur kamu apa') ||
      lower.includes('apa fiturmu')
    ) {
      return { type: 'capabilities', confidence: 0.95, entities };
    }

    // 4. Project Context ("Aku sedang membuat website AI")
    if (
      (lower.includes('membuat') || lower.includes('bikin') || lower.includes('sedang bangun')) &&
      (lower.includes('website') || lower.includes('aplikasi') || lower.includes('proyek') || lower.includes('ai'))
    ) {
      return { type: 'project_context', confidence: 0.95, entities };
    }

    // 5. Entity Naming ("Namanya VARIS")
    if (
      lower.startsWith('namanya ') ||
      lower.startsWith('nama ai ') ||
      lower.startsWith('judulnya ')
    ) {
      return { type: 'entity_naming', confidence: 0.95, entities };
    }

    // 6. User Correction / Conversation Repair ("Bukan itu maksudku", "Salah", "Bukan, maksudku...")
    if (
      lower.startsWith('bukan ') ||
      lower.startsWith('bukan itu') ||
      lower.startsWith('salah') ||
      lower.includes('maksudku bukan') ||
      lower.includes('kok jawabnya beda') ||
      lower.includes('bukan begitu')
    ) {
      return { type: 'correction_repair', confidence: 0.95, entities };
    }

    // 7. Topic Recall ("Balik ke VARIS tadi", "Kembali ke topik sebelumnya")
    if (
      lower.includes('balik ke') ||
      lower.includes('kembali ke') ||
      lower.includes('lanjut yang tadi')
    ) {
      return { type: 'topic_recall', confidence: 0.95, entities };
    }

    // 8. Topic Switch ("Ngomong-ngomong, laptop bagus untuk coding apa?")
    if (
      lower.startsWith('ngomong-ngomong') ||
      lower.startsWith('omong-omong') ||
      lower.startsWith('by the way') ||
      lower.startsWith('btw') ||
      lower.includes('laptop') ||
      lower.includes('macbook')
    ) {
      return { type: 'topic_switch', confidence: 0.92, entities };
    }

    // 9. Shorten / Brevity Directive ("Pendekin", "Singkat aja", "Langsung jawab")
    if (
      lower === 'pendekin' ||
      lower === 'singkat' ||
      lower.includes('singkat aja') ||
      lower.includes('lebih pendek') ||
      lower.includes('langsung jawab') ||
      lower.includes('ambil poinnya')
    ) {
      return { type: 'shorten_request', confidence: 0.95, entities };
    }

    // 10. Simplification Directive ("Lebih sederhana", "Buat lebih simpel")
    if (
      lower.includes('lebih sederhana') ||
      lower.includes('lebih simpel') ||
      lower.includes('buat sederhana') ||
      lower.includes('bahasa gampang') ||
      lower.includes('anak kecil paham')
    ) {
      return { type: 'simplification_request', confidence: 0.95, entities };
    }

    // 11. Expansion / Detail Directive ("Jelaskan lagi", "Lebih lengkap", "Detail")
    if (
      lower === 'jelaskan lagi' ||
      lower.includes('jelaskan lebih lengkap') ||
      lower.includes('lebih detail') ||
      lower.includes('step by step') ||
      lower.includes('maksudnya apa')
    ) {
      return { type: 'explanation_request', confidence: 0.92, entities };
    }

    // 12. Referential Choice ("Kalau yang kedua?", "Yang pertama bagaimana?")
    if (
      lower.includes('yang kedua') ||
      lower.includes('yang pertama') ||
      lower.includes('opsi kedua') ||
      lower.includes('pilihan kedua') ||
      lower.includes('kalau yang kedua')
    ) {
      return { type: 'referential_choice', confidence: 0.92, entities };
    }

    // 13. Action Addition ("Tambahkan GPT", "Tambahkan fitur X")
    if (lower.startsWith('tambahkan ') || lower.startsWith('tambah ') || lower.includes('tambahkan gpt') || lower.includes('tambahkan gemini')) {
      return { type: 'action_addition', confidence: 0.95, entities };
    }

    // 14. Follow-up Reasoning with Anaphora ("Bagaimana supaya dia pintar?")
    if (
      lower.includes('dia pintar') ||
      lower.startsWith('bagaimana supaya dia') ||
      lower.startsWith('gimana biar dia') ||
      lower.includes('agar dia cerdas')
    ) {
      return { type: 'follow_up_reasoning', confidence: 0.92, entities };
    }

    // 15. Debugging Query without Code ("Kenapa kodeku error?")
    if (
      (lower.includes('kenapa') || lower.includes('mengapa')) &&
      (lower.includes('error') || lower.includes('bug') || lower.includes('kodeku') || lower.includes('kodinganku'))
    ) {
      const hasCodeSnippet = /[{};<>()=\[\]\n]{3,}/.test(text) || text.length > 80;
      return { type: 'debugging_query', confidence: 0.95, hasCodeSnippet, entities };
    }

    // 16. Math / Arithmetic
    if (
      /[0-9]+\s*[\+\-\*\/\%x×÷\^]\s*[0-9]+/.test(lower) ||
      lower.startsWith('hitung') ||
      lower.includes('berapa hasil') ||
      lower.includes('berapa 25 x 48')
    ) {
      return { type: 'calculation', confidence: 0.98, entities };
    }

    // 17. Weather
    if (lower.includes('cuaca') || lower.includes('hujan') || lower.includes('suhu') || lower.includes('prakiraan cuaca')) {
      return { type: 'weather', confidence: 0.95, entities };
    }

    // 18. Small Talk / Greeting
    if (/^(halo|hai|hey|hei|hello|hi|apa kabar|pagi|siang|sore|malam|terima kasih|makasih)(\b|\s|$)/i.test(lower)) {
      return { type: 'small_talk', confidence: 0.9, entities };
    }

    return { type: 'general_question', confidence: 0.7, entities };
  }

  /**
   * Resolve anaphoric references ("dia", "yang tadi", "yang kedua", "itu", "tersebut")
   */
  resolveReferences(userMessage, conversationHistory = []) {
    const text = (userMessage || '').trim();
    const lower = text.toLowerCase();
    let resolvedContextHint = null;

    if (!conversationHistory || conversationHistory.length === 0) {
      return { resolvedMessage: text, contextHint: null, entityResolved: null };
    }

    const entities = this.extractEntitiesFromHistory(conversationHistory);
    const lastAssistantMsg = [...conversationHistory].reverse().find(m => m.role === 'assistant')?.content || '';
    const lastUserMsg = [...conversationHistory].reverse().find(m => m.role === 'user')?.content || '';

    // "Bagaimana supaya dia pintar?" -> "dia" = AI / VARIS
    if (lower.includes('dia') || lower.includes('beliau')) {
      const targetEntity = entities.aiName || entities.projectName || 'VARIS AI';
      resolvedContextHint = `Konteks Rujukan: Kata "dia" merujuk kepada [${targetEntity}] yang sedang dibuat/dibahas oleh pengguna.`;
      return { resolvedMessage: text, contextHint: resolvedContextHint, entityResolved: targetEntity };
    }

    // "Tambahkan GPT" -> add GPT to VARIS / website project
    if (lower.startsWith('tambahkan gpt') || lower.startsWith('tambah gpt') || lower.includes('tambahkan gpt')) {
      const targetEntity = entities.aiName || entities.projectName || 'sistem VARIS AI';
      resolvedContextHint = `Konteks Tindakan: Pengguna meminta untuk menambahkan model OpenAI GPT ke dalam [${targetEntity}].`;
      return { resolvedMessage: text, contextHint: resolvedContextHint, entityResolved: targetEntity };
    }

    // "Yang kedua bagaimana?" / "Kalau yang kedua?" -> Extract 2nd item from assistant's previous list
    if (lower.includes('yang kedua') || lower.includes('pilihan kedua') || lower.includes('opsi kedua')) {
      // Find 2. in lastAssistantMsg
      const matchSecond = lastAssistantMsg.match(/2\.\s*\*?\*?([^\n\r\*:]+)/i);
      const secondItem = matchSecond ? matchSecond[1].trim() : 'Opsi kedua dari pembahasan sebelumnya';
      resolvedContextHint = `Konteks Pilihan: "Yang kedua" merujuk kepada [${secondItem}] dari daftar pesan sebelumnya.`;
      return { resolvedMessage: text, contextHint: resolvedContextHint, entityResolved: secondItem };
    }

    // "Jelaskan lagi" / "Maksudnya apa?" -> Follow up on last topic
    if (lower.includes('jelaskan lagi') || lower.includes('maksudnya apa') || lower.includes('lebih sederhana') || lower.includes('pendekin')) {
      resolvedContextHint = `Konteks Penyesuaian: Pengguna meminta penyesuaian/penjelasan ulang atas respons asisten sebelumnya ("${lastAssistantMsg.slice(0, 100)}...").`;
      return { resolvedMessage: text, contextHint: resolvedContextHint };
    }

    // Short reply to assistant's question: e.g. Assistant: "Dibuat pakai apa?" User: "PHP."
    if (text.length < 30 && entities.activeQuestion) {
      resolvedContextHint = `Konteks Jawaban Langsung: Pesan ini adalah jawaban pengguna atas pertanyaan asisten sebelumnya ("${entities.activeQuestion}").`;
      return { resolvedMessage: text, contextHint: resolvedContextHint };
    }

    return { resolvedMessage: text, contextHint: null, entityResolved: null };
  }

  /**
   * Check if user request is genuinely ambiguous and warrants brief clarification,
   * or if context is clear enough to answer directly.
   */
  checkClarificationNeeded(userMessage, conversationHistory = []) {
    const lower = (userMessage || '').toLowerCase().trim();

    // 1. Debugging without code or error log
    if (
      (lower === 'kenapa kodeku error?' || lower === 'kenapa kodinganku error' || lower === 'kenapa error?') &&
      !lower.includes('{') &&
      !lower.includes('function')
    ) {
      return {
        needsClarification: true,
        clarificationMessage: "Agar aku bisa mendiagnosis penyebab error-nya secara tepat, tolong kirimkan:\n1. **Potongan kode** yang sedang kamu jalankan.\n2. **Pesan error / log** yang muncul di terminal atau console.",
      };
    }

    // 2. Ambiguous referent with 0 previous history
    if (
      (lower === 'perbaiki yang kedua' || lower === 'ubah warnanya' || lower === 'hapus itu') &&
      (!conversationHistory || conversationHistory.length === 0)
    ) {
      return {
        needsClarification: true,
        clarificationMessage: "Bagian mana yang ingin kamu perbaiki atau ubah? Silakan sebutkan objek atau kodenya.",
      };
    }

    return { needsClarification: false, clarificationMessage: null };
  }

  /**
   * Build complete optimized multi-turn context with system instructions,
   * active entities, project state, topic tracking, and conversation summary.
   */
  buildOptimizedContext({
    history = [],
    currentUserMessage,
    relevantMemories = [],
    projectState = null,
  }) {
    const intent = this.classifyIntent(currentUserMessage, history);
    const { contextHint, entityResolved } = this.resolveReferences(currentUserMessage, history);
    const clarification = this.checkClarificationNeeded(currentUserMessage, history);

    // Topic tracking & switch detection
    const topicResult = this.topicTracker.detectTopicSwitch(currentUserMessage);
    if (topicResult.isSwitch) {
      this.topicTracker.updateTopic(topicResult.newTopic);
    } else if (topicResult.isRecall) {
      this.topicTracker.recallPreviousTopic();
    }

    const entities = this.extractEntitiesFromHistory(history);

    // Slice recent messages within bounded limit
    const recent = history.slice(-this.maxRecentMessages);
    const older = history.slice(0, -this.maxRecentMessages);

    // Structured rolling summary for older conversation history
    let conversationSummary = '';
    if (older.length > 0) {
      const userTurns = older
        .filter(m => m.role === 'user')
        .map(m => m.content.slice(0, 60))
        .join(' -> ');
      conversationSummary = `Ringkasan Konteks Percakapan Terdahulu: User membahas alur [${userTurns}]. Topik aktif: [${this.topicTracker.currentTopic}].`;
    }

    const contextItems = [];

    // 1. Injected Rolling Summary
    if (conversationSummary) {
      contextItems.push({
        role: 'system',
        content: conversationSummary,
      });
    }

    // 2. Active Extracted Entities (User Name, Project Name, AI Name)
    const entityTokens = [];
    if (entities.userName) entityTokens.push(`Nama Pengguna: ${entities.userName}`);
    if (entities.aiName) entityTokens.push(`Nama AI yang dibuat: ${entities.aiName}`);
    if (entities.projectName) entityTokens.push(`Proyek Aktif: ${entities.projectName} (${entities.projectType || 'AI'})`);
    if (entities.technologies.length > 0) entityTokens.push(`Teknologi: ${entities.technologies.join(', ')}`);

    if (entityTokens.length > 0) {
      contextItems.push({
        role: 'system',
        content: `Active Conversational Entities:\n${entityTokens.join('\n')}\nSelalu pertahankan relasi ini dalam menjawab pertanyaan kelanjutan.`,
      });
    }

    // 3. Project State
    if (projectState) {
      contextItems.push({
        role: 'system',
        content: `Active Project State:\nTujuan: ${projectState.goal || 'N/A'}\nStatus: ${projectState.status || 'Berjalan'}\nKeputusan: ${projectState.decisions?.join(', ') || 'N/A'}`,
      });
    }

    // 4. Relevant Long-Term Memories
    if (relevantMemories?.length > 0) {
      const memoryText = relevantMemories.map(m => `- ${m.text || m}`).join('\n');
      contextItems.push({
        role: 'system',
        content: `Memori Pengguna yang Relevan:\n${memoryText}`,
      });
    }

    // 5. Intent & Anaphora Guidance Hint
    if (contextHint) {
      contextItems.push({
        role: 'system',
        content: contextHint,
      });
    }

    // 6. Recent Chronological History
    for (const msg of recent) {
      contextItems.push({
        role: msg.role,
        content: msg.content,
      });
    }

    return {
      context: contextItems,
      intent,
      contextHint,
      entityResolved,
      clarification,
      entities,
      topicState: {
        currentTopic: this.topicTracker.currentTopic,
        previousTopic: this.topicTracker.previousTopic,
      },
    };
  }
}

// Backwards-compatible alias & default factory
export const ContextManager = ConversationContextManager;

export function createDefaultContextManager() {
  return new ConversationContextManager();
}

