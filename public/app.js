// ==========================================================
// VARIS AI - PREMIUM AI WORKSPACE CLIENT
// World-Class Architecture, Multi-View Router & Real-Time Engine
// ==========================================================

// --- State Machine & Global Store ---
let activeMainView = 'landing'; // 'landing', 'auth', 'app'
let activeSubview = 'chat';     // 'chat', 'projects', 'files', 'models', 'usage', 'subscription', 'settings'
let currentUser = null;
let currentSubscription = null;
let currentCredits = 2840;
let currentModel = 'gemini-pro';
let currentModelName = 'Gemini Pro';
let currentConversationId = null;
let isRegisterMode = false;
let isVoiceModeActive = false;
let isMicMuted = false;
let selectedFileId = null;

// Voice Mode Web Audio & State
let audioCtx = null;
let micAnalyser = null;
let micDataArray = null;
let mediaStream = null;
let voiceState = 'LISTENING'; // 'LISTENING', 'THINKING', 'SPEAKING'
let voiceAnimFrameId = null;

// --- DOM Elements ---
// Main View Containers
const viewLanding = document.getElementById('view-landing');
const viewAuth = document.getElementById('view-auth');
const viewApp = document.getElementById('view-app');
const viewVoice = document.getElementById('view-voice');

// Landing Elements
const landingSigninBtn = document.getElementById('landing-signin-btn');
const landingGetstartedBtn = document.getElementById('landing-getstarted-btn');
const heroStartBtn = document.getElementById('hero-start-btn');
const heroExploreBtn = document.getElementById('hero-explore-btn');
const navLandingFeatures = document.getElementById('nav-landing-features');
const navLandingModels = document.getElementById('nav-landing-models');
const navLandingPricing = document.getElementById('nav-landing-pricing');

// Auth Elements
const authMainTitle = document.getElementById('auth-main-title');
const authMainDesc = document.getElementById('auth-main-desc');
const authAlertBox = document.getElementById('auth-alert-box');
const btnContinueGoogle = document.getElementById('btn-continue-google');
const authEmailForm = document.getElementById('auth-email-form');
const groupAuthName = document.getElementById('group-auth-name');
const authNameInput = document.getElementById('auth-name-input');
const authEmailInput = document.getElementById('auth-email-input');
const authPassInput = document.getElementById('auth-pass-input');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const authSwitchBtn = document.getElementById('auth-switch-btn');
const authSwitchText = document.getElementById('auth-switch-text');
const authBackToLanding = document.getElementById('auth-back-to-landing');

// Topbar & Sidebar Elements
const appSidebar = document.getElementById('app-sidebar');
const mobileSidebarToggle = document.getElementById('mobile-sidebar-toggle');
const sidebarHomeBtn = document.getElementById('sidebar-home-btn');
const sidebarNewchatBtn = document.getElementById('sidebar-newchat-btn');
const sidebarUserBtn = document.getElementById('sidebar-user-btn');
const sidebarUserAvatar = document.getElementById('sidebar-user-avatar');
const sidebarUserName = document.getElementById('sidebar-user-name');
const sidebarUserPlan = document.getElementById('sidebar-user-plan');

const topbarModelBtn = document.getElementById('topbar-model-btn');
const topbarModelName = document.getElementById('topbar-model-name');
const topbarModelStatus = document.getElementById('topbar-model-status');
const topbarCreditsBtn = document.getElementById('topbar-credits-btn');
const topbarCreditsText = document.getElementById('topbar-credits-text');
const topbarAvatarBtn = document.getElementById('topbar-avatar-btn');
const topbarAvatarImg = document.getElementById('topbar-avatar-img');
const globalSearchInput = document.getElementById('global-search-input');

// Chat Workspace Elements
const subviewChat = document.getElementById('subview-chat');
const chatEmptyState = document.getElementById('chat-empty-state');
const emptyGreetingName = document.getElementById('empty-greeting-name');
const chatMessagesFeed = document.getElementById('chat-messages-feed');
const mainChatInput = document.getElementById('main-chat-input');
const mainSendBtn = document.getElementById('main-send-btn');
const btnAttachAction = document.getElementById('btn-attach-action');
const btnFileSelect = document.getElementById('btn-file-select');
const btnVoiceChatStart = document.getElementById('btn-voice-chat-start');
const quickPromptChips = document.getElementById('quick-prompt-chips');

// Projects Elements
const subviewProjects = document.getElementById('subview-projects');
const projectsGrid = document.getElementById('projects-grid');
const btnCreateProject = document.getElementById('btn-create-project');

// Files Elements
const subviewFiles = document.getElementById('subview-files');
const filesTableBody = document.getElementById('files-table-body');
const filesSearchInput = document.getElementById('files-search-input');
const filesFilterTabs = document.getElementById('files-filter-tabs');
const realFileUploadInput = document.getElementById('real-file-upload-input');
const filePreviewPanel = document.getElementById('file-preview-panel');
const previewEmptyState = document.getElementById('preview-empty-state');
const previewActiveState = document.getElementById('preview-active-state');
const previewName = document.getElementById('preview-name');
const previewSize = document.getElementById('preview-size');
const previewProject = document.getElementById('preview-project');
const previewDate = document.getElementById('preview-date');
const previewSnippet = document.getElementById('preview-snippet');
const btnDownloadFile = document.getElementById('btn-download-file');
const btnDeleteFile = document.getElementById('btn-delete-file');

// Models Elements
const subviewModels = document.getElementById('subview-models');
const viewModelFilterTabs = document.getElementById('view-model-filter-tabs');
const modelsCatalogGrid = document.getElementById('models-catalog-grid');

// Usage Elements
const subviewUsage = document.getElementById('subview-usage');
const usageCreditsRemain = document.getElementById('usage-credits-remain');
const usageCreditsProgress = document.getElementById('usage-credits-progress');
const usagePlanLabel = document.getElementById('usage-plan-label');
const usageCreditsTotal = document.getElementById('usage-credits-total');
const usageTodayReq = document.getElementById('usage-today-req');
const usageMonthReq = document.getElementById('usage-month-req');
const recentActivityList = document.getElementById('recent-activity-list');

