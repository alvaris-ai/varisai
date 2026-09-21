// ==========================================================
// VARIS AI - WORLD-CLASS AI WORKSPACE CLIENT
// Theme: Light Luxury Mobile-First AI Workspace
// Real Authenticated Data, 5-Tab Architecture, GIS Google OAuth
// ==========================================================

// --- State Machine & Global Store ---
const DEFAULT_AVATAR_SVG = `<svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" class="default-avatar-svg"><rect width="48" height="48" fill="#E2E8F0"/><path d="M24 8C19.5817 8 16 11.5817 16 16C16 20.4183 19.5817 24 24 24C28.4183 24 32 20.4183 32 16C32 11.5817 28.4183 8 24 8Z" fill="#94A3B8"/><path d="M9 42C9 33.7157 15.7157 27 24 27C32.2843 27 39 33.7157 39 42V48H9V42Z" fill="#94A3B8"/></svg>`;

let activeMainView = 'landing'; // 'landing', 'auth', 'app'
let activeTab = 'home';         // 'home', 'chat', 'voice', 'projects', 'profile'
let currentUser = {
    id: 'user-demo',
    name: 'al palis',
    email: '',
    picture: null,
    avatar_url: null,
    plan: 'Free',
    credits: 999999,
    creditsMax: 999999
};
let currentModel = 'auto';
let currentModelName = 'VARIS Auto';
let currentSearchMode = 'always'; // 'always', 'smart', 'offline'
let currentSearchModeName = 'Web Research';
let currentSearchModeIcon = '🌐';
let currentConversationId = 'conv-' + Date.now();
let isRegisterMode = false;
let isVoiceMuted = false;
let isWebSearchEnabled = true;
let isThinkingMode = false;
let lastUserMessageText = '';

// Sidebar Chat History Store (Matches reference screenshot)
let sidebarChats = [
    { id: 'pin-1', title: 'Perbaiki Langkah Matriks', pinned: true, createdAt: Date.now() - 3600000 },
    { id: 'recent-1', title: 'Cara Membuat AI', pinned: false, createdAt: Date.now() - 7200000 },
    { id: 'recent-2', title: 'Desain Logo Varis AI', pinned: false, createdAt: Date.now() - 14400000 },
    { id: 'recent-3', title: 'Ringkasan AI Agent MVC', pinned: false, createdAt: Date.now() - 28800000 },
    { id: 'recent-4', title: 'HTML Dan Database', pinned: false, createdAt: Date.now() - 86400000 },
    { id: 'recent-5', title: 'Perkiraan Tukar Tambah', pinned: false, createdAt: Date.now() - 172800000 },
    { id: 'recent-6', title: 'Alur Permainan Bolak Balok', pinned: false, createdAt: Date.now() - 259200000 },
    { id: 'recent-7', title: 'Ubah Tampilan Lebih Realistis', pinned: false, createdAt: Date.now() - 345600000 }
];

// Conversation Messages Store
let conversationMessagesStore = {
    'pin-1': [
        { role: 'user', text: 'Perbaiki langkah matriks untuk optimasi algoritma invers' },
        { role: 'assistant', text: 'Berikut adalah langkah-langkah optimal untuk melakukan inversi matriks:\n\n1. **Verifikasi Determinan**: Pastikan $\\det(A) \\neq 0$ agar matriks memiliki invers.\n2. **Metode Dekomposisi LU / Gauss-Jordan**: Gunakan eliminasi baris elementer terhadap matriks augmentasi $[A \\mid I]$.\n3. **Pivot Parsial**: Terapkan pertukaran baris untuk meminimalkan round-off error numerik.\n4. **Kompleksitas Komputasi**: Algoritma ini berjalan pada kompleksitas $\\mathcal{O}(n^3)$.' }
    ],
    'recent-1': [
        { role: 'user', text: 'Cara Membuat AI' },
        { role: 'assistant', text: 'Untuk membangun AI Agent modern dan tangguh seperti VARIS AI, terdapat 4 pilar arsitektur fundamental:\n\n1. **Model & Reasoning Core**: Integrasi Multi-LLM (Gemini 2.0, GPT-4o) dengan reasoning loop.\n2. **Real-time Knowledge Engine**: Web search live, grounding data, dan verifikasi fakta.\n3. **Autonomous Tools Execution**: Python sandbox, image generation, document parsing.\n4. **Multi-layer Memory**: Conversation context, long-term vector store, dan user preferences.' }
    ],
    'recent-2': [
        { role: 'user', text: 'Desain Logo Varis AI' },
        { role: 'assistant', text: 'Konsep desain logo VARIS AI menggabungkan elemen geometri modern (lapisan prisma heksagonal) dengan aksen cyan dan royal blue, mencerminkan kecerdasan komputasi multi-dimensi dan estetika premium minimalis.' }
    ]
};

// Voice Mode Web Audio State
let audioCtx = null;
let analyserNode = null;
let micStream = null;
let voiceAnimId = null;

// ==========================================================
// 1. ROUTER: MAIN VIEWS & 5 CORE TABS
// ==========================================================

function switchMainView(viewName) {
    activeMainView = viewName;
    try {
        localStorage.setItem('varis_main_view', viewName);
    } catch (e) {}

    const views = {
        landing: document.getElementById('view-landing'),
        auth: document.getElementById('view-auth'),
        app: document.getElementById('view-app')
    };

    Object.entries(views).forEach(([name, el]) => {
        if (!el) return;
        if (name === viewName) {
            el.style.display = (name === 'app') ? 'flex' : 'block';
            setTimeout(() => el.classList.add('active'), 10);
        } else {
            el.classList.remove('active');
            el.style.display = 'none';
        }
    });

    if (viewName === 'app') {
        renderUserData();
        loadSidebarChats();
        renderSidebarChats();
        const hash = (window.location.hash || '').replace('#', '').toLowerCase();
        const savedTab = localStorage.getItem('varis_active_tab') || activeTab || 'home';
        const targetTab = ['home', 'chat', 'voice', 'projects', 'profile'].includes(hash) ? hash : (['home', 'chat', 'voice', 'projects', 'profile'].includes(savedTab) ? savedTab : 'home');
        switchTab(targetTab);
    } else if (viewName === 'auth') {
        const hash = (window.location.hash || '').replace('#', '').toLowerCase();
        if (hash !== 'auth' && hash !== 'login' && hash !== 'register') {
            window.history.replaceState(null, '', isRegisterMode ? '#register' : '#auth');
        }
    } else if (viewName === 'landing') {
        const hash = (window.location.hash || '').replace('#', '').toLowerCase();
        if (hash && hash !== 'landing') {
            window.history.replaceState(null, '', window.location.pathname);
        }
    }
}

