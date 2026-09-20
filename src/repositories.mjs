import { randomUUID } from 'crypto';

export const DEFAULT_AI_MODELS = [
  {
    id: 'auto',
    provider_id: 'system',
    display_name: 'VARIS Auto Router',
    description: 'Otomatis memilih model tercepat dan paling cerdas sesuai tingkat kesulitan pertanyaan.',
    badge: 'Smart',
    speed: 'Lightning',
    reasoning: 'Expert',
    context_window: '1M tokens',
    tier_required: 'free',
    credit_cost_per_request: 3,
    status: 'available',
    is_enabled: true,
    is_default: true,
    sort_order: 0,
  },
  {
    id: 'gemini-2.0-flash',
    provider_id: 'google',
    display_name: 'Gemini 2.0 Flash',
    description: 'Model generasi terbaru Google dengan kecepatan ultra-tinggi dan penalaran tajam.',
    badge: 'Speed',
    speed: 'Lightning',
    reasoning: 'Advanced',
    context_window: '1M tokens',
    tier_required: 'free',
    credit_cost_per_request: 3,
    status: 'available',
    is_enabled: true,
    is_default: false,
    sort_order: 1,
  },
  {
    id: 'gemini-1.5-pro',
    provider_id: 'google',
    display_name: 'Gemini 1.5 Pro',
    description: 'Model reasoning mendalam Google untuk pemecahan masalah kompleks dan analisis dokumen.',
    badge: 'Deep Think',
    speed: 'Standard',
    reasoning: 'Expert',
    context_window: '2M tokens',
    tier_required: 'pro',
    credit_cost_per_request: 12,
    status: 'available',
    is_enabled: true,
    is_default: false,
    sort_order: 2,
  },
  {
    id: 'gpt-4o-mini',
    provider_id: 'openai',
    display_name: 'GPT-4o Mini',
    description: 'Model efisien dan cerdas dari OpenAI untuk percakapan lisan dan coding cepat.',
    badge: 'Fast',
    speed: 'Fast',
    reasoning: 'Advanced',
    context_window: '128k tokens',
    tier_required: 'free',
    credit_cost_per_request: 4,
    status: 'available',
    is_enabled: true,
    is_default: false,
    sort_order: 3,
  },
  {
    id: 'gpt-4o',
    provider_id: 'openai',
    display_name: 'GPT-4o Omnimodel',
    description: 'Model unggulan flagship OpenAI dengan kapabilitas analitis dan coding kelas dunia.',
    badge: 'Flagship',
    speed: 'Fast',
    reasoning: 'Expert',
    context_window: '128k tokens',
    tier_required: 'pro',
    credit_cost_per_request: 15,
    status: 'available',
    is_enabled: true,
    is_default: false,
    sort_order: 4,
  },
  {
    id: 'o3-mini',
    provider_id: 'openai',
    display_name: 'o3-mini Reasoning',
    description: 'Model penalaran bertahap (reasoning/thinking) khusus untuk logika matematika dan arsitektur kode.',
    badge: 'Reasoning',
    speed: 'Standard',
    reasoning: 'Expert',
    context_window: '200k tokens',
    tier_required: 'ultra',
    credit_cost_per_request: 25,
    status: 'available',
    is_enabled: true,
    is_default: false,
    sort_order: 5,
  },
  {
    id: 'llama-3.3-70b',
    provider_id: 'groq',
    display_name: 'Llama 3.3 70B',
    description: 'Model open-weights performa tinggi dengan inferensi kilat di infrastruktur Groq LPU.',
    badge: 'Groq Speed',
    speed: 'Lightning',
    reasoning: 'Advanced',
    context_window: '128k tokens',
    tier_required: 'free',
    credit_cost_per_request: 3,
    status: 'available',
    is_enabled: true,
    is_default: false,
    sort_order: 6,
  },
];

export const DEFAULT_PLANS = [
  {
    id: 'free',
    name: 'Free Starter',
    description: 'Akses model dasar untuk mencoba kemampuan VARIS.',
    monthly_credits: 100,
    daily_credit_limit: 50,
    rate_limit_rpm: 10,
    can_use_comparison: false,
    allowed_tiers: ['free'],
  },
  {
    id: 'pro',
    name: 'Pro Developer',
    description: 'Akses model profesional untuk coding, reasoning, dan percakapan cerdas.',
    monthly_credits: 5000,
    daily_credit_limit: 2000,
    rate_limit_rpm: 30,
    can_use_comparison: true,
    allowed_tiers: ['free', 'pro'],
  },
  {
    id: 'ultra',
    name: 'Ultra AI Power',
    description: 'Akses prioritas penuh ke seluruh model advanced reasoning & multi-model comparison.',
    monthly_credits: 20000,
    daily_credit_limit: 10000,
    rate_limit_rpm: 60,
    can_use_comparison: true,
    allowed_tiers: ['free', 'pro', 'ultra'],
  },
];

const DEFAULT_PROJECTS = [
  {
    id: 'proj-1',
    name: 'VARIS Website',
    description: 'Next-generation AI Workspace frontend & documentation portal.',
    file_count: 12,
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: 'proj-2',
    name: 'Design System',
    description: 'Minimalist, light-themed Figma tokens and component library.',
    file_count: 8,
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 3600000).toISOString(),
  },
  {
    id: 'proj-3',
    name: 'AI Analytics Engine',
    description: 'Multi-model usage aggregation and credit calculation service.',
    file_count: 6,
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
];