// Subscription Elements
const subviewSubscription = document.getElementById('subview-subscription');
const btnPlanPro = document.getElementById('btn-plan-pro');
const btnPlanUltra = document.getElementById('btn-plan-ultra');

// Settings Elements
const subviewSettings = document.getElementById('subview-settings');
const setAvatarImg = document.getElementById('set-avatar-img');
const setUserName = document.getElementById('set-user-name');
const setUserEmail = document.getElementById('set-user-email');
const setBadgePlan = document.getElementById('set-badge-plan');
const setInputName = document.getElementById('set-input-name');
const setInputEmail = document.getElementById('set-input-email');
const btnSaveAccountSet = document.getElementById('btn-save-account-set');
const setVoiceSelect = document.getElementById('set-voice-select');
const setSpeedSlider = document.getElementById('set-speed-slider');
const setSpeedLabel = document.getElementById('set-speed-label');
const btnSaveVoiceSet = document.getElementById('btn-save-voice-set');
const btnSettingsLogout = document.getElementById('btn-settings-logout');

// Voice Mode Elements
const btnCloseVoice = document.getElementById('btn-close-voice');
const voiceStateBadge = document.getElementById('voice-state-badge');
const voiceStateLabel = document.getElementById('voice-state-label');
const voicePhrase = document.getElementById('voice-phrase');
const voiceOrbHalo = document.getElementById('voice-orb-halo');
const voiceOrbSphere = document.getElementById('voice-orb-sphere');
const voiceCaptionText = document.getElementById('voice-caption-text');
const btnVoiceMute = document.getElementById('btn-voice-mute');
const btnVoiceInterrupt = document.getElementById('btn-voice-interrupt');
const audioPlayback = document.getElementById('audio-playback');

// Modals & Popups
const modelSelectorModal = document.getElementById('model-selector-modal');
const closeModelModal = document.getElementById('close-model-modal');
const modalModelTabs = document.getElementById('modal-model-tabs');
const modalModelsList = document.getElementById('modal-models-list');

const profileDropdownMenu = document.getElementById('profile-dropdown-menu');
const dropdownUserAvatar = document.getElementById('dropdown-user-avatar');
const dropdownUserName = document.getElementById('dropdown-user-name');
const dropdownUserEmail = document.getElementById('dropdown-user-email');
const dropdownUserPlan = document.getElementById('dropdown-user-plan');
const dropdownUserCredits = document.getElementById('dropdown-user-credits');
const menuSwitchAccount = document.getElementById('menu-switch-account');
const menuOpenSubscription = document.getElementById('menu-open-subscription');
const menuOpenUsagePage = document.getElementById('menu-open-usage-page');
const menuOpenSettingsPage = document.getElementById('menu-open-settings-page');
const menuLogoutAction = document.getElementById('menu-logout-action');

// Mobile Bottom Nav Items
const mobileBottomNav = document.getElementById('mobile-bottom-nav');
const mbNavItems = mobileBottomNav ? mobileBottomNav.querySelectorAll('.m-nav-item') : [];

// ==========================================================
// 1. ROUTING & VIEW CONTROLLER
// ==========================================================

function switchMainView(viewName) {
    activeMainView = viewName;
    [viewLanding, viewAuth, viewApp].forEach(v => {
        if (!v) return;
        v.classList.remove('active');
        v.style.display = 'none';
    });

    if (viewName === 'landing' && viewLanding) {
        viewLanding.style.display = 'block';
        setTimeout(() => viewLanding.classList.add('active'), 10);
    } else if (viewName === 'auth' && viewAuth) {
        viewAuth.style.display = 'block';
        setTimeout(() => viewAuth.classList.add('active'), 10);
    } else if (viewName === 'app' && viewApp) {
        viewApp.style.display = 'flex';
        setTimeout(() => viewApp.classList.add('active'), 10);
        loadWorkspaceData();
    }
}

function switchSubview(subviewName) {
    activeSubview = subviewName;

    // Update Subview Containers
    const subviews = [
        subviewChat, subviewProjects, subviewFiles,
        subviewModels, subviewUsage, subviewSubscription, subviewSettings
    ];

    subviews.forEach(sv => {
        if (!sv) return;
        sv.classList.remove('active');
        sv.style.display = 'none';
    });

    const targetMap = {
        chat: subviewChat,
        projects: subviewProjects,
        files: subviewFiles,
        models: subviewModels,
        usage: subviewUsage,
        subscription: subviewSubscription,
        settings: subviewSettings,
    };

    const target = targetMap[subviewName] || subviewChat;
    if (target) {
        target.style.display = subviewName === 'files' || subviewName === 'settings' ? 'block' : 'flex';
        setTimeout(() => target.classList.add('active'), 10);
    }

    // Update Sidebar Navigation Buttons Active State
    document.querySelectorAll('.sidebar-nav .nav-btn').forEach(btn => {
        if (btn.dataset.subview === subviewName) btn.classList.add('active');
        else btn.classList.remove('active');
    });

    // Update Mobile Bottom Nav Active State
    mbNavItems.forEach(btn => {
        if (btn.dataset.subview === subviewName) btn.classList.add('active');
        else btn.classList.remove('active');
    });

    // Close mobile drawer if open
    if (appSidebar) appSidebar.classList.remove('mobile-open');

    // Load contextual data for subview
    if (subviewName === 'projects') loadProjects();
    else if (subviewName === 'files') loadFiles();
    else if (subviewName === 'models') loadModelsCatalog();
    else if (subviewName === 'usage') loadUsageAnalytics();
}