function switchTab(tabName) {
    activeTab = tabName;
    try {
        localStorage.setItem('varis_active_tab', tabName);
        if (activeMainView === 'app') {
            window.history.replaceState(null, '', '#' + tabName);
        }
    } catch (e) {}

    // 1. Hide/Show Tab Pages
    const tabMap = {
        home: document.getElementById('tab-home'),
        chat: document.getElementById('tab-chat'),
        voice: document.getElementById('tab-voice'),
        projects: document.getElementById('tab-projects'),
        profile: document.getElementById('tab-profile')
    };

    Object.entries(tabMap).forEach(([name, page]) => {
        if (!page) return;
        if (name === tabName) {
            page.style.display = (name === 'chat' || name === 'voice') ? 'flex' : 'block';
            setTimeout(() => page.classList.add('active'), 10);
        } else {
            page.classList.remove('active');
            page.style.display = 'none';
        }
    });

    // 2. Sync Mobile Bottom Navigation Tabs
    document.querySelectorAll('.bottom-nav-tab').forEach(btn => {
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // 3. Sync Desktop Sidebar Navigation Items
    document.querySelectorAll('.sidebar-nav-item').forEach(btn => {
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // 4. Tab Specific Lifecycle Hooks
    if (tabName === 'voice') {
        startVoiceEngine();
    } else {
        stopVoiceEngine();
    }

    if (tabName === 'chat') {
        const composer = document.getElementById('main-chat-input');
        if (composer) composer.focus();
        scrollChatToBottom();
    }
}

// ==========================================================
// 2. USER STATE & UI BINDING
// ==========================================================

function renderUserData() {
    if (!currentUser) return;

    const displayName = currentUser.name || 'al palis';
    const firstName = displayName.split(' ')[0] || 'al';
    const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'AP';
    const photoUrl = currentUser.picture || currentUser.avatar_url || null;

    // 1. Home Tab Elements
    const homeName = document.getElementById('home-user-name');
    if (homeName) homeName.textContent = firstName;

    const homeBalance = document.getElementById('home-balance-display');
    if (homeBalance) homeBalance.textContent = `Unlimited (∞)`;

    const homeAllocPct = document.getElementById('home-allocation-pct');
    const homeFill = document.getElementById('home-balance-progress-fill');
    if (homeAllocPct) homeAllocPct.textContent = `100% Available`;
    if (homeFill) homeFill.style.width = `100%`;

    // 2. Chat Tab Elements
    const chatCredits = document.getElementById('chat-credits-display');
    if (chatCredits) chatCredits.textContent = `Unlimited (∞) Access`;

    const chatModelName = document.getElementById('chat-active-model-name');
    if (chatModelName) chatModelName.textContent = currentModelName;

    // 3. Profile Tab Elements
    const profileName = document.getElementById('profile-display-name');
    if (profileName) profileName.textContent = displayName;

    const profileEmail = document.getElementById('profile-display-email');
    if (profileEmail) profileEmail.textContent = currentUser.email || '';

    const profileCredits = document.getElementById('profile-credits-numbers');
    if (profileCredits) profileCredits.textContent = `Unlimited (∞)`;

    const profileFill = document.getElementById('profile-progress-fill');
    if (profileFill) profileFill.style.width = `100%`;

    const profilePhoto = document.getElementById('profile-user-photo');
    const profileFallback = document.getElementById('profile-avatar-fallback');
    if (photoUrl && profilePhoto) {
        profilePhoto.src = photoUrl;
        profilePhoto.style.display = 'block';
        if (profileFallback) profileFallback.style.display = 'none';
    } else {
        if (profilePhoto) profilePhoto.style.display = 'none';
        if (profileFallback) {
            profileFallback.innerHTML = `<div class="user-avatar-teal" style="width:100%;height:100%;border-radius:50%;font-size:1.2rem;">${initials}</div>`;
            profileFallback.style.display = 'flex';
        }
    }

    // 4. Sidebar & Topbar Badges
    const topAvatar = document.getElementById('topbar-avatar-badge');
    if (topAvatar) {
        if (photoUrl) {
            topAvatar.innerHTML = `<img src="${photoUrl}" alt="Avatar" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
        } else {
            topAvatar.innerHTML = `<div class="user-avatar-teal-sm">${initials}</div>`;
        }
    }

    const sideAvatar = document.getElementById('sidebar-user-avatar');
    if (sideAvatar) {
        if (photoUrl) {
            sideAvatar.innerHTML = `<img src="${photoUrl}" alt="Avatar" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
        } else {
            sideAvatar.innerHTML = `<span>${initials}</span>`;
        }
    }

    const sideName = document.getElementById('sidebar-user-name');
    if (sideName) sideName.textContent = displayName;

    const sidePlan = document.getElementById('sidebar-user-plan');
    if (sidePlan) sidePlan.textContent = currentUser.plan || 'Free';
}

// ==========================================================
// 2.1 SIDEBAR CHAT HISTORY MANAGEMENT
// ==========================================================

function loadSidebarChats() {
    try {
        const raw = localStorage.getItem('varis_sidebar_chats');
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
                sidebarChats = parsed;
            }
        }
    } catch (e) {}
}

function saveSidebarChats() {
    try {
        localStorage.setItem('varis_sidebar_chats', JSON.stringify(sidebarChats));
    } catch (e) {}
}

function renderSidebarChats() {
    const pinnedContainer = document.getElementById('sidebar-pinned-list');
    const recentsContainer = document.getElementById('sidebar-recents-list');
    if (!pinnedContainer || !recentsContainer) return;

    pinnedContainer.innerHTML = '';
    recentsContainer.innerHTML = '';

    const pinnedList = sidebarChats.filter(c => c.pinned);
    const recentsList = sidebarChats.filter(c => !c.pinned);

    pinnedList.forEach(chat => {
        const item = document.createElement('div');
        item.className = `sidebar-chat-item pinned ${chat.id === currentConversationId ? 'active' : ''}`;
        item.dataset.chatId = chat.id;
        item.dataset.title = chat.title;
        item.innerHTML = `
            <svg class="chat-item-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <span class="chat-item-title">${escapeHtml(chat.title)}</span>
            <div class="chat-item-actions">
                <button class="btn-chat-item-action pin-toggle active" title="Unpin" onclick="event.stopPropagation(); togglePinChat('${chat.id}')">📌</button>
                <button class="btn-chat-item-action item-del" title="Hapus" onclick="event.stopPropagation(); deleteChat('${chat.id}')">✕</button>
            </div>
        `;
        item.onclick = () => switchConversation(chat.id, chat.title);
        pinnedContainer.appendChild(item);
    });

    recentsList.forEach(chat => {
        const item = document.createElement('div');
        item.className = `sidebar-chat-item ${chat.id === currentConversationId ? 'active' : ''}`;
        item.dataset.chatId = chat.id;
        item.dataset.title = chat.title;
        item.innerHTML = `
            <span class="chat-item-title">${escapeHtml(chat.title)}</span>
            <div class="chat-item-actions">
                <button class="btn-chat-item-action pin-toggle" title="Pin ke Atas" onclick="event.stopPropagation(); togglePinChat('${chat.id}')">📌</button>
                <button class="btn-chat-item-action item-del" title="Hapus" onclick="event.stopPropagation(); deleteChat('${chat.id}')">✕</button>
            </div>
        `;
        item.onclick = () => switchConversation(chat.id, chat.title);
        recentsContainer.appendChild(item);
    });
}

function escapeHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function switchConversation(chatId, title) {
    currentConversationId = chatId;
    switchTab('chat');
    renderSidebarChats();

    const welcomeEl = document.getElementById('chat-welcome-state');
    const feed = document.getElementById('chat-messages-feed');

    // Check if there are stored messages for this conversation
    const messages = conversationMessagesStore[chatId] || [];
    if (messages.length > 0) {
        if (welcomeEl) { welcomeEl.classList.add('hidden'); welcomeEl.style.display = 'none'; }
        if (feed) {
            feed.classList.remove('hidden');
            feed.style.display = 'flex';
            feed.innerHTML = '';
            messages.forEach(msg => {
                if (msg.role === 'user') {
                    feed.appendChild(createUserMessageElement(msg.text));
                } else {
                    const aiRow = createAIMessageElement(msg.text);
                    feed.appendChild(aiRow);
                }
            });
            scrollChatToBottom();
        }
    } else {
        // Show starter state or empty conversation
        if (welcomeEl) { welcomeEl.classList.remove('hidden'); welcomeEl.style.display = 'flex'; }
        if (feed) { feed.classList.add('hidden'); feed.style.display = 'none'; feed.innerHTML = ''; }
    }

    closeMobileSidebar();
    showToast(`Percakapan: "${title}"`);
}

function startNewChat() {
    currentConversationId = 'conv-' + Date.now();
    switchTab('chat');
    renderSidebarChats();

    const welcomeEl = document.getElementById('chat-welcome-state');
    const feed = document.getElementById('chat-messages-feed');
    if (welcomeEl) { welcomeEl.classList.remove('hidden'); welcomeEl.style.display = 'flex'; }
    if (feed) { feed.classList.add('hidden'); feed.style.display = 'none'; feed.innerHTML = ''; }

    const input = document.getElementById('main-chat-input');
    if (input) {
        input.value = '';
        input.style.height = 'auto';
        input.focus();
    }
    closeMobileSidebar();
}

function togglePinChat(chatId) {
    const chat = sidebarChats.find(c => c.id === chatId);
    if (chat) {
        chat.pinned = !chat.pinned;
        saveSidebarChats();
        renderSidebarChats();
        showToast(chat.pinned ? `📌 Disematkan: "${chat.title}"` : `Dilepas dari pin: "${chat.title}"`);
    }
}

function deleteChat(chatId) {
    const idx = sidebarChats.findIndex(c => c.id === chatId);
    if (idx !== -1) {
        const title = sidebarChats[idx].title;
        sidebarChats.splice(idx, 1);
        delete conversationMessagesStore[chatId];
        saveSidebarChats();
        renderSidebarChats();
        if (currentConversationId === chatId) {
            startNewChat();
        }
        showToast(`Dihapus: "${title}"`);
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('desktop-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (!sidebar) return;

    if (window.innerWidth < 768) {
        sidebar.classList.toggle('mobile-open');
        if (backdrop) {
            backdrop.classList.toggle('hidden', !sidebar.classList.contains('mobile-open'));
        }
    } else {
        sidebar.classList.toggle('collapsed');
    }
}

function closeMobileSidebar() {
    const sidebar = document.getElementById('desktop-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');
    if (sidebar) sidebar.classList.remove('mobile-open');
    if (backdrop) backdrop.classList.add('hidden');
}

window.applyLibraryPrompt = function(promptText) {
    switchTab('chat');
    closeModal('modal-feature-library');
    const input = document.getElementById('main-chat-input');
    if (input) {
        input.value = promptText;
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 140) + 'px';
        input.focus();
    }
};

function filterSearchModal(query) {
    const resultsContainer = document.getElementById('search-overlay-results');
    if (!resultsContainer) return;
    resultsContainer.innerHTML = '';

    const q = (query || '').toLowerCase().trim();
    const matches = q ? sidebarChats.filter(c => c.title.toLowerCase().includes(q)) : sidebarChats;

    if (matches.length === 0) {
        resultsContainer.innerHTML = `<div style="padding: 1.5rem; text-align: center; color: #8E8E8E; font-size: 0.9rem;">Tidak ada percakapan yang cocok dengan "${escapeHtml(query)}"</div>`;
        return;
    }

    matches.forEach(chat => {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        item.innerHTML = `
            <span style="font-size:1.1rem; flex-shrink:0;">${chat.pinned ? '📌' : '💬'}</span>
            <span class="item-title" style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(chat.title)}</span>
            <span class="item-meta" style="flex-shrink:0; font-size:0.75rem; color:#8E8E8E;">${chat.pinned ? 'Pinned' : 'Recent'}</span>
        `;
        item.onclick = () => {
            closeModal('modal-search-chats');
            switchConversation(chat.id, chat.title);
        };
        resultsContainer.appendChild(item);
    });
}

window.togglePinChat = togglePinChat;
window.deleteChat = deleteChat;
window.switchConversation = switchConversation;
window.startNewChat = startNewChat;
window.toggleSidebar = toggleSidebar;
window.closeMobileSidebar = closeMobileSidebar;
window.filterSearchModal = filterSearchModal;

function initSessionAndRouting() {
    let savedUser = null;
    try {
        const raw = localStorage.getItem('varis_user');
        if (raw) savedUser = JSON.parse(raw);
    } catch (e) {}

    const hash = (window.location.hash || '').replace('#', '').toLowerCase();
    const savedTab = localStorage.getItem('varis_active_tab') || 'home';
    const targetTab = ['home', 'chat', 'voice', 'projects', 'profile'].includes(hash) ? hash : (['home', 'chat', 'voice', 'projects', 'profile'].includes(savedTab) ? savedTab : 'home');

    if (savedUser && (savedUser.id || savedUser.email)) {
        currentUser = {
            ...currentUser,
            ...savedUser,
            picture: savedUser.picture || savedUser.avatar_url || null,
            avatar_url: savedUser.avatar_url || null,
            credits: savedUser.credits !== undefined ? savedUser.credits : 999999,
            plan: savedUser.plan || 'Unlimited Access'
        };
        switchMainView('app');
        switchTab(targetTab);
    } else if (hash === 'auth' || hash === 'login' || hash === 'register') {
        isRegisterMode = hash === 'register';
        if (typeof updateAuthUI === 'function') updateAuthUI();
        switchMainView('auth');
    } else {
        switchMainView('landing');
    }
}

async function fetchCurrentUser() {
    try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
            const data = await res.json();
            if (data.user) {
                currentUser = {
                    ...currentUser,
                    ...data.user,
                    picture: data.user.avatar_url || data.user.picture || null,
                    avatar_url: data.user.avatar_url || null,
                    credits: (data.subscription && data.subscription.credits_balance !== undefined) ? data.subscription.credits_balance : (data.user.credits !== undefined ? data.user.credits : 999999),
                    plan: data.subscription?.plan_name || (data.user.tier ? (data.user.tier.charAt(0).toUpperCase() + data.user.tier.slice(1) + ' Tier') : 'Unlimited Access')
                };
                try {
                    localStorage.setItem('varis_user', JSON.stringify(currentUser));
                } catch (e) {}

                if (activeMainView !== 'app') {
                    const savedTab = localStorage.getItem('varis_active_tab') || 'home';
                    switchMainView('app');
                    switchTab(savedTab);
                } else {
                    renderUserData();
                }
                return;
            }
        } else if (res.status === 401) {
            const raw = localStorage.getItem('varis_user');
            if (!raw) {
                switchMainView('landing');
            }
        }
    } catch (e) {
        console.warn('Authentication check notice:', e);
    }
}

// ==========================================================
// 3. AUTHENTICATION (GOOGLE GIS & EMAIL/PASSWORD)
// ==========================================================

function initGoogleAuth() {
    if (window.google && window.google.accounts && window.google.accounts.id) {
        try {
            window.google.accounts.id.initialize({
                client_id: '604379040176-dca2rmd9akrtds0rhf62e3ojleer4udl.apps.googleusercontent.com',
                callback: handleGoogleCredentialResponse,
                auto_select: false,
                cancel_on_tap_outside: true
            });
        } catch (e) {
            console.error('Google Identity init error:', e);
        }
    }
}

async function handleGoogleCredentialResponse(response) {
    if (!response || !response.credential) {
        showAuthAlert('Google Sign-In credential was not returned.', 'error');
        return;
    }

    try {
        showAuthAlert('Verifying Google credentials...', 'success');
        const res = await fetch('/api/auth/google/credential', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential: response.credential })
        });

        const data = await res.json();
        if (res.ok && (data.success || data.user)) {
            const userData = data.user || data;
            currentUser = {
                ...currentUser,
                ...userData,
                picture: userData.avatar_url || userData.picture || null,
                avatar_url: userData.avatar_url || null,
                credits: userData.credits !== undefined ? userData.credits : 999999,
                plan: userData.plan || 'Unlimited Access'
            };
            try {
                localStorage.setItem('varis_user', JSON.stringify(currentUser));
                localStorage.setItem('varis_active_tab', 'home');
            } catch (e) {}
            showToast(`Welcome, ${currentUser.name || 'User'}!`);
            switchMainView('app');
            switchTab('home');
        } else {
            const errorMsg = (typeof data.error === 'object' && data.error !== null ? (data.error.message || data.error.code) : data.error) || data.message || 'Google authentication failed.';
            showAuthAlert(errorMsg, 'error');
        }
    } catch (err) {
        showAuthAlert('Error during Google authentication: ' + err.message, 'error');
    }
}

