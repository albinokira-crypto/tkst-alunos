/**
 * TKST Alunos - Main Application Controller
 * Platform for Karate Shotokan studies with 26 Kata PDF guide, embedded video manager, Nick auth, and dynamic Dojo management.
 */

let deferredInstallPrompt = null;

function isAppInstalled() {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                       window.navigator.standalone === true ||
                       document.referrer.includes('android-app://') ||
                       window.matchMedia('(display-mode: fullscreen)').matches ||
                       window.matchMedia('(display-mode: minimal-ui)').matches ||
                       localStorage.getItem('tkst_pwa_installed') === 'true';
  return isStandalone;
}

function updateInstallPromptsVisibility() {
  const installed = isAppInstalled();
  const installElements = document.querySelectorAll('#sidebarInstallPwa, .pwa-install-trigger, #loginInstallPwaBox');
  installElements.forEach(el => {
    if (el) {
      if (installed) {
        el.style.setProperty('display', 'none', 'important');
      } else {
        el.style.removeProperty('display');
      }
    }
  });
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  if (!isAppInstalled()) {
    updateInstallPromptsVisibility();
  }
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  localStorage.setItem('tkst_pwa_installed', 'true');
  updateInstallPromptsVisibility();
  console.log('TKST Alunos app installed!');
});

window.matchMedia('(display-mode: standalone)').addEventListener('change', (e) => {
  if (e.matches) {
    localStorage.setItem('tkst_pwa_installed', 'true');
  }
  updateInstallPromptsVisibility();
});