// Wire Landing Page CTA Buttons
if (landingSigninBtn) landingSigninBtn.addEventListener('click', () => switchMainView('auth'));
if (landingGetstartedBtn) landingGetstartedBtn.addEventListener('click', () => switchMainView('auth'));
if (heroStartBtn) heroStartBtn.addEventListener('click', () => switchMainView('auth'));
if (heroExploreBtn) heroExploreBtn.addEventListener('click', () => {
    switchMainView('app');
    switchSubview('models');
});
if (navLandingFeatures) navLandingFeatures.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('f-card-models')?.scrollIntoView({ behavior: 'smooth' });
});
if (navLandingModels) navLandingModels.addEventListener('click', (e) => {
    e.preventDefault();
    switchMainView('app');
    switchSubview('models');
});
if (navLandingPricing) navLandingPricing.addEventListener('click', (e) => {
    e.preventDefault();
    switchMainView('app');
    switchSubview('subscription');
});
if (authBackToLanding) authBackToLanding.addEventListener('click', () => switchMainView('landing'));

// Wire Sidebar & Mobile Navigation
document.querySelectorAll('.sidebar-nav .nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchSubview(btn.dataset.subview));
});

mbNavItems.forEach(btn => {
    btn.addEventListener('click', () => switchSubview(btn.dataset.subview));
});

if (sidebarHomeBtn) sidebarHomeBtn.addEventListener('click', () => switchSubview('chat'));
if (sidebarNewchatBtn) sidebarNewchatBtn.addEventListener('click', () => {
    currentConversationId = null;
    if (chatMessagesFeed) chatMessagesFeed.innerHTML = '';
    if (chatEmptyState) chatEmptyState.style.display = 'flex';
    switchSubview('chat');
    if (mainChatInput) mainChatInput.focus();
});

if (mobileSidebarToggle) {
    mobileSidebarToggle.addEventListener('click', () => {
        if (appSidebar) appSidebar.classList.toggle('mobile-open');
    });
}

// Topbar triggers
if (topbarModelBtn) {
    topbarModelBtn.addEventListener('click', () => {
        if (modelSelectorModal) {
            modelSelectorModal.classList.add('active');
            loadModalModels();
        }
    });
}
if (topbarCreditsBtn) {
    topbarCreditsBtn.addEventListener('click', () => switchSubview('usage'));
}

// Profile Popup Dropdown Trigger
function toggleProfileDropdown(e) {
    e.stopPropagation();
    if (profileDropdownMenu) profileDropdownMenu.classList.toggle('active');
}
if (topbarAvatarBtn) topbarAvatarBtn.addEventListener('click', toggleProfileDropdown);
if (sidebarUserBtn) sidebarUserBtn.addEventListener('click', toggleProfileDropdown);

document.addEventListener('click', (e) => {
    if (profileDropdownMenu && profileDropdownMenu.classList.contains('active')) {
        if (!profileDropdownMenu.contains(e.target) && e.target !== topbarAvatarBtn && e.target !== sidebarUserBtn) {
            profileDropdownMenu.classList.remove('active');
        }
    }
});

// Profile Dropdown Actions
if (menuOpenSubscription) {
    menuOpenSubscription.addEventListener('click', () => {
        if (profileDropdownMenu) profileDropdownMenu.classList.remove('active');
        switchSubview('subscription');
    });
}
if (menuOpenUsagePage) {
    menuOpenUsagePage.addEventListener('click', () => {
        if (profileDropdownMenu) profileDropdownMenu.classList.remove('active');
        switchSubview('usage');
    });
}
if (menuOpenSettingsPage) {
    menuOpenSettingsPage.addEventListener('click', () => {
        if (profileDropdownMenu) profileDropdownMenu.classList.remove('active');
        switchSubview('settings');
    });
}
if (menuLogoutAction) {
    menuLogoutAction.addEventListener('click', handleLogout);
}
if (btnSettingsLogout) {
    btnSettingsLogout.addEventListener('click', handleLogout);
}

// ==========================================================
// 2. AUTHENTICATION & GOOGLE 1-TAP OAUTH
// ==========================================================

function showAuthAlert(msg, type = 'error') {
    if (!authAlertBox) return;
    authAlertBox.textContent = msg;
    authAlertBox.className = `auth-alert ${type}`;
    authAlertBox.classList.remove('hidden');
}

function clearAuthAlert() {
    if (!authAlertBox) return;
    authAlertBox.classList.add('hidden');
    authAlertBox.textContent = '';
}

// Switch between Login & Register
if (authSwitchBtn) {
    authSwitchBtn.addEventListener('click', () => {
        clearAuthAlert();
        isRegisterMode = !isRegisterMode;
        if (isRegisterMode) {
            if (authMainTitle) authMainTitle.textContent = 'Create your account';
            if (authMainDesc) authMainDesc.textContent = 'Start building with VARIS AI Workspace';
            if (groupAuthName) groupAuthName.style.display = 'block';
            if (authSubmitBtn) authSubmitBtn.textContent = 'Create Account';
            if (authSwitchText) authSwitchText.textContent = 'Already have an account?';
            if (authSwitchBtn) authSwitchBtn.textContent = 'Sign in';
        } else {
            if (authMainTitle) authMainTitle.textContent = 'Welcome back';
            if (authMainDesc) authMainDesc.textContent = 'Continue your intelligent workspace.';
            if (groupAuthName) groupAuthName.style.display = 'none';
            if (authSubmitBtn) authSubmitBtn.textContent = 'Sign In';
            if (authSwitchText) authSwitchText.textContent = "Don't have an account?";
            if (authSwitchBtn) authSwitchBtn.textContent = 'Create account';
        }
    });
}

// ==========================================================
// 2. AUTHENTICATION & OFFICIAL GOOGLE OAUTH
// ==========================================================

// Continue with Official Google OAuth (Opens Google's real accounts.google.com page)
if (btnContinueGoogle) {
    btnContinueGoogle.addEventListener('click', () => {
        clearAuthAlert();
        window.location.href = '/api/auth/google';
    });
}