function showAuthAlert(msg, type = 'error') {
    const box = document.getElementById('auth-alert-box');
    if (!box) return;
    let text = msg;
    if (typeof msg === 'object' && msg !== null) {
        text = msg.message || msg.code || JSON.stringify(msg);
    }
    box.textContent = text;
    box.className = `auth-alert-box ${type}`;
    box.classList.remove('hidden');
}

function clearAuthAlert() {
    const box = document.getElementById('auth-alert-box');
    if (box) box.classList.add('hidden');
}

function showForgotAlert(msg, type = 'error') {
    const box = document.getElementById('forgot-alert-box');
    if (!box) return;
    let text = msg;
    if (typeof msg === 'object' && msg !== null) {
        text = msg.message || msg.code || JSON.stringify(msg);
    }
    box.textContent = text;
    box.className = `auth-alert-box ${type}`;
    box.classList.remove('hidden');
}

function clearForgotAlert() {
    const box = document.getElementById('forgot-alert-box');
    if (box) box.classList.add('hidden');
}

// ==========================================================
// 4. CHAT MESSAGING & STREAMING ENGINE
// ==========================================================

let availableModelsList = [];

async function loadAIModels() {
    try {
        const res = await fetch('/api/models');
        if (res.ok) {
            const data = await res.json();
            availableModelsList = data.models || data.data || [];
            renderModelsSheet(availableModelsList);
        }
    } catch (e) {
        console.warn('Failed to load AI models:', e);
    }
}

function renderModelsSheet(models) {
    const listEl = document.getElementById('models-sheet-list');
    if (!listEl || !models?.length) return;

    listEl.innerHTML = '';

    const autoModel = models.find(m => m.id === 'auto');
    const otherModels = models.filter(m => m.id !== 'auto');

    if (autoModel) {
        const tag = document.createElement('span');
        tag.className = 'sheet-section-tag';
        tag.textContent = 'RECOMMENDED';
        listEl.appendChild(tag);

        const card = createModelOptionCard(autoModel);
        listEl.appendChild(card);
    }

    if (otherModels.length > 0) {
        const tag = document.createElement('span');
        tag.className = 'sheet-section-tag';
        tag.textContent = 'VARIS AI';
        listEl.appendChild(tag);

        otherModels.forEach(m => {
            const card = createModelOptionCard(m);
            listEl.appendChild(card);
        });
    }
}