document.addEventListener('DOMContentLoaded', () => {
  // State
  let currentTab = 'login';
  let selectedBeltKyu = 6;
  let kataSearchQuery = '';
  let glossaryCategory = 'all';
  let glossarySearchQuery = '';
  let authMode = 'student-login';
  let adminSubTab = 'students'; // 'students', 'pending', 'dojos', 'kata-videos', 'files'
  
  // Quiz State
  let currentQuizIndex = 0;
  let quizScore = 0;
  let quizAnswered = false;
  let currentQuizQuestions = [];

  // DOM Elements
  const mainContent = document.getElementById('mainContent');
  const breadcrumbCurrent = document.getElementById('breadcrumbCurrent');
  const navLinks = document.querySelectorAll('.nav-link, .mobile-nav-item');
  const detailModal = document.getElementById('detailModal');
  const videoModal = document.getElementById('videoModal');
  const sidebar = document.getElementById('sidebar');

  function getBeltBadgeClass(belt) {
    if (!belt) return 'badge-branca';
    const b = belt.toLowerCase();
    if (b.includes('preta') || b.includes('dan') || b.includes('sensei')) return 'badge-preta';
    if (b.includes('marrom')) return 'badge-marrom';
    if (b.includes('roxa')) return 'badge-roxa';
    if (b.includes('verde')) return 'badge-verde';
    if (b.includes('laranja')) return 'badge-laranja';
    if (b.includes('vermelha')) return 'badge-vermelha';
    if (b.includes('amarela')) return 'badge-amarela';
    return 'badge-branca';
  }

  function getBeltImage(beltName) {
    if (!beltName) return 'assets/images/faixas/faixa-branca.png';
    const b = beltName.toLowerCase();
    if (b.includes('preta') || b.includes('dan') || b.includes('sensei') || b.includes('shodan') || b.includes('nidan') || b.includes('sandan') || b.includes('yondan') || b.includes('godan')) {
      return 'assets/images/faixas/faixa-preta.png';
    }
    if (b.includes('marrom')) return 'assets/images/faixas/faixa-marrom.png';
    if (b.includes('roxa')) return 'assets/images/faixas/faixa-roxa.png';
    if (b.includes('verde')) return 'assets/images/faixas/faixa-verde.png';
    if (b.includes('laranja')) return 'assets/images/faixas/faixa-laranja.png';
    if (b.includes('vermelha')) return 'assets/images/faixas/faixa-vermelha.png';
    if (b.includes('amarela')) return 'assets/images/faixas/faixa-amarela.png';
    return 'assets/images/faixas/faixa-branca.png';
  }

  // Video Helpers
  function getCustomKataVideos() {
    try {
      return JSON.parse(localStorage.getItem('tkst_custom_kata_videos')) || {};
    } catch (e) {
      return {};
    }
  }

  function extractYouTubeId(url) {
    if (!url) return null;
    let clean = url.trim();
    const srcMatch = clean.match(/src=["']([^"']+)["']/i);
    if (srcMatch && srcMatch[1]) clean = srcMatch[1].trim();

    if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) return clean;

    const shortMatch = clean.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/i);
    if (shortMatch && shortMatch[1]) return shortMatch[1];

    const pathMatch = clean.match(/\/(?:embed|v|shorts|live)\/([a-zA-Z0-9_-]{11})/i);
    if (pathMatch && pathMatch[1]) return pathMatch[1];

    const paramMatch = clean.match(/[?&]v=([a-zA-Z0-9_-]{11})/i);
    if (paramMatch && paramMatch[1]) return paramMatch[1];

    const genMatch = clean.match(/(?:youtube(?:-nocookie)?\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
    if (genMatch && genMatch[1]) return genMatch[1];

    return null;
  }

  function extractGoogleDriveId(url) {
    if (!url) return null;
    let clean = url.trim();
    const srcMatch = clean.match(/src=["']([^"']+)["']/i);
    if (srcMatch && srcMatch[1]) clean = srcMatch[1].trim();
    const match = clean.match(/drive\.google\.com\/(?:file\/d\/([a-zA-Z0-9_-]+)|open\?id=([a-zA-Z0-9_-]+)|uc\?id=([a-zA-Z0-9_-]+))/i);
    return match ? (match[1] || match[2] || match[3]) : null;
  }

  function extractVimeoId(url) {
    if (!url) return null;
    let clean = url.trim();
    const srcMatch = clean.match(/src=["']([^"']+)["']/i);
    if (srcMatch && srcMatch[1]) clean = srcMatch[1].trim();
    const match = clean.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
    return match ? match[1] : null;
  }

  function getEmbedUrl(rawUrl) {
    if (!rawUrl) return { type: 'none', url: '', rawUrl: '' };
    let url = rawUrl.trim();

    // If iframe snippet was pasted: <iframe ... src="...">
    const srcMatch = url.match(/src=["']([^"']+)["']/i);
    if (srcMatch && srcMatch[1]) {
      url = srcMatch[1].trim();
    }

    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('blob:') && !url.startsWith('data:') && !url.startsWith('videos/')) {
      url = 'https://' + url;
    }

    // 1. YouTube
    const ytId = extractYouTubeId(url);
    if (ytId) {
      return {
        type: 'iframe',
        url: `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0&playsinline=1&modestbranding=1`,
        rawUrl: url
      };
    }

    // 2. Google Drive
    const gDriveId = extractGoogleDriveId(url);
    if (gDriveId) {
      return {
        type: 'iframe',
        url: `https://drive.google.com/file/d/${gDriveId}/preview`,
        rawUrl: url
      };
    }

    // 3. Vimeo
    const vimeoId = extractVimeoId(url);
    if (vimeoId) {
      return {
        type: 'iframe',
        url: `https://player.vimeo.com/video/${vimeoId}?autoplay=1`,
        rawUrl: url
      };
    }

    // 4. Direct Video Files (.mp4, .webm, .ogg, .mov, .m4v, blob:, local)
    if (url.match(/\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i) || url.startsWith('blob:') || url.startsWith('data:video/') || url.startsWith('videos/')) {
      return {
        type: 'video',
        url: url,
        rawUrl: url
      };
    }

    // 5. General Web Page (Embed as iframe)
    return {
      type: 'iframe',
      url: url,
      rawUrl: url
    };
  }

  // Initialize
  function init() {
    setupNavigation();
    setupUserDisplay();
    setupGlobalEvents();

    // Listen to real-time background cloud sync events from auth.js
    window.addEventListener('tkst_cloud_synced', () => {
      renderView(currentTab);
      setupUserDisplay();
    });
    window.addEventListener('tkst_user_changed', () => {
      renderView(currentTab);
      setupUserDisplay();
    });

    // Register Service Worker for PWA desktop/mobile installation
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').then((reg) => {
        reg.update(); // auto check for updates
      }).catch((err) => {
        console.log('SW registration note:', err);
      });

      // Auto-reload when service worker updates to apply changes in real-time
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }

    const user = window.TKST_AUTH.getCurrentUser();
    if (!user) {
      switchTab('login');
      // Auto open registration modal if accessed via invitation link ?cadastro=1
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('cadastro') === '1') {
        setTimeout(() => {
          if (window.TKST_APP && window.TKST_APP.openRegisterModal) {
            window.TKST_APP.openRegisterModal();
          }
        }, 350);
      }
    } else {
      switchTab('dashboard');
    }

    updateInstallPromptsVisibility();
  }

  // Setup Sidebar & Mobile Nav
  function setupNavigation() {
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = link.getAttribute('data-tab');
        if (tab) {
          switchTab(tab);
          if (sidebar) sidebar.classList.remove('open');
        }
      });
    });

    const menuBtn = document.getElementById('mobileMenuToggle');
    if (menuBtn && sidebar) {
      menuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
      });
    }
  }

  function switchTab(tabName) {
    const user = window.TKST_AUTH.getCurrentUser();

    // Guard: Require login for private tabs
    if (!user && tabName !== 'login' && tabName !== 'katas' && tabName !== 'glossary' && tabName !== 'philosophy') {
      tabName = 'login';
    }

    currentTab = tabName;
    navLinks.forEach(l => {
      if (l.getAttribute('data-tab') === tabName) {
        l.classList.add('active');
      } else {
        l.classList.remove('active');
      }
    });

    renderView(tabName);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function setupUserDisplay() {
    const user = window.TKST_AUTH.getCurrentUser();
    const userNames = document.querySelectorAll('.user-name-display');
    const userBelts = document.querySelectorAll('.user-belt-display');
    const userAvatars = document.querySelectorAll('.user-avatar-display');
    const adminNavItems = document.querySelectorAll('.admin-only-nav');
    const headerUserArea = document.getElementById('headerUserArea');

    if (!user) {
      userNames.forEach(el => el.textContent = 'Visitante');
      userBelts.forEach(el => el.textContent = 'Clique para Entrar');
      adminNavItems.forEach(el => el.style.display = 'none');
      if (headerUserArea) {
        headerUserArea.innerHTML = `
          <button class="btn btn-primary" onclick="window.TKST_APP.switchTab('login')" style="font-size: 0.78rem; padding: 6px 12px;">
            <i class="fas fa-sign-in-alt"></i> Entrar
          </button>
        `;
      }
      return;
    }

    userNames.forEach(el => el.textContent = user.name);
    userBelts.forEach(el => el.textContent = user.currentBelt);
    userAvatars.forEach(el => {
      if (user.avatar) el.src = user.avatar;
    });

    const isAdmin = window.TKST_AUTH.isAdmin();
    const students = window.TKST_AUTH.getAllStudents();
    const pendingCount = students.filter(s => s.status === 'pending').length;

    adminNavItems.forEach(el => {
      el.style.display = isAdmin ? 'block' : 'none';
      const link = el.querySelector('a');
      if (link) {
        let badge = link.querySelector('.admin-pending-badge');
        if (pendingCount > 0) {
          if (!badge) {
            badge = document.createElement('span');
            badge.className = 'nav-badge admin-pending-badge';
            badge.style.cssText = 'background: #E63946; color: #FFF; font-weight: 800; animation: pulse 2s infinite; margin-left: 6px;';
            link.appendChild(badge);
          }
          badge.textContent = `${pendingCount} Pendente${pendingCount > 1 ? 's' : ''}`;
        } else if (badge) {
          badge.remove();
        }
      }
    });

    if (user.currentKyu !== undefined) {
      selectedBeltKyu = user.currentKyu;
    }

    if (headerUserArea) {
      headerUserArea.innerHTML = `
        ${isAdmin ? `
          <button class="btn btn-gold" onclick="window.TKST_APP.setAdminSubTab('pending'); window.TKST_APP.switchTab('admin')" style="font-size: 0.78rem; padding: 6px 12px; white-space: nowrap; position: relative;" title="Painel Master Sensei Diego">
            <i class="fas fa-crown"></i> Painel Admin
            ${pendingCount > 0 ? `<span class="header-notification-pill" title="${pendingCount} cadastro(s) pendente(s)">${pendingCount}</span>` : ''}
          </button>
        ` : ''}
        <button class="btn btn-secondary" onclick="window.TKST_APP.openEditProfileModal()" style="font-size: 0.78rem; padding: 6px 10px; border-color: rgba(255, 183, 3, 0.35); color: var(--accent-gold); white-space: nowrap;" title="Editar Perfil e Informações">
          <i class="fas fa-user-edit"></i> <span class="hide-mobile">Perfil</span>
        </button>
        <button class="btn btn-secondary" onclick="window.TKST_APP.handleLogout()" style="font-size: 0.78rem; padding: 6px 10px; background: rgba(230, 57, 70, 0.15); border-color: rgba(230, 57, 70, 0.4); color: #FF808A; white-space: nowrap;" title="Sair da Conta">
          <i class="fas fa-power-off"></i> <span class="hide-mobile">Sair</span>
        </button>
      `;
    }
  }

  function setupGlobalEvents() {
    window.addEventListener('tkst_user_changed', () => {
      setupUserDisplay();
      renderView(currentTab);
    });

    window.addEventListener('tkst_progress_updated', () => {
      if (currentTab === 'dashboard' || currentTab === 'my-exam') {
        renderView(currentTab);
      }
    });

    window.addEventListener('tkst_cloud_synced', () => {
      setupUserDisplay();
      renderView(currentTab);
    });

    window.addEventListener('tkst_videos_updated', () => {
      renderView(currentTab);
    });
  }

  // Master View Switcher
  function renderView(viewName) {
    const user = window.TKST_AUTH.getCurrentUser();

    if (!user) {
      document.body.classList.add('login-view-active');
    } else {
      document.body.classList.remove('login-view-active');
    }

    switch (viewName) {
      case 'login':
      case 'account':
        if (!user) {
          breadcrumbCurrent.textContent = 'Acesso ao Portal TKST';
          renderLogin();
        } else if (window.TKST_AUTH.isAdmin()) {
          breadcrumbCurrent.textContent = 'Painel Geral do Administrador (Sensei Diego)';
          renderAdminMaster();
        } else {
          breadcrumbCurrent.textContent = 'Minha Conta do Aluno';
          renderStudentAccount();
        }
        break;
      case 'dashboard':
        breadcrumbCurrent.textContent = 'Dashboard do Aluno';
        if (!user) { renderLogin(); return; }
        renderDashboard();
        break;
      case 'my-exam':
        breadcrumbCurrent.textContent = 'Plano de estudos';
        renderMyExam();
        break;
      case 'katas':
        breadcrumbCurrent.textContent = 'Biblioteca dos 26 Kata';
        renderKatasLibrary();
        break;
      case 'kumite':
        breadcrumbCurrent.textContent = 'Guia de Kumite & Aplicações';
        renderKumiteGuide();
        break;
      case 'glossary':
        breadcrumbCurrent.textContent = 'Dicionário Japonês de Karatê';
        renderGlossary();
        break;
      case 'quiz':
        breadcrumbCurrent.textContent = 'Simulador de Exame';
        renderQuiz();
        break;
      case 'philosophy':
        breadcrumbCurrent.textContent = 'Dojo Kun & Filosofia';
        renderPhilosophy();
        break;
      case 'admin':
        breadcrumbCurrent.textContent = 'Painel Geral do Administrador (Sensei Diego)';
        if (!window.TKST_AUTH.isAdmin()) {
          alert('Acesso restrito ao Administrador Geral (Sensei Diego).');
          renderLogin();
          return;
        }
        renderAdminMaster();
        break;
      default:
        if (!user) renderLogin();
        else renderDashboard();
    }

    updateInstallPromptsVisibility();
  }

  // =========================================================================
  // 1. RENDER STUDENT ACCOUNT (FOR REGULAR STUDENTS)
  // =========================================================================
  function renderStudentAccount() {
    const user = window.TKST_AUTH.getCurrentUser();
    if (!user) {
      renderLogin();
      return;
    }

    let html = `
      <div class="section-header">
        <div class="section-title-group">
          <h3><i class="fas fa-user-circle" style="color: var(--accent-gold);"></i> Minha Conta do Aluno</h3>
          <p>Informações de matrícula e acesso ao portal TKST</p>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">
        <div class="stat-card" style="flex-direction: column; align-items: stretch; padding: 24px;">
          <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 20px;">
            <img src="${user.avatar || 'assets/images/tigre.png'}" alt="Avatar" class="user-avatar" style="width: 60px; height: 60px;">
            <div>
              <h3 style="color: #FFF; font-size: 1.15rem; font-weight: 700; margin-bottom: 2px;">${user.name}</h3>
              <div style="color: var(--accent-gold); font-size: 0.85rem; font-weight: 600;">@${user.username}</div>
            </div>
          </div>

          <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 16px; margin-bottom: 20px; display: flex; flex-direction: column; gap: 10px; font-size: 0.88rem;">
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #94A3B8;">Graduação Atual:</span>
              <strong style="color: #FFF;">${user.currentBelt}</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #94A3B8;">Dojo / Unidade:</span>
              <strong style="color: #FFF;">${user.dojo || 'TKST Matriz'}</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #94A3B8;">Status:</span>
              <span class="badge ${user.status === 'approved' ? 'badge-status-approved' : 'badge-status-pending'}">
                ${user.status === 'approved' ? 'Ativo' : 'Pendente'}
              </span>
            </div>
          </div>

          <button class="btn btn-secondary" onclick="window.TKST_APP.handleLogout()" style="width: 100%; padding: 12px; font-weight: 700; background: rgba(230, 57, 70, 0.15); border-color: rgba(230, 57, 70, 0.4); color: #FF808A;">
            <i class="fas fa-power-off"></i> Deslogar / Sair da Conta
          </button>
        </div>
      </div>
    `;

    mainContent.innerHTML = html;
  }

  // =========================================================================
  // 2. RENDER LOGIN (PURE SINGLE LOGIN SCREEN WITH NICK EXPLANATION)
  // =========================================================================
  function renderLogin() {
    const user = window.TKST_AUTH.getCurrentUser();
    if (user) {
      if (window.TKST_AUTH.isAdmin()) {
        renderAdminMaster();
      } else {
        renderDashboard();
      }
      return;
    }

    let html = `
      <div class="auth-page-wrapper">
        <div class="auth-card">
          <div class="auth-header">
            <img src="assets/images/logo-tkst.png" alt="TKST Karate Logo" class="auth-logo">
            <h2>TKST ALUNOS</h2>
            <p>Portal Oficial de Estudos</p>
          </div>

          <div id="authAlertBox" class="auth-alert"></div>

          <!-- PURE SINGLE LOGIN FORM -->
          <form onsubmit="event.preventDefault(); window.TKST_APP.submitLogin();">
            <div class="form-group" style="margin-bottom: 14px;">
              <label class="form-label" style="font-size: 0.85rem; margin-bottom: 4px;">
                <i class="fas fa-user" style="color: var(--accent-gold); margin-right: 6px;"></i> Usuário
              </label>
              <input type="text" id="loginIdentifier" class="form-input" placeholder="Digite seu usuário ou login" required autocomplete="username" autofocus>
            </div>

            <div class="form-group" style="margin-bottom: 14px;">
              <label class="form-label" style="font-size: 0.85rem; margin-bottom: 4px;">
                <i class="fas fa-lock" style="color: var(--accent-gold); margin-right: 6px;"></i> Senha
              </label>
              <input type="password" id="loginPassword" class="form-input" placeholder="Digite sua senha cadastrada" required autocomplete="current-password">
            </div>

            <!-- Dica de Senha Visível e Destacada no Celular -->
            <div style="display: flex; align-items: center; gap: 8px; background: rgba(255, 183, 3, 0.08); border: 1px solid rgba(255, 183, 3, 0.3); border-radius: var(--radius-sm); padding: 10px 12px; margin-bottom: 18px; font-size: 0.82rem; color: #E2E8F0; line-height: 1.4;">
              <i class="fas fa-info-circle" style="color: var(--accent-gold); font-size: 1rem; flex-shrink: 0;"></i>
              <span><strong>Dica:</strong> A senha contém de 4 a 11 caracteres (letras e números).</span>
            </div>

            <button type="submit" class="btn btn-primary" style="width: 100%; padding: 14px; font-size: 1rem; font-weight: 700;">
              <i class="fas fa-sign-in-alt"></i> Entrar no Sistema
            </button>

            ${!isAppInstalled() ? `
              <div id="loginInstallPwaBox" style="margin-top: 14px;">
                <button type="button" onclick="window.TKST_APP.installPwa()" class="btn btn-secondary" style="width: 100%; padding: 11px; font-size: 0.85rem; border: 1px dashed rgba(255, 183, 3, 0.4); color: var(--accent-gold); background: rgba(255, 183, 3, 0.05); font-weight: 600;">
                  <i class="fas fa-desktop"></i> Instalar App na Área de Trabalho
                </button>
              </div>
            ` : ''}
          </form>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border-color); font-size: 0.85rem;">
            <a href="#" onclick="event.preventDefault(); window.TKST_APP.openRegisterModal();" style="color: var(--accent-gold); text-decoration: none; font-weight: 600;">
              <i class="fas fa-user-plus"></i> Novo Aluno? Cadastrar Matrícula
            </a>
            <span style="color: #64748B; font-size: 0.8rem;">TKST Shotokan 2026</span>
          </div>
        </div>
      </div>
    `;

    mainContent.innerHTML = html;
  }

  // =========================================================================
  // 3. RENDER ADMIN MASTER CONTROL CENTER (irons365)
  // =========================================================================
  function renderAdminMaster() {
    const students = window.TKST_AUTH.getAllStudents();
    const pendingStudents = students.filter(s => s.status === 'pending');
    const approvedStudents = students.filter(s => s.status === 'approved');
    const customVideos = getCustomKataVideos();
    const dojos = window.TKST_AUTH.getDojos();

    let html = `
      <div class="section-header" style="margin-bottom: 20px;">
        <div class="section-title-group" style="width: 100%;">
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 8px;">
            <div class="admin-badge-ribbon" style="margin-bottom: 0;">
              <i class="fas fa-crown"></i> Painel Geral do Administrador (Sensei Diego)
            </div>
            <div style="display: inline-flex; align-items: center; gap: 6px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.35); color: #6EE7B7; padding: 4px 10px; border-radius: var(--radius-full); font-size: 0.72rem; font-weight: 700;">
              <i class="fas fa-cloud" style="color: #10B981;"></i> Nuvem Conectada (PC ⇄ Celular)
            </div>
          </div>
          <h3 style="font-size: 1.3rem; margin-bottom: 4px;">Gerenciamento Completo TKST</h3>
          <p style="font-size: 0.85rem; color: #94A3B8;">Controle de alunos, cadastros de Dojos, vídeos dos 26 Kata e arquivos com sincronização em nuvem.</p>
        </div>

        <div style="display: flex; gap: 8px; flex-wrap: wrap; width: 100%; margin-top: 8px;">
          <button class="btn" onclick="window.TKST_APP.openInviteModal()" style="font-size: 0.82rem; padding: 8px 14px; background: #25D366; color: #FFF; font-weight: 700; border: none; box-shadow: 0 4px 12px rgba(37, 211, 102, 0.3);">
            <i class="fab fa-whatsapp"></i> Convidar Aluno para Cadastro
          </button>
          <button class="btn btn-primary" onclick="window.TKST_APP.openManualStudentModal()" style="font-size: 0.82rem; padding: 8px 14px;">
            <i class="fas fa-user-plus"></i> Novo Aluno Manual
          </button>
          <button class="btn btn-secondary" onclick="window.TKST_APP.exportFullBackup()" style="font-size: 0.82rem; padding: 8px 14px;">
            <i class="fas fa-download"></i> Exportar Backup JSON
          </button>
        </div>
      </div>

      <!-- Admin Stats Grid -->
      <div class="stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 20px;">
        <div class="stat-card" onclick="window.TKST_APP.setAdminSubTab('pending')" style="cursor: pointer; padding: 14px;">
          <div class="stat-icon-box gold" style="width: 42px; height: 42px; font-size: 1.2rem;">
            <i class="fas fa-clock"></i>
          </div>
          <div style="min-width: 0;">
            <div class="stat-value" style="font-size: 1.2rem;">${pendingStudents.length}</div>
            <div class="stat-label" style="font-size: 0.72rem; white-space: nowrap;">Cadastros Pendentes</div>
          </div>
        </div>

        <div class="stat-card" onclick="window.TKST_APP.setAdminSubTab('students')" style="cursor: pointer; padding: 14px;">
          <div class="stat-icon-box emerald" style="width: 42px; height: 42px; font-size: 1.2rem;">
            <i class="fas fa-user-check"></i>
          </div>
          <div style="min-width: 0;">
            <div class="stat-value" style="font-size: 1.2rem;">${approvedStudents.length}</div>
            <div class="stat-label" style="font-size: 0.72rem; white-space: nowrap;">Alunos Ativos</div>
          </div>
        </div>

        <div class="stat-card" onclick="window.TKST_APP.setAdminSubTab('dojos')" style="cursor: pointer; padding: 14px;" title="Gerenciar Dojos">
          <div class="stat-icon-box purple" style="width: 42px; height: 42px; font-size: 1.2rem;">
            <i class="fas fa-torii-gate"></i>
          </div>
          <div style="min-width: 0;">
            <div class="stat-value" style="font-size: 1.2rem;">${dojos.length}</div>
            <div class="stat-label" style="font-size: 0.72rem; white-space: nowrap;">Dojos Cadastrados</div>
          </div>
        </div>

        <div class="stat-card" onclick="window.TKST_APP.setAdminSubTab('kata-videos')" style="cursor: pointer; padding: 14px;" title="Gerenciar Vídeos dos 26 Kata">
          <div class="stat-icon-box blue" style="width: 42px; height: 42px; font-size: 1.2rem;">
            <i class="fas fa-video"></i>
          </div>
          <div style="min-width: 0;">
            <div class="stat-value" style="font-size: 1.2rem;">26 Kata</div>
            <div class="stat-label" style="font-size: 0.72rem; white-space: nowrap;">Vídeos dos Kata</div>
          </div>
        </div>
      </div>

      <!-- Admin Navigation Sub-Tabs -->
      <div class="filter-chips" style="margin-bottom: 20px; display: flex; gap: 8px; overflow-x: auto; -webkit-overflow-scrolling: touch; padding-bottom: 6px;">
        <button class="chip-btn ${adminSubTab === 'pending' ? 'active' : ''}" onclick="window.TKST_APP.setAdminSubTab('pending')" style="flex-shrink: 0; white-space: nowrap;">
          <i class="fas fa-user-clock"></i> Pendentes (${pendingStudents.length})
        </button>
        <button class="chip-btn ${adminSubTab === 'students' ? 'active' : ''}" onclick="window.TKST_APP.setAdminSubTab('students')" style="flex-shrink: 0; white-space: nowrap;">
          <i class="fas fa-users"></i> Alunos Matriculados (${students.length})
        </button>
        <button class="chip-btn ${adminSubTab === 'dojos' ? 'active' : ''}" onclick="window.TKST_APP.setAdminSubTab('dojos')" style="flex-shrink: 0; white-space: nowrap;">
          <i class="fas fa-torii-gate"></i> Dojos / Unidades (${dojos.length})
        </button>
        <button class="chip-btn ${adminSubTab === 'kata-videos' ? 'active' : ''}" onclick="window.TKST_APP.setAdminSubTab('kata-videos')" style="flex-shrink: 0; white-space: nowrap;">
          <i class="fas fa-video"></i> Vídeos dos 26 Kata
        </button>
        <button class="chip-btn ${adminSubTab === 'files' ? 'active' : ''}" onclick="window.TKST_APP.setAdminSubTab('files')" style="flex-shrink: 0; white-space: nowrap;">
          <i class="fas fa-folder-open"></i> Arquivos & Mídias
        </button>
      </div>

      ${adminSubTab === 'pending' ? `
        <!-- PENDING STUDENTS APPROVAL LIST -->
        <div class="admin-table-container">
          <div style="padding: 18px 20px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
            <h4 style="font-family: var(--font-heading); color: #FFF; font-size: 1.15rem;">
              Solicitações de Cadastro Pendentes
            </h4>
            <span style="font-size: 0.82rem; color: var(--accent-gold); font-weight: 600;">
              ${pendingStudents.length} aguardando análise
            </span>
          </div>

          ${pendingStudents.length === 0 ? `
            <div style="padding: 40px; text-align: center; color: #64748B;">
              <i class="fas fa-check-circle" style="font-size: 2.5rem; color: var(--accent-emerald); margin-bottom: 12px; display: block;"></i>
              Nenhum cadastro pendente no momento. Todos os alunos foram revisados!
            </div>
          ` : `
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Aluno</th>
                  <th>Nick de Acesso</th>
                  <th>Contato</th>
                  <th>Faixa</th>
                  <th>Dojo Escolhido</th>
                  <th>Data</th>
                  <th style="text-align: right;">Ações do Sensei</th>
                </tr>
              </thead>
              <tbody>
                ${pendingStudents.map(s => `
                  <tr>
                    <td>
                      <div style="font-weight: 700; color: #FFF;">${s.name}</div>
                    </td>
                    <td>
                      <span class="badge badge-amarela">@${s.username}</span>
                    </td>
                    <td>${s.phone || '-'}</td>
                    <td><span class="badge ${getBeltBadgeClass(s.currentBelt)}">${s.currentBelt}</span></td>
                    <td><strong style="color: var(--accent-gold);">${s.dojo}</strong></td>
                    <td style="color: #94A3B8;">${s.startDate}</td>
                    <td style="text-align: right;">
                      <div class="action-btn-group" style="justify-content: flex-end;">
                        <button class="btn btn-sm btn-success" onclick="window.TKST_APP.approveStudent('${s.id}')" title="Aprovar Aluno">
                          <i class="fas fa-check"></i> Aceitar
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="window.TKST_APP.rejectStudent('${s.id}')" title="Recusar">
                          <i class="fas fa-times"></i> Recusar
                        </button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `}
        </div>
      ` : ''}

      ${adminSubTab === 'students' ? `
        <!-- ALL REGISTERED STUDENTS TABLE -->
        <div class="admin-table-container">
          <div style="padding: 18px 20px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
            <h4 style="font-family: var(--font-heading); color: #FFF; font-size: 1.15rem;">
              Base de Alunos e Praticantes Cadastrados
            </h4>
            <span style="font-size: 0.82rem; color: #94A3B8;">Total: ${students.length} usuários</span>
          </div>

          <table class="admin-table">
            <thead>
              <tr>
                <th>Aluno</th>
                <th>Nick (Matrícula)</th>
                <th>Status</th>
                <th>Faixa</th>
                <th>Dojo / Unidade</th>
                <th style="text-align: right;">Ações</th>
              </tr>
            </thead>
            <tbody>
              ${students.map(s => {
                const isMaster = s.username === 'irons365';
                return `
                  <tr>
                    <td>
                      <div style="display: flex; align-items: center; gap: 10px;">
                        <img src="${s.avatar || 'assets/images/tigre.png'}" style="width: 36px; height: 36px; border-radius: var(--radius-full); object-fit: cover; border: 1px solid var(--border-color);">
                        <div>
                          <div style="font-weight: 700; color: #FFF; display: flex; align-items: center; gap: 6px;">
                            ${s.name} ${isMaster ? '<i class="fas fa-crown" style="color: var(--accent-gold); font-size: 0.8rem;"></i>' : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <strong style="color: var(--accent-gold);">@${s.username}</strong>
                    </td>
                    <td>
                      <span class="badge ${s.status === 'approved' ? 'badge-status-approved' : s.status === 'pending' ? 'badge-status-pending' : 'badge-status-rejected'}">
                        ${s.status === 'approved' ? 'Ativo' : s.status === 'pending' ? 'Pendente' : 'Recusado'}
                      </span>
                    </td>
                    <td>
                      <span class="badge ${getBeltBadgeClass(s.currentBelt)}">${s.currentBelt}</span>
                    </td>
                    <td>${s.dojo}</td>
                    <td style="text-align: right;">
                      ${isMaster ? `
                        <span style="font-size: 0.8rem; color: var(--accent-gold); font-weight: 600;">Conta Master Principal</span>
                      ` : `
                        <button class="btn btn-sm btn-danger" onclick="window.TKST_APP.deleteStudent('${s.id}', '${s.name}')" title="Excluir Aluno">
                          <i class="fas fa-trash"></i> Excluir
                        </button>
                      `}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}

      ${adminSubTab === 'dojos' ? `
        <!-- DOJO / UNIDADES MANAGEMENT -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px;">
          
          <!-- Add New Dojo Card -->
          <div class="stat-card" style="flex-direction: column; align-items: stretch;">
            <h4 style="font-family: var(--font-heading); color: #FFF; font-size: 1.15rem; margin-bottom: 12px;">
              <i class="fas fa-plus-circle" style="color: var(--accent-gold);"></i> Cadastrar Novo Dojo / Unidade
            </h4>
            <p style="font-size: 0.85rem; color: #94A3B8; margin-bottom: 16px;">
              Os Dojos cadastrados aqui serão exibidos automaticamente na lista para os novos alunos escolherem durante a matrícula.
            </p>

            <form onsubmit="event.preventDefault(); window.TKST_APP.submitNewDojo();">
              <div class="form-group">
                <label class="form-label">Nome do Dojo / Unidade</label>
                <input type="text" id="newDojoNameInput" class="form-input" placeholder="ex: TKST Barra da Tijuca" required>
              </div>
              <button type="submit" class="btn btn-primary" style="width: 100%; padding: 12px; font-weight: 700;">
                <i class="fas fa-torii-gate"></i> Cadastrar Dojo
              </button>
            </form>
          </div>

          <!-- Existing Dojos List Card -->
          <div class="stat-card" style="flex-direction: column; align-items: stretch;">
            <h4 style="font-family: var(--font-heading); color: #FFF; font-size: 1.15rem; margin-bottom: 12px;">
              <i class="fas fa-torii-gate" style="color: var(--accent-blue);"></i> Dojos Ativos na Matrícula (${dojos.length})
            </h4>

            <div style="display: flex; flex-direction: column; gap: 10px;">
              ${dojos.map(d => `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: var(--radius-sm);">
                  <div style="font-weight: 700; color: #FFF; display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-map-marker-alt" style="color: var(--accent-gold);"></i> ${d}
                  </div>
                  <button class="btn btn-sm btn-danger" onclick="window.TKST_APP.deleteDojo('${d}')" title="Excluir Dojo">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              `).join('')}
            </div>
          </div>

        </div>
      ` : ''}

      ${adminSubTab === 'kata-videos' ? `
        <!-- 26 KATA VIDEO LINKS MANAGER -->
        <div class="admin-table-container">
          <div style="padding: 18px 20px; border-bottom: 1px solid var(--border-color);">
            <h4 style="font-family: var(--font-heading); color: #FFF; font-size: 1.15rem; display: flex; align-items: center; gap: 8px;">
              <i class="fas fa-video" style="color: var(--accent-gold);"></i> Gerenciador de Vídeos dos 26 Kata
            </h4>
            <p style="font-size: 0.85rem; color: #94A3B8; margin-top: 4px;">
              Insira o link de vídeo do YouTube, Vimeo ou MP4 para cada Kata. Os alunos poderão assistir diretamente dentro da plataforma, sem sair do sistema.
            </p>
          </div>

          <div style="padding: 16px; display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 16px;">
            ${(window.TKST_KATAS || []).map((k, idx) => {
              const currentUrl = customVideos[k.id] || (k.videoFileName ? 'videos/' + k.videoFileName : '');
              const hasVideo = !!currentUrl;
              return `
                <div class="stat-card" style="flex-direction: column; align-items: stretch; padding: 16px; background: rgba(18, 23, 34, 0.85); border-left: 4px solid ${hasVideo ? 'var(--accent-emerald)' : 'var(--border-color)'};">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <div style="font-weight: 700; color: #FFF; font-size: 0.95rem;">
                      ${idx + 1}. ${k.name} <span style="font-family: var(--font-kanji); color: var(--accent-gold); font-size: 0.85rem;">(${k.kanji})</span>
                    </div>
                    <span class="badge ${hasVideo ? 'badge-verde' : 'badge-status-pending'}" style="font-size: 0.7rem;">
                      ${hasVideo ? 'Vídeo Configurado' : 'Sem Link'}
                    </span>
                  </div>

                  <div class="form-group" style="margin-bottom: 10px;">
                    <label style="font-size: 0.72rem; color: #94A3B8; text-transform: uppercase; font-weight: 600; margin-bottom: 4px; display: block;">Link do Vídeo (YouTube / Vimeo / MP4):</label>
                    <input type="text" id="kata_vid_input_${k.id}" class="form-input" placeholder="ex: https://www.youtube.com/watch?v=..." value="${currentUrl}" style="font-size: 0.85rem; padding: 8px 12px;">
                  </div>

                  <div style="display: flex; gap: 8px; justify-content: flex-end;">
                    <button class="btn btn-sm btn-primary" onclick="window.TKST_APP.saveKataVideo('${k.id}')" style="font-size: 0.78rem; padding: 6px 12px;">
                      <i class="fas fa-save"></i> Salvar Link
                    </button>
                    <button class="btn btn-sm btn-gold" onclick="window.TKST_APP.testKataVideo('${k.id}', '${k.name}')" style="font-size: 0.78rem; padding: 6px 12px;">
                      <i class="fas fa-play"></i> Testar no Sistema
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      ` : ''}

      ${adminSubTab === 'files' ? `
        <!-- MEDIA & FILES MANAGER -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px;">
          
          <!-- Upload Box -->
          <div class="stat-card" style="flex-direction: column; align-items: stretch;">
            <h4 style="font-family: var(--font-heading); color: #FFF; font-size: 1.15rem; margin-bottom: 12px;">
              <i class="fas fa-cloud-upload-alt" style="color: var(--accent-gold);"></i> Adicionar Foto ou Mídia
            </h4>
            <div class="file-upload-zone" onclick="document.getElementById('adminFileInput').click()">
              <i class="fas fa-images" style="font-size: 2.5rem; color: var(--accent-crimson); margin-bottom: 10px; display: block;"></i>
              <div style="font-weight: 700; color: #FFF;">Clique aqui para selecionar foto ou imagem</div>
              <div style="font-size: 0.8rem; color: #64748B; margin-top: 4px;">Suporta PNG, JPG, WEBP e SVG</div>
              <input type="file" id="adminFileInput" style="display: none;" accept="image/*" onchange="window.TKST_APP.handleFileUpload(event)">
            </div>
            <div id="fileUploadFeedback" style="margin-top: 10px;"></div>
          </div>

          <!-- Existing Core Media Inventory -->
          <div class="stat-card" style="flex-direction: column; align-items: stretch;">
            <h4 style="font-family: var(--font-heading); color: #FFF; font-size: 1.15rem; margin-bottom: 12px;">
              <i class="fas fa-photo-video" style="color: var(--accent-blue);"></i> Acervo de Logos & Assinaturas TKST
            </h4>
            <div style="display: flex; flex-direction: column; gap: 10px; font-size: 0.85rem;">
              <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: rgba(255,255,255,0.03); border-radius: var(--radius-sm);">
                <span><i class="fas fa-image"></i> logo-tkst.png</span>
                <span class="badge badge-verde">Ativo</span>
              </div>
              <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: rgba(255,255,255,0.03); border-radius: var(--radius-sm);">
                <span><i class="fas fa-image"></i> tigre.png (Mascote)</span>
                <span class="badge badge-verde">Ativo</span>
              </div>
              <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: rgba(255,255,255,0.03); border-radius: var(--radius-sm);">
                <span><i class="fas fa-file-signature"></i> assinatura-diego.png</span>
                <span class="badge badge-verde">Ativo</span>
              </div>
              <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: rgba(255,255,255,0.03); border-radius: var(--radius-sm);">
                <span><i class="fas fa-file-signature"></i> assinatura-egger.png</span>
                <span class="badge badge-verde">Ativo</span>
              </div>
            </div>
          </div>

        </div>
      ` : ''}
    `;

    mainContent.innerHTML = html;
  }

  // =========================================================================
  // 3. RENDER DASHBOARD
  // =========================================================================
  function renderDashboard() {
    const user = window.TKST_AUTH.getCurrentUser();
    if (!user) { renderLogin(); return; }

    let currentKyu = user.currentKyu;
    if (user.currentBelt && (user.currentBelt.toLowerCase().includes('preta') || user.currentBelt.toLowerCase().includes('dan') || user.currentBelt.toLowerCase().includes('sensei'))) {
      currentKyu = 0;
    }
    const curriculum = window.TKST_CURRICULUM.find(c => c.kyuNumber === currentKyu) || window.TKST_CURRICULUM[0];
    const progress = window.TKST_AUTH.getProgress();

    const totalKihon = curriculum.kihon ? curriculum.kihon.length : 1;
    let masteredCount = 0;
    if (curriculum.kihon) {
      curriculum.kihon.forEach(k => {
        if (progress.masteredItems && progress.masteredItems[k.id]) masteredCount++;
      });
    }
    const percent = Math.min(100, Math.round((masteredCount / totalKihon) * 100));
    const totalKatas = window.TKST_KATAS ? window.TKST_KATAS.length : 26;

    const isAdmin = window.TKST_AUTH.isAdmin();
    const students = window.TKST_AUTH.getAllStudents();
    const pendingStudents = students.filter(s => s.status === 'pending');

    let html = `
      ${isAdmin && pendingStudents.length > 0 ? `
        <!-- ADMIN PENDING APPROVALS ALERT BANNER -->
        <div class="admin-pending-alert-card" onclick="window.TKST_APP.setAdminSubTab('pending'); window.TKST_APP.switchTab('admin');" title="Toque para ir ao painel de aprovações">
          <div class="admin-pending-alert-left">
            <div class="admin-pending-icon-bell">
              <i class="fas fa-bell"></i>
            </div>
            <div>
              <div class="admin-pending-title">
                <span class="badge badge-vermelha" style="font-size: 0.72rem; padding: 2px 8px; margin-right: 6px;">
                  ${pendingStudents.length} Pendente${pendingStudents.length > 1 ? 's' : ''}
                </span>
                Novos Alunos Cadastrados Aguardando Aprovação!
              </div>
              <div class="admin-pending-subtitle">
                Há matrículas pendentes de autorização. Toque para analisar e liberar o acesso.
              </div>
            </div>
          </div>
          <button type="button" class="btn btn-gold" style="font-size: 0.78rem; padding: 8px 16px; white-space: nowrap; flex-shrink: 0;">
            <i class="fas fa-user-check"></i> Aprovar Alunos
          </button>
        </div>
      ` : ''}

      ${isAdmin ? `
        <div style="background: rgba(37, 211, 102, 0.08); border: 1px solid rgba(37, 211, 102, 0.3); border-radius: var(--radius-md); padding: 12px 16px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 38px; height: 38px; border-radius: 50%; background: rgba(37, 211, 102, 0.2); display: flex; align-items: center; justify-content: center; color: #25D366; font-size: 1.2rem; flex-shrink: 0;">
              <i class="fab fa-whatsapp"></i>
            </div>
            <div>
              <div style="color: #FFF; font-weight: 700; font-size: 0.9rem;">Convidar Novos Alunos</div>
              <div style="color: #94A3B8; font-size: 0.78rem;">Envie o convite oficial com link de matrícula direta no WhatsApp</div>
            </div>
          </div>
          <button class="btn" onclick="window.TKST_APP.openInviteModal()" style="background: #25D366; color: #FFF; font-weight: 700; font-size: 0.82rem; padding: 8px 16px; border-radius: var(--radius-sm); border: none; box-shadow: 0 4px 12px rgba(37, 211, 102, 0.35);">
            <i class="fab fa-whatsapp"></i> Enviar Convite
          </button>
        </div>
      ` : ''}

      <div class="dashboard-hero">
        <div class="hero-content">
          <div class="hero-welcome">
            <h2>Oss, ${user.name}! 🥋</h2>
            <p>Bem-vindo ao seu portal oficial de estudos na <strong>Tradicional Karate-Do Shotokan Tsuyoi (TKST)</strong>.</p>
          </div>
          <div class="hero-rank-display" onclick="window.TKST_APP.openEditProfileModal()" style="cursor: pointer;" title="Toque para editar suas informações e graduação">
            <div class="hero-belt-img-wrapper">
              <img src="${getBeltImage(user.currentBelt)}" alt="${user.currentBelt}" class="hero-belt-img">
            </div>
            <div class="hero-rank-meta" style="flex: 1;">
              <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                <div class="rank-label">Graduação Atual</div>
                <span class="hero-edit-badge"><i class="fas fa-user-edit"></i> Editar Dados</span>
              </div>
              <div class="rank-name">${user.currentBelt}</div>
            </div>
          </div>
        </div>

        <div class="belt-progress-bar-container">
          <div class="belt-progress-bar-fill" style="width: ${percent}%;"></div>
        </div>
        <div class="belt-progress-meta">
          <span>Progresso do Kihon da Próxima Faixa</span>
          <span><strong>${masteredCount} de ${totalKihon}</strong> técnicas estudadas (${percent}%)</span>
        </div>
      </div>

      <!-- Quick Stats -->
      <div class="stats-grid">
        <div class="stat-card" onclick="window.TKST_APP.switchTab('my-exam')" style="cursor: pointer;">
          <div class="stat-icon-box">
            <i class="fas fa-medal"></i>
          </div>
          <div>
            <div class="stat-value">${curriculum.targetBelt.split(' ')[1] || 'Amarela'}</div>
            <div class="stat-label">Matéria de Exame</div>
          </div>
        </div>

        <div class="stat-card" onclick="window.TKST_APP.switchTab('katas')" style="cursor: pointer;">
          <div class="stat-icon-box gold">
            <i class="fas fa-book-open"></i>
          </div>
          <div>
            <div class="stat-value">${totalKatas} Kata</div>
            <div class="stat-label">Biblioteca Shotokan Completa</div>
          </div>
        </div>

        <div class="stat-card" onclick="window.TKST_APP.switchTab('kumite')" style="cursor: pointer;">
          <div class="stat-icon-box blue">
            <i class="fas fa-fist-raised"></i>
          </div>
          <div>
            <div class="stat-value">5 Modalidades</div>
            <div class="stat-label">Sanbon, Kihon Ippon & Jiyu</div>
          </div>
        </div>

        <div class="stat-card" onclick="window.TKST_APP.switchTab('quiz')" style="cursor: pointer;">
          <div class="stat-icon-box emerald">
            <i class="fas fa-brain"></i>
          </div>
          <div>
            <div class="stat-value">Simulador</div>
            <div class="stat-label">Teste Teórico de Exame</div>
          </div>
        </div>
      </div>

      <!-- Main Columns -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px; margin-top: 16px;">
        
        <!-- Left: Quick Checklist of Current Belt -->
        <div class="stat-card" style="flex-direction: column; align-items: stretch;">
          <div class="section-header" style="margin-bottom: 12px;">
            <div class="section-title-group">
              <h3><i class="fas fa-tasks" style="color: var(--accent-crimson);"></i> Treino do Dia - ${curriculum.beltName}</h3>
              <p>Marque as técnicas conforme praticar no Dojo</p>
            </div>
            <button class="btn btn-secondary" style="font-size: 0.78rem; padding: 6px 12px;" onclick="window.TKST_APP.switchTab('my-exam')">Ver Matéria Completa</button>
          </div>

          <div class="technique-list">
            ${curriculum.kihon.slice(0, 4).map(k => {
              const isChecked = progress.masteredItems && progress.masteredItems[k.id];
              return `
                <div class="technique-item ${isChecked ? 'mastered' : ''}">
                  <div class="technique-main">
                    <div class="technique-checkbox ${isChecked ? 'checked' : ''}" onclick="window.TKST_APP.toggleCheck('${k.id}')">
                      <i class="fas fa-check"></i>
                    </div>
                    <div>
                      <div class="technique-name">${k.technique}</div>
                      <div class="technique-meta">
                        <span class="stance">${k.stance}</span> • <span>${k.direction}</span>
                      </div>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Right: Dojo Kun Principle Highlight -->
        <div class="stat-card" style="flex-direction: column; align-items: stretch; background: linear-gradient(135deg, rgba(22, 28, 42, 0.9) 0%, rgba(10, 13, 20, 0.95) 100%);">
          <div class="section-header" style="margin-bottom: 12px;">
            <div class="section-title-group">
              <h3><i class="fas fa-scroll" style="color: var(--accent-gold);"></i> Dojo Kun em Destaque</h3>
              <p>Lema fundamental do Karatê-Dō</p>
            </div>
            <button class="btn btn-secondary" style="font-size: 0.78rem; padding: 6px 12px;" onclick="window.TKST_APP.switchTab('philosophy')">Ver Todos</button>
          </div>

          <div class="dojokun-card" style="margin-top: 10px; border-left-color: var(--accent-gold);">
            <div class="dojokun-jp">一つ！人格完成に努むること！</div>
            <div class="dojokun-pt">Hitotsu! Jinkaku kansei ni tsutomuru koto!</div>
            <div style="color: #FFF; font-weight: 600; margin-bottom: 6px;">Esforçar-se para a formação do caráter!</div>
            <div class="dojokun-desc">O objetivo final do Karatê não é a vitória ou a derrota nos combates, mas sim o aperfeiçoamento do caráter e da integridade moral de seus praticantes.</div>
          </div>
        </div>

      </div>
    `;

    mainContent.innerHTML = html;
  }

  // =========================================================================
  // 4. RENDER MY EXAM (CURRICULUM) & KUMITE INFOGRAPHICS
  // =========================================================================
  function renderBeltKumiteInfographic(curr) {
    const kyu = curr.kyuNumber;
    if (kyu === 0) return ''; // Shodan é diferenciado e não deve ser alterado

    // 6º Kyu (Faixa Amarela) - Gohon Kumite (5 Passos)
    if (kyu === 6 || (curr.kumite.type && curr.kumite.type.includes('Gohon'))) {
      return `
        <!-- ILUSTRAÇÃO DIDÁTICA DO GOHON KUMITE (5 PASSOS) -->
        <div class="gohon-infographic-card">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 12px;">
            <span class="gohon-header-badge">
              <i class="fas fa-project-diagram"></i> Guia Ilustrado Didático • Gohon Kumite (五本組手)
            </span>
            <span style="font-size: 0.76rem; color: #94A3B8; font-style: italic;">Combate Fundamental em 5 Passos</span>
          </div>

          <p style="font-size: 0.88rem; color: #E2E8F0; line-height: 1.6; margin-bottom: 16px;">
            O <strong>Gohon Kumite</strong> é o primeiro estágio do combate tradicional Shotokan. Desenvolve a estabilidade da postura <em>Zenkutsu Dachi</em>, o ritmo sincronizado de avanço/recuo e o controle absoluto da distância (<em>Ma-ai</em>) com finalização em <em>Gyaku Tsuki Chudan</em>.
          </p>

          <!-- Trilha Visual dos 5 Passos -->
          <div class="gohon-timeline">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <strong style="color: var(--accent-gold); font-size: 0.86rem;">
                <i class="fas fa-route" style="margin-right: 6px;"></i> Trilha de Execução dos 5 Passos:
              </strong>
              <span style="font-size: 0.76rem; color: #94A3B8;">Mae avança ➔ Sagate recua</span>
            </div>

            <div class="gohon-steps-track">
              <div class="gohon-step-box">
                <div class="gohon-step-num">1º Passo</div>
                <div class="gohon-step-action">Ataque & Defesa em Zenkutsu</div>
                <div style="font-size: 0.72rem; color: #64748B; margin-top: 4px;">Ajuste de distância</div>
              </div>
              <div class="gohon-step-box">
                <div class="gohon-step-num">2º Passo</div>
                <div class="gohon-step-action">Manutenção de Altura e Base</div>
                <div style="font-size: 0.72rem; color: #64748B; margin-top: 4px;">Ritmo contínuo</div>
              </div>
              <div class="gohon-step-box">
                <div class="gohon-step-num">3º Passo</div>
                <div class="gohon-step-action">Aceleração com Pressão</div>
                <div style="font-size: 0.72rem; color: #64748B; margin-top: 4px;">Foco nos olhos</div>
              </div>
              <div class="gohon-step-box">
                <div class="gohon-step-num">4º Passo</div>
                <div class="gohon-step-action">Preparação para Fechamento</div>
                <div style="font-size: 0.72rem; color: #64748B; margin-top: 4px;">Aproximação decisiva</div>
              </div>
              <div class="gohon-step-box final-step">
                <div class="gohon-step-num">5º Passo (Decisivo)</div>
                <div class="gohon-step-action" style="color: #FFF;">Bloqueio Firme + Gyaku Tsuki Chudan</div>
                <span class="gohon-kiai-tag">KIAI!</span>
              </div>
            </div>
          </div>

          <!-- 3 Séries de Alvos (Jodan, Chudan, Gedan) -->
          <div style="font-size: 0.86rem; font-weight: 700; color: #FFF; margin: 16px 0 10px 0; display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-crosshairs" style="color: var(--accent-crimson);"></i> As 3 Séries Oficiais de Ataque e Defesa:
          </div>

          <div class="gohon-series-grid">
            <!-- Série 1: Jodan -->
            <div class="gohon-series-card" style="border-left: 4px solid #E63946;">
              <div class="gohon-series-title">
                <strong style="color: #FFF; font-size: 0.92rem;">1. Jodan (Alto)</strong>
                <span class="gohon-series-tag" style="background: rgba(230,57,70,0.2); color: #FF808A;">Alvo: Rosto</span>
              </div>
              <div class="gohon-role-row">
                <span class="gohon-role-badge tori">Mae</span>
                <div><strong>5x Oi Tsuki Jodan</strong></div>
              </div>
              <div class="gohon-role-row">
                <span class="gohon-role-badge uke">Sagate</span>
                <div>
                  <strong>5x Age Uke Jodan</strong><br>
                  <span style="font-size: 0.78rem; color: #94A3B8;">( Defesa na altura do rosto )</span>
                </div>
              </div>
              <div style="background: rgba(255,183,3,0.08); border-radius: var(--radius-xs); padding: 8px 10px; font-size: 0.8rem; color: #FFF; border: 1px dashed rgba(255,183,3,0.3);">
                ⚡ <strong>Finalização no 5º passo:</strong> Bloqueia com <em>Age Uke Jodan</em>, firma a base e contra-ataca com <strong>Gyaku Tsuki Chudan</strong> com potente <span style="color: var(--accent-gold); font-weight: 800;">KIAI!</span>
              </div>
            </div>

            <!-- Série 2: Chudan -->
            <div class="gohon-series-card" style="border-left: 4px solid #2A9D8F;">
              <div class="gohon-series-title">
                <strong style="color: #FFF; font-size: 0.92rem;">2. Chudan (Médio)</strong>
                <span class="gohon-series-tag" style="background: rgba(42,157,143,0.2); color: #6EE7B7;">Alvo: Plexo</span>
              </div>
              <div class="gohon-role-row">
                <span class="gohon-role-badge tori">Mae</span>
                <div><strong>5x Oi Tsuki Chudan</strong></div>
              </div>
              <div class="gohon-role-row">
                <span class="gohon-role-badge uke">Sagate</span>
                <div>
                  <strong>5x Soto Uke Chudan</strong><br>
                  <span style="font-size: 0.78rem; color: #94A3B8;">( Defesa de fora para dentro )</span>
                </div>
              </div>
              <div style="background: rgba(255,183,3,0.08); border-radius: var(--radius-xs); padding: 8px 10px; font-size: 0.8rem; color: #FFF; border: 1px dashed rgba(255,183,3,0.3);">
                ⚡ <strong>Finalização no 5º passo:</strong> Bloqueia com <em>Soto Uke Chudan</em>, estabiliza o quadril e contra-ataca com <strong>Gyaku Tsuki Chudan</strong> com <span style="color: var(--accent-gold); font-weight: 800;">KIAI!</span>
              </div>
            </div>

            <!-- Série 3: Gedan -->
            <div class="gohon-series-card" style="border-left: 4px solid #F5BE00;">
              <div class="gohon-series-title">
                <strong style="color: #FFF; font-size: 0.92rem;">3. Gedan (Baixo)</strong>
                <span class="gohon-series-tag" style="background: rgba(255,183,3,0.2); color: #FFD166;">Alvo: Abdômen</span>
              </div>
              <div class="gohon-role-row">
                <span class="gohon-role-badge tori">Mae</span>
                <div><strong>5x Mae Geri Chudan</strong></div>
              </div>
              <div class="gohon-role-row">
                <span class="gohon-role-badge uke">Sagate</span>
                <div>
                  <strong>5x Gedan Barai</strong><br>
                  <span style="font-size: 0.78rem; color: #94A3B8;">( Defesa Abaixo da cintura )</span>
                </div>
              </div>
              <div style="background: rgba(255,183,3,0.08); border-radius: var(--radius-xs); padding: 8px 10px; font-size: 0.8rem; color: #FFF; border: 1px dashed rgba(255,183,3,0.3);">
                ⚡ <strong>Finalização no 5º passo:</strong> Bloqueia com <em>Gedan Barai</em>, calcanhar firme e contra-ataca com <strong>Gyaku Tsuki Chudan</strong> com <span style="color: var(--accent-gold); font-weight: 800;">KIAI!</span>
              </div>
            </div>
          </div>

          <!-- Critérios Essenciais da Banca Examinadora TKST -->
          <div class="gohon-principles-grid">
            <div class="gohon-principle-item">
              <div class="gohon-principle-title"><i class="fas fa-eye"></i> Metsuke (目付け)</div>
              <div class="gohon-principle-desc">Olhar fixo nos olhos do parceiro em todos os passos, sem desviar para o chão ou mãos.</div>
            </div>
            <div class="gohon-principle-item">
              <div class="gohon-principle-title"><i class="fas fa-ruler-combined"></i> Ma-ai & Sun-dome</div>
              <div class="gohon-principle-desc">Distância correta sem encurtar e controle milimétrico parando o golpe a 2-3 cm do alvo.</div>
            </div>
            <div class="gohon-principle-item">
              <div class="gohon-principle-title"><i class="fas fa-bolt"></i> Kiai & Kime</div>
              <div class="gohon-principle-desc">Explosão máxima de energia e Kiai obrigatório no 5º ataque (Mae) e no contragolpe (Sagate).</div>
            </div>
            <div class="gohon-principle-item">
              <div class="gohon-principle-title"><i class="fas fa-shield-alt"></i> Zanshin (残心)</div>
              <div class="gohon-principle-desc">Manter a guarda de alerta e base sólida por 2 segundos antes de retornar à postura inicial.</div>
            </div>
          </div>
        </div>
      `;
    }

    // 5º Kyu (Faixa Vermelha) - Sanbon Kumite (1ª e 2ª Forma)
    if (kyu === 5) {
      return `
        <!-- ILUSTRAÇÃO DIDÁTICA DO SANBON KUMITE (3 PASSOS - 1ª E 2ª FORMA) -->
        <div class="gohon-infographic-card">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 12px;">
            <span class="gohon-header-badge" style="background: rgba(230, 57, 70, 0.2); border-color: rgba(230, 57, 70, 0.5); color: #FF808A;">
              <i class="fas fa-project-diagram"></i> Guia Ilustrado Didático • Sanbon Kumite (三本組手)
            </span>
            <span style="font-size: 0.76rem; color: #94A3B8; font-style: italic;">1ª e 2ª Forma Oficial (Faixa Vermelha)</span>
          </div>

          <p style="font-size: 0.88rem; color: #E2E8F0; line-height: 1.6; margin-bottom: 16px;">
            O <strong>Sanbon Kumite</strong> trabalha a combinação de 3 ataques contínuos em níveis diferentes (Jodan, Chudan e Mae Geri). Sagate recua bloqueando em <em>Zenkutsu Dachi</em> e no 3º passo executa esquiva com contra-ataque decisivo e <strong>KIAI!</strong>
          </p>

          <!-- Trilha Visual dos 3 Passos -->
          <div class="gohon-timeline">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <strong style="color: var(--accent-gold); font-size: 0.86rem;">
                <i class="fas fa-route" style="margin-right: 6px;"></i> Sequência dos 3 Ataques Contínuos (Mae):
              </strong>
              <span style="font-size: 0.76rem; color: #94A3B8;">Mae avança ➔ Sagate recua</span>
            </div>

            <div class="gohon-steps-track" style="grid-template-columns: repeat(3, 1fr);">
              <div class="gohon-step-box">
                <div class="gohon-step-num">1º Passo</div>
                <div class="gohon-step-action">Oi Tsuki Jodan (Rosto)</div>
                <div style="font-size: 0.72rem; color: #64748B; margin-top: 4px;">Bloqueio: Age Uke Jodan</div>
              </div>
              <div class="gohon-step-box">
                <div class="gohon-step-num">2º Passo</div>
                <div class="gohon-step-action">Oi Tsuki Chudan (Tronco)</div>
                <div style="font-size: 0.72rem; color: #64748B; margin-top: 4px;">Bloqueio: Soto / Uchi Uke Chudan</div>
              </div>
              <div class="gohon-step-box final-step">
                <div class="gohon-step-num">3º Passo</div>
                <div class="gohon-step-action" style="color: #FFF;">Mae Geri Chudan</div>
                <span class="gohon-kiai-tag">KIAI!</span>
              </div>
            </div>
          </div>

          <!-- As 2 Formas de Resposta Técnica (1ª e 2ª Forma) -->
          <div style="font-size: 0.86rem; font-weight: 700; color: #FFF; margin: 16px 0 10px 0; display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-shield-alt" style="color: var(--accent-gold);"></i> Formas de Defesa e Contra-Ataque (Sagate):
          </div>

          <div class="gohon-series-grid">
            <!-- 1ª Forma -->
            <div class="gohon-series-card" style="border-left: 4px solid #E63946;">
              <div class="gohon-series-title">
                <strong style="color: #FFF; font-size: 0.92rem;">1ª Forma de Defesa</strong>
                <span class="gohon-series-tag" style="background: rgba(230,57,70,0.2); color: #FF808A;">Zenkutsu Dachi</span>
              </div>
              <div class="gohon-role-row">
                <span class="gohon-role-badge tori">Mae</span>
                <div>1º Oi Tsuki Jodan ➔ 2º Oi Tsuki Chudan ➔ 3º Mae Geri Chudan</div>
              </div>
              <div class="gohon-role-row">
                <span class="gohon-role-badge uke">Sagate</span>
                <div>
                  <strong>1º Age Uke Jodan</strong><br>
                  <span style="font-size: 0.78rem; color: #94A3B8;">( Defesa na altura do rosto )</span><br>
                  <strong>2º Soto Uke Chudan</strong><br>
                  <span style="font-size: 0.78rem; color: #94A3B8;">( Defesa de fora para dentro )</span><br>
                  <strong>3º Gedan Barai</strong><br>
                  <span style="font-size: 0.78rem; color: #94A3B8;">( Defesa Abaixo da cintura )</span><br>
                  <strong>4º Gyaku Tsuki Chudan</strong>
                </div>
              </div>
              <div style="background: rgba(255,183,3,0.08); border-radius: var(--radius-xs); padding: 8px 10px; font-size: 0.8rem; color: #FFF; border: 1px dashed rgba(255,183,3,0.3);">
                ⚡ <strong>Finalização no 3º passo:</strong> Bloqueia em <em>Zenkutsu</em> e desfere contra-ataque de <strong>Gyaku Tsuki Chudan</strong> com <span style="color: var(--accent-gold); font-weight: 800;">KIAI!</span>
              </div>
            </div>

            <!-- 2ª Forma -->
            <div class="gohon-series-card" style="border-left: 4px solid #2A9D8F;">
              <div class="gohon-series-title">
                <strong style="color: #FFF; font-size: 0.92rem;">2ª Forma de Defesa</strong>
                <span class="gohon-series-tag" style="background: rgba(42,157,143,0.2); color: #6EE7B7;">Sequência Oficial</span>
              </div>
              <div class="gohon-role-row">
                <span class="gohon-role-badge tori">Mae</span>
                <div>1º Oi Tsuki Jodan ➔ 2º Oi Tsuki Chudan ➔ 3º Mae Geri Chudan</div>
              </div>
              <div class="gohon-role-row">
                <span class="gohon-role-badge uke">Sagate</span>
                <div>
                  <strong>1º Age Uke Jodan</strong><br>
                  <span style="font-size: 0.78rem; color: #94A3B8;">( Defesa na altura do rosto )</span><br>
                  <strong>2º Uchi Uke Chudan</strong><br>
                  <span style="font-size: 0.78rem; color: #94A3B8;">( Defesa de dentro para fora )</span><br>
                  <strong>3º Gyaku Gedan Barai</strong><br>
                  <span style="font-size: 0.78rem; color: #94A3B8;">( Defesa Abaixo da cintura )</span><br>
                  <strong>4º Kizame Tsuki Jodan</strong><br>
                  <strong>5º Gyaku Tsuki Chudan</strong>
                </div>
              </div>
              <div style="background: rgba(255,183,3,0.08); border-radius: var(--radius-xs); padding: 8px 10px; font-size: 0.8rem; color: #FFF; border: 1px dashed rgba(255,183,3,0.3);">
                ⚡ <strong>Finalização no 3º passo:</strong> Bloqueia com <em>Gyaku Gedan Barai</em> e aplica contra-ataque duplo de <strong>Kizame Tsuki Jodan + Gyaku Tsuki Chudan</strong> com <span style="color: var(--accent-gold); font-weight: 800;">KIAI!</span>
              </div>
            </div>
          </div>

          <!-- Princípios da Banca -->
          <div class="gohon-principles-grid">
            <div class="gohon-principle-item">
              <div class="gohon-principle-title"><i class="fas fa-tachometer-alt"></i> Ritmo Contínuo</div>
              <div class="gohon-principle-desc">Os 3 passos devem fluir sem pausas intermediárias, mantendo o nível do quadril nivelado.</div>
            </div>
            <div class="gohon-principle-item">
              <div class="gohon-principle-title"><i class="fas fa-crosshairs"></i> Alvo e Distância</div>
              <div class="gohon-principle-desc">Cada ataque deve mirar com exatidão o ponto vital (rosto, plexo solar e abdômen).</div>
            </div>
            <div class="gohon-principle-item">
              <div class="gohon-principle-title"><i class="fas fa-bolt"></i> Kiai Decisivo</div>
              <div class="gohon-principle-desc">Kiai explosivo de Mae no 3º chute e de Sagate no contra-ataque finalizador.</div>
            </div>
            <div class="gohon-principle-item">
              <div class="gohon-principle-title"><i class="fas fa-shield-alt"></i> Zanshin & Base</div>
              <div class="gohon-principle-desc">Base Zenkutsu Dachi imóvel e estabilizada por 2 segundos antes de retornar ao Yoi.</div>
            </div>
          </div>
        </div>
      `;
    }

    // 4º Kyu (Faixa Laranja) - Sanbon Kumite Avançado (3ª, 4ª e 5ª Forma)
    if (kyu === 4) {
      return `
        <!-- ILUSTRAÇÃO DIDÁTICA DO SANBON KUMITE AVANÇADO (3ª, 4ª E 5ª FORMA) -->
        <div class="gohon-infographic-card">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 12px;">
            <span class="gohon-header-badge" style="background: rgba(245, 190, 0, 0.2); border-color: rgba(245, 190, 0, 0.5); color: #FFD166;">
              <i class="fas fa-project-diagram"></i> Guia Ilustrado Didático • Sanbon Kumite Avançado (三本組手)
            </span>
            <span style="font-size: 0.76rem; color: #94A3B8; font-style: italic;">3ª, 4ª e 5ª Forma (Faixa Laranja)</span>
          </div>

          <p style="font-size: 0.88rem; color: #E2E8F0; line-height: 1.6; margin-bottom: 16px;">
            Na Faixa Laranja, o <strong>Sanbon Kumite</strong> introduz o trabalho de esquiva corporal angular (<em>Tai Sabaki</em> a 45°/90°), defesas com transição para <em>Kiba Dachi</em> e contra-ataques simultâneos de cotovelada (<em>Empi</em>) e punho lateral (<em>Kage Tsuki</em>).
          </p>

          <!-- As 3 Formas Avançadas (Faixa Laranja) -->
          <div class="gohon-series-grid">
            <!-- 3ª Forma -->
            <div class="gohon-series-card" style="border-left: 4px solid #E63946;">
              <div class="gohon-series-title">
                <strong style="color: #FFF; font-size: 0.92rem;">3ª Forma de Defesa</strong>
                <span class="gohon-series-tag" style="background: rgba(230,57,70,0.2); color: #FF808A;">Esquiva 45°</span>
              </div>
              <div class="gohon-role-row">
                <span class="gohon-role-badge tori">Mae</span>
                <div>1º Oi Tsuki Jodan ➔ 2º Oi Tsuki Chudan ➔ 3º Mae Geri Chudan</div>
              </div>
              <div class="gohon-role-row">
                <span class="gohon-role-badge uke">Sagate</span>
                <div>
                  <strong>1º Sokumen Haiwan Age Uke Jodan</strong> (Esquiva 45°)<br>
                  <strong>2º Morote Uke Chudan</strong> (Bloqueio duplo reforçado)<br>
                  <strong>3º Sukui Uke</strong> (Colher a perna no chute)<br>
                  <strong>4º Gyaku Tsuki Chudan</strong> (Contra-ataque decisivo)
                </div>
              </div>
              <div style="background: rgba(255,183,3,0.08); border-radius: var(--radius-xs); padding: 8px 10px; font-size: 0.8rem; color: #FFF; border: 1px dashed rgba(255,183,3,0.3);">
                ⚡ <strong>Finalização no 3º passo:</strong> Colhe a perna com <em>Sukui Uke</em> e dispara contra-ataque de <strong>Gyaku Tsuki Chudan</strong> com <span style="color: var(--accent-gold); font-weight: 800;">KIAI!</span>
              </div>
            </div>

            <!-- 4ª Forma -->
            <div class="gohon-series-card" style="border-left: 4px solid #2A9D8F;">
              <div class="gohon-series-title">
                <strong style="color: #FFF; font-size: 0.92rem;">4ª Forma de Defesa</strong>
                <span class="gohon-series-tag" style="background: rgba(42,157,143,0.2); color: #6EE7B7;">Kiba Dachi</span>
              </div>
              <div class="gohon-role-row">
                <span class="gohon-role-badge tori">Mae</span>
                <div>1º Oi Tsuki Jodan ➔ 2º Oi Tsuki Chudan ➔ 3º Mae Geri Chudan</div>
              </div>
              <div class="gohon-role-row">
                <span class="gohon-role-badge uke">Sagate</span>
                <div>
                  <strong>1º Yama Uke</strong> (Bloqueio em U)<br>
                  <strong>2º Teisho Uke Chudan</strong> (Bloqueio com a palma da mão)<br>
                  <strong>3º Haiwan Uke Gedan</strong><br>
                  <strong>4º Kage Tsuki Chudan</strong> (Contra-ataque lateral)
                </div>
              </div>
              <div style="background: rgba(255,183,3,0.08); border-radius: var(--radius-xs); padding: 8px 10px; font-size: 0.8rem; color: #FFF; border: 1px dashed rgba(255,183,3,0.3);">
                ⚡ <strong>Finalização no 3º passo:</strong> Bloqueia com <em>Haiwan Uke Gedan</em> e desfere contra-ataque de <strong>Kage Tsuki Chudan</strong> potente com <span style="color: var(--accent-gold); font-weight: 800;">KIAI!</span>
              </div>
            </div>

            <!-- 5ª Forma -->
            <div class="gohon-series-card" style="border-left: 4px solid #F5BE00;">
              <div class="gohon-series-title">
                <strong style="color: #FFF; font-size: 0.92rem;">5ª Forma de Defesa</strong>
                <span class="gohon-series-tag" style="background: rgba(255,183,3,0.2); color: #FFD166;">Tenchi Waza</span>
              </div>
              <div class="gohon-role-row">
                <span class="gohon-role-badge tori">Mae</span>
                <div>1º Oi Tsuki Jodan ➔ 2º Oi Tsuki Chudan ➔ 3º Mae Geri Chudan</div>
              </div>
              <div class="gohon-role-row">
                <span class="gohon-role-badge uke">Sagate</span>
                <div>
                  <strong>1º Tenchi Age Uke Jodan</strong><br>
                  <strong>2º Tenchi Uchi Uke Chudan</strong><br>
                  <strong>3º Tenchi Gedan Barai</strong><br>
                  <strong>4º Gyaku Tsuki Chudan</strong> (Contra-ataque decisivo)
                </div>
              </div>
              <div style="background: rgba(255,183,3,0.08); border-radius: var(--radius-xs); padding: 8px 10px; font-size: 0.8rem; color: #FFF; border: 1px dashed rgba(255,183,3,0.3);">
                ⚡ <strong>Finalização no 3º passo:</strong> Bloqueia firme com <em>Tenchi Gedan Barai</em> e finaliza com contra-ataque potente de <strong>Gyaku Tsuki Chudan</strong> com <span style="color: var(--accent-gold); font-weight: 800;">KIAI!</span>
              </div>
            </div>
          </div>

          <!-- Princípios da Banca -->
          <div class="gohon-principles-grid">
            <div class="gohon-principle-item">
              <div class="gohon-principle-title"><i class="fas fa-compass"></i> Tai Sabaki (Esquivas)</div>
              <div class="gohon-principle-desc">Sair da linha de ataque em ângulo de 45° ou 90° mantendo o tronco ereto e o centro de gravidade baixo.</div>
            </div>
            <div class="gohon-principle-item">
              <div class="gohon-principle-title"><i class="fas fa-horse"></i> Base Kiba Dachi</div>
              <div class="gohon-principle-desc">Joelhos bem abertos e apontados para fora na transição para a postura do cavaleiro.</div>
            </div>
            <div class="gohon-principle-item">
              <div class="gohon-principle-title"><i class="fas fa-bolt"></i> Sincronia de Contragolpe</div>
              <div class="gohon-principle-desc">O contra-ataque deve ocorrer no mesmo momento em que o bloqueio se consolida.</div>
            </div>
            <div class="gohon-principle-item">
              <div class="gohon-principle-title"><i class="fas fa-shield-alt"></i> Zanshin</div>
              <div class="gohon-principle-desc">Atenção total e guarda defensiva mantida antes do retorno ao Yoi.</div>
            </div>
          </div>
        </div>
      `;
    }

    // 3º Kyu (Faixa Verde) - Kihon Ippon Kumite (1ª e 2ª Forma)
    if (kyu === 3) {
      return `
        <!-- ILUSTRAÇÃO DIDÁTICA DO KIHON IPPON KUMITE (1ª E 2ª FORMA) -->
        <div class="gohon-infographic-card">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 12px;">
            <span class="gohon-header-badge" style="background: rgba(16, 185, 129, 0.2); border-color: rgba(16, 185, 129, 0.5); color: #6EE7B7;">
              <i class="fas fa-bolt"></i> Guia Ilustrado Didático • Kihon Ippon Kumite (基本一本組手)
            </span>
            <span style="font-size: 0.76rem; color: #94A3B8; font-style: italic;">Combate em 1 Passo (1ª e 2ª Forma)</span>
          </div>

          <p style="font-size: 0.88rem; color: #E2E8F0; line-height: 1.6; margin-bottom: 16px;">
            O <strong>Kihon Ippon Kumite</strong> é o combate de um único ataque anunciado com antecedência em <em>Kamae</em>. O atacante (Mae) dispara em velocidade explosiva e o defensor (Sagate) executa bloqueio sólido e contragolpe fulminante (<em>Ikken Hissatsu</em>) com Kiai imediato.
          </p>

          <!-- As 3 Séries Exigidas (Jodan, Chudan, Mae Geri) -->
          <div class="gohon-series-grid">
            <!-- Oi Tsuki Jodan -->
            <div class="gohon-series-card" style="border-left: 4px solid #E63946;">
              <div class="gohon-series-title">
                <strong style="color: #FFF; font-size: 0.92rem;">1. Oi Tsuki Jodan</strong>
                <span class="gohon-series-tag" style="background: rgba(230,57,70,0.2); color: #FF808A;">Alvo: Rosto</span>
              </div>
              <div class="gohon-role-row">
                <span class="gohon-role-badge tori">Mae</span>
                <div>Anuncia <em>"Oi Tsuki Jodan!"</em> e avança em <em>Zenkutsu Dachi</em> com soco alto no queixo.</div>
              </div>
              <div class="gohon-role-row">
                <span class="gohon-role-badge uke">Sagate</span>
                <div>
                  <strong style="color: #FFF;">• 1ª Forma:</strong> Recua <em>Age Uke Jodan</em> ➔ Contra-ataque de <strong>Gyaku Tsuki Chudan (KIAI!)</strong><br>
                  <strong style="color: #FFF; margin-top: 4px; display: inline-block;">• 2ª Forma:</strong> Recua <em>Shuto Uke Jodan</em> (Kokutsu) ➔ Contra-ataque de <strong>Shuto Uchi Jodan</strong> em Zenkutsu (KIAI!)
                </div>
              </div>
            </div>

            <!-- Oi Tsuki Chudan -->
            <div class="gohon-series-card" style="border-left: 4px solid #2A9D8F;">
              <div class="gohon-series-title">
                <strong style="color: #FFF; font-size: 0.92rem;">2. Oi Tsuki Chudan</strong>
                <span class="gohon-series-tag" style="background: rgba(42,157,143,0.2); color: #6EE7B7;">Alvo: Plexo</span>
              </div>
              <div class="gohon-role-row">
                <span class="gohon-role-badge tori">Mae</span>
                <div>Anuncia <em>"Oi Tsuki Chudan!"</em> e avança em <em>Zenkutsu Dachi</em> com soco médio penetrante.</div>
              </div>
              <div class="gohon-role-row">
                <span class="gohon-role-badge uke">Sagate</span>
                <div>
                  <strong style="color: #FFF;">• 1ª Forma:</strong> Recua <em>Soto Uke Chudan</em> ➔ Contra-ataque de <strong>Gyaku Tsuki Chudan (KIAI!)</strong><br>
                  <strong style="color: #FFF; margin-top: 4px; display: inline-block;">• 2ª Forma:</strong> Esquiva <em>Migi Soto Uke Chudan</em> (Zenkutsu) ➔ Contra-ataque de <strong>Yoko Empi Chudan</strong> em Kiba Dachi (KIAI!)
                </div>
              </div>
            </div>

            <!-- Mae Geri Chudan -->
            <div class="gohon-series-card" style="border-left: 4px solid #F5BE00;">
              <div class="gohon-series-title">
                <strong style="color: #FFF; font-size: 0.92rem;">3. Mae Geri Chudan</strong>
                <span class="gohon-series-tag" style="background: rgba(255,183,3,0.2); color: #FFD166;">Alvo: Abdômen</span>
              </div>
              <div class="gohon-role-row">
                <span class="gohon-role-badge tori">Mae</span>
                <div>Anuncia <em>"Mae Geri Chudan!"</em> e desfere chute frontal explosivo no abdômen.</div>
              </div>
              <div class="gohon-role-row">
                <span class="gohon-role-badge uke">Sagate</span>
                <div>
                  <strong style="color: #FFF;">• 1ª Forma:</strong> Recua <em>Gedan Barai</em> ➔ Contra-ataque de <strong>Gyaku Tsuki Chudan (KIAI!)</strong><br>
                  <strong style="color: #FFF; margin-top: 4px; display: inline-block;">• 2ª Forma:</strong> Recua <em>Gyaku Gedan Barai</em> ➔ Contra-ataque de <strong>Kizame Tsuki Jodan + Gyaku Tsuki Chudan (KIAI!)</strong>
                </div>
              </div>
            </div>
          </div>

          <!-- Princípios da Banca -->
          <div class="gohon-principles-grid">
            <div class="gohon-principle-item">
              <div class="gohon-principle-title"><i class="fas fa-volume-up"></i> Anúncio Claro</div>
              <div class="gohon-principle-desc">O atacante deve anunciar a técnica de forma audível e aguardar a resposta antes do ataque.</div>
            </div>
            <div class="gohon-principle-item">
              <div class="gohon-principle-title"><i class="fas fa-ruler"></i> Sun-dome Milimétrico</div>
              <div class="gohon-principle-desc">O contragolpe deve parar precisamente a 2-3 cm da pele do oponente, sem toque e com foco total (Kime).</div>
            </div>
            <div class="gohon-principle-item">
              <div class="gohon-principle-title"><i class="fas fa-bolt"></i> Ikken Hissatsu</div>
              <div class="gohon-principle-desc">Conceito do golpe decisivo único — máxima potência, explosão e Kiai ressonante.</div>
            </div>
            <div class="gohon-principle-item">
              <div class="gohon-principle-title"><i class="fas fa-shield-alt"></i> Zanshin</div>
              <div class="gohon-principle-desc">Manter a posição e o foco por 2 segundos antes de recuar para a postura de guarda.</div>
            </div>
          </div>
        </div>
      `;
    }

    // 2º Kyu (Faixa Roxa) - Jiyu Ippon Kumite (1ª e 2ª Forma Oficial)
    if (kyu === 2) {
      return `
        <!-- GUIA OFICIAL DE JIYU IPPON KUMITE (1ª E 2ª FORMA) - FAIXA ROXA (2º KYU) -->
        <div class="gohon-infographic-card">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 12px;">
            <span class="gohon-header-badge" style="background: rgba(168, 85, 247, 0.2); border-color: rgba(168, 85, 247, 0.5); color: #C084FC;">
              <i class="fas fa-running"></i> Guia Oficial • Jiyu Ippon Kumite (1ª e 2ª Forma)
            </span>
            <span style="font-size: 0.76rem; color: #94A3B8; font-style: italic;">Programa Oficial de Exame (2º Kyu - Faixa Roxa)</span>
          </div>

          <p style="font-size: 0.88rem; color: #E2E8F0; line-height: 1.6; margin-bottom: 16px;">
            No <strong>Jiyu Ippon Kumite</strong>, ambos iniciam em postura de guarda livre (<em>Jiyu no Kamae</em>) com movimentação dinâmica. O atacante (Mae) anuncia a técnica e explode em velocidade real. O defensor (Sagate) executa <em>Tai Sabaki</em> (esquiva angular), bloqueio e contragolpe decisivo com <strong>KIAI!</strong>
          </p>

          <!-- As 8 Séries Oficiais de Ataque (1ª e 2ª Forma) -->
          <div class="gohon-series-grid" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));">
            <!-- 1. Oi Tsuki Jodan -->
            <div class="gohon-series-card" style="border-left: 4px solid #E63946;">
              <div class="gohon-series-title">
                <strong>1. Oi Tsuki Jodan</strong>
                <span class="gohon-attack-desc">( Soco na altura do rosto )</span>
              </div>
              <div class="gohon-role-row">
                <span class="gohon-role-badge uke">Sagate</span>
                <div style="font-size: 0.84rem; line-height: 1.6;">
                  <div><strong style="color: var(--accent-gold);">1ª:</strong> Shuto Uke Jodan / Gyaku Tsuki Chudan <span style="color: #FF808A; font-weight: 700;">(KIAI!)</span></div>
                  <div style="margin-top: 4px;"><strong style="color: var(--accent-gold);">2ª:</strong> Seiryuto Uke Jodan / Ura Tsuki Chudan <span style="color: #FF808A; font-weight: 700;">(KIAI!)</span></div>
                </div>
              </div>
            </div>

            <!-- 2. Oi Tsuki Chudan -->
            <div class="gohon-series-card" style="border-left: 4px solid #2A9D8F;">
              <div class="gohon-series-title">
                <strong>2. Oi Tsuki Chudan</strong>
                <span class="gohon-attack-desc">( Soco na altura do peito )</span>
              </div>
              <div class="gohon-role-row">
                <span class="gohon-role-badge uke">Sagate</span>
                <div style="font-size: 0.84rem; line-height: 1.6;">
                  <div><strong style="color: var(--accent-gold);">1ª:</strong> Soto Uke Chudan / Gyaku Tsuki Chudan <span style="color: #6EE7B7; font-weight: 700;">(KIAI!)</span></div>
                  <div style="margin-top: 4px;"><strong style="color: var(--accent-gold);">2ª:</strong> Gyaku Osae Uke / Uraken Uchi Jodan <span style="color: #6EE7B7; font-weight: 700;">(KIAI!)</span></div>
                </div>
              </div>
            </div>

            <!-- 3. Mae Geri -->
            <div class="gohon-series-card" style="border-left: 4px solid #F5BE00;">
              <div class="gohon-series-title">
                <strong>3. Mae Geri</strong>
                <span class="gohon-attack-desc">( Chute frontal )</span>
              </div>
              <div class="gohon-role-row">
                <span class="gohon-role-badge uke">Sagate</span>
                <div style="font-size: 0.84rem; line-height: 1.6;">
                  <div><strong style="color: var(--accent-gold);">1ª:</strong> Gedan Barai 45° / Gyaku Tsuki Chudan <span style="color: #FFD166; font-weight: 700;">(KIAI!)</span></div>
                  <div style="margin-top: 4px;"><strong style="color: var(--accent-gold);">2ª:</strong> Migi Gedan Barai / Hikite Tate Shuto (Nekoashi Dachi) / Kizame Tsuki Jodan <span style="color: #FFD166; font-weight: 700;">(KIAI!)</span></div>
                </div>
              </div>
            </div>

            <!-- 4. Yoko Geri Kekomi -->
            <div class="gohon-series-card" style="border-left: 4px solid #00B4D8;">
              <div class="gohon-series-title">
                <strong>4. Yoko Geri Kekomi</strong>
                <span class="gohon-attack-desc">( Chute com a faca do pé )</span>
              </div>
              <div class="gohon-role-row">
                <span class="gohon-role-badge uke">Sagate</span>
                <div style="font-size: 0.84rem; line-height: 1.6;">
                  <div><strong style="color: var(--accent-gold);">1ª:</strong> Soto Uke Chudan / Gyaku Tsuki Chudan <span style="color: #90E0EF; font-weight: 700;">(KIAI!)</span></div>
                  <div style="margin-top: 4px;"><strong style="color: var(--accent-gold);">2ª:</strong> Awase Seiryuto Uke / Kizame Tsuki Jodan <span style="color: #90E0EF; font-weight: 700;">(KIAI!)</span></div>
                </div>
              </div>
            </div>

            <!-- 5. Mawashi Geri -->
            <div class="gohon-series-card" style="border-left: 4px solid #A855F7;">
              <div class="gohon-series-title">
                <strong>5. Mawashi Geri</strong>
                <span class="gohon-attack-desc">( Chute semi circular )</span>
              </div>
              <div class="gohon-role-row">
                <span class="gohon-role-badge uke">Sagate</span>
                <div style="font-size: 0.84rem; line-height: 1.6;">
                  <div><strong style="color: var(--accent-gold);">1ª:</strong> Haiwan Uke Jodan 90° / Gyaku Tsuki Chudan <span style="color: #C084FC; font-weight: 700;">(KIAI!)</span></div>
                  <div style="margin-top: 4px;"><strong style="color: var(--accent-gold);">2ª:</strong> Kizame Gyaku Oi Tsuki / Shuto Uchi Jodan <span style="color: #C084FC; font-weight: 700;">(KIAI!)</span></div>
                </div>
              </div>
            </div>

            <!-- 6. Ushiro Geri -->
            <div class="gohon-series-card" style="border-left: 4px solid #EC4899;">
              <div class="gohon-series-title">
                <strong>6. Ushiro Geri</strong>
                <span class="gohon-attack-desc">( Chute Giratório )</span>
              </div>
              <div class="gohon-role-row">
                <span class="gohon-role-badge uke">Sagate</span>
                <div style="font-size: 0.84rem; line-height: 1.6;">
                  <div><strong style="color: var(--accent-gold);">1ª:</strong> Gyaku Sukui Uke / Kizame Tsuki Jodan <span style="color: #F472B6; font-weight: 700;">(KIAI!)</span></div>
                  <div style="margin-top: 4px;"><strong style="color: var(--accent-gold);">2ª:</strong> Sukui Uke segurando a perna / Ashi Barai / Otoshi Gyaku Tsuki Chudan <span style="color: #F472B6; font-weight: 700;">(KIAI!)</span></div>
                </div>
              </div>
            </div>

            <!-- 7. Chudan Gyaku Tsuki -->
            <div class="gohon-series-card" style="border-left: 4px solid #10B981;">
              <div class="gohon-series-title">
                <strong>7. Chudan Gyaku Tsuki</strong>
                <span class="gohon-attack-desc">( Soco reverso na altura do peito )</span>
              </div>
              <div class="gohon-role-row">
                <span class="gohon-role-badge uke">Sagate</span>
                <div style="font-size: 0.84rem; line-height: 1.6;">
                  <div><strong style="color: var(--accent-gold);">1ª:</strong> Kizame Tsuki Jodan 90° / Gyaku Tsuki Chudan <span style="color: #6EE7B7; font-weight: 700;">(KIAI!)</span></div>
                  <div style="margin-top: 4px;"><strong style="color: var(--accent-gold);">2ª:</strong> Ushiro Gedan Barai / Mawashi Geri Jodan / Shuto Uchi Jodan <span style="color: #6EE7B7; font-weight: 700;">(KIAI!)</span></div>
                </div>
              </div>
            </div>

            <!-- 8. Jodan Kizame Tsuki -->
            <div class="gohon-series-card" style="border-left: 4px solid #FB923C;">
              <div class="gohon-series-title">
                <strong>8. Jodan Kizame Tsuki</strong>
                <span class="gohon-attack-desc">( Soco direto na altura do rosto )</span>
              </div>
              <div class="gohon-role-row">
                <span class="gohon-role-badge uke">Sagate</span>
                <div style="font-size: 0.84rem; line-height: 1.6;">
                  <div><strong style="color: var(--accent-gold);">1ª:</strong> 45° Gyaku Uraken Jodan / Gyaku Tsuki Chudan <span style="color: #FDBA74; font-weight: 700;">(KIAI!)</span></div>
                  <div style="margin-top: 4px;"><strong style="color: var(--accent-gold);">2ª:</strong> Seiryuto Uke Jodan / Ashi Barai / Ura Tsuki Chudan <span style="color: #FDBA74; font-weight: 700;">(KIAI!)</span></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Princípios da Banca -->
          <div class="gohon-principles-grid">
            <div class="gohon-principle-item">
              <div class="gohon-principle-title"><i class="fas fa-shoe-prints"></i> Movimentação (Ashi Sabaki)</div>
              <div class="gohon-principle-desc">Pernas ágeis sem cruzar a base, pés deslizando no tatame com flexibilidade.</div>
            </div>
            <div class="gohon-principle-item">
              <div class="gohon-principle-title"><i class="fas fa-stopwatch"></i> De-ai (Antecipação)</div>
              <div class="gohon-principle-desc">Interceptar o golpe no início da trajetória com contra-ataque antes do fechamento do oponente.</div>
            </div>
            <div class="gohon-principle-item">
              <div class="gohon-principle-title"><i class="fas fa-brain"></i> Fudoshin (Mente Inabalável)</div>
              <div class="gohon-principle-desc">Calma e serenidade mesmo sob pressão e velocidade real de ataque.</div>
            </div>
            <div class="gohon-principle-item">
              <div class="gohon-principle-title"><i class="fas fa-shield-alt"></i> Zanshin Absoluto</div>
              <div class="gohon-principle-desc">Prontidão imediata para um segundo ataque sem relaxar a guarda marcial.</div>
            </div>
          </div>
        </div>
      `;
    }

    // 1º Kyu (Faixa Marrom) - Jiyu Ippon Kumite Completo (Tabela Oficial TKST) & Jiyu Kumite
    if (kyu === 1) {
      return `
        <!-- GUIA OFICIAL DE JIYU IPPON KUMITE COMPLETO - FAIXA MARROM (1º KYU) -->
        <div class="gohon-infographic-card">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 12px;">
            <span class="gohon-header-badge" style="background: rgba(180, 83, 9, 0.2); border-color: rgba(180, 83, 9, 0.5); color: #FBBF24;">
              <i class="fas fa-shield-alt"></i> Guia Oficial • Jiyu Ippon Kumite Completo (Tabela TKST)
            </span>
            <span style="font-size: 0.76rem; color: #94A3B8; font-style: italic;">Programa Avançado Pré-Faixa Preta (1º Kyu - Faixa Marrom)</span>
          </div>

          <p style="font-size: 0.88rem; color: #E2E8F0; line-height: 1.6; margin-bottom: 16px;">
            O exame de Faixa Marrom (1º Kyu) exige domínio pleno de todas as combinações da <strong>Tabela Oficial de Jiyu Ippon Kumite</strong> da TKST, abrangendo ataques retilíneos, circulares, contra-ataques duplos, projeções e varridas com foco absoluto (<em>Zanshin</em>).
          </p>

          <!-- Tabela Completa dos 8 Ataques de Jiyu Ippon Kumite -->
          <div class="gohon-series-grid" style="grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));">
            <!-- 1. Oi Tsuki Jodan -->
            <div class="gohon-series-card" style="border-left: 4px solid #E63946;">
              <div class="gohon-series-title">
                <strong>1. Oi Tsuki Jodan</strong>
                <span class="gohon-attack-desc">( Soco na altura do rosto )</span>
              </div>
              <div class="gohon-role-row">
                <span class="gohon-role-badge uke">Sagate</span>
                <div style="font-size: 0.82rem; line-height: 1.7;">
                  <div><strong style="color: var(--accent-gold);">1ª:</strong> Shuto Uke Jodan / Gyaku Tsuki Chudan</div>
                  <div><strong style="color: var(--accent-gold);">2ª:</strong> Seiryuto Uke Jodan / Ura Tsuki Chudan</div>
                  <div><strong style="color: var(--accent-gold);">3ª:</strong> Sokumen Uke 45° / Mawashi Geri Jodan / Gyaku Tsuki Chudan</div>
                  <div><strong style="color: var(--accent-gold);">4ª:</strong> Hirate Uke Jodan / Teisho Uchi Jodan</div>
                  <div><strong style="color: var(--accent-gold);">5ª:</strong> Tobi Mae Geri / Uraken Uchi Jodan</div>
                  <div><strong style="color: var(--accent-gold);">6ª:</strong> 90º Hidari Mawashi Geri Jodan <span style="color: #FF808A; font-weight: 700;">(KIAI!)</span></div>
                </div>
              </div>
            </div>

            <!-- 2. Oi Tsuki Chudan -->
            <div class="gohon-series-card" style="border-left: 4px solid #2A9D8F;">
              <div class="gohon-series-title">
                <strong>2. Oi Tsuki Chudan</strong>
                <span class="gohon-attack-desc">( Soco na altura do peito )</span>
              </div>
              <div class="gohon-role-row">
                <span class="gohon-role-badge uke">Sagate</span>
                <div style="font-size: 0.82rem; line-height: 1.7;">
                  <div><strong style="color: var(--accent-gold);">1ª:</strong> Soto Uke Chudan / Gyaku Tsuki Chudan</div>
                  <div><strong style="color: var(--accent-gold);">2ª:</strong> Gyaku Osae Uke / Uraken Uchi Jodan</div>
                  <div><strong style="color: var(--accent-gold);">3ª:</strong> 90° Hidari / Gyaku Tsuki Chudan</div>
                  <div><strong style="color: var(--accent-gold);">4ª:</strong> Mae Geri Chudan + Gedan Barai / Kizame Tsuki Jodan</div>
                  <div><strong style="color: var(--accent-gold);">5ª:</strong> Gyaku Gedan Barai / Ura Mawashi Geri Jodan / Osoto Gari / Otoshi Gyaku Tsuki Chudan</div>
                  <div><strong style="color: var(--accent-gold);">6ª:</strong> Nagashi Uke Chudan / Hidari Ashi Barai / Otoshi Gyaku Tsuki Chudan <span style="color: #6EE7B7; font-weight: 700;">(KIAI!)</span></div>
                </div>
              </div>
            </div>

            <!-- 3. Mae Geri -->
            <div class="gohon-series-card" style="border-left: 4px solid #F5BE00;">
              <div class="gohon-series-title">
                <strong>3. Mae Geri</strong>
                <span class="gohon-attack-desc">( Chute frontal )</span>
              </div>
              <div class="gohon-role-row">
                <span class="gohon-role-badge uke">Sagate</span>
                <div style="font-size: 0.82rem; line-height: 1.7;">
                  <div><strong style="color: var(--accent-gold);">1ª:</strong> Gedan Barai 45° / Gyaku Tsuki Chudan</div>
                  <div><strong style="color: var(--accent-gold);">2ª:</strong> Migi Gedan Barai / Hikite Tate Shuto (Nekoashi Dachi) / Kizame Tsuki Jodan</div>
                  <div><strong style="color: var(--accent-gold);">3ª:</strong> Juji Uke Gedan / Shuto Uchi Jodan saindo 90°</div>
                  <div><strong style="color: var(--accent-gold);">4ª:</strong> Ushiro Gedan Barai / Gyaku Tsuki Chudan</div>
                  <div><strong style="color: var(--accent-gold);">5ª:</strong> Gyaku Sukui Uke / Jigoku Otoshi Nage (Kiba Dachi)</div>
                  <div><strong style="color: var(--accent-gold);">6ª:</strong> 90º Migi Yoko Geri Kekomi Jodan <span style="color: #FFD166; font-weight: 700;">(KIAI!)</span></div>
                </div>
              </div>
            </div>

            <!-- 4. Yoko Geri Kekomi -->
            <div class="gohon-series-card" style="border-left: 4px solid #00B4D8;">
              <div class="gohon-series-title">
                <strong>4. Yoko Geri Kekomi</strong>
                <span class="gohon-attack-desc">( Chute com a faca do pé )</span>
              </div>
              <div class="gohon-role-row">
                <span class="gohon-role-badge uke">Sagate</span>
                <div style="font-size: 0.82rem; line-height: 1.7;">
                  <div><strong style="color: var(--accent-gold);">1ª:</strong> Soto Uke Chudan / Gyaku Tsuki Chudan</div>
                  <div><strong style="color: var(--accent-gold);">2ª:</strong> Awase Seiryuto Uke / Kizame Tsuki Jodan</div>
                  <div><strong style="color: var(--accent-gold);">3ª:</strong> Haiwan Uke Gedan / Ushiro Empi Jodan <span style="color: #90E0EF; font-weight: 700;">(KIAI!)</span></div>
                </div>
              </div>
            </div>

            <!-- 5. Mawashi Geri -->
            <div class="gohon-series-card" style="border-left: 4px solid #A855F7;">
              <div class="gohon-series-title">
                <strong>5. Mawashi Geri</strong>
                <span class="gohon-attack-desc">( Chute semi circular )</span>
              </div>
              <div class="gohon-role-row">
                <span class="gohon-role-badge uke">Sagate</span>
                <div style="font-size: 0.82rem; line-height: 1.7;">
                  <div><strong style="color: var(--accent-gold);">1ª:</strong> Haiwan Uke Jodan 90° / Gyaku Tsuki Chudan</div>
                  <div><strong style="color: var(--accent-gold);">2ª:</strong> Kizame Gyaku Oi Tsuki / Shuto Uchi Jodan</div>
                  <div><strong style="color: var(--accent-gold);">3ª:</strong> Heiko Uke (Kosa Dachi) / Mawashi Geri Jodan <span style="color: #C084FC; font-weight: 700;">(KIAI!)</span></div>
                </div>
              </div>
            </div>

            <!-- 6. Ushiro Geri -->
            <div class="gohon-series-card" style="border-left: 4px solid #EC4899;">
              <div class="gohon-series-title">
                <strong>6. Ushiro Geri</strong>
                <span class="gohon-attack-desc">( Chute Giratório )</span>
              </div>
              <div class="gohon-role-row">
                <span class="gohon-role-badge uke">Sagate</span>
                <div style="font-size: 0.82rem; line-height: 1.7;">
                  <div><strong style="color: var(--accent-gold);">1ª:</strong> Gyaku Sukui Uke / Kizame Tsuki Jodan</div>
                  <div><strong style="color: var(--accent-gold);">2ª:</strong> Sukui Uke segurando a perna / Ashi Barai / Otoshi Gyaku Tsuki Chudan</div>
                  <div><strong style="color: var(--accent-gold);">3ª:</strong> Sukui Uke / Ushiro Geri Chudan <span style="color: #F472B6; font-weight: 700;">(KIAI!)</span></div>
                </div>
              </div>
            </div>

            <!-- 7. Chudan Gyaku Tsuki -->
            <div class="gohon-series-card" style="border-left: 4px solid #10B981;">
              <div class="gohon-series-title">
                <strong>7. Chudan Gyaku Tsuki</strong>
                <span class="gohon-attack-desc">( Soco reverso na altura do peito )</span>
              </div>
              <div class="gohon-role-row">
                <span class="gohon-role-badge uke">Sagate</span>
                <div style="font-size: 0.82rem; line-height: 1.7;">
                  <div><strong style="color: var(--accent-gold);">1ª:</strong> Kizame Tsuki Jodan 90° / Gyaku Tsuki Chudan</div>
                  <div><strong style="color: var(--accent-gold);">2ª:</strong> Ushiro Gedan Barai / Mawashi Geri Jodan / Shuto Uchi Jodan</div>
                  <div><strong style="color: var(--accent-gold);">3ª:</strong> Gedan Barai / Uraken Uchi Jodan <span style="color: #6EE7B7; font-weight: 700;">(KIAI!)</span></div>
                </div>
              </div>
            </div>

            <!-- 8. Jodan Kizame Tsuki -->
            <div class="gohon-series-card" style="border-left: 4px solid #FB923C;">
              <div class="gohon-series-title">
                <strong>8. Jodan Kizame Tsuki</strong>
                <span class="gohon-attack-desc">( Soco direto na altura do rosto )</span>
              </div>
              <div class="gohon-role-row">
                <span class="gohon-role-badge uke">Sagate</span>
                <div style="font-size: 0.82rem; line-height: 1.7;">
                  <div><strong style="color: var(--accent-gold);">1ª:</strong> 45° Gyaku Uraken Jodan / Gyaku Tsuki Chudan</div>
                  <div><strong style="color: var(--accent-gold);">2ª:</strong> Seiryuto Uke Jodan / Ashi Barai / Ura Tsuki Chudan</div>
                  <div><strong style="color: var(--accent-gold);">3ª:</strong> Nagashi Uke + Uraken Uchi Jodan <span style="color: #FDBA74; font-weight: 700;">(KIAI!)</span></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Princípios da Banca -->
          <div class="gohon-principles-grid">
            <div class="gohon-principle-item">
              <div class="gohon-principle-title"><i class="fas fa-medal"></i> Maturidade Marcial</div>
              <div class="gohon-principle-desc">Controle milimétrico da força, etiqueta impecável no tatame e respeito reverente ao parceiro.</div>
            </div>
            <div class="gohon-principle-item">
              <div class="gohon-principle-title"><i class="fas fa-heartbeat"></i> Resistência & Ritmo</div>
              <div class="gohon-principle-desc">Capacidade de sustentar o combate livre contínuo mantendo a respiração e a técnica puras.</div>
            </div>
            <div class="gohon-principle-item">
              <div class="gohon-principle-title"><i class="fas fa-bullseye"></i> Precisão Vital</div>
              <div class="gohon-principle-desc">Direcionamento cirúrgico para queixo, plexo solar, costelas flutuantes e têmporas.</div>
            </div>
            <div class="gohon-principle-item">
              <div class="gohon-principle-title"><i class="fas fa-shield-alt"></i> Zanshin Shodan</div>
              <div class="gohon-principle-desc">Postura digna de um futuro Faixa Preta da TKST em cada movimento.</div>
            </div>
          </div>
        </div>
      `;
    }

    // Shodan (Faixa Preta) - Kumite Oficial: Contra 1, Contra 2 e Contra 4
    if (kyu === 0) {
      return `
        <!-- GUIA OFICIAL DE KUMITE PARA SHODAN (FAIXA PRETA) -->
        <div class="gohon-infographic-card">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 12px;">
            <span class="gohon-header-badge" style="background: rgba(255, 183, 3, 0.2); border-color: rgba(255, 183, 3, 0.5); color: #FBBF24;">
              <i class="fas fa-fist-raised"></i> Guia Oficial • Jiyu Kumite de Shodan (Tabela TKST)
            </span>
            <span style="font-size: 0.76rem; color: #94A3B8; font-style: italic;">Exame Oficial de Graduação para Faixa Preta (1º Dan)</span>
          </div>

          <p style="font-size: 0.88rem; color: #E2E8F0; line-height: 1.6; margin-bottom: 16px;">
            O teste de combate para a <strong>Faixa Preta (Shodan)</strong> exige a demonstração de maturidade marcial, controle técnico absoluto, leitura tática de espaço e combate contínuo contra múltiplos oponentes sem perda de postura (<em>Zanshin</em>).
          </p>

          <!-- Modalidades Oficiais de Combate -->
          <div class="gohon-series-grid" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));">
            <!-- 1. Contra 1 -->
            <div class="gohon-series-card" style="border-left: 4px solid #3B82F6;">
              <div class="gohon-series-title">
                <strong style="color: #FFF; font-size: 0.95rem;">Contra 1 Oponente</strong>
                <span class="shodan-arrow-badge mae">Individual</span>
              </div>
              <p style="font-size: 0.84rem; color: #CBD5E1; line-height: 1.6; margin-top: 6px;">
                Combate livre contínuo (Jiyu Kumite) avaliando tempo de reação, antecipação (<em>De-ai</em>), esquivas circulares e aplicação de combinações livres de chutes e socos com controle e <strong>KIAI!</strong>
              </p>
            </div>

            <!-- 2. Contra 2 -->
            <div class="gohon-series-card" style="border-left: 4px solid #10B981;">
              <div class="gohon-series-title">
                <strong style="color: #FFF; font-size: 0.95rem;">Contra 2 Oponentes</strong>
                <span class="shodan-arrow-badge sagate">Simultâneo</span>
              </div>
              <p style="font-size: 0.84rem; color: #CBD5E1; line-height: 1.6; margin-top: 6px;">
                Luta livre simultânea testando posicionamento geométrico para não ser cercado, uso de um oponente como escudo contra o outro e transição rápida de foco.
              </p>
            </div>

            <!-- 3. Contra 4 -->
            <div class="gohon-series-card" style="border-left: 4px solid #F5BE00;">
              <div class="gohon-series-title">
                <strong style="color: #FFF; font-size: 0.95rem;">Contra 4 Oponentes</strong>
                <span class="shodan-arrow-badge mawate">Múltiplo / Resistência</span>
              </div>
              <p style="font-size: 0.84rem; color: #CBD5E1; line-height: 1.6; margin-top: 6px;">
                O ápice do teste marcial: combate contínuo contra 4 oponentes consecutivos/múltiplos, avaliando espírito inquebrantável (<em>Fudoshin</em>), resistência física extrema e calma mental.
              </p>
            </div>
          </div>

          <!-- Princípios da Banca Examinadora -->
          <div class="gohon-principles-grid">
            <div class="gohon-principle-item">
              <div class="gohon-principle-title"><i class="fas fa-eye"></i> Visão Periférica 360°</div>
              <div class="gohon-principle-desc">Consciência espacial completa ao lidar com múltiplos atacantes sem perder o centro.</div>
            </div>
            <div class="gohon-principle-item">
              <div class="gohon-principle-title"><i class="fas fa-shield-alt"></i> Zanshin Absoluto</div>
              <div class="gohon-principle-desc">Manutenção permanente da postura marcial antes, durante e após o término dos combates.</div>
            </div>
            <div class="gohon-principle-item">
              <div class="gohon-principle-title"><i class="fas fa-heartbeat"></i> Fudoshin & Resistência</div>
              <div class="gohon-principle-desc">Mente imperturbável mesmo sob exaustão física e pressão real de múltiplos adversários.</div>
            </div>
            <div class="gohon-principle-item">
              <div class="gohon-principle-title"><i class="fas fa-medal"></i> Espírito de Faixa Preta</div>
              <div class="gohon-principle-desc">Humildade, respeito aos parceiros de tatame e fidelidade inegociável aos princípios do Karatê-Dō.</div>
            </div>
          </div>
        </div>
      `;
    }

    return '';
  }

  function renderMyExam() {
    const user = window.TKST_AUTH.getCurrentUser();
    const curr = window.TKST_CURRICULUM.find(c => c.kyuNumber === selectedBeltKyu) || window.TKST_CURRICULUM[0];
    const progress = window.TKST_AUTH.getProgress();

    const transMap = {
      6: { label: "Branca para Amarela", fullLabel: "Faixa Branca ➔ Faixa Amarela", kyuLabel: "6º Kyu", fromColor: "#FFFFFF", toColor: "#F5BE00", textColor: "#000000", isDark: true },
      5: { label: "Amarela para Vermelha", fullLabel: "Faixa Amarela ➔ Faixa Vermelha", kyuLabel: "5º Kyu", fromColor: "#F5BE00", toColor: "#E63946", textColor: "#FFFFFF", isDark: false },
      4: { label: "Vermelha para Laranja", fullLabel: "Faixa Vermelha ➔ Faixa Laranja", kyuLabel: "4º Kyu", fromColor: "#E63946", toColor: "#FF7700", textColor: "#FFFFFF", isDark: false },
      3: { label: "Laranja para Verde", fullLabel: "Faixa Laranja ➔ Faixa Verde", kyuLabel: "3º Kyu", fromColor: "#FF7700", toColor: "#10B981", textColor: "#FFFFFF", isDark: false },
      2: { label: "Verde para Roxa", fullLabel: "Faixa Verde ➔ Faixa Roxa", kyuLabel: "2º Kyu", fromColor: "#10B981", toColor: "#8B5CF6", textColor: "#FFFFFF", isDark: false },
      1: { label: "Roxa para Marrom", fullLabel: "Faixa Roxa ➔ Faixa Marrom", kyuLabel: "1º Kyu", fromColor: "#8B5CF6", toColor: "#78350F", textColor: "#FFFFFF", isDark: false },
      0: { label: "Marrom para Preta", fullLabel: "Faixa Marrom ➔ Faixa Preta", kyuLabel: "Shodan (1º Dan)", fromColor: "#78350F", toColor: "#0A0A0A", textColor: "#FFFFFF", isDark: false }
    };
    const activeTrans = transMap[curr.kyuNumber] || { label: curr.beltName, fullLabel: curr.beltName, kyuLabel: curr.kyuNumber === 0 ? 'Shodan' : curr.kyuNumber + 'º Kyu', fromColor: '#FFFFFF', toColor: curr.beltColor, textColor: '#FFFFFF', isDark: false };

    let html = `
      <div class="section-header">
        <div class="section-title-group">
          <h3><i class="fas fa-graduation-cap" style="color: var(--accent-crimson);"></i> Plano de Estudos de Graduação</h3>
          <p>Selecione a faixa desejada para estudar o conteúdo programático completo da TKST 2026</p>
        </div>

        <!-- Desktop Belt Chips -->
        <div class="belt-transition-chips desktop-only-belt-chips">
          ${window.TKST_CURRICULUM.map(c => {
            const trans = transMap[c.kyuNumber] || { label: c.beltName, fromColor: '#FFFFFF', toColor: c.beltColor, textColor: '#FFFFFF', isDark: false };
            const isActive = c.kyuNumber === selectedBeltKyu;
            return `
              <button 
                class="belt-trans-btn ${trans.isDark ? 'text-dark' : ''} ${isActive ? 'active' : ''}" 
                onclick="window.TKST_APP.selectBelt(${c.kyuNumber})"
                style="background: linear-gradient(90deg, ${trans.fromColor} 0%, ${trans.fromColor} 46%, ${trans.toColor} 54%, ${trans.toColor} 100%); color: ${trans.textColor};"
                title="Estudar conteúdo de ${trans.label}"
              >
                <span>${trans.label}</span>
                ${isActive ? '<i class="fas fa-check-circle" style="font-size: 0.72rem; margin-left: 2px;"></i>' : ''}
              </button>
            `;
          }).join('')}
        </div>

        <!-- Mobile Belt Menu Selector -->
        <div class="belt-selector-mobile">
          <div class="belt-mobile-menu-wrapper" id="beltMobileMenuWrapper">
            <button type="button" class="belt-mobile-trigger" onclick="window.TKST_APP.toggleBeltMobileMenu(event)" aria-haspopup="true" aria-expanded="false">
              <div class="belt-mobile-trigger-info">
                <span class="belt-mobile-pill-preview" style="background: linear-gradient(90deg, ${activeTrans.fromColor} 0%, ${activeTrans.fromColor} 48%, ${activeTrans.toColor} 52%, ${activeTrans.toColor} 100%);"></span>
                <div class="belt-mobile-trigger-text">
                  <span class="belt-mobile-label-sub">Exame Selecionado:</span>
                  <span class="belt-mobile-label-main">${activeTrans.fullLabel} (${activeTrans.kyuLabel})</span>
                </div>
              </div>
              <div class="belt-mobile-trigger-action">
                <span class="belt-mobile-btn-text">Trocar Faixa</span>
                <i class="fas fa-chevron-down belt-mobile-chevron" id="beltMobileChevron"></i>
              </div>
            </button>

            <!-- Dropdown Menu List -->
            <div class="belt-mobile-dropdown" id="beltMobileDropdown">
              <div class="belt-mobile-dropdown-header">
                <div class="belt-mobile-dropdown-title">
                  <i class="fas fa-layer-group" style="color: var(--accent-gold);"></i>
                  <span>Selecione a Faixa / Exame:</span>
                </div>
                <button type="button" class="belt-mobile-dropdown-close" onclick="window.TKST_APP.toggleBeltMobileMenu(event, false)" aria-label="Fechar Menu">
                  <i class="fas fa-times"></i>
                </button>
              </div>

              <div class="belt-mobile-options-list">
                ${window.TKST_CURRICULUM.map(c => {
                  const trans = transMap[c.kyuNumber] || { label: c.beltName, fullLabel: c.beltName, kyuLabel: c.kyuNumber === 0 ? 'Shodan' : c.kyuNumber + 'º Kyu', fromColor: '#FFFFFF', toColor: c.beltColor, textColor: '#FFFFFF', isDark: false };
                  const isActive = c.kyuNumber === selectedBeltKyu;
                  return `
                    <div 
                      class="belt-mobile-option-item ${isActive ? 'active' : ''}"
                      onclick="window.TKST_APP.selectBeltMobile(${c.kyuNumber})"
                    >
                      <div class="belt-mobile-option-left">
                        <span class="belt-mobile-option-pill" style="background: linear-gradient(90deg, ${trans.fromColor} 0%, ${trans.fromColor} 48%, ${trans.toColor} 52%, ${trans.toColor} 100%);"></span>
                        <div class="belt-mobile-option-info">
                          <div class="belt-mobile-option-title">${trans.fullLabel}</div>
                          <div class="belt-mobile-option-kyu">${trans.kyuLabel} • Exame Oficial TKST</div>
                        </div>
                      </div>
                      <div class="belt-mobile-option-right">
                        ${isActive ? '<span class="belt-mobile-check-badge"><i class="fas fa-check"></i> Selecionado</span>' : '<i class="fas fa-chevron-right" style="color: #64748B; font-size: 0.8rem;"></i>'}
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Belt Banner -->
      <div class="dashboard-hero" style="padding: 24px; margin-bottom: 24px; border-left: 6px solid ${curr.beltColor};">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
          <div>
            <span class="badge" style="background: ${curr.beltColor}; color: ${curr.kyuNumber === 6 ? '#000' : '#FFF'}; margin-bottom: 8px;">
              Exame para ${curr.targetBelt}
            </span>
            <h2 style="font-family: var(--font-heading); color: #FFF; font-size: 1.5rem;">${curr.previousBelt} ➔ ${curr.beltName}</h2>
            <p style="color: #94A3B8; max-width: 700px; margin-top: 6px;">${curr.description}</p>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 1.6rem; font-weight: 800; color: var(--accent-gold);">${curr.kyuNumber === 0 ? 'SHODAN' : curr.kyuNumber + 'º KYU'}</div>
          </div>
        </div>
      </div>

      <!-- Curriculum Sections as Accordion Buttons -->
      <div style="display: flex; flex-direction: column; gap: 14px; margin-top: 16px;">
        
        <!-- 1. KIHON / TABELA OFICIAL -->
        <div class="study-accordion-card" id="studyCard_kihon">
          <button type="button" class="study-accordion-header" id="studyHeader_kihon" onclick="window.TKST_APP.toggleStudyAccordion('kihon')">
            <div class="study-accordion-title">
              <i class="fas fa-fist-raised" style="color: var(--accent-crimson); font-size: 1.25rem;"></i>
              <div>
                <h3>1. Kihon (Técnicas Fundamentais${curr.kyuNumber === 0 ? ' • Tabela Oficial' : ''})</h3>
                <div style="font-size: 0.78rem; color: #94A3B8;">
                  ${curr.kyuNumber === 0 ? '86 técnicas e bases oficiais divididas em 4 pilares • Toque para abrir/fechar' : `${curr.kihon.length} técnicas exigidas em avanço (Mae) e recuo (Sagate) • Toque para abrir/fechar`}
                </div>
              </div>
            </div>
            <i class="fas fa-chevron-down study-accordion-icon" id="studyIcon_kihon"></i>
          </button>

          <div class="study-accordion-body" id="studyBody_kihon">
            ${curr.shodanProgram ? `
              <!-- LEGENDA OFICIAL SHODAN -->
              <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; background: rgba(10,13,20,0.8); padding: 10px 16px; border-radius: var(--radius-sm); border: 1px solid rgba(255,255,255,0.08); margin-bottom: 14px;">
                <span style="font-size: 0.8rem; font-weight: 700; color: var(--accent-gold);"><i class="fas fa-compass"></i> Legenda Oficial de Movimentação:</span>
                <div style="display: flex; gap: 12px; flex-wrap: wrap; font-size: 0.8rem;">
                  <span style="display: flex; align-items: center; gap: 4px;"><span class="shodan-arrow-badge mae">➡</span> <strong>Mae</strong> (Avanço)</span>
                  <span style="display: flex; align-items: center; gap: 4px;"><span class="shodan-arrow-badge sagate">⬅</span> <strong>Sagate</strong> (Recuo)</span>
                  <span style="display: flex; align-items: center; gap: 4px;"><span class="shodan-arrow-badge mawate">🔄</span> <strong>Mae / Mawate</strong> (Avanço e Giro)</span>
                </div>
              </div>

              <!-- CONTROLE EXPANDIR / RECOLHER TODOS OS CARDS -->
              <div style="display: flex; justify-content: flex-end; margin-bottom: 10px;">
                <button type="button" class="btn btn-secondary" onclick="window.TKST_APP.toggleAllShodanCols()" style="font-size: 0.76rem; padding: 5px 12px; border-color: rgba(255, 183, 3, 0.35); color: var(--accent-gold); display: flex; align-items: center; gap: 6px;">
                  <i class="fas fa-layer-group"></i> <span id="toggleAllShodanText">Expandir Todos os 4 Pilares</span>
                </button>
              </div>

              <!-- AS 4 COLUNAS OFICIAIS DO EXAME DE SHODAN -->
              <div class="shodan-program-grid">
                <!-- Coluna 1: Te Waza (28 Técnicas) -->
                <div class="shodan-col-card" id="shodanCard_teWaza" style="border-top: 3px solid #3B82F6;">
                  <button type="button" class="shodan-col-header" id="shodanHeader_teWaza" onclick="window.TKST_APP.toggleShodanCol('teWaza')" aria-expanded="false">
                    <div class="shodan-col-title">
                      <i class="fas fa-hand-paper" style="color: #3B82F6; font-size: 1.15rem;"></i>
                      <div>
                        <span>Te Waza (Técnicas de Mãos)</span>
                        <div class="shodan-col-subtitle">28 Técnicas • Toque para ver técnicas</div>
                      </div>
                    </div>
                    <div class="shodan-col-actions">
                      <span class="shodan-arrow-badge mae" style="font-size: 0.7rem;">Mae / Sagate</span>
                      <i class="fas fa-chevron-down shodan-col-chevron" id="shodanIcon_teWaza"></i>
                    </div>
                  </button>
                  <div class="shodan-item-list" id="shodanBody_teWaza">
                    ${curr.shodanProgram.teWaza.map((t, idx) => `
                      <div class="shodan-tech-item">
                        <span><strong>${idx + 1}.</strong> ${t.name}</span>
                        <span class="shodan-arrow-badge ${t.direction === 'Mae' ? 'mae' : 'sagate'}">${t.arrow}</span>
                      </div>
                    `).join('')}
                  </div>
                </div>

                <!-- Coluna 2: Uke Waza (25 Técnicas) -->
                <div class="shodan-col-card" id="shodanCard_ukeWaza" style="border-top: 3px solid #10B981;">
                  <button type="button" class="shodan-col-header" id="shodanHeader_ukeWaza" onclick="window.TKST_APP.toggleShodanCol('ukeWaza')" aria-expanded="false">
                    <div class="shodan-col-title">
                      <i class="fas fa-shield-alt" style="color: #10B981; font-size: 1.15rem;"></i>
                      <div>
                        <span>Uke Waza (Defesas)</span>
                        <div class="shodan-col-subtitle">25 Técnicas • Toque para ver técnicas</div>
                      </div>
                    </div>
                    <div class="shodan-col-actions">
                      <span class="shodan-arrow-badge sagate" style="font-size: 0.7rem;">Mae / Sagate</span>
                      <i class="fas fa-chevron-down shodan-col-chevron" id="shodanIcon_ukeWaza"></i>
                    </div>
                  </button>
                  <div class="shodan-item-list" id="shodanBody_ukeWaza">
                    ${curr.shodanProgram.ukeWaza.map((t, idx) => `
                      <div class="shodan-tech-item">
                        <span><strong>${idx + 1}.</strong> ${t.name}</span>
                        <span class="shodan-arrow-badge ${t.direction === 'Mae' ? 'mae' : 'sagate'}">${t.arrow}</span>
                      </div>
                    `).join('')}
                  </div>
                </div>

                <!-- Coluna 3: Ashi Waza (15 Técnicas) -->
                <div class="shodan-col-card" id="shodanCard_ashiWaza" style="border-top: 3px solid #F5BE00;">
                  <button type="button" class="shodan-col-header" id="shodanHeader_ashiWaza" onclick="window.TKST_APP.toggleShodanCol('ashiWaza')" aria-expanded="false">
                    <div class="shodan-col-title">
                      <i class="fas fa-shoe-prints" style="color: #F5BE00; font-size: 1.15rem;"></i>
                      <div>
                        <span>Ashi Waza (Chutes)</span>
                        <div class="shodan-col-subtitle">15 Técnicas • Toque para ver técnicas</div>
                      </div>
                    </div>
                    <div class="shodan-col-actions">
                      <span class="shodan-arrow-badge mawate" style="font-size: 0.7rem;">🔄 Giro</span>
                      <i class="fas fa-chevron-down shodan-col-chevron" id="shodanIcon_ashiWaza"></i>
                    </div>
                  </button>
                  <div class="shodan-item-list" id="shodanBody_ashiWaza">
                    ${curr.shodanProgram.ashiWaza.map((t, idx) => `
                      <div class="shodan-tech-item">
                        <span><strong>${idx + 1}.</strong> ${t.name}</span>
                        <span class="shodan-arrow-badge mawate">${t.arrow}</span>
                      </div>
                    `).join('')}
                  </div>
                </div>

                <!-- Coluna 4: Dachi Waza (18 Bases) -->
                <div class="shodan-col-card" id="shodanCard_dachiWaza" style="border-top: 3px solid #8B5CF6;">
                  <button type="button" class="shodan-col-header" id="shodanHeader_dachiWaza" onclick="window.TKST_APP.toggleShodanCol('dachiWaza')" aria-expanded="false">
                    <div class="shodan-col-title">
                      <i class="fas fa-layer-group" style="color: #8B5CF6; font-size: 1.15rem;"></i>
                      <div>
                        <span>Dachi Waza (Bases & Movimentação)</span>
                        <div class="shodan-col-subtitle">18 Técnicas • Toque para ver técnicas</div>
                      </div>
                    </div>
                    <div class="shodan-col-actions">
                      <span class="shodan-arrow-badge dachi" style="font-size: 0.7rem;">Mae / Sagate</span>
                      <i class="fas fa-chevron-down shodan-col-chevron" id="shodanIcon_dachiWaza"></i>
                    </div>
                  </button>
                  <div class="shodan-item-list" id="shodanBody_dachiWaza">
                    ${curr.shodanProgram.dachiWaza.map((t, idx) => `
                      <div class="shodan-tech-item">
                        <span><strong>${idx + 1}.</strong> ${t.name}</span>
                        <span class="shodan-arrow-badge ${t.direction === 'Mae' ? 'mae' : 'sagate'}">${t.arrow}</span>
                      </div>
                    `).join('')}
                  </div>
                </div>
              </div>
            ` : `
              <div class="technique-list">
                ${curr.kihon.map(k => `
                  <div class="technique-item">
                    <div class="technique-main" style="align-items: center;">
                      <div style="width: 8px; height: 8px; border-radius: 50%; background: var(--accent-crimson); margin-right: 10px; flex-shrink: 0;"></div>
                      <div>
                        <div class="technique-name">${k.technique}</div>
                        <div class="technique-meta">
                          <span class="stance">${k.stance}</span> • <span>${k.direction}</span> • <span style="color: #64748B;">${k.count}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>
        </div>

        <!-- 2. KATA EXIGIDO -->
        <div class="study-accordion-card" id="studyCard_kata">
          <button type="button" class="study-accordion-header" id="studyHeader_kata" onclick="window.TKST_APP.toggleStudyAccordion('kata')">
            <div class="study-accordion-title">
              <i class="fas fa-book-open" style="color: var(--accent-gold); font-size: 1.25rem;"></i>
              <div>
                <h3>2. Kata Exigido</h3>
                <div style="font-size: 0.78rem; color: #94A3B8;">
                  ${curr.shodanProgram ? '9 Katas Oficiais (5 Heian com Bunkai + 4 Superiores) • Toque para ver detalhes' : `${curr.kata.required.join(', ')} • Toque para ver detalhes`}
                </div>
              </div>
            </div>
            <i class="fas fa-chevron-down study-accordion-icon" id="studyIcon_kata"></i>
          </button>

          <div class="study-accordion-body" id="studyBody_kata">
            <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px;">
              ${curr.shodanProgram ? curr.shodanProgram.kataList.map(kt => `
                <span class="badge badge-amarela" style="font-size: 0.85rem; padding: 8px 14px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;" onclick="window.TKST_APP.openKataDetailByName('${kt.name}')">
                  🥋 <strong>${kt.name}</strong> <span style="font-size: 0.72rem; color: #F5BE00; opacity: 0.9; font-weight: 600;">(${kt.note})</span> <i class="fas fa-external-link-alt" style="font-size: 0.7rem; opacity: 0.7;"></i>
                </span>
              `).join('') : curr.kata.required.map(kt => `
                <span class="badge badge-amarela" style="font-size: 0.85rem; padding: 8px 14px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;" onclick="window.TKST_APP.openKataDetailByName('${kt}')">
                  🥋 ${kt} <i class="fas fa-external-link-alt" style="font-size: 0.7rem; opacity: 0.7;"></i>
                </span>
              `).join('')}
            </div>
            <p style="font-size: 0.9rem; color: #CBD5E1; line-height: 1.6; margin: 0;">${curr.kata.description}</p>
          </div>
        </div>

        <!-- 3. KUMITE -->
        <div class="study-accordion-card" id="studyCard_kumite">
          <button type="button" class="study-accordion-header" id="studyHeader_kumite" onclick="window.TKST_APP.toggleStudyAccordion('kumite')">
            <div class="study-accordion-title">
              <i class="fas fa-shield-alt" style="color: var(--accent-blue); font-size: 1.25rem;"></i>
              <div>
                <h3>3. Kumite (Combate)</h3>
                <div style="font-size: 0.78rem; color: #94A3B8;">${curr.kumite.type} • Toque para ver regras e postura</div>
              </div>
            </div>
            <i class="fas fa-chevron-down study-accordion-icon" id="studyIcon_kumite"></i>
          </button>

          <div class="study-accordion-body" id="studyBody_kumite">
            <div style="color: var(--accent-gold); font-weight: 700; font-size: 1rem; margin-bottom: 8px;">
              <i class="fas fa-fist-raised" style="margin-right: 6px;"></i> ${curr.kumite.type}
            </div>
            <p style="font-size: 0.9rem; color: #CBD5E1; line-height: 1.6; margin-bottom: 16px;">${curr.kumite.description}</p>

            ${renderBeltKumiteInfographic(curr)}
          </div>
        </div>

      </div>
    `;

    mainContent.innerHTML = html;
  }

  // =========================================================================
  // 5. RENDER KATA LIBRARY
  // =========================================================================
  function renderKatasLibrary() {
    let katas = window.TKST_KATAS || [];
    const customVideos = getCustomKataVideos();

    if (kataSearchQuery) {
      const q = kataSearchQuery.toLowerCase();
      katas = katas.filter(k => k.name.toLowerCase().includes(q) || k.meaning.toLowerCase().includes(q) || k.graduation.toLowerCase().includes(q));
    }

    let html = `
      <div class="section-header">
        <div class="section-title-group">
          <h3><i class="fas fa-book-open" style="color: var(--accent-crimson);"></i> Enciclopédia dos 26 Kata Shotokan</h3>
          <p>Apostila oficial em PDF e vídeos técnicos integrados</p>
        </div>

        <div class="search-input-wrapper">
          <i class="fas fa-search"></i>
          <input type="text" id="kataSearchInput" placeholder="Buscar kata por nome ou significado..." value="${kataSearchQuery}">
        </div>
      </div>

      <div class="katas-grid">
        ${katas.map((k, idx) => {
          const videoUrl = customVideos[k.id] || (k.videoFileName ? 'videos/' + k.videoFileName : '');
          const hasVideo = !!videoUrl;
          const moves = k.movesCount || (k.moves ? k.moves.length : null);
          return `
            <div class="kata-card" onclick="window.TKST_APP.openKataDetail('${k.id}')">
              <div class="kata-card-header">
                <div>
                  <div class="kata-name" style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 0.78rem; background: rgba(255, 183, 3, 0.15); color: var(--accent-gold); padding: 2px 7px; border-radius: 4px; font-weight: 800; border: 1px solid rgba(255, 183, 3, 0.3);">${idx + 1}º</span>
                    <span>${k.name}</span>
                  </div>
                  <div class="kata-meaning">${k.meaning}</div>
                </div>
                <div class="kata-kanji-stamp">${k.kanji}</div>
              </div>

              <div class="kata-meta-row">
                <div class="kata-meta-item">
                  <i class="fas fa-file-pdf" style="color: var(--accent-gold);"></i>
                  <span>Apostila PDF</span>
                </div>
                ${moves ? `
                  <div class="kata-meta-item">
                    <i class="fas fa-running" style="color: #48CAE4;"></i>
                    <span>${moves} Movimentos</span>
                  </div>
                ` : ''}
                <div class="kata-meta-item">
                  <i class="fas fa-video" style="color: ${hasVideo ? 'var(--accent-emerald)' : '#64748B'};"></i>
                  <span>${hasVideo ? 'Vídeo Integrado' : 'Apostila PDF'}</span>
                </div>
              </div>

              <div class="kata-card-footer">
                <span class="badge badge-amarela">${k.graduation.split('(')[0].trim()}</span>
                <span style="font-size: 0.82rem; color: var(--accent-gold); font-weight: 600; display: flex; align-items: center; gap: 4px;">
                  Estudar <i class="fas fa-chevron-right" style="font-size: 0.7rem;"></i>
                </span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    mainContent.innerHTML = html;

    const searchInput = document.getElementById('kataSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        kataSearchQuery = e.target.value;
        renderKatasLibrary();
        const updatedInput = document.getElementById('kataSearchInput');
        if (updatedInput) {
          updatedInput.focus();
          updatedInput.setSelectionRange(updatedInput.value.length, updatedInput.value.length);
        }
      });
    }
  }

  function openKataDetail(kataId) {
    const kata = window.TKST_KATAS.find(k => k.id === kataId);
    if (!kata) return;

    const customVideos = getCustomKataVideos();
    const videoUrl = customVideos[kata.id] || (kata.videoFileName ? 'videos/' + kata.videoFileName : '');

    const modalTitle = document.getElementById('detailModalTitle');
    const modalBody = document.getElementById('detailModalBody');

    modalTitle.innerHTML = `<span>🥋 ${kata.name} (${kata.kanji})</span>`;

    const pdfPath = kata.pdfFileName ? `assets/pdf/kata/${encodeURIComponent(kata.pdfFileName)}` : '';

    modalBody.innerHTML = `
      <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 18px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
          <div>
            <div style="font-size: 1.1rem; color: #FFF; font-weight: 700;">Significado: <span style="color: var(--accent-gold);">${kata.meaning}</span></div>
            <div style="font-size: 0.85rem; color: #94A3B8; margin-top: 2px;">Graduação de estudo: ${kata.graduation}</div>
          </div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            ${videoUrl ? `
              <button class="btn btn-primary" onclick="window.TKST_APP.playKataVideo('${kata.id}')">
                <i class="fas fa-play"></i> Assistir Vídeo Integrado
              </button>
            ` : ''}
            ${pdfPath ? `
              <a href="${pdfPath}" target="_blank" class="btn btn-gold" style="text-decoration: none;">
                <i class="fas fa-file-pdf"></i> Abrir Apostila PDF
              </a>
            ` : ''}
          </div>
        </div>
      </div>

      ${pdfPath ? `
        <!-- Official Kata PDF Document Viewer (Native Mobile & Desktop Canvas Renderer) -->
        <div style="border: 1px solid var(--border-color); border-radius: var(--radius-md); overflow: hidden; background: #0E121A; margin-top: 14px;">
          <div style="padding: 12px 16px; background: rgba(255, 255, 255, 0.04); border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 8px; font-weight: 700; color: #FFF; font-size: 0.9rem;">
              <i class="fas fa-book-open" style="color: var(--accent-gold);"></i> Apostila Oficial de Estudos: ${kata.name}
            </div>
            <div style="display: flex; gap: 8px;">
              <a href="${pdfPath}" target="_blank" class="btn btn-sm btn-secondary" style="font-size: 0.78rem; text-decoration: none;">
                <i class="fas fa-expand"></i> Tela Cheia
              </a>
              <a href="${pdfPath}" download="${kata.pdfFileName || (kata.name + '.pdf')}" class="btn btn-sm btn-primary" style="font-size: 0.78rem; text-decoration: none;">
                <i class="fas fa-download"></i> Baixar PDF
              </a>
            </div>
          </div>

          <!-- Native PDF.js Mobile Canvas Pages Container -->
          <div id="kataPdfPagesContainer" style="padding: 12px; display: flex; flex-direction: column; gap: 14px; align-items: center; max-height: 68vh; overflow-y: auto; -webkit-overflow-scrolling: touch; background: #0B0E14;">
            <div style="padding: 30px; text-align: center; color: var(--accent-gold);">
              <i class="fas fa-spinner fa-spin" style="font-size: 2rem; margin-bottom: 8px; display: block;"></i>
              <span style="font-size: 0.85rem; color: #94A3B8;">Renderizando páginas da apostila...</span>
            </div>
          </div>
        </div>
      ` : ''}
    `;

    detailModal.classList.add('active');

    if (pdfPath) {
      renderPdfToContainer(pdfPath, 'kataPdfPagesContainer');
    }
  }

  // Native Mobile Canvas PDF Renderer with Retina DPI and Zoom
  async function renderPdfToContainer(pdfUrl, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
      if (typeof pdfjsLib === 'undefined') {
        container.innerHTML = `
          <div style="padding: 24px; text-align: center;">
            <p style="color: #FFF; margin-bottom: 12px;">Visualização da Apostila:</p>
            <a href="${pdfUrl}" target="_blank" class="btn btn-primary">
              <i class="fas fa-file-pdf"></i> Abrir Apostila PDF
            </a>
          </div>
        `;
        return;
      }

      const loadingTask = pdfjsLib.getDocument(pdfUrl);
      const pdf = await loadingTask.promise;
      container.innerHTML = '';

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const containerWidth = container.clientWidth || 360;
        const unscaledViewport = page.getViewport({ scale: 1 });
        const targetScale = Math.min((containerWidth - 28) / unscaledViewport.width, 2.0);
        const viewport = page.getViewport({ scale: Math.max(targetScale, 1.2) });

        const pageWrapper = document.createElement('div');
        pageWrapper.style.cssText = 'width: 100%; max-width: 800px; display: flex; flex-direction: column; align-items: center; margin-bottom: 10px;';

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        const outputScale = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = '100%';
        canvas.style.maxWidth = '100%';
        canvas.style.height = 'auto';
        canvas.style.borderRadius = '8px';
        canvas.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.6)';
        canvas.style.backgroundColor = '#FFFFFF';

        const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;

        const renderContext = {
          canvasContext: context,
          transform: transform,
          viewport: viewport
        };

        pageWrapper.appendChild(canvas);
        
        if (pdf.numPages > 1) {
          const badge = document.createElement('div');
          badge.style.cssText = 'margin-top: 6px; font-size: 0.75rem; color: #94A3B8; font-weight: 600;';
          badge.textContent = `Página ${pageNum} de ${pdf.numPages}`;
          pageWrapper.appendChild(badge);
        }

        container.appendChild(pageWrapper);
        await page.render(renderContext).promise;
      }
    } catch (err) {
      console.error('PDF rendering notice:', err);
      container.innerHTML = `
        <div style="padding: 24px; text-align: center; color: #FF808A;">
          <i class="fas fa-exclamation-triangle" style="font-size: 1.8rem; margin-bottom: 8px; display: block;"></i>
          <div style="margin-bottom: 12px; color: #E2E8F0;">Visualização alternativa:</div>
          <a href="${pdfUrl}" target="_blank" class="btn btn-primary">
            <i class="fas fa-file-pdf"></i> Abrir Apostila Oficial
          </a>
        </div>
      `;
    }
  }

  function openKataDetailByName(kataName) {
    if (!kataName) return;
    const clean = kataName.replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();
    const normalize = str => str.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanNorm = normalize(clean);

    let kata = (window.TKST_KATAS || []).find(k => {
      const kNorm = normalize(k.name);
      return kNorm === cleanNorm || k.id.toLowerCase() === cleanNorm || k.id.toLowerCase().includes(cleanNorm);
    });

    if (!kata) {
      if (cleanNorm === 'enpi') {
        kata = (window.TKST_KATAS || []).find(k => normalize(k.name) === 'empi' || k.id.includes('empi'));
      } else if (cleanNorm === 'empi') {
        kata = (window.TKST_KATAS || []).find(k => normalize(k.name) === 'enpi' || k.id.includes('enpi'));
      }
    }

    if (kata) {
      openKataDetail(kata.id);
    } else {
      // Fallback: switch to Katas tab and search
      kataSearchQuery = clean;
      switchTab('katas');
    }
  }

  function openVideoModal(title, videoSource) {
    const videoTitle = document.getElementById('videoModalTitle');
    const container = document.getElementById('videoModalContainer');
    const footer = document.getElementById('videoModalFooter');
    if (!container) return;

    videoTitle.textContent = `Vídeo: ${title}`;
    const embed = getEmbedUrl(videoSource);

    if (embed.type === 'iframe') {
      container.innerHTML = `
        <iframe src="${embed.url}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen title="${title}"></iframe>
      `;
    } else if (embed.type === 'video') {
      container.innerHTML = `
        <video src="${embed.url}" controls autoplay playsinline webkit-playsinline style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: contain; background: #000;">
          Seu navegador não suporta a reprodução deste formato de vídeo.
        </video>
      `;
    } else {
      container.innerHTML = `
        <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #94A3B8; padding: 20px; text-align: center;">
          <i class="fas fa-video-slash" style="font-size: 2.5rem; color: #64748B; margin-bottom: 12px;"></i>
          Nenhum link de vídeo configurado para este Kata no momento.
        </div>
      `;
    }

    if (footer) {
      footer.innerHTML = `
        <p style="color: #94A3B8; font-size: 0.85rem; margin: 0;">
          <i class="fas fa-film" style="color: var(--accent-gold); margin-right: 6px;"></i> Reprodução integrada oficial TKST Alunos.
        </p>
        ${embed.rawUrl ? `
          <a href="${embed.rawUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-secondary" style="font-size: 0.78rem; text-decoration: none; padding: 5px 12px; margin-left: auto;">
            <i class="fas fa-external-link-alt"></i> Abrir em Nova Aba
          </a>
        ` : ''}
      `;
    }

    videoModal.classList.add('active');
  }

  // =========================================================================
  // 6. RENDER KUMITE & GLOSSARY & QUIZ & PHILOSOPHY
  // =========================================================================
  function renderKumiteGuide() {
    const kumite = window.TKST_KUMITE;

    let html = `
      <div class="section-header">
        <div class="section-title-group">
          <h3><i class="fas fa-fist-raised" style="color: var(--accent-crimson);"></i> Guia Completo de Kumite TKST</h3>
          <p>Gohon Kumite, Sanbon Kumite, Kihon Ippon Kumite, Jiyu Ippon Kumite e Kihon Ippon no Kata</p>
        </div>
      </div>

      <!-- 1. GOHON KUMITE (5 PASSOS) -->
      <div class="dashboard-hero" style="margin-bottom: 30px; border-left: 6px solid var(--accent-gold);">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 12px;">
          <span class="gohon-header-badge">
            <i class="fas fa-project-diagram"></i> ${kumite.gohonKumite ? kumite.gohonKumite.title : 'Gohon Kumite (5 Passos)'}
          </span>
          <span style="font-size: 0.8rem; color: var(--accent-gold); font-weight: 700;">五本組手</span>
        </div>
        <p style="color: #94A3B8; margin-bottom: 20px;">${kumite.gohonKumite ? kumite.gohonKumite.description : 'Combate fundamental de cinco passos com finalização em Gyaku Tsuki.'}</p>

        <!-- Trilha Visual dos 5 Passos -->
        <div class="gohon-timeline">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <strong style="color: var(--accent-gold); font-size: 0.86rem;">
              <i class="fas fa-route" style="margin-right: 6px;"></i> Trilha de Execução dos 5 Passos:
            </strong>
            <span style="font-size: 0.76rem; color: #94A3B8;">Mae avança ➔ Sagate recua</span>
          </div>

          <div class="gohon-steps-track">
            <div class="gohon-step-box">
              <div class="gohon-step-num">1º Passo</div>
              <div class="gohon-step-action">Ataque & Defesa em Zenkutsu</div>
              <div style="font-size: 0.72rem; color: #64748B; margin-top: 4px;">Ajuste de distância</div>
            </div>
            <div class="gohon-step-box">
              <div class="gohon-step-num">2º Passo</div>
              <div class="gohon-step-action">Manutenção de Altura e Base</div>
              <div style="font-size: 0.72rem; color: #64748B; margin-top: 4px;">Ritmo contínuo</div>
            </div>
            <div class="gohon-step-box">
              <div class="gohon-step-num">3º Passo</div>
              <div class="gohon-step-action">Aceleração com Pressão</div>
              <div style="font-size: 0.72rem; color: #64748B; margin-top: 4px;">Foco nos olhos</div>
            </div>
            <div class="gohon-step-box">
              <div class="gohon-step-num">4º Passo</div>
              <div class="gohon-step-action">Preparação para Fechamento</div>
              <div style="font-size: 0.72rem; color: #64748B; margin-top: 4px;">Aproximação decisiva</div>
            </div>
            <div class="gohon-step-box final-step">
              <div class="gohon-step-num">5º Passo (Decisivo)</div>
              <div class="gohon-step-action" style="color: #FFF;">Bloqueio Firme + Gyaku Tsuki</div>
              <span class="gohon-kiai-tag">KIAI!</span>
            </div>
          </div>
        </div>

        <!-- 3 Séries de Alvos (Jodan, Chudan, Gedan) -->
        <div class="gohon-series-grid">
          <!-- Série 1: Jodan -->
          <div class="gohon-series-card" style="border-left: 4px solid #E63946;">
            <div class="gohon-series-title">
              <strong style="color: #FFF; font-size: 0.92rem;">1. Jodan (Alto)</strong>
              <span class="gohon-series-tag" style="background: rgba(230,57,70,0.2); color: #FF808A;">Alvo: Rosto</span>
            </div>
            <div class="gohon-role-row">
              <span class="gohon-role-badge tori">Mae</span>
              <div><strong>5x Jodan Oi Tsuki</strong></div>
            </div>
            <div class="gohon-role-row">
              <span class="gohon-role-badge uke">Sagate</span>
              <div>
                <strong>5x Jodan Age Uke</strong><br>
                <span style="font-size: 0.78rem; color: #94A3B8;">( Defesa na altura do rosto )</span>
              </div>
            </div>
            <div style="background: rgba(255,183,3,0.08); border-radius: var(--radius-xs); padding: 8px 10px; font-size: 0.8rem; color: #FFF; border: 1px dashed rgba(255,183,3,0.3);">
              ⚡ <strong>5º passo:</strong> Bloqueia com <em>Age Uke</em>, firma a base e desfere <strong>Gyaku Tsuki Chudan</strong> com <span style="color: var(--accent-gold); font-weight: 800;">KIAI!</span>
            </div>
          </div>

          <!-- Série 2: Chudan -->
          <div class="gohon-series-card" style="border-left: 4px solid #2A9D8F;">
            <div class="gohon-series-title">
              <strong style="color: #FFF; font-size: 0.92rem;">2. Chudan (Médio)</strong>
              <span class="gohon-series-tag" style="background: rgba(42,157,143,0.2); color: #6EE7B7;">Alvo: Plexo</span>
            </div>
            <div class="gohon-role-row">
              <span class="gohon-role-badge tori">Mae</span>
              <div><strong>5x Chudan Oi Tsuki</strong></div>
            </div>
            <div class="gohon-role-row">
              <span class="gohon-role-badge uke">Sagate</span>
              <div>
                <strong>5x Chudan Soto Uke</strong><br>
                <span style="font-size: 0.78rem; color: #94A3B8;">( Defesa de fora para dentro )</span>
              </div>
            </div>
            <div style="background: rgba(255,183,3,0.08); border-radius: var(--radius-xs); padding: 8px 10px; font-size: 0.8rem; color: #FFF; border: 1px dashed rgba(255,183,3,0.3);">
              ⚡ <strong>5º passo:</strong> Bloqueia com <em>Soto Uke</em>, estabiliza o quadril e aplica <strong>Gyaku Tsuki Chudan</strong> com <span style="color: var(--accent-gold); font-weight: 800;">KIAI!</span>
            </div>
          </div>

          <!-- Série 3: Gedan -->
          <div class="gohon-series-card" style="border-left: 4px solid #F5BE00;">
            <div class="gohon-series-title">
              <strong style="color: #FFF; font-size: 0.92rem;">3. Gedan (Baixo)</strong>
              <span class="gohon-series-tag" style="background: rgba(255,183,3,0.2); color: #FFD166;">Alvo: Abdômen</span>
            </div>
            <div class="gohon-role-row">
              <span class="gohon-role-badge tori">Mae</span>
              <div><strong>5x Mae Geri Chudan</strong></div>
            </div>
            <div class="gohon-role-row">
              <span class="gohon-role-badge uke">Sagate</span>
              <div>
                <strong>5x Gedan Barai</strong><br>
                <span style="font-size: 0.78rem; color: #94A3B8;">( Defesa Abaixo da cintura )</span>
              </div>
            </div>
            <div style="background: rgba(255,183,3,0.08); border-radius: var(--radius-xs); padding: 8px 10px; font-size: 0.8rem; color: #FFF; border: 1px dashed rgba(255,183,3,0.3);">
              ⚡ <strong>5º passo:</strong> Bloqueia com <em>Gedan Barai</em>, calcanhar firme e desfere <strong>Gyaku Tsuki Chudan</strong> com <span style="color: var(--accent-gold); font-weight: 800;">KIAI!</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. SANBON KUMITE -->
      <div class="dashboard-hero" style="margin-bottom: 30px;">
        <h3 style="font-family: var(--font-heading); color: #FFF; font-size: 1.4rem; margin-bottom: 8px;">
          ${kumite.sanbonKumite.title}
        </h3>
        <p style="color: #94A3B8; margin-bottom: 20px;">${kumite.sanbonKumite.description}</p>

        <div style="background: rgba(10, 13, 20, 0.6); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 16px; margin-bottom: 20px;">
          <div style="font-weight: 700; color: var(--accent-crimson); font-size: 0.85rem; text-transform: uppercase; margin-bottom: 8px;">
            Ataques Consecutivos (Avanço):
          </div>
          <div style="display: flex; gap: 12px; flex-wrap: wrap;">
            ${kumite.sanbonKumite.attacks.map(a => `
              <div style="background: rgba(255,255,255,0.05); padding: 8px 14px; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
                <span style="color: var(--accent-gold); font-weight: 700;">${a.step}º:</span> <strong>${a.technique}</strong> (${a.target})
              </div>
            `).join('')}
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px;">
          ${kumite.sanbonKumite.defenses.map(d => `
            <div class="stat-card" style="flex-direction: column; align-items: flex-start; padding: 16px;">
              <div style="color: var(--accent-gold); font-weight: 700; font-size: 0.95rem; margin-bottom: 6px;">
                ${d.title}
              </div>
              <div style="font-size: 0.88rem; color: #E2E8F0; line-height: 1.4;">${d.sequence}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- 2. KIHON IPPON KUMITE -->
      <div style="margin-bottom: 30px;">
        <div class="section-title-group" style="margin-bottom: 16px;">
          <h3><i class="fas fa-shield-alt" style="color: var(--accent-blue);"></i> ${kumite.kihonIpponKumite.title}</h3>
          <p>${kumite.kihonIpponKumite.description}</p>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
          ${kumite.kihonIpponKumite.categories.map(cat => `
            <div class="stat-card" style="flex-direction: column; align-items: stretch; padding: 20px;">
              <div style="font-family: var(--font-heading); color: #FFF; font-weight: 700; font-size: 1.1rem; margin-bottom: 12px; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
                🥋 Ataque: ${cat.attackName}
              </div>
              <div style="display: flex; flex-direction: column; gap: 8px;">
                ${cat.variations.map(v => `
                  <div style="background: rgba(255,255,255,0.03); padding: 10px 12px; border-radius: var(--radius-sm); border-left: 3px solid var(--accent-crimson); font-size: 0.85rem;">
                    <strong style="color: var(--accent-gold);">${v.number}ª Forma:</strong> Defesa: <span style="color: #FFF;">${v.defense}</span> ➔ Contragolpe: <strong style="color: #48CAE4;">${v.counter}</strong>
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- 3. JIYU IPPON KUMITE -->
      <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 24px; margin-bottom: 30px;">
        <div class="section-title-group" style="margin-bottom: 16px;">
          <h3><i class="fas fa-running" style="color: var(--accent-emerald);"></i> ${kumite.jiyuIpponKumite.title}</h3>
          <p>${kumite.jiyuIpponKumite.description}</p>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px;">
          ${kumite.jiyuIpponKumite.categories ? kumite.jiyuIpponKumite.categories.map(cat => `
            <div style="background: rgba(10,13,20,0.6); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
              <div style="font-weight: 700; color: var(--accent-crimson); font-size: 0.95rem;">${cat.attackName}</div>
              <div style="font-size: 0.78rem; color: #94A3B8; margin-bottom: 8px;">( ${cat.description || ''} )</div>
              <div style="display: flex; flex-direction: column; gap: 6px;">
                ${cat.forms.map(f => `
                  <div style="font-size: 0.82rem; color: #E2E8F0; line-height: 1.5;">
                    <strong style="color: var(--accent-gold);">${f.number}ª:</strong> ${f.technique}
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('') : ''}
        </div>
      </div>

      <!-- 4. KIHON IPPON NO KATA -->
      <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 24px;">
        <div class="section-title-group" style="margin-bottom: 16px;">
          <h3><i class="fas fa-scroll" style="color: var(--accent-gold);"></i> ${kumite.kihonIpponNoKata.title}</h3>
          <p>${kumite.kihonIpponNoKata.description}</p>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
          <div style="background: rgba(10,13,20,0.6); padding: 18px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
            <h4 style="color: var(--accent-gold); font-size: 1.1rem; margin-bottom: 12px;">It Ban (1ª Sequência)</h4>
            <ol style="padding-left: 18px; font-size: 0.88rem; color: #E2E8F0; line-height: 1.8;">
              ${kumite.kihonIpponNoKata.itBan.map(s => `<li>${s.replace(/^\d+\.\s*/, '')}</li>`).join('')}
            </ol>
          </div>

          <div style="background: rgba(10,13,20,0.6); padding: 18px; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
            <h4 style="color: var(--accent-gold); font-size: 1.1rem; margin-bottom: 12px;">Ni Ban (2ª Sequência)</h4>
            <ol style="padding-left: 18px; font-size: 0.88rem; color: #E2E8F0; line-height: 1.8;">
              ${kumite.kihonIpponNoKata.niBan.map(s => `<li>${s.replace(/^\d+\.\s*/, '')}</li>`).join('')}
            </ol>
          </div>
        </div>
      </div>

      <!-- 5. JIYU KUMITE (EXAME DE SHODAN) -->
      <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 24px; margin-top: 30px; border-left: 4px solid var(--accent-gold);">
        <div class="section-title-group" style="margin-bottom: 16px;">
          <h3><i class="fas fa-medal" style="color: var(--accent-gold);"></i> Jiyu Kumite (Exame de Faixa Preta / Shodan)</h3>
          <p>Combate livre de alta intensidade com avaliação de Zanshin, De-ai, condicionamento e domínio marcial pleno.</p>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px;">
          <div style="background: rgba(10,13,20,0.6); padding: 18px; border-radius: var(--radius-md); border: 1px solid var(--border-color); border-top: 3px solid #3B82F6;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <strong style="color: #FFF; font-size: 1rem;">Contra 1 Oponente</strong>
              <span class="shodan-arrow-badge mae">Individual</span>
            </div>
            <p style="font-size: 0.84rem; color: #CBD5E1; line-height: 1.6;">
              Combate livre contínuo individual com foco em <em>De-ai</em> (antecipação), esquivas rápidas e contra-ataques decisivos com <strong>KIAI!</strong>
            </p>
          </div>

          <div style="background: rgba(10,13,20,0.6); padding: 18px; border-radius: var(--radius-md); border: 1px solid var(--border-color); border-top: 3px solid #10B981;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <strong style="color: #FFF; font-size: 1rem;">Contra 2 Oponentes</strong>
              <span class="shodan-arrow-badge sagate">Simultâneo</span>
            </div>
            <p style="font-size: 0.84rem; color: #CBD5E1; line-height: 1.6;">
              Combate simultâneo testando posicionamento espacial, movimentação para evitar cerco e alternância fluida de alvos.
            </p>
          </div>

          <div style="background: rgba(10,13,20,0.6); padding: 18px; border-radius: var(--radius-md); border: 1px solid var(--border-color); border-top: 3px solid #F5BE00;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <strong style="color: #FFF; font-size: 1rem;">Contra 4 Oponentes</strong>
              <span class="shodan-arrow-badge mawate">Múltiplo / Resistência</span>
            </div>
            <p style="font-size: 0.84rem; color: #CBD5E1; line-height: 1.6;">
              Combate contra 4 oponentes consecutivos, avaliando espírito inquebrantável (<em>Fudoshin</em>), resistência extrema e serenidade sob exaustão.
            </p>
          </div>
        </div>
      </div>
    `;

    mainContent.innerHTML = html;
  }

  function renderGlossary() {
    const glossary = window.TKST_GLOSSARY;

    const categories = [
      { id: 'all', name: 'Todos os Termos' },
      { id: 'bases', name: 'Bases (Dachi)' },
      { id: 'defesas', name: 'Defesas (Uke)' },
      { id: 'socosGolpes', name: 'Socos e Golpes (Tsuki/Uchi)' },
      { id: 'chutes', name: 'Chutes (Geri)' },
      { id: 'comandosEContagem', name: 'Comandos e Contagem' }
    ];

    let terms = [];
    if (glossaryCategory === 'all') {
      terms = [
        ...glossary.bases.map(t => ({ ...t, cat: 'Base (Dachi)' })),
        ...glossary.defesas.map(t => ({ ...t, cat: 'Defesa (Uke)' })),
        ...glossary.socosGolpes.map(t => ({ ...t, cat: 'Soco / Golpe' })),
        ...glossary.chutes.map(t => ({ ...t, cat: 'Chute (Geri)' })),
        ...glossary.comandosEContagem.map(t => ({ ...t, cat: 'Comando / Termo' }))
      ];
    } else {
      terms = (glossary[glossaryCategory] || []).map(t => ({ ...t, cat: glossaryCategory }));
    }

    if (glossarySearchQuery) {
      const q = glossarySearchQuery.toLowerCase();
      terms = terms.filter(t => t.japanese.toLowerCase().includes(q) || t.meaning.toLowerCase().includes(q));
    }

    let html = `
      <div class="section-header">
        <div class="section-title-group">
          <h3><i class="fas fa-language" style="color: var(--accent-crimson);"></i> Dicionário Japonês de Karatê</h3>
          <p>Terminologia técnica, comandos e conceitos do Shotokan Tradicional</p>
        </div>

        <div class="search-input-wrapper">
          <i class="fas fa-search"></i>
          <input type="text" id="glossarySearchInput" placeholder="Buscar termo em japonês ou português..." value="${glossarySearchQuery}">
        </div>
      </div>

      <div class="filter-chips" style="margin-bottom: 24px;">
        ${categories.map(c => `
          <button class="chip-btn ${glossaryCategory === c.id ? 'active' : ''}" onclick="window.TKST_APP.selectGlossaryCategory('${c.id}')">
            ${c.name}
          </button>
        `).join('')}
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px;">
        ${terms.map(t => `
          <div class="stat-card" style="flex-direction: column; align-items: flex-start; padding: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%; margin-bottom: 6px;">
              <span class="badge badge-amarela" style="font-size: 0.68rem;">${t.cat || 'Termo'}</span>
              <span style="font-family: var(--font-kanji); color: rgba(255,255,255,0.25); font-size: 1.2rem;">${t.kanji || ''}</span>
            </div>
            <div style="font-family: var(--font-heading); font-size: 1.15rem; font-weight: 700; color: #FFF; margin-bottom: 4px;">
              ${t.japanese}
            </div>
            <div style="font-size: 0.88rem; color: #94A3B8; line-height: 1.4;">
              ${t.meaning}
            </div>
          </div>
        `).join('')}
      </div>
    `;

    mainContent.innerHTML = html;

    const searchInput = document.getElementById('glossarySearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        glossarySearchQuery = e.target.value;
        renderGlossary();
        const updatedInput = document.getElementById('glossarySearchInput');
        if (updatedInput) {
          updatedInput.focus();
          updatedInput.setSelectionRange(updatedInput.value.length, updatedInput.value.length);
        }
      });
    }
  }

  function renderQuiz() {
    if (!currentQuizQuestions || currentQuizQuestions.length === 0) {
      currentQuizQuestions = window.TKST_QUIZ || [];
      currentQuizIndex = 0;
      quizScore = 0;
      quizAnswered = false;
    }

    if (currentQuizIndex >= currentQuizQuestions.length) {
      const finalPercent = Math.round((quizScore / currentQuizQuestions.length) * 100);
      const isPassed = finalPercent >= 70;
      window.TKST_AUTH.saveQuizResult(quizScore, currentQuizQuestions.length, 'Geral');

      let resultHtml = `
        <div class="quiz-card" style="text-align: center;">
          <div style="font-size: 3.5rem; margin-bottom: 12px;">${isPassed ? '🥋🏆' : '📚🥋'}</div>
          <h2 style="font-family: var(--font-heading); color: #FFF; font-size: 1.8rem; margin-bottom: 8px;">
            ${isPassed ? 'Parabéns! Exame Teórico Aprovado!' : 'Continue Treinando e Estudando!'}
          </h2>
          <p style="color: #94A3B8; margin-bottom: 24px;">
            Você acertou <strong>${quizScore} de ${currentQuizQuestions.length} questões</strong> (${finalPercent}% de acerto).
          </p>

          <div style="background: rgba(10,13,20,0.6); padding: 20px; border-radius: var(--radius-md); margin-bottom: 24px; border: 1px solid var(--border-color);">
            <div style="font-size: 0.9rem; color: #E2E8F0;">
              ${isPassed ? 'Você demonstrou excelente compreensão teórica dos nomes das técnicas, bases, significados dos Kata e princípios do Shotokan.' : 'Revise as seções de Kata, Kumite e Dicionário para reforçar o conhecimento dos termos técnicos antes do exame oficial no Dojo.'}
            </div>
          </div>

          <button class="btn btn-primary" onclick="window.TKST_APP.restartQuiz()">
            <i class="fas fa-redo"></i> Refazer Simulador
          </button>
        </div>
      `;
      mainContent.innerHTML = resultHtml;
      return;
    }

    const q = currentQuizQuestions[currentQuizIndex];

    let html = `
      <div class="section-header" style="justify-content: center; text-align: center; margin-bottom: 24px;">
        <div class="section-title-group">
          <h3><i class="fas fa-brain" style="color: var(--accent-gold);"></i> Simulador de Exame de Graduação</h3>
          <p>Avalie seus conhecimentos teóricos para o exame de faixa</p>
        </div>
      </div>

      <div class="quiz-card">
        <div class="quiz-question-header">
          <span class="badge badge-amarela">${q.kyu}</span>
          <span style="font-size: 0.85rem; color: #94A3B8; font-weight: 600;">Questão ${currentQuizIndex + 1} de ${currentQuizQuestions.length}</span>
        </div>

        <div class="quiz-question-text">${q.question}</div>

        <div class="quiz-options-list">
          ${q.options.map((opt, idx) => `
            <button class="quiz-option-btn" id="quizOpt_${idx}" onclick="window.TKST_APP.answerQuiz(${idx})">
              <span style="width: 28px; height: 28px; border-radius: var(--radius-full); background: rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8rem;">
                ${['A', 'B', 'C', 'D'][idx]}
              </span>
              <span>${opt}</span>
            </button>
          `).join('')}
        </div>

        <div id="quizFeedbackArea"></div>

        <div style="display: flex; justify-content: flex-end; margin-top: 20px;">
          <button id="quizNextBtn" class="btn btn-primary" style="display: none;" onclick="window.TKST_APP.nextQuizQuestion()">
            Próxima Questão <i class="fas fa-arrow-right"></i>
          </button>
        </div>
      </div>
    `;

    mainContent.innerHTML = html;
  }

  function answerQuiz(optionIndex) {
    if (quizAnswered) return;
    quizAnswered = true;

    const q = currentQuizQuestions[currentQuizIndex];
    const isCorrect = optionIndex === q.correctIndex;
    if (isCorrect) quizScore++;

    q.options.forEach((_, idx) => {
      const btn = document.getElementById(`quizOpt_${idx}`);
      if (btn) {
        btn.disabled = true;
        if (idx === q.correctIndex) {
          btn.classList.add('correct');
        } else if (idx === optionIndex && !isCorrect) {
          btn.classList.add('wrong');
        }
      }
    });

    const feedbackArea = document.getElementById('quizFeedbackArea');
    if (feedbackArea) {
      feedbackArea.innerHTML = `
        <div class="quiz-feedback-box" style="border-left: 4px solid ${isCorrect ? 'var(--accent-emerald)' : 'var(--accent-crimson)'};">
          <div style="font-weight: 700; color: ${isCorrect ? 'var(--accent-emerald)' : 'var(--accent-crimson)'}; margin-bottom: 4px;">
            ${isCorrect ? '✓ Resposta Correta!' : '✗ Resposta Incorreta'}
          </div>
          <div style="color: #94A3B8;">${q.explanation}</div>
        </div>
      `;
    }

    const nextBtn = document.getElementById('quizNextBtn');
    if (nextBtn) nextBtn.style.display = 'inline-flex';
  }

  function nextQuizQuestion() {
    quizAnswered = false;
    currentQuizIndex++;
    renderQuiz();
  }

  function restartQuiz() {
    currentQuizIndex = 0;
    quizScore = 0;
    quizAnswered = false;
    renderQuiz();
  }

  function renderPhilosophy() {
    const dojoKun = window.TKST_GLOSSARY.dojoKun || [];

    let html = `
      <div class="section-header">
        <div class="section-title-group">
          <h3><i class="fas fa-scroll" style="color: var(--accent-gold);"></i> Filosofia do Dojo: Dojo Kun</h3>
          <p>Os 5 Princípios Fundamentais recitados ao final de cada aula no Dojo</p>
        </div>
      </div>

      <div class="dashboard-hero" style="margin-bottom: 24px;">
        <div class="hero-content">
          <div>
            <h2 style="font-family: var(--font-heading); color: #FFF; font-size: 1.5rem; margin-bottom: 8px;">道場訓 (Dojo Kun)</h2>
            <p style="color: #94A3B8;">
              Todos os princípios iniciam com a palavra <strong>"Hitotsu" (一つ - Primeiro / Em primeiro lugar)</strong>, demonstrando que nenhum princípio é mais importante que o outro — todos possuem a mesma relevância suprema para o praticante de Karatê-Dō.
            </p>
          </div>
        </div>
      </div>

      <div class="dojokun-grid">
        ${dojoKun.map(d => `
          <div class="dojokun-card">
            <div class="dojokun-jp">${d.title}</div>
            <div class="dojokun-pt">${d.translation}</div>
            <div class="dojokun-desc">${d.description}</div>
          </div>
        `).join('')}
      </div>

      <div style="margin-top: 40px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 24px; text-align: center;">
        <h4 style="font-family: var(--font-heading); color: #FFF; font-size: 1.15rem; margin-bottom: 16px;">
          Comissão Técnica & Mestres TKST
        </h4>
        <div style="display: flex; justify-content: center; align-items: center; gap: 40px; flex-wrap: wrap;">
          <div>
            <img src="assets/images/assinatura-diego.png" alt="Assinatura Sensei Diego" style="max-height: 70px; filter: invert(1) brightness(2); opacity: 0.85;">
            <div style="color: #FFF; font-weight: 700; margin-top: 6px;">Sensei Diego</div>
            <div style="font-size: 0.78rem; color: var(--accent-gold);">Diretor Técnico TKST</div>
          </div>
          <div>
            <img src="assets/images/assinatura-egger.png" alt="Assinatura Sensei Rafael Egger" style="max-height: 70px; filter: invert(1) brightness(2); opacity: 0.85;">
            <div style="color: #FFF; font-weight: 700; margin-top: 6px;">Sensei Rafael Egger</div>
            <div style="font-size: 0.78rem; color: var(--accent-gold);">Comissão de Exame</div>
          </div>
        </div>
      </div>
    `;

    mainContent.innerHTML = html;
  }

  // =========================================================================
  // 7. PUBLIC APPLICATION API (Attached to window.TKST_APP)
  // =========================================================================
  window.TKST_APP = {
    switchTab,
    setAuthMode: (mode) => {
      authMode = mode;
      renderLogin();
    },
    setAdminSubTab: (subTab) => {
      adminSubTab = subTab;
      renderAdminMaster();
    },
    selectBelt: (kyu) => {
      selectedBeltKyu = kyu;
      renderMyExam();
    },
    toggleBeltMobileMenu: (e, forceState) => {
      if (e) e.stopPropagation();
      const wrapper = document.getElementById('beltMobileMenuWrapper');
      if (!wrapper) return;
      const isOpen = wrapper.classList.contains('open');
      const newState = typeof forceState === 'boolean' ? forceState : !isOpen;
      if (newState) {
        wrapper.classList.add('open');
      } else {
        wrapper.classList.remove('open');
      }
      const trigger = wrapper.querySelector('.belt-mobile-trigger');
      if (trigger) trigger.setAttribute('aria-expanded', String(newState));
    },
    selectBeltMobile: (kyu) => {
      const wrapper = document.getElementById('beltMobileMenuWrapper');
      if (wrapper) {
        wrapper.classList.remove('open');
      }
      selectedBeltKyu = kyu;
      renderMyExam();
    },
    toggleStudyAccordion: (sectionId) => {
      const body = document.getElementById(`studyBody_${sectionId}`);
      const header = document.getElementById(`studyHeader_${sectionId}`);
      const icon = document.getElementById(`studyIcon_${sectionId}`);
      if (!body) return;

      const isOpen = body.classList.contains('active');
      if (isOpen) {
        body.classList.remove('active');
        header?.classList.remove('active');
        if (icon) icon.style.transform = 'rotate(0deg)';
      } else {
        body.classList.add('active');
        header?.classList.add('active');
        if (icon) icon.style.transform = 'rotate(180deg)';
      }
    },
    toggleShodanCol: (colKey) => {
      const card = document.getElementById(`shodanCard_${colKey}`);
      const body = document.getElementById(`shodanBody_${colKey}`);
      const icon = document.getElementById(`shodanIcon_${colKey}`);
      const header = document.getElementById(`shodanHeader_${colKey}`);
      if (!card || !body) return;

      const isOpen = card.classList.contains('active');
      if (isOpen) {
        card.classList.remove('active');
        body.classList.remove('active');
        header?.setAttribute('aria-expanded', 'false');
        if (icon) icon.style.transform = 'rotate(0deg)';
      } else {
        card.classList.add('active');
        body.classList.add('active');
        header?.setAttribute('aria-expanded', 'true');
        if (icon) icon.style.transform = 'rotate(180deg)';
      }
    },
    toggleAllShodanCols: () => {
      const keys = ['teWaza', 'ukeWaza', 'ashiWaza', 'dachiWaza'];
      const cards = keys.map(k => document.getElementById(`shodanCard_${k}`)).filter(Boolean);
      const anyOpen = cards.some(c => c.classList.contains('active'));
      const shouldOpen = !anyOpen;
      keys.forEach(k => {
        const card = document.getElementById(`shodanCard_${k}`);
        const body = document.getElementById(`shodanBody_${k}`);
        const icon = document.getElementById(`shodanIcon_${k}`);
        const header = document.getElementById(`shodanHeader_${k}`);
        if (!card || !body) return;
        if (shouldOpen) {
          card.classList.add('active');
          body.classList.add('active');
          header?.setAttribute('aria-expanded', 'true');
          if (icon) icon.style.transform = 'rotate(180deg)';
        } else {
          card.classList.remove('active');
          body.classList.remove('active');
          header?.setAttribute('aria-expanded', 'false');
          if (icon) icon.style.transform = 'rotate(0deg)';
        }
      });
      const btnText = document.getElementById('toggleAllShodanText');
      if (btnText) btnText.textContent = shouldOpen ? 'Recolher Todos os 4 Pilares' : 'Expandir Todos os 4 Pilares';
    },
    selectGlossaryCategory: (cat) => {
      glossaryCategory = cat;
      renderGlossary();
    },
    toggleCheck: (itemId) => {
      window.TKST_AUTH.toggleMasteredItem(itemId);
    },
    openKataDetail,
    openKataDetailByName,
    openVideoModal,
    getCustomKataVideos,
    answerQuiz,
    nextQuizQuestion,
    restartQuiz,

    // PWA Desktop / Mobile Installer
    installPwa: async () => {
      if (deferredInstallPrompt) {
        try {
          deferredInstallPrompt.prompt();
          const { outcome } = await deferredInstallPrompt.userChoice;
          if (outcome === 'accepted') {
            deferredInstallPrompt = null;
            return;
          }
        } catch(err) {
          console.warn('Install prompt error:', err);
        }
      }

      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

      if (isStandalone) {
        alert('O aplicativo TKST já está instalado e ativo!');
        return;
      }

      const modalTitle = document.getElementById('detailModalTitle');
      const modalBody = document.getElementById('detailModalBody');

      modalTitle.innerHTML = `<span><i class="fas fa-mobile-alt" style="color: var(--accent-gold);"></i> Instalar Aplicativo TKST</span>`;

      if (isIOS) {
        modalBody.innerHTML = `
          <div style="text-align: center; padding: 10px 4px;">
            <img src="assets/images/icon-192.png" alt="TKST Logo" style="width: 76px; height: 76px; border-radius: 16px; margin-bottom: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
            <h4 style="color: #FFF; font-size: 1.1rem; margin-bottom: 6px;">Instalar no iPhone / iPad (iOS)</h4>
            <p style="font-size: 0.85rem; color: #94A3B8; margin-bottom: 16px;">
              Adicione o atalho oficial do TKST Alunos à sua tela de início:
            </p>
            <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 16px; text-align: left; margin-bottom: 18px; font-size: 0.88rem; color: #E2E8F0; line-height: 1.7;">
              1. No navegador Safari, toque no botão <strong>Compartilhar</strong> (ícone com seta para cima <i class="fas fa-share-square" style="color: var(--accent-gold);"></i> na barra inferior).<br>
              2. Role as opções para baixo e toque em <strong>"Adicionar à Tela de Início"</strong> <i class="fas fa-plus-square" style="color: var(--accent-gold);"></i>.<br>
              3. Toque em <strong>"Adicionar"</strong> no canto superior direito.
            </div>
            <button class="btn btn-primary" onclick="document.getElementById('detailModal').classList.remove('active')" style="width: 100%; padding: 12px; font-weight: 700;">
              Concluir
            </button>
          </div>
        `;
      } else {
        modalBody.innerHTML = `
          <div style="text-align: center; padding: 10px 4px;">
            <img src="assets/images/icon-192.png" alt="TKST Logo" style="width: 76px; height: 76px; border-radius: 16px; margin-bottom: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
            <h4 style="color: #FFF; font-size: 1.1rem; margin-bottom: 6px;">Instalar no Celular ou Computador</h4>
            <p style="font-size: 0.85rem; color: #94A3B8; margin-bottom: 16px;">
              Instale o TKST Alunos para ter acesso rápido direto da tela inicial:
            </p>
            <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 16px; text-align: left; margin-bottom: 18px; font-size: 0.88rem; color: #E2E8F0; line-height: 1.7;">
              <strong style="color: var(--accent-emerald);"><i class="fas fa-mobile-alt"></i> No Celular (Android / Chrome):</strong><br>
              • Toque no menu de <strong>três pontinhos</strong> (<i class="fas fa-ellipsis-v"></i>) no topo do navegador.<br>
              • Toque em <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.<br><br>
              <strong style="color: var(--accent-gold);"><i class="fas fa-laptop"></i> No Computador (Chrome / Edge / Brave):</strong><br>
              • Clique no ícone de <strong>Instalar</strong> <i class="fas fa-download" style="color: var(--accent-gold);"></i> no final da barra de endereços (ao lado dos favoritos).<br>
              • Ou clique nos 3 pontinhos (<i class="fas fa-ellipsis-v"></i>) e selecione <strong>"Instalar TKST Alunos..."</strong>.
            </div>
            <button class="btn btn-primary" onclick="document.getElementById('detailModal').classList.remove('active')" style="width: 100%; padding: 12px; font-weight: 700;">
              Fechar
            </button>
          </div>
        `;
      }

      detailModal.classList.add('active');
    },

    // Unified Login Handler: automatically gives admin credentials & routes if irons365
    submitLogin: () => {
      const idInput = document.getElementById('loginIdentifier');
      const passInput = document.getElementById('loginPassword');
      const alertBox = document.getElementById('authAlertBox');

      const res = window.TKST_AUTH.login(idInput.value, passInput.value);
      if (res.success) {
        if (window.TKST_AUTH.isAdmin()) {
          switchTab('admin');
        } else {
          switchTab('dashboard');
        }
      } else {
        alertBox.textContent = res.message;
        alertBox.className = 'auth-alert error';
      }
    },

    openRegisterModal: () => {
      const modalTitle = document.getElementById('detailModalTitle');
      const modalBody = document.getElementById('detailModalBody');
      const dojos = window.TKST_AUTH.getDojos();

      modalTitle.innerHTML = `<span>Matrícula de Aluno</span>`;
      modalBody.innerHTML = `
        <form onsubmit="event.preventDefault(); window.TKST_APP.submitRegisterFromModal();">
          
          <!-- Foto de Perfil (Opcional - Galeria ou Câmera) -->
          <div style="display: flex; flex-direction: column; align-items: center; margin-bottom: 14px; background: rgba(255,255,255,0.02); border: 1px dashed var(--border-color); border-radius: var(--radius-md); padding: 12px;">
            <div style="position: relative; width: 72px; height: 72px; border-radius: 50%; overflow: hidden; border: 2.5px solid var(--accent-gold); box-shadow: 0 4px 12px rgba(0,0,0,0.5); margin-bottom: 8px;">
              <img id="regPhotoPreview" src="assets/images/logo-tkst.png" alt="Foto de Perfil" style="width: 100%; height: 100%; object-fit: cover;">
            </div>
            <label for="regPhotoInput" class="btn btn-secondary" style="font-size: 0.78rem; padding: 6px 14px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
              <i class="fas fa-camera"></i> Foto de Perfil (Opcional)
            </label>
            <input type="file" id="regPhotoInput" accept="image/*" style="display: none;" onchange="window.TKST_APP.handlePhotoUpload(event, 'regPhotoPreview', 'regPhotoBase64')">
            <input type="hidden" id="regPhotoBase64" value="assets/images/logo-tkst.png">
            <div style="font-size: 0.72rem; color: #94A3B8; margin-top: 4px; text-align: center;">
              Tire uma foto ou escolha da galeria. Se não enviar, usaremos o logo oficial da escola.
            </div>
          </div>

          <!-- 1ª Linha: Nome Completo -->
          <div class="form-group" style="margin-bottom: 12px;">
            <label class="form-label" style="font-size: 0.8rem; white-space: nowrap; margin-bottom: 4px;">Nome Completo</label>
            <input type="text" id="regModalName" class="form-input" placeholder="Digite seu nome completo" required>
          </div>

          <!-- 2ª Linha: Login / Whatsapp -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 0.8rem; white-space: nowrap; margin-bottom: 4px;">Login</label>
              <input type="text" id="regModalNick" class="form-input" placeholder="Seu login" required autocomplete="username">
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 0.8rem; white-space: nowrap; margin-bottom: 4px;">Whatsapp</label>
              <input type="tel" id="regModalPhone" class="form-input" placeholder="(DDD) 99999-9999">
            </div>
          </div>

          <!-- 3ª Linha: Graduação / Dojo (Vazios por padrão) -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 0.8rem; white-space: nowrap; margin-bottom: 4px;">Graduação</label>
              <select id="regModalBelt" class="form-select" required>
                <option value="" disabled selected hidden>Selecione sua Faixa...</option>
                <option value="Faixa Branca" data-kyu="6">Faixa Branca</option>
                <option value="Faixa Amarela (6º Kyu)" data-kyu="6">Faixa Amarela (6º Kyu)</option>
                <option value="Faixa Vermelha (5º Kyu)" data-kyu="5">Faixa Vermelha (5º Kyu)</option>
                <option value="Faixa Laranja (4º Kyu)" data-kyu="4">Faixa Laranja (4º Kyu)</option>
                <option value="Faixa Verde (3º Kyu)" data-kyu="3">Faixa Verde (3º Kyu)</option>
                <option value="Faixa Roxa (2º Kyu)" data-kyu="2">Faixa Roxa (2º Kyu)</option>
                <option value="Faixa Marrom (1º Kyu)" data-kyu="1">Faixa Marrom (1º Kyu)</option>
                <option value="Faixa Preta (Shodan - 1º Dan)" data-kyu="0">Faixa Preta (Shodan - 1º Dan)</option>
                <option value="Faixa Preta (Nidan - 2º Dan)" data-kyu="0">Faixa Preta (Nidan - 2º Dan)</option>
                <option value="Faixa Preta (Sandan - 3º Dan)" data-kyu="0">Faixa Preta (Sandan - 3º Dan)</option>
                <option value="Faixa Preta (Yondan - 4º Dan)" data-kyu="0">Faixa Preta (Yondan - 4º Dan)</option>
                <option value="Faixa Preta (Godan - 5º Dan)" data-kyu="0">Faixa Preta (Godan - 5º Dan)</option>
              </select>
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 0.8rem; white-space: nowrap; margin-bottom: 4px;">Dojo</label>
              <select id="regModalDojo" class="form-select" required>
                <option value="" disabled selected hidden>Selecione...</option>
                ${dojos.map(d => `<option value="${d}">${d}</option>`).join('')}
              </select>
            </div>
          </div>

          <!-- 4ª Linha: Senha / Confirmar Senha -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 6px;">
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 0.78rem; white-space: nowrap; margin-bottom: 4px;">Senha</label>
              <input type="password" id="regModalPassword" class="form-input" placeholder="4 a 11 dígitos" minlength="4" maxlength="11" required autocomplete="new-password">
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 0.78rem; white-space: nowrap; margin-bottom: 4px;">Confirmar Senha</label>
              <input type="password" id="regModalConfirmPassword" class="form-input" placeholder="Repita a senha" minlength="4" maxlength="11" required autocomplete="new-password">
            </div>
          </div>

          <!-- 5ª Linha: Requisitos da Senha -->
          <div style="font-size: 0.76rem; color: #94A3B8; margin-bottom: 14px; padding-left: 2px;">
            * Senha: de 4 a 11 caracteres (somente letras e números).
          </div>

          <div id="modalRegFeedback" style="margin-bottom: 10px;"></div>

          <!-- 6ª Linha: Botão Enviar Cadastro -->
          <button type="submit" class="btn btn-primary" style="width: 100%; padding: 13px; font-size: 0.95rem; font-weight: 700;">
            Enviar Cadastro
          </button>
        </form>
      `;

      detailModal.classList.add('active');
    },

    submitRegisterFromModal: () => {
      const name = document.getElementById('regModalName').value;
      const nick = document.getElementById('regModalNick').value;
      const phone = document.getElementById('regModalPhone').value;
      const beltSelect = document.getElementById('regModalBelt');
      const currentBelt = beltSelect.value;
      const selectedOption = beltSelect.options[beltSelect.selectedIndex];
      const currentKyu = selectedOption ? selectedOption.getAttribute('data-kyu') : 6;
      const dojo = document.getElementById('regModalDojo').value;
      const password = document.getElementById('regModalPassword').value;
      const confirmPassword = document.getElementById('regModalConfirmPassword').value;
      const feedback = document.getElementById('modalRegFeedback');

      if (!currentBelt) {
        feedback.innerHTML = `
          <div style="background: rgba(230, 57, 70, 0.15); border: 1px solid var(--accent-crimson); color: #FF808A; padding: 8px 12px; border-radius: var(--radius-sm); font-size: 0.82rem;">
            ⚠️ Selecione sua Graduação.
          </div>
        `;
        return;
      }

      if (!dojo) {
        feedback.innerHTML = `
          <div style="background: rgba(230, 57, 70, 0.15); border: 1px solid var(--accent-crimson); color: #FF808A; padding: 8px 12px; border-radius: var(--radius-sm); font-size: 0.82rem;">
            ⚠️ Selecione seu Dojo.
          </div>
        `;
        return;
      }

      // 4 to 11 characters (letters and numbers only)
      const passRegex = /^[a-zA-Z0-9]{4,11}$/;
      if (!passRegex.test(password)) {
        feedback.innerHTML = `
          <div style="background: rgba(230, 57, 70, 0.15); border: 1px solid var(--accent-crimson); color: #FF808A; padding: 8px 12px; border-radius: var(--radius-sm); font-size: 0.82rem;">
            ⚠️ A senha deve ter entre 4 e 11 caracteres (somente letras e números).
          </div>
        `;
        return;
      }

      if (password !== confirmPassword) {
        feedback.innerHTML = `
          <div style="background: rgba(230, 57, 70, 0.15); border: 1px solid var(--accent-crimson); color: #FF808A; padding: 8px 12px; border-radius: var(--radius-sm); font-size: 0.82rem;">
            ⚠️ As senhas não coincidem.
          </div>
        `;
        return;
      }

      const avatar = (document.getElementById('regPhotoBase64') && document.getElementById('regPhotoBase64').value) ? document.getElementById('regPhotoBase64').value : 'assets/images/logo-tkst.png';

      const res = window.TKST_AUTH.register({
        name,
        username: nick,
        phone,
        currentBelt,
        currentKyu: parseInt(currentKyu),
        dojo,
        password,
        avatar,
        status: 'pending'
      });

      if (res.success) {
        const senseiMsg = encodeURIComponent(`Oss Sensei Diego! Solicitação de Matrícula TKST Alunos:\n\n🥋 *Dados do Aluno:*\n• Nome: ${name}\n• Nick de Login: @${nick}\n• Graduação: ${currentBelt}\n• Dojo: ${dojo}\n• WhatsApp: ${phone || 'Não informado'}\n\nAcabei de me cadastrar no sistema e aguardo sua aprovação! Oss!`);
        const whatsappUrl = `https://wa.me/5521976077598?text=${senseiMsg}`;

        feedback.innerHTML = `
          <div style="background: rgba(16, 185, 129, 0.15); border: 1.5px solid var(--accent-emerald); color: #FFF; padding: 16px; border-radius: var(--radius-md); font-size: 0.9rem; text-align: center;">
            <div style="font-size: 1.05rem; font-weight: 700; color: #6EE7B7; margin-bottom: 8px;">
              <i class="fas fa-check-circle"></i> Solicitação Enviada com Sucesso!
            </div>
            <p style="font-size: 0.84rem; color: #E2E8F0; margin-bottom: 14px; line-height: 1.4;">
              Seu cadastro com o Nick <strong>@${res.user.username}</strong> foi enviado. Para liberar o acesso mais rápido, avise o <strong>Sensei Diego</strong> no WhatsApp:
            </p>
            <a href="${whatsappUrl}" target="_blank" class="btn" style="background: #25D366; color: #FFF; font-weight: 700; font-size: 0.85rem; padding: 10px 16px; border-radius: var(--radius-sm); text-decoration: none; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 4px 15px rgba(37, 211, 102, 0.35);">
              <i class="fab fa-whatsapp" style="font-size: 1.2rem;"></i> Avisar Sensei Diego no WhatsApp
            </a>
          </div>
        `;
      } else {
        feedback.innerHTML = `
          <div style="background: rgba(230, 57, 70, 0.15); border: 1px solid var(--accent-crimson); color: #FF808A; padding: 12px; border-radius: var(--radius-sm); font-size: 0.9rem;">
            ${res.message}
          </div>
        `;
      }
    },

    openEditProfileModal: () => {
      const user = window.TKST_AUTH.getCurrentUser();
      if (!user) {
        window.TKST_APP.switchTab('login');
        return;
      }
      const dojos = window.TKST_AUTH.getDojos();
      const modalTitle = document.getElementById('detailModalTitle');
      const modalBody = document.getElementById('detailModalBody');

      if (!modalTitle || !modalBody) return;

      modalTitle.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <i class="fas fa-user-edit" style="color: var(--accent-gold);"></i>
          <span>Editar Meu Perfil & Dados</span>
        </div>
      `;

      const belts = [
        { name: "Faixa Branca", kyu: 6 },
        { name: "Faixa Amarela (6º Kyu)", kyu: 6 },
        { name: "Faixa Vermelha (5º Kyu)", kyu: 5 },
        { name: "Faixa Laranja (4º Kyu)", kyu: 4 },
        { name: "Faixa Verde (3º Kyu)", kyu: 3 },
        { name: "Faixa Roxa (2º Kyu)", kyu: 2 },
        { name: "Faixa Marrom (1º Kyu)", kyu: 1 },
        { name: "Faixa Preta (Shodan - 1º Dan)", kyu: 0 },
        { name: "Faixa Preta (Nidan - 2º Dan)", kyu: 0 },
        { name: "Faixa Preta (Sandan - 3º Dan)", kyu: 0 },
        { name: "Faixa Preta (Yondan - 4º Dan)", kyu: 0 },
        { name: "Faixa Preta (Godan - 5º Dan)", kyu: 0 }
      ];

      if (user.role === 'admin' || user.username === 'irons365') {
        belts.unshift({ name: "Faixa Preta (Sensei Master)", kyu: 0 });
      }

      modalBody.innerHTML = `
        <form id="editProfileForm" onsubmit="event.preventDefault(); window.TKST_APP.submitEditProfile();" style="display: flex; flex-direction: column; gap: 14px; max-width: 550px; margin: 0 auto; padding: 4px 0;">
          
          <!-- Foto de Perfil -->
          <div style="display: flex; flex-direction: column; align-items: center; margin-bottom: 8px; background: rgba(255,255,255,0.02); border: 1px dashed var(--border-color); border-radius: var(--radius-md); padding: 12px;">
            <div style="position: relative; width: 72px; height: 72px; border-radius: 50%; overflow: hidden; border: 2.5px solid var(--accent-gold); box-shadow: 0 4px 12px rgba(0,0,0,0.5); margin-bottom: 8px;">
              <img id="editPhotoPreview" src="${user.avatar || 'assets/images/logo-tkst.png'}" alt="Foto de Perfil" style="width: 100%; height: 100%; object-fit: cover;">
            </div>
            <label for="editPhotoInput" class="btn btn-secondary" style="font-size: 0.78rem; padding: 6px 14px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
              <i class="fas fa-camera"></i> Alterar Foto de Perfil
            </label>
            <input type="file" id="editPhotoInput" accept="image/*" style="display: none;" onchange="window.TKST_APP.handlePhotoUpload(event, 'editPhotoPreview', 'editPhotoBase64')">
            <input type="hidden" id="editPhotoBase64" value="${user.avatar || 'assets/images/logo-tkst.png'}">
          </div>

          <div style="background: rgba(255, 183, 3, 0.08); border: 1px solid rgba(255, 183, 3, 0.25); border-radius: var(--radius-sm); padding: 12px 14px; display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-info-circle" style="color: var(--accent-gold); font-size: 1.1rem; flex-shrink: 0;"></i>
            <div style="font-size: 0.8rem; color: #E2E8F0; line-height: 1.4;">
              Atualize seu nome, graduação, dojo, foto ou senha. As alterações entram em vigor imediatamente.
            </div>
          </div>

          <div id="profileEditFeedback"></div>

          <!-- 1. Nome Completo -->
          <div class="form-group">
            <label class="form-label" style="font-size: 0.82rem; margin-bottom: 4px;">
              <i class="fas fa-user" style="color: var(--accent-gold); margin-right: 6px;"></i> Nome Completo:
            </label>
            <input type="text" id="editProfName" class="form-input" value="${user.name || ''}" placeholder="Seu nome completo" required>
          </div>

          <!-- 2. Nick de Login -->
          <div class="form-group">
            <label class="form-label" style="font-size: 0.82rem; margin-bottom: 4px;">
              <i class="fas fa-at" style="color: var(--accent-gold); margin-right: 6px;"></i> Nick de Acesso (Login):
            </label>
            <input type="text" id="editProfNick" class="form-input" value="${user.username || ''}" placeholder="Seu nick de acesso" required ${user.username === 'irons365' ? 'readonly style="opacity: 0.7; cursor: not-allowed;"' : ''}>
            <div style="font-size: 0.72rem; color: #94A3B8; margin-top: 3px;">Identificador único usado para entrar no sistema.</div>
          </div>

          <!-- 3. Telefone / WhatsApp -->
          <div class="form-group">
            <label class="form-label" style="font-size: 0.82rem; margin-bottom: 4px;">
              <i class="fab fa-whatsapp" style="color: #25D366; margin-right: 6px;"></i> Telefone / WhatsApp:
            </label>
            <input type="tel" id="editProfPhone" class="form-input" value="${user.phone || ''}" placeholder="(21) 99999-9999">
          </div>

          <!-- 4. Dojo / Unidade -->
          <div class="form-group">
            <label class="form-label" style="font-size: 0.82rem; margin-bottom: 4px;">
              <i class="fas fa-torii-gate" style="color: var(--accent-crimson); margin-right: 6px;"></i> Dojo / Unidade de Treino:
            </label>
            <select id="editProfDojo" class="form-select" required>
              ${dojos.map(d => `<option value="${d}" ${user.dojo === d ? 'selected' : ''}>${d}</option>`).join('')}
            </select>
          </div>

          <!-- 5. Graduação Atual -->
          <div class="form-group">
            <label class="form-label" style="font-size: 0.82rem; margin-bottom: 4px;">
              <i class="fas fa-medal" style="color: var(--accent-gold); margin-right: 6px;"></i> Graduação Atual:
            </label>
            <select id="editProfBelt" class="form-select" required>
              ${belts.map(b => `<option value="${b.name}" data-kyu="${b.kyu}" ${user.currentBelt === b.name || (user.currentBelt && user.currentBelt.includes(b.name.split(' ')[1])) ? 'selected' : ''}>${b.name}</option>`).join('')}
            </select>
          </div>

          <!-- 6. Nova Senha (Opcional) -->
          <div style="border-top: 1px solid var(--border-color); padding-top: 12px; margin-top: 4px;">
            <div style="font-weight: 700; font-size: 0.85rem; color: #FFF; margin-bottom: 8px;">
              <i class="fas fa-lock" style="color: var(--accent-gold); margin-right: 6px;"></i> Alterar Senha (Opcional)
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div class="form-group">
                <label class="form-label" style="font-size: 0.78rem; margin-bottom: 4px;">Nova Senha:</label>
                <input type="password" id="editProfPass" class="form-input" placeholder="Deixe vazio p/ manter">
              </div>
              <div class="form-group">
                <label class="form-label" style="font-size: 0.78rem; margin-bottom: 4px;">Confirmar Senha:</label>
                <input type="password" id="editProfPassConfirm" class="form-input" placeholder="Repita a nova senha">
              </div>
            </div>
          </div>

          <!-- Botões -->
          <div style="display: flex; gap: 10px; margin-top: 10px;">
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('detailModal').classList.remove('active')" style="flex: 1; padding: 12px;">
              Cancelar
            </button>
            <button type="submit" class="btn btn-primary" style="flex: 2; padding: 12px; font-weight: 700;">
              <i class="fas fa-save"></i> Salvar Alterações
            </button>
          </div>
        </form>
      `;

      detailModal.classList.add('active');
    },

    submitEditProfile: () => {
      const name = document.getElementById('editProfName').value;
      const nick = document.getElementById('editProfNick').value;
      const phone = document.getElementById('editProfPhone').value;
      const dojo = document.getElementById('editProfDojo').value;
      const beltSelect = document.getElementById('editProfBelt');
      const currentBelt = beltSelect.value;
      const selectedOpt = beltSelect.options[beltSelect.selectedIndex];
      const currentKyu = selectedOpt ? selectedOpt.getAttribute('data-kyu') : 6;
      const pass = document.getElementById('editProfPass').value;
      const passConfirm = document.getElementById('editProfPassConfirm').value;
      const feedback = document.getElementById('profileEditFeedback');
      const avatar = (document.getElementById('editPhotoBase64') && document.getElementById('editPhotoBase64').value) ? document.getElementById('editPhotoBase64').value : undefined;

      const res = window.TKST_AUTH.updateProfile({
        name,
        username: nick,
        phone,
        dojo,
        currentBelt,
        currentKyu: parseInt(currentKyu),
        avatar,
        password: pass,
        passwordConfirm: passConfirm
      });

      if (res.success) {
        feedback.innerHTML = `
          <div style="background: rgba(16, 185, 129, 0.15); border: 1px solid var(--accent-emerald); color: #6EE7B7; padding: 10px 14px; border-radius: var(--radius-sm); font-size: 0.86rem;">
            <i class="fas fa-check-circle"></i> Informações atualizadas com sucesso!
          </div>
        `;
        setTimeout(() => {
          detailModal.classList.remove('active');
          setupUserDisplay();
          renderView(currentTab);
        }, 1200);
      } else {
        feedback.innerHTML = `
          <div style="background: rgba(230, 57, 70, 0.15); border: 1px solid var(--accent-crimson); color: #FF808A; padding: 10px 14px; border-radius: var(--radius-sm); font-size: 0.86rem;">
            <i class="fas fa-exclamation-triangle"></i> ${res.message}
          </div>
        `;
      }
    },

    // Admin Handlers
    approveStudent: (studentId) => {
      const res = window.TKST_AUTH.approveStudent(studentId);
      if (res.success) {
        alert(`Aluno ${res.student.name} (@${res.student.username}) aprovado com sucesso!`);
        renderAdminMaster();
      } else {
        alert(res.message);
      }
    },

    rejectStudent: (studentId) => {
      if (confirm('Deseja recusar esta solicitação de cadastro?')) {
        const res = window.TKST_AUTH.rejectStudent(studentId);
        if (res.success) {
          alert('Cadastro recusado.');
          renderAdminMaster();
        }
      }
    },

    deleteStudent: (studentId, studentName) => {
      if (confirm(`Tem certeza que deseja excluir o cadastro de "${studentName}" do sistema TKST?`)) {
        const res = window.TKST_AUTH.deleteStudent(studentId);
        if (res.success) {
          alert('Aluno excluído com sucesso.');
          renderAdminMaster();
        } else {
          alert(res.message);
        }
      }
    },

    openManualStudentModal: () => {
      const name = prompt('Nome Completo do Aluno:');
      if (!name) return;
      const nick = prompt('Nick de Acesso (Matrícula):', name.toLowerCase().replace(/\s+/g, '.'));
      if (!nick) return;
      const currentBelt = prompt('Faixa:', 'Faixa Branca');
      const pass = prompt('Senha de acesso (mínimo 4 caracteres):', '1234');
      const dojo = prompt('Dojo / Unidade:', 'TKST Matriz - Central');

      const res = window.TKST_AUTH.register({
        name,
        username: nick,
        currentBelt: currentBelt || 'Faixa Branca',
        currentKyu: 6,
        dojo: dojo || 'TKST Matriz - Central',
        password: pass || '1234',
        status: 'approved'
      });

      if (res.success) {
        alert(`Aluno cadastrado e ativado com sucesso! Nick: @${nick}`);
        renderAdminMaster();
      } else {
        alert(res.message);
      }
    },

    handleFileUpload: (event) => {
      const file = event.target.files[0];
      if (!file) return;

      const feedback = document.getElementById('fileUploadFeedback');
      if (feedback) {
        feedback.innerHTML = `
          <div style="background: rgba(16, 185, 129, 0.15); border: 1px solid var(--accent-emerald); color: #6EE7B7; padding: 10px; border-radius: var(--radius-sm); font-size: 0.85rem;">
            ✓ Arquivo <strong>${file.name}</strong> (${(file.size / 1024).toFixed(1)} KB) recebido e indexado no sistema pelo Administrador Sensei Diego.
          </div>
        `;
      }
    },

    // Video & Media Handlers
    getKataVideoUrl: (kataId) => {
      const custom = window.TKST_AUTH ? window.TKST_AUTH.getCustomKataVideos() : {};
      if (custom[kataId]) return custom[kataId];
      const kata = (window.TKST_KATAS || []).find(k => k.id === kataId);
      if (kata) {
        if (kata.youtubeUrl) return kata.youtubeUrl;
        if (kata.videoUrl) return kata.videoUrl;
        if (kata.videoFileName) return 'videos/' + kata.videoFileName;
      }
      return '';
    },

    saveKataVideo: (kataId) => {
      const input = document.getElementById(`kata_vid_input_${kataId}`);
      if (!input) return;
      const url = input.value.trim();
      if (window.TKST_AUTH && window.TKST_AUTH.saveKataVideo) {
        window.TKST_AUTH.saveKataVideo(kataId, url);
      }
      alert('Link do vídeo salvo e sincronizado na Nuvem com sucesso!');
      renderAdminMaster();
    },

    testKataVideo: (kataId, kataName) => {
      const input = document.getElementById(`kata_vid_input_${kataId}`);
      const url = input ? input.value.trim() : window.TKST_APP.getKataVideoUrl(kataId);
      if (!url) {
        alert('Por favor, insira um link de vídeo primeiro para testar.');
        return;
      }
      if (window.TKST_AUTH && window.TKST_AUTH.saveKataVideo) {
        window.TKST_AUTH.saveKataVideo(kataId, url);
      }
      openVideoModal(kataName, url);
    },

    playKataVideo: (kataId) => {
      const kata = (window.TKST_KATAS || []).find(k => k.id === kataId);
      const name = kata ? kata.name : 'Kata';
      const url = window.TKST_APP.getKataVideoUrl(kataId);
      if (!url) {
        alert('Nenhum link de vídeo configurado para este Kata no momento.');
        return;
      }
      openVideoModal(name, url);
    },

    // Dojo Handlers
    submitNewDojo: () => {
      const input = document.getElementById('newDojoInput');
      const feedback = document.getElementById('dojoFeedback');
      if (!input) return;
      const name = input.value.trim();
      const res = window.TKST_AUTH.addDojo(name);
      if (res.success) {
        input.value = '';
        if (feedback) {
          feedback.innerHTML = `
            <div style="background: rgba(16, 185, 129, 0.15); border: 1px solid var(--accent-emerald); color: #6EE7B7; padding: 10px; border-radius: var(--radius-sm); font-size: 0.85rem;">
              ✓ Dojo "${name}" cadastrado e sincronizado na Nuvem!
            </div>
          `;
        }
        setTimeout(() => renderAdminMaster(), 1000);
      } else {
        if (feedback) {
          feedback.innerHTML = `
            <div style="background: rgba(230, 57, 70, 0.15); border: 1px solid var(--accent-crimson); color: #FF808A; padding: 10px; border-radius: var(--radius-sm); font-size: 0.85rem;">
              ${res.message}
            </div>
          `;
        }
      }
    },

    deleteDojo: (dojoName) => {
      if (confirm(`Tem certeza que deseja excluir o Dojo "${dojoName}"?`)) {
        const res = window.TKST_AUTH.deleteDojo(dojoName);
        if (res.success) {
          alert('Dojo excluído e sincronizado.');
          renderAdminMaster();
        } else {
          alert(res.message);
        }
      }
    },

    handleLogout: () => {
      localStorage.removeItem('tkst_current_user');
      if (window.TKST_AUTH && window.TKST_AUTH.logout) {
        window.TKST_AUTH.logout();
      }
      window.location.reload();
    },

    exportFullBackup: () => {
      const students = window.TKST_AUTH.getAllStudents();
      const progress = window.TKST_AUTH.getProgress();
      const customVideos = getCustomKataVideos();
      const dojos = window.TKST_AUTH.getDojos();
      const backupData = {
        exportDate: new Date().toISOString(),
        organization: 'Tradicional Karate-Do Shotokan Tsuyoi',
        admin: 'irons365',
        dojos,
        students,
        progress,
        customKataVideos: customVideos
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `tkst_backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    },

    openInviteModal: () => {
      const modalTitle = document.getElementById('detailModalTitle');
      const modalBody = document.getElementById('detailModalBody');

      modalTitle.innerHTML = `<span><i class="fab fa-whatsapp" style="color: #25D366;"></i> Convidar Aluno para Cadastro</span>`;
      modalBody.innerHTML = `
        <div style="padding: 6px 2px;">
          <p style="font-size: 0.88rem; color: #94A3B8; margin-bottom: 16px; line-height: 1.5;">
            Envie o convite oficial do portal <strong>TKST Alunos</strong> para novos praticantes realizarem o cadastro no sistema:
          </p>

          <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 14px; margin-bottom: 18px; font-size: 0.85rem; color: #E2E8F0; line-height: 1.5;">
            <div style="font-size: 0.78rem; color: var(--accent-gold); font-weight: 700; text-transform: uppercase; margin-bottom: 6px;">
              <i class="fas fa-comment-dots"></i> Mensagem Oficial de Convite:
            </div>
            <div id="inviteMsgPreview" style="font-family: monospace; font-size: 0.85rem; white-space: pre-wrap; color: #CBD5E1; background: rgba(0,0,0,0.3); padding: 12px; border-radius: 6px; line-height: 1.6;">OSS!!!
O Sensei Diego convida você para se cadastrar no portal de estudos TKST Alunos.

👉 Toque no link abaixo para realizar seu cadastro:
https://tkst-alunos.vercel.app/?cadastro=1</div>
          </div>

          <div id="inviteFeedback" style="margin-bottom: 12px;"></div>

          <div style="display: flex; flex-direction: column; gap: 10px;">
            <button type="button" class="btn" onclick="window.TKST_APP.sendInviteWhatsApp()" style="width: 100%; padding: 13px; font-weight: 700; background: #25D366; color: #FFF; font-size: 0.95rem; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 15px rgba(37, 211, 102, 0.35);">
              <i class="fab fa-whatsapp" style="font-size: 1.25rem;"></i> Enviar Convite no WhatsApp
            </button>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <button type="button" class="btn btn-secondary" onclick="window.TKST_APP.copyInviteText()" style="padding: 11px 8px; font-size: 0.84rem; font-weight: 600;">
                <i class="fas fa-copy"></i> Copiar Mensagem
              </button>
              <button type="button" class="btn btn-secondary" onclick="window.TKST_APP.copyInviteLink()" style="padding: 11px 8px; font-size: 0.84rem; font-weight: 600;">
                <i class="fas fa-link"></i> Copiar Link
              </button>
            </div>
          </div>
        </div>
      `;

      detailModal.classList.add('active');
    },

    sendInviteWhatsApp: () => {
      const text = `OSS!!!\nO Sensei Diego convida você para se cadastrar no portal de estudos TKST Alunos.\n\n👉 *Toque no link abaixo para realizar seu cadastro:*\nhttps://tkst-alunos.vercel.app/?cadastro=1`;
      const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
    },

    copyInviteText: () => {
      const text = `OSS!!!\nO Sensei Diego convida você para se cadastrar no portal de estudos TKST Alunos.\n\n👉 Toque no link abaixo para realizar seu cadastro:\nhttps://tkst-alunos.vercel.app/?cadastro=1`;
      navigator.clipboard.writeText(text).then(() => {
        const fb = document.getElementById('inviteFeedback');
        if (fb) {
          fb.innerHTML = `<div style="background: rgba(16, 185, 129, 0.2); border: 1px solid #10B981; color: #6EE7B7; padding: 8px 12px; border-radius: 6px; font-size: 0.82rem; text-align: center;"><i class="fas fa-check-circle"></i> Mensagem copiada com sucesso!</div>`;
          setTimeout(() => { if (fb) fb.innerHTML = ''; }, 3000);
        }
      });
    },

    copyInviteLink: () => {
      const url = 'https://tkst-alunos.vercel.app/?cadastro=1';
      navigator.clipboard.writeText(url).then(() => {
        const fb = document.getElementById('inviteFeedback');
        if (fb) {
          fb.innerHTML = `<div style="background: rgba(16, 185, 129, 0.2); border: 1px solid #10B981; color: #6EE7B7; padding: 8px 12px; border-radius: 6px; font-size: 0.82rem; text-align: center;"><i class="fas fa-check-circle"></i> Link copiado para a área de transferência!</div>`;
          setTimeout(() => { if (fb) fb.innerHTML = ''; }, 3000);
        }
      });
    },

    handlePhotoUpload: (event, previewImgId, hiddenInputId) => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Resize & compress to max 280x280 using HTML5 Canvas
          const canvas = document.createElement('canvas');
          const maxDim = 280;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Compress to lightweight JPEG (~15-25KB)
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.72);

          const preview = document.getElementById(previewImgId);
          if (preview) preview.src = compressedDataUrl;

          const hidden = document.getElementById(hiddenInputId);
          if (hidden) hidden.value = compressedDataUrl;
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  // Close modals
  document.querySelectorAll('.modal-overlay').forEach(m => {
    m.addEventListener('click', (e) => {
      if (e.target === m || e.target.classList.contains('modal-close-btn') || e.target.closest('.modal-close-btn')) {
        m.classList.remove('active');
        const container = m.querySelector('#videoModalContainer');
        if (container) container.innerHTML = '';
        const video = m.querySelector('video');
        if (video) video.pause();
      }
    });
  });

  // Close belt mobile dropdown on outside click
  document.addEventListener('click', (e) => {
    const wrapper = document.getElementById('beltMobileMenuWrapper');
    if (wrapper && wrapper.classList.contains('open')) {
      if (!wrapper.contains(e.target)) {
        wrapper.classList.remove('open');
        const trigger = wrapper.querySelector('.belt-mobile-trigger');
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
      }
    }
  });

  // Start
  init();
});