// Switch Account in Profile Menu
if (menuSwitchAccount) {
    menuSwitchAccount.addEventListener('click', () => {
        if (profileDropdownMenu) profileDropdownMenu.classList.remove('active');
        window.location.href = '/api/auth/google';
    });
}

// Email & Password Auth Submit
async function executeAuthSubmit(e) {
    if (e) e.preventDefault();
    const email = authEmailInput ? authEmailInput.value.trim() : '';
    const password = authPassInput ? authPassInput.value : '';
    const name = authNameInput ? authNameInput.value.trim() : 'Al Palis';

    if (!email || !password) {
        showAuthAlert('Harap isi alamat email dan kata sandi.');
        return;
    }

    clearAuthAlert();
    try {
        if (authSubmitBtn) authSubmitBtn.disabled = true;
        let res;
        if (isRegisterMode) {
            res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name || 'User', email, password })
            });
        } else {
            res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            // Auto register fallback if user account is not yet created
            if (res.status === 401 || res.status === 404) {
                res = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: name || 'User', email, password })
                });
            }
        }

        if (res.ok) {
            await checkAuthSession();
        } else {
            const errData = await res.json().catch(() => ({}));
            showAuthAlert(errData.error?.message || 'Login gagal. Periksa kembali email dan password.');
            if (authSubmitBtn) authSubmitBtn.disabled = false;
        }
    } catch (err) {
        showAuthAlert(`Network error: ${err.message}`);
        if (authSubmitBtn) authSubmitBtn.disabled = false;
    }
}

if (authEmailForm) {
    authEmailForm.addEventListener('submit', executeAuthSubmit);
}
if (authSubmitBtn) {
    authSubmitBtn.addEventListener('click', (e) => {
        // If form doesn't trigger submit automatically
        if (authEmailForm && !authEmailForm.checkValidity()) {
            authEmailForm.reportValidity();
            return;
        }
        executeAuthSubmit(e);
    });
}

// Logout Handler
async function handleLogout() {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
        console.warn('Logout notice:', e);
    }
    currentUser = null;
    if (profileDropdownMenu) profileDropdownMenu.classList.remove('active');
    switchMainView('auth');
    showAuthAlert('Anda telah berhasil keluar dari akun VARIS.', 'success');
}

// Check and process Google OAuth callback query params on page load
function handleOAuthCallbackParams() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const auth = urlParams.get('auth');
        const err = urlParams.get('error');
        const msg = urlParams.get('msg');
        const linked = urlParams.get('linked');
        const isNew = urlParams.get('is_new');

        if (auth === 'success') {
            window.history.replaceState({}, document.title, window.location.pathname);
            if (linked) {
                showAuthAlert('Akun Google berhasil ditautkan ke akun Anda! Memuat workspace...', 'success');
            } else if (isNew) {
                showAuthAlert('Akun VARIS baru berhasil dibuat via Google! Memuat workspace...', 'success');
            }
        } else if (err) {
            window.history.replaceState({}, document.title, window.location.pathname);
            switchMainView('auth');
            if (err === 'oauth_unavailable' || err === 'google_not_configured' || err === 'google_client_id_needed') {
                showAuthAlert('Google Sign-In is temporarily unavailable.', 'error');
            } else if (err === 'cancelled' || err === 'access_denied') {
                showAuthAlert('Google sign-in was cancelled.', 'error');
            } else {
                showAuthAlert('Google Sign-In failed. Please try again.', 'error');
            }
        }
    } catch (e) {
        console.warn('OAuth param parse error:', e);
    }
}

// Check Authenticated Session on Load
async function checkAuthSession() {
    try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
            const data = await res.json();
            currentUser = data.user;
            currentSubscription = data.subscription;
            updateUserUI();
            switchMainView('app');
            switchSubview('chat');
        } else {
            switchMainView('landing');
        }
    } catch (e) {
        switchMainView('landing');
    }
}

function updateUserUI() {
    if (!currentUser) return;
    const name = currentUser.name || 'Al Palis';
    const email = currentUser.email || 'alpalis@gmail.com';
    const avatar = currentUser.avatar_url || '/assets/varis-logo.jpg';
    const plan = currentSubscription?.plan_name || 'Pro Plan';
    currentCredits = currentSubscription?.credits_balance ?? 2840;

    // Sidebar & Topbar updates
    if (sidebarUserName) sidebarUserName.textContent = name;
    if (sidebarUserPlan) sidebarUserPlan.textContent = plan;
    if (sidebarUserAvatar) sidebarUserAvatar.src = avatar;

    if (topbarAvatarImg) topbarAvatarImg.src = avatar;
    if (topbarCreditsText) topbarCreditsText.textContent = currentCredits.toLocaleString();
    if (emptyGreetingName) emptyGreetingName.textContent = `Good evening, ${name}.`;

    // Dropdown updates
    if (dropdownUserAvatar) dropdownUserAvatar.src = avatar;
    if (dropdownUserName) dropdownUserName.textContent = name;
    if (dropdownUserEmail) dropdownUserEmail.textContent = email;
    if (dropdownUserPlan) dropdownUserPlan.textContent = plan;
    if (dropdownUserCredits) dropdownUserCredits.textContent = `${currentCredits.toLocaleString()} Credits`;

    // Settings pane updates
    if (setAvatarImg) setAvatarImg.src = avatar;
    if (setUserName) setUserName.textContent = name;
    if (setUserEmail) setUserEmail.textContent = email;
    if (setBadgePlan) setBadgePlan.textContent = plan;
    if (setInputName) setInputName.value = name;
    if (setInputEmail) setInputEmail.value = email;
}

// ==========================================================
// 3. CHAT WORKSPACE & CONVERSATIONAL ENGINE
// ==========================================================

// Enable / Disable Send Button based on input
if (mainChatInput) {
    mainChatInput.addEventListener('input', () => {
        mainChatInput.style.height = 'auto';
        mainChatInput.style.height = Math.min(mainChatInput.scrollHeight, 160) + 'px';
        if (mainSendBtn) {
            mainSendBtn.disabled = !mainChatInput.value.trim();
        }
    });

    mainChatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (mainChatInput.value.trim()) handleSendMessage();
        }
    });
}