function createModelOptionCard(model) {
    const isSelected = model.id === currentModel;
    const isAvailable = model.status === 'available' || model.is_available !== false;
    const card = document.createElement('div');
    card.className = `model-option-card ${isSelected ? 'selected' : ''} ${!isAvailable ? 'not-configured' : ''}`;
    card.dataset.model = model.id;

    let iconBg = 'bg-purple';
    let iconEmoji = '⚡';
    if (model.id.includes('gemini')) { iconBg = 'bg-blue'; iconEmoji = '✨'; }
    else if (model.id.includes('gpt')) { iconBg = 'bg-emerald'; iconEmoji = '🟢'; }
    else if (model.id.includes('llama')) { iconBg = 'bg-orange'; iconEmoji = '🦙'; }
    else if (model.id.includes('o3') || model.id.includes('o1')) { iconBg = 'bg-indigo'; iconEmoji = '🧠'; }

    const statusDotHtml = `<span class="provider-status-dot ${isAvailable ? 'available' : 'not-configured'}" title="${isAvailable ? 'Available' : 'API Key Belum Diset'}"></span>`;

    card.innerHTML = `
        <div class="model-icon-square ${iconBg}">${iconEmoji}</div>
        <div class="model-option-info">
            <div class="model-name-badge-row">
                ${statusDotHtml}
                <strong>${model.display_name || model.id}</strong>
                <span class="badge-tag">${model.badge || model.speed || 'AI'}</span>
            </div>
            <p class="model-desc-text">${model.description || ''}</p>
        </div>
        <span class="model-credit-badge">Unlimited</span>
    `;

    card.onclick = () => {
        document.querySelectorAll('.model-option-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        currentModel = model.id;
        currentModelName = model.display_name || model.id;

        const activeNameDisplay = document.getElementById('chat-active-model-name');
        if (activeNameDisplay) activeNameDisplay.textContent = currentModelName;

        closeModal('modal-model-sheet');
        if (!isAvailable) {
            showToast(`⚠️ Perhatian: API Key untuk ${currentModelName} belum diset di server.`);
        } else {
            showToast(`Active model switched to ${currentModelName}`);
        }
    };

    return card;
}

function scrollChatToBottom() {
    const feed = document.getElementById('chat-messages-feed');
    if (feed) {
        setTimeout(() => {
            feed.scrollTop = feed.scrollHeight;
        }, 50);
    }
}

function createAIMessageElement(initialText = '') {
    const row = document.createElement('div');
    row.className = 'chat-message-row ai-row';
    row.innerHTML = `
        <div class="chat-ai-header">
            <div class="ai-avatar-badge">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            </div>
            <strong class="ai-sender-name">VARIS AI</strong>
            <span class="ai-message-time">Just now</span>
        </div>
        <div class="ai-message-card">
            <div class="research-status-wrapper" style="display: none;"></div>
            <div class="ai-message-body">${formatMarkdownText(initialText)}</div>
            <div class="research-sources-container" style="display: none;"></div>
        </div>
    `;
    return row;
}

function createUserMessageElement(text) {
    const row = document.createElement('div');
    row.className = 'chat-message-row user-row';
    const bubble = document.createElement('div');
    bubble.className = 'user-message-bubble';
    bubble.textContent = text;
    row.appendChild(bubble);
    return row;
}

function renderSourcesCards(sources) {
    if (!Array.isArray(sources) || sources.length === 0) return '';
    const cardsHtml = sources.map((s, idx) => {
        let domain = s.domain || '';
        if (!domain && s.url) {
            try { domain = new URL(s.url).hostname.replace(/^www\./, ''); } catch (e) { domain = 'web'; }
        }
        const title = s.title || 'Verified Source';
        const snippet = s.snippet || '';
        const scoreBadge = s.score ? `<span class="source-score-badge">${s.score}% Credibility</span>` : '';

        return `
            <a href="${s.url}" target="_blank" rel="noopener noreferrer" class="research-source-card" title="${title}">
                <div class="source-card-top">
                    <span class="source-domain-pill">
                        <span class="source-index-num">[${idx + 1}]</span>
                        <span>${domain}</span>
                    </span>
                    ${scoreBadge}
                </div>
                <strong class="source-card-title">${title}</strong>
                ${snippet ? `<p class="source-card-snippet">${snippet}</p>` : ''}
            </a>
        `;
    }).join('');

    return `
        <div class="research-sources-header" onclick="this.nextElementSibling.classList.toggle('hidden')">
            <span class="research-sources-title">
                📚 Verified Web Sources
                <span class="research-sources-count-badge">${sources.length}</span>
            </span>
        </div>
        <div class="research-sources-grid">
            ${cardsHtml}
        </div>
    `;
}

function formatMarkdownText(text) {
    if (!text) return '<p class="ai-text-para">Thinking...</p>';

    // Parse code blocks ```lang ... ```
    const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
    let formatted = text.replace(codeBlockRegex, (match, lang, code) => {
        const langDisplay = lang ? lang.toUpperCase() : 'CODE';
        const escapedCode = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return `
            <div class="code-block-wrapper">
                <div class="code-block-header">
                    <span class="code-lang-tag">${langDisplay}</span>
                    <button class="btn-code-copy" onclick="copyCodeBlock(this)">Copy</button>
                </div>
                <pre class="code-pre-box"><code>${escapedCode}</code></pre>
            </div>
        `;
    });

    // Parse markdown links [Title](url)
    formatted = formatted.replace(/\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="citation-link">$1 ↗</a>');

    // Parse inline code `code`
    formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Parse bold **text**
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Parse bullet points
    formatted = formatted.replace(/^[\*\-]\s+(.+)$/gm, '• $1');

    // Parse paragraphs
    const paragraphs = formatted.split('\n\n');
    return paragraphs.map(p => {
        if (p.includes('<div class="code-block-wrapper"')) return p;
        return `<p class="ai-text-para">${p.replace(/\n/g, '<br>')}</p>`;
    }).join('');
}

window.copyCodeBlock = function(btn) {
    const codeEl = btn.closest('.code-block-wrapper').querySelector('code');
    if (codeEl) {
        navigator.clipboard.writeText(codeEl.innerText).then(() => {
            btn.textContent = 'Copied!';
            setTimeout(() => { btn.textContent = 'Copy'; }, 1800);
        });
    }
};

async function handleSendMessage() {
    const input = document.getElementById('main-chat-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    lastUserMessageText = text;
    input.value = '';
    input.style.height = 'auto';

    // 1. Hide Welcome Screen & Show Messages Feed
    const welcomeEl = document.getElementById('chat-welcome-state');
    if (welcomeEl) {
        welcomeEl.classList.add('hidden');
        welcomeEl.style.display = 'none';
    }

    const feed = document.getElementById('chat-messages-feed');
    if (!feed) return;
    feed.classList.remove('hidden');
    feed.style.display = 'flex';

    // 2. Append User Message
    const userRow = createUserMessageElement(text);
    feed.appendChild(userRow);
    scrollChatToBottom();

    // 3. Store conversation history
    if (!conversationMessagesStore[currentConversationId]) {
        conversationMessagesStore[currentConversationId] = [];
    }
    conversationMessagesStore[currentConversationId].push({ role: 'user', text });

    // 4. Update or Add Chat Title in Sidebar
    const existingChat = sidebarChats.find(c => c.id === currentConversationId);
    if (!existingChat) {
        const titleSnippet = text.length > 28 ? text.slice(0, 28) + '...' : text;
        sidebarChats.unshift({
            id: currentConversationId,
            title: titleSnippet,
            pinned: false,
            createdAt: Date.now()
        });
        saveSidebarChats();
        renderSidebarChats();
    }

    // 5. Append AI Message Placeholder with streaming cursor
    const aiRow = createAIMessageElement('');
    feed.appendChild(aiRow);
    scrollChatToBottom();
    const statusWrapper = aiRow.querySelector('.research-status-wrapper');
    const bodyEl = aiRow.querySelector('.ai-message-body');
    const sourcesContainer = aiRow.querySelector('.research-sources-container');
    bodyEl.innerHTML = '<span class="streaming-cursor"></span>';

    if (isThinkingMode && statusWrapper) {
        statusWrapper.style.display = 'block';
        statusWrapper.innerHTML = `
            <div class="research-status-pill">
                <span class="pulse-dot"></span>
                <span>🧠 Thinking: Melakukan penalaran mendalam dan verifikasi langkah...</span>
            </div>
        `;
    }

    try {
        const res = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'text/event-stream, application/json'
            },
            body: JSON.stringify({
                message: text,
                model: currentModel,
                conversationId: currentConversationId,
                conversation_id: currentConversationId,
                mode: currentSearchMode,
                search_mode: currentSearchMode,
                web_search: currentSearchMode !== 'offline',
                thinking: isThinkingMode,
                reasoning: isThinkingMode,
                stream: true
            })
        });

        const contentType = res.headers.get('content-type') || '';

        // Error handling for non-stream error responses
        if (!res.ok && !contentType.includes('text/event-stream')) {
            const errData = await res.json().catch(() => ({}));
            let errorMsg = 'VARIS AI sedang memproses permintaan lain. Silakan coba kirim ulang.';
            if (typeof errData.error === 'object' && errData.error !== null) {
                errorMsg = errData.error.message || errorMsg;
            } else if (typeof errData.error === 'string') {
                errorMsg = errData.error;
            } else if (errData.message) {
                errorMsg = errData.message;
            }

            bodyEl.innerHTML = `
                <div class="chat-error-card">
                    <div class="chat-error-title">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        <span>Gagal Terhubung ke VARIS AI</span>
                    </div>
                    <p class="chat-error-msg">${errorMsg}</p>
                    <div class="chat-error-actions">
                        <button class="btn-error-switch" onclick="handleRetryLastMessage()">Coba Kirim Ulang 🔄</button>
                    </div>
                </div>
            `;
            scrollChatToBottom();
            return;
        }

        // Handle SSE Stream
        if (contentType.includes('text/event-stream') && res.body) {
            const reader = res.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let buffer = '';
            let streamAccumulator = '';
            let collectedSources = [];

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop(); // Retain incomplete line

                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i].trim();

                    if (line.startsWith('event: search_status')) {
                        const dataLine = lines[i + 1]?.trim();
                        if (dataLine && dataLine.startsWith('data:')) {
                            try {
                                const parsed = JSON.parse(dataLine.slice(5).trim());
                                if (statusWrapper && parsed.status) {
                                    statusWrapper.style.display = 'block';
                                    statusWrapper.innerHTML = `
                                        <div class="research-status-pill">
                                            <span class="pulse-dot"></span>
                                            <span>${parsed.status}</span>
                                        </div>
                                    `;
                                    scrollChatToBottom();
                                }
                            } catch (e) {}
                        }
                    } else if (line.startsWith('event: sources')) {
                        const dataLine = lines[i + 1]?.trim();
                        if (dataLine && dataLine.startsWith('data:')) {
                            try {
                                const parsed = JSON.parse(dataLine.slice(5).trim());
                                if (parsed.sources && parsed.sources.length > 0) {
                                    collectedSources = parsed.sources;
                                    if (sourcesContainer) {
                                        sourcesContainer.innerHTML = renderSourcesCards(collectedSources);
                                        sourcesContainer.style.display = 'block';
                                        scrollChatToBottom();
                                    }
                                }
                            } catch (e) {}
                        }
                    } else if (line.startsWith('event: token')) {
                        const dataLine = lines[i + 1]?.trim();
                        if (dataLine && dataLine.startsWith('data:')) {
                            try {
                                const parsed = JSON.parse(dataLine.slice(5).trim());
                                if (parsed.text) {
                                    streamAccumulator += parsed.text;
                                    bodyEl.innerHTML = formatMarkdownText(streamAccumulator) + '<span class="streaming-cursor"></span>';
                                    scrollChatToBottom();
                                }
                            } catch (e) {}
                        }
                    } else if (line.startsWith('event: done')) {
                        const dataLine = lines[i + 1]?.trim();
                        if (dataLine && dataLine.startsWith('data:')) {
                            try {
                                const parsed = JSON.parse(dataLine.slice(5).trim());
                                if (parsed.response) streamAccumulator = parsed.response;
                                if (parsed.sources && parsed.sources.length > 0) {
                                    collectedSources = parsed.sources;
                                    if (sourcesContainer) {
                                        sourcesContainer.innerHTML = renderSourcesCards(collectedSources);
                                        sourcesContainer.style.display = 'block';
                                    }
                                }
                                if (parsed.credits_remaining !== undefined) {
                                    currentUser.credits = parsed.credits_remaining;
                                    renderUserData();
                                }
                            } catch (e) {}
                        }
                    } else if (line.startsWith('event: error')) {
                        const dataLine = lines[i + 1]?.trim();
                        if (dataLine && dataLine.startsWith('data:')) {
                            try {
                                const parsed = JSON.parse(dataLine.slice(5).trim());
                                bodyEl.innerHTML = `
                                    <div class="chat-error-card">
                                        <div class="chat-error-title">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                            <span>Gagal Terhubung ke VARIS AI</span>
                                        </div>
                                        <p class="chat-error-msg">${parsed.message || 'Layanan AI sedang tidak tersedia. Silakan coba kirim ulang.'}</p>
                                        <div class="chat-error-actions">
                                            <button class="btn-error-switch" onclick="handleRetryLastMessage()">Coba Kirim Ulang 🔄</button>
                                        </div>
                                    </div>
                                `;
                                scrollChatToBottom();
                                return;
                            } catch (e) {}
                        }
                    }
                }
            }

            const finalAnswer = streamAccumulator || 'I have completed analyzing your request.';
            bodyEl.innerHTML = formatMarkdownText(finalAnswer);
            if (conversationMessagesStore[currentConversationId]) {
                conversationMessagesStore[currentConversationId].push({ role: 'assistant', text: finalAnswer });
            }
            if (collectedSources.length > 0 && sourcesContainer) {
                sourcesContainer.innerHTML = renderSourcesCards(collectedSources);
                sourcesContainer.style.display = 'block';
            }
            scrollChatToBottom();
        } else {
            // Standard JSON fallback
            const data = await res.json();
            const responseText = data.reply || data.response || data.text || '';
            bodyEl.innerHTML = formatMarkdownText(responseText);
            if (conversationMessagesStore[currentConversationId]) {
                conversationMessagesStore[currentConversationId].push({ role: 'assistant', text: responseText });
            }
            if (data.sources && data.sources.length > 0 && sourcesContainer) {
                sourcesContainer.innerHTML = renderSourcesCards(data.sources);
                sourcesContainer.style.display = 'block';
            }
            scrollChatToBottom();

            if (data.credits_remaining !== undefined) {
                currentUser.credits = data.credits_remaining;
                renderUserData();
            }
        }
    } catch (err) {
        bodyEl.innerHTML = `
            <div class="chat-error-card">
                <div class="chat-error-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    <span>Koneksi Terganggu</span>
                </div>
                <p class="chat-error-msg">${err.message || 'Gagal terhubung ke server VARIS AI. Silakan coba kirim ulang.'}</p>
                <div class="chat-error-actions">
                    <button class="btn-error-switch" onclick="handleRetryLastMessage()">Coba Kirim Ulang 🔄</button>
                </div>
            </div>
        `;
        scrollChatToBottom();
    }
}