const DEFAULT_FILES = [
  {
    id: 'file-1',
    name: 'Project Proposal.pdf',
    project_id: 'proj-1',
    project_name: 'Project A',
    type: 'PDF',
    size_bytes: 2516582,
    size_formatted: '2.4 MB',
    content: 'Proposal overview for VARIS AI Multi-Model Platform rollout with executive summary and key milestones.',
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: 'file-2',
    name: 'Design System.fig',
    project_id: 'proj-2',
    project_name: 'Design',
    type: 'Figma',
    size_bytes: 6081740,
    size_formatted: '5.8 MB',
    content: 'Figma visual design system tokens, typography scales, light-theme palette, and 3D glass asset specs.',
    created_at: new Date(Date.now() - 4 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 3600000).toISOString(),
  },
  {
    id: 'file-3',
    name: 'API Documentation.md',
    project_id: 'proj-1',
    project_name: 'Development',
    type: 'MD',
    size_bytes: 1258291,
    size_formatted: '1.2 MB',
    content: '# VARIS AI REST & Streaming API Documentation\n\nComprehensive endpoints for /api/chat, /api/models, /api/files, and /api/auth/google.',
    created_at: new Date(Date.now() - 5 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 3600000).toISOString(),
  },
  {
    id: 'file-4',
    name: 'Marketing Plan.docx',
    project_id: 'proj-1',
    project_name: 'Marketing',
    type: 'DOCX',
    size_bytes: 2202009,
    size_formatted: '2.1 MB',
    content: 'Global launch strategy, product hunt campaign, developer community outreach, and SaaS pricing rollout.',
    created_at: new Date(Date.now() - 24 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 24 * 3600000).toISOString(),
  },
  {
    id: 'file-5',
    name: 'hero_glass_orb.png',
    project_id: 'proj-2',
    project_name: 'Design',
    type: 'Image',
    size_bytes: 4508876,
    size_formatted: '4.3 MB',
    content: 'High-resolution rendered 3D transparent glass orb with iridescent reflections and metallic orbital rings.',
    created_at: new Date(Date.now() - 24 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 24 * 3600000).toISOString(),
  },
];

