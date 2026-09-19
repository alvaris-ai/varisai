// ==========================================================
// VARIS CONTEXT & INTENT MANAGER
// Manages rolling context window, conversation summaries,
// intent classification, anaphora resolution, and project state
// ==========================================================

export class ContextManager {
  constructor({
    maxRecentMessages = 10,
    maxContextChars = 16_000,
    summaryTriggerCount = 8,
  } = {}) {
    this.maxRecentMessages = maxRecentMessages;
    this.maxContextChars = maxContextChars;
    this.summaryTriggerCount = summaryTriggerCount;
  }

  /**
   * Classify user intent to inform tool routing and response style
   */
  classifyIntent(userMessage, conversationHistory = []) {
    const text = (userMessage || '').trim();
    const lower = text.toLowerCase();

    // 1. Math / Calculation Intent
    if (
      /[0-9]+\s*[\+\-\*\/\%x×÷\^]\s*[0-9]+/.test(lower) ||
      lower.startsWith('hitung') ||
      lower.includes('berapa hasil') ||
      lower.includes('ditambah') ||
      lower.includes('dikurang') ||
      lower.includes('dikali') ||
      lower.includes('dibagi')
    ) {
      return { type: 'calculation', confidence: 0.95 };
    }

    // 2. Weather Intent
    if (
      lower.includes('cuaca') ||
      lower.includes('hujan') ||
      lower.includes('suhu') ||
      lower.includes('prakiraan cuaca')
    ) {
      return { type: 'weather', confidence: 0.95 };
    }

    // 3. Web Search / Recent Facts Intent
    if (
      lower.includes('berita') ||
      lower.includes('siapa presiden') ||
      lower.includes('siapa menteri') ||
      lower.includes('terbaru') ||
      lower.includes('harga') ||
      lower.includes('hari ini') && (lower.includes('jadwal') || lower.includes('agenda'))
    ) {
      return { type: 'web_search', confidence: 0.9 };
    }

    // 4. Follow-up / Anaphoric Question Intent
    if (
      lower.startsWith('dia ') ||
      lower.startsWith('terus ') ||
      lower.startsWith('lalu ') ||
      lower.includes('yang tadi') ||
      lower.includes('maksudnya apa') ||
      lower.includes('lanjutkan') ||
      lower.includes('bedanya apa') ||
      lower.includes('kenapa begitu')
    ) {
      return { type: 'follow_up', confidence: 0.9 };
    }

    // 5. Correction / Rejection Intent
    if (
      lower.startsWith('jangan ') ||
      lower.startsWith('bukan ') ||
      lower.includes('salah') ||
      lower.includes('ganti dengan') ||
      lower.includes('gunakan cara lain')
    ) {
      return { type: 'correction', confidence: 0.85 };
    }

    // 6. Coding & Technical Intent
    if (
      lower.includes('kode') ||
      lower.includes('code') ||
      lower.includes('script') ||
      lower.includes('function') ||
      lower.includes('algoritma') ||
      lower.includes('algorithm') ||
      lower.includes('buatkan program') ||
      lower.includes('coding') ||
      lower.includes('bikin web') ||
      lower.includes('html') ||
      lower.includes('css') ||
      lower.includes('javascript') ||
      lower.includes('typescript') ||
      lower.includes('python') ||
      lower.includes('php') ||
      lower.includes('sql') ||
      lower.includes('error') ||
      lower.includes('bug') ||
      lower.includes('debug') ||
      lower.includes('syntax') ||
      lower.includes('query')
    ) {
      return { type: 'coding', confidence: 0.9 };
    }

    // 7. Small Talk / Greeting
    if (
      /^(halo|hai|hey|hei|apa kabar|pagi|siang|sore|malam|terima kasih|makasih)/i.test(lower)
    ) {
      return { type: 'small_talk', confidence: 0.85 };
    }

    return { type: 'general_question', confidence: 0.7 };
  }