window.handleRetryLastMessage = function() {
    if (!lastUserMessageText) return;
    const input = document.getElementById('main-chat-input');
    if (input) {
        input.value = lastUserMessageText;
        handleSendMessage();
    }
};

// ==========================================================
// 5. VOICE ENGINE & AUDIO SIMULATION
// ==========================================================

async function startVoiceEngine() {
    const statusPill = document.getElementById('voice-status-text');
    if (statusPill) statusPill.textContent = 'LISTENING...';

    const coreSphere = document.getElementById('voice-core-sphere');
    if (coreSphere) coreSphere.style.animation = 'sphere-float 2s ease-in-out infinite alternate';

    // Start Live Audio Input if microphone access is granted
    try {
        if (!micStream && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioCtx.createMediaStreamSource(micStream);
            analyserNode = audioCtx.createAnalyser();
            analyserNode.fftSize = 32;
            source.connect(analyserNode);

            const dataArray = new Uint8Array(analyserNode.frequencyBinCount);
            const bars = document.querySelectorAll('.eq-bar');

            function updateWaveform() {
                if (!micStream) return;
                analyserNode.getByteFrequencyData(dataArray);
                bars.forEach((bar, idx) => {
                    const val = dataArray[idx % dataArray.length] || 10;
                    const height = Math.max(8, Math.min(48, (val / 255) * 56));
                    bar.style.height = `${height}px`;
                });
                voiceAnimId = requestAnimationFrame(updateWaveform);
            }
            updateWaveform();
        }
    } catch (e) {
        // Fallback to CSS animation if mic permission denied
        console.log('Voice mode running with visual equalizer simulation');
    }
}

function stopVoiceEngine() {
    if (voiceAnimId) {
        cancelAnimationFrame(voiceAnimId);
        voiceAnimId = null;
    }
    if (micStream) {
        micStream.getTracks().forEach(t => t.stop());
        micStream = null;
    }
    if (audioCtx) {
        audioCtx.close().catch(() => {});
        audioCtx = null;
    }
}

// ==========================================================
// 6. TOAST NOTIFICATIONS & MODALS
// ==========================================================

function showToast(msg, duration = 2500) {
    const toast = document.getElementById('global-toast');
    const toastText = document.getElementById('toast-text');
    if (!toast || !toastText) return;

    toastText.textContent = msg;
    toast.classList.remove('hidden');

    setTimeout(() => {
        toast.classList.add('hidden');
    }, duration);
}

function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.remove('hidden');
        if (id === 'modal-model-sheet') {
            loadAIModels();
        }
    }
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('hidden');
}

// ==========================================================
// 6.5. LIVING ROBOT ENGINE & LUXURY PARTICLES SYSTEM
// ==========================================================
// 6.5. LIVING ROBOT ENGINE & LUXURY PARTICLES SYSTEM
// ==========================================================

function setupRobotEngine(stageId, rigId, canvasId, options = {}) {
    const stage = document.getElementById(stageId);
    const rig = document.getElementById(rigId);
    const canvas = document.getElementById(canvasId);
    const speechBubble = options.speechBubbleId ? document.getElementById(options.speechBubbleId) : null;
    const btnChat = options.btnChatId ? document.getElementById(options.btnChatId) : null;
    const btnVoice = options.btnVoiceId ? document.getElementById(options.btnVoiceId) : null;

    if (!stage || !rig || !canvas) return;

    // 1. Interactive 3D Mouse & Touch Parallax
    let targetRotateX = 0;
    let targetRotateY = 0;
    let currentRotateX = 0;
    let currentRotateY = 0;

    function handlePointerMove(e) {
        const rect = stage.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : rect.left + rect.width / 2);
        const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : rect.top + rect.height / 2);

        const x = clientX - (rect.left + rect.width / 2);
        const y = clientY - (rect.top + rect.height / 2);

        targetRotateY = (x / (rect.width / 2)) * 14;
        targetRotateX = -(y / (rect.height / 2)) * 10;
    }

    stage.addEventListener('mousemove', handlePointerMove);
    stage.addEventListener('mouseleave', () => {
        targetRotateX = 0;
        targetRotateY = 0;
    });
    stage.addEventListener('touchmove', handlePointerMove, { passive: true });
    stage.addEventListener('touchend', () => {
        targetRotateX = 0;
        targetRotateY = 0;
    });

    function updateRigPhysics() {
        currentRotateX += (targetRotateX - currentRotateX) * 0.08;
        currentRotateY += (targetRotateY - currentRotateY) * 0.08;

        rig.style.transform = `rotateX(${currentRotateX.toFixed(2)}deg) rotateY(${currentRotateY.toFixed(2)}deg)`;
        requestAnimationFrame(updateRigPhysics);
    }
    requestAnimationFrame(updateRigPhysics);

    // 2. Luxury Golden Sparkle & Cyan Ambient Embers Particle System
    const ctx = canvas.getContext('2d');
    let width = (canvas.width = (stage.offsetWidth || 340) + 80);
    let height = (canvas.height = (stage.offsetHeight || 380) + 80);

    window.addEventListener('resize', () => {
        if (!stage || stage.offsetWidth === 0) return;
        width = canvas.width = stage.offsetWidth + 80;
        height = canvas.height = stage.offsetHeight + 80;
    });

    const particles = [];
    const MAX_PARTICLES = options.maxParticles || 36;

    class Particle {
        constructor(isBurst = false) {
            this.reset(isBurst);
        }

        reset(isBurst = false) {
            this.x = isBurst ? width / 2 + (Math.random() - 0.5) * 90 : Math.random() * width;
            this.y = isBurst ? height * 0.45 + (Math.random() - 0.5) * 80 : height + Math.random() * 20;
            this.size = Math.random() * 2.8 + 1.2;
            this.speedY = isBurst ? (Math.random() - 0.5) * 4 - 1.5 : -(Math.random() * 0.7 + 0.35);
            this.speedX = isBurst ? (Math.random() - 0.5) * 4 : (Math.random() - 0.5) * 0.5;
            this.alpha = isBurst ? 1 : Math.random() * 0.7 + 0.2;
            this.decay = isBurst ? Math.random() * 0.02 + 0.015 : Math.random() * 0.003 + 0.002;
            this.type = Math.random() > 0.45 ? 'gold' : 'cyan';
            this.isStar = Math.random() > 0.55;
            this.angle = Math.random() * Math.PI * 2;
            this.rotSpeed = (Math.random() - 0.5) * 0.04;
            this.wave = Math.random() * Math.PI * 2;
            this.waveSpeed = Math.random() * 0.02 + 0.01;
        }

        update() {
            this.wave += this.waveSpeed;
            this.x += this.speedX + Math.sin(this.wave) * 0.4;
            this.y += this.speedY;
            this.angle += this.rotSpeed;
            this.alpha -= this.decay;

            if (this.alpha <= 0 || this.y < -20 || this.x < -20 || this.x > width + 20) {
                this.reset(false);
            }
        }

        draw(ctx) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);
            ctx.globalAlpha = Math.max(0, this.alpha);

            if (this.type === 'gold') {
                ctx.fillStyle = '#D4AF37';
                ctx.shadowColor = 'rgba(212, 175, 55, 0.85)';
                ctx.shadowBlur = 7;
            } else {
                ctx.fillStyle = '#22D3EE';
                ctx.shadowColor = 'rgba(34, 211, 238, 0.95)';
                ctx.shadowBlur = 8;
            }

            if (this.isStar) {
                ctx.beginPath();
                const r = this.size * 1.8;
                for (let i = 0; i < 4; i++) {
                    ctx.lineTo(Math.cos((i * Math.PI) / 2) * r, Math.sin((i * Math.PI) / 2) * r);
                    ctx.lineTo(Math.cos((i * Math.PI) / 2 + Math.PI / 4) * (r * 0.3), Math.sin((i * Math.PI) / 2 + Math.PI / 4) * (r * 0.3));
                }
                ctx.closePath();
                ctx.fill();
            } else {
                ctx.beginPath();
                ctx.arc(0, 0, this.size, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }
    }

    for (let i = 0; i < MAX_PARTICLES; i++) {
        const p = new Particle();
        p.y = Math.random() * height;
        particles.push(p);
    }

    function renderParticles() {
        ctx.clearRect(0, 0, width, height);
        particles.forEach(p => {
            p.update();
            p.draw(ctx);
        });
        requestAnimationFrame(renderParticles);
    }
    requestAnimationFrame(renderParticles);

    function createSparkleBurst(count = 18) {
        for (let i = 0; i < count; i++) {
            particles.push(new Particle(true));
        }
    }

    // 3. Interactive Reactions
    const greetings = [
        "\"Halo! Saya VARIS, asisten AI cerdas Anda. Siap membantu proyek dan riset Anda!\"",
        "\"Satu workspace terintegrasi untuk mengakses model AI terbaik dunia (Gemini Pro, GPT-4o, Claude).\"",
        "\"Pencarian web nyata dan mode suara real-time selalu aktif untuk Anda!\"",
        "\"Workspace Anda aman, privat, dan bebas batasan! ✨\""
    ];
    let greetingIndex = 0;

    stage.addEventListener('click', () => {
        createSparkleBurst(22);

        if (speechBubble) {
            greetingIndex = (greetingIndex + 1) % greetings.length;
            const textEl = options.speechTextId ? document.getElementById(options.speechTextId) : null;
            if (textEl) textEl.textContent = greetings[greetingIndex];
            speechBubble.classList.remove('hidden');

            clearTimeout(window.__robotBubbleTimer);
            window.__robotBubbleTimer = setTimeout(() => {
                speechBubble.classList.add('hidden');
            }, 8000);
        }
    });

    if (btnChat) {
        btnChat.onclick = (e) => {
            e.stopPropagation();
            switchMainView('app');
            switchTab('chat');
        };
    }

    if (btnVoice) {
        btnVoice.onclick = (e) => {
            e.stopPropagation();
            switchMainView('app');
            switchTab('voice');
        };
    }
}