export function createRepositories(pool) {
  // In-Memory Repository implementation
  const users = [];
  const sessions = [];
  const conversations = [];
  const messages = [];
  const preferences = [];
  const voiceProfiles = [];
  const memoryItems = [];
  
  // Multi-Model, Credits, Subscriptions, Projects, Files
  const aiModels = DEFAULT_AI_MODELS.map(m => ({ ...m, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }));
  const subscriptionPlans = DEFAULT_PLANS.map(p => ({ ...p, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }));
  const projects = DEFAULT_PROJECTS.map(p => ({ ...p }));
  const files = DEFAULT_FILES.map(f => ({ ...f }));
  const userSubscriptions = [];
  const userCredits = [];
  const creditTransactions = [];
  const usageLogs = [];

  const memRepo = {
    async findUserByEmail(email) {
      return users.find(u => u.email === email) ?? null;
    },
    async findUserById(id) {
      return users.find(u => u.id === id) ?? null;
    },
    async findUserByGoogleId(googleId) {
      if (!googleId) return null;
      return users.find(u => u.google_id === googleId) ?? null;
    },
    async createUser({ name, email, passwordHash = null, googleId = null, avatarUrl = null, authProvider = 'local' }) {
      const user = {
        id: randomUUID(),
        name,
        email: email.trim().toLowerCase(),
        password_hash: passwordHash,
        google_id: googleId,
        avatar_url: avatarUrl,
        auth_provider: authProvider,
        last_login_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      users.push(user);
      
      // Auto-assign Free plan and initial 100 credits
      userSubscriptions.push({
        id: randomUUID(),
        user_id: user.id,
        plan_id: 'free',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
        status: 'active',
      });
      userCredits.push({
        id: randomUUID(),
        user_id: user.id,
        balance: 100,
        allocated_monthly: 100,
        reserved: 0,
        last_reset_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      creditTransactions.push({
        id: randomUUID(),
        user_id: user.id,
        model_id: 'system',
        provider: 'system',
        type: 'monthly_grant',
        credits: 100,
        balance_after: 100,
        input_tokens: 0,
        output_tokens: 0,
        details: { note: 'Initial free plan registration grant' },
        created_at: new Date().toISOString(),
      });

      return user;
    },
    async createGoogleUser({ googleId, name, email, avatarUrl }) {
      return memRepo.createUser({
        name,
        email,
        passwordHash: null,
        googleId,
        avatarUrl,
        authProvider: 'google',
      });
    },
    async linkGoogleAccount(userId, { googleId, avatarUrl }) {
      const user = users.find(u => u.id === userId);
      if (!user) return null;
      user.google_id = googleId;
      if (!user.avatar_url && avatarUrl) user.avatar_url = avatarUrl;
      user.auth_provider = user.password_hash ? 'both' : 'google';
      user.updated_at = new Date().toISOString();
      user.last_login_at = new Date().toISOString();
      return user;
    },
    async updateUserLastLogin(userId) {
      const user = users.find(u => u.id === userId);
      if (user) {
        user.last_login_at = new Date().toISOString();
        user.updated_at = new Date().toISOString();
      }
      return user;
    },
    async updateUserAvatar(userId, avatarUrl) {
      const user = users.find(u => u.id === userId);
      if (user) {
        user.avatar_url = avatarUrl;
        user.updated_at = new Date().toISOString();
      }
      return user;
    },
    async updateUserName(userId, name) {
      const user = users.find(u => u.id === userId);
      if (user) {
        user.name = name;
        user.updated_at = new Date().toISOString();
      }
      return user;
    },
    async updateUserPassword(userId, passwordHash) {
      const user = users.find(u => u.id === userId);
      if (user) {
        user.password_hash = passwordHash;
        user.auth_provider = user.google_id ? 'both' : 'local';
        user.updated_at = new Date().toISOString();
      }
      return user;
    },
    async createSession({ userId, tokenHash, expiresAt }) {
      const user = users.find(u => u.id === userId);
      sessions.push({
        id: randomUUID(),
        user_id: userId,
        token_hash: tokenHash,
        expires_at: expiresAt,
        created_at: new Date().toISOString(),
        revoked_at: null,
        name: user?.name,
        email: user?.email,
        avatar_url: user?.avatar_url,
        auth_provider: user?.auth_provider || 'local',
        google_id: user?.google_id,
        last_login_at: user?.last_login_at,
        user_created_at: user?.created_at,
        user_updated_at: user?.updated_at
      });
    },
    async findSession(tokenHash) {
      const s = sessions.find(s => s.token_hash === tokenHash && !s.revoked_at && new Date(s.expires_at) > new Date());
      return s ?? null;
    },
    async findSessionByTokenHash(tokenHash) {
      return memRepo.findSession(tokenHash);
    },
    async touchSession(id) {
      const s = sessions.find(s => s.id === id);
      if (s) s.last_seen_at = new Date().toISOString();
    },
    async revokeSession(tokenHash) {
      const s = sessions.find(s => s.token_hash === tokenHash);
      if (s) s.revoked_at = new Date().toISOString();
    },
    async listConversations(userId) {
      return conversations.filter(c => c.user_id === userId).sort((a,b) => new Date(b.updated_at) - new Date(a.updated_at));
    },
    async createConversation(userId, title) {
      const conv = { id: randomUUID(), user_id: userId, title, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      conversations.push(conv);
      return conv;
    },
    async getConversation(userId, id) {
      return conversations.find(c => c.id === id && c.user_id === userId) ?? null;
    },
    async deleteConversation(userId, id) {
      const idx = conversations.findIndex(c => c.id === id && c.user_id === userId);
      if (idx !== -1) { conversations.splice(idx, 1); return true; }
      return false;
    },
    async listMessages(userId, conversationId) {
      return messages.filter(m => m.conversation_id === conversationId && m.user_id === userId).sort((a,b) => a.sequence_no - b.sequence_no);
    },
    async listRecentMessages(userId, conversationId, limit = 20) {
      const list = messages.filter(m => m.conversation_id === conversationId && m.user_id === userId).sort((a,b) => b.sequence_no - a.sequence_no).slice(0, limit);
      return list.reverse();
    },
    async createMessage(userId, conversationId, role, content) {
      const seq = messages.filter(m => m.conversation_id === conversationId).length + 1;
      const msg = { id: randomUUID(), conversation_id: conversationId, user_id: userId, role, content, sequence_no: seq, created_at: new Date().toISOString() };
      messages.push(msg);
      const conv = conversations.find(c => c.id === conversationId);
      if (conv) conv.updated_at = new Date().toISOString();
      return msg;
    },
    async getPreferences(userId) {
      return preferences.find(p => p.user_id === userId) ?? null;
    },
    async upsertPreferences(userId, data) {
      let pref = preferences.find(p => p.user_id === userId);
      if (!pref) {
        pref = { id: randomUUID(), user_id: userId, voice_profile_id: data.voice_profile_id ?? null, speaking_speed: data.speaking_speed, voice_style: data.voice_style ?? {}, language: data.language, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        preferences.push(pref);
      } else {
        pref.voice_profile_id = data.voice_profile_id ?? null;
        pref.speaking_speed = data.speaking_speed;
        pref.voice_style = data.voice_style ?? {};
        pref.language = data.language;
        pref.updated_at = new Date().toISOString();
      }
      return pref;
    },
    async listVoiceProfiles(userId) {
      return voiceProfiles.filter(v => v.user_id === userId && (v.status === 'active' || v.status === 'pending'));
    },
    async createVoiceProfile(userId, provider, providerVoiceId, name, status = 'active') {
      const vp = { id: randomUUID(), user_id: userId, provider, provider_voice_id: providerVoiceId, name, status, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      voiceProfiles.push(vp);
      return vp;
    },
    async getVoiceProfile(userId, id) {
      return voiceProfiles.find(v => v.id === id && v.user_id === userId) ?? null;
    },
    async deleteVoiceProfile(userId, id) {
      const vp = voiceProfiles.find(v => v.id === id && v.user_id === userId);
      if (vp) { vp.status = 'deleted'; return true; }
      return false;
    },
    async createMemory({ userId, text, kind = 'fact', confidence = 1.0, sensitivity = 'normal' }) {
      const mem = { id: randomUUID(), user_id: userId, text, kind, confidence, sensitivity, created_at: new Date().toISOString() };
      memoryItems.push(mem);
      return mem;
    },
    async updateMemory(userId, memoryId, text) {
      const mem = memoryItems.find(m => m.id === memoryId && m.user_id === userId);
      if (mem) { mem.text = text; mem.updated_at = new Date().toISOString(); return mem; }
      return null;
    },
    async deleteMemory(userId, memoryId) {
      const idx = memoryItems.findIndex(m => m.id === memoryId && m.user_id === userId);
      if (idx !== -1) { memoryItems.splice(idx, 1); return true; }
      return false;
    },
    async searchMemories(userId, embedding, limit = 5) {
      return memoryItems.filter(m => m.user_id === userId).slice(0, limit).map(m => ({ ...m, similarity: 0.9 }));
    },
    async getMemory(userId, memoryId) {
      return memoryItems.find(m => m.id === memoryId && m.user_id === userId) ?? null;
    },

    // ================= Multi-Model AI Repositories =================
    async listAIModels() {
      return [...aiModels].sort((a,b) => a.sort_order - b.sort_order);
    },
    async getAIModel(id) {
      return aiModels.find(m => m.id === id) ?? null;
    },
    async upsertAIModel(data) {
      let m = aiModels.find(item => item.id === data.id);
      if (!m) {
        m = { ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        aiModels.push(m);
      } else {
        Object.assign(m, data);
        m.updated_at = new Date().toISOString();
      }
      return m;
    },
    async updateAIModelStatus(id, status) {
      const m = aiModels.find(item => item.id === id);
      if (m) {
        m.status = status;
        m.updated_at = new Date().toISOString();
        return m;
      }
      return null;
    },

    // ================= Subscription & Credit Repositories =================
    async listSubscriptionPlans() {
      return [...subscriptionPlans];
    },
    async getSubscriptionPlan(id) {
      return subscriptionPlans.find(p => p.id === id) ?? null;
    },
    async getUserSubscription(userId) {
      let sub = userSubscriptions.find(s => s.user_id === userId);
      if (!sub) {
        sub = {
          id: randomUUID(),
          user_id: userId,
          plan_id: 'free',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
          status: 'active',
        };
        userSubscriptions.push(sub);
      }
      const plan = subscriptionPlans.find(p => p.id === sub.plan_id) || subscriptionPlans[0];
      return { ...sub, plan };
    },
    async setUserSubscription(userId, planId) {
      const plan = subscriptionPlans.find(p => p.id === planId) || subscriptionPlans[0];
      let sub = userSubscriptions.find(s => s.user_id === userId);
      if (!sub) {
        sub = {
          id: randomUUID(),
          user_id: userId,
          plan_id: planId,
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
          status: 'active',
        };
        userSubscriptions.push(sub);
      } else {
        sub.plan_id = planId;
        sub.updated_at = new Date().toISOString();
      }
      
      // Update or top up credits according to plan
      let cred = userCredits.find(c => c.user_id === userId);
      if (!cred) {
        cred = {
          id: randomUUID(),
          user_id: userId,
          balance: plan.monthly_credits,
          allocated_monthly: plan.monthly_credits,
          reserved: 0,
          last_reset_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        userCredits.push(cred);
      } else {
        cred.balance = Math.max(cred.balance, plan.monthly_credits);
        cred.allocated_monthly = plan.monthly_credits;
        cred.updated_at = new Date().toISOString();
      }
      return { ...sub, plan };
    },
    async getUserCredits(userId) {
      let cred = userCredits.find(c => c.user_id === userId);
      if (!cred) {
        cred = {
          id: randomUUID(),
          user_id: userId,
          balance: 100,
          allocated_monthly: 100,
          reserved: 0,
          last_reset_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        userCredits.push(cred);
      }
      return { ...cred };
    },
    async reserveCredits(userId, amount) {
      let cred = userCredits.find(c => c.user_id === userId);
      if (!cred) {
        cred = { id: randomUUID(), user_id: userId, balance: 100, allocated_monthly: 100, reserved: 0, last_reset_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        userCredits.push(cred);
      }
      const available = cred.balance - (cred.reserved || 0);
      if (available < amount) {
        return { ok: false, balance: cred.balance, available, required: amount };
      }
      cred.reserved = (cred.reserved || 0) + amount;
      cred.updated_at = new Date().toISOString();
      const reservationId = randomUUID();
      return { ok: true, reservationId, reservedAmount: amount, available: cred.balance - cred.reserved };
    },
    async settleCredits({ userId, reservedAmount = 0, actualAmount = 0, modelId = 'auto', provider = 'system', conversationId = null, messageId = null, inputTokens = 0, outputTokens = 0, details = {} }) {
      let cred = userCredits.find(c => c.user_id === userId);
      if (!cred) {
        cred = { id: randomUUID(), user_id: userId, balance: 100, allocated_monthly: 100, reserved: 0, last_reset_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        userCredits.push(cred);
      }
      cred.reserved = Math.max(0, (cred.reserved || 0) - reservedAmount);
      cred.balance = Math.max(0, cred.balance - actualAmount);
      cred.updated_at = new Date().toISOString();

      const tx = {
        id: randomUUID(),
        user_id: userId,
        conversation_id: conversationId,
        message_id: messageId,
        model_id: modelId,
        provider,
        type: 'deduct',
        credits: actualAmount,
        balance_after: cred.balance,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        details,
        created_at: new Date().toISOString(),
      };
      creditTransactions.push(tx);

      usageLogs.push({
        id: randomUUID(),
        user_id: userId,
        model_id: modelId,
        provider,
        credits_used: actualAmount,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        tools_used: details.tools || [],
        duration_ms: details.durationMs || 0,
        created_at: new Date().toISOString(),
      });

      return { ok: true, balance: cred.balance, deducted: actualAmount, transactionId: tx.id };
    },
    async refundCredits({ userId, reservedAmount = 0, reason = 'Request failed' }) {
      let cred = userCredits.find(c => c.user_id === userId);
      if (cred && reservedAmount > 0) {
        cred.reserved = Math.max(0, (cred.reserved || 0) - reservedAmount);
        cred.updated_at = new Date().toISOString();
      }
      return { ok: true, balance: cred?.balance ?? 0, refunded: reservedAmount, reason };
    },
    async listCreditTransactions(userId, limit = 50) {
      return creditTransactions
        .filter(t => t.user_id === userId)
        .sort((a,b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, limit);
    },
    async getUserUsageStats(userId) {
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      const userLogs = usageLogs.filter(l => l.user_id === userId);
      const todayLogs = userLogs.filter(l => l.created_at.startsWith(todayStr));

      const modelCounts = {};
      let totalCreditsUsed = 0;
      let totalTokens = 0;

      for (const log of userLogs) {
        modelCounts[log.model_id] = (modelCounts[log.model_id] || 0) + 1;
        totalCreditsUsed += log.credits_used || 0;
        totalTokens += (log.input_tokens || 0) + (log.output_tokens || 0);
      }

      const totalReq = userLogs.length || 1;
      const modelBreakdown = Object.entries(modelCounts).map(([model_id, count]) => ({
        model_id,
        count,
        percentage: Math.round((count / totalReq) * 100),
      })).sort((a,b) => b.count - a.count);

      const cred = userCredits.find(c => c.user_id === userId) || { balance: 100, allocated_monthly: 100 };
      const sub = userSubscriptions.find(s => s.user_id === userId) || { plan_id: 'free', current_period_end: new Date(Date.now() + 30 * 86400000).toISOString() };

      return {
        requests_today: todayLogs.length,
        requests_this_month: userLogs.length,
        credits_used: totalCreditsUsed,
        credits_remaining: cred.balance,
        credits_allocated: cred.allocated_monthly,
        total_tokens: totalTokens,
        model_breakdown: modelBreakdown,
        plan_id: sub.plan_id,
        period_end: sub.current_period_end,
      };
    },
    async getAdminStats() {
      return {
        total_users: users.length,
        total_requests: usageLogs.length,
        total_credits_consumed: usageLogs.reduce((acc, l) => acc + (l.credits_used || 0), 0),
        active_models: aiModels.filter(m => m.is_enabled).length,
      };
    },

    // Projects CRUD
    async listProjects(userId) {
      return [...projects].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    },
    async createProject(userId, { name, description = '' }) {
      const proj = {
        id: 'proj-' + randomUUID().slice(0, 8),
        name: name.trim(),
        description: description.trim(),
        file_count: 0,
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      projects.unshift(proj);
      return proj;
    },
    async getProject(userId, id) {
      const proj = projects.find(p => p.id === id);
      if (!proj) return null;
      const projFiles = files.filter(f => f.project_id === id);
      return { ...proj, files: projFiles };
    },
    async deleteProject(userId, id) {
      const idx = projects.findIndex(p => p.id === id);
      if (idx === -1) return false;
      projects.splice(idx, 1);
      return true;
    },

    // Files CRUD
    async listFiles(userId, { type = 'all', projectId = null, search = '' } = {}) {
      let result = [...files];
      if (projectId) {
        result = result.filter(f => f.project_id === projectId);
      }
      if (type && type !== 'all') {
        const typeNorm = type.toLowerCase();
        if (typeNorm === 'documents' || typeNorm === 'document') {
          result = result.filter(f => ['pdf', 'docx', 'doc', 'txt', 'md'].includes(f.type.toLowerCase()));
        } else if (typeNorm === 'images' || typeNorm === 'image') {
          result = result.filter(f => ['image', 'png', 'jpg', 'jpeg', 'svg', 'webp'].includes(f.type.toLowerCase()));
        } else if (typeNorm === 'code') {
          result = result.filter(f => ['code', 'js', 'ts', 'mjs', 'json', 'py', 'fig'].includes(f.type.toLowerCase()));
        } else {
          result = result.filter(f => f.type.toLowerCase() === typeNorm);
        }
      }
      if (search && search.trim()) {
        const q = search.trim().toLowerCase();
        result = result.filter(f => f.name.toLowerCase().includes(q) || (f.project_name && f.project_name.toLowerCase().includes(q)));
      }
      return result.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    },
    async createFile(userId, { name, projectId = 'proj-1', projectName = 'Project', type = 'Document', sizeBytes = 1024, sizeFormatted = '1 KB', content = '' }) {
      const ext = name.split('.').pop()?.toUpperCase() || type;
      const file = {
        id: 'file-' + randomUUID().slice(0, 8),
        name: name.trim(),
        project_id: projectId,
        project_name: projectName,
        type: ext,
        size_bytes: sizeBytes,
        size_formatted: sizeFormatted,
        content: content || 'Uploaded file content ready for AI analysis.',
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      files.unshift(file);
      // Increment project file count
      const proj = projects.find(p => p.id === projectId);
      if (proj) {
        proj.file_count = (proj.file_count || 0) + 1;
        proj.updated_at = new Date().toISOString();
      }
      return file;
    },
    async getFile(userId, id) {
      return files.find(f => f.id === id) ?? null;
    },
    async deleteFile(userId, id) {
      const idx = files.findIndex(f => f.id === id);
      if (idx === -1) return false;
      const deleted = files.splice(idx, 1)[0];
      const proj = projects.find(p => p.id === deleted.project_id);
      if (proj && proj.file_count > 0) {
        proj.file_count -= 1;
      }
      return true;
    },

    // Subscription Upgrade
    async upgradeUserSubscription(userId, planId) {
      return memRepo.setUserSubscription(userId, planId);
    }
  };

  if (!pool) return memRepo;

  // PostgreSQL Safe Execution
  const q = async (text, values = []) => {
    try {
      return await pool.query(text, values);
    } catch (err) {
      if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.message?.includes('connect')) {
        const connErr = new Error(err.message);
        connErr.isConnectionError = true;
        throw connErr;
      }
      throw err;
    }
  };

  const safe = (dbFn, memFn) => async (...args) => {
    try {
      return await dbFn(...args);
    } catch (err) {
      if (err.isConnectionError) {
        return await memFn(...args);
      }
      throw err;
    }
  };

  const pgRepo = {
    findUserByEmail: async (email) => { const r = await q('select * from public.users where email = $1 limit 1', [email]); return r.rows[0] ?? null; },
    findUserById: async (id) => { const r = await q('select * from public.users where id = $1 limit 1', [id]); return r.rows[0] ?? null; },
    findUserByGoogleId: async (googleId) => { if (!googleId) return null; const r = await q('select * from public.users where google_id = $1 limit 1', [googleId]); return r.rows[0] ?? null; },
    createUser: async ({ name, email, passwordHash = null, googleId = null, avatarUrl = null, authProvider = 'local' }) => {
      const r = await q('insert into public.users (name, email, password_hash, google_id, avatar_url, auth_provider, last_login_at) values ($1, $2, $3, $4, $5, $6, now()) returning *', [name, email, passwordHash, googleId, avatarUrl, authProvider]);
      const user = r.rows[0];
      try {
        await q('insert into public.user_subscriptions (user_id, plan_id) values ($1, $2) on conflict do nothing', [user.id, 'free']);
        await q('insert into public.user_credits (user_id, balance, allocated_monthly) values ($1, 100, 100) on conflict do nothing', [user.id]);
        await q('insert into public.credit_transactions (user_id, model_id, provider, type, credits, balance_after, details) values ($1, $2, $3, $4, $5, $6, $7)', [user.id, 'system', 'system', 'monthly_grant', 100, 100, JSON.stringify({ note: 'Initial free plan registration grant' })]);
      } catch {}
      return user;
    },
    createGoogleUser: async ({ googleId, name, email, avatarUrl }) => {
      return pgRepo.createUser({ name, email, passwordHash: null, googleId, avatarUrl, authProvider: 'google' });
    },
    linkGoogleAccount: async (userId, { googleId, avatarUrl }) => {
      const r = await q(`update public.users set google_id = $1, avatar_url = coalesce(avatar_url, $2), auth_provider = case when password_hash is not null then 'both' else 'google' end, updated_at = now(), last_login_at = now() where id = $3 returning *`, [googleId, avatarUrl || null, userId]);
      return r.rows[0] ?? null;
    },
    updateUserLastLogin: async (userId) => {
      const r = await q('update public.users set last_login_at = now(), updated_at = now() where id = $1 returning *', [userId]);
      return r.rows[0] ?? null;
    },
    updateUserAvatar: async (userId, avatarUrl) => {
      const r = await q('update public.users set avatar_url = $1, updated_at = now() where id = $2 returning *', [avatarUrl, userId]);
      return r.rows[0] ?? null;
    },
    updateUserName: async (userId, name) => {
      const r = await q('update public.users set name = $1, updated_at = now() where id = $2 returning *', [name, userId]);
      return r.rows[0] ?? null;
    },
    updateUserPassword: async (userId, passwordHash) => {
      const r = await q(`update public.users set password_hash = $1, auth_provider = case when google_id is not null then 'both' else 'local' end, updated_at = now() where id = $2 returning *`, [passwordHash, userId]);
      return r.rows[0] ?? null;
    },
    createSession: async ({ userId, tokenHash, expiresAt }) => {
      await q('insert into public.auth_sessions (user_id, token_hash, expires_at) values ($1, $2, $3)', [userId, tokenHash, expiresAt]);
    },
    findSession: async (tokenHash) => {
      const r = await q('select s.*, u.name, u.email, u.avatar_url, u.auth_provider, u.google_id, u.last_login_at, u.created_at as user_created_at, u.updated_at as user_updated_at from public.auth_sessions s join public.users u on u.id = s.user_id where s.token_hash = $1 and s.revoked_at is null and s.expires_at > now()', [tokenHash]);
      return r.rows[0] ?? null;
    },
    findSessionByTokenHash: async (tokenHash) => {
      return pgRepo.findSession(tokenHash);
    },
    touchSession: async (id) => { await q('update public.auth_sessions set last_seen_at = now() where id = $1', [id]); },
    revokeSession: async (tokenHash) => { await q('update public.auth_sessions set revoked_at = now() where token_hash = $1 and revoked_at is null', [tokenHash]); },
    listConversations: async (userId) => { const r = await q('select id, user_id, title, created_at, updated_at from public.conversations where user_id = $1 order by updated_at desc', [userId]); return r.rows; },
    createConversation: async (userId, title) => { const r = await q('insert into public.conversations (user_id, title) values ($1, $2) returning id, user_id, title, created_at, updated_at', [userId, title]); return r.rows[0]; },
    getConversation: async (userId, id) => { const r = await q('select id, user_id, title, created_at, updated_at from public.conversations where id = $1 and user_id = $2', [id, userId]); return r.rows[0] ?? null; },
    deleteConversation: async (userId, id) => { const r = await q('delete from public.conversations where id = $1 and user_id = $2 returning id', [id, userId]); return Boolean(r.rowCount); },
    listMessages: async (userId, conversationId) => { const r = await q('select m.id, m.conversation_id, m.role, m.content, m.created_at from public.messages m join public.conversations c on c.id = m.conversation_id and c.user_id = $1 where m.conversation_id = $2 order by m.sequence_no asc', [userId, conversationId]); return r.rows; },
    listRecentMessages: async (userId, conversationId, limit = 20) => { const r = await q('select m.id, m.conversation_id, m.role, m.content, m.created_at from public.messages m join public.conversations c on c.id = m.conversation_id and c.user_id = $1 where m.conversation_id = $2 order by m.sequence_no desc limit $3', [userId, conversationId, limit]); return r.rows.reverse(); },
    createMessage: async (userId, conversationId, role, content) => { const r = await q('insert into public.messages (conversation_id, user_id, role, content) values ($1, $2, $3, $4) returning id, conversation_id, role, content, created_at', [conversationId, userId, role, content]); await q('update public.conversations set updated_at = now() where id = $1 and user_id = $2', [conversationId, userId]); return r.rows[0]; },
    getPreferences: async (userId) => { const r = await q('select id, user_id, voice_profile_id, speaking_speed, voice_style, language, created_at, updated_at from public.user_preferences where user_id = $1', [userId]); return r.rows[0] ?? null; },
    upsertPreferences: async (userId, data) => { const r = await q(`insert into public.user_preferences (user_id, voice_profile_id, speaking_speed, voice_style, language) values ($1, $2, $3, $4::jsonb, $5) on conflict (user_id) do update set voice_profile_id = excluded.voice_profile_id, speaking_speed = excluded.speaking_speed, voice_style = excluded.voice_style, language = excluded.language returning id, user_id, voice_profile_id, speaking_speed, voice_style, language, created_at, updated_at`, [userId, data.voice_profile_id ?? null, data.speaking_speed, JSON.stringify(data.voice_style ?? {}), data.language]); return r.rows[0]; },
    listVoiceProfiles: async (userId) => { const r = await q('select id, user_id, provider, provider_voice_id, name, status, created_at, updated_at from public.voice_profiles where user_id = $1 and status in ($2, $3) order by created_at desc', [userId, 'active', 'pending']); return r.rows; },
    createVoiceProfile: async (userId, provider, providerVoiceId, name, status = 'active') => { const r = await q('insert into public.voice_profiles (user_id, provider, provider_voice_id, name, status) values ($1, $2, $3, $4, $5) returning id, user_id, provider, provider_voice_id, name, status, created_at, updated_at', [userId, provider, providerVoiceId, name, status]); return r.rows[0]; },
    getVoiceProfile: async (userId, id) => { const r = await q('select id, user_id, provider, provider_voice_id, name, status, created_at, updated_at from public.voice_profiles where id = $1 and user_id = $2', [id, userId]); return r.rows[0] ?? null; },
    deleteVoiceProfile: async (userId, id) => { const r = await q('update public.voice_profiles set status = $1, updated_at = now() where id = $2 and user_id = $3 returning id', ['deleted', id, userId]); return Boolean(r.rowCount); },
    createMemory: async ({ userId, text, embedding, kind = 'fact', confidence = 1.0, sensitivity = 'normal', sourceMessageId = null, expiresAt = null }) => {
      const r = await q(
        `insert into public.memory_items (user_id, text, embedding, kind, confidence, sensitivity, source_message_id, expires_at)
         values ($1, $2, $3::vector, $4, $5, $6, $7, $8)
         returning id, text, kind, created_at`,
        [userId, text, JSON.stringify(embedding), kind, confidence, sensitivity, sourceMessageId, expiresAt]
      );
      return r.rows[0];
    },
    updateMemory: async (userId, memoryId, text, embedding) => {
      let r;
      if (embedding) {
        r = await q(`update public.memory_items set text = $1, embedding = $2::vector where id = $3 and user_id = $4 and deleted_at is null returning id, text, kind, updated_at`, [text, JSON.stringify(embedding), memoryId, userId]);
      } else {
        r = await q(`update public.memory_items set text = $1 where id = $2 and user_id = $3 and deleted_at is null returning id, text, kind, updated_at`, [text, memoryId, userId]);
      }
      return r.rows[0] ?? null;
    },
    deleteMemory: async (userId, memoryId) => {
      const r = await q(`update public.memory_items set deleted_at = now() where id = $1 and user_id = $2 and deleted_at is null returning id`, [memoryId, userId]);
      return Boolean(r.rowCount);
    },
    searchMemories: async (userId, embedding, limit = 5, matchThreshold = 0.5) => {
      const r = await q(
        `select id, text, kind, confidence, sensitivity, created_at, 1 - (embedding <=> $1::vector) as similarity
         from public.memory_items
         where user_id = $2 and deleted_at is null and 1 - (embedding <=> $1::vector) >= $3
         order by embedding <=> $1::vector asc
         limit $4`,
        [JSON.stringify(embedding), userId, matchThreshold, limit]
      );
      return r.rows;
    },
    getMemory: async (userId, memoryId) => {
      const r = await q(`select id, text, kind, confidence, sensitivity, created_at from public.memory_items where id = $1 and user_id = $2 and deleted_at is null`, [memoryId, userId]);
      return r.rows[0] ?? null;
    },

    // Multi-Model Postgres
    listAIModels: async () => {
      const r = await q('select * from public.ai_models order by sort_order asc');
      return r.rows.length ? r.rows : memRepo.listAIModels();
    },
    getAIModel: async (id) => {
      const r = await q('select * from public.ai_models where id = $1', [id]);
      return r.rows[0] ?? memRepo.getAIModel(id);
    },
    upsertAIModel: async (data) => {
      const r = await q(
        `insert into public.ai_models (id, provider_id, display_name, description, badge, speed, reasoning, context_window, tier_required, credit_cost_per_request, status, is_enabled, is_default, sort_order)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         on conflict (id) do update set
           display_name = excluded.display_name,
           description = excluded.description,
           badge = excluded.badge,
           speed = excluded.speed,
           reasoning = excluded.reasoning,
           context_window = excluded.context_window,
           tier_required = excluded.tier_required,
           credit_cost_per_request = excluded.credit_cost_per_request,
           status = excluded.status,
           is_enabled = excluded.is_enabled,
           is_default = excluded.is_default,
           sort_order = excluded.sort_order,
           updated_at = now()
         returning *`,
        [data.id, data.provider_id, data.display_name, data.description, data.badge, data.speed, data.reasoning, data.context_window, data.tier_required, data.credit_cost_per_request, data.status, data.is_enabled, data.is_default, data.sort_order]
      );
      return r.rows[0];
    },
    updateAIModelStatus: async (id, status) => {
      const r = await q('update public.ai_models set status = $1, updated_at = now() where id = $2 returning *', [status, id]);
      return r.rows[0] ?? null;
    },

    listSubscriptionPlans: async () => {
      const r = await q('select * from public.subscription_plans order by monthly_credits asc');
      return r.rows.length ? r.rows : memRepo.listSubscriptionPlans();
    },
    getSubscriptionPlan: async (id) => {
      const r = await q('select * from public.subscription_plans where id = $1', [id]);
      return r.rows[0] ?? memRepo.getSubscriptionPlan(id);
    },
    getUserSubscription: async (userId) => {
      const r = await q(
        `select s.*, p.name as plan_name, p.monthly_credits, p.daily_credit_limit, p.rate_limit_rpm, p.can_use_comparison, p.allowed_tiers
         from public.user_subscriptions s
         join public.subscription_plans p on p.id = s.plan_id
         where s.user_id = $1 limit 1`,
        [userId]
      );
      return r.rows[0] ?? memRepo.getUserSubscription(userId);
    },
    setUserSubscription: async (userId, planId) => {
      await q(`insert into public.user_subscriptions (user_id, plan_id) values ($1, $2) on conflict (user_id) do update set plan_id = excluded.plan_id, updated_at = now()`, [userId, planId]);
      return pgRepo.getUserSubscription(userId);
    },
    getUserCredits: async (userId) => {
      const r = await q('select * from public.user_credits where user_id = $1 limit 1', [userId]);
      return r.rows[0] ?? memRepo.getUserCredits(userId);
    },
    reserveCredits: async (userId, amount) => {
      return memRepo.reserveCredits(userId, amount);
    },
    settleCredits: async (params) => {
      return memRepo.settleCredits(params);
    },
    refundCredits: async (params) => {
      return memRepo.refundCredits(params);
    },
    listCreditTransactions: async (userId, limit = 50) => {
      return memRepo.listCreditTransactions(userId, limit);
    },
    getUserUsageStats: async (userId) => {
      return memRepo.getUserUsageStats(userId);
    },
    getAdminStats: async () => {
      return memRepo.getAdminStats();
    },
    listProjects: async (userId) => {
      return memRepo.listProjects(userId);
    },
    createProject: async (userId, data) => {
      return memRepo.createProject(userId, data);
    },
    getProject: async (userId, id) => {
      return memRepo.getProject(userId, id);
    },
    deleteProject: async (userId, id) => {
      return memRepo.deleteProject(userId, id);
    },
    listFiles: async (userId, filters) => {
      return memRepo.listFiles(userId, filters);
    },
    createFile: async (userId, data) => {
      return memRepo.createFile(userId, data);
    },
    getFile: async (userId, id) => {
      return memRepo.getFile(userId, id);
    },
    deleteFile: async (userId, id) => {
      return memRepo.deleteFile(userId, id);
    },
    upgradeUserSubscription: async (userId, planId) => {
      return memRepo.upgradeUserSubscription(userId, planId);
    }
  };

  const result = {};
  for (const key of Object.keys(pgRepo)) {
    result[key] = safe(pgRepo[key], memRepo[key]);
  }
  return result;
}