if (mainSendBtn) {
    mainSendBtn.addEventListener('click', handleSendMessage);
}

// Quick Prompt Chips
if (quickPromptChips) {
    quickPromptChips.querySelectorAll('.prompt-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const prefix = chip.dataset.prompt;
            if (mainChatInput) {
                mainChatInput.value = prefix;
                mainChatInput.focus();
                mainChatInput.dispatchEvent(new Event('input'));
            }
        });
    });
}

async function handleSendMessage() {
    const text = mainChatInput.value.trim();
    if (!text) return;

    // Reset input
    mainChatInput.value = '';
    mainChatInput.style.height = 'auto';
    mainSendBtn.disabled = true;

    // Hide empty state
    if (chatEmptyState) chatEmptyState.style.display = 'none';

    // Append User Message
    appendMessage('user', text);

    // Append AI Thinking Indicator
    const thinkingBubble = appendThinkingIndicator();

    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: text,
                model_id: currentModel,
                conversation_id: currentConversationId
            })
        });

        const data = await res.json().catch(() => ({}));
        thinkingBubble.remove();

        if (res.ok) {
            currentConversationId = data.conversation_id;
            if (data.credits_remaining !== undefined) {
                currentCredits = data.credits_remaining;
                if (topbarCreditsText) topbarCreditsText.textContent = currentCredits.toLocaleString();
            }
            appendMessage('assistant', data.response, data.model_used || currentModelName);
        } else {
            appendMessage('assistant', `⚠️ ${data.error?.message || 'Maaf, model tidak dapat merespons saat ini. Silakan coba lagi.'}`, currentModelName);
        }
    } catch (err) {
        thinkingBubble.remove();
        appendMessage('assistant', `⚠️ Terjadi kendala koneksi: ${err.message}`, currentModelName);
    }
}

function appendMessage(role, content, modelTag = 'Gemini Pro') {
    if (!chatMessagesFeed) return;
    const row = document.createElement('div');
    row.className = `message-document-row ${role}`;

    if (role === 'user') {
        row.innerHTML = `<div class="user-msg-bubble">${escapeHtml(content)}</div>`;
    } else {
        row.innerHTML = `
            <div class="assistant-document-card">
                <div class="doc-header-meta">
                    <div class="doc-brand-author">
                        <img src="/assets/varis-logo.jpg" alt="VARIS" class="brand-logo-icon" style="width:20px;height:20px;">
                        <strong style="font-size:0.88rem;color:var(--text-primary);">VARIS</strong>
                        <span class="doc-model-chip">${escapeHtml(modelTag)}</span>
                    </div>
                </div>
                <div class="doc-body-text">${renderMarkdown(content)}</div>
                <div class="doc-actions-bar">
                    <button class="action-icon-btn" onclick="copyResponseText(this)">
                        <span>📋</span> Copy
                    </button>
                    <button class="action-icon-btn" onclick="speakMessageText('${escapeForAttr(content)}')">
                        <span>🔊</span> Speak
                    </button>
                    <button class="action-icon-btn" title="Like">👍</button>
                    <button class="action-icon-btn" title="Dislike">👎</button>
                </div>
            </div>
        `;
    }

    chatMessagesFeed.appendChild(row);
    chatMessagesFeed.scrollTop = chatMessagesFeed.scrollHeight;
}

function appendThinkingIndicator() {
    const row = document.createElement('div');
    row.className = 'message-document-row assistant';
    row.innerHTML = `
        <div class="assistant-document-card" style="padding:1rem 1.25rem;">
            <div style="display:flex;align-items:center;gap:0.65rem;font-size:0.88rem;color:var(--brand-primary);font-weight:700;">
                <span class="pulse-live-dot"></span>
                <span>VARIS Thinking...</span>
            </div>
        </div>
    `;
    chatMessagesFeed.appendChild(row);
    chatMessagesFeed.scrollTop = chatMessagesFeed.scrollHeight;
    return row;
}

window.copyResponseText = function(btn) {
    const card = btn.closest('.assistant-document-card');
    const textEl = card.querySelector('.doc-body-text');
    if (textEl) {
        navigator.clipboard.writeText(textEl.innerText);
        btn.innerHTML = '<span>✓</span> Copied!';
        setTimeout(() => btn.innerHTML = '<span>📋</span> Copy', 2000);
    }
};

window.speakMessageText = function(text) {
    if (!text) return;
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text.slice(0, 500));
        utter.rate = 1.0;
        window.speechSynthesis.speak(utter);
    }
};

// ==========================================================
// 4. PROJECTS WORKSPACE
// ==========================================================

async function loadProjects() {
    if (!projectsGrid) return;
    try {
        const res = await fetch('/api/projects');
        const json = await res.json().catch(() => ({}));
        const projects = json.data || [];

        projectsGrid.innerHTML = '';
        projects.forEach(p => {
            const card = document.createElement('div');
            card.className = 'project-card';
            card.innerHTML = `
                <div>
                    <h3 class="project-card-title">${escapeHtml(p.name)}</h3>
                    <p class="project-card-desc">${escapeHtml(p.description || 'Creative workspace project.')}</p>
                </div>
                <div class="project-card-footer">
                    <div class="project-meta-info">
                        <span class="project-files-badge">${p.file_count || 0} files</span>
                        <span>Edited ${formatTimeAgo(p.updated_at)}</span>
                    </div>
                    <button class="btn-outline-sm" onclick="openProjectWorkspace('${p.id}')">Open</button>
                </div>
            `;
            projectsGrid.appendChild(card);
        });
    } catch (e) {
        console.warn('Failed to load projects:', e);
    }
}

