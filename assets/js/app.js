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
  let adminSubTab = 'students'; // 'students', 'pending', 'dojos', 'kata-videos', 'quizzes', 'files', 'questions'
  let adminQuizSelectedKyu = 7;
  let quizModalTempImage = '';
  
  // Quiz State
  let currentQuizIndex = 0;
  let quizScore = 0;
  let quizAnswered = false;
  let currentQuizQuestions = [];
  let currentQuizKyu = null;
  let currentQuizBelt = '';
  let quizActive = false;
  let quizSubmissionDetails = [];
  let quizTimerInterval = null;
  let quizAutoAdvanceTimeout = null;
  let quizTimeRemaining = 7;

  const mainContent = document.getElementById('mainContent');
  const breadcrumbCurrent = document.getElementById('breadcrumbCurrent');
  const navLinks = document.querySelectorAll('.nav-link, .mobile-nav-item');
  const detailModal = document.getElementById('detailModal');
  const videoModal = document.getElementById('videoModal');
  const sidebar = document.getElementById('sidebar');

  // =========================================================================
  // SISTEMA DE NOTIFICAÇÃO VISUAL (TOAST)
  // =========================================================================
  function showToast(message, type = 'success', duration = 4000) {
    let container = document.getElementById('tkst-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'tkst-toast-container';
      container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:99999;display:flex;flex-direction:column;gap:10px;pointer-events:none;';
      document.body.appendChild(container);
    }

    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️', sync: '☁️' };
    const colors = {
      success: 'rgba(34,197,94,0.18)',
      error: 'rgba(239,68,68,0.18)',
      warning: 'rgba(234,179,8,0.18)',
      info: 'rgba(99,102,241,0.18)',
      sync: 'rgba(255,183,3,0.18)'
    };
    const borders = {
      success: '#22c55e', error: '#ef4444', warning: '#eab308', info: '#6366f1', sync: '#FFB703'
    };

    const toast = document.createElement('div');
    toast.style.cssText = [
      `background:${colors[type] || colors.success}`,
      `border:1.5px solid ${borders[type] || borders.success}`,
      'border-radius:10px',
      'padding:12px 18px',
      'color:#F1F5F9',
      'font-size:0.88rem',
      'font-weight:600',
      'display:flex',
      'align-items:center',
      'gap:10px',
      'max-width:340px',
      'pointer-events:auto',
      'box-shadow:0 4px 24px rgba(0,0,0,0.35)',
      'animation:tkst-toast-in 0.3s cubic-bezier(.4,0,.2,1)',
      'backdrop-filter:blur(8px)'
    ].join(';');
    toast.innerHTML = `<span style="font-size:1.1rem">${icons[type] || icons.success}</span><span>${message}</span>`;

    if (!document.getElementById('tkst-toast-style')) {
      const style = document.createElement('style');
      style.id = 'tkst-toast-style';
      style.textContent = '@keyframes tkst-toast-in{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}} @keyframes tkst-toast-out{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(16px)}}';
      document.head.appendChild(style);
    }

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'tkst-toast-out 0.3s cubic-bezier(.4,0,.2,1) forwards';
      setTimeout(() => toast.remove(), 320);
    }, duration);
  }

  // Listener: confirmação visual quando questões são salvas/sincronizadas
  window.addEventListener('tkst_quiz_bank_saved', (e) => {
    showToast(`☁️ Questões salvas! Sincronizando com a nuvem... (${e.detail.count} no banco)`, 'sync', 4000);
  });
  window.addEventListener('tkst_quiz_committed', (e) => {
    showToast(`💚 ${e.detail.count} questões salvas permanentemente no GitHub!`, 'success', 5000);
  });
  window.addEventListener('tkst_quiz_bank_updated', (e) => {
    showToast(`📥 Banco atualizado da nuvem: ${e.detail.count} questões carregadas.`, 'info', 3000);
  });


  function getBeltBadgeClass(belt) {
    if (!belt) return 'badge-branca';
    const b = belt.toLowerCase();
    if (b.includes('preta') || b.includes('dan') || b.includes('sensei') || b.includes('shodan') || b.includes('nidan') || b.includes('sandan')) return 'badge-preta';
    if (b.includes('marrom')) return 'badge-marrom';
    if (b.includes('roxa')) return 'badge-roxa';
    if (b.includes('verde')) return 'badge-verde';
    if (b.includes('laranja')) return 'badge-laranja';
    if (b.includes('vermelha')) return 'badge-vermelha';
    if (b.includes('amarela')) return 'badge-amarela';
    return 'badge-branca';
  }

  function getBeltNameFromKyu(kyu) {
    switch (parseInt(kyu)) {
      case 7: return "Faixa Branca 7º Kyu";
      case 6: return "Faixa Amarela 6º Kyu";
      case 5: return "Faixa Vermelha 5º Kyu";
      case 4: return "Faixa Laranja 4º Kyu";
      case 3: return "Faixa Verde 3º Kyu";
      case 2: return "Faixa Roxa 2º Kyu";
      case 1: return "Faixa Marrom 1º Kyu";
      case 0: return "Faixa Preta Shodan (1º Dan)";
      case -1: return "Faixa Preta Nidan (2º Dan)";
      case -2: return "Faixa Preta Sandan (3º Dan)";
      default: return "Faixa Branca 7º Kyu";
    }
  }

  // =========================================================================
  // AUTOMATIC MARTIAL ARTS CONTEXTUAL DISTRACTOR GENERATOR FOR QUIZ
  // =========================================================================
  const KARATE_KNOWLEDGE_POOLS = {
    socos: [
      "Gyaku Tsuki", "Oi Tsuki", "Kizami Tsuki", "Tate Tsuki", "Kage Tsuki",
      "Yama Tsuki", "Morote Tsuki", "Mawashi Tsuki", "Uraken Uchi", "Tettsui Uchi",
      "Shuto Uchi", "Haishu Uchi", "Haito Uchi", "Nukite", "Empi Uchi", "Teisho Uchi",
      "Ura Tsuki", "Awase Zuki", "Kage Zuki"
    ],
    chutes: [
      "Mae Geri Keage", "Mae Geri Kekomi", "Mawashi Geri", "Yoko Geri Keage",
      "Yoko Geri Kekomi", "Ushiro Geri", "Ura Mawashi Geri", "Mikazuki Geri",
      "Fumikomi", "Tobi Geri", "Hiza Geri", "Nidan Geri", "Kakato Geri"
    ],
    defesas: [
      "Gedan Barai", "Age Uke", "Soto Uke (Soto Ude Uke)", "Uchi Uke (Uchi Ude Uke)",
      "Shuto Uke", "Morote Uke", "Juji Uke", "Manji Uke", "Haishu Uke",
      "Kakiwake Uke", "Osae Uke", "Nagashi Uke", "Sukui Uke", "Teisho Uke", "Empi Uke"
    ],
    bases: [
      "Zenkutsu Dachi", "Kokutsu Dachi", "Kiba Dachi", "Fudo Dachi (Sochin Dachi)",
      "Neko Ashi Dachi", "Sanchin Dachi", "Hangetsu Dachi", "Musubi Dachi",
      "Heisoku Dachi", "Shiko Dachi", "Kosa Dachi", "Renoji Dachi", "Heiko Dachi", "Tsuruashi Dachi"
    ],
    katas: [
      "Heian Shodan", "Heian Nidan", "Heian Sandan", "Heian Yondan", "Heian Godan",
      "Tekki Shodan", "Tekki Nidan", "Bassai Dai", "Bassai Sho", "Kanku Dai",
      "Kanku Sho", "Jion", "Jitte", "Ji'in", "Enpi (Empi)", "Hangetsu", "Gankaku",
      "Sochin", "Meikyo", "Nijushiho", "Gojushiho Dai", "Gojushiho Sho", "Chinte", "Unsu", "Wankan"
    ],
    kumite: [
      "Gohon Kumite (5 Passos)", "Sanbon Kumite (3 Passos)", "Kihon Ippon Kumite",
      "Jiyu Ippon Kumite", "Jiyu Kumite (Combate Livre)", "Kihon Ippon no Kata", "Yakusoku Kumite"
    ],
    alturas: [
      "Jodan (Alto / Cabeça e Rosto)", "Chudan (Médio / Tronco e Peito)",
      "Gedan (Baixo / Abaixo da Cintura)", "Suigetsu (Plexo Solar)", "Hizasel"
    ],
    comandos: [
      "Rei (Saudação)", "Yoi (Atenção / Prontidão)", "Hajime (Começar)",
      "Yame (Parar)", "Mokuso (Meditação)", "Kiai (Grito de Energia)",
      "Zanshin (Estado de Alerta)", "Kime (Foco / Decisão)", "Ippon (Ponto Completo)",
      "Waza-ari (Meio Ponto)", "Hikawake (Empate)"
    ],
    armas: [
      "Seiken (Punho frontal)", "Uraken (Dorso do punho)", "Tettsui (Punho martelo)",
      "Shuto (Faca da mão)", "Haito (Borda interna da mão)", "Teisho (Base da palma)",
      "Nukite (Ponta dos dedos)", "Koshi / Chusoku (Bola do pé)", "Kakato (Calcanhar)",
      "Sokuto (Faca externa do pé)", "Haisoku (Peito do pé)", "Empi / Hiji (Cotovelo)", "Hiza (Joelho)"
    ]
  };

  function detectKarateCategory(questionText, correctAnswer) {
    const combined = ((questionText || '') + ' ' + (correctAnswer || '')).toLowerCase();
    
    if (/soco|tsuki|zuki|punho|golpe de mão|seiken|uraken|socar/i.test(combined)) return 'socos';
    if (/chute|geri|keri|chutar|perna|pé|pontapé/i.test(combined)) return 'chutes';
    if (/defes|bloquei|uke|bloquear|defender/i.test(combined)) return 'defesas';
    if (/base|postura|dachi|posição das pernas/i.test(combined)) return 'bases';
    if (/kata|forma|heian|tekki|bassai|kanku|jion|jitte|jiin|empi|hangetsu|sochin/i.test(combined)) return 'katas';
    if (/kumite|luta|combate|gohon|sanbon|ippon/i.test(combined)) return 'kumite';
    if (/altura|nível|jodan|chudan|gedan|suigetsu/i.test(combined)) return 'alturas';
    if (/comando|saudação|rei|yoi|hajime|yame|mokuso|kiai|dojo kun/i.test(combined)) return 'comandos';
    if (/arma|parte do corpo|mão|cotovelo|joelho|calcanhar|dedo/i.test(combined)) return 'armas';
    
    return null;
  }

  function generateSmartOptions(questionText, correctAnswer) {
    const cleanCorrect = (correctAnswer || '').trim();
    const category = detectKarateCategory(questionText, cleanCorrect);
    
    let pool = [];
    if (category && KARATE_KNOWLEDGE_POOLS[category]) {
      pool = [...KARATE_KNOWLEDGE_POOLS[category]];
    }

    // Fallback: collect existing answers from default bank
    if (pool.length < 4) {
      const defaultAnswers = (window.TKST_DEFAULT_QUIZ_BANK || []).map(q => q.options ? q.options[q.correctIndex] : null).filter(Boolean);
      pool = [...pool, ...defaultAnswers];
    }

    const normalize = str => str.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanNorm = normalize(cleanCorrect);

    const filteredPool = pool.filter(item => {
      if (!item) return false;
      const iNorm = normalize(item);
      return iNorm !== cleanNorm && !iNorm.includes(cleanNorm) && !cleanNorm.includes(iNorm);
    });

    const shuffledDistractors = [...new Set(filteredPool)].sort(() => 0.5 - Math.random());
    const distractors = shuffledDistractors.slice(0, 3);

    const genericFallbacks = ["Gyaku Tsuki", "Mae Geri", "Gedan Barai", "Zenkutsu Dachi", "Age Uke", "Oi Tsuki", "Mawashi Geri", "Kokutsu Dachi"];
    while (distractors.length < 3) {
      const candidate = genericFallbacks[Math.floor(Math.random() * genericFallbacks.length)];
      if (normalize(candidate) !== cleanNorm && !distractors.includes(candidate)) {
        distractors.push(candidate);
      }
    }

    const allOptions = [cleanCorrect, ...distractors].sort(() => 0.5 - Math.random());
    const correctIndex = allOptions.indexOf(cleanCorrect);

    return {
      options: allOptions,
      correctIndex: correctIndex >= 0 ? correctIndex : 0
    };
  }

  function ensureSmartQuestionOptions(q) {
    if (!q) return q;
    const hasPlaceholders = !Array.isArray(q.options) || q.options.length < 4 || q.options.some(opt => typeof opt !== 'string' || opt.toLowerCase().includes('alternativa') || opt.toLowerCase().includes('incorreta'));
    
    if (hasPlaceholders) {
      const correctAnswer = (q.options && q.options[q.correctIndex]) || (q.options && q.options[0]) || "";
      if (correctAnswer && !correctAnswer.toLowerCase().includes('alternativa')) {
        const smart = generateSmartOptions(q.question, correctAnswer);
        q.options = smart.options;
        q.correctIndex = smart.correctIndex;
      }
    }
    return q;
  }

  function compressQuizImage(file, callback) {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = function(e) {
      const img = new Image();
      img.onload = function() {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Compress to JPEG with high quality and low file size
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
        callback(compressedDataUrl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function getBeltImage(beltName) {
    if (!beltName) return 'assets/images/faixas/quimono-branca.svg';
    const b = beltName.toLowerCase();
    if (b.includes('preta') || b.includes('dan') || b.includes('sensei') || b.includes('shodan') || b.includes('nidan') || b.includes('sandan') || b.includes('yondan') || b.includes('godan')) {
      return 'assets/images/faixas/quimono-preta.svg';
    }
    if (b.includes('marrom')) return 'assets/images/faixas/quimono-marrom.svg';
    if (b.includes('roxa')) return 'assets/images/faixas/quimono-roxa.svg';
    if (b.includes('verde')) return 'assets/images/faixas/quimono-verde.svg';
    if (b.includes('laranja')) return 'assets/images/faixas/quimono-laranja.svg';
    if (b.includes('vermelha')) return 'assets/images/faixas/quimono-vermelha.svg';
    if (b.includes('amarela')) return 'assets/images/faixas/quimono-amarela.svg';
    return 'assets/images/faixas/quimono-branca.svg';
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Video Helpers
  function getCustomKataVideos() {
    if (window.TKST_AUTH && window.TKST_AUTH.getCustomKataVideos) {
      return window.TKST_AUTH.getCustomKataVideos();
    }
    try {
      return JSON.parse(localStorage.getItem('tkst_custom_kata_videos')) || {};
    } catch (e) {
      return {};
    }
  }

  function normalizeKataVideos(videoEntry, kata) {
    if (!videoEntry) {
      if (kata && (kata.youtubeUrl || kata.videoUrl || kata.videoFileName)) {
        const defaultUrl = kata.youtubeUrl || kata.videoUrl || ('videos/' + kata.videoFileName);
        return [{
          id: 'default_1',
          title: 'Demonstração Oficial TKST',
          description: 'Vídeo técnico oficial com os movimentos e ritmo tradicional Shotokan.',
          url: defaultUrl
        }];
      }
      return [];
    }
    if (typeof videoEntry === 'string') {
      if (!videoEntry.trim()) return [];
      return [{
        id: 'vid_1',
        title: 'Vídeo Técnico Principal',
        description: 'Demonstração em vídeo do Kata.',
        url: videoEntry.trim()
      }];
    }
    if (Array.isArray(videoEntry)) {
      return videoEntry.filter(v => v && v.url && v.url.trim()).map((v, i) => ({
        id: v.id || `vid_${i + 1}`,
        title: (v.title && v.title.trim()) || `Vídeo ${i + 1}`,
        description: (v.description && v.description.trim()) || '',
        url: v.url.trim()
      }));
    }
    return [];
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

  function openVideoModal(title, rawUrl, description = '') {
    const videoModal = document.getElementById('videoModal');
    const titleEl = document.getElementById('videoModalTitle');
    const container = document.getElementById('videoModalContainer');
    const footer = document.getElementById('videoModalFooter');
    if (!videoModal || !container) return;

    if (titleEl) {
      titleEl.innerHTML = `<i class="fas fa-video" style="color: var(--accent-gold); margin-right: 6px;"></i> ${title || 'Vídeo Técnico'}`;
    }

    const embed = getEmbedUrl(rawUrl);
    if (embed.type === 'video') {
      container.innerHTML = `
        <video controls autoplay playsinline style="width: 100%; max-height: 70vh; background: #000; display: block; border-radius: var(--radius-sm);">
          <source src="${embed.url}" type="video/mp4">
          Seu navegador não suporta a reprodução direta deste vídeo.
        </video>
      `;
    } else {
      container.innerHTML = `
        <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: var(--radius-sm); background: #000;">
          <iframe 
            src="${embed.url}" 
            style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
            allowfullscreen>
          </iframe>
        </div>
      `;
    }

    if (footer) {
      footer.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 6px; width: 100%;">
          ${description ? `<div style="font-size: 0.86rem; color: #FFF; font-weight: 600;"><i class="fas fa-info-circle" style="color: var(--accent-gold); margin-right: 6px;"></i> ${description}</div>` : ''}
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
            <span style="color: #94A3B8; font-size: 0.78rem;">
              <i class="fas fa-film" style="color: var(--accent-gold); margin-right: 4px;"></i> Reprodução integrada oficial TKST Alunos.
            </span>
            <a href="${embed.rawUrl}" target="_blank" class="btn btn-sm btn-secondary" style="font-size: 0.75rem; padding: 4px 10px; text-decoration: none;">
              <i class="fas fa-external-link-alt"></i> Abrir Externamente
            </a>
          </div>
        </div>
      `;
    }

    videoModal.classList.add('active');
  }

  // Initialize
  function init() {
    setupNavigation();
    setupUserDisplay();
    setupGlobalEvents();

    // Register Service Worker passively for PWA desktop/mobile installation (no auto-reloads)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch((err) => {
        console.log('SW registration note:', err);
      });
    }

    const user = window.TKST_AUTH.getCurrentUser();
    if (!user) {
      switchTab('login');
      // Auto open registration modal if accessed via invitation link (?cadastro=1, ?convite=1, ?registro=1, etc.)
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('cadastro') === '1' || urlParams.get('convite') === '1' || urlParams.get('registro') === '1' || urlParams.has('cadastro') || urlParams.has('convite')) {
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
    if (tabName !== 'quiz') {
      if (quizTimerInterval) { clearInterval(quizTimerInterval); quizTimerInterval = null; }
      if (quizAutoAdvanceTimeout) { clearTimeout(quizAutoAdvanceTimeout); quizAutoAdvanceTimeout = null; }
    }

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

  function openAdminPanel(subTab) {
    if (subTab) {
      adminSubTab = subTab;
    }
    switchTab('admin');
  }

  function openUserAccountOrAdmin() {
    if (window.TKST_AUTH.isAdmin()) {
      openAdminPanel();
    } else {
      switchTab('login');
    }
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
      el.style.display = isAdmin ? (el.tagName.toLowerCase() === 'a' ? 'flex' : 'block') : 'none';
      const link = el.tagName.toLowerCase() === 'a' ? el : el.querySelector('a');
      if (link) {
        let badge = link.querySelector('.admin-pending-badge');
        if (pendingCount > 0) {
          if (!badge) {
            badge = document.createElement('span');
            badge.className = 'nav-badge admin-pending-badge';
            badge.style.cssText = 'background: #E63946; color: #FFF; font-weight: 800; animation: pulse 2s infinite; margin-left: 6px;';
            link.appendChild(badge);
          }
          badge.textContent = `${pendingCount}`;
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
          <button class="btn btn-gold" onclick="window.TKST_APP.openAdminPanel()" style="font-size: 0.78rem; padding: 6px 12px; white-space: nowrap; position: relative; font-weight: 700;" title="Painel Master Sensei Diego">
            <i class="fas fa-crown"></i> <span>Painel Admin</span>
            ${pendingCount > 0 ? `<span class="header-notification-pill" title="${pendingCount} cadastro(s) pendente(s)">${pendingCount}</span>` : ''}
          </button>
          <button class="btn" onclick="window.TKST_APP.openInviteModal()" style="font-size: 0.78rem; padding: 6px 11px; background: #25D366; color: #FFF; font-weight: 700; border: none; white-space: nowrap; box-shadow: 0 2px 8px rgba(37, 211, 102, 0.35);" title="Convidar Novos Alunos via WhatsApp">
            <i class="fab fa-whatsapp"></i> <span>Convidar</span>
          </button>
        ` : ''}
        <button class="btn btn-secondary" onclick="window.TKST_APP.openEditProfileModal()" style="font-size: 0.78rem; padding: 6px 10px; border-color: rgba(255, 183, 3, 0.35); color: var(--accent-gold); white-space: nowrap;" title="Editar Perfil e Informações">
          <i class="fas fa-user-edit"></i> <span>Perfil</span>
        </button>
        <button class="btn btn-secondary" onclick="window.TKST_APP.handleLogout()" style="font-size: 0.78rem; padding: 6px 10px; background: rgba(230, 57, 70, 0.15); border-color: rgba(230, 57, 70, 0.4); color: #FF808A; white-space: nowrap;" title="Sair da Conta">
          <i class="fas fa-power-off"></i> <span>Sair</span>
        </button>
      `;
    }
  }

  function setupGlobalEvents() {
    function shouldSkipRerender() {
      // NEVER interrupt if user is actively taking a quiz or if a modal is open
      if (currentTab === 'quiz' && quizActive) return true;
      const detailModal = document.getElementById('detailModal');
      if (detailModal && detailModal.classList.contains('active')) return true;
      const videoModal = document.getElementById('videoModal');
      if (videoModal && videoModal.classList.contains('active')) return true;
      return false;
    }

    window.addEventListener('tkst_user_changed', () => {
      setupUserDisplay();
      if (!shouldSkipRerender()) {
        renderView(currentTab);
      }
    });

    window.addEventListener('tkst_progress_updated', () => {
      if (shouldSkipRerender()) return;
      if (currentTab === 'dashboard' || currentTab === 'my-exam') {
        renderView(currentTab);
      }
    });

    window.addEventListener('tkst_cloud_synced', () => {
      setupUserDisplay();
      if (!shouldSkipRerender()) {
        renderView(currentTab);
      }
    });

    window.addEventListener('tkst_videos_updated', () => {
      if (!shouldSkipRerender() && currentTab === 'katas') {
        renderView(currentTab);
      }
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
        breadcrumbCurrent.textContent = 'Área do Aluno';
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

    setupUserDisplay();
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
              <div style="color: var(--accent-gold); font-size: 0.85rem; font-weight: 600;">Login: ${user.username}</div>
            </div>
          </div>

          <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 16px; margin-bottom: 20px; display: flex; flex-direction: column; gap: 10px; font-size: 0.88rem;">
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #94A3B8;">Graduação Atual:</span>
              <strong style="color: #FFF;">${user.currentBelt}</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #94A3B8;">Dojo / Unidade:</span>
              <strong style="color: #FFF;">${user.dojo || 'TKST'}</strong>
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
        <div class="auth-card" style="position: relative; overflow: hidden;">
          <!-- Subtle Vertical Kanji Watermark -->
          <div style="position: absolute; right: 8px; bottom: 8px; width: 75px; height: 180px; background: url('assets/images/logo-tkst-kanji-frente.png') no-repeat center right; background-size: contain; opacity: 0.05; pointer-events: none;"></div>

          <div class="auth-header" style="position: relative; z-index: 1;">
            <img src="assets/images/logo-tkst-projeto-transp.png" alt="TKST Karate Logo" class="auth-logo" style="max-height: 90px; filter: drop-shadow(0 4px 14px rgba(255, 183, 3, 0.3));">
            <h2>TKST ALUNOS</h2>
            <p>Portal Oficial de Estudos</p>
          </div>

          <div id="authAlertBox" class="auth-alert"></div>

          <!-- PURE SINGLE LOGIN FORM -->
          <form onsubmit="event.preventDefault(); window.TKST_APP.submitLogin();" style="position: relative; z-index: 1;">
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

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border-color); font-size: 0.85rem; position: relative; z-index: 1;">
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
    const quizSubmissions = window.TKST_AUTH.getAllQuizSubmissions();
    const quizBankList = window.TKST_AUTH ? window.TKST_AUTH.getCustomQuizBank() : (window.TKST_QUIZ_BANK || []);
    const quizBankCount = quizBankList.length;

    let html = `
      <div class="section-header" style="margin-bottom: 20px; position: relative; overflow: hidden;">
        <!-- Subtle Transparent Emblem Watermark -->
        <img src="assets/images/logo-tkst-emblem-transp.png" alt="TKST Emblem" style="position: absolute; right: 10px; top: 10px; height: 75px; opacity: 0.12; pointer-events: none; object-fit: contain;">
        
        <div class="section-title-group" style="width: 100%; position: relative; z-index: 1;">
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 8px;">
            <div class="admin-badge-ribbon" style="margin-bottom: 0;">
              <i class="fas fa-crown"></i> Painel Geral do Administrador (Sensei Diego)
            </div>
            <div style="display: inline-flex; align-items: center; gap: 6px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.35); color: #6EE7B7; padding: 4px 10px; border-radius: var(--radius-full); font-size: 0.72rem; font-weight: 700;">
              <i class="fas fa-cloud" style="color: #10B981;"></i> Nuvem Conectada (PC ⇄ Celular)
            </div>
          </div>
          <h3 style="font-size: 1.3rem; margin-bottom: 4px;">Gerenciamento Completo TKST</h3>
          <p style="font-size: 0.85rem; color: #94A3B8;">Controle de alunos, avaliações teóricas, cadastros de Dojos, vídeos dos 26 Kata e arquivos com sincronização em nuvem.</p>
        </div>

        <div style="display: flex; gap: 8px; flex-wrap: wrap; width: 100%; margin-top: 8px; position: relative; z-index: 1;">
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

      <!-- Admin Stats Grid - Ultra Compact -->
      <div class="stats-mini-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 14px;">
        <div class="stat-mini-pill" onclick="window.TKST_APP.setAdminSubTab('pending')" style="cursor: pointer; background: rgba(18, 23, 34, 0.85); border: 1px solid rgba(255, 183, 3, 0.35); border-radius: 8px; padding: 6px 8px; display: flex; align-items: center; gap: 8px;">
          <i class="fas fa-clock" style="color: var(--accent-gold); font-size: 0.95rem; flex-shrink: 0;"></i>
          <div style="min-width: 0; line-height: 1.15;">
            <div style="font-size: 0.95rem; font-weight: 800; color: #FFF;">${pendingStudents.length}</div>
            <div style="font-size: 0.65rem; color: #94A3B8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Pendentes</div>
          </div>
        </div>

        <div class="stat-mini-pill" onclick="window.TKST_APP.setAdminSubTab('students')" style="cursor: pointer; background: rgba(18, 23, 34, 0.85); border: 1px solid rgba(16, 185, 129, 0.35); border-radius: 8px; padding: 6px 8px; display: flex; align-items: center; gap: 8px;">
          <i class="fas fa-user-check" style="color: var(--accent-emerald); font-size: 0.95rem; flex-shrink: 0;"></i>
          <div style="min-width: 0; line-height: 1.15;">
            <div style="font-size: 0.95rem; font-weight: 800; color: #FFF;">${approvedStudents.length}</div>
            <div style="font-size: 0.65rem; color: #94A3B8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Alunos</div>
          </div>
        </div>

        <div class="stat-mini-pill" onclick="window.TKST_APP.setAdminSubTab('quizzes')" style="cursor: pointer; background: rgba(18, 23, 34, 0.85); border: 1px solid rgba(255, 183, 3, 0.35); border-radius: 8px; padding: 6px 8px; display: flex; align-items: center; gap: 8px;" title="Ver Simulados Realizados">
          <i class="fas fa-clipboard-check" style="color: var(--accent-gold); font-size: 0.95rem; flex-shrink: 0;"></i>
          <div style="min-width: 0; line-height: 1.15;">
            <div style="font-size: 0.95rem; font-weight: 800; color: #FFF;">${quizSubmissions.length}</div>
            <div style="font-size: 0.65rem; color: #94A3B8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Simulados</div>
          </div>
        </div>

        <div class="stat-mini-pill" onclick="window.TKST_APP.setAdminSubTab('questions')" style="cursor: pointer; background: rgba(18, 23, 34, 0.85); border: 1px solid rgba(255, 183, 3, 0.35); border-radius: 8px; padding: 6px 8px; display: flex; align-items: center; gap: 8px;" title="Gerenciar Perguntas & Respostas do Simulado">
          <i class="fas fa-question-circle" style="color: var(--accent-gold); font-size: 0.95rem; flex-shrink: 0;"></i>
          <div style="min-width: 0; line-height: 1.15;">
            <div style="font-size: 0.95rem; font-weight: 800; color: #FFF;">${quizBankCount}</div>
            <div style="font-size: 0.65rem; color: #94A3B8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Questões</div>
          </div>
        </div>

        <div class="stat-mini-pill" onclick="window.TKST_APP.setAdminSubTab('dojos')" style="cursor: pointer; background: rgba(18, 23, 34, 0.85); border: 1px solid rgba(139, 92, 246, 0.35); border-radius: 8px; padding: 6px 8px; display: flex; align-items: center; gap: 8px;" title="Gerenciar Dojos">
          <i class="fas fa-torii-gate" style="color: #A78BFA; font-size: 0.95rem; flex-shrink: 0;"></i>
          <div style="min-width: 0; line-height: 1.15;">
            <div style="font-size: 0.95rem; font-weight: 800; color: #FFF;">${dojos.length}</div>
            <div style="font-size: 0.65rem; color: #94A3B8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Dojos</div>
          </div>
        </div>

        <div class="stat-mini-pill" onclick="window.TKST_APP.setAdminSubTab('kata-videos')" style="cursor: pointer; background: rgba(18, 23, 34, 0.85); border: 1px solid rgba(59, 130, 246, 0.35); border-radius: 8px; padding: 6px 8px; display: flex; align-items: center; gap: 8px;" title="Gerenciar Vídeos dos 26 Kata">
          <i class="fas fa-video" style="color: #60A5FA; font-size: 0.95rem; flex-shrink: 0;"></i>
          <div style="min-width: 0; line-height: 1.15;">
            <div style="font-size: 0.95rem; font-weight: 800; color: #FFF;">26</div>
            <div style="font-size: 0.65rem; color: #94A3B8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Vídeos Kata</div>
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
        <button class="chip-btn ${adminSubTab === 'questions' ? 'active' : ''}" onclick="window.TKST_APP.setAdminSubTab('questions')" style="flex-shrink: 0; white-space: nowrap;">
          <i class="fas fa-question-circle"></i> Banco de Questões (${quizBankCount})
        </button>
        <button class="chip-btn ${adminSubTab === 'quizzes' ? 'active' : ''}" onclick="window.TKST_APP.setAdminSubTab('quizzes')" style="flex-shrink: 0; white-space: nowrap;">
          <i class="fas fa-clipboard-list"></i> Provas & Simulados (${quizSubmissions.length})
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
          <div style="padding: 14px 16px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
            <h4 style="font-family: var(--font-heading); color: #FFF; font-size: 1.05rem; margin: 0;">
              Solicitações de Cadastro Pendentes
            </h4>
            <span style="font-size: 0.8rem; color: var(--accent-gold); font-weight: 600;">
              ${pendingStudents.length} aguardando análise
            </span>
          </div>

          ${pendingStudents.length === 0 ? `
            <div style="padding: 40px 20px; text-align: center; color: #64748B;">
              <i class="fas fa-check-circle" style="font-size: 2.5rem; color: var(--accent-emerald); margin-bottom: 12px; display: block;"></i>
              Nenhum cadastro pendente no momento. Todos os alunos foram revisados!
            </div>
          ` : `
            <!-- Tabela para Desktop / Telas Grandes -->
            <table class="admin-table admin-table-desktop">
              <thead>
                <tr>
                  <th>Aluno</th>
                  <th>Login (Matrícula)</th>
                  <th>Presença</th>
                  <th>Contato</th>
                  <th>Faixa</th>
                  <th>Dojo Escolhido</th>
                  <th>Data</th>
                  <th style="text-align: right;">Ações do Sensei</th>
                </tr>
              </thead>
              <tbody>
                ${pendingStudents.map(s => {
                  const online = window.TKST_AUTH.isOnline(s);
                  const lastSeen = window.TKST_AUTH.getLastSeenText(s);
                  return `
                  <tr>
                    <td>
                      <div style="font-weight: 700; color: #FFF;">${s.name}</div>
                    </td>
                    <td>
                      <span class="badge badge-amarela">${s.username}</span>
                    </td>
                    <td>
                      ${online ? `
                        <span class="presence-badge-online">
                          <span class="presence-dot-online"></span>
                          Online
                        </span>
                      ` : `
                        <span class="presence-badge-offline">
                          <span class="presence-dot-offline"></span>
                          ${lastSeen}
                        </span>
                      `}
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
                `;}).join('')}
              </tbody>
            </table>

            <!-- Cards Responsivos para Celular (Sem Rolagem Lateral) -->
            <div class="admin-cards-mobile">
              ${pendingStudents.map(s => {
                const online = window.TKST_AUTH.isOnline(s);
                const lastSeen = window.TKST_AUTH.getLastSeenText(s);
                return `
                <div class="admin-card-item">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                    <div>
                      <div style="font-weight: 700; color: #FFF; font-size: 0.98rem;">${s.name}</div>
                      <div style="font-size: 0.8rem; color: var(--accent-gold); font-weight: 600; margin-top: 2px;">
                        @${s.username}
                      </div>
                    </div>
                    <div>
                      ${online ? `
                        <span class="presence-badge-online" style="font-size: 0.72rem; padding: 2px 7px;">
                          <span class="presence-dot-online"></span> Online
                        </span>
                      ` : `
                        <span class="presence-badge-offline" style="font-size: 0.72rem; padding: 2px 7px;">
                          <span class="presence-dot-offline"></span> ${lastSeen}
                        </span>
                      `}
                    </div>
                  </div>

                  <div style="display: flex; flex-direction: column; gap: 5px; font-size: 0.82rem; color: #CBD5E1; margin: 8px 0; background: rgba(0,0,0,0.22); padding: 8px 10px; border-radius: var(--radius-sm); border: 1px solid rgba(255,255,255,0.06);">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <span>Graduação:</span>
                      <span class="badge ${getBeltBadgeClass(s.currentBelt)}" style="font-size: 0.74rem;">${s.currentBelt}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <span>Dojo Escolhido:</span>
                      <strong style="color: var(--accent-gold);">${s.dojo}</strong>
                    </div>
                    ${s.phone ? `
                      <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span>Contato:</span>
                        <span>${s.phone}</span>
                      </div>
                    ` : ''}
                    <div style="display: flex; justify-content: space-between; align-items: center; color: #94A3B8; font-size: 0.76rem;">
                      <span>Data de Solicitação:</span>
                      <span>${s.startDate}</span>
                    </div>
                  </div>

                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 4px;">
                    <button class="btn btn-sm btn-success" onclick="window.TKST_APP.approveStudent('${s.id}')" style="justify-content: center; font-weight: 700; padding: 9px;">
                      <i class="fas fa-check"></i> Aceitar
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="window.TKST_APP.rejectStudent('${s.id}')" style="justify-content: center; font-weight: 700; padding: 9px;">
                      <i class="fas fa-times"></i> Recusar
                    </button>
                  </div>
                </div>
              `;}).join('')}
            </div>
          `}
        </div>
      ` : ''}

      ${adminSubTab === 'students' ? `
        <!-- ALL REGISTERED STUDENTS TABLE -->
        <div class="admin-table-container">
          <div style="padding: 14px 16px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
            <h4 style="font-family: var(--font-heading); color: #FFF; font-size: 1.05rem; margin: 0;">
              Base de Alunos e Praticantes Cadastrados
            </h4>
            <span style="font-size: 0.8rem; color: #94A3B8;">Total: ${students.length} usuários</span>
          </div>

          <!-- Tabela para Desktop / Telas Grandes -->
          <table class="admin-table admin-table-desktop">
            <thead>
              <tr>
                <th>Aluno</th>
                <th>Login (Matrícula)</th>
                <th>Presença</th>
                <th>Status</th>
                <th>Faixa</th>
                <th>Dojo / Unidade</th>
                <th style="text-align: right;">Ações</th>
              </tr>
            </thead>
            <tbody>
              ${students.map(s => {
                const isMaster = s.username === 'irons365';
                const online = window.TKST_AUTH.isOnline(s);
                const lastSeen = window.TKST_AUTH.getLastSeenText(s);
                return `
                  <tr>
                    <td>
                      <div style="display: flex; align-items: center; gap: 10px;">
                        <div class="presence-avatar-wrapper">
                          <img src="${s.avatar || 'assets/images/tigre.png'}" style="width: 36px; height: 36px; border-radius: var(--radius-full); object-fit: cover; border: 1px solid var(--border-color);">
                          <span class="presence-avatar-dot ${online ? 'online' : 'offline'}" title="${online ? 'Online agora' : lastSeen}"></span>
                        </div>
                        <div>
                          <div style="font-weight: 700; color: #FFF; display: flex; align-items: center; gap: 6px;">
                            ${s.name} ${isMaster ? '<i class="fas fa-crown" style="color: var(--accent-gold); font-size: 0.8rem;"></i>' : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <strong style="color: var(--accent-gold);">${s.username}</strong>
                    </td>
                    <td>
                      ${online ? `
                        <span class="presence-badge-online">
                          <span class="presence-dot-online"></span>
                          Online
                        </span>
                      ` : `
                        <span class="presence-badge-offline" title="${s.lastActive ? new Date(s.lastActive).toLocaleString('pt-BR') : 'Sem histórico recente'}">
                          <span class="presence-dot-offline"></span>
                          ${lastSeen}
                        </span>
                      `}
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

          <!-- Cards Responsivos para Celular (Sem Rolagem Lateral) -->
          <div class="admin-cards-mobile">
            ${students.map(s => {
              const isMaster = s.username === 'irons365';
              const online = window.TKST_AUTH.isOnline(s);
              const lastSeen = window.TKST_AUTH.getLastSeenText(s);
              return `
                <div class="admin-card-item">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 6px;">
                    <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
                      <div class="presence-avatar-wrapper" style="flex-shrink: 0;">
                        <img src="${s.avatar || 'assets/images/tigre.png'}" style="width: 42px; height: 42px; border-radius: var(--radius-full); object-fit: cover; border: 1.5px solid var(--border-color);">
                        <span class="presence-avatar-dot ${online ? 'online' : 'offline'}" title="${online ? 'Online agora' : lastSeen}"></span>
                      </div>
                      <div style="min-width: 0;">
                        <div style="font-weight: 700; color: #FFF; font-size: 0.95rem; display: flex; align-items: center; gap: 6px; word-break: break-word;">
                          ${s.name} ${isMaster ? '<i class="fas fa-crown" style="color: var(--accent-gold); font-size: 0.82rem;"></i>' : ''}
                        </div>
                        <div style="font-size: 0.78rem; color: var(--accent-gold); font-weight: 600; margin-top: 1px;">
                          @${s.username}
                        </div>
                      </div>
                    </div>
                    <div style="flex-shrink: 0;">
                      ${online ? `
                        <span class="presence-badge-online" style="font-size: 0.72rem; padding: 2px 7px;">
                          <span class="presence-dot-online"></span> Online
                        </span>
                      ` : `
                        <span class="presence-badge-offline" style="font-size: 0.72rem; padding: 2px 7px;">
                          <span class="presence-dot-offline"></span> ${lastSeen}
                        </span>
                      `}
                    </div>
                  </div>

                  <div style="display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin: 8px 0; background: rgba(0,0,0,0.22); padding: 8px 10px; border-radius: var(--radius-sm); border: 1px solid rgba(255,255,255,0.06);">
                    <span class="badge ${getBeltBadgeClass(s.currentBelt)}" style="font-size: 0.74rem;">${s.currentBelt}</span>
                    <span class="badge ${s.status === 'approved' ? 'badge-status-approved' : s.status === 'pending' ? 'badge-status-pending' : 'badge-status-rejected'}" style="font-size: 0.72rem;">
                      ${s.status === 'approved' ? 'Ativo' : s.status === 'pending' ? 'Pendente' : 'Recusado'}
                    </span>
                    <div style="font-size: 0.78rem; color: #CBD5E1; display: flex; align-items: center; gap: 4px; margin-left: auto;">
                      <i class="fas fa-torii-gate" style="color: var(--accent-gold);"></i> ${s.dojo}
                    </div>
                  </div>

                  <div style="display: flex; justify-content: flex-end; align-items: center; margin-top: 2px;">
                    ${isMaster ? `
                      <span style="font-size: 0.78rem; color: var(--accent-gold); font-weight: 700; display: flex; align-items: center; gap: 5px;">
                        <i class="fas fa-shield-alt"></i> Conta Master Principal
                      </span>
                    ` : `
                      <button class="btn btn-sm btn-danger" onclick="window.TKST_APP.deleteStudent('${s.id}', '${(s.name || '').replace(/'/g, "\\'")}')" style="width: 100%; justify-content: center; font-size: 0.82rem; padding: 8px 12px;" title="Excluir Aluno">
                        <i class="fas fa-trash"></i> Excluir Aluno
                      </button>
                    `}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
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

            <div>
              <div class="form-group" style="margin-bottom: 14px;">
                <label class="form-label" style="font-size: 0.85rem; margin-bottom: 6px;">Nome do Dojo / Unidade</label>
                <input type="text" id="newDojoNameInput" class="form-input" placeholder="ex: TKST Barra da Tijuca" onkeydown="if(event.key === 'Enter'){ event.preventDefault(); window.TKST_APP.submitNewDojo(); }">
              </div>
              <div id="dojoFeedback" style="margin-bottom: 12px;"></div>
              <button type="button" class="btn btn-primary" onclick="window.TKST_APP.submitNewDojo()" style="width: 100%; padding: 12px; font-weight: 700; cursor: pointer;">
                <i class="fas fa-torii-gate"></i> Cadastrar Dojo
              </button>
            </div>
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
                  <button class="btn btn-sm btn-danger" onclick="window.TKST_APP.deleteDojo('${d.replace(/'/g, "\\'")}')" title="Excluir Dojo">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              `).join('')}
            </div>
          </div>

        </div>
      ` : ''}

      ${adminSubTab === 'kata-videos' ? `
        <!-- 26 KATA VIDEO LINKS MANAGER (MULTI-VIDEO SUPPORT) -->
        <div class="admin-table-container">
          <div style="padding: 18px 20px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <div>
              <h4 style="font-family: var(--font-heading); color: #FFF; font-size: 1.15rem; display: flex; align-items: center; gap: 8px; margin: 0 0 4px 0;">
                <i class="fas fa-video" style="color: var(--accent-gold);"></i> Gerenciador de Vídeos dos 26 Kata (Múltiplos Vídeos por Kata)
              </h4>
              <p style="font-size: 0.85rem; color: #94A3B8; margin: 0;">
                Cadastre múltiplos vídeos para cada Kata com título e descrição (ex: <em>Execução Lenta</em>, <em>Passo a Passo</em>, <em>Aplicação Bunkai</em>). Os alunos verão a lista completa e escolherão qual querem assistir.
              </p>
            </div>
          </div>

          <div style="padding: 16px; display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 16px;">
            ${(window.TKST_KATAS || []).map((k, idx) => {
              const videosList = normalizeKataVideos(customVideos[k.id], k);
              const count = videosList.length;
              return `
                <div class="stat-card" style="flex-direction: column; align-items: stretch; padding: 16px; background: rgba(18, 23, 34, 0.85); border-left: 4px solid ${count > 0 ? 'var(--accent-emerald)' : 'var(--border-color)'}; gap: 12px;">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="font-weight: 700; color: #FFF; font-size: 1rem;">
                      ${idx + 1}. ${k.name} <span style="font-family: var(--font-kanji); color: var(--accent-gold); font-size: 0.88rem;">(${k.kanji})</span>
                    </div>
                    <span class="badge ${count > 0 ? 'badge-verde' : 'badge-status-pending'}" style="font-size: 0.7rem;">
                      ${count > 0 ? `${count} Vídeo${count > 1 ? 's' : ''}` : 'Sem Vídeos'}
                    </span>
                  </div>

                  <!-- Lista de vídeos configurados para este Kata -->
                  <div style="display: flex; flex-direction: column; gap: 8px; max-height: 220px; overflow-y: auto;">
                    ${count === 0 ? `
                      <div style="font-size: 0.8rem; color: #64748B; padding: 8px; background: rgba(255,255,255,0.02); border-radius: var(--radius-sm); text-align: center;">
                        Nenhum vídeo cadastrado. Clique no botão abaixo para adicionar.
                      </div>
                    ` : videosList.map((v, vIdx) => `
                      <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: var(--radius-sm); padding: 8px 10px; display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                        <div style="min-width: 0; flex: 1;">
                          <div style="font-size: 0.86rem; font-weight: 700; color: #FFF; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            ${vIdx + 1}. ${escapeHtml(v.title)}
                          </div>
                          ${v.description ? `<div style="font-size: 0.75rem; color: #94A3B8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(v.description)}</div>` : ''}
                        </div>
                        <div style="display: flex; gap: 4px; flex-shrink: 0;">
                          <button class="btn btn-sm btn-gold" onclick="window.TKST_APP.testDirectVideo('${escapeHtml(v.title.replace(/'/g, "\\'"))}', '${escapeHtml(v.url.replace(/'/g, "\\'"))}', '${escapeHtml((v.description || '').replace(/'/g, "\\'"))}')" title="Testar Vídeo" style="font-size: 0.7rem; padding: 4px 7px;">
                            <i class="fas fa-play"></i>
                          </button>
                          <button class="btn btn-sm btn-secondary" onclick="window.TKST_APP.openEditKataVideoModal('${k.id}', '${v.id}')" title="Editar Vídeo" style="font-size: 0.7rem; padding: 4px 7px;">
                            <i class="fas fa-edit"></i>
                          </button>
                          <button class="btn btn-sm btn-danger" onclick="window.TKST_APP.deleteKataVideo('${k.id}', '${v.id}')" title="Excluir Vídeo" style="font-size: 0.7rem; padding: 4px 7px;">
                            <i class="fas fa-trash"></i>
                          </button>
                        </div>
                      </div>
                    `).join('')}
                  </div>

                  <!-- Botão Adicionar Vídeo -->
                  <button class="btn btn-sm btn-primary" onclick="window.TKST_APP.openAddKataVideoModal('${k.id}')" style="width: 100%; font-size: 0.8rem; padding: 8px; font-weight: 700;">
                    <i class="fas fa-plus"></i> Adicionar Vídeo a ${k.name}
                  </button>
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

      ${adminSubTab === 'quizzes' ? `
        <!-- QUIZ SUBMISSIONS LIST -->
        <div class="admin-table-container">
          <div style="padding: 14px 16px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
            <div>
              <h4 style="font-family: var(--font-heading); color: #FFF; font-size: 1.05rem; margin: 0 0 2px 0;">
                Simulados e Avaliações Teóricas Realizadas
              </h4>
              <div style="font-size: 0.78rem; color: #94A3B8;">
                Gabarito, acertos, erros e percentual de aprovação de cada aluno.
              </div>
            </div>
            <span style="font-size: 0.8rem; color: var(--accent-gold); font-weight: 600;">
              ${quizSubmissions.length} prova(s) registrada(s)
            </span>
          </div>

          ${quizSubmissions.length === 0 ? `
            <div style="padding: 40px 20px; text-align: center; color: #64748B;">
              <i class="fas fa-clipboard-list" style="font-size: 2.5rem; color: #64748B; margin-bottom: 12px; display: block;"></i>
              Nenhum aluno realizou simulados teóricos recentemente.
            </div>
          ` : `
            <!-- Tabela para Desktop / Telas Grandes -->
            <table class="admin-table admin-table-desktop">
              <thead>
                <tr>
                  <th>Aluno</th>
                  <th>Graduação do Aluno</th>
                  <th>Nível do Simulado</th>
                  <th>Desempenho</th>
                  <th>Data da Prova</th>
                  <th style="text-align: right;">Ações</th>
                </tr>
              </thead>
              <tbody>
                ${quizSubmissions.map(sub => {
                  const dateStr = sub.date ? new Date(sub.date).toLocaleString('pt-BR') : '-';
                  const safeName = (sub.studentName || '').replace(/'/g, "\\'");
                  return `
                    <tr>
                      <td>
                        <div style="font-weight: 700; color: #FFF;">${sub.studentName || 'Aluno'}</div>
                        <div style="font-size: 0.74rem; color: #94A3B8;">Login: ${sub.studentUsername || ''}</div>
                      </td>
                      <td><span class="badge ${getBeltBadgeClass(sub.studentBelt)}">${sub.studentBelt || 'Faixa Branca'}</span></td>
                      <td><strong style="color: var(--accent-gold);">${sub.beltLevel || 'Geral'}</strong></td>
                      <td>
                        <div style="display: flex; align-items: center; gap: 6px;">
                          <strong style="color: ${sub.passed ? 'var(--accent-emerald)' : 'var(--accent-crimson)'}; font-size: 0.95rem;">
                            ${sub.score} / ${sub.total} (${sub.percentage}%)
                          </strong>
                          ${sub.perfect ? `<span class="badge badge-gold" style="font-size: 0.68rem;">100% 🏆</span>` : (sub.passed ? `<span class="badge badge-verde" style="font-size: 0.68rem;">Aprovado</span>` : `<span class="badge badge-vermelha" style="font-size: 0.68rem;">Reprovado</span>`)}
                        </div>
                      </td>
                      <td style="color: #94A3B8; font-size: 0.8rem;">${dateStr}</td>
                      <td style="text-align: right;">
                        <div style="display: inline-flex; gap: 6px; justify-content: flex-end; align-items: center;">
                          <button class="btn btn-sm btn-primary" onclick="window.TKST_APP.openQuizDetailModal('${sub.id}')" style="font-size: 0.78rem; padding: 6px 12px;" title="Ver Gabarito Completo">
                            <i class="fas fa-search"></i> Ver Prova
                          </button>
                          <button class="btn btn-sm btn-danger" onclick="window.TKST_APP.deleteQuizSubmission('${sub.id}', '${safeName}')" style="font-size: 0.78rem; padding: 6px 10px;" title="Excluir este simulado">
                            <i class="fas fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>

            <!-- Cards Responsivos para Celular (Sem Rolagem Lateral) -->
            <div class="admin-cards-mobile">
              ${quizSubmissions.map(sub => {
                const dateStr = sub.date ? new Date(sub.date).toLocaleString('pt-BR') : '-';
                const safeName = (sub.studentName || '').replace(/'/g, "\\'");
                return `
                  <div class="admin-card-item">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                      <div>
                        <div style="font-weight: 700; color: #FFF; font-size: 0.96rem;">${sub.studentName || 'Aluno'}</div>
                        <div style="font-size: 0.78rem; color: var(--accent-gold); font-weight: 600; margin-top: 1px;">@${sub.studentUsername || ''}</div>
                      </div>
                      <span class="badge ${getBeltBadgeClass(sub.studentBelt)}" style="font-size: 0.72rem;">${sub.studentBelt || 'Faixa Branca'}</span>
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 5px; font-size: 0.82rem; color: #CBD5E1; margin: 8px 0; background: rgba(0,0,0,0.22); padding: 8px 10px; border-radius: var(--radius-sm); border: 1px solid rgba(255,255,255,0.06);">
                      <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span>Nível do Simulado:</span>
                        <strong style="color: var(--accent-gold);">${sub.beltLevel || 'Geral'}</strong>
                      </div>
                      <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span>Desempenho:</span>
                        <div style="display: flex; align-items: center; gap: 5px;">
                          <strong style="color: ${sub.passed ? 'var(--accent-emerald)' : 'var(--accent-crimson)'}; font-size: 0.92rem;">
                            ${sub.score} / ${sub.total} (${sub.percentage}%)
                          </strong>
                          ${sub.perfect ? `<span class="badge badge-gold" style="font-size: 0.65rem;">100% 🏆</span>` : (sub.passed ? `<span class="badge badge-verde" style="font-size: 0.65rem;">Aprovado</span>` : `<span class="badge badge-vermelha" style="font-size: 0.65rem;">Reprovado</span>`)}
                        </div>
                      </div>
                      <div style="display: flex; justify-content: space-between; align-items: center; color: #94A3B8; font-size: 0.74rem;">
                        <span>Data da Prova:</span>
                        <span>${dateStr}</span>
                      </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 8px; margin-top: 4px;">
                      <button class="btn btn-sm btn-primary" onclick="window.TKST_APP.openQuizDetailModal('${sub.id}')" style="justify-content: center; font-size: 0.8rem; padding: 8px 12px;">
                        <i class="fas fa-search"></i> Ver Prova
                      </button>
                      <button class="btn btn-sm btn-danger" onclick="window.TKST_APP.deleteQuizSubmission('${sub.id}', '${safeName}')" style="justify-content: center; font-size: 0.8rem; padding: 8px 10px;" title="Excluir">
                        <i class="fas fa-trash"></i> Excluir
                      </button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>
      ` : ''}

      ${adminSubTab === 'questions' ? `
        <!-- BANCO DE QUESTÕES DOS SIMULADOS -->
        <div class="admin-table-container">
          <div style="padding: 18px 20px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <div>
              <h4 style="font-family: var(--font-heading); color: #FFF; font-size: 1.15rem; margin-bottom: 2px;">
                <i class="fas fa-edit" style="color: var(--accent-gold);"></i> Gestor de Perguntas & Gabarito dos Simulados
              </h4>
              <div style="font-size: 0.82rem; color: #94A3B8;">
                Selecione a graduação abaixo para visualizar em ordem, criar ou corrigir as perguntas e a resposta correta de cada questão.
              </div>
            </div>
            <button class="btn btn-primary" onclick="window.TKST_APP.openAddQuizQuestionModal(${adminQuizSelectedKyu})" style="font-size: 0.82rem; padding: 8px 14px; font-weight: 700;">
              <i class="fas fa-plus"></i> Nova Questão para esta Faixa
            </button>
          </div>

          <!-- Graduation Filter Buttons - 2 linhas (5 botões por linha) com cor da faixa de fundo -->
          <div style="padding: 10px 12px; border-bottom: 1px solid var(--border-color); display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; background: rgba(0,0,0,0.25);">
            ${[
              { kyu: 7, label: "7ºKyu", bg: "#FFFFFF", color: "#0A0D14" },
              { kyu: 6, label: "6ºKyu", bg: "#F5BE00", color: "#0A0D14" },
              { kyu: 5, label: "5ºKyu", bg: "#E63946", color: "#FFFFFF" },
              { kyu: 4, label: "4ºKyu", bg: "#FF7700", color: "#FFFFFF" },
              { kyu: 3, label: "3ºKyu", bg: "#10B981", color: "#FFFFFF" },
              { kyu: 2, label: "2ºKyu", bg: "#8B5CF6", color: "#FFFFFF" },
              { kyu: 1, label: "1ºKyu", bg: "#78350F", color: "#FFFFFF" },
              { kyu: 0, label: "1ºDan", bg: "#18181B", color: "#F4F4F5", border: "1px solid #52525B" },
              { kyu: -1, label: "2ºDan", bg: "#18181B", color: "#F4F4F5", border: "1px solid #52525B" },
              { kyu: -2, label: "3ºDan", bg: "#18181B", color: "#F4F4F5", border: "1px solid #52525B" }
            ].map(b => `
              <button 
                onclick="window.TKST_APP.setAdminQuizSelectedKyu(${b.kyu})"
                style="
                  background: ${b.bg};
                  color: ${b.color};
                  border: ${adminQuizSelectedKyu === b.kyu ? '2px solid #FFB703' : (b.border || '1px solid rgba(255,255,255,0.15)')};
                  ${adminQuizSelectedKyu === b.kyu ? 'box-shadow: 0 0 10px rgba(255, 183, 3, 0.8); transform: scale(1.04); font-weight: 900;' : 'opacity: 0.85; font-weight: 700;'}
                  border-radius: 6px;
                  padding: 8px 2px;
                  font-size: 0.76rem;
                  cursor: pointer;
                  text-align: center;
                  transition: all 0.15s ease;
                  line-height: 1;
                  white-space: nowrap;
                "
                title="Filtrar por ${b.label}"
              >
                ${b.label}
              </button>
            `).join('')}
          </div>

          <!-- Questions List Ordered -->
          <div style="padding: 18px; display: flex; flex-direction: column; gap: 14px;">
            ${(() => {
              const allBank = window.TKST_AUTH ? window.TKST_AUTH.getCustomQuizBank() : (window.TKST_QUIZ_BANK || []);
              const currentKyuQuestions = allBank.map(q => ensureSmartQuestionOptions(q)).filter(q => q.kyuNumber === adminQuizSelectedKyu);
              if (currentKyuQuestions.length === 0) {
                return `
                  <div style="padding: 30px; text-align: center; color: #64748B;">
                    <i class="fas fa-question-circle" style="font-size: 2.2rem; margin-bottom: 8px; display: block;"></i>
                    Nenhuma questão cadastrada para ${getBeltNameFromKyu(adminQuizSelectedKyu)}. Clique no botão acima para adicionar a primeira!
                  </div>
                `;
              }
              return currentKyuQuestions.map((q, idx) => {
                const correctText = (q.options && q.options[q.correctIndex]) || (q.options && q.options[0]) || '';
                return `
                  <div class="stat-card" style="flex-direction: column; align-items: stretch; padding: 18px; background: rgba(18, 23, 34, 0.9); border-left: 4px solid var(--accent-gold); gap: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                      <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="badge badge-gold" style="font-weight: 800; font-size: 0.78rem;">Questão ${idx + 1}</span>
                        <span style="font-size: 0.76rem; color: #94A3B8;">ID: ${q.id}</span>
                      </div>
                      <div style="display: flex; gap: 6px;">
                        <button class="btn btn-sm btn-primary" onclick="window.TKST_APP.openEditQuizQuestionModal('${q.id}')" style="font-size: 0.76rem; padding: 5px 12px; font-weight: 600;">
                          <i class="fas fa-edit"></i> Editar Pergunta & Resposta
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="window.TKST_APP.deleteQuizQuestion('${q.id}')" style="font-size: 0.76rem; padding: 5px 10px;" title="Excluir">
                          <i class="fas fa-trash"></i>
                        </button>
                      </div>
                    </div>

                    <div style="font-size: 1.02rem; font-weight: 700; color: #FFF; line-height: 1.5;">
                      ${q.question}
                    </div>

                    ${q.image ? `
                      <div style="margin: 4px 0 8px 0; display: inline-flex; align-items: center; gap: 10px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: var(--radius-sm); padding: 6px 12px;">
                        <img src="${q.image}" alt="Imagem da Questão" style="height: 65px; max-width: 120px; object-fit: contain; border-radius: 4px; border: 1px solid rgba(255,255,255,0.15); cursor: pointer;" onclick="window.TKST_APP.openImagePreview('${q.image}')" title="Clique para ampliar">
                        <div>
                          <span class="badge badge-gold" style="font-size: 0.72rem; margin-bottom: 2px;"><i class="fas fa-image"></i> Possui Imagem Ilustrativa</span>
                          <div style="font-size: 0.76rem; color: #94A3B8;">Clique na miniatura para ampliar</div>
                        </div>
                      </div>
                    ` : ''}

                    <div style="background: rgba(16, 185, 129, 0.12); border: 1px solid var(--accent-emerald); border-radius: var(--radius-sm); padding: 10px 14px; color: #6EE7B7; font-size: 0.88rem; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                      <i class="fas fa-check-circle" style="color: var(--accent-emerald); font-size: 1.05rem;"></i>
                      <span><strong>Resposta Correta (Gabarito):</strong> ${correctText}</span>
                    </div>
                  </div>
                `;
              }).join('');
            })()}
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

      <div class="dashboard-hero" style="position: relative; overflow: hidden;">
        <!-- Subtle Transparent TKST Emblem Watermark -->
        <img src="assets/images/logo-tkst-emblem-transp.png" alt="TKST Emblem" style="position: absolute; right: -15px; bottom: -12px; height: 115%; opacity: 0.12; pointer-events: none; object-fit: contain; filter: drop-shadow(0 0 14px rgba(255, 183, 3, 0.2));">

        <div class="hero-content" style="position: relative; z-index: 1;">
          <div class="hero-welcome">
            <h2>Oss, ${user.name}! 🥋</h2>
            <p>Bem-vindo ao seu portal oficial de estudos na <strong>Tradicional Karate-Do Shotokan Tsuyoi (TKST)</strong>.</p>
          </div>
          <div class="hero-rank-display">
            <div class="hero-belt-img-wrapper">
              <img src="${getBeltImage(user.currentBelt)}" alt="${user.currentBelt}" class="hero-belt-img">
            </div>
            <div class="hero-rank-meta" style="flex: 1;">
              <div class="rank-label">Graduação Atual</div>
              <div class="rank-name">${user.currentBelt}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Stats (Minimizados em 1 Linha) -->
      <div class="stats-grid">
        ${!isAdmin ? `
          <div class="stat-card" onclick="window.TKST_APP.switchTab('my-exam')" style="cursor: pointer;" title="Ver Matéria de Exame">
            <div class="stat-icon-box">
              <i class="fas fa-medal"></i>
            </div>
            <div class="stat-value">${curriculum.targetBelt.split(' ')[1] || 'Amarela'}</div>
            <div class="stat-label">Exame</div>
          </div>
        ` : `
          <div class="stat-card" onclick="window.TKST_APP.switchTab('admin'); window.TKST_APP.setAdminSubTab('students');" style="cursor: pointer;" title="Ver Alunos Matriculados">
            <div class="stat-icon-box crimson">
              <i class="fas fa-users"></i>
            </div>
            <div class="stat-value">${students.length}</div>
            <div class="stat-label">Alunos</div>
          </div>
        `}

        <div class="stat-card" onclick="window.TKST_APP.switchTab('katas')" style="cursor: pointer;" title="Ver Enciclopédia dos 26 Katas">
          <div class="stat-icon-box gold">
            <i class="fas fa-book-open"></i>
          </div>
          <div class="stat-value">${totalKatas} Katas</div>
          <div class="stat-label">Biblioteca</div>
        </div>

        ${!isAdmin ? `
          <div class="stat-card" onclick="window.TKST_APP.switchTab('kumite')" style="cursor: pointer;" title="Ver Guia de Kumite">
            <div class="stat-icon-box blue">
              <i class="fas fa-fist-raised"></i>
            </div>
            <div class="stat-value">Kumite</div>
            <div class="stat-label">5 Modos</div>
          </div>
        ` : `
          <div class="stat-card" onclick="window.TKST_APP.switchTab('admin'); window.TKST_APP.setAdminSubTab('questions');" style="cursor: pointer;" title="Gerenciar Banco de Questões">
            <div class="stat-icon-box purple">
              <i class="fas fa-question-circle"></i>
            </div>
            <div class="stat-value">${(window.TKST_AUTH ? window.TKST_AUTH.getCustomQuizBank().length : (window.TKST_DEFAULT_QUIZ_BANK ? window.TKST_DEFAULT_QUIZ_BANK.length : 138))}</div>
            <div class="stat-label">Questões</div>
          </div>
        `}

        <div class="stat-card" onclick="window.TKST_APP.switchTab('quiz')" style="cursor: pointer;" title="Fazer Simulado Teórico">
          <div class="stat-icon-box emerald">
            <i class="fas fa-brain"></i>
          </div>
          <div class="stat-value">Simulado</div>
          <div class="stat-label">Quiz</div>
        </div>
      </div>

      <!-- Dojo Kun Collapsible Accordion Card -->
      <div class="stat-card dojokun-accordion-card" style="position: relative; flex-direction: column; align-items: stretch; margin-top: 18px; background: linear-gradient(135deg, rgba(22, 28, 42, 0.95) 0%, rgba(10, 13, 20, 0.98) 100%); border: 1.5px solid rgba(255, 183, 3, 0.25); box-shadow: var(--shadow-subtle); padding: 0; overflow: hidden;">
        <!-- Subtle Vertical Kanji Watermark in Header -->
        <img src="assets/images/logo-tkst-kanji-frente.png" alt="Kanji" style="position: absolute; right: 135px; top: 50%; transform: translateY(-50%); height: 44px; opacity: 0.08; pointer-events: none;">

        <!-- Header Clicável com Efeito de Toque -->
        <div class="dojokun-accordion-header" onclick="window.TKST_APP.toggleDojoKunAccordion()" style="position: relative; z-index: 1; padding: 14px 16px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; gap: 10px; user-select: none; transition: background 0.2s ease;">
          <div class="section-title-group" style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 36px; height: 36px; border-radius: 8px; background: rgba(255, 183, 3, 0.12); border: 1px solid rgba(255, 183, 3, 0.3); display: flex; align-items: center; justify-content: center; color: var(--accent-gold); font-size: 1.1rem; flex-shrink: 0;">
              <i class="fas fa-scroll"></i>
            </div>
            <div>
              <h3 style="font-size: 1.05rem; font-weight: 700; color: #FFF; display: flex; align-items: center; gap: 8px; margin: 0;">
                Dojo Kun
              </h3>
              <p style="color: #94A3B8; font-size: 0.78rem; margin: 2px 0 0 0;">Lema e princípios fundamentais do Karatê-Dō</p>
            </div>
          </div>
          
          <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
            <span id="dojokunToggleBadge" class="btn btn-secondary" style="font-size: 0.75rem; padding: 6px 12px; border-color: rgba(255, 183, 3, 0.35); color: var(--accent-gold); pointer-events: none; display: flex; align-items: center; gap: 6px;">
              <i class="fas fa-chevron-down" id="dojokunChevronIcon" style="transition: transform 0.3s cubic-bezier(.4,0,.2,1);"></i> Toque para Ver
            </span>
          </div>
        </div>

        <!-- Conteúdo Expansível (Aparece ao Clicar) -->
        <div id="dojokunAccordionBody" style="display: none; padding: 0 16px 16px 16px; border-top: 1px solid rgba(255, 183, 3, 0.15); animation: fadeIn 0.3s ease; position: relative; overflow: hidden;">
          <!-- Authentic Vertical Kanji Background Ribbon -->
          <img src="assets/images/logo-tkst-kanji-vertical.png" alt="Kanji Calligraphy" style="position: absolute; right: 10px; top: 12px; height: 190px; opacity: 0.055; pointer-events: none;">

          <div style="position: relative; z-index: 1; display: flex; justify-content: space-between; align-items: center; margin: 12px 0; flex-wrap: wrap; gap: 8px;">
            <span style="font-size: 0.8rem; color: #94A3B8; font-style: italic;">Shotokan Karate-Do Tsuyoi</span>
            <button class="btn btn-secondary" style="font-size: 0.75rem; padding: 5px 12px;" onclick="event.stopPropagation(); window.TKST_APP.switchTab('philosophy')">
              <i class="fas fa-torii-gate"></i> Ver Filosofia Completa
            </button>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px;">
            ${(window.TKST_GLOSSARY && window.TKST_GLOSSARY.dojoKun ? window.TKST_GLOSSARY.dojoKun : [
              { number: 1, title: "Hitotsu! Jinkaku kansei ni tsutomuru koto!", translation: "Esforçar-se para a formação do caráter!", description: "O objetivo supremo do Karatê-Dō reside no aperfeiçoamento do caráter e integridade do praticante." },
              { number: 2, title: "Hitotsu! Makoto no michi o mamoru koto!", translation: "Fidelidade para com o verdadeiro caminho da razão!", description: "Agir com lealdade, verdade e honestidade perante seus mestres, colegas e a si próprio." },
              { number: 3, title: "Hitotsu! Doryoku no seishin o yashinau koto!", translation: "Criar o espírito de esforço e perseverança!", description: "A dedicação e o treino contínuo superam qualquer obstáculo. Jamais desistir." },
              { number: 4, title: "Hitotsu! Reigi o omonzuru koto!", translation: "Respeitar acima de tudo!", description: "O Karatê começa e termina com respeito e cortesia sincera (Rei)." },
              { number: 5, title: "Hitotsu! Kekki no yū o imashimuru koto!", translation: "Conter o espírito de agressão!", description: "Dominar impulsos, cultivar o autocontrole e buscar sempre a serenidade e a paz." }
            ]).map(d => `
              <div class="dojokun-card" style="margin-top: 0; border-left: 3.5px solid var(--accent-gold); background: rgba(255, 255, 255, 0.02); padding: 12px 14px; border-radius: var(--radius-sm); display: flex; flex-direction: column;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                  <span class="badge badge-gold" style="font-size: 0.72rem; padding: 2px 8px; font-weight: 700;">一つ Hitotsu</span>
                </div>
                <div class="dojokun-pt" style="font-weight: 700; color: #FFF; font-size: 0.92rem; margin-bottom: 3px;">
                  ${d.translation}
                </div>
                <div class="dojokun-jp" style="font-size: 0.78rem; color: var(--accent-gold); font-style: italic; margin-bottom: 5px;">
                  ${d.title}
                </div>
                <div class="dojokun-desc" style="font-size: 0.8rem; color: #CBD5E1; line-height: 1.4; margin-top: auto;">
                  ${d.description}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Niju Kun Collapsible Accordion Card -->
      <div class="stat-card nijukun-accordion-card" style="position: relative; flex-direction: column; align-items: stretch; margin-top: 14px; background: linear-gradient(135deg, rgba(22, 28, 42, 0.95) 0%, rgba(10, 13, 20, 0.98) 100%); border: 1.5px solid rgba(255, 183, 3, 0.25); box-shadow: var(--shadow-subtle); padding: 0; overflow: hidden;">
        <!-- Subtle Vertical Kanji Watermark in Header -->
        <img src="assets/images/logo-tkst-kanji-frente.png" alt="Kanji" style="position: absolute; right: 135px; top: 50%; transform: translateY(-50%); height: 44px; opacity: 0.08; pointer-events: none;">

        <!-- Header Clicável com Efeito de Toque -->
        <div class="nijukun-accordion-header" onclick="window.TKST_APP.toggleNijuKunAccordion()" style="position: relative; z-index: 1; padding: 14px 16px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; gap: 10px; user-select: none; transition: background 0.2s ease;">
          <div class="section-title-group" style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 36px; height: 36px; border-radius: 8px; background: rgba(255, 183, 3, 0.12); border: 1px solid rgba(255, 183, 3, 0.3); display: flex; align-items: center; justify-content: center; color: var(--accent-gold); font-size: 1.1rem; flex-shrink: 0;">
              <i class="fas fa-feather-alt"></i>
            </div>
            <div>
              <h3 style="font-size: 1.05rem; font-weight: 700; color: #FFF; display: flex; align-items: center; gap: 8px; margin: 0;">
                Niju Kun
              </h3>
              <p style="color: #94A3B8; font-size: 0.78rem; margin: 2px 0 0 0;">Os 20 Princípios do Mestre Gichin Funakoshi</p>
            </div>
          </div>
          
          <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
            <span id="nijukunToggleBadge" class="btn btn-secondary" style="font-size: 0.75rem; padding: 6px 12px; border-color: rgba(255, 183, 3, 0.35); color: var(--accent-gold); pointer-events: none; display: flex; align-items: center; gap: 6px;">
              <i class="fas fa-chevron-down" id="nijukunChevronIcon" style="transition: transform 0.3s cubic-bezier(.4,0,.2,1);"></i> Toque para Ver
            </span>
          </div>
        </div>

        <!-- Conteúdo Expansível (Aparece ao Clicar) -->
        <div id="nijukunAccordionBody" style="display: none; padding: 0 16px 16px 16px; border-top: 1px solid rgba(255, 183, 3, 0.15); animation: fadeIn 0.3s ease; position: relative; overflow: hidden;">
          <!-- Authentic Vertical Kanji Background Ribbon -->
          <img src="assets/images/logo-tkst-kanji-vertical.png" alt="Kanji Calligraphy" style="position: absolute; right: 10px; top: 12px; height: 190px; opacity: 0.055; pointer-events: none;">

          <div style="position: relative; z-index: 1; display: flex; justify-content: space-between; align-items: center; margin: 12px 0; flex-wrap: wrap; gap: 8px;">
            <span style="font-size: 0.8rem; color: #94A3B8; font-style: italic;">二十訓 - Gichin Funakoshi</span>
            <button class="btn btn-secondary" style="font-size: 0.75rem; padding: 5px 12px;" onclick="event.stopPropagation(); window.TKST_APP.switchTab('philosophy')">
              <i class="fas fa-torii-gate"></i> Ver Filosofia Completa
            </button>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px;">
            ${(window.TKST_GLOSSARY && window.TKST_GLOSSARY.nijuKun ? window.TKST_GLOSSARY.nijuKun : []).map(n => `
              <div class="dojokun-card" style="margin-top: 0; border-left: 3.5px solid var(--accent-gold); background: rgba(255, 255, 255, 0.02); padding: 12px 14px; border-radius: var(--radius-sm); display: flex; flex-direction: column;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                  <span class="badge badge-gold" style="font-size: 0.72rem; padding: 2px 8px; font-weight: 700;">${n.number}º Princípio</span>
                </div>
                <div class="dojokun-pt" style="font-weight: 700; color: #FFF; font-size: 0.92rem; margin-bottom: 3px;">
                  ${n.translation}
                </div>
                <div class="dojokun-jp" style="font-size: 0.78rem; color: var(--accent-gold); font-style: italic; margin-bottom: 5px;">
                  ${n.title}
                </div>
                <div class="dojokun-desc" style="font-size: 0.8rem; color: #CBD5E1; line-height: 1.4; margin-top: auto;">
                  ${n.description}
                </div>
              </div>
            `).join('')}
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

    // Nidan (2º Dan) - Kumite Oficial: Jiyu Ippon (3 formas) & Contra 1, 2 e 4
    if (kyu === -1) {
      return `
        <div class="gohon-infographic-card">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 12px;">
            <span class="gohon-header-badge" style="background: rgba(37, 99, 235, 0.2); border-color: rgba(59, 130, 246, 0.5); color: #60A5FA;">
              <i class="fas fa-fist-raised"></i> Guia Oficial • Kumite de Nidan (2º Dan TKST)
            </span>
            <span style="font-size: 0.76rem; color: #94A3B8; font-style: italic;">Exame Oficial de Graduação para 2º Dan</span>
          </div>

          <p style="font-size: 0.88rem; color: #E2E8F0; line-height: 1.6; margin-bottom: 16px;">
            O exame de <strong>Nidan (2º Dan)</strong> exige domínio consolidado de esquivas dinâmicas (<em>Tai Sabaki</em>), contra-ataques cirúrgicos no <em>Jiyu Ippon Kumite</em> (3 formas) e sustentação de alto ritmo de luta livre contínua contra múltiplos atacantes.
          </p>

          <div class="gohon-series-grid" style="grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));">
            <div class="gohon-series-card" style="border-left: 4px solid #3B82F6;">
              <div class="gohon-series-title">
                <strong style="color: #FFF; font-size: 0.95rem;">Jiyu Ippon Kumite (3 Formas)</strong>
                <span class="shodan-arrow-badge mae">Semi-Livre</span>
              </div>
              <p style="font-size: 0.84rem; color: #CBD5E1; line-height: 1.6; margin-top: 6px;">
                Aplicação de 3 formas de ataque pré-determinado com movimentação livre e resposta técnica imediata e decisiva no tempo exato (<em>De-ai</em>).
              </p>
            </div>

            <div class="gohon-series-card" style="border-left: 4px solid #10B981;">
              <div class="gohon-series-title">
                <strong style="color: #FFF; font-size: 0.95rem;">Kumite Múltiplo (Contra 1, 2 e 4)</strong>
                <span class="shodan-arrow-badge mawate">Resistência</span>
              </div>
              <p style="font-size: 0.84rem; color: #CBD5E1; line-height: 1.6; margin-top: 6px;">
                Combates sucessivos contra 1, 2 e 4 oponentes demonstrando visão periférica 360°, serenidade mental e condicionamento aeróbico de elite.
              </p>
            </div>
          </div>
        </div>
      `;
    }

    // Sandan (3º Dan) - Kumite Integral: Sanbon, Kihon Ippon, Jiyu Ippon, Shiai & Jiyu
    if (kyu === -2) {
      return `
        <div class="gohon-infographic-card">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 12px;">
            <span class="gohon-header-badge" style="background: rgba(220, 38, 38, 0.2); border-color: rgba(239, 68, 68, 0.5); color: #F87171;">
              <i class="fas fa-fist-raised"></i> Guia Oficial • Avaliação Integral de Kumite Sandan (3º Dan)
            </span>
            <span style="font-size: 0.76rem; color: #94A3B8; font-style: italic;">Exame Oficial de Graduação para 3º Dan</span>
          </div>

          <p style="font-size: 0.88rem; color: #E2E8F0; line-height: 1.6; margin-bottom: 16px;">
            O teste de combate para <strong>Sandan (3º Dan)</strong> abrange todas as modalidades tradicionais e competitivas do Karatê Shotokan, avaliando maturidade tática, controle, velocidade de decisão e espírito de mestre instrutor.
          </p>

          <div class="gohon-series-grid" style="grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));">
            <div class="gohon-series-card" style="border-left: 4px solid #3B82F6;">
              <div class="gohon-series-title">
                <strong style="color: #FFF; font-size: 0.9rem;">Sanbon & Kihon Ippon</strong>
              </div>
              <p style="font-size: 0.82rem; color: #CBD5E1; line-height: 1.5; margin-top: 6px;">
                3 formas de Sanbon e 3 formas de Kihon Ippon executadas com rigor absoluto de postura e base.
              </p>
            </div>

            <div class="gohon-series-card" style="border-left: 4px solid #10B981;">
              <div class="gohon-series-title">
                <strong style="color: #FFF; font-size: 0.9rem;">Jiyu Ippon Kumite</strong>
              </div>
              <p style="font-size: 0.82rem; color: #CBD5E1; line-height: 1.5; margin-top: 6px;">
                3 formas em movimentação de combate real com distância de aplicação perfeita (<em>Ma-ai</em>).
              </p>
            </div>

            <div class="gohon-series-card" style="border-left: 4px solid #F5BE00;">
              <div class="gohon-series-title">
                <strong style="color: #FFF; font-size: 0.9rem;">Shiai & Jiyu Kumite</strong>
              </div>
              <p style="font-size: 0.82rem; color: #CBD5E1; line-height: 1.5; margin-top: 6px;">
                Luta sob regras oficiais de pontuação (Shiai) e combate livre contínuo tradicional (Jiyu Kumite).
              </p>
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
      0: { label: "Marrom para Shodan", fullLabel: "Faixa Marrom ➔ Shodan (1º Dan)", kyuLabel: "Shodan", fromColor: "#78350F", toColor: "#0A0A0A", textColor: "#FFFFFF", isDark: false },
      "-1": { label: "Exame Nidan (2º Dan)", fullLabel: "Shodan (1º Dan) ➔ Nidan (2º Dan)", kyuLabel: "Nidan", fromColor: "#0A0A0A", toColor: "#1E293B", textColor: "#FFFFFF", isDark: false },
      "-2": { label: "Exame Sandan (3º Dan)", fullLabel: "Nidan (2º Dan) ➔ Sandan (3º Dan)", kyuLabel: "Sandan", fromColor: "#1E293B", toColor: "#020617", textColor: "#FFFFFF", isDark: false }
    };
    const activeTrans = transMap[curr.kyuNumber] || { label: curr.beltName, fullLabel: curr.beltName, kyuLabel: curr.kyuNumber === 0 ? 'Shodan' : (curr.kyuNumber === -1 ? 'Nidan' : (curr.kyuNumber === -2 ? 'Sandan' : curr.kyuNumber + 'º Kyu')), fromColor: '#FFFFFF', toColor: curr.beltColor, textColor: '#FFFFFF', isDark: false };

    const beltTitleText = curr.kyuNumber === 0 ? 'SHODAN (1º DAN)' : (curr.kyuNumber === -1 ? 'NIDAN (2º DAN)' : (curr.kyuNumber === -2 ? 'SANDAN (3º DAN)' : curr.kyuNumber + 'º KYU'));

    let html = `
      <div class="section-header">
        <div class="section-title-group">
          <h3><i class="fas fa-graduation-cap" style="color: var(--accent-crimson);"></i> Plano de Estudos de Graduação</h3>
          <p>Selecione a faixa ou Dan desejado para estudar o conteúdo programático completo da TKST 2026</p>
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
                  <span>Selecione a Faixa / Dan:</span>
                </div>
                <button type="button" class="belt-mobile-dropdown-close" onclick="window.TKST_APP.toggleBeltMobileMenu(event, false)" aria-label="Fechar Menu">
                  <i class="fas fa-times"></i>
                </button>
              </div>

              <div class="belt-mobile-options-list">
                ${window.TKST_CURRICULUM.map(c => {
                  const trans = transMap[c.kyuNumber] || { label: c.beltName, fullLabel: c.beltName, kyuLabel: c.kyuNumber === 0 ? 'Shodan' : (c.kyuNumber === -1 ? 'Nidan' : (c.kyuNumber === -2 ? 'Sandan' : c.kyuNumber + 'º Kyu')), fromColor: '#FFFFFF', toColor: c.beltColor, textColor: '#FFFFFF', isDark: false };
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
      <div class="dashboard-hero" style="position: relative; overflow: hidden; padding: 24px; margin-bottom: 24px; border-left: 6px solid ${curr.beltColor};">
        <!-- Subtle Transparent TKST Emblem Watermark -->
        <img src="assets/images/logo-tkst-emblem-transp.png" alt="TKST Emblem" style="position: absolute; right: -15px; bottom: -12px; height: 120%; opacity: 0.10; pointer-events: none; object-fit: contain;">

        <div style="position: relative; z-index: 1; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
          <div>
            <span class="badge" style="background: ${curr.beltColor}; color: ${curr.kyuNumber === 6 ? '#000' : '#FFF'}; margin-bottom: 8px;">
              Exame para ${curr.targetBelt}
            </span>
            <h2 style="font-family: var(--font-heading); color: #FFF; font-size: 1.5rem;">${curr.previousBelt} ➔ ${curr.beltName}</h2>
            <p style="color: #94A3B8; max-width: 700px; margin-top: 6px;">${curr.description}</p>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 1.5rem; font-weight: 800; color: var(--accent-gold);">${beltTitleText}</div>
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
                <h3>1. Kihon (Técnicas Fundamentais${curr.kyuNumber === 0 ? ' • Tabela Oficial' : (curr.kyuNumber < 0 ? ' • 3x Cada' : '')})</h3>
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

        ${curr.geri ? `
          <!-- GERI WAZA (Chutes Especiais) -->
          <div class="study-accordion-card" id="studyCard_geri">
            <button type="button" class="study-accordion-header" id="studyHeader_geri" onclick="window.TKST_APP.toggleStudyAccordion('geri')">
              <div class="study-accordion-title">
                <i class="fas fa-shoe-prints" style="color: #F5BE00; font-size: 1.25rem;"></i>
                <div>
                  <h3>2. Geri Waza (Técnicas de Chutes • 3x)</h3>
                  <div style="font-size: 0.78rem; color: #94A3B8;">${curr.geri.length} sequências dinâmicas de chutes exigidas em avaliação • Toque para abrir/fechar</div>
                </div>
              </div>
              <i class="fas fa-chevron-down study-accordion-icon" id="studyIcon_geri"></i>
            </button>

            <div class="study-accordion-body" id="studyBody_geri">
              <div class="technique-list">
                ${curr.geri.map(g => `
                  <div class="technique-item" style="border-left: 3px solid #F5BE00;">
                    <div class="technique-main" style="align-items: flex-start;">
                      <div style="width: 8px; height: 8px; border-radius: 50%; background: #F5BE00; margin-top: 6px; margin-right: 10px; flex-shrink: 0;"></div>
                      <div>
                        <div class="technique-name" style="font-weight: 700; color: #FFF; font-size: 0.95rem;">${g.name}</div>
                        <div class="technique-meta" style="margin-top: 4px; color: #94A3B8;">
                          <i class="fas fa-info-circle" style="color: var(--accent-gold); font-size: 0.75rem;"></i> ${g.detail}
                        </div>
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        ` : ''}

        ${curr.ukemi ? `
          <!-- UKEMI (Quedas e Rolamentos) -->
          <div class="study-accordion-card" id="studyCard_ukemi">
            <button type="button" class="study-accordion-header" id="studyHeader_ukemi" onclick="window.TKST_APP.toggleStudyAccordion('ukemi')">
              <div class="study-accordion-title">
                <i class="fas fa-user-ninja" style="color: #10B981; font-size: 1.25rem;"></i>
                <div>
                  <h3>${curr.geri ? '3' : '2'}. Ukemi (Quedas & Rolamentos Amortecidos • 3x)</h3>
                  <div style="font-size: 0.78rem; color: #94A3B8;">4 técnicas de amortecimento de impacto e projeção • Toque para abrir/fechar</div>
                </div>
              </div>
              <i class="fas fa-chevron-down study-accordion-icon" id="studyIcon_ukemi"></i>
            </button>

            <div class="study-accordion-body" id="studyBody_ukemi">
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 10px;">
                ${curr.ukemi.map(u => `
                  <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-left: 3px solid #10B981; border-radius: var(--radius-sm); padding: 12px 14px;">
                    <div style="font-weight: 700; color: #FFF; font-size: 0.92rem; margin-bottom: 4px;">🥋 ${u.name}</div>
                    <div style="font-size: 0.8rem; color: #94A3B8;">${u.detail}</div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        ` : ''}

        <!-- KATA EXIGIDO -->
        <div class="study-accordion-card" id="studyCard_kata">
          <button type="button" class="study-accordion-header" id="studyHeader_kata" onclick="window.TKST_APP.toggleStudyAccordion('kata')">
            <div class="study-accordion-title">
              <i class="fas fa-book-open" style="color: var(--accent-gold); font-size: 1.25rem;"></i>
              <div>
                <h3>${(curr.geri && curr.ukemi) ? '4' : ((curr.geri || curr.ukemi) ? '3' : '2')}. Kata Exigido</h3>
                <div style="font-size: 0.78rem; color: #94A3B8;">
                  ${curr.shodanProgram ? '9 Katas Oficiais (5 Heian com Bunkai + 4 Superiores)' : `${(curr.kata.required || []).join(', ')}${curr.kata.optional ? ` • +${curr.kata.optional.length} Opcionais` : ''}`} • Toque para ver detalhes
                </div>
              </div>
            </div>
            <i class="fas fa-chevron-down study-accordion-icon" id="studyIcon_kata"></i>
          </button>

          <div class="study-accordion-body" id="studyBody_kata">
            ${curr.shodanProgram ? `
              <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px;">
                ${curr.shodanProgram.kataList.map(kt => `
                  <span class="badge badge-amarela" style="font-size: 0.85rem; padding: 8px 14px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;" onclick="window.TKST_APP.openKataDetailByName('${kt.name}')">
                    🥋 <strong>${kt.name}</strong> <span style="font-size: 0.72rem; color: #F5BE00; opacity: 0.9; font-weight: 600;">(${kt.note})</span> <i class="fas fa-external-link-alt" style="font-size: 0.7rem; opacity: 0.7;"></i>
                  </span>
                `).join('')}
              </div>
            ` : `
              ${curr.kata.required && curr.kata.required.length > 0 ? `
                <div style="margin-bottom: 12px;">
                  <div style="font-size: 0.8rem; font-weight: 700; color: var(--accent-gold); text-transform: uppercase; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                    <i class="fas fa-check-circle"></i> Katas Obrigatórios:
                  </div>
                  <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    ${curr.kata.required.map(kt => `
                      <span class="badge badge-amarela" style="font-size: 0.85rem; padding: 8px 14px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;" onclick="window.TKST_APP.openKataDetailByName('${kt}')">
                        🥋 <strong>${kt}</strong> <i class="fas fa-external-link-alt" style="font-size: 0.7rem; opacity: 0.7;"></i>
                      </span>
                    `).join('')}
                  </div>
                </div>
              ` : ''}

              ${curr.kata.optional && curr.kata.optional.length > 0 ? `
                <div style="margin-bottom: 12px;">
                  <div style="font-size: 0.8rem; font-weight: 700; color: #60A5FA; text-transform: uppercase; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                    <i class="fas fa-hand-pointer"></i> Katas de Escolha / Opcionais:
                  </div>
                  <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    ${curr.kata.optional.map(kt => `
                      <span class="badge badge-azul" style="font-size: 0.85rem; padding: 8px 14px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; background: rgba(37,99,235,0.2); border: 1px solid rgba(59,130,246,0.4); color: #93C5FD;" onclick="window.TKST_APP.openKataDetailByName('${kt}')">
                        🥋 ${kt} <i class="fas fa-external-link-alt" style="font-size: 0.7rem; opacity: 0.7;"></i>
                      </span>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
            `}
            <p style="font-size: 0.9rem; color: #CBD5E1; line-height: 1.6; margin: 0;">${curr.kata.description}</p>
          </div>
        </div>

        <!-- KUMITE -->
        <div class="study-accordion-card" id="studyCard_kumite">
          <button type="button" class="study-accordion-header" id="studyHeader_kumite" onclick="window.TKST_APP.toggleStudyAccordion('kumite')">
            <div class="study-accordion-title">
              <i class="fas fa-shield-alt" style="color: var(--accent-blue); font-size: 1.25rem;"></i>
              <div>
                <h3>${(curr.geri && curr.ukemi) ? '5' : ((curr.geri || curr.ukemi) ? '4' : '3')}. Kumite (Combate)</h3>
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
      <div class="section-header" style="position: relative; overflow: hidden;">
        <!-- Subtle Vertical Kanji Watermark -->
        <img src="assets/images/logo-tkst-kanji-frente.png" alt="Kanji" style="position: absolute; right: 12px; top: 8px; height: 68px; opacity: 0.07; pointer-events: none;">

        <div class="section-title-group" style="position: relative; z-index: 1;">
          <h3><i class="fas fa-book-open" style="color: var(--accent-crimson);"></i> Enciclopédia dos 26 Kata Shotokan</h3>
          <p>Apostila oficial em PDF e vídeos técnicos integrados</p>
        </div>

        <div class="search-input-wrapper" style="position: relative; z-index: 1;">
          <i class="fas fa-search"></i>
          <input type="text" id="kataSearchInput" placeholder="Buscar kata por nome ou significado..." value="${kataSearchQuery}">
        </div>
      </div>

      <div class="katas-grid">
        ${katas.map((k, idx) => {
          const kyuText = k.graduation.includes('(') ? k.graduation.split('(')[0].trim() : k.graduation.trim();
          const badgeClass = getBeltBadgeClass(k.graduation);

          return `
            <div class="kata-card" onclick="window.TKST_APP.openKataDetail('${k.id}')" title="Toque para ver a aula e vídeos do Kata ${k.name}">
              <div>
                <div class="kata-card-top-row">
                  <span class="kata-card-order">${idx + 1}º</span>
                  <span class="kata-card-kanji">${k.kanji || ''}</span>
                </div>
                <div class="kata-card-title">${k.name}</div>
                <div class="kata-card-meaning">${k.meaning}</div>
              </div>

              <div class="kata-card-kyu-badge badge ${badgeClass}">
                ${kyuText}
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
    const videosList = normalizeKataVideos(customVideos[kata.id], kata);

    const modalTitle = document.getElementById('detailModalTitle');
    const modalBody = document.getElementById('detailModalBody');

    modalTitle.innerHTML = `<span>🥋 ${kata.name} (${kata.kanji})</span>`;

    const pdfPath = kata.pdfFileName ? `assets/pdf/kata/${encodeURIComponent(kata.pdfFileName)}` : '';
    const badgeClass = getBeltBadgeClass(kata.graduation);

    modalBody.innerHTML = `
      <!-- METADADOS COMPACTOS DO KATA -->
      <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 10px 12px; margin-bottom: 10px;">
        <div style="font-size: 0.88rem; color: #FFF; font-weight: 700; line-height: 1.3;">
          Significado: <span style="color: var(--accent-gold); font-weight: 600;">${kata.meaning}</span>
        </div>
        <div style="font-size: 0.76rem; color: #94A3B8; margin-top: 4px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
          <span>Graduação de estudo:</span>
          <span class="badge ${badgeClass}" style="font-size: 0.64rem; padding: 2px 7px; font-weight: 700;">${kata.graduation}</span>
        </div>
      </div>

      <!-- SEÇÃO DE VÍDEOS COMPACTA -->
      <div style="background: rgba(18, 23, 34, 0.95); border: 1px solid rgba(255, 183, 3, 0.25); border-radius: var(--radius-sm); padding: 10px 12px; margin-bottom: 10px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border-bottom: 1px solid rgba(255, 183, 3, 0.12); padding-bottom: 6px;">
          <div style="font-weight: 700; color: #FFF; font-size: 0.86rem; display: flex; align-items: center; gap: 6px;">
            <i class="fas fa-video" style="color: var(--accent-gold);"></i> Vídeos de Estudo (${videosList.length})
          </div>
        </div>

        ${videosList.length === 0 ? `
          <div style="text-align: center; padding: 12px 6px; color: #94A3B8; font-size: 0.8rem;">
            <i class="fas fa-video-slash" style="font-size: 1.3rem; color: #64748B; margin-bottom: 4px; display: block;"></i>
            Nenhum vídeo cadastrado no momento.
          </div>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 6px;">
            ${videosList.map((v, idx) => `
              <div onclick="window.TKST_APP.playSpecificKataVideo('${kata.id}', '${v.id}')" style="cursor: pointer; background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 183, 3, 0.2); border-left: 3.5px solid var(--accent-gold); padding: 8px 10px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center; gap: 8px; transition: all 0.15s ease;">
                <div style="min-width: 0; flex: 1;">
                  <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                    <span class="badge badge-gold" style="font-size: 0.62rem; padding: 1px 5px;">Vídeo ${idx + 1}</span>
                    <strong style="color: #FFF; font-size: 0.86rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                      ${escapeHtml(v.title)}
                    </strong>
                  </div>
                  ${v.description ? `
                    <div style="font-size: 0.75rem; color: #94A3B8; line-height: 1.25; margin-top: 2px;">
                      ${escapeHtml(v.description)}
                    </div>
                  ` : ''}
                </div>
                <button class="btn btn-sm btn-primary" style="flex-shrink: 0; font-size: 0.72rem; padding: 5px 10px; pointer-events: none;">
                  <i class="fas fa-play" style="font-size: 0.65rem;"></i> Assistir
                </button>
              </div>
            `).join('')}
          </div>
        `}
      </div>

      ${pdfPath ? `
        <!-- SEÇÃO DE APOSTILA OFICIAL COMPACTA -->
        <div style="border: 1px solid var(--border-color); border-radius: var(--radius-sm); overflow: hidden; background: #0E121A;">
          <div style="padding: 8px 12px; background: rgba(255, 255, 255, 0.03); border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px;">
            <div style="display: flex; align-items: center; gap: 6px; font-weight: 700; color: #FFF; font-size: 0.84rem;">
              <i class="fas fa-book-open" style="color: var(--accent-gold);"></i> Apostila Oficial: ${kata.name}
            </div>
            <div style="display: flex; gap: 6px;">
              <a href="${pdfPath}" target="_blank" class="btn btn-sm btn-secondary" style="font-size: 0.72rem; padding: 4px 8px; text-decoration: none;">
                <i class="fas fa-expand"></i> Tela Cheia
              </a>
              <a href="${pdfPath}" download="${kata.pdfFileName || (kata.name + '.pdf')}" class="btn btn-sm btn-primary" style="font-size: 0.72rem; padding: 4px 8px; text-decoration: none;">
                <i class="fas fa-download"></i> Baixar PDF
              </a>
            </div>
          </div>

          <!-- Native PDF.js Mobile Canvas Pages Container -->
          <div id="kataPdfPagesContainer" style="padding: 8px; display: flex; flex-direction: column; gap: 8px; align-items: center; max-height: 55vh; overflow-y: auto; -webkit-overflow-scrolling: touch; background: #0B0E14;">
            <div style="padding: 20px; text-align: center; color: var(--accent-gold);">
              <i class="fas fa-spinner fa-spin" style="font-size: 1.5rem; margin-bottom: 6px; display: block;"></i>
              <span style="font-size: 0.78rem; color: #94A3B8;">Renderizando páginas da apostila...</span>
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
        <p style="color: #94A3B8; font-size: 0.85rem; margin: 0; display: flex; align-items: center; gap: 6px;">
          <i class="fas fa-film" style="color: var(--accent-gold);"></i> Reprodução integrada oficial TKST Karatê Shotokan (No Sistema).
        </p>
        <button type="button" class="btn btn-sm btn-secondary" onclick="document.getElementById('videoModal').classList.remove('active'); const c = document.getElementById('videoModalContainer'); if(c) c.innerHTML = '';" style="font-size: 0.8rem; padding: 6px 14px; margin-left: auto;">
          <i class="fas fa-times"></i> Fechar Player
        </button>
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
          <p>Explore as modalidades oficiais do Karatê Shotokan. Toque em cada card para expandir o guia técnico completo.</p>
        </div>
      </div>

      <!-- Barra de Ações Rápidas -->
      <div class="kumite-quick-controls">
        <div style="display: flex; align-items: center; gap: 8px; font-size: 0.86rem; color: #CBD5E1;">
          <i class="fas fa-layer-group" style="color: var(--accent-gold);"></i>
          <span><strong>5 Modalidades</strong> estruturadas do básico ao avançado</span>
        </div>
        <button type="button" class="btn btn-secondary" style="font-size: 0.8rem; padding: 7px 14px;" onclick="window.TKST_APP.toggleAllKumiteAccordions()">
          <span id="toggleAllKumiteText"><i class="fas fa-expand-alt"></i> Expandir Todos</span>
        </button>
      </div>

      <!-- 1. GOHON KUMITE (5 PASSOS) -->
      <div class="kumite-accordion-card" id="kumiteCard_gohon" style="border-left: 4px solid var(--accent-gold);">
        <button type="button" class="kumite-accordion-header" id="kumiteHeader_gohon" onclick="window.TKST_APP.toggleKumiteAccordion('gohon')" aria-expanded="false">
          <div class="kumite-accordion-left">
            <div class="kumite-accordion-icon-box" style="background: rgba(245, 190, 0, 0.15); color: var(--accent-gold);">
              <i class="fas fa-project-diagram"></i>
            </div>
            <div class="kumite-accordion-title-group">
              <h3>
                1. Gohon Kumite (5 Passos)
                <span class="kumite-accordion-badge" style="background: rgba(255, 183, 3, 0.15); color: #FFD166; border: 1px solid rgba(255, 183, 3, 0.3);">五本組手</span>
              </h3>
              <p>Combate básico em cinco passos • Mae (ataque) & Sagate (defesa) • Finalização em Gyaku Tsuki com Kiai</p>
            </div>
          </div>
          <div class="kumite-accordion-right">
            <div class="kumite-accordion-chevron" id="kumiteIcon_gohon">
              <i class="fas fa-chevron-down"></i>
            </div>
          </div>
        </button>

        <div class="kumite-accordion-body" id="kumiteBody_gohon">
          <p style="color: #CBD5E1; margin-bottom: 20px; font-size: 0.92rem; line-height: 1.6;">
            ${kumite.gohonKumite ? kumite.gohonKumite.description : 'Combate fundamental de cinco passos com finalização em Gyaku Tsuki.'}
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
                <div class="gohon-step-action" style="color: #FFF;">Bloqueio Firme + Gyaku Tsuki</div>
                <span class="gohon-kiai-tag">KIAI!</span>
              </div>
            </div>
          </div>

          <!-- 3 Séries de Alvos (Jodan, Chudan, Gedan) -->
          <div class="gohon-series-grid" style="margin-top: 20px;">
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

          <!-- Princípios Fundamentais -->
          ${kumite.gohonKumite && kumite.gohonKumite.principles ? `
            <div style="margin-top: 24px; padding-top: 18px; border-top: 1px solid var(--border-color);">
              <div style="font-weight: 700; color: var(--accent-gold); font-size: 0.88rem; text-transform: uppercase; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
                <i class="fas fa-balance-scale"></i> Princípios Fundamentais do Gohon Kumite:
              </div>
              <div class="gohon-principles-grid">
                ${kumite.gohonKumite.principles.map(p => `
                  <div class="gohon-principle-item">
                    <div class="gohon-principle-title">
                      <span style="color: var(--accent-gold); font-weight: 700;">${p.name}</span>
                      <span style="font-size: 0.74rem; color: #94A3B8; font-weight: 400;">(${p.meaning})</span>
                    </div>
                    <div class="gohon-principle-desc">${p.desc}</div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- 2. SANBON KUMITE (3 PASSOS) -->
      <div class="kumite-accordion-card" id="kumiteCard_sanbon" style="border-left: 4px solid var(--accent-crimson);">
        <button type="button" class="kumite-accordion-header" id="kumiteHeader_sanbon" onclick="window.TKST_APP.toggleKumiteAccordion('sanbon')" aria-expanded="false">
          <div class="kumite-accordion-left">
            <div class="kumite-accordion-icon-box" style="background: rgba(230, 57, 70, 0.15); color: var(--accent-crimson);">
              <i class="fas fa-bolt"></i>
            </div>
            <div class="kumite-accordion-title-group">
              <h3>
                2. Sanbon Kumite (3 Passos)
                <span class="kumite-accordion-badge" style="background: rgba(230, 57, 70, 0.15); color: #FF808A; border: 1px solid rgba(230, 57, 70, 0.3);">三本組手</span>
              </h3>
              <p>Ataques consecutivos em 3 níveis (Jodan, Chudan, Gedan) • 5 Formas completas de defesa e contragolpe</p>
            </div>
          </div>
          <div class="kumite-accordion-right">
            <div class="kumite-accordion-chevron" id="kumiteIcon_sanbon">
              <i class="fas fa-chevron-down"></i>
            </div>
          </div>
        </button>

        <div class="kumite-accordion-body" id="kumiteBody_sanbon">
          <p style="color: #CBD5E1; margin-bottom: 20px; font-size: 0.92rem; line-height: 1.6;">
            ${kumite.sanbonKumite.description}
          </p>

          <div style="background: rgba(10, 13, 20, 0.6); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 16px; margin-bottom: 20px;">
            <div style="font-weight: 700; color: var(--accent-crimson); font-size: 0.85rem; text-transform: uppercase; margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
              <i class="fas fa-forward"></i> Ataques Consecutivos do Atacante (Avanço em Zenkutsu):
            </div>
            <div style="display: flex; gap: 12px; flex-wrap: wrap;">
              ${kumite.sanbonKumite.attacks.map(a => `
                <div style="background: rgba(255,255,255,0.05); padding: 10px 16px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); flex: 1; min-width: 180px;">
                  <span style="color: var(--accent-gold); font-weight: 700;">${a.step}º Passo:</span> <strong>${a.technique}</strong>
                  <div style="font-size: 0.76rem; color: #94A3B8; margin-top: 2px;">Alvo: ${a.target}</div>
                </div>
              `).join('')}
            </div>
          </div>

          <div style="font-weight: 700; color: var(--accent-gold); font-size: 0.88rem; text-transform: uppercase; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
            <i class="fas fa-shield-alt"></i> 5 Formas Tradicionais de Defesa & Contra-Ataque:
          </div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px;">
            ${kumite.sanbonKumite.defenses.map(d => `
              <div class="stat-card" style="flex-direction: column; align-items: flex-start; padding: 18px;">
                <div style="color: var(--accent-gold); font-weight: 700; font-size: 0.98rem; margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
                  <i class="fas fa-check-circle" style="color: var(--accent-emerald); font-size: 0.85rem;"></i> ${d.title}
                </div>
                <div style="font-size: 0.88rem; color: #E2E8F0; line-height: 1.5;">${d.sequence}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- 3. KIHON IPPON KUMITE (1 PASSO FUNDAMENTAL) -->
      <div class="kumite-accordion-card" id="kumiteCard_kihonIppon" style="border-left: 4px solid var(--accent-blue);">
        <button type="button" class="kumite-accordion-header" id="kumiteHeader_kihonIppon" onclick="window.TKST_APP.toggleKumiteAccordion('kihonIppon')" aria-expanded="false">
          <div class="kumite-accordion-left">
            <div class="kumite-accordion-icon-box" style="background: rgba(59, 130, 246, 0.15); color: var(--accent-blue);">
              <i class="fas fa-shield-alt"></i>
            </div>
            <div class="kumite-accordion-title-group">
              <h3>
                3. Kihon Ippon Kumite (1 Passo Fundamental)
                <span class="kumite-accordion-badge" style="background: rgba(59, 130, 246, 0.15); color: #93C5FD; border: 1px solid rgba(59, 130, 246, 0.3);">基本一本組手</span>
              </h3>
              <p>Ataques anunciados em Kamae • Esquivas em ângulo, bloqueios firmes e contragolpes decisivos</p>
            </div>
          </div>
          <div class="kumite-accordion-right">
            <div class="kumite-accordion-chevron" id="kumiteIcon_kihonIppon">
              <i class="fas fa-chevron-down"></i>
            </div>
          </div>
        </button>

        <div class="kumite-accordion-body" id="kumiteBody_kihonIppon">
          <p style="color: #CBD5E1; margin-bottom: 20px; font-size: 0.92rem; line-height: 1.6;">
            ${kumite.kihonIpponKumite.description}
          </p>

          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${kumite.kihonIpponKumite.categories.map((cat, idx) => `
              <div class="kumite-sub-accordion-card" id="subCard_kihonIppon_${idx}" data-subgroup="kihonIppon">
                <button type="button" class="kumite-sub-header" id="subHeader_kihonIppon_${idx}" onclick="window.TKST_APP.toggleKumiteSubAccordion('kihonIppon_${idx}', 'kihonIppon')" aria-expanded="false">
                  <div class="kumite-sub-title-wrap">
                    <span style="color: var(--accent-gold); font-size: 1.1rem;">🥋</span>
                    <div>
                      <strong>${cat.attackName}</strong>
                      <div style="font-size: 0.76rem; color: #94A3B8;">${cat.variations.length} Formas de Defesa & Contra-Ataque • Toque para ver</div>
                    </div>
                  </div>
                  <i class="fas fa-chevron-down kumite-sub-chevron" id="subIcon_kihonIppon_${idx}"></i>
                </button>
                <div class="kumite-sub-body" id="subBody_kihonIppon_${idx}">
                  <div style="display: flex; flex-direction: column; gap: 10px;">
                    ${cat.variations.map(v => `
                      <div style="background: rgba(255,255,255,0.03); padding: 12px 14px; border-radius: var(--radius-sm); border-left: 3px solid var(--accent-crimson); font-size: 0.88rem;">
                        <div style="color: var(--accent-gold); font-weight: 700; margin-bottom: 3px;">${v.number}ª Forma (${v.stance || 'Zenkutsu Dachi'}):</div>
                        <div>Defesa: <span style="color: #FFF; font-weight: 600;">${v.defense}</span> ➔ Contragolpe: <strong style="color: #48CAE4;">${v.counter}</strong></div>
                      </div>
                    `).join('')}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- 4. JIYU IPPON KUMITE (1 PASSO SEMI-LIVRE) -->
      <div class="kumite-accordion-card" id="kumiteCard_jiyuIppon" style="border-left: 4px solid var(--accent-emerald);">
        <button type="button" class="kumite-accordion-header" id="kumiteHeader_jiyuIppon" onclick="window.TKST_APP.toggleKumiteAccordion('jiyuIppon')" aria-expanded="false">
          <div class="kumite-accordion-left">
            <div class="kumite-accordion-icon-box" style="background: rgba(16, 185, 129, 0.15); color: var(--accent-emerald);">
              <i class="fas fa-running"></i>
            </div>
            <div class="kumite-accordion-title-group">
              <h3>
                4. Jiyu Ippon Kumite (1 Passo Semi-Livre)
                <span class="kumite-accordion-badge" style="background: rgba(16, 185, 129, 0.15); color: #6EE7B7; border: 1px solid rgba(16, 185, 129, 0.3);">自由一本組手</span>
              </h3>
              <p>Postura de combate livre (Jiyu no Kamae) • Tai Sabaki, esquivas corporais a 45°/90° e contra-ataques velozes</p>
            </div>
          </div>
          <div class="kumite-accordion-right">
            <div class="kumite-accordion-chevron" id="kumiteIcon_jiyuIppon">
              <i class="fas fa-chevron-down"></i>
            </div>
          </div>
        </button>

        <div class="kumite-accordion-body" id="kumiteBody_jiyuIppon">
          <p style="color: #CBD5E1; margin-bottom: 20px; font-size: 0.92rem; line-height: 1.6;">
            ${kumite.jiyuIpponKumite.description}
          </p>

          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${kumite.jiyuIpponKumite.categories ? kumite.jiyuIpponKumite.categories.map((cat, idx) => `
              <div class="kumite-sub-accordion-card" id="subCard_jiyuIppon_${idx}" data-subgroup="jiyuIppon">
                <button type="button" class="kumite-sub-header" id="subHeader_jiyuIppon_${idx}" onclick="window.TKST_APP.toggleKumiteSubAccordion('jiyuIppon_${idx}', 'jiyuIppon')" aria-expanded="false">
                  <div class="kumite-sub-title-wrap">
                    <span style="color: var(--accent-emerald); font-size: 1.1rem;"><i class="fas fa-running"></i></span>
                    <div>
                      <strong>${cat.attackName}</strong>
                      <div style="font-size: 0.76rem; color: #94A3B8;">${cat.description || ''} • ${cat.forms.length} Formas de Aplicação • Toque para ver</div>
                    </div>
                  </div>
                  <i class="fas fa-chevron-down kumite-sub-chevron" id="subIcon_jiyuIppon_${idx}"></i>
                </button>
                <div class="kumite-sub-body" id="subBody_jiyuIppon_${idx}">
                  <div style="display: flex; flex-direction: column; gap: 8px;">
                    ${cat.forms.map(f => `
                      <div style="font-size: 0.88rem; color: #E2E8F0; line-height: 1.5; background: rgba(255,255,255,0.03); padding: 8px 12px; border-radius: 4px; border-left: 3px solid var(--accent-emerald);">
                        <strong style="color: var(--accent-gold);">${f.number}ª Forma:</strong> ${f.technique}
                      </div>
                    `).join('')}
                  </div>
                </div>
              </div>
            `).join('') : ''}
          </div>
        </div>
      </div>

      <!-- 5. KIHON IPPON NO KATA -->
      <div class="kumite-accordion-card" id="kumiteCard_kihonIpponKata" style="border-left: 4px solid var(--accent-gold);">
        <button type="button" class="kumite-accordion-header" id="kumiteHeader_kihonIpponKata" onclick="window.TKST_APP.toggleKumiteAccordion('kihonIpponKata')" aria-expanded="false">
          <div class="kumite-accordion-left">
            <div class="kumite-accordion-icon-box" style="background: rgba(245, 158, 11, 0.15); color: #F59E0B;">
              <i class="fas fa-scroll"></i>
            </div>
            <div class="kumite-accordion-title-group">
              <h3>
                5. Kihon Ippon no Kata (Formas Tradicionais)
                <span class="kumite-accordion-badge" style="background: rgba(245, 158, 11, 0.15); color: #FCD34D; border: 1px solid rgba(245, 158, 11, 0.3);">基本一本の形</span>
              </h3>
              <p>Sequências codificadas tradicionais • Formas completas It Ban (1ª) e Ni Ban (2ª)</p>
            </div>
          </div>
          <div class="kumite-accordion-right">
            <div class="kumite-accordion-chevron" id="kumiteIcon_kihonIpponKata">
              <i class="fas fa-chevron-down"></i>
            </div>
          </div>
        </button>

        <div class="kumite-accordion-body" id="kumiteBody_kihonIpponKata">
          <p style="color: #CBD5E1; margin-bottom: 20px; font-size: 0.92rem; line-height: 1.6;">
            ${kumite.kihonIpponNoKata.description}
          </p>

          <div style="display: flex; flex-direction: column; gap: 12px;">
            <!-- It Ban (1ª Sequência) -->
            <div class="kumite-sub-accordion-card" id="subCard_kataForm_itBan" data-subgroup="kihonIpponKata">
              <button type="button" class="kumite-sub-header" id="subHeader_kataForm_itBan" onclick="window.TKST_APP.toggleKumiteSubAccordion('kataForm_itBan', 'kihonIpponKata')" aria-expanded="false">
                <div class="kumite-sub-title-wrap">
                  <span style="color: var(--accent-gold); font-size: 1.1rem;"><i class="fas fa-scroll"></i></span>
                  <div>
                    <strong>It Ban (1ª Sequência Fundamental)</strong>
                    <div style="font-size: 0.76rem; color: #94A3B8;">10 Sequências Tradicionais Codificadas • Toque para abrir/fechar</div>
                  </div>
                </div>
                <i class="fas fa-chevron-down kumite-sub-chevron" id="subIcon_kataForm_itBan"></i>
              </button>
              <div class="kumite-sub-body" id="subBody_kataForm_itBan">
                <ol style="padding-left: 20px; font-size: 0.88rem; color: #E2E8F0; line-height: 1.85; margin: 0;">
                  ${kumite.kihonIpponNoKata.itBan.map(s => `<li>${s.replace(/^\d+\.\s*/, '')}</li>`).join('')}
                </ol>
              </div>
            </div>

            <!-- Ni Ban (2ª Sequência) -->
            <div class="kumite-sub-accordion-card" id="subCard_kataForm_niBan" data-subgroup="kihonIpponKata">
              <button type="button" class="kumite-sub-header" id="subHeader_kataForm_niBan" onclick="window.TKST_APP.toggleKumiteSubAccordion('kataForm_niBan', 'kihonIpponKata')" aria-expanded="false">
                <div class="kumite-sub-title-wrap">
                  <span style="color: var(--accent-blue); font-size: 1.1rem;"><i class="fas fa-scroll"></i></span>
                  <div>
                    <strong>Ni Ban (2ª Sequência Avançada)</strong>
                    <div style="font-size: 0.76rem; color: #94A3B8;">15 Sequências Tradicionais Codificadas • Toque para abrir/fechar</div>
                  </div>
                </div>
                <i class="fas fa-chevron-down kumite-sub-chevron" id="subIcon_kataForm_niBan"></i>
              </button>
              <div class="kumite-sub-body" id="subBody_kataForm_niBan">
                <ol style="padding-left: 20px; font-size: 0.88rem; color: #E2E8F0; line-height: 1.85; margin: 0;">
                  ${kumite.kihonIpponNoKata.niBan.map(s => `<li>${s.replace(/^\d+\.\s*/, '')}</li>`).join('')}
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    mainContent.innerHTML = html;
  }

  function renderGlossary() {
    const glossary = window.TKST_AUTH ? window.TKST_AUTH.getCustomGlossary() : window.TKST_GLOSSARY;
    const isAdmin = window.TKST_AUTH ? window.TKST_AUTH.isAdmin() : false;

    const categories = [
      { id: 'all', name: 'Todos os Termos' },
      { id: 'bases', name: 'Bases (Dachi)' },
      { id: 'defesas', name: 'Defesas (Uke)' },
      { id: 'socosGolpes', name: 'Socos e Golpes (Tsuki/Uchi)' },
      { id: 'chutes', name: 'Chutes (Geri)' },
      { id: 'comandosEContagem', name: 'Comandos e Conceitos' }
    ];

    let terms = [];
    if (glossaryCategory === 'all') {
      terms = [
        ...(glossary.bases || []).map(t => ({ ...t, cat: 'Base (Dachi)', categoryKey: 'bases' })),
        ...(glossary.defesas || []).map(t => ({ ...t, cat: 'Defesa (Uke)', categoryKey: 'defesas' })),
        ...(glossary.socosGolpes || []).map(t => ({ ...t, cat: 'Soco / Golpe', categoryKey: 'socosGolpes' })),
        ...(glossary.chutes || []).map(t => ({ ...t, cat: 'Chute (Geri)', categoryKey: 'chutes' })),
        ...(glossary.comandosEContagem || []).map(t => ({ ...t, cat: 'Comando / Conceito', categoryKey: 'comandosEContagem' }))
      ];
    } else {
      const catLabels = {
        bases: 'Base (Dachi)',
        defesas: 'Defesa (Uke)',
        socosGolpes: 'Soco / Golpe',
        chutes: 'Chute (Geri)',
        comandosEContagem: 'Comando / Conceito'
      };
      terms = (glossary[glossaryCategory] || []).map(t => ({
        ...t,
        cat: catLabels[glossaryCategory] || 'Termo',
        categoryKey: glossaryCategory
      }));
    }

    if (glossarySearchQuery) {
      const q = glossarySearchQuery.toLowerCase();
      terms = terms.filter(t => t.japanese.toLowerCase().includes(q) || t.meaning.toLowerCase().includes(q) || (t.kanji && t.kanji.toLowerCase().includes(q)));
    }

    let html = `
      <div class="section-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
        <div class="section-title-group">
          <h3><i class="fas fa-language" style="color: var(--accent-crimson);"></i> Dicionário Japonês de Karatê</h3>
          <p>Terminologia técnica, comandos e conceitos do Shotokan Tradicional</p>
        </div>

        <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
          ${isAdmin ? `
            <button class="btn btn-primary" onclick="window.TKST_APP.openAddGlossaryTermModal('${glossaryCategory}')" style="font-size: 0.86rem; padding: 10px 16px; font-weight: 700; white-space: nowrap; box-shadow: 0 2px 10px rgba(255,183,3,0.25);">
              <i class="fas fa-plus-circle"></i> Novo Termo
            </button>
          ` : ''}
          <div class="search-input-wrapper" style="margin: 0;">
            <i class="fas fa-search"></i>
            <input type="text" id="glossarySearchInput" placeholder="Buscar termo em japonês ou português..." value="${glossarySearchQuery}">
          </div>
        </div>
      </div>

      <div class="filter-chips" style="margin-bottom: 24px;">
        ${categories.map(c => `
          <button class="chip-btn ${glossaryCategory === c.id ? 'active' : ''}" onclick="window.TKST_APP.selectGlossaryCategory('${c.id}')">
            ${c.name}
          </button>
        `).join('')}
      </div>

      <div class="glossary-grid">
        ${terms.length === 0 ? `
          <div style="grid-column: 1 / -1; padding: 40px 20px; text-align: center; color: #64748B;">
            <i class="fas fa-search" style="font-size: 2.2rem; margin-bottom: 10px; display: block;"></i>
            Nenhum termo encontrado para a busca selecionada.
          </div>
        ` : terms.map(t => `
          <div class="glossary-card-compact" onclick="window.TKST_APP.openGlossaryDetailModal('${t.categoryKey}', '${t.japanese.replace(/'/g, "\\'")}')" title="Toque para ver detalhes e vídeo de ${t.japanese}">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 4px; gap: 4px;">
                <span class="badge badge-amarela" style="font-size: 0.60rem; padding: 1px 5px; font-weight: 700; white-space: nowrap;">${t.cat || 'Termo'}</span>
                <div style="display: flex; align-items: center; gap: 4px;">
                  <span style="font-family: var(--font-kanji); color: rgba(255,255,255,0.45); font-size: 0.82rem; font-weight: 700; line-height: 1;">${t.kanji || ''}</span>
                  ${isAdmin ? `
                    <div style="display: flex; gap: 3px; align-items: center;" onclick="event.stopPropagation();">
                      <button class="btn btn-sm" onclick="event.stopPropagation(); window.TKST_APP.openEditGlossaryTermModal('${t.categoryKey}', '${t.japanese.replace(/'/g, "\\'")}')" title="Editar Termo (Admin)" style="padding: 2px 4px; font-size: 0.62rem; border-radius: 3px; background: rgba(255, 183, 3, 0.22); border: 1px solid var(--accent-gold); color: #FFB703; cursor: pointer;">
                        <i class="fas fa-pen"></i>
                      </button>
                      <button class="btn btn-sm" onclick="event.stopPropagation(); window.TKST_APP.deleteGlossaryTerm('${t.categoryKey}', '${t.japanese.replace(/'/g, "\\'")}')" title="Excluir Termo (Admin)" style="padding: 2px 4px; font-size: 0.62rem; border-radius: 3px; background: #DC2626; border: 1px solid #B91C1C; color: #FFF; cursor: pointer;">
                        <i class="fas fa-trash"></i>
                      </button>
                    </div>
                  ` : ''}
                </div>
              </div>

              <div style="font-family: var(--font-heading); font-size: 0.90rem; font-weight: 700; color: #FFF; line-height: 1.25; margin-bottom: 2px; word-break: break-word;">
                ${t.japanese}
              </div>

              <div style="font-size: 0.72rem; color: #94A3B8; line-height: 1.3; margin-bottom: 6px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis;">
                ${t.meaning}
              </div>
            </div>

            <div style="width: 100%; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 5px; margin-top: auto; display: flex; justify-content: space-between; align-items: center; gap: 4px;" onclick="event.stopPropagation();">
              <div style="display: flex; align-items: center; gap: 4px;">
                <button type="button" class="btn btn-sm" onclick="event.stopPropagation(); window.TKST_APP.openGlossaryVideo('${t.categoryKey}', '${t.japanese.replace(/'/g, "\\'")}')" style="font-size: 0.65rem; padding: 3px 6px; border-radius: 3px; display: inline-flex; align-items: center; gap: 3px; font-weight: 700; background: #DC2626; border: none; color: #FFF; box-shadow: 0 2px 6px rgba(220, 38, 38, 0.35); cursor: pointer;" title="Assistir vídeo">
                  <i class="fas fa-play" style="font-size: 0.58rem;"></i> <span>Vídeo</span>
                </button>

                <button type="button" class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); window.TKST_APP.speakJapanese('${t.japanese.replace(/'/g, "\\'")}')" style="font-size: 0.65rem; padding: 3px 5px; border-radius: 3px; display: inline-flex; align-items: center; color: var(--accent-gold); border-color: rgba(255,183,3,0.3); background: rgba(255,183,3,0.06);" title="Ouvir pronúncia">
                  <i class="fas fa-volume-up"></i>
                </button>
              </div>

              <div onclick="window.TKST_APP.openGlossaryDetailModal('${t.categoryKey}', '${t.japanese.replace(/'/g, "\\'")}')" style="font-size: 0.65rem; color: var(--accent-gold); font-weight: 600; display: inline-flex; align-items: center; gap: 2px; cursor: pointer;" title="Ver Detalhes">
                <span>Ver</span>
                <i class="fas fa-chevron-right" style="font-size: 0.55rem;"></i>
              </div>
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

  function startQuiz(kyuNumber, beltName) {
    if (quizTimerInterval) { clearInterval(quizTimerInterval); quizTimerInterval = null; }
    if (quizAutoAdvanceTimeout) { clearTimeout(quizAutoAdvanceTimeout); quizAutoAdvanceTimeout = null; }

    const bank = window.TKST_AUTH ? window.TKST_AUTH.getCustomQuizBank() : (window.TKST_QUIZ_BANK || window.TKST_QUIZ || []);
    let pool;
    let questionCount = 10;

    if (kyuNumber === 'all' || kyuNumber === -99) {
      // Simulado Geral: Exclui perguntas ambíguas de "próxima graduação"
      pool = bank.filter(q => {
        const qText = (q.question || '').toLowerCase();
        return !qText.includes('próxima graduação') && !qText.includes('proxima graduacao') && !qText.includes('sua próxima faixa');
      });
      questionCount = 30;
      beltName = "Simulado Geral";
    } else {
      const parsedKyu = parseInt(kyuNumber);
      pool = bank.filter(q => q.kyuNumber === parsedKyu);
      if (pool.length === 0) {
        pool = bank.filter(q => q.kyuNumber <= parsedKyu);
      }
      if (pool.length === 0) {
        pool = [...bank];
      }
      questionCount = 10;
    }

    // Ensure all questions have smart contextual options without any placeholder text
    pool = pool.map(q => ensureSmartQuestionOptions(q));

    // Shuffle pool
    const shuffled = [...pool].sort(() => 0.5 - Math.random());

    currentQuizQuestions = shuffled.slice(0, Math.min(questionCount, shuffled.length));
    currentQuizIndex = 0;
    quizScore = 0;
    quizAnswered = false;
    currentQuizKyu = kyuNumber;
    currentQuizBelt = beltName;
    quizSubmissionDetails = [];
    quizActive = true;

    renderQuiz();
  }

  function exitQuiz() {
    if (quizTimerInterval) { clearInterval(quizTimerInterval); quizTimerInterval = null; }
    if (quizAutoAdvanceTimeout) { clearTimeout(quizAutoAdvanceTimeout); quizAutoAdvanceTimeout = null; }
    quizActive = false;
    currentQuizQuestions = [];
    renderQuiz();
  }

  function renderQuiz() {
    if (quizTimerInterval) { clearInterval(quizTimerInterval); quizTimerInterval = null; }
    if (quizAutoAdvanceTimeout) { clearTimeout(quizAutoAdvanceTimeout); quizAutoAdvanceTimeout = null; }

    const user = window.TKST_AUTH.getCurrentUser();
    const isAdmin = window.TKST_AUTH.isAdmin();
    const userProgress = window.TKST_AUTH.getProgress();
    const userKyu = user ? (user.currentKyu !== undefined ? user.currentKyu : 7) : 7;

    const quizScores = (userProgress && userProgress.quizScores) || [];
    const hasPerfectInOwnBelt = quizScores.some(s => (s.score === 10 || s.percentage === 100) && (s.beltKyu === userKyu || s.beltLevel === (user ? user.currentBelt : '')));

    // 1. LEVEL SELECTOR SCREEN
    if (!quizActive) {
      const quizLevels = [
        { kyu: 7, name: "Faixa Branca 7º Kyu", color: "#FFFFFF", textColor: "#000" },
        { kyu: 6, name: "Faixa Amarela 6º Kyu", color: "#F5BE00", textColor: "#000" },
        { kyu: 5, name: "Faixa Vermelha 5º Kyu", color: "#E63946", textColor: "#FFF" },
        { kyu: 4, name: "Faixa Laranja 4º Kyu", color: "#FF7700", textColor: "#FFF" },
        { kyu: 3, name: "Faixa Verde 3º Kyu", color: "#10B981", textColor: "#FFF" },
        { kyu: 2, name: "Faixa Roxa 2º Kyu", color: "#8B5CF6", textColor: "#FFF" },
        { kyu: 1, name: "Faixa Marrom 1º Kyu", color: "#78350F", textColor: "#FFF" },
        { kyu: 0, name: "Faixa Preta Shodan (1º Dan)", color: "#18181B", textColor: "#FFF" },
        { kyu: -1, name: "Faixa Preta Nidan (2º Dan)", color: "#1E293B", textColor: "#FFF" },
        { kyu: -2, name: "Faixa Preta Sandan (3º Dan)", color: "#020617", textColor: "#FFF" }
      ];

      const isLevelUnlocked = (lvlKyu) => {
        if (isAdmin) return true;
        if (hasPerfectInOwnBelt) return true;
        if (lvlKyu >= 0 && userKyu >= 0) {
          return lvlKyu >= userKyu;
        }
        if (userKyu <= 0) {
          return lvlKyu >= userKyu;
        }
        return false;
      };

      let html = `
        <div class="section-header" style="margin-bottom: 20px;">
          <div class="section-title-group">
            <h3><i class="fas fa-brain" style="color: var(--accent-gold);"></i> Simulador de Exame Teórico de Graduação</h3>
          </div>
        </div>

        <!-- SIMULADO GERAL (30 QUESTÕES - TODAS AS GRADUAÇÕES) -->
        <div class="stat-card" style="margin-bottom: 24px; position: relative; overflow: hidden; background: linear-gradient(135deg, rgba(255, 183, 3, 0.12) 0%, rgba(18, 23, 34, 0.98) 100%); border: 2px solid var(--accent-gold); padding: 22px; flex-direction: column; align-items: stretch; gap: 14px; box-shadow: 0 4px 20px rgba(255, 183, 3, 0.15); border-radius: var(--radius-md);">
          <!-- Subtle Transparent TKST Emblem Watermark -->
          <img src="assets/images/logo-tkst-emblem-transp.png" alt="TKST Emblem" style="position: absolute; right: -12px; bottom: -8px; width: 140px; opacity: 0.085; pointer-events: none;">

          <div style="position: relative; z-index: 1; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
            <div style="display: flex; align-items: center; gap: 14px;">
              <div style="width: 52px; height: 52px; border-radius: var(--radius-sm); background: linear-gradient(135deg, rgba(255,183,3,0.25) 0%, rgba(217,119,6,0.25) 100%); display: flex; align-items: center; justify-content: center; font-size: 1.8rem; color: var(--accent-gold); border: 1.5px solid var(--accent-gold); flex-shrink: 0;">
                🏆
              </div>
              <div>
                <span class="badge badge-amarela" style="font-size: 0.72rem; margin-bottom: 4px; font-weight: 800;">
                  <i class="fas fa-unlock"></i> Aberto a Todos os Alunos
                </span>
                <h3 style="color: #FFF; font-family: var(--font-heading); font-size: 1.3rem; margin: 0; font-weight: 700;">
                  Simulado Geral
                </h3>
              </div>
            </div>
            <button class="btn btn-primary" onclick="window.TKST_APP.startQuizLevel('all', 'Simulado Geral')" style="padding: 12px 22px; font-weight: 800; font-size: 0.95rem; background: linear-gradient(135deg, #FFB703 0%, #D97706 100%); color: #000; border: none; box-shadow: 0 4px 14px rgba(245, 190, 0, 0.35); cursor: pointer;">
              <i class="fas fa-play" style="margin-right: 6px;"></i> Iniciar Simulado (30 Questões)
            </button>
          </div>
          <p style="color: #CBD5E1; font-size: 0.88rem; line-height: 1.6; margin: 0; position: relative; z-index: 1;">
            Desafio teórico completo com <strong>30 perguntas sorteadas aleatoriamente</strong> entre todas as faixas (Branca, Amarela, Vermelha, Laranja, Verde, Roxa, Marrom, Shodan, Nidan e Sandan).
          </p>
        </div>

        <div class="dashboard-hero" style="margin-bottom: 24px; padding: 20px 24px;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
            <div>
              <span class="badge badge-amarela" style="margin-bottom: 6px;">Sua Graduação Atual: ${user ? user.currentBelt : 'Faixa Branca'}</span>
              <h3 style="color: #FFF; font-family: var(--font-heading); font-size: 1.25rem; margin-bottom: 4px;">
                Desafio dos Níveis de Graduação (10 Questões por Faixa)
              </h3>
              <p style="color: #94A3B8; font-size: 0.86rem; max-width: 680px; margin: 0;">
                O simulador da sua graduação (e anteriores) está liberado. Para liberar o simulado das graduações superiores, <strong>acerte 10 de 10 perguntas (100% de acertos)</strong> no simulado da sua faixa atual!
              </p>
            </div>
            <div>
              ${hasPerfectInOwnBelt ? `
                <div style="background: rgba(16,185,129,0.15); border: 1px solid var(--accent-emerald); color: #6EE7B7; padding: 8px 14px; border-radius: var(--radius-sm); font-size: 0.82rem; font-weight: 700;">
                  <i class="fas fa-unlock"></i> 100% no seu Simulado! Níveis Avançados Liberados! 🏆
                </div>
              ` : `
                <div style="background: rgba(255,183,3,0.1); border: 1px solid rgba(255,183,3,0.3); color: var(--accent-gold); padding: 8px 14px; border-radius: var(--radius-sm); font-size: 0.82rem;">
                  <i class="fas fa-lock"></i> Acerte 10/10 no seu nível para desbloquear os superiores.
                </div>
              `}
            </div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px;">
          ${quizLevels.map(lvl => {
            const isUnlocked = isLevelUnlocked(lvl.kyu);

            return `
              <div class="stat-card" style="flex-direction: column; align-items: stretch; padding: 20px; border-top: 5px solid ${lvl.color}; border-left: 1.5px solid ${lvl.color}55; background: ${isUnlocked ? 'rgba(18, 23, 34, 0.95)' : 'rgba(18, 23, 34, 0.45)'}; opacity: ${isUnlocked ? '1' : '0.65'}; gap: 14px;">
                <!-- Linha 1: Faixa XXX Xº Kyu -->
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; width: 100%;">
                  <h4 style="color: #FFF; font-size: 1.15rem; font-family: var(--font-heading); margin: 0; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    ${lvl.name}
                  </h4>
                  <span style="width: 14px; height: 14px; border-radius: 50%; background: ${lvl.color}; border: 1.5px solid rgba(255,255,255,0.4); flex-shrink: 0;"></span>
                </div>

                <!-- Linha 2: Iniciar Simulado -->
                ${isUnlocked ? `
                  <button class="btn btn-primary" onclick="window.TKST_APP.startQuizLevel(${lvl.kyu}, '${lvl.name}')" style="width: 100%; justify-content: center; font-weight: 700; padding: 12px; font-size: 0.95rem; white-space: nowrap;">
                    <i class="fas fa-play" style="font-size: 0.85rem; margin-right: 6px;"></i> Iniciar Simulado
                  </button>
                ` : `
                  <button class="btn btn-secondary" disabled style="width: 100%; justify-content: center; opacity: 0.5; cursor: not-allowed; padding: 12px; font-size: 0.86rem; white-space: nowrap;">
                    <i class="fas fa-lock" style="margin-right: 6px;"></i> Bloqueado (Requer 10/10)
                  </button>
                `}
              </div>
            `;
          }).join('')}
        </div>
      `;
      mainContent.innerHTML = html;
      return;
    }

    // 2. DETAILED RESULTS SCREEN
    if (currentQuizIndex >= currentQuizQuestions.length) {
      const finalPercent = Math.round((quizScore / currentQuizQuestions.length) * 100);
      const isPassed = finalPercent >= 70;
      const isPerfect = quizScore === currentQuizQuestions.length;

      let resultHtml = `
        <div class="section-header" style="justify-content: center; text-align: center; margin-bottom: 20px;">
          <div class="section-title-group">
            <h3><i class="fas fa-trophy" style="color: var(--accent-gold);"></i> Resultado do Simulado • ${currentQuizBelt}</h3>
          </div>
        </div>

        <div class="quiz-card" style="text-align: center; margin-bottom: 24px;">
          <div style="font-size: 3.5rem; margin-bottom: 12px;">${isPerfect ? '🥇🏆' : (isPassed ? '🥋✨' : '📚🥋')}</div>
          <h2 style="font-family: var(--font-heading); color: #FFF; font-size: 1.8rem; margin-bottom: 8px;">
            ${isPerfect ? 'Perfeito! 100% de Acertos (Gabaritou)!' : (isPassed ? 'Parabéns! Exame Teórico Aprovado!' : 'Continue Treinando e Estudando!')}
          </h2>
          <p style="color: #94A3B8; margin-bottom: 20px; font-size: 1.05rem;">
            Você acertou <strong style="color: ${isPassed ? 'var(--accent-emerald)' : 'var(--accent-crimson)'}; font-size: 1.2rem;">${quizScore} de ${currentQuizQuestions.length} questões</strong> (${finalPercent}% de aproveitamento).
          </p>

          <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: var(--radius-md); padding: 14px 18px; margin-bottom: 20px; font-size: 0.86rem; color: #6EE7B7; display: flex; align-items: center; justify-content: center; gap: 8px;">
            <i class="fas fa-check-double"></i> Prova gravada com sucesso no sistema.
          </div>

          <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
            <button class="btn btn-primary" onclick="window.TKST_APP.startQuizLevel('${currentQuizKyu}', '${currentQuizBelt}')" style="padding: 10px 20px; font-weight: 700;">
              <i class="fas fa-redo"></i> Refazer Este Simulado (Novas Perguntas)
            </button>
            <button class="btn btn-secondary" onclick="window.TKST_APP.exitQuiz()" style="padding: 10px 20px;">
              <i class="fas fa-list"></i> Escolher Outro Nível
            </button>
          </div>
        </div>

        <!-- Detailed Breakdown of the Questions -->
        <div class="stat-card" style="flex-direction: column; align-items: stretch; padding: 24px;">
          <h4 style="color: #FFF; font-family: var(--font-heading); font-size: 1.15rem; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-list-check" style="color: var(--accent-gold);"></i> Gabarito Detalhado da sua Prova
          </h4>
          <div style="display: flex; flex-direction: column; gap: 14px;">
            ${quizSubmissionDetails.map((det, idx) => `
              <div style="background: rgba(255,255,255,0.02); border-left: 4px solid ${det.isCorrect ? 'var(--accent-emerald)' : 'var(--accent-crimson)'}; border-radius: var(--radius-sm); padding: 14px 16px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                  <strong style="color: #FFF; font-size: 0.92rem;">Questão ${idx + 1}: ${det.question}</strong>
                  <span class="badge ${det.isCorrect ? 'badge-verde' : 'badge-vermelha'}" style="font-size: 0.72rem;">
                    ${det.isCorrect ? '✓ Acertou' : '✗ Errou'}
                  </span>
                </div>
                ${det.image ? `
                  <div style="margin: 6px 0 10px 0;">
                    <img src="${det.image}" alt="Ilustração" style="max-height: 120px; max-width: 100%; object-fit: contain; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1); cursor: pointer;" onclick="window.TKST_APP.openImagePreview('${det.image}')" title="Clique para ampliar">
                  </div>
                ` : ''}
                <div style="font-size: 0.84rem; color: #CBD5E1; margin-bottom: 4px;">
                  Sua resposta: <strong style="color: ${det.isCorrect ? 'var(--accent-emerald)' : 'var(--accent-crimson)'};">${det.selectedText}</strong>
                </div>
                ${!det.isCorrect ? `
                  <div style="font-size: 0.84rem; color: #6EE7B7;">
                    Resposta correta: <strong>${det.correctText}</strong>
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      `;
      mainContent.innerHTML = resultHtml;
      return;
    }

    // 3. ACTIVE QUIZ QUESTION SCREEN
    const q = currentQuizQuestions[currentQuizIndex];

    let html = `
      <div class="section-header" style="justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
        <div class="section-title-group">
          <h3><i class="fas fa-brain" style="color: var(--accent-gold);"></i> Simulado • ${currentQuizBelt}</h3>
        </div>
        <button class="btn btn-secondary" onclick="window.TKST_APP.exitQuiz()" style="font-size: 0.78rem; padding: 6px 12px;">
          <i class="fas fa-times"></i> Cancelar / Trocar Nível
        </button>
      </div>

      <div class="quiz-card">
        <!-- Temporizador Visual de 7 Segundos por Questão -->
        <div class="quiz-timer-container">
          <div class="quiz-timer-header">
            <span><i class="fas fa-stopwatch" style="color: var(--accent-gold); margin-right: 6px;"></i> Tempo Restante:</span>
            <span id="quizTimerBadge" class="quiz-timer-badge">7s</span>
          </div>
          <div class="quiz-timer-bar-bg">
            <div id="quizTimerBar" class="quiz-timer-bar-fill" style="width: 100%;"></div>
          </div>
        </div>

        <div class="quiz-question-header">
          <span class="badge badge-amarela">${currentQuizBelt}</span>
          <span style="font-size: 0.85rem; color: #94A3B8; font-weight: 600;">Questão ${currentQuizIndex + 1} de ${currentQuizQuestions.length}</span>
        </div>

        <div class="quiz-question-text">${q.question}</div>

        ${q.image ? `
          <div style="text-align: center; margin: 14px 0 18px 0; background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 10px;">
            <img src="${q.image}" alt="Ilustração da Questão" style="max-height: 250px; max-width: 100%; object-fit: contain; border-radius: var(--radius-sm); box-shadow: 0 4px 14px rgba(0,0,0,0.4); cursor: pointer;" onclick="window.TKST_APP.openImagePreview('${q.image}')" title="Clique para ampliar imagem">
          </div>
        ` : ''}

        <div class="quiz-options-list">
          ${q.options.map((opt, idx) => `
            <button class="quiz-option-btn" id="quizOpt_${idx}" onclick="window.TKST_APP.answerQuiz(${idx})">
              <span style="width: 28px; height: 28px; border-radius: var(--radius-full); background: rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8rem; flex-shrink: 0;">
                ${['A', 'B', 'C', 'D'][idx]}
              </span>
              <span>${opt}</span>
            </button>
          `).join('')}
        </div>

        <div id="quizFeedbackArea"></div>

        <div style="display: flex; justify-content: flex-end; margin-top: 18px;">
          <button id="quizNextBtn" class="btn btn-primary" style="display: none;" onclick="window.TKST_APP.nextQuizQuestion()">
            ${currentQuizIndex + 1 === currentQuizQuestions.length ? 'Finalizar Prova <i class="fas fa-check-circle"></i>' : 'Próxima Questão <i class="fas fa-arrow-right"></i>'}
          </button>
        </div>
      </div>
    `;

    mainContent.innerHTML = html;

    // Inicia o temporizador oficial de 7 segundos da questão
    startQuizTimer();
  }

  function startQuizTimer() {
    if (quizTimerInterval) clearInterval(quizTimerInterval);
    if (quizAutoAdvanceTimeout) clearTimeout(quizAutoAdvanceTimeout);

    const timerStartTime = Date.now();
    const totalDuration = 7000; // 7 segundos

    const timerBadge = document.getElementById('quizTimerBadge');
    const timerBar = document.getElementById('quizTimerBar');

    quizTimerInterval = setInterval(() => {
      if (!quizActive || quizAnswered) {
        clearInterval(quizTimerInterval);
        return;
      }

      const elapsed = Date.now() - timerStartTime;
      const remaining = Math.max(0, totalDuration - elapsed);
      const remainingSec = Math.ceil(remaining / 1000);
      const pct = Math.max(0, (remaining / totalDuration) * 100);

      if (timerBadge) {
        timerBadge.textContent = `${remainingSec}s`;
        if (remainingSec <= 2) {
          timerBadge.className = 'quiz-timer-badge critical';
        } else if (remainingSec <= 4) {
          timerBadge.className = 'quiz-timer-badge warning';
        } else {
          timerBadge.className = 'quiz-timer-badge';
        }
      }
      if (timerBar) {
        timerBar.style.width = `${pct}%`;
      }

      if (remaining <= 0) {
        clearInterval(quizTimerInterval);
        handleQuizTimeout();
      }
    }, 100);
  }

  function handleQuizTimeout() {
    if (quizAnswered) return;
    quizAnswered = true;

    const q = currentQuizQuestions[currentQuizIndex];
    quizSubmissionDetails.push({
      question: q.question,
      image: q.image || '',
      options: q.options,
      selectedIndex: -1,
      selectedText: 'Tempo Esgotado (0s - Não respondeu)',
      correctIndex: q.correctIndex,
      correctText: q.options[q.correctIndex],
      isCorrect: false
    });

    q.options.forEach((_, idx) => {
      const btn = document.getElementById(`quizOpt_${idx}`);
      if (btn) {
        btn.disabled = true;
        if (idx === q.correctIndex) {
          btn.classList.add('correct');
        }
      }
    });

    const timerBadge = document.getElementById('quizTimerBadge');
    if (timerBadge) {
      timerBadge.textContent = '0s';
      timerBadge.className = 'quiz-timer-badge critical';
    }
    const timerBar = document.getElementById('quizTimerBar');
    if (timerBar) {
      timerBar.style.width = '0%';
    }

    const feedbackArea = document.getElementById('quizFeedbackArea');
    if (feedbackArea) {
      feedbackArea.innerHTML = `
        <div class="quiz-feedback-box" style="border-left: 4px solid var(--accent-crimson);">
          <div style="font-weight: 700; color: var(--accent-crimson); font-size: 0.95rem; display: flex; align-items: center; gap: 6px;">
            <i class="fas fa-hourglass-end"></i> Tempo Esgotado (7s) — Marcada como Incorreta!
          </div>
          <div style="color: #6EE7B7; font-size: 0.88rem; font-weight: 600; margin-top: 6px;">
            Resposta correta: ${q.options[q.correctIndex]}
          </div>
          <div style="color: #94A3B8; font-size: 0.78rem; margin-top: 6px;">
            <i class="fas fa-forward"></i> Avançando automaticamente para a próxima questão...
          </div>
        </div>
      `;
    }

    const nextBtn = document.getElementById('quizNextBtn');
    if (nextBtn) nextBtn.style.display = 'inline-flex';

    if (quizAutoAdvanceTimeout) clearTimeout(quizAutoAdvanceTimeout);
    quizAutoAdvanceTimeout = setTimeout(() => {
      if (quizActive) {
        nextQuizQuestion();
      }
    }, 2000);
  }

  function answerQuiz(optionIndex) {
    if (quizAnswered) return;
    quizAnswered = true;

    if (quizTimerInterval) { clearInterval(quizTimerInterval); quizTimerInterval = null; }
    if (quizAutoAdvanceTimeout) { clearTimeout(quizAutoAdvanceTimeout); quizAutoAdvanceTimeout = null; }

    const q = currentQuizQuestions[currentQuizIndex];
    const isCorrect = optionIndex === q.correctIndex;
    if (isCorrect) quizScore++;

    quizSubmissionDetails.push({
      question: q.question,
      image: q.image || '',
      options: q.options,
      selectedIndex: optionIndex,
      selectedText: q.options[optionIndex],
      correctIndex: q.correctIndex,
      correctText: q.options[q.correctIndex],
      isCorrect
    });

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
          <div style="font-weight: 700; color: ${isCorrect ? 'var(--accent-emerald)' : 'var(--accent-crimson)'}; font-size: 0.95rem;">
            ${isCorrect ? '✓ Resposta Correta!' : '✗ Resposta Incorreta'}
          </div>
          ${!isCorrect ? `
            <div style="color: #6EE7B7; font-size: 0.88rem; font-weight: 600; margin-top: 4px;">
              Resposta correta: ${q.options[q.correctIndex]}
            </div>
          ` : ''}
        </div>
      `;
    }

    const nextBtn = document.getElementById('quizNextBtn');
    if (nextBtn) nextBtn.style.display = 'inline-flex';
  }

  function nextQuizQuestion() {
    if (quizTimerInterval) { clearInterval(quizTimerInterval); quizTimerInterval = null; }
    if (quizAutoAdvanceTimeout) { clearTimeout(quizAutoAdvanceTimeout); quizAutoAdvanceTimeout = null; }

    quizAnswered = false;
    currentQuizIndex++;
    if (currentQuizIndex >= currentQuizQuestions.length) {
      window.TKST_AUTH.saveQuizSubmission({
        beltLevel: currentQuizBelt,
        beltKyu: currentQuizKyu,
        score: quizScore,
        total: currentQuizQuestions.length,
        details: quizSubmissionDetails
      });
    }
    renderQuiz();
  }

  function restartQuiz() {
    startQuiz(currentQuizKyu || 7, currentQuizBelt || 'Faixa Branca');
  }

  function renderPhilosophy() {
    const dojoKun = (window.TKST_GLOSSARY && window.TKST_GLOSSARY.dojoKun) ? window.TKST_GLOSSARY.dojoKun : [];
    const nijuKun = (window.TKST_GLOSSARY && window.TKST_GLOSSARY.nijuKun) ? window.TKST_GLOSSARY.nijuKun : [];

    let html = `
      <div class="section-header">
        <div class="section-title-group">
          <h3><i class="fas fa-scroll" style="color: var(--accent-gold);"></i> Filosofia do Dojo: Dojo Kun & Niju Kun</h3>
          <p>Princípios e preceitos fundamentais da tradição Shotokan Karatê-Dō</p>
        </div>
      </div>

      <div class="dashboard-hero" style="margin-bottom: 24px; position: relative; overflow: hidden;">
        <!-- Subtle Transparent TKST Emblem Watermark -->
        <img src="assets/images/logo-tkst-emblem-transp.png" alt="TKST Emblem" style="position: absolute; right: -10px; bottom: -10px; height: 115%; opacity: 0.12; pointer-events: none; object-fit: contain;">

        <div class="hero-content" style="position: relative; z-index: 1;">
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
            <div style="margin-bottom: 8px;">
              <span class="badge badge-gold" style="font-size: 0.75rem; padding: 3px 10px; font-weight: 700;">一つ Hitotsu</span>
            </div>
            <div class="dojokun-jp">${d.title}</div>
            <div class="dojokun-pt">${d.translation}</div>
            <div class="dojokun-desc">${d.description}</div>
          </div>
        `).join('')}
      </div>

      <!-- NIJU KUN (20 PRECEITOS DE GICHIN FUNAKOSHI) -->
      <div class="dashboard-hero" style="margin: 36px 0 20px 0; position: relative; overflow: hidden;">
        <!-- Subtle Transparent TKST Emblem Watermark -->
        <img src="assets/images/logo-tkst-emblem-transp.png" alt="TKST Emblem" style="position: absolute; right: -10px; bottom: -10px; height: 115%; opacity: 0.12; pointer-events: none; object-fit: contain;">

        <div class="hero-content" style="position: relative; z-index: 1;">
          <div>
            <h2 style="font-family: var(--font-heading); color: #FFF; font-size: 1.5rem; margin-bottom: 8px;">二十訓 (Niju Kun)</h2>
            <p style="color: #94A3B8;">
              Os <strong>20 Preceitos Fundamentais</strong> transmitidos pelo Grande Mestre <strong>Gichin Funakoshi</strong> (Pai do Karatê Moderno), que ensinam que o Karatê vai muito além da luta física: é um caminho de autodomínio, retidão e disciplina para toda a vida.
            </p>
          </div>
        </div>
      </div>

      <div class="dojokun-grid">
        ${nijuKun.map(n => `
          <div class="dojokun-card">
            <div style="margin-bottom: 8px;">
              <span class="badge badge-gold" style="font-size: 0.75rem; padding: 3px 10px; font-weight: 700;">${n.number}º Princípio</span>
            </div>
            <div class="dojokun-jp">${n.title}</div>
            <div class="dojokun-pt">${n.translation}</div>
            <div class="dojokun-desc">${n.description}</div>
          </div>
        `).join('')}
      </div>

      <div style="margin-top: 40px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 24px; text-align: center;">
        <h4 style="font-family: var(--font-heading); color: #FFF; font-size: 1.15rem; margin-bottom: 16px;">
          Comissão Técnica & Mestres TKST
        </h4>
        <div style="display: flex; justify-content: center; align-items: center; gap: 36px; flex-wrap: wrap;">
          <div>
            <img src="assets/images/logo-tkst-projeto-transp.png" alt="TKST Logo" style="max-height: 65px; opacity: 0.95; filter: drop-shadow(0 2px 8px rgba(255,183,3,0.3));">
            <div style="color: #FFF; font-weight: 700; margin-top: 6px;">TKST Shotokan</div>
            <div style="font-size: 0.78rem; color: var(--accent-gold);">Tradição & Graduações</div>
          </div>
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
    openAdminPanel,
    openAdmin: (subTab) => openAdminPanel(subTab),
    openUserAccountOrAdmin,
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
    toggleDojoKunAccordion: () => {
      const body = document.getElementById('dojokunAccordionBody');
      const icon = document.getElementById('dojokunChevronIcon');
      const badge = document.getElementById('dojokunToggleBadge');
      if (!body) return;

      const isHidden = body.style.display === 'none' || body.hidden;
      if (isHidden) {
        body.hidden = false;
        body.style.display = 'block';
        if (icon) icon.style.transform = 'rotate(180deg)';
        if (badge) badge.innerHTML = '<i class="fas fa-chevron-up" id="dojokunChevronIcon" style="transition: transform 0.3s ease; margin-right: 4px;"></i> Recolher';
      } else {
        body.hidden = true;
        body.style.display = 'none';
        if (icon) icon.style.transform = 'rotate(0deg)';
        if (badge) badge.innerHTML = '<i class="fas fa-chevron-down" id="dojokunChevronIcon" style="transition: transform 0.3s ease; margin-right: 4px;"></i> Toque para Ver';
      }
    },
    toggleNijuKunAccordion: () => {
      const body = document.getElementById('nijukunAccordionBody');
      const icon = document.getElementById('nijukunChevronIcon');
      const badge = document.getElementById('nijukunToggleBadge');
      if (!body) return;

      const isHidden = body.style.display === 'none' || body.hidden;
      if (isHidden) {
        body.hidden = false;
        body.style.display = 'block';
        if (icon) icon.style.transform = 'rotate(180deg)';
        if (badge) badge.innerHTML = '<i class="fas fa-chevron-up" id="nijukunChevronIcon" style="transition: transform 0.3s ease; margin-right: 4px;"></i> Recolher';
      } else {
        body.hidden = true;
        body.style.display = 'none';
        if (icon) icon.style.transform = 'rotate(0deg)';
        if (badge) badge.innerHTML = '<i class="fas fa-chevron-down" id="nijukunChevronIcon" style="transition: transform 0.3s ease; margin-right: 4px;"></i> Toque para Ver';
      }
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
        // Exclusivo: fecha as outras seções do plano de estudos para focar na clicada
        const sections = ['kihon', 'kata', 'kumite'];
        sections.forEach(s => {
          if (s !== sectionId) {
            const b = document.getElementById(`studyBody_${s}`);
            const h = document.getElementById(`studyHeader_${s}`);
            const i = document.getElementById(`studyIcon_${s}`);
            if (b) b.classList.remove('active');
            if (h) h.classList.remove('active');
            if (i) i.style.transform = 'rotate(0deg)';
          }
        });

        body.classList.add('active');
        header?.classList.add('active');
        if (icon) icon.style.transform = 'rotate(180deg)';
      }
    },
    toggleKumiteAccordion: (sectionId) => {
      const card = document.getElementById(`kumiteCard_${sectionId}`);
      const body = document.getElementById(`kumiteBody_${sectionId}`);
      const header = document.getElementById(`kumiteHeader_${sectionId}`);
      const icon = document.getElementById(`kumiteIcon_${sectionId}`);
      if (!card || !body) return;

      const isOpen = card.classList.contains('active') || body.classList.contains('active');
      if (isOpen) {
        card.classList.remove('active');
        body.classList.remove('active');
        header?.classList.remove('active');
        header?.setAttribute('aria-expanded', 'false');
        if (icon) icon.style.transform = 'rotate(0deg)';
      } else {
        // Exclusivo: fecha as outras modalidades de kumite para abrir apenas a clicada
        const sections = ['gohon', 'sanbon', 'kihonIppon', 'jiyuIppon', 'kihonIpponKata'];
        sections.forEach(s => {
          if (s !== sectionId) {
            const c = document.getElementById(`kumiteCard_${s}`);
            const b = document.getElementById(`kumiteBody_${s}`);
            const h = document.getElementById(`kumiteHeader_${s}`);
            const i = document.getElementById(`kumiteIcon_${s}`);
            if (c) c.classList.remove('active');
            if (b) b.classList.remove('active');
            if (h) {
              h.classList.remove('active');
              h.setAttribute('aria-expanded', 'false');
            }
            if (i) i.style.transform = 'rotate(0deg)';
          }
        });

        card.classList.add('active');
        body.classList.add('active');
        header?.classList.add('active');
        header?.setAttribute('aria-expanded', 'true');
        if (icon) icon.style.transform = 'rotate(180deg)';
      }
    },
    toggleKumiteSubAccordion: (subId, groupKey) => {
      const card = document.getElementById(`subCard_${subId}`);
      const body = document.getElementById(`subBody_${subId}`);
      const header = document.getElementById(`subHeader_${subId}`);
      const icon = document.getElementById(`subIcon_${subId}`);
      if (!card || !body) return;

      const isOpen = card.classList.contains('active') || body.classList.contains('active');
      if (isOpen) {
        card.classList.remove('active');
        body.classList.remove('active');
        header?.classList.remove('active');
        header?.setAttribute('aria-expanded', 'false');
        if (icon) icon.style.transform = 'rotate(0deg)';
      } else {
        // Fecha outros sub-cards do mesmo grupo para manter foco no selecionado
        if (groupKey) {
          const groupCards = document.querySelectorAll(`[data-subgroup="${groupKey}"]`);
          groupCards.forEach(c => {
            if (c.id !== `subCard_${subId}`) {
              c.classList.remove('active');
              const b = c.querySelector('.kumite-sub-body');
              const h = c.querySelector('.kumite-sub-header');
              const i = c.querySelector('.kumite-sub-chevron');
              if (b) b.classList.remove('active');
              if (h) {
                h.classList.remove('active');
                h.setAttribute('aria-expanded', 'false');
              }
              if (i) i.style.transform = 'rotate(0deg)';
            }
          });
        }

        card.classList.add('active');
        body.classList.add('active');
        header?.classList.add('active');
        header?.setAttribute('aria-expanded', 'true');
        if (icon) icon.style.transform = 'rotate(180deg)';
      }
    },
    toggleAllKumiteAccordions: () => {
      const sections = ['gohon', 'sanbon', 'kihonIppon', 'jiyuIppon', 'kihonIpponKata'];
      const cards = sections.map(s => document.getElementById(`kumiteCard_${s}`)).filter(Boolean);
      const anyOpen = cards.some(c => c.classList.contains('active'));
      const shouldOpen = !anyOpen;

      sections.forEach(s => {
        const card = document.getElementById(`kumiteCard_${s}`);
        const body = document.getElementById(`kumiteBody_${s}`);
        const header = document.getElementById(`kumiteHeader_${s}`);
        const icon = document.getElementById(`kumiteIcon_${s}`);
        if (!card || !body) return;

        if (shouldOpen) {
          card.classList.add('active');
          body.classList.add('active');
          header?.classList.add('active');
          header?.setAttribute('aria-expanded', 'true');
          if (icon) icon.style.transform = 'rotate(180deg)';
        } else {
          card.classList.remove('active');
          body.classList.remove('active');
          header?.classList.remove('active');
          header?.setAttribute('aria-expanded', 'false');
          if (icon) icon.style.transform = 'rotate(0deg)';
        }
      });

      const btnText = document.getElementById('toggleAllKumiteText');
      if (btnText) {
        btnText.innerHTML = shouldOpen ? '<i class="fas fa-compress-alt"></i> Recolher Todos' : '<i class="fas fa-expand-alt"></i> Expandir Todos';
      }
    },
    toggleShodanCol: (colKey) => {
      const card = document.getElementById(`shodanCard_${colKey}`);
      const body = document.getElementById(`shodanBody_${colKey}`);
      const icon = document.getElementById(`shodanIcon_${colKey}`);
      const header = document.getElementById(`shodanHeader_${colKey}`);
      if (!card || !body) return;

      const isOpen = card.classList.contains('active') || body.classList.contains('active');
      if (isOpen) {
        card.classList.remove('active');
        body.classList.remove('active');
        header?.setAttribute('aria-expanded', 'false');
        if (icon) icon.style.transform = 'rotate(0deg)';
      } else {
        // Exclusivo: fecha as outras colunas de Shodan para abrir apenas a clicada
        const keys = ['teWaza', 'ukeWaza', 'ashiWaza', 'dachiWaza'];
        keys.forEach(k => {
          if (k !== colKey) {
            const c = document.getElementById(`shodanCard_${k}`);
            const b = document.getElementById(`shodanBody_${k}`);
            const i = document.getElementById(`shodanIcon_${k}`);
            const h = document.getElementById(`shodanHeader_${k}`);
            if (c) c.classList.remove('active');
            if (b) b.classList.remove('active');
            if (h) h.setAttribute('aria-expanded', 'false');
            if (i) i.style.transform = 'rotate(0deg)';
          }
        });

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
    startQuizLevel: (kyu, beltName) => startQuiz(kyu, beltName),
    exitQuiz,
    setAdminQuizSelectedKyu: (kyu) => {
      adminQuizSelectedKyu = parseInt(kyu);
      renderAdminMaster();
    },

    openEditQuizQuestionModal: (qId) => {
      const bank = window.TKST_AUTH ? window.TKST_AUTH.getCustomQuizBank() : (window.TKST_QUIZ_BANK || []);
      const q = bank.find(item => item.id === qId);
      if (!q) {
        alert('Questão não encontrada.');
        return;
      }

      quizModalTempImage = q.image || '';

      const modalTitle = document.getElementById('detailModalTitle');
      const modalBody = document.getElementById('detailModalBody');
      const currentCorrectText = (q.options && q.options[q.correctIndex]) || (q.options && q.options[0]) || '';

      modalTitle.innerHTML = `<div style="display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 8px;"><span><i class="fas fa-edit" style="color: var(--accent-gold);"></i> Editar Questão (${q.beltName || 'Faixa'})</span><span class="badge badge-gold" style="font-size: 0.7rem; font-weight: 600; white-space: nowrap;"><i class="fas fa-lock"></i> Edição Protegida</span></div>`;

      modalBody.innerHTML = `
        <form onsubmit="event.preventDefault(); window.TKST_APP.submitEditQuizQuestion('${q.id}');" style="display: flex; flex-direction: column; gap: 14px;">
          <div style="background: rgba(255,183,3,0.08); border: 1px solid rgba(255,183,3,0.3); border-radius: var(--radius-sm); padding: 10px 14px; font-size: 0.82rem; color: #E2E8F0;">
            <i class="fas fa-shield-alt" style="color: var(--accent-gold); margin-right: 6px;"></i> <strong>Modo Seguro:</strong> Esta tela não fecha por toques acidentais fora da área. Digite as informações e clique em <strong>Salvar</strong>.
          </div>

          <div class="form-group">
            <label class="form-label" style="font-size: 0.82rem; margin-bottom: 4px;">
              <i class="fas fa-question-circle" style="color: var(--accent-gold); margin-right: 6px;"></i> Pergunta / Enunciado:
            </label>
            <textarea id="editQuizQuestionInput" class="form-input" rows="3" required style="resize: vertical; font-size: 0.9rem;">${q.question}</textarea>
          </div>

          <div class="form-group">
            <label class="form-label" style="font-size: 0.82rem; margin-bottom: 4px;">
              <i class="fas fa-image" style="color: var(--accent-gold); margin-right: 6px;"></i> Imagem Ilustrativa (Opcional):
            </label>
            
            <div id="quizModalImagePreviewBox" style="${quizModalTempImage ? 'display: block;' : 'display: none;'} margin-bottom: 10px; background: rgba(0,0,0,0.35); border: 1px dashed var(--border-color); border-radius: var(--radius-sm); padding: 10px; text-align: center;">
              <img id="quizModalImagePreview" src="${quizModalTempImage}" style="max-height: 150px; max-width: 100%; object-fit: contain; border-radius: 4px; margin-bottom: 8px;">
              <div>
                <button type="button" class="btn btn-sm btn-danger" onclick="window.TKST_APP.removeQuizModalImage()" style="font-size: 0.75rem; padding: 4px 10px;">
                  <i class="fas fa-trash"></i> Remover Imagem
                </button>
              </div>
            </div>

            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <label class="btn btn-secondary" style="font-size: 0.8rem; padding: 8px 12px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                <i class="fas fa-camera"></i> Escolher ou Tirar Foto
                <input type="file" accept="image/*" id="quizModalFileInput" style="display: none;" onchange="window.TKST_APP.handleQuizModalImageUpload(this)">
              </label>
              <input type="url" id="quizModalUrlInput" class="form-input" placeholder="Ou cole o link da imagem (https://...)" value="${(quizModalTempImage && !quizModalTempImage.startsWith('data:')) ? quizModalTempImage : ''}" oninput="window.TKST_APP.handleQuizModalImageUrl(this.value)" style="flex: 1; min-width: 180px; font-size: 0.82rem;">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" style="font-size: 0.82rem; margin-bottom: 4px;">
              <i class="fas fa-check-circle" style="color: var(--accent-emerald); margin-right: 6px;"></i> Resposta Correta (Gabarito Oficial):
            </label>
            <input type="text" id="editQuizCorrectAnswerInput" class="form-input" value="${currentCorrectText.replace(/"/g, '&quot;')}" required style="font-size: 0.9rem; font-weight: 600; color: #6EE7B7;">
          </div>

          <div style="display: flex; gap: 10px; margin-top: 8px;">
            <button type="button" class="btn btn-secondary" onclick="window.TKST_APP.cancelModalEdit()" style="flex: 1; padding: 12px;">
              Cancelar
            </button>
            <button type="submit" class="btn btn-primary" style="flex: 2; padding: 12px; font-weight: 700;">
              <i class="fas fa-save"></i> Salvar e Sincronizar
            </button>
          </div>
        </form>
      `;

      detailModal.setAttribute('data-prevent-outside-close', 'true');
      detailModal.classList.add('active');
    },

    submitEditQuizQuestion: (qId) => {
      const bank = window.TKST_AUTH ? window.TKST_AUTH.getCustomQuizBank() : (window.TKST_QUIZ_BANK || []);
      const q = bank.find(item => item.id === qId);
      if (!q) return;

      const questionText = document.getElementById('editQuizQuestionInput').value.trim();
      const correctAnswer = document.getElementById('editQuizCorrectAnswerInput').value.trim();

      if (!questionText || !correctAnswer) {
        alert('Por favor, preencha a pergunta e a resposta correta.');
        return;
      }

      q.question = questionText;
      q.image = quizModalTempImage || '';
      const smart = generateSmartOptions(questionText, correctAnswer);
      q.options = smart.options;
      q.correctIndex = smart.correctIndex;
      delete q.explanation;
      q._edited = true;           // marca que esta questão foi editada pelo Sensei
      q.updatedAt = Date.now();   // timestamp da edição para rastreamento

      // saveCustomQuizBank salva no localStorage, envia ao /api/quiz-bank E commita
      // o banco completo no GitHub (incluindo questões com IDs originais como q7-1)
      window.TKST_AUTH.saveCustomQuizBank(bank);
      detailModal.removeAttribute('data-prevent-outside-close');
      detailModal.classList.remove('active');
      showToast('✅ Questão atualizada! Sincronizando com a nuvem...', 'sync');
      renderAdminMaster();
    },

    openAddQuizQuestionModal: (kyu) => {
      quizModalTempImage = '';
      const modalTitle = document.getElementById('detailModalTitle');
      const modalBody = document.getElementById('detailModalBody');
      const beltName = getBeltNameFromKyu(kyu);

      modalTitle.innerHTML = `<div style="display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 8px;"><span><i class="fas fa-plus-circle" style="color: var(--accent-gold);"></i> Nova Questão (${beltName})</span><span class="badge badge-gold" style="font-size: 0.7rem; font-weight: 600; white-space: nowrap;"><i class="fas fa-lock"></i> Edição Protegida</span></div>`;

      modalBody.innerHTML = `
        <form onsubmit="event.preventDefault(); window.TKST_APP.submitAddQuizQuestion(${kyu});" style="display: flex; flex-direction: column; gap: 14px;">
          <div style="background: rgba(255,183,3,0.08); border: 1px solid rgba(255,183,3,0.3); border-radius: var(--radius-sm); padding: 10px 14px; font-size: 0.82rem; color: #E2E8F0;">
            <i class="fas fa-shield-alt" style="color: var(--accent-gold); margin-right: 6px;"></i> <strong>Modo Seguro:</strong> Esta tela não fecha por toques acidentais fora da área. Digite as informações e clique em <strong>Cadastrar</strong>.
          </div>

          <div class="form-group">
            <label class="form-label" style="font-size: 0.82rem; margin-bottom: 4px;">
              <i class="fas fa-question-circle" style="color: var(--accent-gold); margin-right: 6px;"></i> Pergunta / Enunciado:
            </label>
            <textarea id="newQuizQuestionInput" class="form-input" rows="3" required placeholder="ex: Qual o nome do soco mostrado na ilustração?" style="resize: vertical; font-size: 0.9rem;"></textarea>
          </div>

          <div class="form-group">
            <label class="form-label" style="font-size: 0.82rem; margin-bottom: 4px;">
              <i class="fas fa-image" style="color: var(--accent-gold); margin-right: 6px;"></i> Imagem Ilustrativa (Opcional):
            </label>
            
            <div id="quizModalImagePreviewBox" style="display: none; margin-bottom: 10px; background: rgba(0,0,0,0.35); border: 1px dashed var(--border-color); border-radius: var(--radius-sm); padding: 10px; text-align: center;">
              <img id="quizModalImagePreview" src="" style="max-height: 150px; max-width: 100%; object-fit: contain; border-radius: 4px; margin-bottom: 8px;">
              <div>
                <button type="button" class="btn btn-sm btn-danger" onclick="window.TKST_APP.removeQuizModalImage()" style="font-size: 0.75rem; padding: 4px 10px;">
                  <i class="fas fa-trash"></i> Remover Imagem
                </button>
              </div>
            </div>

            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <label class="btn btn-secondary" style="font-size: 0.8rem; padding: 8px 12px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                <i class="fas fa-camera"></i> Escolher ou Tirar Foto
                <input type="file" accept="image/*" id="quizModalFileInput" style="display: none;" onchange="window.TKST_APP.handleQuizModalImageUpload(this)">
              </label>
              <input type="url" id="quizModalUrlInput" class="form-input" placeholder="Ou cole o link da imagem (https://...)" oninput="window.TKST_APP.handleQuizModalImageUrl(this.value)" style="flex: 1; min-width: 180px; font-size: 0.82rem;">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" style="font-size: 0.82rem; margin-bottom: 4px;">
              <i class="fas fa-check-circle" style="color: var(--accent-emerald); margin-right: 6px;"></i> Resposta Correta (Gabarito Oficial):
            </label>
            <input type="text" id="newQuizCorrectAnswerInput" class="form-input" required placeholder="Digite a resposta correta oficial..." style="font-size: 0.9rem; font-weight: 600; color: #6EE7B7;">
          </div>

          <div style="display: flex; gap: 10px; margin-top: 8px;">
            <button type="button" class="btn btn-secondary" onclick="window.TKST_APP.cancelModalEdit()" style="flex: 1; padding: 12px;">
              Cancelar
            </button>
            <button type="submit" class="btn btn-primary" style="flex: 2; padding: 12px; font-weight: 700;">
              <i class="fas fa-plus-circle"></i> Cadastrar Questão
            </button>
          </div>
        </form>
      `;

      detailModal.setAttribute('data-prevent-outside-close', 'true');
      detailModal.classList.add('active');
    },

    submitAddQuizQuestion: (kyu) => {
      const bank = window.TKST_AUTH ? window.TKST_AUTH.getCustomQuizBank() : (window.TKST_QUIZ_BANK || []);
      const questionText = document.getElementById('newQuizQuestionInput').value.trim();
      const correctAnswer = document.getElementById('newQuizCorrectAnswerInput').value.trim();

      if (!questionText || !correctAnswer) {
        alert('Por favor, preencha a pergunta e a resposta correta.');
        return;
      }

      const beltName = getBeltNameFromKyu(kyu);
      const smart = generateSmartOptions(questionText, correctAnswer);
      const newQuestion = {
        id: `q_custom_${kyu}_${Date.now()}`,
        kyuNumber: kyu,
        beltName: beltName,
        question: questionText,
        image: quizModalTempImage || '',
        options: smart.options,
        correctIndex: smart.correctIndex
      };

      bank.push(newQuestion);
      window.TKST_AUTH.saveCustomQuizBank(bank);
      detailModal.classList.remove('active');
      showToast('✅ Nova questão cadastrada! Sincronizando com a nuvem...', 'sync');
      renderAdminMaster();
    },

    handleQuizModalImageUpload: (input) => {
      if (input.files && input.files[0]) {
        compressQuizImage(input.files[0], (dataUrl) => {
          quizModalTempImage = dataUrl;
          const previewBox = document.getElementById('quizModalImagePreviewBox');
          const previewImg = document.getElementById('quizModalImagePreview');
          if (previewBox && previewImg) {
            previewImg.src = dataUrl;
            previewBox.style.display = 'block';
          }
        });
      }
    },

    handleQuizModalImageUrl: (url) => {
      const trimmed = url.trim();
      quizModalTempImage = trimmed;
      const previewBox = document.getElementById('quizModalImagePreviewBox');
      const previewImg = document.getElementById('quizModalImagePreview');
      if (previewBox && previewImg) {
        if (trimmed) {
          previewImg.src = trimmed;
          previewBox.style.display = 'block';
        } else {
          previewBox.style.display = 'none';
        }
      }
    },

    removeQuizModalImage: () => {
      quizModalTempImage = '';
      const previewBox = document.getElementById('quizModalImagePreviewBox');
      const previewImg = document.getElementById('quizModalImagePreview');
      const fileInput = document.getElementById('quizModalFileInput');
      const urlInput = document.getElementById('quizModalUrlInput');
      if (previewBox) previewBox.style.display = 'none';
      if (previewImg) previewImg.src = '';
      if (fileInput) fileInput.value = '';
      if (urlInput) urlInput.value = '';
    },

    openImagePreview: (imgSrc) => {
      if (!imgSrc) return;
      const modalTitle = document.getElementById('detailModalTitle');
      const modalBody = document.getElementById('detailModalBody');
      modalTitle.innerHTML = `<span><i class="fas fa-image" style="color: var(--accent-gold);"></i> Visualização da Imagem</span>`;
      modalBody.innerHTML = `
        <div style="text-align: center; padding: 10px;">
          <img src="${imgSrc}" alt="Imagem Ampliada" style="max-width: 100%; max-height: 75vh; object-fit: contain; border-radius: var(--radius-md); box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
        </div>
      `;
      detailModal.classList.add('active');
    },

    deleteQuizQuestion: (qId) => {
      if (confirm('Deseja realmente excluir esta questão do simulado?')) {
        if (window.TKST_AUTH && window.TKST_AUTH.deleteQuizQuestion) {
          window.TKST_AUTH.deleteQuizQuestion(qId);
        } else {
          let bank = window.TKST_QUIZ_BANK || [];
          bank = bank.filter(item => item.id !== qId);
          window.TKST_AUTH.saveCustomQuizBank(bank);
        }
        renderAdminMaster();
      }
    },

    openQuizDetailModal: (submissionId) => {
      const submissions = window.TKST_AUTH.getAllQuizSubmissions();
      const sub = submissions.find(s => s.id === submissionId);
      if (!sub) {
        alert('Prova não encontrada.');
        return;
      }

      const modalTitle = document.getElementById('detailModalTitle');
      const modalBody = document.getElementById('detailModalBody');
      const dateStr = sub.date ? new Date(sub.date).toLocaleString('pt-BR') : '-';

      modalTitle.innerHTML = `<span><i class="fas fa-file-alt" style="color: var(--accent-gold);"></i> Prova de ${sub.studentName} (@${sub.studentUsername})</span>`;

      modalBody.innerHTML = `
        <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 18px; margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
            <div>
              <div style="font-size: 1.15rem; color: #FFF; font-weight: 700;">${sub.studentName} (@${sub.studentUsername})</div>
              <div style="font-size: 0.85rem; color: #94A3B8; margin-top: 2px;">
                Graduação: <span class="badge ${getBeltBadgeClass(sub.studentBelt)}" style="font-size: 0.72rem;">${sub.studentBelt}</span> • Data: ${dateStr}
              </div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 1.4rem; font-weight: 800; color: ${sub.passed ? 'var(--accent-emerald)' : 'var(--accent-crimson)'};">
                ${sub.score} de ${sub.total} Acertos (${sub.percentage}%)
              </div>
              <div style="font-size: 0.8rem; color: #94A3B8;">
                Nível: <strong>${sub.beltLevel}</strong> • ${sub.passed ? 'Status: Aprovado' : 'Status: Reprovado'}
              </div>
            </div>
          </div>
        </div>

        <h4 style="color: #FFF; font-family: var(--font-heading); font-size: 1.05rem; margin-bottom: 12px;">
          <i class="fas fa-list-ol" style="color: var(--accent-gold);"></i> Gabarito Questão por Questão:
        </h4>

        <div style="display: flex; flex-direction: column; gap: 12px; max-height: 60vh; overflow-y: auto; padding-right: 4px;">
          ${(sub.details || []).map((det, idx) => `
            <div style="background: rgba(10, 13, 20, 0.6); border: 1px solid var(--border-color); border-left: 4px solid ${det.isCorrect ? 'var(--accent-emerald)' : 'var(--accent-crimson)'}; border-radius: var(--radius-sm); padding: 14px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <strong style="color: #FFF; font-size: 0.9rem;">${idx + 1}. ${det.question}</strong>
                <span class="badge ${det.isCorrect ? 'badge-verde' : 'badge-vermelha'}" style="font-size: 0.7rem;">
                  ${det.isCorrect ? '✓ Acerto' : '✗ Erro'}
                </span>
              </div>
              ${det.image ? `
                <div style="margin: 6px 0;">
                  <img src="${det.image}" alt="Ilustração" style="max-height: 90px; max-width: 100%; object-fit: contain; border-radius: 4px; border: 1px solid rgba(255,255,255,0.1); cursor: pointer;" onclick="window.TKST_APP.openImagePreview('${det.image}')">
                </div>
              ` : ''}
              <div style="font-size: 0.84rem; color: #CBD5E1; margin-bottom: 4px;">
                Marcou: <strong style="color: ${det.isCorrect ? 'var(--accent-emerald)' : 'var(--accent-crimson)'};">${det.selectedText || (det.options && det.options[det.selectedIndex]) || '-'}</strong>
              </div>
              ${!det.isCorrect ? `
                <div style="font-size: 0.84rem; color: #6EE7B7;">
                  Correta: <strong>${det.correctText || (det.options && det.options[det.correctIndex]) || '-'}</strong>
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>

        <div style="margin-top: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
          <button class="btn btn-danger" onclick="window.TKST_APP.deleteQuizSubmission('${sub.id}', '${(sub.studentName || '').replace(/'/g, "\\'")}', true)" style="font-size: 0.85rem; padding: 8px 16px;">
            <i class="fas fa-trash"></i> Excluir Simulado
          </button>
          <button class="btn btn-primary" onclick="document.getElementById('detailModal').classList.remove('active')" style="padding: 10px 24px; font-weight: 700;">
            Fechar Gabarito
          </button>
        </div>
      `;

      detailModal.classList.add('active');
    },

    deleteQuizSubmission: (subId, studentName, fromModal = false) => {
      if (!window.TKST_AUTH.isAdmin()) {
        alert('Apenas o administrador pode excluir simulados.');
        return;
      }
      const name = studentName || 'este aluno';
      if (confirm(`Deseja realmente excluir o simulado de ${name}?\nEsta ação removerá a prova definitivamente do sistema e da nuvem.`)) {
        const res = window.TKST_AUTH.deleteQuizSubmission(subId);
        if (res && res.success) {
          if (fromModal) {
            const modal = document.getElementById('detailModal');
            if (modal) modal.classList.remove('active');
          }
          alert('Simulado excluído com sucesso!');
          renderAdminMaster();
        } else {
          alert((res && res.error) || 'Erro ao excluir simulado.');
        }
      }
    },

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
                <option value="Faixa Branca (7º Kyu)" data-kyu="7">Faixa Branca (7º Kyu)</option>
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
        if (res.autoApproved) {
          // Auto-aprovado por cruzamento com a base de alunos gerenciada pelo Sensei!
          feedback.innerHTML = `
            <div style="background: rgba(16, 185, 129, 0.15); border: 1.5px solid var(--accent-emerald); color: #FFF; padding: 20px 16px; border-radius: var(--radius-md); font-size: 0.9rem; text-align: center;">
              <div style="font-size: 1.15rem; font-weight: 700; color: #6EE7B7; margin-bottom: 8px;">
                <i class="fas fa-check-double"></i> Aluno(a) Reconhecido(a) e Aprovado(a) Automaticamente!
              </div>
              <p style="font-size: 0.88rem; color: #E2E8F0; margin-bottom: 16px; line-height: 1.5;">
                Olá, <strong>${res.user.name}</strong>! Seu nome foi reconhecido na base oficial de alunos da TKST. Seu acesso aos estudos, simulados e vídeos de Kata já foi <strong>100% liberado</strong>!
              </p>
              <button type="button" class="btn btn-primary" onclick="window.TKST_AUTH.setCurrentUser(${JSON.stringify(res.user).replace(/"/g, '&quot;')}); document.getElementById('detailModal').classList.remove('active'); window.TKST_APP.switchTab('dashboard');" style="width: 100%; padding: 13px; font-weight: 700; font-size: 0.95rem; margin-bottom: 10px;">
                <i class="fas fa-sign-in-alt"></i> Acessar Meu Portal de Aluno Agora
              </button>
              <button type="button" class="btn btn-secondary" onclick="document.getElementById('detailModal').classList.remove('active')" style="width: 100%; padding: 9px; font-weight: 600; font-size: 0.85rem;">
                Fechar
              </button>
            </div>
          `;
          return;
        }

        const senseiPhone = '5521972114674';
        const msg = `🥋 *SOLICITAÇÃO DE MATRÍCULA - TKST KARATÊ SHOTOKAN*\n\nOlá Sensei Diego! Acabei de realizar meu cadastro no Portal Oficial TKST e gostaria da liberação do meu acesso aos estudos:\n\n👤 *Nome:* ${name}\n🆔 *Login:* ${res.user.username}\n🥋 *Graduação:* ${currentBelt}\n🏯 *Dojo / Unidade:* ${dojo}\n📱 *WhatsApp do Aluno:* ${phone || 'Não informado'}\n\nPor favor, libere meu acesso no sistema. Oss!`;
        const whatsappUrl = `https://wa.me/${senseiPhone}?text=${encodeURIComponent(msg)}`;

        // Automatically trigger WhatsApp in a new tab
        try {
          window.open(whatsappUrl, '_blank');
        } catch(e) {}

        feedback.innerHTML = `
          <div style="background: rgba(16, 185, 129, 0.15); border: 1.5px solid var(--accent-emerald); color: #FFF; padding: 20px 16px; border-radius: var(--radius-md); font-size: 0.9rem; text-align: center;">
            <div style="font-size: 1.15rem; font-weight: 700; color: #6EE7B7; margin-bottom: 8px;">
              <i class="fas fa-check-circle"></i> Solicitação Enviada com Sucesso!
            </div>
            <p style="font-size: 0.86rem; color: #E2E8F0; margin-bottom: 16px; line-height: 1.5;">
              Seu cadastro com o Login <strong>${res.user.username}</strong> foi salvo no sistema. Para liberar seu acesso imediatamente, envie a notificação para o WhatsApp do <strong>Sensei Diego (21 97211-4674)</strong>.
            </p>

            <a href="${whatsappUrl}" target="_blank" class="btn" style="display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 13px; font-size: 0.95rem; font-weight: 700; background: #25D366; color: #FFF; border-radius: var(--radius-sm); margin-bottom: 10px; text-decoration: none; box-shadow: 0 4px 14px rgba(37, 211, 102, 0.4);">
              <i class="fab fa-whatsapp" style="font-size: 1.25rem;"></i> Notificar Sensei no WhatsApp (Liberar Acesso)
            </a>

            <button type="button" class="btn btn-secondary" onclick="document.getElementById('detailModal').classList.remove('active')" style="width: 100%; padding: 10px; font-weight: 600; font-size: 0.85rem;">
              Fechar
            </button>
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
        { name: "Faixa Branca (7º Kyu)", kyu: 7 },
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

    approveStudent: (studentId) => {
      const res = window.TKST_AUTH.approveStudent(studentId);
      if (res.success) {
        alert(`Aluno ${res.student.name} (Login: ${res.student.username}) aprovado com sucesso!`);
        renderAdminMaster();
      } else {
        alert(res.message);
      }
    },

    openDojobookImportModal: () => {
      const modalTitle = document.getElementById('detailModalTitle');
      const modalBody = document.getElementById('detailModalBody');
      modalTitle.innerHTML = `<span><i class="fas fa-file-import" style="color: var(--accent-gold);"></i> Importar Alunos do DojôBook</span>`;
      modalBody.innerHTML = `
        <div style="padding: 10px 4px;">
          <div style="background: rgba(255,183,3,0.08); border: 1px solid rgba(255,183,3,0.25); border-radius: var(--radius-md); padding: 14px; margin-bottom: 16px; font-size: 0.85rem; color: #E2E8F0; line-height: 1.6;">
            <strong style="color: var(--accent-gold);"><i class="fas fa-magic"></i> Cruzamento Automático Ativado:</strong><br>
            Cole a lista de alunos do <strong>DojôBook</strong> abaixo (um por linha). Todos os alunos importados serão reconhecidos e <strong>aprovados automaticamente</strong> assim que realizarem o cadastro no portal pelo link!
          </div>

          <form onsubmit="event.preventDefault(); window.TKST_APP.submitDojobookImport();">
            <div class="form-group" style="margin-bottom: 14px;">
              <label class="form-label" style="font-size: 0.82rem; margin-bottom: 6px;">
                Lista de Alunos (Copie e Cole do DojôBook):
              </label>
              <textarea id="dojobookImportText" class="form-input" rows="8" placeholder="Exemplo:
Geovanna Coutinho - Faixa Preta (1º Dan) - QG TKST Capela
Lucas Silva - Faixa Branca - TKST Santo Aleixo
Mariana Costa - Faixa Vermelha - TKST Rio do Ouro" style="font-family: monospace; font-size: 0.82rem; padding: 10px; resize: vertical;" required></textarea>
              <div style="font-size: 0.72rem; color: #94A3B8; margin-top: 4px;">
                * Aceita formato com apenas o nome, ou separado por hífen/vírgula com graduação e dojo.
              </div>
            </div>

            <div id="dojobookImportFeedback" style="margin-bottom: 12px;"></div>

            <div style="display: flex; gap: 10px;">
              <button type="button" class="btn btn-secondary" onclick="document.getElementById('detailModal').classList.remove('active')" style="flex: 1; padding: 11px;">
                Cancelar
              </button>
              <button type="submit" class="btn btn-gold" style="flex: 2; padding: 11px; font-weight: 700;">
                <i class="fas fa-check"></i> Importar Alunos Agora
              </button>
            </div>
          </form>
        </div>
      `;
      detailModal.classList.add('active');
    },

    submitDojobookImport: () => {
      const text = document.getElementById('dojobookImportText').value;
      const feedback = document.getElementById('dojobookImportFeedback');
      if (!text || !text.trim()) return;

      const lines = text.trim().split('\n');
      const parsedList = [];

      lines.forEach(line => {
        const clean = line.trim();
        if (!clean) return;

        const parts = clean.split(/[-–—,]/).map(p => p.trim()).filter(Boolean);
        const name = parts[0];
        const belt = parts[1] || 'Faixa Branca (7º Kyu)';
        const dojo = parts[2] || 'TKST Santo Aleixo';

        if (name && name.length >= 2) {
          parsedList.push({
            name,
            currentBelt: belt,
            dojo
          });
        }
      });

      if (parsedList.length === 0) {
        feedback.innerHTML = `<div style="color: #FF808A; font-size: 0.85rem;">Nenhum nome válido encontrado.</div>`;
        return;
      }

      const res = window.TKST_AUTH.importDojobookStudents(parsedList);
      if (res.success) {
        feedback.innerHTML = `
          <div style="background: rgba(16, 185, 129, 0.15); border: 1px solid var(--accent-emerald); color: #6EE7B7; padding: 12px; border-radius: var(--radius-sm); font-size: 0.86rem;">
            <i class="fas fa-check-circle"></i> Sucesso! <strong>${res.added}</strong> novos alunos cadastrados e <strong>${res.updated}</strong> atualizados. Total na base: ${res.total}.
          </div>
        `;
        setTimeout(() => {
          document.getElementById('detailModal').classList.remove('active');
          renderAdminMaster();
        }, 1500);
      } else {
        feedback.innerHTML = `<div style="color: #FF808A; font-size: 0.85rem;">${res.message}</div>`;
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
      const dojo = prompt('Dojo / Unidade:', 'TKST Santo Aleixo');

      const res = window.TKST_AUTH.register({
        name,
        username: nick,
        currentBelt: currentBelt || 'Faixa Branca',
        currentKyu: 6,
        dojo: dojo || 'TKST Santo Aleixo',
        password: pass || '1234',
        status: 'approved'
      });

      if (res.success) {
        alert(`Aluno cadastrado e ativado com sucesso! Login: ${nick}`);
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
      const kata = (window.TKST_KATAS || []).find(k => k.id === kataId);
      const custom = getCustomKataVideos();
      const list = normalizeKataVideos(custom[kataId], kata);
      if (list.length > 0 && list[0].url) return list[0].url;
      return '';
    },

    playSpecificKataVideo: (kataId, videoId) => {
      const kata = (window.TKST_KATAS || []).find(k => k.id === kataId);
      const name = kata ? kata.name : 'Kata';
      const customVideos = getCustomKataVideos();
      const list = normalizeKataVideos(customVideos[kataId], kata);
      const target = list.find(v => v.id === videoId) || list[0];
      if (!target || !target.url) {
        alert('Vídeo não encontrado.');
        return;
      }
      openVideoModal(`${name} - ${target.title}`, target.url, target.description);
    },

    playKataVideo: (kataId) => {
      const kata = (window.TKST_KATAS || []).find(k => k.id === kataId);
      const name = kata ? kata.name : 'Kata';
      const customVideos = getCustomKataVideos();
      const list = normalizeKataVideos(customVideos[kataId], kata);
      if (list.length === 0) {
        alert('Nenhum link de vídeo configurado para este Kata no momento.');
        return;
      }
      if (list.length === 1) {
        openVideoModal(`${name} - ${list[0].title}`, list[0].url, list[0].description);
      } else {
        openKataDetail(kataId);
      }
    },

    testDirectVideo: (title, url, description = '') => {
      if (!url) {
        alert('URL de vídeo inválida.');
        return;
      }
      openVideoModal(title, url, description);
    },

    openAddKataVideoModal: (kataId) => {
      const kata = (window.TKST_KATAS || []).find(k => k.id === kataId);
      if (!kata) return;

      const modalTitle = document.getElementById('detailModalTitle');
      const modalBody = document.getElementById('detailModalBody');

      modalTitle.innerHTML = `<span><i class="fas fa-video" style="color: var(--accent-gold);"></i> Adicionar Vídeo - ${kata.name}</span>`;

      modalBody.innerHTML = `
        <form onsubmit="event.preventDefault(); window.TKST_APP.submitKataVideoForm('${kataId}', '');">
          <div style="background: rgba(255, 183, 3, 0.08); border: 1px solid rgba(255, 183, 3, 0.25); border-radius: var(--radius-sm); padding: 12px 14px; font-size: 0.84rem; color: #E2E8F0; margin-bottom: 16px; line-height: 1.5;">
            Adicione um vídeo para <strong>${kata.name}</strong>. Você pode definir a descrição e o foco do vídeo (ex: <em>Execução Lenta</em>, <em>Passo a Passo</em>, <em>Aplicação Bunkai</em>).
          </div>

          <div class="form-group" style="margin-bottom: 14px;">
            <label class="form-label" style="font-size: 0.82rem; font-weight: 700; color: #FFF; margin-bottom: 6px;">
              Título / Descrição do Vídeo: *
            </label>
            <input type="text" id="modalKataVidTitle" class="form-input" placeholder="ex: Execução com Bunkai / Passo a Passo Detalhado" required>
          </div>

          <div class="form-group" style="margin-bottom: 14px;">
            <label class="form-label" style="font-size: 0.82rem; font-weight: 700; color: #FFF; margin-bottom: 6px;">
              Link do Vídeo (YouTube, Vimeo, Google Drive ou MP4): *
            </label>
            <input type="text" id="modalKataVidUrl" class="form-input" placeholder="ex: https://www.youtube.com/watch?v=..." required>
          </div>

          <div class="form-group" style="margin-bottom: 18px;">
            <label class="form-label" style="font-size: 0.82rem; font-weight: 700; color: #FFF; margin-bottom: 6px;">
              Descrição / Observações Técnicas para o Aluno (Opcional):
            </label>
            <textarea id="modalKataVidDesc" class="form-input" rows="3" placeholder="ex: Atenção especial aos pontos de Kiai e na postura Zenkutsu Dachi..."></textarea>
          </div>

          <div style="display: flex; gap: 10px; justify-content: flex-end;">
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('detailModal').classList.remove('active')">
              Cancelar
            </button>
            <button type="submit" class="btn btn-primary" style="font-weight: 700;">
              <i class="fas fa-save"></i> Salvar Vídeo na Nuvem
            </button>
          </div>
        </form>
      `;

      detailModal.classList.add('active');
    },

    openEditKataVideoModal: (kataId, videoId) => {
      const kata = (window.TKST_KATAS || []).find(k => k.id === kataId);
      if (!kata) return;

      const customVideos = getCustomKataVideos();
      const list = normalizeKataVideos(customVideos[kataId], kata);
      const existing = list.find(v => v.id === videoId);
      if (!existing) {
        alert('Vídeo não encontrado.');
        return;
      }

      const modalTitle = document.getElementById('detailModalTitle');
      const modalBody = document.getElementById('detailModalBody');

      modalTitle.innerHTML = `<span><i class="fas fa-edit" style="color: var(--accent-gold);"></i> Editar Vídeo - ${kata.name}</span>`;

      modalBody.innerHTML = `
        <form onsubmit="event.preventDefault(); window.TKST_APP.submitKataVideoForm('${kataId}', '${videoId}');">
          <div class="form-group" style="margin-bottom: 14px;">
            <label class="form-label" style="font-size: 0.82rem; font-weight: 700; color: #FFF; margin-bottom: 6px;">
              Título / Descrição do Vídeo: *
            </label>
            <input type="text" id="modalKataVidTitle" class="form-input" value="${escapeHtml(existing.title)}" required>
          </div>

          <div class="form-group" style="margin-bottom: 14px;">
            <label class="form-label" style="font-size: 0.82rem; font-weight: 700; color: #FFF; margin-bottom: 6px;">
              Link do Vídeo (YouTube, Vimeo, Google Drive ou MP4): *
            </label>
            <input type="text" id="modalKataVidUrl" class="form-input" value="${escapeHtml(existing.url)}" required>
          </div>

          <div class="form-group" style="margin-bottom: 18px;">
            <label class="form-label" style="font-size: 0.82rem; font-weight: 700; color: #FFF; margin-bottom: 6px;">
              Descrição / Observações Técnicas para o Aluno (Opcional):
            </label>
            <textarea id="modalKataVidDesc" class="form-input" rows="3">${escapeHtml(existing.description || '')}</textarea>
          </div>

          <div style="display: flex; gap: 10px; justify-content: flex-end;">
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('detailModal').classList.remove('active')">
              Cancelar
            </button>
            <button type="submit" class="btn btn-primary" style="font-weight: 700;">
              <i class="fas fa-save"></i> Atualizar Vídeo
            </button>
          </div>
        </form>
      `;

      detailModal.classList.add('active');
    },

    deleteKataVideo: (kataId, videoId) => {
      if (confirm('Deseja realmente remover este vídeo do Kata?')) {
        if (window.TKST_AUTH && window.TKST_AUTH.deleteKataVideo) {
          window.TKST_AUTH.deleteKataVideo(kataId, videoId);
        }
        renderAdminMaster();
      }
    },

    submitKataVideoForm: (kataId, videoId) => {
      const titleInput = document.getElementById('modalKataVidTitle');
      const urlInput = document.getElementById('modalKataVidUrl');
      const descInput = document.getElementById('modalKataVidDesc');
      if (!titleInput || !urlInput) return;

      const title = titleInput.value.trim();
      const url = urlInput.value.trim();
      const desc = descInput ? descInput.value.trim() : '';

      if (!title || !url) {
        alert('Por favor, preencha o título e o link do vídeo.');
        return;
      }

      if (videoId) {
        if (window.TKST_AUTH && window.TKST_AUTH.updateKataVideo) {
          window.TKST_AUTH.updateKataVideo(kataId, videoId, title, url, desc);
        }
      } else {
        if (window.TKST_AUTH && window.TKST_AUTH.addKataVideo) {
          window.TKST_AUTH.addKataVideo(kataId, title, url, desc);
        }
      }

      document.getElementById('detailModal').classList.remove('active');
      alert('Vídeo salvo e sincronizado com sucesso na nuvem!');
      renderAdminMaster();
    },

    saveKataVideo: (kataId) => {
      const input = document.getElementById(`kata_vid_input_${kataId}`);
      if (!input) return;
      const url = input.value.trim();
      if (window.TKST_AUTH && window.TKST_AUTH.saveKataVideo) {
        window.TKST_AUTH.saveKataVideo(kataId, url);
      }
      alert('Link do vídeo salvo e sincronizado com sucesso na nuvem!');
      renderAdminMaster();
    },

    testKataVideo: (kataId, kataName) => {
      const kata = (window.TKST_KATAS || []).find(k => k.id === kataId);
      const name = kataName || (kata ? kata.name : 'Kata');
      const customVideos = getCustomKataVideos();
      const list = normalizeKataVideos(customVideos[kataId], kata);
      if (list.length === 0) {
        alert('Por favor, cadastre um vídeo primeiro para testar.');
        return;
      }
      openVideoModal(`${name} - ${list[0].title}`, list[0].url, list[0].description);
    },

    openGlossaryVideo: (categoryKey, japaneseName) => {
      const glossary = window.TKST_AUTH ? window.TKST_AUTH.getCustomGlossary() : window.TKST_GLOSSARY;
      let term = null;
      if (categoryKey && glossary[categoryKey]) {
        term = glossary[categoryKey].find(t => t.japanese.toLowerCase().trim() === (japaneseName || '').toLowerCase().trim());
      }
      if (!term) {
        const cats = ['bases', 'defesas', 'socosGolpes', 'chutes', 'comandosEContagem'];
        for (const c of cats) {
          const found = (glossary[c] || []).find(t => t.japanese.toLowerCase().trim() === (japaneseName || '').toLowerCase().trim());
          if (found) {
            term = found;
            break;
          }
        }
      }
      const title = term ? `${term.japanese} - ${term.meaning}` : japaneseName;
      const effectiveVideoSource = (term && term.videoUrl) ? term.videoUrl : `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent('karate shotokan ' + (term ? term.japanese : japaneseName))}&rel=0&playsinline=1&modestbranding=1`;
      openVideoModal(title, effectiveVideoSource);
    },

    // Dojo Handlers
    submitNewDojo: () => {
      const input = document.getElementById('newDojoNameInput') || document.getElementById('newDojoInput');
      const feedback = document.getElementById('dojoFeedback');
      if (!input) {
        alert('Campo de nome do Dojo não encontrado.');
        return;
      }
      const name = input.value.trim();
      if (!name) {
        alert('Por favor, digite o nome do Dojo.');
        input.focus();
        return;
      }
      const res = window.TKST_AUTH.addDojo(name);
      if (res && res.success) {
        input.value = '';
        renderAdminMaster();
        const freshFeedback = document.getElementById('dojoFeedback');
        if (freshFeedback) {
          freshFeedback.innerHTML = `
            <div style="background: rgba(16, 185, 129, 0.15); border: 1px solid var(--accent-emerald); color: #6EE7B7; padding: 10px; border-radius: var(--radius-sm); font-size: 0.85rem; margin-bottom: 12px;">
              ✓ Dojo "${name}" cadastrado com sucesso!
            </div>
          `;
          setTimeout(() => { if (freshFeedback) freshFeedback.innerHTML = ''; }, 3500);
        } else {
          alert(`Dojo "${name}" cadastrado com sucesso!`);
        }
      } else {
        const errorMsg = (res && res.message) || 'Erro ao cadastrar Dojo.';
        if (feedback) {
          feedback.innerHTML = `
            <div style="background: rgba(230, 57, 70, 0.15); border: 1px solid var(--accent-crimson); color: #FF808A; padding: 10px; border-radius: var(--radius-sm); font-size: 0.85rem;">
              ${errorMsg}
            </div>
          `;
        } else {
          alert(errorMsg);
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
    },

    // Japanese Pronunciation (Speech Synthesis)
    speakJapanese: (text) => {
      if (!('speechSynthesis' in window)) {
        alert('Seu navegador não possui suporte a sintetizador de voz.');
        return;
      }
      window.speechSynthesis.cancel();
      const cleanText = (text || '').replace(/\(.*?\)/g, '').trim();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'ja-JP';
      utterance.rate = 0.85;
      
      const voices = window.speechSynthesis.getVoices();
      const jaVoice = voices.find(v => v.lang === 'ja-JP' || v.lang.startsWith('ja'));
      if (jaVoice) {
        utterance.voice = jaVoice;
      }
      window.speechSynthesis.speak(utterance);
    },

    // Glossary Movement Detail & Media Viewer Modal
    openGlossaryDetailModal: (categoryKey, japaneseName) => {
      const glossary = window.TKST_AUTH ? window.TKST_AUTH.getCustomGlossary() : window.TKST_GLOSSARY;
      let term = null;
      let actualCat = categoryKey || 'bases';
      const catMap = {
        bases: 'Base (Dachi)',
        defesas: 'Defesa (Uke)',
        socosGolpes: 'Soco / Golpe (Tsuki/Uchi)',
        chutes: 'Chute (Geri)',
        comandosEContagem: 'Comando / Conceito'
      };

      if (categoryKey && glossary[categoryKey]) {
        term = glossary[categoryKey].find(t => t.japanese.toLowerCase().trim() === (japaneseName || '').toLowerCase().trim());
      }
      if (!term) {
        const cats = ['bases', 'defesas', 'socosGolpes', 'chutes', 'comandosEContagem'];
        for (const c of cats) {
          const found = (glossary[c] || []).find(t => t.japanese.toLowerCase().trim() === (japaneseName || '').toLowerCase().trim());
          if (found) {
            term = found;
            actualCat = c;
            break;
          }
        }
      }

      if (!term) {
        alert('Termo não encontrado.');
        return;
      }

      const modalTitle = document.getElementById('detailModalTitle');
      const modalBody = document.getElementById('detailModalBody');
      const isAdmin = window.TKST_AUTH ? window.TKST_AUTH.isAdmin() : false;

      const effectiveVideoSource = term.videoUrl ? term.videoUrl : `https://www.youtube-nocookie.com/embed?listType=search&list=${encodeURIComponent('karate shotokan ' + term.japanese)}&rel=0&playsinline=1&modestbranding=1`;
      const embed = getEmbedUrl(effectiveVideoSource);

      modalTitle.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
          <span class="badge badge-amarela" style="font-size: 0.72rem;">${catMap[actualCat] || 'Técnica'}</span>
          <span style="color: #FFF; font-weight: 700;">${term.japanese}</span>
        </div>
      `;

      modalBody.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 10px;">
          
          <!-- Top Card: Kanji, Pronunciation & Meaning -->
          <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 10px 12px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <div>
              <div style="font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--accent-gold); font-weight: 700; margin-bottom: 2px;">
                Termo Tradicional Shotokan
              </div>
              <h2 style="font-family: var(--font-heading); font-size: 1.25rem; color: #FFF; margin: 0 0 4px 0; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                ${term.japanese}
                ${term.kanji ? `<span style="font-family: var(--font-kanji); color: rgba(255, 183, 3, 0.85); font-size: 1.1rem;">(${term.kanji})</span>` : ''}
              </h2>
              <div style="font-size: 0.84rem; color: #E2E8F0; line-height: 1.4;">
                <strong>Significado:</strong> ${term.meaning}
              </div>
            </div>

            <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
              <button type="button" class="audio-pronounce-btn" onclick="window.TKST_APP.speakJapanese('${term.japanese.replace(/'/g, "\\'")}')" title="Ouvir pronúncia em Japonês" style="font-size: 0.76rem; padding: 6px 12px;">
                <i class="fas fa-volume-up"></i> Ouvir Pronúncia
              </button>
              ${isAdmin ? `
                <button type="button" class="btn btn-sm" onclick="window.TKST_APP.openEditGlossaryTermModal('${actualCat}', '${term.japanese.replace(/'/g, "\\'")}')" style="font-size: 0.74rem; padding: 6px 10px; background: rgba(255, 183, 3, 0.2); border: 1px solid var(--accent-gold); color: #FFB703;">
                  <i class="fas fa-edit"></i> Configurar Mídias
                </button>
              ` : ''}
            </div>
          </div>

          <!-- Media Grid: Illustrated Movement + Video Demonstration (Direct In-App Players) -->
          <div class="technique-media-grid">
            
            <!-- Illustrated Movement / GIF Card -->
            <div class="technique-media-card" style="padding: 10px 12px;">
              <div style="font-size: 0.82rem; font-weight: 700; color: #FFF; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between;">
                <span style="display: inline-flex; align-items: center; gap: 6px;">
                  <i class="fas fa-image" style="color: var(--accent-blue);"></i> Movimento Ilustrado
                </span>
                <span style="font-size: 0.70rem; color: var(--accent-gold);">Shotokan Dō</span>
              </div>
              
              <div class="technique-image-container" style="background: #080c14; border: 1px solid var(--border-color); border-radius: var(--radius-sm); overflow: hidden; display: flex; align-items: center; justify-content: center; min-height: 160px;">
                ${term.image ? `
                  <img src="${term.image}" alt="${term.japanese}" style="max-height: 180px; width: 100%; object-fit: contain; padding: 4px;" onerror="this.onerror=null; this.src='assets/images/logo-tkst.png';">
                ` : `
                  <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #94A3B8; padding: 16px; text-align: center;">
                    <i class="fas fa-running" style="font-size: 2.2rem; color: var(--accent-gold); margin-bottom: 8px; opacity: 0.85;"></i>
                    <div style="font-weight: 700; color: #FFF; font-size: 0.88rem; margin-bottom: 2px;">${term.japanese}</div>
                    <div style="font-size: 0.72rem; color: #64748B;">Demonstração Técnica Tradicional</div>
                  </div>
                `}
              </div>
            </div>

            <!-- Video Demonstration Card (Direct in-app playback) -->
            <div class="technique-media-card" style="padding: 10px 12px;">
              <div style="font-size: 0.82rem; font-weight: 700; color: #FFF; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between;">
                <span style="display: inline-flex; align-items: center; gap: 6px;">
                  <i class="fas fa-video" style="color: var(--accent-crimson);"></i> Vídeo Oficial
                </span>
                <span class="badge badge-amarela" style="font-size: 0.62rem; padding: 1px 5px;">Vídeo no Sistema</span>
              </div>

              <div class="modal-video-wrapper" style="margin-bottom: 8px; width: 100%; border-radius: var(--radius-sm); overflow: hidden; border: 1px solid var(--border-color); background: #000; box-shadow: 0 4px 14px rgba(0,0,0,0.5);">
                ${embed.type === 'video' ? `
                  <video src="${embed.url}" controls playsinline webkit-playsinline style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: contain; background: #000;">
                    Seu navegador não suporta este formato de vídeo.
                  </video>
                ` : `
                  <iframe src="${embed.url}" title="${term.japanese}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
                `}
              </div>

              <button type="button" class="btn" onclick="window.TKST_APP.openVideoModal('${term.japanese.replace(/'/g, "\\'")}', '${effectiveVideoSource.replace(/'/g, "\\'")}')" style="width: 100%; font-size: 0.78rem; padding: 8px; display: flex; align-items: center; justify-content: center; gap: 6px; background: #DC2626; color: #FFF; font-weight: 700; border: none; border-radius: var(--radius-sm); box-shadow: 0 4px 12px rgba(220, 38, 38, 0.35); cursor: pointer;">
                <i class="fas fa-expand"></i> Assistir Expandido
              </button>
            </div>

          </div>

          <!-- Technical Breakdown & Biomechanics Card -->
          <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 12px 14px;">
            <h4 style="font-family: var(--font-heading); color: var(--accent-gold); font-size: 0.95rem; margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
              <i class="fas fa-cogs"></i> Detalhamento Técnico & Biomecânica
            </h4>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px; font-size: 0.80rem; color: #CBD5E1; line-height: 1.4;">
              <div style="background: rgba(0,0,0,0.25); padding: 8px 10px; border-radius: var(--radius-sm); border-left: 3px solid var(--accent-gold);">
                <strong style="color: #FFF; display: block; margin-bottom: 2px;"><i class="fas fa-arrows-alt-v" style="color: var(--accent-gold);"></i> Quadril (Koshi):</strong>
                ${term.hipRotation || 'Explosão do quadril sincronizada com o Kime para transferir energia máxima.'}
              </div>

              <div style="background: rgba(0,0,0,0.25); padding: 8px 10px; border-radius: var(--radius-sm); border-left: 3px solid var(--accent-blue);">
                <strong style="color: #FFF; display: block; margin-bottom: 2px;"><i class="fas fa-hand-rock" style="color: var(--accent-blue);"></i> Hikite / Apoio:</strong>
                ${term.hikite || 'Puxada firme do braço de apoio rente às costelas flutuantes com o punho invertido.'}
              </div>

              <div style="background: rgba(0,0,0,0.25); padding: 8px 10px; border-radius: var(--radius-sm); border-left: 3px solid var(--accent-emerald);">
                <strong style="color: #FFF; display: block; margin-bottom: 2px;"><i class="fas fa-lungs" style="color: var(--accent-emerald);"></i> Respiração & Kime:</strong>
                ${term.breathing || 'Expiração enérgica e contração do Tanden no impacto.'}
              </div>
            </div>

            ${term.technicalTips ? `
              <div style="margin-top: 10px; padding: 8px 10px; background: rgba(255, 183, 3, 0.08); border: 1px solid rgba(255, 183, 3, 0.25); border-radius: var(--radius-sm); font-size: 0.80rem; color: #FFE299;">
                <strong><i class="fas fa-chalkboard-teacher"></i> Instruções do Sensei Diego:</strong> ${term.technicalTips}
              </div>
            ` : ''}
          </div>

          <div style="display: flex; gap: 8px; width: 100%;">
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('detailModal').classList.remove('active')" style="flex: 1; padding: 9px; font-weight: 600; font-size: 0.82rem;">
              Fechar
            </button>
            ${isAdmin ? `
              <button type="button" class="btn btn-gold" onclick="window.TKST_APP.openEditGlossaryTermModal('${actualCat}', '${term.japanese.replace(/'/g, "\\'")}')" style="flex: 1; padding: 9px; font-weight: 700; font-size: 0.82rem;">
                <i class="fas fa-edit"></i> Editar Termo (Admin)
              </button>
            ` : ''}
          </div>

        </div>
      `;

      detailModal.classList.add('active');
    },

    handleGlossaryImageUpload: (input, previewImgId, hiddenInputId) => {
      const file = input.files && input.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 400;
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

          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);

          const previewBox = document.getElementById(previewImgId + 'Box');
          const previewImg = document.getElementById(previewImgId);
          const hiddenInput = document.getElementById(hiddenInputId);

          if (previewImg) previewImg.src = compressedDataUrl;
          if (previewBox) previewBox.style.display = 'block';
          if (hiddenInput) hiddenInput.value = compressedDataUrl;
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    },

    handleGlossaryImageUrl: (url, previewImgId) => {
      const trimmed = (url || '').trim();
      const previewBox = document.getElementById(previewImgId + 'Box');
      const previewImg = document.getElementById(previewImgId);
      if (previewBox && previewImg) {
        if (trimmed) {
          previewImg.src = trimmed;
          previewBox.style.display = 'block';
        } else {
          previewBox.style.display = 'none';
        }
      }
    },

    removeGlossaryImage: (previewImgId, hiddenInputId, fileInputId) => {
      const previewBox = document.getElementById(previewImgId + 'Box');
      const previewImg = document.getElementById(previewImgId);
      const hiddenInput = document.getElementById(hiddenInputId);
      const fileInput = document.getElementById(fileInputId);

      if (previewBox) previewBox.style.display = 'none';
      if (previewImg) previewImg.src = '';
      if (hiddenInput) hiddenInput.value = '';
      if (fileInput) fileInput.value = '';
    },

    openAddGlossaryTermModal: (defaultCat) => {
      if (!window.TKST_AUTH.isAdmin()) {
        alert('Acesso restrito ao Administrador Geral (Sensei Diego).');
        return;
      }

      const modalTitle = document.getElementById('detailModalTitle');
      const modalBody = document.getElementById('detailModalBody');

      modalTitle.innerHTML = `<span><i class="fas fa-plus-circle" style="color: var(--accent-gold);"></i> Novo Termo no Dicionário (Admin)</span>`;

      modalBody.innerHTML = `
        <form onsubmit="event.preventDefault(); window.TKST_APP.submitAddGlossaryTerm();" style="display: flex; flex-direction: column; gap: 14px;">
          <div style="background: rgba(255,183,3,0.08); border: 1px solid rgba(255,183,3,0.3); border-radius: var(--radius-sm); padding: 10px 14px; font-size: 0.82rem; color: #E2E8F0;">
            <i class="fas fa-shield-alt" style="color: var(--accent-gold); margin-right: 6px;"></i> Cadastre um novo termo técnico com foto/GIF ilustrado direto da câmera/arquivo ou link.
          </div>

          <div class="form-group">
            <label class="form-label" style="font-size: 0.82rem; margin-bottom: 4px;">
              <i class="fas fa-folder" style="color: var(--accent-gold); margin-right: 6px;"></i> Categoria:
            </label>
            <select id="newGlossaryCategory" class="form-input" required style="font-size: 0.88rem;">
              <option value="bases" ${defaultCat === 'bases' ? 'selected' : ''}>Bases (Dachi)</option>
              <option value="defesas" ${defaultCat === 'defesas' ? 'selected' : ''}>Defesas (Uke)</option>
              <option value="socosGolpes" ${defaultCat === 'socosGolpes' ? 'selected' : ''}>Socos e Golpes (Tsuki/Uchi)</option>
              <option value="chutes" ${defaultCat === 'chutes' ? 'selected' : ''}>Chutes (Geri)</option>
              <option value="comandosEContagem" ${defaultCat === 'comandosEContagem' ? 'selected' : ''}>Comandos e Conceitos</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" style="font-size: 0.82rem; margin-bottom: 4px;">
              <i class="fas fa-language" style="color: var(--accent-gold); margin-right: 6px;"></i> Termo em Japonês (Romaji):
            </label>
            <input type="text" id="newGlossaryJapanese" class="form-input" required placeholder="ex: Kage Tsuki ou Fudo Dachi" style="font-size: 0.9rem; font-weight: 600;">
          </div>

          <div class="form-group">
            <label class="form-label" style="font-size: 0.82rem; margin-bottom: 4px;">
              <i class="fas fa-pen-fancy" style="color: var(--accent-gold); margin-right: 6px;"></i> Kanji / Ideogramas (Opcional):
            </label>
            <input type="text" id="newGlossaryKanji" class="form-input" placeholder="ex: 鉤突き ou 不動立ち" style="font-size: 0.9rem; font-family: var(--font-kanji);">
          </div>

          <div class="form-group">
            <label class="form-label" style="font-size: 0.82rem; margin-bottom: 4px;">
              <i class="fas fa-align-left" style="color: var(--accent-gold); margin-right: 6px;"></i> Significado / Explicação:
            </label>
            <textarea id="newGlossaryMeaning" class="form-input" rows="3" required placeholder="ex: Soco em gancho curto lateral com cotovelo a 90 graus..." style="resize: vertical; font-size: 0.88rem;"></textarea>
          </div>

          <!-- Upload de Imagem do Arquivo ou URL -->
          <div class="form-group">
            <label class="form-label" style="font-size: 0.82rem; margin-bottom: 4px;">
              <i class="fas fa-image" style="color: var(--accent-blue); margin-right: 6px;"></i> Imagem / Diagrama Ilustrado (Opcional):
            </label>
            
            <div id="addGlossaryImagePreviewBox" style="display: none; margin-bottom: 10px; background: rgba(0,0,0,0.4); border: 1px dashed var(--border-color); border-radius: var(--radius-sm); padding: 12px; text-align: center;">
              <img id="addGlossaryImagePreview" src="" style="max-height: 180px; max-width: 100%; object-fit: contain; border-radius: 4px; margin-bottom: 8px;">
              <div>
                <button type="button" class="btn btn-sm btn-danger" onclick="window.TKST_APP.removeGlossaryImage('addGlossaryImagePreview', 'newGlossaryImage', 'addGlossaryFileInput')" style="font-size: 0.75rem; padding: 4px 10px;">
                  <i class="fas fa-trash"></i> Remover Imagem
                </button>
              </div>
            </div>

            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <label class="btn btn-secondary" style="font-size: 0.8rem; padding: 8px 12px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                <i class="fas fa-camera"></i> Escolher Foto do Arquivo
                <input type="file" accept="image/*" id="addGlossaryFileInput" style="display: none;" onchange="window.TKST_APP.handleGlossaryImageUpload(this, 'addGlossaryImagePreview', 'newGlossaryImage')">
              </label>
              <input type="text" id="newGlossaryImage" class="form-input" placeholder="Ou cole a URL da imagem (https://...)" oninput="window.TKST_APP.handleGlossaryImageUrl(this.value, 'addGlossaryImagePreview')" style="flex: 1; min-width: 180px; font-size: 0.82rem;">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" style="font-size: 0.82rem; margin-bottom: 4px;">
              <i class="fas fa-video" style="color: var(--accent-crimson); margin-right: 6px;"></i> URL do Vídeo / YouTube Embed (Opcional):
            </label>
            <input type="url" id="newGlossaryVideoUrl" class="form-input" placeholder="https://www.youtube.com/embed/... ou link de vídeo" style="font-size: 0.85rem;">
          </div>

          <div class="form-group">
            <label class="form-label" style="font-size: 0.82rem; margin-bottom: 4px;">
              <i class="fas fa-chalkboard-teacher" style="color: var(--accent-gold); margin-right: 6px;"></i> Instruções & Dicas do Sensei Diego (Opcional):
            </label>
            <textarea id="newGlossaryTips" class="form-input" rows="2" placeholder="Dicas de execução, foco no quadril, erros comuns a evitar..." style="resize: vertical; font-size: 0.85rem;"></textarea>
          </div>

          <div style="display: flex; gap: 10px; margin-top: 8px;">
            <button type="button" class="btn btn-secondary" onclick="document.getElementById('detailModal').classList.remove('active')" style="flex: 1; padding: 12px;">
              Cancelar
            </button>
            <button type="submit" class="btn btn-primary" style="flex: 2; padding: 12px; font-weight: 700;">
              <i class="fas fa-plus-circle"></i> Cadastrar Termo
            </button>
          </div>
        </form>
      `;

      detailModal.classList.add('active');
    },

    submitAddGlossaryTerm: () => {
      if (!window.TKST_AUTH.isAdmin()) {
        alert('Acesso restrito ao Administrador Geral (Sensei Diego).');
        return;
      }

      const cat = document.getElementById('newGlossaryCategory').value;
      const japanese = document.getElementById('newGlossaryJapanese').value.trim();
      const kanji = document.getElementById('newGlossaryKanji').value.trim();
      const meaning = document.getElementById('newGlossaryMeaning').value.trim();
      const image = (document.getElementById('newGlossaryImage') && document.getElementById('newGlossaryImage').value.trim()) || '';
      const videoUrl = (document.getElementById('newGlossaryVideoUrl') && document.getElementById('newGlossaryVideoUrl').value.trim()) || '';
      const technicalTips = (document.getElementById('newGlossaryTips') && document.getElementById('newGlossaryTips').value.trim()) || '';

      if (!cat || !japanese || !meaning) {
        alert('Por favor, preencha o termo em japonês e o seu significado.');
        return;
      }

      const res = window.TKST_AUTH.addGlossaryTerm(cat, {
        japanese,
        kanji,
        meaning,
        image,
        videoUrl,
        technicalTips
      });

      if (res && res.success) {
        document.getElementById('detailModal').classList.remove('active');
        alert(`Termo "${japanese}" adicionado com sucesso ao dicionário!`);
        renderGlossary();
      } else {
        alert((res && res.error) || 'Erro ao adicionar termo.');
      }
    },

    deleteGlossaryTerm: (category, japaneseName) => {
      if (!window.TKST_AUTH.isAdmin()) {
        alert('Acesso restrito ao Administrador Geral (Sensei Diego).');
        return;
      }

      if (!confirm(`Tem certeza que deseja excluir o termo "${japaneseName}" do dicionário?`)) {
        return;
      }
      const glossary = window.TKST_AUTH ? window.TKST_AUTH.getCustomGlossary() : window.TKST_GLOSSARY;
      let actualCat = category;
      if (!actualCat || !glossary[actualCat]) {
        const cats = ['bases', 'defesas', 'socosGolpes', 'chutes', 'comandosEContagem'];
        for (const c of cats) {
          if ((glossary[c] || []).some(t => t.japanese.toLowerCase().trim() === (japaneseName || '').toLowerCase().trim())) {
            actualCat = c;
            break;
          }
        }
      }
      const res = window.TKST_AUTH.deleteGlossaryTerm(actualCat || category, japaneseName);
      if (res && res.success) {
        alert(`Termo "${japaneseName}" excluído com sucesso!`);
        renderGlossary();
      } else {
        alert((res && res.error) || 'Erro ao excluir termo.');
      }
    },

    openEditGlossaryTermModal: (categoryKey, japaneseName) => {
      if (!window.TKST_AUTH.isAdmin()) {
        alert('Acesso restrito ao Administrador Geral (Sensei Diego).');
        return;
      }

      const glossary = window.TKST_AUTH ? window.TKST_AUTH.getCustomGlossary() : window.TKST_GLOSSARY;
      let actualCat = categoryKey;
      let term = null;

      if (categoryKey && glossary[categoryKey]) {
        term = glossary[categoryKey].find(t => t.japanese.toLowerCase().trim() === (japaneseName || '').toLowerCase().trim());
      }
      if (!term) {
        const cats = ['bases', 'defesas', 'socosGolpes', 'chutes', 'comandosEContagem'];
        for (const c of cats) {
          const found = (glossary[c] || []).find(t => t.japanese.toLowerCase().trim() === (japaneseName || '').toLowerCase().trim());
          if (found) {
            term = found;
            actualCat = c;
            break;
          }
        }
      }

      if (!term) {
        alert('Termo não encontrado para edição.');
        return;
      }

      const modalTitle = document.getElementById('detailModalTitle');
      const modalBody = document.getElementById('detailModalBody');

      modalTitle.innerHTML = `<span><i class="fas fa-edit" style="color: var(--accent-gold);"></i> Editar Termo: ${term.japanese} (Admin)</span>`;

      modalBody.innerHTML = `
        <form onsubmit="event.preventDefault(); window.TKST_APP.submitEditGlossaryTerm('${actualCat}', '${term.japanese.replace(/'/g, "\\'")}');" style="display: flex; flex-direction: column; gap: 14px;">
          <div class="form-group">
            <label class="form-label" style="font-size: 0.82rem; margin-bottom: 4px;">
              <i class="fas fa-folder" style="color: var(--accent-gold); margin-right: 6px;"></i> Categoria:
            </label>
            <select id="editGlossaryCategory" class="form-input" required style="font-size: 0.88rem;">
              <option value="bases" ${actualCat === 'bases' ? 'selected' : ''}>Bases (Dachi)</option>
              <option value="defesas" ${actualCat === 'defesas' ? 'selected' : ''}>Defesas (Uke)</option>
              <option value="socosGolpes" ${actualCat === 'socosGolpes' ? 'selected' : ''}>Socos e Golpes (Tsuki/Uchi)</option>
              <option value="chutes" ${actualCat === 'chutes' ? 'selected' : ''}>Chutes (Geri)</option>
              <option value="comandosEContagem" ${actualCat === 'comandosEContagem' ? 'selected' : ''}>Comandos e Conceitos</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" style="font-size: 0.82rem; margin-bottom: 4px;">
              <i class="fas fa-language" style="color: var(--accent-gold); margin-right: 6px;"></i> Termo em Japonês (Romaji):
            </label>
            <input type="text" id="editGlossaryJapanese" class="form-input" required value="${term.japanese.replace(/"/g, '&quot;')}" style="font-size: 0.9rem; font-weight: 600;">
          </div>

          <div class="form-group">
            <label class="form-label" style="font-size: 0.82rem; margin-bottom: 4px;">
              <i class="fas fa-pen-fancy" style="color: var(--accent-gold); margin-right: 6px;"></i> Kanji / Ideogramas (Opcional):
            </label>
            <input type="text" id="editGlossaryKanji" class="form-input" value="${(term.kanji || '').replace(/"/g, '&quot;')}" style="font-size: 0.9rem; font-family: var(--font-kanji);">
          </div>

          <div class="form-group">
            <label class="form-label" style="font-size: 0.82rem; margin-bottom: 4px;">
              <i class="fas fa-align-left" style="color: var(--accent-gold); margin-right: 6px;"></i> Significado / Explicação:
            </label>
            <textarea id="editGlossaryMeaning" class="form-input" rows="3" required style="resize: vertical; font-size: 0.88rem;">${term.meaning.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
          </div>

          <!-- Upload de Imagem do Arquivo ou URL -->
          <div class="form-group">
            <label class="form-label" style="font-size: 0.82rem; margin-bottom: 4px;">
              <i class="fas fa-image" style="color: var(--accent-blue); margin-right: 6px;"></i> Imagem / Diagrama Ilustrado (Opcional):
            </label>
            
            <div id="editGlossaryImagePreviewBox" style="${(term.image) ? 'display: block;' : 'display: none;'} margin-bottom: 10px; background: rgba(0,0,0,0.4); border: 1px dashed var(--border-color); border-radius: var(--radius-sm); padding: 12px; text-align: center;">
              <img id="editGlossaryImagePreview" src="${(term.image || '')}" style="max-height: 180px; max-width: 100%; object-fit: contain; border-radius: 4px; margin-bottom: 8px;">
              <div>
                <button type="button" class="btn btn-sm btn-danger" onclick="window.TKST_APP.removeGlossaryImage('editGlossaryImagePreview', 'editGlossaryImage', 'editGlossaryFileInput')" style="font-size: 0.75rem; padding: 4px 10px;">
                  <i class="fas fa-trash"></i> Remover Imagem
                </button>
              </div>
            </div>

            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <label class="btn btn-secondary" style="font-size: 0.8rem; padding: 8px 12px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                <i class="fas fa-camera"></i> Escolher Foto do Arquivo
                <input type="file" accept="image/*" id="editGlossaryFileInput" style="display: none;" onchange="window.TKST_APP.handleGlossaryImageUpload(this, 'editGlossaryImagePreview', 'editGlossaryImage')">
              </label>
              <input type="text" id="editGlossaryImage" class="form-input" value="${(term.image || '').replace(/"/g, '&quot;')}" placeholder="Ou cole a URL da imagem (https://...)" oninput="window.TKST_APP.handleGlossaryImageUrl(this.value, 'editGlossaryImagePreview')" style="flex: 1; min-width: 180px; font-size: 0.82rem;">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" style="font-size: 0.82rem; margin-bottom: 4px;">
              <i class="fas fa-video" style="color: var(--accent-crimson); margin-right: 6px;"></i> URL do Vídeo / YouTube Embed (Opcional):
            </label>
            <input type="url" id="editGlossaryVideoUrl" class="form-input" value="${(term.videoUrl || '').replace(/"/g, '&quot;')}" placeholder="https://www.youtube.com/embed/... ou link de vídeo" style="font-size: 0.85rem;">
          </div>

          <div class="form-group">
            <label class="form-label" style="font-size: 0.82rem; margin-bottom: 4px;">
              <i class="fas fa-chalkboard-teacher" style="color: var(--accent-gold); margin-right: 6px;"></i> Instruções & Dicas do Sensei Diego (Opcional):
            </label>
            <textarea id="editGlossaryTips" class="form-input" rows="2" placeholder="Dicas de execução, foco no quadril, erros comuns..." style="resize: vertical; font-size: 0.85rem;">${(term.technicalTips || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
          </div>

          <div style="display: flex; gap: 10px; margin-top: 8px;">
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

    submitEditGlossaryTerm: (oldCategory, oldJapaneseName) => {
      if (!window.TKST_AUTH.isAdmin()) {
        alert('Acesso restrito ao Administrador Geral (Sensei Diego).');
        return;
      }

      const newCategory = document.getElementById('editGlossaryCategory').value;
      const japanese = document.getElementById('editGlossaryJapanese').value.trim();
      const kanji = document.getElementById('editGlossaryKanji').value.trim();
      const meaning = document.getElementById('editGlossaryMeaning').value.trim();
      const image = (document.getElementById('editGlossaryImage') && document.getElementById('editGlossaryImage').value.trim()) || '';
      const videoUrl = (document.getElementById('editGlossaryVideoUrl') && document.getElementById('editGlossaryVideoUrl').value.trim()) || '';
      const technicalTips = (document.getElementById('editGlossaryTips') && document.getElementById('editGlossaryTips').value.trim()) || '';

      if (!newCategory || !japanese || !meaning) {
        alert('Por favor, preencha o termo em japonês e o seu significado.');
        return;
      }

      const res = window.TKST_AUTH.updateGlossaryTerm(oldCategory, oldJapaneseName, newCategory, {
        japanese,
        kanji,
        meaning,
        image,
        videoUrl,
        technicalTips
      });

      if (res && res.success) {
        document.getElementById('detailModal').classList.remove('active');
        alert(`Termo "${japanese}" atualizado com sucesso no dicionário!`);
        renderGlossary();
      } else {
        alert((res && res.error) || 'Erro ao atualizar termo.');
      }
    },
    cancelModalEdit: () => {
      const modal = document.getElementById('detailModal');
      if (modal) {
        modal.removeAttribute('data-prevent-outside-close');
        modal.classList.remove('active');
      }
    }
  };

  // Close modals
  document.querySelectorAll('.modal-overlay').forEach(m => {
    m.addEventListener('click', (e) => {
      // Se clicou no fundo escuro fora da área do modal:
      if (e.target === m) {
        if (m.getAttribute('data-prevent-outside-close') === 'true' || m.querySelector('form')) {
          // Bloqueia fechamento acidental ao tocar fora da área durante edição de questões ou formulários!
          return;
        }
      }

      if (e.target === m || e.target.classList.contains('modal-close-btn') || e.target.closest('.modal-close-btn')) {
        m.removeAttribute('data-prevent-outside-close');
        m.classList.remove('active');
        const container = m.querySelector('#videoModalContainer');
        if (container) container.innerHTML = '';
        const iframes = m.querySelectorAll('iframe');
        iframes.forEach(f => {
          try {
            const src = f.src;
            f.src = '';
            setTimeout(() => { f.src = src; }, 100);
          } catch(e) {}
        });
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

  // Live presence auto-update when cloud syncs
  window.addEventListener('tkst_cloud_synced', () => {
    if (currentTab === 'admin') {
      renderAdminMaster();
    }
  });

  // Start
  init();
});
