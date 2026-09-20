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
    name: 'VARIS User',
    email: '',
    picture: null,
    avatar_url: null,
    plan: 'Free Tier',
    credits: 2450,
    creditsMax: 3000
};
let currentModel = 'auto';
let currentModelName = 'VARIS Auto';
let currentConversationId = 'conv-' + Date.now();
let isRegisterMode = false;
let isVoiceMuted = false;
let isWebSearchEnabled = false;

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
    }
}

function switchTab(tabName) {
    activeTab = tabName;

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

    const firstName = currentUser.name ? currentUser.name.split(' ')[0] : 'User';
    const photoUrl = currentUser.picture || currentUser.avatar_url || null;

    // 1. Home Tab Elements
    const homeName = document.getElementById('home-user-name');
    if (homeName) homeName.textContent = firstName;

    const homeBalance = document.getElementById('home-balance-display');
    if (homeBalance) homeBalance.textContent = `${Number(currentUser.credits).toLocaleString()} Credits`;

    const homeAllocPct = document.getElementById('home-allocation-pct');
    const homeFill = document.getElementById('home-balance-progress-fill');
    const pct = Math.min(100, Math.round((currentUser.credits / (currentUser.creditsMax || 3000)) * 100));
    if (homeAllocPct) homeAllocPct.textContent = `${pct}% remaining`;
    if (homeFill) homeFill.style.width = `${pct}%`;

    // 2. Chat Tab Elements
    const chatCredits = document.getElementById('chat-credits-display');
    if (chatCredits) chatCredits.textContent = `${Number(currentUser.credits).toLocaleString()} / ${Number(currentUser.creditsMax || 3000).toLocaleString()} credits`;

    const chatModelName = document.getElementById('chat-active-model-name');
    if (chatModelName) chatModelName.textContent = currentModelName;

    // 3. Profile Tab Elements
    const profileName = document.getElementById('profile-display-name');
    if (profileName) profileName.textContent = currentUser.name || 'VARIS User';

    const profileEmail = document.getElementById('profile-display-email');
    if (profileEmail) profileEmail.textContent = currentUser.email || '';

    const profileCredits = document.getElementById('profile-credits-numbers');
    if (profileCredits) profileCredits.textContent = `${Number(currentUser.credits).toLocaleString()} / 10,000`;

    const profileFill = document.getElementById('profile-progress-fill');
    if (profileFill) profileFill.style.width = `${Math.min(100, Math.round((currentUser.credits / 10000) * 100))}%`;

    const profilePhoto = document.getElementById('profile-user-photo');
    const profileFallback = document.getElementById('profile-avatar-fallback');
    if (photoUrl && profilePhoto) {
        profilePhoto.src = photoUrl;
        profilePhoto.style.display = 'block';
        if (profileFallback) profileFallback.style.display = 'none';
    } else {
        if (profilePhoto) profilePhoto.style.display = 'none';
        if (profileFallback) {
            profileFallback.innerHTML = DEFAULT_AVATAR_SVG;
            profileFallback.style.display = 'flex';
        }
    }

    // 4. Sidebar & Topbar Badges
    const topAvatar = document.getElementById('topbar-avatar-badge');
    if (topAvatar) {
        if (photoUrl) {
            topAvatar.innerHTML = `<img src="${photoUrl}" alt="Avatar" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
        } else {
            topAvatar.innerHTML = DEFAULT_AVATAR_SVG;
        }
    }

    const sideAvatar = document.getElementById('sidebar-user-avatar');
    if (sideAvatar) {
        if (photoUrl) {
            sideAvatar.innerHTML = `<img src="${photoUrl}" alt="Avatar" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
        } else {
            sideAvatar.innerHTML = DEFAULT_AVATAR_SVG;
        }
    }

    const sideName = document.getElementById('sidebar-user-name');
    if (sideName) sideName.textContent = currentUser.name || 'VARIS User';

    const sidePlan = document.getElementById('sidebar-user-plan');
    if (sidePlan) sidePlan.textContent = currentUser.plan || 'Free Tier';
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
                    credits: (data.subscription && data.subscription.credits_balance !== undefined) ? data.subscription.credits_balance : (data.user.credits !== undefined ? data.user.credits : 2450),
                    plan: data.subscription?.plan_name || (data.user.tier ? (data.user.tier.charAt(0).toUpperCase() + data.user.tier.slice(1) + ' Tier') : 'Free Tier')
                };
                switchMainView('app');
                return;
            }
        }
    } catch (e) {
        console.warn('Authentication check notice:', e);
    }
    // Default to Landing if not authenticated
    switchMainView('landing');
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
                credits: userData.credits !== undefined ? userData.credits : 2450
            };
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
        tag.textContent = 'FRONTIER AI MODELS';
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
        <span class="model-credit-badge">${model.credit_cost_per_request || 3} Credits</span>
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
            <div class="ai-message-body">${formatMarkdownText(initialText)}</div>
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

    // Parse inline code `code`
    formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Parse bold **text**
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

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

    input.value = '';
    input.style.height = 'auto';

    const feed = document.getElementById('chat-messages-feed');
    if (!feed) return;

    // 1. Append User Message
    const userRow = createUserMessageElement(text);
    feed.appendChild(userRow);
    scrollChatToBottom();

    // 2. Append AI Message Placeholder with streaming cursor
    const aiRow = createAIMessageElement('');
    feed.appendChild(aiRow);
    scrollChatToBottom();
    const bodyEl = aiRow.querySelector('.ai-message-body');
    bodyEl.innerHTML = '<span class="streaming-cursor"></span>';

    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'text/event-stream, application/json'
            },
            body: JSON.stringify({
                message: text,
                model: currentModel,
                conversation_id: currentConversationId,
                stream: true,
                web_search: isWebSearchEnabled
            })
        });

        const contentType = res.headers.get('content-type') || '';

        // Error handling for non-stream error responses
        if (!res.ok && !contentType.includes('text/event-stream')) {
            const errData = await res.json().catch(() => ({}));
            let errorMsg = 'AI service is temporarily unavailable.';
            let errorCode = 'SERVER_ERROR';
            if (typeof errData.error === 'object' && errData.error !== null) {
                errorMsg = errData.error.message || errorMsg;
                errorCode = errData.error.code || errorCode;
            } else if (typeof errData.error === 'string') {
                errorMsg = errData.error;
            } else if (errData.message) {
                errorMsg = errData.message;
            }

            bodyEl.innerHTML = `
                <div class="chat-error-card">
                    <div class="chat-error-title">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        <span>${errorCode === 'AI_NOT_CONFIGURED' ? 'Model Belum Dikonfigurasi' : 'AI Service Unavailable'}</span>
                    </div>
                    <p class="chat-error-msg">${errorMsg}</p>
                    <div class="chat-error-actions">
                        <button class="btn-error-switch" onclick="openModal('modal-model-sheet')">Ganti Model AI</button>
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

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop(); // Retain incomplete line

                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (line.startsWith('event: token')) {
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
                                            <span>${parsed.code === 'AI_NOT_CONFIGURED' ? 'Model Belum Dikonfigurasi' : 'AI Service Unavailable'}</span>
                                        </div>
                                        <p class="chat-error-msg">${parsed.message || 'Layanan AI sedang tidak tersedia.'}</p>
                                        <div class="chat-error-actions">
                                            <button class="btn-error-switch" onclick="openModal('modal-model-sheet')">Ganti Model AI</button>
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

            bodyEl.innerHTML = formatMarkdownText(streamAccumulator || 'I have completed analyzing your request.');
            scrollChatToBottom();
        } else {
            // Standard JSON fallback
            const data = await res.json();
            const responseText = data.reply || data.response || data.text || '';
            bodyEl.innerHTML = formatMarkdownText(responseText);
            scrollChatToBottom();

            if (data.credits_remaining !== undefined) {
                currentUser.credits = data.credits_remaining;
                renderUserData();
            }
        }
    } catch (err) {
        bodyEl.innerHTML = `
            <div class="chat-error-card">
                <div class="chat-error-title">Connection Error</div>
                <p class="chat-error-msg">${err.message || 'Gagal terhubung ke backend VARIS AI.'}</p>
            </div>
        `;
        scrollChatToBottom();
    }
}

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
// 7. EVENT LISTENERS & INITIALIZATION
// ==========================================================

document.addEventListener('DOMContentLoaded', () => {
    // 1. Check current session & Load available models
    fetchCurrentUser();
    loadAIModels();

    // 2. Initialize GIS Google Auth
    setTimeout(initGoogleAuth, 600);

    // 3. Landing Page Action Buttons
    const landingSignin = document.getElementById('landing-signin-btn');
    if (landingSignin) landingSignin.onclick = () => { isRegisterMode = false; updateAuthUI(); switchMainView('auth'); };

    const landingGetStarted = document.getElementById('landing-getstarted-btn');
    if (landingGetStarted) landingGetStarted.onclick = () => { isRegisterMode = true; updateAuthUI(); switchMainView('auth'); };

    const heroStart = document.getElementById('hero-start-btn');
    if (heroStart) heroStart.onclick = () => { isRegisterMode = true; updateAuthUI(); switchMainView('auth'); };

    const heroExplore = document.getElementById('hero-explore-btn');
    if (heroExplore) heroExplore.onclick = () => { switchMainView('app'); switchTab('chat'); };

    // 4. Auth View Buttons
    const authBack = document.getElementById('auth-back-to-landing');
    if (authBack) authBack.onclick = () => switchMainView('landing');

    const authSwitch = document.getElementById('auth-switch-btn');
    if (authSwitch) {
        authSwitch.onclick = () => {
            isRegisterMode = !isRegisterMode;
            updateAuthUI();
        };
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
            if (submitBtn) submitBtn.textContent = 'Sign Up';
            if (switchText) switchText.textContent = 'Already have an account?';
            if (switchBtn) switchBtn.textContent = 'Sign In';
            if (nameGroup) nameGroup.classList.remove('hidden');
        } else {
            if (title) title.textContent = 'Welcome back';
            if (desc) desc.textContent = 'Continue your intelligent workspace.';
            if (submitBtn) submitBtn.textContent = 'Sign In';
            if (switchText) switchText.textContent = "Don't have an account?";
            if (switchBtn) switchBtn.textContent = 'Create account';
            if (nameGroup) nameGroup.classList.add('hidden');
        }
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
                        credits: userData.credits !== undefined ? userData.credits : 2450
                    };
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
    if (sidebarNewChat) {
        sidebarNewChat.onclick = () => {
            currentConversationId = 'conv-' + Date.now();
            switchTab('chat');
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
                input.value = 'Research and compare the leading frontier AI architectures in 2026.';
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

    // Close on backdrop click
    document.querySelectorAll('.modal-backdrop').forEach(modal => {
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.classList.add('hidden');
            }
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