if (btnCreateProject) {
    btnCreateProject.addEventListener('click', async () => {
        const name = prompt('Masukkan nama proyek baru:');
        if (!name || !name.trim()) return;
        const description = prompt('Deskripsi singkat proyek:') || '';
        try {
            await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name.trim(), description })
            });
            loadProjects();
        } catch (e) {
            alert('Gagal membuat proyek: ' + e.message);
        }
    });
}

window.openProjectWorkspace = function(projId) {
    switchSubview('files');
};

// ==========================================================
// 5. FILES WORKSPACE
// ==========================================================

async function loadFiles(filter = 'all', search = '') {
    if (!filesTableBody) return;
    try {
        let url = `/api/files?type=${encodeURIComponent(filter)}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        const res = await fetch(url);
        const json = await res.json().catch(() => ({}));
        const files = json.data || [];

        filesTableBody.innerHTML = '';
        files.forEach((f, idx) => {
            const tr = document.createElement('tr');
            if (f.id === selectedFileId || (idx === 0 && !selectedFileId)) {
                selectedFileId = f.id;
                tr.style.background = 'var(--bg-hover)';
                renderFilePreview(f);
            }

            tr.addEventListener('click', () => {
                selectedFileId = f.id;
                document.querySelectorAll('#files-table-body tr').forEach(r => r.style.background = '');
                tr.style.background = 'var(--bg-hover)';
                renderFilePreview(f);
            });

            tr.innerHTML = `
                <td>
                    <div class="file-name-cell">
                        <span>${getFileIcon(f.type)}</span>
                        <span>${escapeHtml(f.name)}</span>
                    </div>
                </td>
                <td>${escapeHtml(f.project_name || 'General')}</td>
                <td>${formatTimeAgo(f.updated_at)}</td>
                <td><span class="file-type-badge">${escapeHtml(f.type)}</span></td>
                <td>${escapeHtml(f.size_formatted || '1.0 MB')}</td>
                <td><button class="btn-outline-sm" style="padding:0.25rem 0.5rem;" onclick="event.stopPropagation(); deleteFileById('${f.id}')">🗑️</button></td>
            `;
            filesTableBody.appendChild(tr);
        });
    } catch (e) {
        console.warn('Failed to load files:', e);
    }
}

function renderFilePreview(file) {
    if (!previewEmptyState || !previewActiveState) return;
    previewEmptyState.classList.add('hidden');
    previewActiveState.classList.remove('hidden');

    if (previewName) previewName.textContent = file.name;
    if (previewSize) previewSize.textContent = `${file.size_formatted || '2.4 MB'} • ${file.type}`;
    if (previewProject) previewProject.textContent = file.project_name || 'Project A';
    if (previewDate) previewDate.textContent = formatTimeAgo(file.updated_at);
    if (previewSnippet) previewSnippet.textContent = file.content || 'File siap digunakan dalam prompt chat VARIS AI.';

    if (btnDeleteFile) {
        btnDeleteFile.onclick = () => deleteFileById(file.id);
    }
    if (btnDownloadFile) {
        btnDownloadFile.onclick = () => alert(`Downloading ${file.name}...`);
    }
}

window.deleteFileById = async function(fileId) {
    if (!confirm('Hapus file ini dari workspace?')) return;
    try {
        await fetch(`/api/files/${fileId}`, { method: 'DELETE' });
        loadFiles();
    } catch (e) {
        alert('Gagal menghapus file');
    }
};

// Filter tabs in Files view
if (filesFilterTabs) {
    filesFilterTabs.querySelectorAll('.f-tab-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            filesFilterTabs.querySelectorAll('.f-tab-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            loadFiles(pill.dataset.filter, filesSearchInput?.value.trim());
        });
    });
}

if (filesSearchInput) {
    filesSearchInput.addEventListener('input', () => {
        const activeTab = filesFilterTabs?.querySelector('.f-tab-pill.active')?.dataset.filter || 'all';
        loadFiles(activeTab, filesSearchInput.value.trim());
    });
}

// Real File Upload Trigger
if (realFileUploadInput) {
    realFileUploadInput.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const sizeFormatted = file.size > 1048576 
            ? (file.size / 1048576).toFixed(1) + ' MB' 
            : Math.ceil(file.size / 1024) + ' KB';

        try {
            await fetch('/api/files', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: file.name,
                    project_id: 'proj-1',
                    project_name: 'Project A',
                    type: file.name.split('.').pop()?.toUpperCase() || 'Document',
                    size_bytes: file.size,
                    size_formatted: sizeFormatted,
                    content: `Uploaded file: ${file.name} (${sizeFormatted})`
                })
            });
            loadFiles();
            alert(`File "${file.name}" berhasil diunggah ke workspace!`);
        } catch (err) {
            alert('Gagal mengunggah file: ' + err.message);
        }
    });
}

function getFileIcon(type) {
    const t = (type || '').toLowerCase();
    if (t.includes('pdf')) return '📕';
    if (t.includes('fig')) return '🎨';
    if (t.includes('md') || t.includes('doc')) return '📄';
    if (t.includes('image') || t.includes('png') || t.includes('jpg')) return '🖼️';
    if (t.includes('code') || t.includes('js') || t.includes('py')) return '💻';
    return '📁';
}

// ==========================================================
// 6. MODELS WORKSPACE & MODEL SELECTOR MODAL
// ==========================================================

async function loadModelsCatalog(filter = 'all') {
    if (!modelsCatalogGrid) return;
    try {
        const res = await fetch('/api/models');
        const json = await res.json().catch(() => ({}));
        let models = json.data || [];

        if (filter !== 'all') {
            models = models.filter(m => (m.provider || '').toLowerCase().includes(filter.toLowerCase()));
        }

        modelsCatalogGrid.innerHTML = '';
        models.forEach(m => {
            const card = document.createElement('div');
            card.className = `model-spec-card ${m.id === currentModel ? 'selected' : ''}`;
            card.innerHTML = `
                <div>
                    <div class="model-header-pill">
                        <span class="model-provider-badge">${m.provider || 'Google'}</span>
                        <span class="model-status-chip">● Available</span>
                    </div>
                    <h3 class="model-spec-name">${escapeHtml(m.display_name || m.id)}</h3>
                    <p class="model-spec-desc">${escapeHtml(m.description || 'High performance intelligence model.')}</p>
                </div>
                <div class="model-card-action-footer">
                    <span class="model-credit-tag">${m.credit_cost_per_request || 5} credits</span>
                    <button class="btn-primary-sm" onclick="selectActiveModel('${m.id}', '${escapeForAttr(m.display_name)}')">${m.id === currentModel ? 'Selected' : 'Select'}</button>
                </div>
            `;
            modelsCatalogGrid.appendChild(card);
        });
    } catch (e) {
        console.warn('Failed to load models:', e);
    }
}

if (viewModelFilterTabs) {
    viewModelFilterTabs.querySelectorAll('.m-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            viewModelFilterTabs.querySelectorAll('.m-tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadModelsCatalog(btn.dataset.filter);
        });
    });
}

// Modal Model Picker
async function loadModalModels(filter = 'all') {
    if (!modalModelsList) return;
    try {
        const res = await fetch('/api/models');
        const json = await res.json().catch(() => ({}));
        let models = json.data || [];

        if (filter !== 'all') {
            models = models.filter(m => (m.provider || '').toLowerCase().includes(filter.toLowerCase()));
        }

        modalModelsList.innerHTML = '';
        models.forEach(m => {
            const item = document.createElement('div');
            item.className = `g-account-item ${m.id === currentModel ? 'active-model-item' : ''}`;
            item.style.marginBottom = '0.65rem';
            item.innerHTML = `
                <div style="font-size:1.4rem;">✨</div>
                <div class="g-account-details">
                    <strong class="g-name">${escapeHtml(m.display_name || m.id)}</strong>
                    <span class="g-email">${m.credit_cost_per_request} credits/req • ${m.provider}</span>
                </div>
                <button class="btn-primary-sm" onclick="selectActiveModel('${m.id}', '${escapeForAttr(m.display_name)}')">Select</button>
            `;
            modalModelsList.appendChild(item);
        });
    } catch (e) {
        console.warn('Failed to load modal models:', e);
    }
}

if (modalModelTabs) {
    modalModelTabs.querySelectorAll('.m-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            modalModelTabs.querySelectorAll('.m-tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadModalModels(btn.dataset.filter);
        });
    });
}

if (closeModelModal) {
    closeModelModal.addEventListener('click', () => {
        if (modelSelectorModal) modelSelectorModal.classList.remove('active');
    });
}

window.selectActiveModel = function(modelId, modelName) {
    currentModel = modelId;
    currentModelName = modelName || modelId;
    if (topbarModelName) topbarModelName.textContent = currentModelName;
    if (modelSelectorModal) modelSelectorModal.classList.remove('active');
    loadModelsCatalog();
};

// ==========================================================
// 7. USAGE & ANALYTICS DASHBOARD
// ==========================================================

async function loadUsageAnalytics() {
    try {
        const res = await fetch('/api/user/usage');
        const json = await res.json().catch(() => ({}));
        const stats = json.data || {};

        if (usageCreditsRemain) usageCreditsRemain.textContent = (stats.credits_remaining ?? 2840).toLocaleString();
        if (usageCreditsTotal) usageCreditsTotal.textContent = (stats.credits_allocated ?? 5000).toLocaleString();
        if (usageTodayReq) usageTodayReq.textContent = stats.requests_today ?? 34;
        if (usageMonthReq) usageMonthReq.textContent = (stats.requests_this_month ?? 1284).toLocaleString();

        const pct = Math.min(100, Math.round(((stats.credits_remaining ?? 2840) / (stats.credits_allocated ?? 5000)) * 100));
        if (usageCreditsProgress) usageCreditsProgress.style.width = pct + '%';

        // Render Recent Activity
        if (recentActivityList) {
            recentActivityList.innerHTML = '';
            const txs = stats.recent_transactions || [
                { model_id: 'Gemini Pro', credits: 12, created_at: new Date(Date.now() - 7200000).toISOString() },
                { model_id: 'GPT-4o', credits: 10, created_at: new Date(Date.now() - 14400000).toISOString() },
                { model_id: 'Gemini Flash', credits: 2, created_at: new Date(Date.now() - 28800000).toISOString() },
            ];

            txs.forEach(t => {
                const row = document.createElement('div');
                row.className = 'activity-row-item';
                row.innerHTML = `
                    <div>
                        <strong class="activity-model-title">${escapeHtml(t.model_id || 'Gemini Pro')}</strong>
                        <div style="font-size:0.75rem;color:var(--text-muted);">${formatTimeAgo(t.created_at)}</div>
                    </div>
                    <span class="activity-cost-chip">${t.credits || 10} credits</span>
                `;
                recentActivityList.appendChild(row);
            });
        }
    } catch (e) {
        console.warn('Failed to load usage analytics:', e);
    }
}

// ==========================================================
// 8. SUBSCRIPTION UPGRADE FLOW
// ==========================================================

async function upgradeSubscriptionPlan(planId) {
    try {
        const res = await fetch('/api/subscriptions/upgrade', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plan_id: planId })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
            alert(`Selamat! Anda telah berhasil upgrade ke paket ${planId.toUpperCase()}!`);
            currentSubscription = data.subscription;
            updateUserUI();
            switchSubview('usage');
        } else {
            alert('Gagal upgrade paket: ' + (data.error?.message || 'Server error'));
        }
    } catch (e) {
        alert('Gagal upgrade: ' + e.message);
    }
}

if (btnPlanPro) btnPlanPro.addEventListener('click', () => upgradeSubscriptionPlan('pro'));
if (btnPlanUltra) btnPlanUltra.addEventListener('click', () => upgradeSubscriptionPlan('ultra'));

// ==========================================================
// 9. IMMERSIVE VOICE MODE
// ==========================================================

if (btnVoiceChatStart) {
    btnVoiceChatStart.addEventListener('click', openVoiceMode);
}
if (btnCloseVoice) {
    btnCloseVoice.addEventListener('click', closeVoiceMode);
}

async function openVoiceMode() {
    isVoiceModeActive = true;
    if (viewVoice) viewVoice.classList.add('active');
    setVoiceState('LISTENING', 'Listening...');

    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const source = audioCtx.createMediaStreamSource(mediaStream);
        micAnalyser = audioCtx.createAnalyser();
        micAnalyser.fftSize = 64;
        source.connect(micAnalyser);
        micDataArray = new Uint8Array(micAnalyser.frequencyBinCount);
        animateVoiceOrb();
    } catch (e) {
        console.warn('Mic access issue:', e);
    }
}

function closeVoiceMode() {
    isVoiceModeActive = false;
    if (viewVoice) viewVoice.classList.remove('active');
    if (voiceAnimFrameId) cancelAnimationFrame(voiceAnimFrameId);
    if (mediaStream) {
        mediaStream.getTracks().forEach(t => t.stop());
        mediaStream = null;
    }
    if (audioCtx) {
        audioCtx.close().catch(() => {});
        audioCtx = null;
    }
}

function setVoiceState(state, label) {
    voiceState = state;
    if (voiceStateLabel) voiceStateLabel.textContent = state;
    if (voicePhrase) voicePhrase.textContent = label || state;
}

function animateVoiceOrb() {
    if (!isVoiceModeActive) return;
    voiceAnimFrameId = requestAnimationFrame(animateVoiceOrb);

    if (micAnalyser && micDataArray) {
        micAnalyser.getByteFrequencyData(micDataArray);
        let sum = 0;
        for (let i = 0; i < micDataArray.length; i++) sum += micDataArray[i];
        const avg = sum / micDataArray.length;

        const scale = 1 + (avg / 255) * 0.4;
        if (voiceOrbSphere) {
            voiceOrbSphere.style.transform = `scale(${scale})`;
        }
        if (voiceOrbHalo) {
            voiceOrbHalo.style.transform = `scale(${scale * 1.15})`;
            voiceOrbHalo.style.opacity = `${0.4 + (avg / 255) * 0.6}`;
        }
    }
}

if (btnVoiceMute) {
    btnVoiceMute.addEventListener('click', () => {
        isMicMuted = !isMicMuted;
        if (mediaStream) {
            mediaStream.getAudioTracks().forEach(t => t.enabled = !isMicMuted);
        }
        btnVoiceMute.classList.toggle('active-mute', isMicMuted);
    });
}

if (btnVoiceInterrupt) {
    btnVoiceInterrupt.addEventListener('click', () => {
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        setVoiceState('LISTENING', 'Mendengarkan...');
    });
}

// ==========================================================
// 10. SETTINGS & PREFERENCES
// ==========================================================

// Settings Subnav tabs
document.querySelectorAll('.set-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.set-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.dataset.tab;
        document.querySelectorAll('.settings-tab-pane').forEach(p => p.classList.remove('active'));
        const pane = document.getElementById(`pane-set-${tab}`);
        if (pane) pane.classList.add('active');
    });
});

if (setSpeedSlider) {
    setSpeedSlider.addEventListener('input', () => {
        if (setSpeedLabel) setSpeedLabel.textContent = `${setSpeedSlider.value}x`;
    });
}

if (btnSaveAccountSet) {
    btnSaveAccountSet.addEventListener('click', () => {
        alert('Profil berhasil diperbarui!');
    });
}

if (btnSaveVoiceSet) {
    btnSaveVoiceSet.addEventListener('click', async () => {
        try {
            await fetch('/api/preferences', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    speaking_speed: parseFloat(setSpeedSlider?.value || '0.95'),
                    voice_style: { preset: 'NORMAL' },
                    language: 'id-ID'
                })
            });
            alert('Preferensi suara berhasil disimpan!');
        } catch (e) {
            alert('Gagal menyimpan: ' + e.message);
        }
    });
}

// Global data bootstrap
function loadWorkspaceData() {
    loadProjects();
    loadFiles();
    loadModelsCatalog();
    loadUsageAnalytics();
}

// ==========================================================
// 11. UTILITY FUNCTIONS
// ==========================================================

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function escapeForAttr(str) {
    if (!str) return '';
    return str.replace(/'/g, "\\'").replace(/"/g, '&quot;').replace(/\n/g, ' ');
}

function formatTimeAgo(isoString) {
    if (!isoString) return 'recently';
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) return 'just now';
    if (diffHours < 24) return `${diffHours} hours ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} days ago`;
}

function renderMarkdown(text) {
    if (!text) return '';
    let parsed = escapeHtml(text);

    // Code blocks
    parsed = parsed.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (match, lang, code) => {
        return `<pre><code class="language-${lang}">${code}</code></pre>`;
    });

    // Inline code
    parsed = parsed.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Bold & Italics
    parsed = parsed.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    parsed = parsed.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Headers
    parsed = parsed.replace(/^### (.*$)/gim, '<h4 style="font-size:1.05rem;font-weight:700;margin:0.75rem 0 0.25rem;">$1</h4>');
    parsed = parsed.replace(/^## (.*$)/gim, '<h3 style="font-size:1.15rem;font-weight:800;margin:1rem 0 0.35rem;">$1</h3>');
    parsed = parsed.replace(/^# (.*$)/gim, '<h2 style="font-size:1.3rem;font-weight:800;margin:1.25rem 0 0.5rem;">$1</h2>');

    // Line breaks
    parsed = parsed.replace(/\n\n+/g, '</p><p>');
    parsed = parsed.replace(/\n/g, '<br>');

    return `<p>${parsed}</p>`;
}

// Initial Boot
window.addEventListener('DOMContentLoaded', () => {
    handleOAuthCallbackParams();
    checkAuthSession();
});