  /**
   * Resolve anaphora like "dia", "yang tadi", "itu" from previous turns
   */
  resolveReferences(userMessage, conversationHistory = []) {
    const text = (userMessage || '').trim();
    const lower = text.toLowerCase();
    let resolvedContextHint = null;

    if (!conversationHistory || conversationHistory.length === 0) {
      return { resolvedMessage: text, contextHint: null };
    }

    const lastAssistantMsg = [...conversationHistory].reverse().find(m => m.role === 'assistant')?.content || '';
    const lastUserMsg = [...conversationHistory].reverse().find(m => m.role === 'user')?.content || '';

    // "Dia lahir tahun berapa?" -> find person name in recent context
    if (lower.includes('dia') || lower.includes('beliau')) {
      const entityMatch = lastAssistantMsg.match(/(?:adalah|bernama|yaitu|yakni)\s+((?:(?:Ir\.|Dr\.|Prof\.|Drs\.|H\.|Hj\.)\s*)?[A-Z][a-zA-Z\.\s]{2,35}?)(?:,|\.|\s+yang|\s+seorang|\n|$)/i);
      if (entityMatch) {
        resolvedContextHint = `Konteks Rujukan: "Dia" merujuk kepada ${entityMatch[1].trim()} yang dibahas di pesan sebelumnya.`;
      } else {
        const nameMatch = lastAssistantMsg.match(/(?:(?:Ir\.|Dr\.|Prof\.|Drs\.|H\.|Hj\.)\s*)?[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/);
        if (nameMatch) {
          resolvedContextHint = `Konteks Rujukan: "Dia" merujuk kepada ${nameMatch[0].trim()} yang dibahas di pesan sebelumnya.`;
        } else if (lastUserMsg) {
          resolvedContextHint = `Konteks Rujukan: "Dia" merujuk kepada subjek dari percakapan sebelumnya ("${lastUserMsg}").`;
        }
      }
    }

    // "Yang tadi maksudnya apa?" or "Lanjutkan penjelasan tadi"
    if (lower.includes('yang tadi') || lower.includes('penjelasan tadi') || lower.includes('lanjutkan')) {
      if (lastUserMsg) {
        resolvedContextHint = `Konteks Kelanjutan: User merujuk pada topik "${lastUserMsg}" dari giliran sebelumnya.`;
      }
    }

    // "Terus MySQL?" or "Bedanya apa?"
    if (lower.startsWith('terus ') || lower.includes('bedanya apa') || lower.includes('apa perbedaannya')) {
      resolvedContextHint = `Konteks Komparasi: User membandingkan dengan subjek sebelumnya "${lastUserMsg}".`;
    }

    return {
      resolvedMessage: text,
      contextHint: resolvedContextHint,
    };
  }

  /**
   * Compact long conversations into structured context window:
   * Recent Messages + Summary + Memory + Current Message
   */
  buildOptimizedContext({
    history = [],
    currentUserMessage,
    relevantMemories = [],
    projectState = null,
  }) {
    const intent = this.classifyIntent(currentUserMessage, history);
    const { contextHint } = this.resolveReferences(currentUserMessage, history);

    // Split history into older messages and recent messages
    const recent = history.slice(-this.maxRecentMessages);
    const older = history.slice(0, -this.maxRecentMessages);

    // Build rolling summary for older messages if history is long
    let conversationSummary = '';
    if (older.length > 0) {
      const topics = older
        .filter(m => m.role === 'user')
        .map(m => m.content.slice(0, 50))
        .join('; ');
      conversationSummary = `Ringkasan percakapan sebelumnya: User pernah membahas topik [${topics}]. Pertahankan konteks tujuan ini.`;
    }

    const contextItems = [];

    // 1. Injected Conversation Summary
    if (conversationSummary) {
      contextItems.push({
        role: 'system',
        content: conversationSummary,
      });
    }

    // 2. Active Project State
    if (projectState) {
      contextItems.push({
        role: 'system',
        content: `Active Project Context:\nTujuan: ${projectState.goal || 'Belum ditentukan'}\nStatus: ${projectState.status || 'Berjalan'}\nKeputusan Sebelumnya: ${projectState.decisions?.join(', ') || 'N/A'}`,
      });
    }

    // 3. Relevant Long-Term Memories
    if (relevantMemories?.length > 0) {
      const memoryText = relevantMemories.map(m => `- ${m.text || m}`).join('\n');
      contextItems.push({
        role: 'system',
        content: `Memori Pengguna yang Relevan:\n${memoryText}`,
      });
    }

    // 4. Intent & Anaphora Guidance Hint
    if (contextHint) {
      contextItems.push({
        role: 'system',
        content: contextHint,
      });
    }

    // 5. Recent Verbatim History
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
    };
  }
}

export function createDefaultContextManager() {
  return new ContextManager();
}