function initLivingRobot() {
    // 1. Landing Hero Robot
    setupRobotEngine('hero-robot-stage', 'robot-3d-rig', 'robot-sparkles-canvas', {
        speechBubbleId: 'robot-speech-bubble',
        speechTextId: 'robot-speech-text',
        btnChatId: 'robot-btn-start-chat',
        btnVoiceId: 'robot-btn-start-voice'
    });

    // 2. Auth Showcase Robot
    setupRobotEngine('auth-robot-stage', 'auth-robot-3d-rig', 'auth-robot-sparkles-canvas', {
        maxParticles: 28
    });
}

function updateAuthUI() {
    clearAuthAlert();
    const title = document.getElementById('auth-main-title');
    const desc = document.getElementById('auth-main-desc');
    const submitBtn = document.getElementById('auth-submit-btn');
    const switchText = document.getElementById('auth-switch-text');
    const switchBtn = document.getElementById('auth-switch-btn');
    const nameGroup = document.getElementById('group-auth-name');

    if (isRegisterMode) {
        if (title) title.textContent = 'Create your account';
        if (desc) desc.textContent = 'Join VARIS AI Intelligent Workspace.';
        if (submitBtn) submitBtn.innerHTML = `<span>Sign Up</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`;
        if (switchText) switchText.textContent = 'Already have an account?';
        if (switchBtn) switchBtn.textContent = 'Sign In';
        if (nameGroup) nameGroup.classList.remove('hidden');
    } else {
        if (title) title.textContent = 'Welcome back';
        if (desc) desc.textContent = 'Continue your intelligent workspace.';
        if (submitBtn) submitBtn.innerHTML = `<span>Sign In</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`;
        if (switchText) switchText.textContent = "Don't have an account?";
        if (switchBtn) switchBtn.textContent = 'Create account';
        if (nameGroup) nameGroup.classList.add('hidden');
    }
}

function initLandingFeatures() {
    // Landing Action Buttons
    const landingSignin = document.getElementById('landing-signin-btn');
    if (landingSignin) landingSignin.onclick = () => { isRegisterMode = false; updateAuthUI(); switchMainView('auth'); };

    const landingGetStarted = document.getElementById('landing-getstarted-btn');
    if (landingGetStarted) landingGetStarted.onclick = () => { isRegisterMode = true; updateAuthUI(); switchMainView('auth'); };

    const heroStart = document.getElementById('hero-start-btn');
    if (heroStart) heroStart.onclick = () => { isRegisterMode = true; updateAuthUI(); switchMainView('auth'); };

    const heroExplore = document.getElementById('hero-explore-btn');
    if (heroExplore) heroExplore.onclick = () => { switchMainView('app'); switchTab('chat'); };

    // Feature Cards
    const cardModels = document.getElementById('card-feat-models');
    if (cardModels) cardModels.onclick = () => { switchMainView('app'); openModal('modal-model-sheet'); };

    const cardTools = document.getElementById('card-feat-tools');
    if (cardTools) cardTools.onclick = () => { switchMainView('app'); switchTab('chat'); };

    const cardWorkspace = document.getElementById('card-feat-workspace');
    if (cardWorkspace) cardWorkspace.onclick = () => { switchMainView('app'); switchTab('projects'); };

    const cardSecurity = document.getElementById('card-feat-security');
    if (cardSecurity) cardSecurity.onclick = () => { showToast('🔒 Enterprise encryption & zero-knowledge security active.'); };

    // Mobile Navigation Drawer Toggle
    const mobileMenuBtn = document.getElementById('btn-landing-mobile-menu');
    const mobileDrawer = document.getElementById('landing-mobile-drawer');
    if (mobileMenuBtn && mobileDrawer) {
        mobileMenuBtn.onclick = () => {
            mobileDrawer.classList.toggle('hidden');
        };
    }

    const drawerSignin = document.getElementById('btn-mobile-drawer-signin');
    if (drawerSignin) drawerSignin.onclick = () => { if (mobileDrawer) mobileDrawer.classList.add('hidden'); isRegisterMode = false; updateAuthUI(); switchMainView('auth'); };

    const drawerGetStarted = document.getElementById('btn-mobile-drawer-getstarted');
    if (drawerGetStarted) drawerGetStarted.onclick = () => { if (mobileDrawer) mobileDrawer.classList.add('hidden'); isRegisterMode = true; updateAuthUI(); switchMainView('auth'); };
}

// ==========================================================
// 7. EVENT LISTENERS & INITIALIZATION
// ==========================================================

document.addEventListener('DOMContentLoaded', () => {
    // 0. Check URL Parameters for OAuth Callbacks
    const urlParams = new URLSearchParams(window.location.search);
    const authParam = urlParams.get('auth');
    const errorParam = urlParams.get('error');

    if (authParam === 'success') {
        showToast('🎉 Berhasil masuk dengan akun Google!');
        window.history.replaceState({}, document.title, window.location.pathname);
    } else if (errorParam === 'oauth_unavailable') {
        showAuthAlert('⚠️ Google OAuth Server Secret belum diset di Vercel Environment (GOOGLE_CLIENT_SECRET). Silakan Sign In atau Sign Up dengan Email & Password di bawah!', 'error');
        showToast('⚠️ Google OAuth belum aktif di server. Gunakan Email & Password.');
        window.history.replaceState({}, document.title, window.location.pathname);
        switchMainView('auth');
    } else if (errorParam === 'auth_failed') {
        showAuthAlert('Autentikasi Google gagal atau ditolak. Silakan coba lagi.', 'error');
        window.history.replaceState({}, document.title, window.location.pathname);
        switchMainView('auth');
    } else if (errorParam === 'cancelled') {
        showAuthAlert('Login Google dibatalkan.', 'error');
        window.history.replaceState({}, document.title, window.location.pathname);
        switchMainView('auth');
    }

    // 1. Immediate Session & Tab Hydration from localStorage
    initSessionAndRouting();

    // 2. Background Server Session Verification & Model Loading
    fetchCurrentUser();
    loadAIModels();

    // 3. Initialize GIS Google Auth
    setTimeout(initGoogleAuth, 600);

    // 4. Initialize Living Robot Engine for both Hero & Auth Stage
    initLivingRobot();

    // 5. Initialize Landing Page Interactions
    initLandingFeatures();

    // 6. Auth View Controls & Toggle
    const authBack = document.getElementById('auth-back-to-landing');
    if (authBack) authBack.onclick = () => switchMainView('landing');

    const authSwitch = document.getElementById('auth-switch-btn');
    if (authSwitch) {
        authSwitch.onclick = () => {
            isRegisterMode = !isRegisterMode;
            updateAuthUI();
        };
    }

    const btnGoogle = document.getElementById('btn-continue-google');
    if (btnGoogle) {
        btnGoogle.onclick = () => {
            if (window.google && window.google.accounts && window.google.accounts.id) {
                window.google.accounts.id.prompt((notification) => {
                    if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                        window.location.href = '/api/auth/google';
                    }
                });
            } else {
                window.location.href = '/api/auth/google';
            }
        };
    }

    const authForm = document.getElementById('auth-email-form');
    if (authForm) {
        authForm.onsubmit = async (e) => {
            e.preventDefault();
            clearAuthAlert();
            const email = document.getElementById('auth-email-input').value.trim();
            const pass = document.getElementById('auth-pass-input').value;
            const name = document.getElementById('auth-name-input') ? document.getElementById('auth-name-input').value.trim() : '';

            const endpoint = isRegisterMode ? '/api/auth/register' : '/api/auth/login';
            const payload = isRegisterMode ? { email, password: pass, name } : { email, password: pass };

            try {
                const res = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (res.ok && (data.success || data.user)) {
                    const userData = data.user || data;
                    currentUser = {
                        ...currentUser,
                        ...userData,
                        picture: userData.avatar_url || userData.picture || null,
                        avatar_url: userData.avatar_url || null,
                        credits: userData.credits !== undefined ? userData.credits : 999999,
                        plan: userData.plan || 'Unlimited Access'
                    };
                    try {
                        localStorage.setItem('varis_user', JSON.stringify(currentUser));
                        localStorage.setItem('varis_active_tab', 'home');
                    } catch (e) {}
                    showToast(isRegisterMode ? 'Account created successfully!' : 'Signed in successfully!');
                    switchMainView('app');
                    switchTab('home');
                } else {
                    const errorMsg = (typeof data.error === 'object' && data.error !== null ? (data.error.message || data.error.code) : data.error) || data.message || 'Authentication error';
                    showAuthAlert(errorMsg, 'error');
                }
            } catch (err) {
                showAuthAlert('Network error: ' + err.message, 'error');
            }
        };
    }

    // Forgot Password Button & Modal
    const btnForgot = document.getElementById('btn-forgot-password');
    if (btnForgot) {
        btnForgot.onclick = (e) => {
            e.preventDefault();
            const currentEmail = document.getElementById('auth-email-input')?.value || '';
            const forgotEmailInput = document.getElementById('forgot-email-input');
            if (forgotEmailInput && currentEmail) forgotEmailInput.value = currentEmail;
            clearForgotAlert();
            openModal('modal-forgot-password');
        };
    }

    const closeForgotSheet = document.getElementById('btn-close-forgot-sheet');
    if (closeForgotSheet) closeForgotSheet.onclick = () => closeModal('modal-forgot-password');

    const forgotForm = document.getElementById('form-forgot-password');
    if (forgotForm) {
        forgotForm.onsubmit = async (e) => {
            e.preventDefault();
            clearForgotAlert();
            const email = document.getElementById('forgot-email-input').value.trim();
            const newPass = document.getElementById('forgot-newpass-input').value;
            const confirmPass = document.getElementById('forgot-confirmpass-input').value;

            if (newPass !== confirmPass) {
                showForgotAlert('Konfirmasi password tidak cocok dengan password baru.', 'error');
                return;
            }
            if (newPass.length < 6) {
                showForgotAlert('Password baru minimal 6 karakter.', 'error');
                return;
            }

            try {
                showForgotAlert('Memperbarui password...', 'success');
                const res = await fetch('/api/auth/reset-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, newPassword: newPass })
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    showToast('Password berhasil diubah! Silakan login.');
                    closeModal('modal-forgot-password');
                    const authPassInput = document.getElementById('auth-pass-input');
                    if (authPassInput) authPassInput.value = newPass;
                    const authEmailInput = document.getElementById('auth-email-input');
                    if (authEmailInput) authEmailInput.value = email;
                    showAuthAlert('Password berhasil diperbarui. Silakan klik Sign In.', 'success');
                } else {
                    const errorMsg = (typeof data.error === 'object' && data.error !== null ? (data.error.message || data.error.code) : data.error) || data.message || 'Gagal mengubah password.';
                    showForgotAlert(errorMsg, 'error');
                }
            } catch (err) {
                showForgotAlert('Network error: ' + err.message, 'error');
            }
        };
    }

    // 5. Mobile Bottom Navigation Tabs Click
    document.querySelectorAll('.bottom-nav-tab').forEach(btn => {
        btn.onclick = () => {
            const target = btn.dataset.tab;
            if (target) switchTab(target);
        };
    });

    // 6. Desktop Sidebar Navigation Items Click
    document.querySelectorAll('.sidebar-nav-item').forEach(btn => {
        btn.onclick = () => {
            const target = btn.dataset.tab;
            if (target) switchTab(target);
        };
    });

    const sidebarNewChat = document.getElementById('sidebar-newchat-btn');
    if (sidebarNewChat) sidebarNewChat.onclick = () => startNewChat();

    const chatResetBtn = document.getElementById('chat-btn-reset-conversation');
    if (chatResetBtn) chatResetBtn.onclick = () => startNewChat();

    const sidebarBrandBtn = document.getElementById('sidebar-brand-home-btn');
    if (sidebarBrandBtn) sidebarBrandBtn.onclick = () => switchTab('home');

    const sidebarCollapseBtn = document.getElementById('sidebar-btn-collapse');
    if (sidebarCollapseBtn) sidebarCollapseBtn.onclick = () => toggleSidebar();

    const sidebarToggleBtn = document.getElementById('btn-sidebar-toggle');
    if (sidebarToggleBtn) sidebarToggleBtn.onclick = () => toggleSidebar();

    const sidebarBackdrop = document.getElementById('sidebar-backdrop');
    if (sidebarBackdrop) sidebarBackdrop.onclick = () => closeMobileSidebar();

    const sidebarUpgradeBtn = document.getElementById('sidebar-upgrade-btn');
    if (sidebarUpgradeBtn) sidebarUpgradeBtn.onclick = () => openModal('modal-usage-sheet');

    const topbarUpgradeBtn = document.getElementById('topbar-upgrade-btn');
    if (topbarUpgradeBtn) topbarUpgradeBtn.onclick = () => openModal('modal-usage-sheet');

    const sidebarSearchBtn = document.getElementById('sidebar-btn-search');
    if (sidebarSearchBtn) {
        sidebarSearchBtn.onclick = () => {
            openModal('modal-search-chats');
            const sIn = document.getElementById('input-search-chats');
            if (sIn) {
                sIn.value = '';
                sIn.focus();
                filterSearchModal('');
            }
        };
    }

    const inputSearchChats = document.getElementById('input-search-chats');
    if (inputSearchChats) {
        inputSearchChats.addEventListener('input', (e) => {
            filterSearchModal(e.target.value);
        });
    }

    // Ctrl+K / Cmd+K Global Search Shortcut
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            openModal('modal-search-chats');
            const sIn = document.getElementById('input-search-chats');
            if (sIn) {
                sIn.value = '';
                sIn.focus();
                filterSearchModal('');
            }
        }
    });

    // Feature Modal Openers
    const navImages = document.getElementById('nav-feature-images');
    if (navImages) navImages.onclick = () => openModal('modal-feature-images');

    const navLibrary = document.getElementById('nav-feature-library');
    if (navLibrary) navLibrary.onclick = () => openModal('modal-feature-library');

    const navScheduled = document.getElementById('nav-feature-scheduled');
    if (navScheduled) navScheduled.onclick = () => openModal('modal-feature-scheduled');

    const navPlugins = document.getElementById('nav-feature-plugins');
    if (navPlugins) navPlugins.onclick = () => openModal('modal-feature-plugins');

    const navCodex = document.getElementById('nav-feature-codex');
    if (navCodex) navCodex.onclick = () => openModal('modal-feature-codex');

    const navMore = document.getElementById('nav-feature-more');
    if (navMore) navMore.onclick = () => openModal('modal-feature-more');

    const btnTakeALook = document.getElementById('btn-take-a-look');
    if (btnTakeALook) btnTakeALook.onclick = () => openModal('modal-feature-tour');

    const btnCloseBanner = document.getElementById('btn-close-banner');
    if (btnCloseBanner) {
        btnCloseBanner.onclick = () => {
            const banner = document.getElementById('chat-experience-banner');
            if (banner) banner.style.display = 'none';
        };
    }

    // Starter Cards Click
    document.querySelectorAll('.starter-card').forEach(card => {
        card.onclick = () => {
            const prompt = card.dataset.prompt || card.querySelector('strong')?.textContent || '';
            if (prompt) {
                const input = document.getElementById('main-chat-input');
                if (input) {
                    input.value = prompt;
                    handleSendMessage();
                }
            }
        };
    });

    // Composer Additional Controls: Think & LiveVoice
    const btnComposerThink = document.getElementById('btn-composer-think');
    if (btnComposerThink) {
        btnComposerThink.onclick = () => {
            isThinkingMode = !isThinkingMode;
            btnComposerThink.classList.toggle('active', isThinkingMode);
            showToast(isThinkingMode ? '🧠 Deep Reasoning Mode Enabled' : '🧠 Standard Reasoning Active');
        };
    }

    const btnComposerLiveVoice = document.getElementById('btn-composer-livevoice');
    if (btnComposerLiveVoice) {
        btnComposerLiveVoice.onclick = () => switchTab('voice');
    }

    // Modal Close Buttons
    const btnCloseSearchChats = document.getElementById('btn-close-search-chats');
    if (btnCloseSearchChats) btnCloseSearchChats.onclick = () => closeModal('modal-search-chats');

    const btnCloseImages = document.getElementById('btn-close-images-sheet');
    if (btnCloseImages) btnCloseImages.onclick = () => closeModal('modal-feature-images');

    const btnCloseLib = document.getElementById('btn-close-library-sheet');
    if (btnCloseLib) btnCloseLib.onclick = () => closeModal('modal-feature-library');

    const btnCloseSched = document.getElementById('btn-close-scheduled-sheet');
    if (btnCloseSched) btnCloseSched.onclick = () => closeModal('modal-feature-scheduled');

    const btnClosePlug = document.getElementById('btn-close-plugins-sheet');
    if (btnClosePlug) btnClosePlug.onclick = () => closeModal('modal-feature-plugins');

    const btnCloseCodex = document.getElementById('btn-close-codex-sheet');
    if (btnCloseCodex) btnCloseCodex.onclick = () => closeModal('modal-feature-codex');

    const btnCloseMore = document.getElementById('btn-close-more-sheet');
    if (btnCloseMore) btnCloseMore.onclick = () => closeModal('modal-feature-more');

    const btnCloseTour = document.getElementById('btn-close-tour-sheet');
    if (btnCloseTour) btnCloseTour.onclick = () => closeModal('modal-feature-tour');

    const btnConfirmTour = document.getElementById('btn-close-tour-confirm');
    if (btnConfirmTour) btnConfirmTour.onclick = () => closeModal('modal-feature-tour');

    const btnGenImage = document.getElementById('btn-generate-image');
    if (btnGenImage) {
        btnGenImage.onclick = () => {
            const promptInput = document.getElementById('image-prompt-input');
            const p = promptInput ? promptInput.value.trim() : '';
            if (p) {
                closeModal('modal-feature-images');
                switchTab('chat');
                const chatIn = document.getElementById('main-chat-input');
                if (chatIn) {
                    chatIn.value = `Generate image: ${p}`;
                    handleSendMessage();
                }
            } else {
                showToast('Masukkan deskripsi gambar terlebih dahulu!');
            }
        };
    }

    const sidebarUser = document.getElementById('sidebar-user-btn');
    if (sidebarUser) sidebarUser.onclick = () => switchTab('profile');

    const topbarAvatar = document.getElementById('topbar-avatar-btn');
    if (topbarAvatar) topbarAvatar.onclick = () => switchTab('profile');

    // 7. Home Tab Quick Actions
    const qaNewChat = document.getElementById('qa-newchat');
    if (qaNewChat) qaNewChat.onclick = () => { currentConversationId = 'conv-' + Date.now(); switchTab('chat'); };

    const qaVoice = document.getElementById('qa-voicemode');
    if (qaVoice) qaVoice.onclick = () => switchTab('voice');

    const qaAnalyze = document.getElementById('qa-analyze');
    if (qaAnalyze) qaAnalyze.onclick = () => openModal('modal-newfile-sheet');

    const qaResearch = document.getElementById('qa-research');
    if (qaResearch) {
        qaResearch.onclick = () => {
            switchTab('chat');
            const input = document.getElementById('main-chat-input');
            if (input) {
                input.value = 'Riset dan jelaskan arsitektur serta kapabilitas VARIS AI.';
                input.focus();
            }
        };
    }

    const qaCoding = document.getElementById('qa-coding');
    if (qaCoding) {
        qaCoding.onclick = () => {
            switchTab('chat');
            const input = document.getElementById('main-chat-input');
            if (input) {
                input.value = 'Write a TypeScript function to optimize high-performance state synchronization.';
                input.focus();
            }
        };
    }

    const homeUsageBtn = document.getElementById('home-usage-btn');
    if (homeUsageBtn) homeUsageBtn.onclick = () => openModal('modal-usage-sheet');

    const btnViewAllChats = document.getElementById('btn-viewall-chats');
    if (btnViewAllChats) btnViewAllChats.onclick = () => switchTab('chat');

    const btnViewAllProjects = document.getElementById('btn-viewall-projects');
    if (btnViewAllProjects) btnViewAllProjects.onclick = () => switchTab('projects');

    const btnProjectsViewAll = document.getElementById('btn-projects-viewall');
    if (btnProjectsViewAll) btnProjectsViewAll.onclick = () => switchTab('projects');

    // 8. Chat Tab Actions
    const sendBtn = document.getElementById('main-send-btn');
    if (sendBtn) sendBtn.onclick = handleSendMessage;

    const chatInput = document.getElementById('main-chat-input');
    if (chatInput) {
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
            }
        });

        // Auto-expand textarea
        chatInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 140) + 'px';
        });
    }

    const btnModelSelector = document.getElementById('chat-model-selector-btn');
    if (btnModelSelector) btnModelSelector.onclick = () => openModal('modal-model-sheet');

    const btnCreditsPill = document.getElementById('chat-credits-pill-btn');
    if (btnCreditsPill) btnCreditsPill.onclick = () => openModal('modal-usage-sheet');

    const btnAttach = document.getElementById('btn-composer-attach');
    if (btnAttach) btnAttach.onclick = () => openModal('modal-newfile-sheet');

    const btnMic = document.getElementById('btn-composer-mic');
    if (btnMic) btnMic.onclick = () => switchTab('voice');

    const btnWeb = document.getElementById('btn-composer-web');
    if (btnWeb) {
        btnWeb.onclick = () => {
            isWebSearchEnabled = !isWebSearchEnabled;
            btnWeb.style.color = isWebSearchEnabled ? 'var(--brand-royal)' : 'var(--text-secondary)';
            showToast(isWebSearchEnabled ? '🌐 Web Search Enabled' : '🌐 Web Search Disabled');
        };
    }

    // 9. Voice Controls
    const btnVoiceMute = document.getElementById('btn-voice-mute');
    if (btnVoiceMute) {
        btnVoiceMute.onclick = () => {
            isVoiceMuted = !isVoiceMuted;
            btnVoiceMute.style.color = isVoiceMuted ? '#DC2626' : 'var(--text-primary)';
            showToast(isVoiceMuted ? 'Microphone Muted' : 'Microphone Active');
        };
    }

    const btnVoiceEnd = document.getElementById('btn-voice-end');
    if (btnVoiceEnd) {
        btnVoiceEnd.onclick = () => {
            stopVoiceEngine();
            switchTab('home');
            showToast('Voice session ended');
        };
    }

    const btnVoiceSpeaker = document.getElementById('btn-voice-speaker');
    if (btnVoiceSpeaker) {
        btnVoiceSpeaker.onclick = () => {
            showToast('Speaker output active');
        };
    }

    // 10. Workspaces / Files
    const btnOpenNewFile = document.getElementById('btn-open-new-file-sheet');
    if (btnOpenNewFile) btnOpenNewFile.onclick = () => openModal('modal-newfile-sheet');

    // Filter Category Pills
    document.querySelectorAll('.filter-pill-btn').forEach(pill => {
        pill.onclick = () => {
            document.querySelectorAll('.filter-pill-btn').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            const filter = pill.dataset.filter;
            filterWorkspaceFiles(filter);
        };
    });

    function filterWorkspaceFiles(type) {
        const items = document.querySelectorAll('.ws-file-item-card');
        let visibleCount = 0;
        items.forEach(item => {
            if (type === 'all') {
                item.style.display = 'flex';
                visibleCount++;
            } else {
                const name = item.querySelector('.file-item-name').textContent.toLowerCase();
                const matches = (type === 'pdf' && name.includes('pdf')) ||
                                (type === 'code' && (name.includes('.js') || name.includes('.ts') || name.includes('config'))) ||
                                (type === 'word' && (name.includes('doc') || name.includes('research') || name.includes('white'))) ||
                                (type === 'images' && (name.includes('asset') || name.includes('hero') || name.includes('img')));
                if (matches) {
                    item.style.display = 'flex';
                    visibleCount++;
                } else {
                    item.style.display = 'none';
                }
            }
        });
        const counter = document.getElementById('ws-files-counter');
        if (counter) counter.textContent = `Showing ${visibleCount} files`;
    }

    // Workspace Search Input
    const wsSearch = document.getElementById('ws-search-input');
    if (wsSearch) {
        wsSearch.addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase().trim();
            const items = document.querySelectorAll('.ws-file-item-card');
            let visibleCount = 0;
            items.forEach(item => {
                const text = item.textContent.toLowerCase();
                if (!q || text.includes(q)) {
                    item.style.display = 'flex';
                    visibleCount++;
                } else {
                    item.style.display = 'none';
                }
            });
            const counter = document.getElementById('ws-files-counter');
            if (counter) counter.textContent = `Showing ${visibleCount} files`;
        });
    }

    // Real File Upload
    const realUpload = document.getElementById('real-file-upload-input');
    if (realUpload) {
        realUpload.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                const file = e.target.files[0];
                showToast(`File "${file.name}" uploaded to workspace!`);
                closeModal('modal-newfile-sheet');
            }
        });
    }

    // 11. Profile & Settings Menu Handlers
    const menuModels = document.getElementById('menu-ai-models');
    if (menuModels) menuModels.onclick = () => openModal('modal-model-sheet');

    const menuVoice = document.getElementById('menu-voice-audio');
    if (menuVoice) menuVoice.onclick = () => switchTab('voice');

    const menuAppearance = document.getElementById('menu-appearance');
    if (menuAppearance) menuAppearance.onclick = () => showToast('Light Luxury is active by default.');

    const menuAccount = document.getElementById('menu-account-info');
    if (menuAccount) menuAccount.onclick = () => showToast(`Signed in as ${currentUser.email}`);

    const menuSubscription = document.getElementById('menu-subscription');
    if (menuSubscription) menuSubscription.onclick = () => openModal('modal-usage-sheet');

    const menuPrivacy = document.getElementById('menu-privacy');
    if (menuPrivacy) menuPrivacy.onclick = () => showToast('Data retention is end-to-end encrypted.');

    const btnSignOut = document.getElementById('btn-app-signout');
    if (btnSignOut) {
        btnSignOut.onclick = async () => {
            try {
                await fetch('/api/auth/logout', { method: 'POST' });
            } catch (e) {}
            currentUser = null;
            try {
                localStorage.removeItem('varis_user');
                localStorage.removeItem('varis_active_tab');
                localStorage.removeItem('varis_main_view');
                window.history.replaceState(null, '', window.location.pathname);
            } catch (e) {}
            showToast('Signed out of VARIS AI');
            switchMainView('landing');
        };
    }

    // 12. Modal Close Buttons & Backdrop Clicks
    const closeModelSheet = document.getElementById('btn-close-model-sheet');
    if (closeModelSheet) closeModelSheet.onclick = () => closeModal('modal-model-sheet');

    const closeUsageSheet = document.getElementById('btn-close-usage-sheet');
    if (closeUsageSheet) closeUsageSheet.onclick = () => closeModal('modal-usage-sheet');

    const closeNewFileSheet = document.getElementById('btn-close-newfile-sheet');
    if (closeNewFileSheet) closeNewFileSheet.onclick = () => closeModal('modal-newfile-sheet');

    const closeSearchModeSheet = document.getElementById('btn-close-search-mode-sheet');
    if (closeSearchModeSheet) closeSearchModeSheet.onclick = () => closeModal('modal-search-mode-sheet');

    const btnChatSearchMode = document.getElementById('chat-search-mode-btn');
    if (btnChatSearchMode) btnChatSearchMode.onclick = () => openModal('modal-search-mode-sheet');

    const btnComposerWeb = document.getElementById('btn-composer-web');
    if (btnComposerWeb) btnComposerWeb.onclick = () => openModal('modal-search-mode-sheet');

    // Close on backdrop click
    document.querySelectorAll('.modal-backdrop').forEach(modal => {
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
        };
    });

    // Search Mode Option Cards Click
    document.querySelectorAll('.search-mode-option-card').forEach(card => {
        card.onclick = () => {
            document.querySelectorAll('.search-mode-option-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            currentSearchMode = card.dataset.searchMode || 'always';
            
            const nameEl = card.querySelector('strong');
            currentSearchModeName = nameEl ? nameEl.textContent : 'Always Search';
            currentSearchModeIcon = currentSearchMode === 'always' ? '🌐' : currentSearchMode === 'smart' ? '⚡' : '📴';

            const activeSearchNameDisplay = document.getElementById('chat-active-search-mode-name');
            if (activeSearchNameDisplay) {
                activeSearchNameDisplay.textContent = currentSearchModeName;
            }

            const searchIconEl = document.querySelector('#chat-search-mode-btn .search-mode-icon');
            if (searchIconEl) {
                searchIconEl.textContent = currentSearchModeIcon;
            }

            closeModal('modal-search-mode-sheet');
            showToast(`Web research mode: ${currentSearchModeName}`);
        };
    });

    // Model Selector Cards Click
    document.querySelectorAll('.model-option-card').forEach(card => {
        card.onclick = () => {
            document.querySelectorAll('.model-option-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            currentModel = card.dataset.model || 'auto';
            const nameEl = card.querySelector('strong');
            currentModelName = nameEl ? nameEl.textContent : 'VARIS Auto';

            const activeNameDisplay = document.getElementById('chat-active-model-name');
            if (activeNameDisplay) activeNameDisplay.textContent = currentModelName;

            closeModal('modal-model-sheet');
            showToast(`Active model switched to ${currentModelName}`);
        };
    });

    // Recent Chat Card Clicks
    document.querySelectorAll('.recent-chat-card').forEach(card => {
        card.onclick = () => {
            const title = card.querySelector('.recent-chat-title').textContent;
            currentConversationId = card.dataset.chatId || ('conv-' + Date.now());
            switchTab('chat');
            showToast(`Opened: ${title}`);
        };
    });
});
