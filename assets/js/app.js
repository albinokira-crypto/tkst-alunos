/**
 * TKST Alunos - Main Application Controller
 * Platform for Karate Shotokan studies with 26 Kata PDF guide, embedded video manager, Nick auth, and dynamic Dojo management.
 */

let deferredInstallPrompt = null;

function isAppInstalled() {
  try {
    const isStandalone = (window.matchMedia && (window.matchMedia('(display-mode: standalone)').matches || 
                                               window.matchMedia('(display-mode: fullscreen)').matches || 
                                               window.matchMedia('(display-mode: minimal-ui)').matches)) || 
                         window.navigator.standalone === true ||
                         (document.referrer && document.referrer.includes('android-app://')) ||
                         localStorage.getItem('tkst_pwa_installed') === 'true';
    return !!isStandalone;
  } catch (e) {
    return false;
  }
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
  let openStudySections = new Set(); // Inicia fechado por padrão; abre apenas ao clicar e permanece aberto até clicar novamente
  let kataSearchQuery = '';
  let glossaryCategory = 'all';
  let glossarySearchQuery = '';
  let authMode = 'student-login';
  let adminSubTab = 'students'; // 'students', 'pending', 'dojos', 'kata-videos', 'quizzes', 'files', 'questions', 'exam-generator'
  try {
    const savedSubTab = sessionStorage.getItem('tkst_admin_subtab');
    if (savedSubTab) adminSubTab = savedSubTab;
  } catch(e) {}
  let adminQuizSelectedKyu = 6;
  try {
    const savedKyu = sessionStorage.getItem('tkst_admin_quiz_kyu');
    if (savedKyu !== null && savedKyu !== undefined && !isNaN(parseInt(savedKyu, 10))) {
      adminQuizSelectedKyu = parseInt(savedKyu, 10);
    }
  } catch(e) {}
  let examGeneratorSelectedKyu = 6;
  let examGeneratorFormat = 'quiz'; // Modelo oficial de múltipla escolha
  let examPreviewGenerated = false; // false, 'exam', 'key'
  let examCurrentRandomQuestions = null; // 10 questões sorteadas ativas
  let examSelectedDojobookStudent = null; // Aluno selecionado do DojôBook para a prova
  let dojobookCandidatesCache = null; // Cache de alunos e candidatos do DojôBook
  let quizModalTempImage = '';

  // Camera Exam Scanner State removido permanentemente
  
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
  let quizTimeRemaining = 15;

  const mainContent = document.getElementById('mainContent');
  const breadcrumbCurrent = document.getElementById('breadcrumbCurrent');
  const navLinks = document.querySelectorAll('.nav-link, .mobile-nav-item');
  const detailModal = document.getElementById('detailModal');
  const videoModal = document.getElementById('videoModal');
  const sidebar = document.getElementById('sidebar');

  // Versão oficial do App exibida no Menu Lateral
  const APP_DISPLAY_VERSION = 'V-2.84';
  const appVersionBadgeEl = document.getElementById('appVersionBadge');
  if (appVersionBadgeEl) {
    appVersionBadgeEl.textContent = APP_DISPLAY_VERSION;
    appVersionBadgeEl.title = 'Versão atual V-2.84. Toque para atualizar e limpar cache.';
    appVersionBadgeEl.style.cursor = 'pointer';
    appVersionBadgeEl.onclick = () => {
      if (confirm('Deseja recarregar o aplicativo e limpar o cache para a versão mais recente (V-2.84)?')) {
        try {
          localStorage.removeItem('tkst_quiz_official_stamp');
        } catch(e) {}
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then(regs => {
            regs.forEach(r => r.unregister());
          });
        }
        if ('caches' in window) {
          caches.keys().then(names => Promise.all(names.map(name => caches.delete(name)))).then(() => {
            window.location.reload(true);
          }).catch(() => {
            window.location.reload(true);
          });
        } else {
          window.location.reload(true);
        }
      }
    };
  }

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

    const existingToasts = container.querySelectorAll('.tkst-toast-item');
    for (const t of existingToasts) {
      if (t.dataset.msg === message) {
        return; // Evita empilhamento de toasts idênticos na tela
      }
    }
    if (existingToasts.length >= 3) {
      try { container.removeChild(existingToasts[0]); } catch(e) {}
    }

    const toast = document.createElement('div');
    toast.className = 'tkst-toast-item';
    toast.dataset.msg = message;
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
  let lastQuizBankCount = 0;
  let lastQuizSyncToastTime = 0;
  window.addEventListener('tkst_quiz_bank_updated', (e) => {
    const count = (e.detail && e.detail.count) || (Array.isArray(window.TKST_QUIZ_BANK) ? window.TKST_QUIZ_BANK.length : 0);
    const now = Date.now();
    if (e.detail && e.detail.updated && (now - lastQuizSyncToastTime > 6000)) {
      lastQuizSyncToastTime = now;
      showToast(`📥 Questões sincronizadas em tempo real com o PC!`, 'success', 3000);
    } else if (count > 0 && count !== lastQuizBankCount && (now - lastQuizSyncToastTime > 15000)) {
      lastQuizBankCount = count;
      lastQuizSyncToastTime = now;
      showToast(`📥 Banco sincronizado: ${count} questões disponíveis!`, 'info', 3000);
    }
    if (activeTab === 'admin') {
      if (typeof renderAdminMaster === 'function') {
        renderAdminMaster();
      } else if (typeof renderAdminView === 'function') {
        renderAdminView();
      }
    } else if (activeTab === 'quiz' && !quizActive) {
      if (typeof renderQuiz === 'function') {
        renderQuiz();
      }
    }
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
      case 7:
      case 6: return "6º Kyu (Branca para Amarela)";
      case 5: return "5º Kyu (Amarela para Vermelha)";
      case 4: return "4º Kyu (Vermelha para Laranja)";
      case 3: return "3º Kyu (Laranja para Verde)";
      case 2: return "2º Kyu (Verde para Roxa)";
      case 1: return "1º Kyu (Roxa para Marrom)";
      case 0: return "1º Dan (Shodan)";
      case -1: return "2º Dan (Nidan)";
      case -2: return "3º Dan (Sandan)";
      default: return "6º Kyu (Branca para Amarela)";
    }
  }

  // =========================================================================
  // AUTOMATIC MARTIAL ARTS CONTEXTUAL DISTRACTOR GENERATOR FOR QUIZ
  // =========================================================================
  const KARATE_KNOWLEDGE_POOLS = {
    socos: [
      "Gyaku Tsuki", "Oi Tsuki", "Kizami Tsuki", "Tate Tsuki", "Ura Tsuki",
      "Kage Tsuki", "Yama Tsuki", "Morote Tsuki", "Mawashi Tsuki", "Heiko Tsuki",
      "Hasami Tsuki", "Uraken Uchi", "Tettsui Uchi", "Shuto Uchi", "Haito Uchi",
      "Haishu Uchi", "Empi Uchi", "Teisho Uchi", "Shihon Nukite", "Nukite",
      "Ippon Ken", "Nakadaka Ken", "Washide", "Kumade", "Awase Zuki"
    ],
    chutes: [
      "Mae Geri", "Mae Geri Keage", "Mae Geri Kekomi", "Mawashi Geri", "Yoko Geri Keage",
      "Yoko Geri Kekomi", "Ushiro Geri", "Ura Mawashi Geri", "Ushiro Mawashi Geri", "Mikazuki Geri",
      "Uchi Mikazuki Geri", "Fumikomi", "Tobi Geri", "Tobi Mae Geri", "Hiza Geri",
      "Nidan Geri", "Kakato Geri", "Ashi Barai", "Kizami Geri", "Fumikiri"
    ],
    defesas: [
      "Gedan Barai", "Age Uke", "Soto Uke", "Uchi Uke", "Shuto Uke",
      "Morote Uke", "Juji Uke", "Manji Uke", "Haishu Uke", "Kakiwake Uke",
      "Osae Uke", "Nagashi Uke", "Sukui Uke", "Teisho Uke", "Empi Uke",
      "Tate Shuto Uke", "Gedan Kake Uke", "Haiwan Uke", "Sokutei Osae Uke", "Kosa Uke"
    ],
    bases: [
      "Zenkutsu Dachi", "Kokutsu Dachi", "Kiba Dachi", "Fudo Dachi", "Sochin Dachi",
      "Neko Ashi Dachi", "Sanchin Dachi", "Hangetsu Dachi", "Musubi Dachi", "Heisoku Dachi",
      "Heiko Dachi", "Hachiji Dachi", "Shiko Dachi", "Kosa Dachi", "Renoji Dachi",
      "Teiji Dachi", "Tsuruashi Dachi", "Moroashi Dachi"
    ],
    katas: [
      "Heian Shodan", "Heian Nidan", "Heian Sandan", "Heian Yondan", "Heian Godan",
      "Tekki Shodan", "Tekki Nidan", "Tekki Sandan", "Bassai Dai", "Bassai Sho",
      "Kanku Dai", "Kanku Sho", "Jion", "Jitte", "Ji'in", "Enpi (Empi)", "Hangetsu",
      "Gankaku", "Sochin", "Meikyo", "Nijushiho", "Gojushiho Dai", "Gojushiho Sho",
      "Chinte", "Unsu", "Wankan", "Taikyoku Shodan"
    ],
    kumite: [
      "Gohon Kumite", "Sanbon Kumite", "Kihon Ippon Kumite", "Jiyu Ippon Kumite",
      "Jiyu Kumite", "Okuri Jiyu Ippon Kumite", "Kaeshi Ippon Kumite", "Shiai Kumite",
      "Yakusoku Kumite", "Kihon Ippon no Kata"
    ],
    alturas: [
      "Jodan (Alto / Cabeça)", "Chudan (Médio / Tronco)", "Gedan (Baixo / Cintura)",
      "Jodan (Nível da cabeça)", "Chudan (Nível do tórax)", "Gedan (Nível inferior)",
      "Suigetsu (Plexo solar)", "Tentei", "Myojo"
    ],
    comandos: [
      "Rei (Saudação)", "Yoi (Prontidão)", "Hajime (Começar)", "Yame (Parar)",
      "Mokuso (Meditação)", "Kiai (Grito de Energia)", "Zanshin (Alerta Contínuo)",
      "Kime (Foco e Decisão)", "Sensei ni Rei", "Otagai ni Rei", "Shomen ni Rei",
      "Seiza", "Kiritsu", "Mawate", "Naore", "Ippon", "Waza-ari", "Hikawake"
    ],
    armas: [
      "Seiken (Punho frontal)", "Uraken (Dorso do punho)", "Tettsui (Punho martelo)",
      "Shuto (Faca da mão)", "Haito (Borda interna)", "Teisho (Base da palma)",
      "Nukite (Ponta dos dedos)", "Koshi (Bola do pé)", "Kakato (Calcanhar)",
      "Sokuto (Faca do pé)", "Haisoku (Peito do pé)", "Empi (Cotovelo)", "Hiza (Joelho)"
    ],
    frases: [
      // Curtas (~18 a 30 caracteres)
      "Respeito acima de tudo",
      "Criar o intuito do esforço",
      "Buscar a perfeição do caráter",
      "Conter o espírito de agressão",
      "Caminho das mãos vazias",
      "Defesa pessoal tradicional",
      "Manter o centro de gravidade",
      "Ataque com velocidade máxima",
      "Ataque com rotação do quadril",
      "Defesa rápida no contra-ataque",
      "Fidelidade ao verdadeiro caminho",
      "Espírito de vigilância contínua",
      "Concentração total no alvo",
      "Equilíbrio firme e postura ereta",

      // Médias (~31 a 50 caracteres)
      "O karatê começa e termina com respeito mútuo",
      "Não existe primeiro ataque no karatê tradicional",
      "Manter a mente tranquila como água serena e calma",
      "Desenvolver harmonia perfeita entre corpo e mente",
      "Praticar com dedicação rigorosa e disciplina diária",
      "Pés paralelos alinhados com a largura dos ombros",
      "Calcanhares alinhados na mesma linha imaginária",
      "Pés afastados duas vezes a largura dos próprios ombros",
      "Manter a coluna reta e o abdômen contraído firmemente",
      "Golpe lateral penetrante com a faca externa do pé",
      "Ataque frontal em linha reta com rotação do punho",
      "Chute frontal com elevação rápida do joelho e extensão",
      "Bloqueio reforçado com o antebraço em apoio lateral",
      "Defesa com a faca da mão com cotovelo junto ao tronco",

      // Longas (~51 a 75 caracteres)
      "60% do peso na perna da frente e 40% na perna de trás",
      "70% do peso na perna de trás e 30% na perna da frente",
      "50% do peso distribuído igualmente em ambas as pernas",
      "80% do peso na perna de trás e 20% na perna da frente",
      "90% do peso na perna de trás e 10% na perna da frente",
      "Pé da frente apontado para frente e pé de trás aberto a 45 graus",
      "Pé de trás perpendicular ao pé da frente formando ângulo reto de 90°",
      "Joelhos flexionados para fora mantendo o centro de gravidade bem baixo",
      "Executado de fora para dentro na altura do tronco em nível Chudan",
      "Executado de dentro para fora na altura do tronco em nível Chudan",
      "Executado de baixo para cima na altura da cabeça em nível Jodan",
      "Executado em movimento descendente na altura baixa em nível Gedan",
      "Golpe desferido com o punho oposto à perna que avança na base",
      "Golpe desferido com o mesmo punho da perna que avança na base",
      "Impacto desferido com os dois nós frontais do punho fechado (Seiken)",
      "Movimento defensivo em cruz com ambos os punhos fechados firmemente",
      "Giro de quadril com transferência dinâmica de todo o peso corporal à frente"
    ]
  };

  function generateSemanticPhraseMutations(phrase) {
    const text = (phrase || '').trim();
    if (!text) return [];
    const mutations = [];

    // Swap frente <-> trás
    if (/\b(frente|tr[aá]s)\b/i.test(text)) {
      const swapped = text
        .replace(/\bfrente\b/gi, '___BACK___')
        .replace(/\btr[aá]s\b/gi, 'frente')
        .replace(/___BACK___/g, 'trás');
      if (swapped !== text) mutations.push(swapped);
    }

    // Swap dentro <-> fora
    if (/\b(dentro|fora)\b/i.test(text)) {
      const swapped = text
        .replace(/\bdentro\b/gi, '___OUT___')
        .replace(/\bfora\b/gi, 'dentro')
        .replace(/___OUT___/g, 'fora');
      if (swapped !== text) mutations.push(swapped);
    }

    // Swap cima <-> baixo
    if (/\b(cima|baixo)\b/i.test(text)) {
      const swapped = text
        .replace(/\bcima\b/gi, '___DOWN___')
        .replace(/\bbaixo\b/gi, 'cima')
        .replace(/___DOWN___/g, 'baixo');
      if (swapped !== text) mutations.push(swapped);
    }

    // Swap esquerda <-> direita
    if (/\b(esquerda|direita)\b/i.test(text)) {
      const swapped = text
        .replace(/\besquerda\b/gi, '___RIGHT___')
        .replace(/\bdireita\b/gi, 'esquerda')
        .replace(/___RIGHT___/g, 'direita');
      if (swapped !== text) mutations.push(swapped);
    }

    // Swap mesmo punho <-> punho oposto
    if (/mesmo punho/i.test(text)) {
      mutations.push(text.replace(/mesmo punho/gi, 'punho oposto'));
    } else if (/punho oposto/i.test(text)) {
      mutations.push(text.replace(/punho oposto/gi, 'mesmo punho'));
    }

    // Swap porcentagens de peso (ex: 70% / 30% -> 60% / 40%, 50% / 50%)
    const percentMatch = text.match(/(\d+)%.*?(\d+)%/);
    if (percentMatch) {
      const p1 = parseInt(percentMatch[1]);
      const p2 = parseInt(percentMatch[2]);
      const pairs = [[60, 40], [70, 30], [50, 50], [80, 20], [90, 10]].filter(([a, b]) => a !== p1 || b !== p2);
      pairs.forEach(([a, b]) => {
        let mut = text.replace(`${p1}%`, `${a}%`);
        mut = mut.replace(`${p2}%`, `${b}%`);
        if (mut !== text) mutations.push(mut);
      });
    }

    // Swap níveis de altura se presentes na frase
    if (/\b(jodan|chudan|gedan)\b/i.test(text)) {
      const lower = text.toLowerCase();
      if (lower.includes('jodan')) {
        mutations.push(text.replace(/jodan/gi, 'Chudan'));
        mutations.push(text.replace(/jodan/gi, 'Gedan'));
      } else if (lower.includes('chudan')) {
        mutations.push(text.replace(/chudan/gi, 'Jodan'));
        mutations.push(text.replace(/chudan/gi, 'Gedan'));
      } else if (lower.includes('gedan')) {
        mutations.push(text.replace(/gedan/gi, 'Chudan'));
        mutations.push(text.replace(/gedan/gi, 'Jodan'));
      }
    }

    return [...new Set(mutations)].filter(m => m !== text);
  }

  function detectKarateCategory(questionText, correctAnswer) {
    const cleanCorrect = (correctAnswer || '').trim();
    const cleanQuestion = (questionText || '').trim();
    const target = cleanCorrect.toLowerCase();
    const qTarget = cleanQuestion.toLowerCase();

    // 1. Detecta frase explicativa / conceitual na resposta correta
    const words = cleanCorrect ? cleanCorrect.split(/\s+/).filter(Boolean) : [];
    const hasPhraseMarkers = /\b(peso|perna|braço|cotovelo|ombros|graus|executado|movimento|linha|altura|frente|trás|dentro|fora|cima|baixo|paralelos|respeito|caráter|espírito|caminho|da razão|do esforço|de agressão|das mãos|por cento|%)\b/i.test(cleanCorrect);

    if (words.length >= 4 || (words.length >= 3 && (cleanCorrect.length >= 22 || hasPhraseMarkers))) {
      return 'frases';
    }

    // 2. Classificação técnica priorizando estritamente a resposta correta
    if (/\b(dachi|tachi)\b|base|postura/i.test(target)) return 'bases';
    if (/\b(geri|keri)\b|chute|pontap[eé]/i.test(target)) return 'chutes';
    if (/\b(barai|uke)\b|defes|bloque/i.test(target)) return 'defesas';
    if (/\b(tsuki|zuki|uchi|nukite)\b|soco|punch|golpe/i.test(target)) return 'socos';
    if (/\b(kata|heian|tekki|bassai|kanku|jion|jitte|ji'?in|empi|enpi|hangetsu|gankaku|sochin|meikyo|nijushiho|gojushiho|chinte|unsu|wankan|taikyoku)\b/i.test(target)) return 'katas';
    if (/\b(kumite|gohon|sanbon|ippon\s*kumite|jiyu|shiai)\b/i.test(target)) return 'kumite';
    if (/\b(jodan|chudan|gedan|suigetsu|hizasel|tentei)\b/i.test(target) && !/\b(uke|barai|geri|tsuki)\b/i.test(target)) return 'alturas';
    if (/\b(seiken|uraken|tettsui|shuto|haito|haishu|teisho|koshi|chusoku|kakato|sokuto|haisoku|hiji|hiza|washide|kumade)\b/i.test(target) && !/\b(uke|barai|geri|tsuki|dachi)\b/i.test(target)) return 'armas';
    if (/\b(rei|yoi|hajime|yame|mokuso|kiai|zanshin|kime|seiza|kiritsu|mawate|naore|yasume|waza-ari|hikawake)\b/i.test(target)) return 'comandos';

    // 3. Fallback: se a resposta não revelou a categoria, analisa a pergunta
    if (/\b(dachi|tachi)\b|base|postura|posição das pernas/i.test(qTarget)) return 'bases';
    if (/\b(geri|keri)\b|chute|chutar|pontap[eé]|perna/i.test(qTarget)) return 'chutes';
    if (/\b(barai|uke)\b|defes|bloque|defender|bloquear/i.test(qTarget)) return 'defesas';
    if (/\b(tsuki|zuki|uchi|nukite)\b|soco|socar|ataque de mão|golpe de punho|punho/i.test(qTarget)) return 'socos';
    if (/\b(kata|forma|heian|tekki|bassai|kanku|jion|jitte|jiin|empi|hangetsu|sochin)\b/i.test(qTarget)) return 'katas';
    if (/\b(kumite|luta|combate|gohon|sanbon|ippon)\b/i.test(qTarget)) return 'kumite';
    if (/altura|nível|jodan|chudan|gedan|suigetsu/i.test(qTarget)) return 'alturas';
    if (/comando|saudação|rei|yoi|hajime|yame|mokuso|kiai|ordem/i.test(qTarget)) return 'comandos';
    if (/arma|parte do corpo|mão|cotovelo|joelho|calcanhar|dedo|região/i.test(qTarget)) return 'armas';
    if (words.length >= 3 || cleanCorrect.length >= 20 || /significado|frase|filosofia|conceito|dojo kun/i.test(qTarget)) return 'frases';

    return null;
  }

  function generateSmartOptions(questionText, correctAnswer) {
    const cleanCorrect = (correctAnswer || '').trim();

    // 1. Tratador especial de números / contagens (ex: "26 movimentos", "21 passos")
    const matchNum = cleanCorrect.match(/^(\d+)\s*(.*)$/);
    const isMovementOrNumber = /movimento|passo|quantos|técnicas/i.test(questionText) || /movimento|passo|vez|vezes/i.test(cleanCorrect);

    if (matchNum && (isMovementOrNumber || matchNum[2])) {
      const num = parseInt(matchNum[1]);
      const suffix = matchNum[2] ? matchNum[2].trim() : 'movimentos';
      const cleanSuffix = suffix ? ' ' + suffix : ' movimentos';

      const offsets = [-2, 2, -4, 4, -3, 3, -5, 5, -1, 1];
      const distractors = [];
      for (const off of offsets) {
        const candidateNum = num + off;
        if (candidateNum > 0 && candidateNum !== num) {
          const optStr = `${candidateNum}${cleanSuffix}`;
          if (!distractors.includes(optStr) && optStr !== cleanCorrect) {
            distractors.push(optStr);
          }
        }
        if (distractors.length >= 3) break;
      }

      const allOptions = [cleanCorrect, ...distractors.slice(0, 3)].sort(() => 0.5 - Math.random());
      return {
        options: allOptions,
        correctIndex: allOptions.indexOf(cleanCorrect)
      };
    }

    // 2. Detecção precisa de categoria
    const category = detectKarateCategory(questionText, cleanCorrect);
    const normalize = str => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanNorm = normalize(cleanCorrect);
    const targetLen = cleanCorrect.length;
    const hasParentheses = /\(.*\)/.test(cleanCorrect);

    let candidatePool = [];

    // Se for frase, tenta mutações semânticas primeiro para obter tamanho idêntico
    if (category === 'frases') {
      const mutations = generateSemanticPhraseMutations(cleanCorrect);
      candidatePool.push(...mutations);
      if (KARATE_KNOWLEDGE_POOLS.frases) {
        candidatePool.push(...KARATE_KNOWLEDGE_POOLS.frases);
      }
    } else if (category && KARATE_KNOWLEDGE_POOLS[category]) {
      candidatePool = [...KARATE_KNOWLEDGE_POOLS[category]];
    }

    // Normaliza parênteses: se a resposta correta não tem parênteses, limpa os candidatos
    if (!hasParentheses && category !== 'frases') {
      candidatePool = candidatePool.map(item => item.replace(/\s*\([^)]*\)/g, '').trim());
    }

    // Fallback: se o pool for pequeno, puxa respostas do banco oficial que correspondam à categoria
    if (candidatePool.length < 5) {
      const defaultAnswers = (window.TKST_DEFAULT_QUIZ_BANK || [])
        .map(q => q.options ? q.options[q.correctIndex] : null)
        .filter(Boolean);
      candidatePool.push(...defaultAnswers);
    }

    // Filtra duplicatas e itens idênticos à resposta correta
    const filteredPool = candidatePool.filter(item => {
      if (!item) return false;
      const iNorm = normalize(item);
      return iNorm && iNorm !== cleanNorm && !iNorm.includes(cleanNorm) && !cleanNorm.includes(iNorm);
    });

    const uniqueCandidates = [...new Set(filteredPool)];

    // 3. Ordenação rigorosa por PROXIMIDADE DE TAMANHO (evita pista visual de resposta mais longa/curta)
    uniqueCandidates.sort((a, b) => {
      const diffA = Math.abs(a.length - targetLen);
      const diffB = Math.abs(b.length - targetLen);
      return diffA - diffB;
    });

    // Pega os candidatos mais próximos em tamanho e mistura levemente para variedade
    const bestCandidates = uniqueCandidates.slice(0, 8).sort(() => 0.5 - Math.random());
    const distractors = bestCandidates.slice(0, 3);

    // Fallback de emergência caso a categoria não tenha tido candidatos suficientes
    const emergencyPool = category === 'defesas'
      ? ["Age Uke", "Soto Uke", "Uchi Uke", "Gedan Barai", "Shuto Uke"]
      : category === 'chutes'
      ? ["Mae Geri", "Mawashi Geri", "Yoko Geri", "Ushiro Geri", "Hiza Geri"]
      : category === 'bases'
      ? ["Zenkutsu Dachi", "Kokutsu Dachi", "Kiba Dachi", "Fudo Dachi", "Sanchin Dachi"]
      : category === 'socos'
      ? ["Gyaku Tsuki", "Oi Tsuki", "Tate Tsuki", "Kizami Tsuki", "Uraken Uchi"]
      : category === 'frases'
      ? [
          "Desenvolver harmonia perfeita entre corpo e mente",
          "Manter a coluna reta e o abdômen contraído firmemente",
          "Golpe desferido com o punho oposto à perna que avança",
          "60% do peso na perna da frente e 40% na perna de trás"
        ]
      : ["Gyaku Tsuki", "Mae Geri", "Gedan Barai", "Zenkutsu Dachi"];

    emergencyPool.sort((a, b) => Math.abs(a.length - targetLen) - Math.abs(b.length - targetLen));

    for (const em of emergencyPool) {
      if (distractors.length >= 3) break;
      if (normalize(em) !== cleanNorm && !distractors.includes(em)) {
        distractors.push(em);
      }
    }

    const allOptions = [cleanCorrect, ...distractors.slice(0, 3)].sort(() => 0.5 - Math.random());
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

  function compressImageSource(src, maxWidth = 400, maxHeight = 400, quality = 0.62) {
    return new Promise((resolve) => {
      if (!src || typeof src !== 'string' || !src.trim()) {
        return resolve('');
      }
      const trimmed = src.trim();
      if (trimmed.startsWith('assets/')) {
        return resolve(trimmed);
      }

      // Se já for um data URL leve (< 35KB), não precisa reprocessar
      if (trimmed.startsWith('data:image/') && trimmed.length < 35000) {
        return resolve(trimmed);
      }

      // Timeout de segurança: se a imagem demorar mais de 1.2s, resolve com o src original
      const timeoutId = setTimeout(() => {
        resolve(trimmed);
      }, 1200);

      try {
        const img = new Image();
        // Apenas aplica crossOrigin para URLs externas http/https, nunca para data:
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
          img.crossOrigin = 'anonymous';
        }

        img.onload = function() {
          clearTimeout(timeoutId);
          try {
            const canvas = document.createElement('canvas');
            let width = img.width || img.naturalWidth || 400;
            let height = img.height || img.naturalHeight || 400;

            if (width > height) {
              if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
              }
            } else {
              if (height > maxHeight) {
                width = Math.round((width * maxHeight) / height);
                height = maxHeight;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);

            // Comprime para JPEG (~15KB-25KB)
            const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
            resolve(compressedDataUrl);
          } catch(canvasErr) {
            resolve(trimmed);
          }
        };

        img.onerror = function() {
          clearTimeout(timeoutId);
          resolve(trimmed);
        };

        img.src = trimmed;
      } catch (err) {
        clearTimeout(timeoutId);
        resolve(trimmed);
      }
    });
  }

  function compressQuizImage(file, callback) {
    if (!file || !file.type || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = function(e) {
      compressImageSource(e.target.result, 400, 400, 0.62).then(callback);
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
    let list = [];
    if (typeof videoEntry === 'string' && videoEntry.trim()) {
      list = [{
        id: 'vid_1',
        title: 'Vídeo Técnico Principal',
        description: 'Demonstração em vídeo do Kata.',
        url: videoEntry.trim()
      }];
    } else if (Array.isArray(videoEntry) && videoEntry.length > 0) {
      list = videoEntry.filter(v => v && v.url && v.url.trim()).map((v, i) => ({
        id: v.id || `vid_${i + 1}`,
        title: (v.title && v.title.trim()) || `Vídeo ${i + 1}`,
        description: (v.description && v.description.trim()) || '',
        url: v.url.trim()
      }));
    }

    // Se não houver vídeos customizados válidos, utiliza os vídeos técnicos oficiais padrão
    if (list.length === 0) {
      if (kata && window.TKST_DEFAULT_KATA_VIDEOS && window.TKST_DEFAULT_KATA_VIDEOS[kata.id]) {
        return window.TKST_DEFAULT_KATA_VIDEOS[kata.id];
      }
      if (kata && kata.youtubeUrl) {
        return [{
          id: 'default_1',
          title: 'Demonstração Oficial TKST',
          description: 'Vídeo técnico oficial com os movimentos e ritmo tradicional Shotokan.',
          url: kata.youtubeUrl
        }];
      }
      if (kata && (kata.videoUrl || kata.videoFileName)) {
        const defaultUrl = kata.videoUrl || ('videos/' + kata.videoFileName);
        return [{
          id: 'default_1',
          title: 'Demonstração Oficial TKST',
          description: 'Vídeo técnico oficial com os movimentos e ritmo tradicional Shotokan.',
          url: defaultUrl
        }];
      }
    }
    return list;
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

    // O registro do Service Worker com auto-update imediato é gerenciado no index.html (sw.js?v=258)

    // Auto-sincronização inicial com a nuvem (alunos e simulados)
    if (window.TKST_AUTH) {
      if (typeof window.TKST_AUTH.pullStudentsFromCloud === 'function') {
        window.TKST_AUTH.pullStudentsFromCloud().catch(() => {});
      }
      if (typeof window.TKST_AUTH.pullQuizSubmissionsFromCloud === 'function') {
        window.TKST_AUTH.pullQuizSubmissionsFromCloud().catch(() => {});
      }
    }

    // Atualiza automaticamente as telas de admin e ranking quando simulados forem sincronizados ou saneados
    window.addEventListener('tkst_submissions_updated', () => {
      try {
        if (typeof shouldSkipRerender === 'function' && shouldSkipRerender()) return;
        if (currentTab === 'admin' && typeof renderAdminMaster === 'function') {
          renderAdminMaster();
        } else if (currentTab === 'ranking' && typeof renderLeaderboard === 'function') {
          renderLeaderboard();
        }
      } catch(e) {}
    });

    // Fecha dropdown de autocomplete do DojôBook ao clicar fora
    document.addEventListener('click', (e) => {
      const dropdown = document.getElementById('examDojobookAutocompleteDropdown');
      const input = document.getElementById('examDojobookStudentSearch');
      if (dropdown && input && !dropdown.contains(e.target) && e.target !== input) {
        dropdown.style.display = 'none';
      }
      const modalDropdown = document.getElementById('modalDojobookAutocompleteDropdown');
      const modalInput = document.getElementById('modalDojobookStudentSearch');
      if (modalDropdown && modalInput && !modalDropdown.contains(e.target) && e.target !== modalInput) {
        modalDropdown.style.display = 'none';
      }
    });

    const user = window.TKST_AUTH.getCurrentUser();
    if (!user) {
      if (!window.location.hash) {
        history.replaceState({ tab: 'login' }, '', '#login');
      }
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
      // Preservar aba ativa (via hash da URL ou sessionStorage)
      let targetTab = 'dashboard';
      const validTabs = ['dashboard', 'admin', 'my-exam', 'katas', 'kumite', 'glossary', 'media', 'quiz', 'philosophy'];
      const rawHash = (window.location.hash || '').replace(/^#/, '').trim();
      let savedTab = null;
      try { savedTab = sessionStorage.getItem('tkst_active_tab'); } catch(e) {}

      if (rawHash && validTabs.includes(rawHash)) {
        targetTab = rawHash;
      } else if (savedTab && validTabs.includes(savedTab)) {
        targetTab = savedTab;
      }

      if (!window.location.hash || window.location.hash !== '#' + targetTab) {
        history.replaceState({ tab: targetTab }, '', '#' + targetTab);
      }
      switchTab(targetTab);
    }

    updateInstallPromptsVisibility();
  }

  // Setup Sidebar & Mobile Nav
  function setupNavigation() {
    const sidebarBackdrop = document.getElementById('sidebarBackdrop');

    const closeSidebar = () => {
      if (sidebar) sidebar.classList.remove('open');
      if (sidebarBackdrop) sidebarBackdrop.classList.remove('active');
    };

    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = link.getAttribute('data-tab');
        if (tab) {
          switchTab(tab);
          closeSidebar();
        }
      });
    });

    const menuBtn = document.getElementById('mobileMenuToggle');
    if (menuBtn && sidebar) {
      menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        sidebar.classList.toggle('open');
        if (sidebarBackdrop) {
          sidebarBackdrop.classList.toggle('active', sidebar.classList.contains('open'));
        }
      });
    }

    if (sidebarBackdrop) {
      sidebarBackdrop.addEventListener('click', () => {
        closeSidebar();
      });
    }

    // Fechar a aba lateral ao tocar/clicar em qualquer lugar fora dela
    document.addEventListener('click', (e) => {
      if (sidebar && sidebar.classList.contains('open')) {
        if (!sidebar.contains(e.target) && (!menuBtn || !menuBtn.contains(e.target))) {
          closeSidebar();
        }
      }
    });

    document.addEventListener('touchstart', (e) => {
      if (sidebar && sidebar.classList.contains('open')) {
        if (!sidebar.contains(e.target) && (!menuBtn || !menuBtn.contains(e.target))) {
          closeSidebar();
        }
      }
    }, { passive: true });
  }

  function switchTab(tabName) {
    if (currentTab === 'quiz' && quizActive && currentQuizQuestions.length > 0 && currentQuizIndex < currentQuizQuestions.length && tabName !== 'quiz') {
      const remainingCount = currentQuizQuestions.length - quizSubmissionDetails.length;
      const confirmExit = confirm(`⚠️ ATENÇÃO: Sair desta tela encerrará o simulado em andamento!\n\nAs ${remainingCount} questão(ões) restantes serão computadas como ERROS no Ranking Oficial (-1 ponto por erro).\n\nDeseja realmente sair?`);
      if (!confirmExit) {
        return;
      }
      exitQuiz(false);
    }

    if (tabName !== 'quiz') {
      if (quizTimerInterval) { clearInterval(quizTimerInterval); quizTimerInterval = null; }
      if (quizAutoAdvanceTimeout) { clearTimeout(quizAutoAdvanceTimeout); quizAutoAdvanceTimeout = null; }
      TKST_AUDIO.stopInterstellarTrack();
    }

    if (tabName !== 'dashboard') {
      if (typeof clearHomeSlideInterval === 'function') clearHomeSlideInterval();
    }

    const user = window.TKST_AUTH.getCurrentUser();

    // Guard: Require login for private tabs
    if (!user && tabName !== 'login' && tabName !== 'katas' && tabName !== 'glossary' && tabName !== 'philosophy' && tabName !== 'media') {
      tabName = 'login';
    }

    currentTab = tabName;
    try { sessionStorage.setItem('tkst_active_tab', tabName); } catch(e) {}
    navLinks.forEach(l => {
      if (l.getAttribute('data-tab') === tabName) {
        l.classList.add('active');
      } else {
        l.classList.remove('active');
      }
    });

    renderView(tabName);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Push state para o botão voltar do celular funcionar dentro do app
    const state = { tab: tabName, albumId: currentAlbumId, subAlbum: currentSubAlbumName };
    const hash = '#' + tabName;
    if (window.location.hash !== hash) {
      history.pushState(state, '', hash);
    }
  }

  // Listener do botão voltar do Android / iOS
  window.addEventListener('popstate', (e) => {
    // 1. Se lightbox de foto/vídeo estiver aberto, fecha o lightbox
    const lightbox = document.getElementById('mediaLightboxModal');
    if (lightbox && lightbox.classList.contains('active')) {
      closeMediaLightbox(false);
      return;
    }

    // 2. Se modal de criar/editar álbum estiver aberto, fecha o modal
    const albumModal = document.getElementById('createAlbumModal');
    if (albumModal && albumModal.classList.contains('active')) {
      closeCreateAlbumModal(false);
      return;
    }

    // 3. Se modal de mídia estiver aberto, fecha o modal
    const mediaModal = document.getElementById('adminMediaModal');
    if (mediaModal && mediaModal.classList.contains('active')) {
      closeAdminMediaModal(false);
      return;
    }

    // 4. Se menu lateral estiver aberto no mobile, fecha
    const sidebarEl = document.getElementById('sidebar');
    const backdropEl = document.getElementById('sidebarBackdrop');
    if (sidebarEl && sidebarEl.classList.contains('open')) {
      sidebarEl.classList.remove('open');
      if (backdropEl) backdropEl.classList.remove('active');
      return;
    }

    const state = e.state;
    if (!state) {
      // Estado vazio / inicial: se não estiver no dashboard/login, volta para o dashboard
      if (currentTab !== 'dashboard' && currentTab !== 'login') {
        switchTab(window.TKST_AUTH && window.TKST_AUTH.getCurrentUser() ? 'dashboard' : 'login');
      }
      return;
    }

    // Se estava em subálbum, volta para o álbum pai
    if (currentSubAlbumName && currentAlbumId) {
      currentSubAlbumName = null;
      renderMedia();
      return;
    }

    // Se estava dentro de um álbum específico na galeria, volta para lista de álbuns
    if (currentAlbumId && currentTab === 'media') {
      currentAlbumId = null;
      currentSubAlbumName = null;
      renderMedia();
      return;
    }

    // Navega para a aba do estado salvo
    const targetTab = state.tab || 'dashboard';
    if (targetTab !== currentTab) {
      currentTab = targetTab;
      navLinks.forEach(l => {
        l.classList.toggle('active', l.getAttribute('data-tab') === targetTab);
      });
      renderView(targetTab);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  function openAdminPanel(subTab) {
    if (subTab) {
      adminSubTab = subTab;
      try { sessionStorage.setItem('tkst_admin_subtab', subTab); } catch(e) {}
    } else {
      try {
        const savedSubTab = sessionStorage.getItem('tkst_admin_subtab');
        if (savedSubTab) adminSubTab = savedSubTab;
      } catch(e) {}
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
          <button class="btn" onclick="window.TKST_APP.openInviteModal()" style="font-size: 0.78rem; padding: 6px 11px; background: #25D366; color: #FFF; font-weight: 700; border: none; white-space: nowrap; box-shadow: 0 2px 8px rgba(37, 211, 102, 0.35);" title="Compartilhar Link de Acesso ou Convite de Cadastro via WhatsApp">
            <i class="fab fa-whatsapp"></i> <span>Acesso / Convite</span>
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

  function shouldSkipRerender() {
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT')) {
      return true;
    }
    // NEVER interrupt if user is actively taking a quiz or reviewing quiz results
    if (currentTab === 'quiz' && (quizActive || (currentQuizQuestions && currentQuizQuestions.length > 0 && currentQuizIndex >= currentQuizQuestions.length))) return true;
    const detailModal = document.getElementById('detailModal');
    if (detailModal && detailModal.classList.contains('active')) return true;
    const videoModal = document.getElementById('videoModal');
    if (videoModal && videoModal.classList.contains('active')) return true;
    const gradingModal = document.getElementById('examGradingReviewModal');
    if (gradingModal && gradingModal.classList.contains('active')) return true;
    return false;
  }

  function setupGlobalEvents() {

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
        if (currentTab === 'my-exam') {
          return;
        }
        renderView(currentTab);
      }
    });

    window.addEventListener('tkst_videos_updated', () => {
      if (!shouldSkipRerender() && currentTab === 'katas') {
        renderView(currentTab);
      }
    });

    window.addEventListener('tkst_glossary_updated', () => {
      if (!shouldSkipRerender() && currentTab === 'glossary') {
        renderGlossary();
      }
    });

    window.addEventListener('tkst_curriculum_updated', () => {
      if (!shouldSkipRerender()) {
        if (currentTab === 'my-exam') {
          renderMyExam();
        } else if (currentTab === 'dashboard') {
          renderDashboard();
        }
      }
    });

    window.addEventListener('tkst_submissions_updated', () => {
      if (!shouldSkipRerender()) {
        if (currentTab === 'dashboard') {
          renderDashboard();
        } else if (currentTab === 'admin' && adminSubTab === 'quizzes') {
          renderAdminMaster();
        }
      }
    });

    window.addEventListener('tkst_media_updated', () => {
      if (!shouldSkipRerender() && currentTab === 'media') {
        renderMedia();
      }
      if (typeof initHomePhotoSlide === 'function') {
        initHomePhotoSlide();
      }
    });

    window.addEventListener('tkst_albums_updated', () => {
      if (!shouldSkipRerender() && currentTab === 'media') {
        renderMedia();
      }
      if (typeof initHomePhotoSlide === 'function') {
        initHomePhotoSlide();
      }
    });

    window.addEventListener('tkst_subalbums_updated', () => {
      if (!shouldSkipRerender() && currentTab === 'media') {
        renderMedia();
      }
      if (typeof initHomePhotoSlide === 'function') {
        initHomePhotoSlide();
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
      case 'media':
        breadcrumbCurrent.textContent = 'Galeria Oficial TKST (Fotos & Vídeos)';
        renderMedia();
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
    const isMaster = window.TKST_AUTH ? window.TKST_AUTH.isMasterAdmin() : false;
    const canManageStudents = window.TKST_AUTH ? window.TKST_AUTH.canManageStudents() : false;
    const canManageCredentials = window.TKST_AUTH ? window.TKST_AUTH.canManageCredentials() : false;

    // Se um admin delegado tentar acessar subtab de alunos ou pendentes, redireciona para 'exam-generator'
    if (!canManageStudents && (adminSubTab === 'students' || adminSubTab === 'pending')) {
      adminSubTab = 'exam-generator';
    }

    function getStudentRegTime(s) {
      if (!s) return 0;
      if (s.createdAt) {
        const t = new Date(s.createdAt).getTime();
        if (!isNaN(t) && t > 0) return t;
      }
      if (s.approvedAt) {
        const t = new Date(s.approvedAt).getTime();
        if (!isNaN(t) && t > 0) return t;
      }
      if (s.startDate) {
        const t = new Date(s.startDate).getTime();
        if (!isNaN(t) && t > 0) return t;
      }
      const match = (s.id || '').match(/\d{12,14}/);
      if (match) {
        const t = parseInt(match[0], 10);
        if (!isNaN(t) && t > 0) return t;
      }
      if (s.updatedAt) {
        const t = typeof s.updatedAt === 'number' ? s.updatedAt : new Date(s.updatedAt).getTime();
        if (!isNaN(t) && t > 0) return t;
      }
      return 0;
    }

    const rawStudents = window.TKST_AUTH.getAllStudents();
    const students = [...rawStudents].sort((a, b) => {
      if (a.username === 'irons365') return -1;
      if (b.username === 'irons365') return 1;
      return getStudentRegTime(b) - getStudentRegTime(a);
    });

    const todayStudents = typeof window.TKST_AUTH.getTodayRegisteredStudents === 'function' 
      ? window.TKST_AUTH.getTodayRegisteredStudents() 
      : students.filter(s => {
          if (!s || s.username === 'irons365') return false;
          const regDate = s.createdAt ? s.createdAt.split('T')[0] : (s.approvedAt ? s.approvedAt.split('T')[0] : '');
          return regDate === new Date().toISOString().split('T')[0];
        });
    const pendingStudents = students.filter(s => s.status === 'pending');
    const approvedStudents = students.filter(s => s.status === 'approved');
    const adminUsers = students.filter(s => s.role === 'admin' || s.username === 'irons365');
    const customVideos = getCustomKataVideos();
    const dojos = window.TKST_AUTH.getDojos();
    const quizSubmissions = (window.TKST_AUTH ? window.TKST_AUTH.getAllQuizSubmissions() : [])
      .slice()
      .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
    const quizBankList = window.TKST_AUTH ? window.TKST_AUTH.getCustomQuizBank() : (window.TKST_QUIZ_BANK || []);
    const quizBankCount = quizBankList.length;
    const allMediaList = window.TKST_AUTH ? window.TKST_AUTH.getCustomMedia() : [];

    const currentExamMeta = (window.TKST_EXAM_GENERATOR && window.TKST_EXAM_GENERATOR.getExamData(examGeneratorSelectedKyu)) || { title: "Exame", targetBelt: "Faixa Amarela (6º Kyu)", kataName: "Heian Shodan", color: "#F5BE00" };
    let examPreviewHtml = '';
    if (examPreviewGenerated && window.TKST_EXAM_GENERATOR) {
      if (!examCurrentRandomQuestions) {
        examCurrentRandomQuestions = window.TKST_EXAM_GENERATOR.getRandomQuizQuestionsForKyu(examGeneratorSelectedKyu, 10);
      }
      let studentOptions = {};
      if (examSelectedDojobookStudent) {
        studentOptions = {
          studentName: examSelectedDojobookStudent.nome,
          studentId: examSelectedDojobookStudent.id,
          dojoName: examSelectedDojobookStudent.dojo_nome
        };
      } else {
        const typedStudent = (document.getElementById('examDojobookStudentSearch')?.value || window._examTypedStudentName || '').trim();
        if (typedStudent) {
          studentOptions = {
            studentName: typedStudent,
            studentId: 'std_typed_' + Date.now(),
            dojoName: 'TKST'
          };
        }
      }
      examPreviewHtml = window.TKST_EXAM_GENERATOR.buildQuizExamSheetHtml(examGeneratorSelectedKyu, examCurrentRandomQuestions, studentOptions);
    }

    let html = `
      <div class="section-header" style="margin-bottom: 20px; position: relative; overflow: hidden;">
        <!-- Subtle Transparent Emblem Watermark -->
        <img src="assets/images/logo-tkst-emblem-transp.png" alt="TKST Emblem" style="position: absolute; right: 10px; top: 10px; height: 75px; opacity: 0.12; pointer-events: none; object-fit: contain;">
        
        <div class="section-title-group" style="width: 100%; position: relative; z-index: 1;">
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 8px;">
            <div class="admin-badge-ribbon" style="margin-bottom: 0;">
              <i class="fas ${isMaster ? 'fa-crown' : 'fa-user-shield'}"></i> ${isMaster ? 'Painel Geral do Administrador (Sensei Diego)' : 'Painel do Administrador (Instrutor / Sensei)'}
            </div>
            <div style="display: inline-flex; align-items: center; gap: 6px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.35); color: #6EE7B7; padding: 4px 10px; border-radius: var(--radius-full); font-size: 0.72rem; font-weight: 700;">
              <i class="fas fa-cloud" style="color: #10B981;"></i> Nuvem Conectada (PC ⇄ Celular)
            </div>
          </div>
          <h3 style="font-size: 1.3rem; margin-bottom: 4px;">Gerenciamento Completo TKST</h3>
          <p style="font-size: 0.85rem; color: #94A3B8;">${isMaster ? 'Controle de alunos, credenciais de administradores, simulados, Dojos e vídeos dos 26 Kata.' : 'Gerenciamento de simulados, questões, dicionário japonês, Dojos e vídeos dos 26 Kata.'}</p>
        </div>

        <div style="display: flex; gap: 8px; flex-wrap: wrap; width: 100%; margin-top: 8px; position: relative; z-index: 1;">
          ${canManageStudents ? `
            <button class="btn" onclick="window.TKST_APP.openInviteModal()" style="font-size: 0.82rem; padding: 8px 14px; background: #25D366; color: #FFF; font-weight: 700; border: none; box-shadow: 0 4px 12px rgba(37, 211, 102, 0.3);">
              <i class="fab fa-whatsapp"></i> Convidar Aluno para Cadastro
            </button>
            <button class="btn btn-primary" onclick="window.TKST_APP.openManualStudentModal()" style="font-size: 0.82rem; padding: 8px 14px;">
              <i class="fas fa-user-plus"></i> Novo Aluno Manual
            </button>
          ` : ''}
          <button class="btn btn-secondary" onclick="window.TKST_APP.exportFullBackup()" style="font-size: 0.82rem; padding: 8px 14px;" title="Baixar arquivo JSON completo com questões, alunos e simulados">
            <i class="fas fa-download"></i> Exportar Backup JSON
          </button>
          <button class="btn btn-secondary" onclick="window.TKST_APP.importFullBackup()" style="font-size: 0.82rem; padding: 8px 14px; border-color: rgba(34, 197, 94, 0.4); color: #86EFAC;" title="Carregar arquivo JSON de backup do celular ou computador">
            <i class="fas fa-file-import"></i> Importar Backup JSON
          </button>
        </div>
      </div>

      <!-- Grid de Botões de Navegação da Área do Administrador -->
      <div style="margin-bottom: 22px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <h4 style="font-family: var(--font-heading); color: #FFF; font-size: 1.05rem; display: flex; align-items: center; gap: 8px; margin: 0;">
            <i class="fas fa-th-large" style="color: var(--accent-gold);"></i> Painel de Controle e Abas
          </h4>
          <span style="font-size: 0.75rem; color: #94A3B8;">Toque para abrir</span>
        </div>

        <div class="admin-nav-grid">
          ${canManageStudents ? `
            <button class="admin-nav-btn ${adminSubTab === 'students' ? 'active' : ''}" onclick="window.TKST_APP.setAdminSubTab('students')" title="Gerenciar Alunos Matriculados">
              <div class="admin-nav-btn-header">
                <div class="admin-nav-btn-icon" style="background: rgba(16, 185, 129, 0.18); border: 1px solid rgba(16, 185, 129, 0.4); color: #34D399;">
                  <i class="fas fa-users"></i>
                </div>
                <span class="admin-nav-btn-badge badge-verde">${students.length} Alunos</span>
              </div>
              <div class="admin-nav-btn-title">Alunos Matriculados</div>
              <div class="admin-nav-btn-desc">Cadastros, faixas, edição e credenciais</div>
            </button>

            ${pendingStudents.length > 0 ? `
              <button class="admin-nav-btn ${adminSubTab === 'pending' ? 'active' : ''}" onclick="window.TKST_APP.setAdminSubTab('pending')" style="border-color: rgba(239, 68, 68, 0.5); background: linear-gradient(145deg, rgba(239, 68, 68, 0.15), rgba(18, 23, 34, 0.95));" title="Aprovar Alunos Pendentes">
                <div class="admin-nav-btn-header">
                  <div class="admin-nav-btn-icon" style="background: rgba(239, 68, 68, 0.25); border: 1px solid rgba(239, 68, 68, 0.6); color: #F87171;">
                    <i class="fas fa-user-clock"></i>
                  </div>
                  <span class="admin-nav-btn-badge badge-vermelha" style="font-weight: 900;">${pendingStudents.length} Pendente(s)</span>
                </div>
                <div class="admin-nav-btn-title" style="color: #FCA5A5;">Aprovações Pendentes</div>
                <div class="admin-nav-btn-desc">Novos alunos aguardando liberação</div>
              </button>
            ` : ''}
          ` : ''}

          <button class="admin-nav-btn ${adminSubTab === 'kata-videos' ? 'active' : ''}" onclick="window.TKST_APP.setAdminSubTab('kata-videos')" title="Gerenciar Vídeos dos 26 Kata">
            <div class="admin-nav-btn-header">
              <div class="admin-nav-btn-icon" style="background: rgba(255, 183, 3, 0.18); border: 1px solid rgba(255, 183, 3, 0.4); color: #FFB703;">
                <i class="fas fa-video"></i>
              </div>
              <span class="admin-nav-btn-badge badge-amarela">26 Katas</span>
            </div>
            <div class="admin-nav-btn-title">Vídeos dos 26 Kata</div>
            <div class="admin-nav-btn-desc">Links oficiais do YouTube e mídias</div>
          </button>

          <button class="admin-nav-btn ${adminSubTab === 'questions' ? 'active' : ''}" onclick="window.TKST_APP.setAdminSubTab('questions')" title="Banco de Questões Teóricas">
            <div class="admin-nav-btn-header">
              <div class="admin-nav-btn-icon" style="background: rgba(56, 189, 248, 0.18); border: 1px solid rgba(56, 189, 248, 0.4); color: #38BDF8;">
                <i class="fas fa-question-circle"></i>
              </div>
              <span class="admin-nav-btn-badge" style="background: rgba(56, 189, 248, 0.2); color: #7DD3FC; border: 1px solid rgba(56, 189, 248, 0.4);">${quizBankCount} Questões</span>
            </div>
            <div class="admin-nav-btn-title">Banco de Questões</div>
            <div class="admin-nav-btn-desc">Perguntas, respostas e ilustrações</div>
          </button>

          <button class="admin-nav-btn ${adminSubTab === 'exam-generator' ? 'active' : ''}" onclick="window.TKST_APP.setAdminSubTab('exam-generator')" title="Gerador de Provas e Gabaritos em PDF">
            <div class="admin-nav-btn-header">
              <div class="admin-nav-btn-icon" style="background: rgba(245, 190, 0, 0.2); border: 1px solid rgba(245, 190, 0, 0.5); color: #FFD166;">
                <i class="fas fa-file-pdf"></i>
              </div>
              <span class="admin-nav-btn-badge badge-amarela">Gerador A4</span>
            </div>
            <div class="admin-nav-btn-title">Provas & Gabaritos PDF</div>
            <div class="admin-nav-btn-desc">Criar e imprimir exames em A4/Paisagem</div>
          </button>

          <button class="admin-nav-btn ${adminSubTab === 'quizzes' ? 'active' : ''}" onclick="window.TKST_APP.setAdminSubTab('quizzes')" title="Provas e Simulados Realizados">
            <div class="admin-nav-btn-header">
              <div class="admin-nav-btn-icon" style="background: rgba(167, 139, 250, 0.18); border: 1px solid rgba(167, 139, 250, 0.4); color: #C4B5FD;">
                <i class="fas fa-clipboard-check"></i>
              </div>
              <span class="admin-nav-btn-badge" style="background: rgba(167, 139, 250, 0.2); color: #DDD6FE; border: 1px solid rgba(167, 139, 250, 0.4);">${quizSubmissions.length} Feitos</span>
            </div>
            <div class="admin-nav-btn-title">Provas & Simulados</div>
            <div class="admin-nav-btn-desc">Histórico de provas, notas e ranking</div>
          </button>

          <button class="admin-nav-btn ${adminSubTab === 'dojos' ? 'active' : ''}" onclick="window.TKST_APP.setAdminSubTab('dojos')" title="Gerenciar Dojos e Unidades">
            <div class="admin-nav-btn-header">
              <div class="admin-nav-btn-icon" style="background: rgba(251, 113, 133, 0.18); border: 1px solid rgba(251, 113, 133, 0.4); color: #FDA4AF;">
                <i class="fas fa-torii-gate"></i>
              </div>
              <span class="admin-nav-btn-badge" style="background: rgba(251, 113, 133, 0.2); color: #FECDD3; border: 1px solid rgba(251, 113, 133, 0.4);">${dojos.length} Dojos</span>
            </div>
            <div class="admin-nav-btn-title">Dojos / Unidades</div>
            <div class="admin-nav-btn-desc">Polos e academias de treino</div>
          </button>

          <button class="admin-nav-btn ${adminSubTab === 'media' ? 'active' : ''}" onclick="window.TKST_APP.setAdminSubTab('media')" title="Gerenciar Fotos & Vídeos da Galeria">
            <div class="admin-nav-btn-header">
              <div class="admin-nav-btn-icon" style="background: rgba(230, 57, 70, 0.2); border: 1px solid rgba(230, 57, 70, 0.4); color: #FF808A;">
                <i class="fas fa-photo-video"></i>
              </div>
              <span class="admin-nav-btn-badge" style="background: rgba(230, 57, 70, 0.2); color: #FF808A; border: 1px solid rgba(230, 57, 70, 0.4);">${allMediaList.length} Mídias</span>
            </div>
            <div class="admin-nav-btn-title">Galeria de Mídia</div>
            <div class="admin-nav-btn-desc">Fotos de exames, treinos e vídeos</div>
          </button>

          <button class="admin-nav-btn ${adminSubTab === 'files' ? 'active' : ''}" onclick="window.TKST_APP.setAdminSubTab('files')" title="Central de Arquivos e Mídias">
            <div class="admin-nav-btn-header">
              <div class="admin-nav-btn-icon" style="background: rgba(96, 165, 250, 0.18); border: 1px solid rgba(96, 165, 250, 0.4); color: #93C5FD;">
                <i class="fas fa-folder-open"></i>
              </div>
              <span class="admin-nav-btn-badge" style="background: rgba(96, 165, 250, 0.2); color: #BFDBFE; border: 1px solid rgba(96, 165, 250, 0.4);">Downloads</span>
            </div>
            <div class="admin-nav-btn-title">Arquivos & Mídias</div>
            <div class="admin-nav-btn-desc">Apostilas, logos e regulamentos</div>
          </button>

          <button class="admin-nav-btn" onclick="window.TKST_APP.navigateTo('glossary')" title="Gerenciar Dicionário Japonês">
            <div class="admin-nav-btn-header">
              <div class="admin-nav-btn-icon" style="background: rgba(244, 63, 94, 0.18); border: 1px solid rgba(244, 63, 94, 0.4); color: #FB7185;">
                <i class="fas fa-book-bookmark"></i>
              </div>
              <span class="admin-nav-btn-badge" style="background: rgba(244, 63, 94, 0.2); color: #FDA4AF; border: 1px solid rgba(244, 63, 94, 0.4);">Termos</span>
            </div>
            <div class="admin-nav-btn-title">Dicionário Japonês</div>
            <div class="admin-nav-btn-desc">Termos, áudios, ilustrações e exclusão</div>
          </button>
        </div>
      </div>

      <!-- Banner Indicador da Aba Ativa -->
      ${adminSubTab ? `
        <div class="admin-active-tab-banner">
          <div style="display: flex; align-items: center; gap: 9px; min-width: 0;">
            <i class="${adminSubTab === 'students' ? 'fas fa-users' : (adminSubTab === 'media' ? 'fas fa-photo-video' : (adminSubTab === 'kata-videos' ? 'fas fa-video' : (adminSubTab === 'questions' ? 'fas fa-question-circle' : (adminSubTab === 'exam-generator' ? 'fas fa-file-pdf' : (adminSubTab === 'quizzes' ? 'fas fa-clipboard-check' : (adminSubTab === 'dojos' ? 'fas fa-torii-gate' : (adminSubTab === 'files' ? 'fas fa-folder-open' : 'fas fa-user-clock')))))))}" style="color: var(--accent-gold); font-size: 1.1rem; flex-shrink: 0;"></i>
            <span style="font-weight: 800; color: #FFF; font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${adminSubTab === 'students' ? 'Alunos Matriculados' : (adminSubTab === 'media' ? 'Galeria Oficial TKST (Fotos & Vídeos)' : (adminSubTab === 'kata-videos' ? 'Vídeos dos 26 Kata' : (adminSubTab === 'questions' ? 'Banco de Questões Teóricas' : (adminSubTab === 'exam-generator' ? 'Gerador de Provas & Gabaritos PDF' : (adminSubTab === 'quizzes' ? 'Provas & Simulados Realizados' : (adminSubTab === 'dojos' ? 'Dojos & Unidades TKST' : (adminSubTab === 'files' ? 'Arquivos & Mídias para Download' : 'Solicitações de Cadastro Pendentes')))))))}
            </span>
            <span class="badge badge-verde" style="font-size: 0.68rem; padding: 2px 7px; flex-shrink: 0;">Aba Aberta</span>
          </div>
          <button class="btn btn-sm btn-secondary" onclick="window.TKST_APP.setAdminSubTab(null)" style="font-size: 0.75rem; padding: 5px 12px; border-radius: 6px; flex-shrink: 0;" title="Recolher e fechar aba">
            <i class="fas fa-times"></i> Fechar Aba
          </button>
        </div>
      ` : `
        <div style="text-align: center; padding: 32px 18px; background: rgba(18, 23, 34, 0.65); border: 1.5px dashed rgba(255, 183, 3, 0.3); border-radius: var(--radius-lg); margin-top: 6px; margin-bottom: 24px;">
          <i class="fas fa-hand-pointer" style="font-size: 2.2rem; color: var(--accent-gold); margin-bottom: 12px; display: inline-block;"></i>
          <h4 style="font-family: var(--font-heading); color: #FFF; font-size: 1.1rem; margin-bottom: 4px;">Selecione uma opção acima para abrir</h4>
          <p style="font-size: 0.85rem; color: #94A3B8; margin: 0 auto; max-width: 440px;">
            Clique nos botões do menu acima (Alunos, Kata, Questões, Provas PDF, etc.) para abrir o gerenciador desejado.
          </p>
        </div>
      `}

      ${adminSubTab === 'pending' ? `
        <!-- PENDING STUDENTS APPROVAL LIST -->
        <div class="admin-table-container">
          <div class="admin-accordion-header" onclick="window.TKST_APP.togglePendingAccordion()" style="cursor: pointer; padding: 14px 16px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; user-select: none;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <i class="fas fa-user-clock" style="color: var(--accent-gold); font-size: 1.1rem;"></i>
              <div>
                <h4 style="font-family: var(--font-heading); color: #FFF; font-size: 1.05rem; margin: 0;">
                  Solicitações de Cadastro Pendentes
                </h4>
                <div style="font-size: 0.78rem; color: #94A3B8;">${pendingStudents.length} aguardando liberação do Sensei</div>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="badge badge-amarela" id="pendingToggleBadge" style="font-size: 0.76rem; padding: 4px 9px;">
                <i class="fas fa-chevron-up" id="pendingChevronIcon" style="transition: transform 0.3s ease; margin-right: 4px;"></i> Toque para Recolher
              </span>
            </div>
          </div>

          <div id="pendingAccordionBody" style="display: block;">
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
                          <button class="btn btn-sm btn-primary" onclick="window.TKST_APP.openEditStudentModal('${s.id}')" title="Editar / Alterar Senha" style="font-size: 0.78rem; padding: 6px 10px;">
                            <i class="fas fa-edit"></i> Editar
                          </button>
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

                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; margin-top: 4px;">
                      <button class="btn btn-sm btn-primary" onclick="window.TKST_APP.openEditStudentModal('${s.id}')" style="justify-content: center; font-weight: 700; padding: 8px 6px; font-size: 0.76rem;">
                        <i class="fas fa-edit"></i> Editar
                      </button>
                      <button class="btn btn-sm btn-success" onclick="window.TKST_APP.approveStudent('${s.id}')" style="justify-content: center; font-weight: 700; padding: 8px 6px; font-size: 0.76rem;">
                        <i class="fas fa-check"></i> Aceitar
                      </button>
                      <button class="btn btn-sm btn-danger" onclick="window.TKST_APP.rejectStudent('${s.id}')" style="justify-content: center; font-weight: 700; padding: 8px 6px; font-size: 0.76rem;">
                        <i class="fas fa-times"></i> Recusar
                      </button>
                    </div>
                  </div>
                `;}).join('')}
              </div>
            `}
          </div>
        </div>
      ` : ''}

      ${adminSubTab === 'students' ? `
        <!-- ALL REGISTERED STUDENTS TABLE -->
        <div class="admin-table-container">
          <div class="admin-accordion-header" onclick="window.TKST_APP.toggleStudentsAccordion()" style="cursor: pointer; padding: 14px 16px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; user-select: none;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <i class="fas fa-users" style="color: var(--accent-gold); font-size: 1.15rem;"></i>
              <div>
                <h4 style="font-family: var(--font-heading); color: #FFF; font-size: 1.05rem; margin: 0;">
                  Base de Alunos e Praticantes Cadastrados
                </h4>
                <div style="font-size: 0.78rem; color: #94A3B8;">Total de ${students.length} praticantes cadastrados</div>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="badge badge-gold" id="studentsToggleBadge" style="font-size: 0.76rem; padding: 4px 9px;">
                <i class="fas fa-chevron-up" id="studentsChevronIcon" style="transition: transform 0.3s ease; margin-right: 4px;"></i> Toque para Recolher
              </span>
            </div>
          </div>

          <div id="studentsAccordionBody" style="display: block;">
            <!-- Tabela para Desktop / Telas Grandes -->
            <table class="admin-table admin-table-desktop">
              <thead>
                <tr>
                  <th>Aluno</th>
                  <th>Login (Matrícula)</th>
                  <th>Presença</th>
                  <th>Credencial</th>
                  <th>Status</th>
                  <th>Faixa</th>
                  <th>Dojo / Unidade</th>
                  <th>Data de Cadastro</th>
                  <th style="text-align: right;">Ações</th>
                </tr>
              </thead>
              <tbody>
                ${students.map(s => {
                  const isMaster = s.username === 'irons365';
                  const isAdminRole = s.role === 'admin' || isMaster;
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
                        ${isMaster ? `
                          <span class="badge" style="background: linear-gradient(135deg, #FFB703, #FB8500); color: #000; font-weight: 800; border: 1px solid #FFB703;">
                            <i class="fas fa-crown"></i> Sensei Master
                          </span>
                        ` : isAdminRole ? `
                          <span class="badge" style="background: rgba(255, 183, 3, 0.15); color: #FFB703; font-weight: 700; border: 1px solid rgba(255, 183, 3, 0.4);">
                            <i class="fas fa-user-shield"></i> Administrador
                          </span>
                        ` : `
                          <span class="badge badge-cinza" style="font-size: 0.72rem;">
                            🥋 Aluno
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
                      <td style="color: #94A3B8; font-size: 0.8rem; white-space: nowrap;">
                        <i class="fas fa-calendar-alt" style="color: var(--accent-gold); margin-right: 4px;"></i>
                        ${getStudentRegTime(s) ? new Date(getStudentRegTime(s)).toLocaleDateString('pt-BR') : (s.startDate || '-')}
                      </td>
                      <td style="text-align: right;">
                        <div style="display: inline-flex; gap: 6px; justify-content: flex-end; align-items: center;">
                          ${isMaster ? '' : `
                            <button class="btn btn-sm ${isAdminRole ? 'btn-secondary' : 'btn-outline'}" onclick="window.TKST_APP.toggleAdminRole('${s.id}', '${isAdminRole ? 'aluno' : 'admin'}')" style="font-size: 0.74rem; padding: 6px 8px; font-weight: 700; ${isAdminRole ? 'color: #F87171; border-color: rgba(248,113,113,0.4);' : 'color: #FACC15; border-color: rgba(250,204,21,0.5);'}" title="${isAdminRole ? 'Remover privilégio de Administrador' : 'Conceder credencial de Administrador'}">
                              <i class="fas ${isAdminRole ? 'fa-user-minus' : 'fa-user-shield'}"></i> ${isAdminRole ? 'Tirar Admin' : 'Tornar Admin'}
                            </button>
                          `}
                          <button class="btn btn-sm btn-primary" onclick="window.TKST_APP.openEditStudentModal('${s.id}')" style="font-size: 0.78rem; padding: 6px 10px;" title="Editar Cadastro / Alterar Senha">
                            <i class="fas fa-user-edit"></i> Editar
                          </button>
                          ${isMaster ? '' : `
                            <button class="btn btn-sm btn-danger" onclick="window.TKST_APP.deleteStudent('${s.id}', '${(s.name || '').replace(/'/g, "\\'")}')" style="font-size: 0.78rem; padding: 6px 10px;" title="Excluir Aluno">
                              <i class="fas fa-trash"></i>
                            </button>
                          `}
                        </div>
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
                const isAdminRole = s.role === 'admin' || isMaster;
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
                      ${isMaster ? `
                        <span class="badge" style="background: linear-gradient(135deg, #FFB703, #FB8500); color: #000; font-weight: 800; font-size: 0.72rem;">
                          <i class="fas fa-crown"></i> Master
                        </span>
                      ` : isAdminRole ? `
                        <span class="badge" style="background: rgba(255, 183, 3, 0.15); color: #FFB703; font-weight: 700; font-size: 0.72rem; border: 1px solid rgba(255, 183, 3, 0.4);">
                          <i class="fas fa-user-shield"></i> Admin
                        </span>
                      ` : `
                        <span class="badge badge-cinza" style="font-size: 0.72rem;">🥋 Aluno</span>
                      `}
                      <span class="badge ${getBeltBadgeClass(s.currentBelt)}" style="font-size: 0.74rem;">${s.currentBelt}</span>
                      <span class="badge ${s.status === 'approved' ? 'badge-status-approved' : s.status === 'pending' ? 'badge-status-pending' : 'badge-status-rejected'}" style="font-size: 0.72rem;">
                        ${s.status === 'approved' ? 'Ativo' : s.status === 'pending' ? 'Pendente' : 'Recusado'}
                      </span>
                      <div style="font-size: 0.78rem; color: #CBD5E1; display: flex; align-items: center; gap: 4px; margin-left: auto;">
                        <i class="fas fa-torii-gate" style="color: var(--accent-gold);"></i> ${s.dojo}
                      </div>
                    </div>

                    <div style="font-size: 0.74rem; color: #94A3B8; margin: -2px 0 6px 4px; display: flex; align-items: center; gap: 4px;">
                      <i class="fas fa-calendar-alt" style="color: var(--accent-gold);"></i> Cadastrado em: <strong>${getStudentRegTime(s) ? new Date(getStudentRegTime(s)).toLocaleDateString('pt-BR') : (s.startDate || '-')}</strong>
                    </div>

                    <div style="display: grid; grid-template-columns: ${isMaster ? '1fr' : '1fr 1fr 1fr'}; gap: 6px; margin-top: 6px;">
                      <button class="btn btn-sm btn-primary" onclick="window.TKST_APP.openEditStudentModal('${s.id}')" style="justify-content: center; font-size: 0.78rem; padding: 7px 8px; font-weight: 700;" title="Editar Cadastro / Alterar Senha">
                        <i class="fas fa-user-edit"></i> Editar
                      </button>
                      ${isMaster ? '' : `
                        <button class="btn btn-sm ${isAdminRole ? 'btn-secondary' : 'btn-outline'}" onclick="window.TKST_APP.toggleAdminRole('${s.id}', '${isAdminRole ? 'aluno' : 'admin'}')" style="justify-content: center; font-size: 0.75rem; padding: 7px 6px; font-weight: 700; ${isAdminRole ? 'color: #F87171;' : 'color: #FACC15;'}" title="${isAdminRole ? 'Remover Admin' : 'Tornar Admin'}">
                          <i class="fas ${isAdminRole ? 'fa-user-minus' : 'fa-user-shield'}"></i> ${isAdminRole ? 'Revogar' : 'Admin'}
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="window.TKST_APP.deleteStudent('${s.id}', '${(s.name || '').replace(/'/g, "\\'")}')" style="justify-content: center; font-size: 0.78rem; padding: 7px 8px;" title="Excluir Aluno">
                          <i class="fas fa-trash"></i>
                        </button>
                      `}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
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

      ${adminSubTab === 'media' ? `
        <!-- MEDIA GALLERY MANAGEMENT -->
        <div class="admin-table-container">
          <div style="padding: 14px 16px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
            <div>
              <h4 style="color: #FFF; font-family: var(--font-heading); margin: 0; font-size: 1.05rem;">
                <i class="fas fa-photo-video" style="color: var(--accent-gold); margin-right: 8px;"></i>
                Acervo de Fotos & Vídeos da Galeria (${allMediaList.length})
              </h4>
              <p style="font-size: 0.78rem; color: #94A3B8; margin: 4px 0 0 0;">
                Gerencie fotos de exames, treinos e vídeos técnicos. As mídias aparecem diretamente no app para todos os alunos.
              </p>
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <button type="button" class="btn btn-gold btn-sm" onclick="window.TKST_APP.openAddMediaModal()" style="font-weight: 700; display: inline-flex; align-items: center; gap: 6px;">
                <i class="fas fa-plus-circle"></i> Cadastrar Nova Mídia
              </button>
            </div>
          </div>

          <div style="padding: 16px; display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px;">
            ${allMediaList.length === 0 ? `
              <div style="grid-column: 1 / -1; text-align: center; padding: 30px; color: #94A3B8;">
                Nenhuma foto ou vídeo cadastrado no momento.
              </div>
            ` : allMediaList.map(m => `
              <div style="background: rgba(18, 23, 34, 0.85); border: 1px solid var(--border-color); border-radius: var(--radius-sm); overflow: hidden; display: flex; flex-direction: column;">
                <div style="position: relative; width: 100%; aspect-ratio: 16/9; background: #000; overflow: hidden;">
                  <img src="${m.thumbUrl || m.url}" alt="${escapeHtml(m.title)}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='assets/images/logo-tkst-2.jpg'">
                  <span class="badge ${m.type === 'video' ? 'badge-vermelha' : 'badge-verde'}" style="position: absolute; top: 6px; left: 6px;">
                    ${m.type === 'video' ? '🎬 Vídeo' : '📷 Foto'}
                  </span>
                  <span style="position: absolute; bottom: 6px; right: 6px; background: rgba(0,0,0,0.7); font-size: 0.65rem; color: #FFF; padding: 2px 6px; border-radius: 3px;">
                    ${m.category}
                  </span>
                </div>
                <div style="padding: 10px; flex: 1; display: flex; flex-direction: column;">
                  <div style="font-weight: 700; color: #FFF; font-size: 0.85rem; margin-bottom: 4px;">${escapeHtml(m.title)}</div>
                  <div style="font-size: 0.72rem; color: #94A3B8; margin-bottom: 8px;">
                    ${m.date || ''} • ${escapeHtml(m.dojo || 'TKST')}
                  </div>
                  <div style="display: flex; gap: 6px; margin-top: auto; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 8px;">
                    <button type="button" class="btn btn-secondary btn-sm" onclick="window.TKST_APP.openMediaLightbox('${m.id}')" style="flex: 1; font-size: 0.72rem; padding: 4px 8px;" title="Ver no App sem sair">
                      <i class="fas fa-eye"></i> Ver
                    </button>
                    <button type="button" class="btn btn-secondary btn-sm" onclick="window.TKST_APP.downloadMediaFile('${m.url}', '${escapeHtml(m.title)}', '${m.type}')" style="font-size: 0.72rem; padding: 4px 8px; color: #34D399;" title="Baixar">
                      <i class="fas fa-download"></i>
                    </button>
                    <button type="button" class="btn btn-secondary btn-sm" onclick="window.TKST_APP.openEditMediaModal('${m.id}')" style="font-size: 0.72rem; padding: 4px 8px; color: var(--accent-gold);" title="Editar">
                      <i class="fas fa-edit"></i>
                    </button>
                    <button type="button" class="btn btn-secondary btn-sm" onclick="window.TKST_APP.deleteMediaItemConfirm('${m.id}')" style="font-size: 0.72rem; padding: 4px 8px; color: #F87171;" title="Excluir">
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              </div>
            `).join('')}
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
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <button type="button" class="btn btn-sm btn-gold" onclick="window.TKST_APP.openExamCameraScanner()" style="font-size: 0.78rem; padding: 6px 14px; font-weight: 800; background: #F5BE00; color: #000; border: none; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 8px rgba(245, 190, 0, 0.35);" title="Corrigir Prova com Câmera ou Scanner OMR">
                <i class="fas fa-camera"></i> Corrigir com Câmera / OMR
              </button>
              <button type="button" class="btn btn-sm btn-outline" onclick="window.TKST_AUTH.pullQuizSubmissionsFromCloud().then(() => renderAdminMaster())" style="font-size: 0.78rem; padding: 6px 12px; color: var(--accent-gold); border-color: rgba(255, 183, 3, 0.4); display: inline-flex; align-items: center; gap: 6px;" title="Buscar os simulados mais recentes salvos na nuvem">
                <i class="fas fa-sync-alt"></i> Atualizar da Nuvem
              </button>
              <span style="font-size: 0.8rem; color: var(--accent-gold); font-weight: 600;">
                ${quizSubmissions.length} prova(s) registrada(s)
              </span>
            </div>
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
            <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
              <button class="btn btn-gold" onclick="window.TKST_APP.openShotokanStudyModal(${adminQuizSelectedKyu})" style="font-size: 0.82rem; padding: 8px 14px; font-weight: 800; color: #000; box-shadow: 0 4px 14px rgba(245, 190, 0, 0.35); background: linear-gradient(135deg, #FFD166 0%, #F5BE00 100%); border: none;" title="Estudo Técnico Aprofundado de Karatê Shotokan (JKA/WKF) & Gerador Especialista de Questões com Gabarito">
                <i class="fas fa-brain"></i> 🥋 Estudo Shotokan (Gerador IA)
              </button>
              <button class="btn btn-primary" onclick="window.TKST_APP.openAddQuizQuestionModal(${adminQuizSelectedKyu})" style="font-size: 0.82rem; padding: 8px 14px; font-weight: 700;">
                <i class="fas fa-plus"></i> Nova Questão
              </button>
              <button class="btn btn-secondary" onclick="window.TKST_APP.exportQuizQuestionsJson()" style="font-size: 0.82rem; padding: 8px 14px;" title="Baixar arquivo JSON com todas as questões do sistema">
                <i class="fas fa-download"></i> Exportar Questões (JSON)
              </button>
              <button class="btn btn-secondary" onclick="window.TKST_APP.importQuizQuestionsFile()" style="font-size: 0.82rem; padding: 8px 14px; border-color: rgba(34, 197, 94, 0.4); color: #86EFAC;" title="Carregar arquivo JSON de questões do celular ou PC">
                <i class="fas fa-file-import"></i> Importar Questões (Arquivo)
              </button>
              <button class="btn btn-secondary" onclick="window.TKST_APP.syncQuizQuestionsNow()" style="font-size: 0.82rem; padding: 8px 14px; border-color: rgba(59, 130, 246, 0.4); color: #93C5FD;" title="Forçar envio de todas as questões em tempo real para os outros aparelhos">
                <i class="fas fa-sync-alt"></i> Sincronizar com Outro Aparelho
              </button>
            </div>
          </div>
          <div style="background: rgba(255, 183, 3, 0.08); border-bottom: 1px solid rgba(255, 183, 3, 0.2); padding: 8px 20px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; font-size: 0.82rem;">
            <div style="display: flex; align-items: center; gap: 8px; color: #E2E8F0;">
              <i class="fas fa-database" style="color: var(--accent-gold);"></i>
              <span>Total Cadastrado no Banco: <strong style="color: var(--accent-gold); font-size: 0.95rem;">${(window.TKST_AUTH ? window.TKST_AUTH.getCustomQuizBank() : (window.TKST_QUIZ_BANK || [])).length}</strong> questões</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px; color: #94A3B8; font-size: 0.76rem;">
              <i class="fas fa-mobile-alt" style="color: #60A5FA;"></i> Celular ⇄ <i class="fas fa-desktop" style="color: #60A5FA;"></i> PC conectados via Nuvem em Tempo Real
            </div>
          </div>

          <!-- Graduation Filter Buttons - Organizados rigorosamente pela ordem do Plano de Estudos (6º ao 1º Kyu e Dans) -->
          <div style="padding: 10px 12px; border-bottom: 1px solid var(--border-color); display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 6px; background: rgba(0,0,0,0.25);">
            ${[
              { kyu: 6, label: "6ºKyu (Branca p/ Amarela)", bg: "#F5BE00", color: "#0A0D14" },
              { kyu: 5, label: "5ºKyu (Amarela p/ Vermelha)", bg: "#E63946", color: "#FFFFFF" },
              { kyu: 4, label: "4ºKyu (Vermelha p/ Laranja)", bg: "#FF7700", color: "#FFFFFF" },
              { kyu: 3, label: "3ºKyu (Laranja p/ Verde)", bg: "#10B981", color: "#FFFFFF" },
              { kyu: 2, label: "2ºKyu (Verde p/ Roxa)", bg: "#8B5CF6", color: "#FFFFFF" },
              { kyu: 1, label: "1ºKyu (Roxa p/ Marrom)", bg: "#78350F", color: "#FFFFFF" },
              { kyu: 0, label: "1ºDan (Shodan)", bg: "#18181B", color: "#F4F4F5", border: "1px solid #52525B" },
              { kyu: -1, label: "2ºDan (Nidan)", bg: "#18181B", color: "#F4F4F5", border: "1px solid #52525B" },
              { kyu: -2, label: "3ºDan (Sandan)", bg: "#18181B", color: "#F4F4F5", border: "1px solid #52525B" }
            ].map(b => `
              <button 
                onclick="window.TKST_APP.setAdminQuizSelectedKyu(${b.kyu})"
                style="
                  background: ${b.bg};
                  color: ${b.color};
                  border: ${adminQuizSelectedKyu === b.kyu ? '2px solid #FFB703' : (b.border || '1px solid rgba(255,255,255,0.15)')};
                  ${adminQuizSelectedKyu === b.kyu ? 'box-shadow: 0 0 10px rgba(255, 183, 3, 0.8); transform: scale(1.03); font-weight: 900;' : 'opacity: 0.85; font-weight: 700;'}
                  border-radius: 6px;
                  padding: 8px 6px;
                  font-size: 0.74rem;
                  cursor: pointer;
                  text-align: center;
                  transition: all 0.15s ease;
                  line-height: 1.2;
                  white-space: normal;
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
              const currentKyuQuestions = allBank.map(q => ensureSmartQuestionOptions(q)).filter(q => {
                const qKyu = Number(q.kyuNumber !== undefined ? q.kyuNumber : (q.kyu !== undefined ? q.kyu : 6));
                const targetKyu = Number(adminQuizSelectedKyu);
                return (targetKyu === 6) ? (qKyu === 6 || qKyu === 7) : (qKyu === targetKyu);
              });
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
                      <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                        <button class="btn btn-sm btn-secondary" onclick="window.TKST_APP.openCopyTransferQuizModal('${q.id}')" style="font-size: 0.76rem; padding: 5px 11px; font-weight: 700; background: rgba(59, 130, 246, 0.16); border: 1px solid rgba(59, 130, 246, 0.45); color: #93C5FD; display: inline-flex; align-items: center; gap: 5px;" title="Copiar ou Transferir esta questão para outra graduação">
                          <i class="fas fa-exchange-alt"></i> Copiar / Transferir
                        </button>
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

      ${adminSubTab === 'exam-generator' ? `
        <!-- GERADOR OFICIAL DE PROVAS & GABARITOS (PDF / IMPRESSÃO) -->
        <div class="admin-table-container">
          <div style="padding: 18px 20px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <div>
              <h4 style="font-family: var(--font-heading); color: #FFF; font-size: 1.15rem; margin-bottom: 2px;">
                <i class="fas fa-file-pdf" style="color: var(--accent-gold);"></i> Gerador de Provas & Gabaritos (Impressão / PDF A4)
              </h4>
              <div style="font-size: 0.82rem; color: #94A3B8;">
                Selecione a graduação e o modelo desejado, e clique em <strong>Gerar Prova</strong> para visualizar e imprimir em 1 folha A4.
              </div>
            </div>
            
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <button class="btn btn-gold" onclick="window.TKST_APP.openExamCameraScanner()" style="font-size: 0.82rem; padding: 8px 14px; font-weight: 800; color: #000; background: #F5BE00; box-shadow: 0 4px 12px rgba(245, 190, 0, 0.35);" title="Corrigir Prova Teórica com Câmera ou Scanner OMR">
                <i class="fas fa-camera"></i> Corrigir Prova com Câmera / OMR
              </button>
              <button class="btn btn-gold" onclick="window.TKST_APP.printMasterAnswerKey()" style="font-size: 0.82rem; padding: 8px 14px; font-weight: 700; color: #000; box-shadow: 0 4px 12px rgba(245, 190, 0, 0.25);">
                <i class="fas fa-key"></i> Imprimir Gabarito Geral (Todas as Faixas)
              </button>
              <button class="btn btn-secondary" onclick="window.TKST_APP.printAllExams()" style="font-size: 0.82rem; padding: 8px 14px; font-weight: 700; border-color: rgba(255,255,255,0.2);">
                <i class="fas fa-print"></i> Imprimir Todas as Provas (Lote)
              </button>
            </div>
          </div>



          <!-- SELETOR DE FAIXA / GRADUAÇÃO (DE FAIXA X PARA FAIXA Y) -->
          <div style="padding: 12px 14px; border-bottom: 1px solid var(--border-color); display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 6px; background: rgba(0,0,0,0.2);">
            ${[
              { kyu: 6, label: "Branca para Amarela", bg: "#F5BE00", color: "#0A0D14", border: "1px solid #D97706" },
              { kyu: 5, label: "Amarela para Vermelha", bg: "#E63946", color: "#FFFFFF", border: "1px solid #DC2626" },
              { kyu: 4, label: "Vermelha para Laranja", bg: "#FF7700", color: "#FFFFFF", border: "1px solid #EA580C" },
              { kyu: 3, label: "Laranja para Verde", bg: "#10B981", color: "#FFFFFF", border: "1px solid #059669" },
              { kyu: 2, label: "Verde para Roxa", bg: "#8B5CF6", color: "#FFFFFF", border: "1px solid #7C3AED" },
              { kyu: 1, label: "Roxa para Marrom", bg: "#78350F", color: "#FFFFFF", border: "1px solid #92400E" },
              { kyu: 0, label: "Marrom para Preta (Shodan)", bg: "#18181B", color: "#FFFFFF", border: "1px solid #3F3F46" },
              { kyu: -1, label: "Shodan para Nidan (2º Dan)", bg: "#1E293B", color: "#FFFFFF", border: "1px solid #475569" },
              { kyu: -2, label: "Nidan para Sandan (3º Dan)", bg: "#020617", color: "#FFFFFF", border: "1px solid #334155" }
            ].map(b => `
              <button class="btn btn-sm" onclick="window.TKST_APP.setExamGeneratorKyu(${b.kyu})" style="
                background: ${b.bg};
                color: ${b.color};
                border: ${examGeneratorSelectedKyu === b.kyu ? '2px solid #FFB703' : b.border};
                ${examGeneratorSelectedKyu === b.kyu ? 'box-shadow: 0 0 10px rgba(255, 183, 3, 0.8); transform: scale(1.03); font-weight: 900;' : 'opacity: 0.85; font-weight: 700;'}
                padding: 8px 6px; font-size: 0.72rem; text-align: center; white-space: normal; line-height: 1.2; transition: all 0.2s ease;
              ">
                ${examGeneratorSelectedKyu === b.kyu ? '✓ ' : ''}${b.label}
              </button>
            `).join('')}
          </div>

          <!-- CAMPO DE BUSCA INTELIGENTE DE ALUNOS DO EXAME DE FAIXA (DOJÔBOOK) -->
          <!-- CAMPO DE BUSCA INTELIGENTE DE ALUNOS DO EXAME DE FAIXA (DOJÔBOOK & TKST) -->
          <div style="padding: 14px 20px; border-bottom: 1px solid var(--border-color); background: rgba(18, 23, 34, 0.95); position: relative;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 8px;">
              <label for="examDojobookStudentSearch" style="font-size: 0.88rem; font-weight: 800; color: #FFF; display: flex; align-items: center; gap: 8px; margin: 0;">
                <i class="fas fa-user-graduate" style="color: var(--accent-gold);"></i> Vincular Aluno à Prova Oficial:
              </label>
              <div id="examDojobookHeaderAction">
                ${examSelectedDojobookStudent ? `
                  <button type="button" class="btn btn-sm btn-secondary" onclick="window.TKST_APP.clearExamDojobookStudent()" style="font-size: 0.74rem; padding: 3px 10px; color: #F87171; border-color: rgba(248,113,113,0.4);" title="Remover vinculação e deixar folha em branco">
                    <i class="fas fa-times"></i> Desvincular (${examSelectedDojobookStudent.nome})
                  </button>
                ` : `
                  <span style="font-size: 0.74rem; color: #94A3B8;">Busca inteligente · TKST & DojôBook</span>
                `}
              </div>
            </div>

            <div style="position: relative;">
              <div style="position: relative; display: flex; align-items: center;">
                <i class="fas fa-search" style="position: absolute; left: 14px; color: var(--accent-gold); font-size: 0.9rem; pointer-events: none; z-index: 2;"></i>
                <input
                  type="text"
                  id="examDojobookStudentSearch"
                  class="form-control"
                  placeholder="Digite o nome do aluno para buscar ou digite livremente..."
                  value="${examSelectedDojobookStudent ? examSelectedDojobookStudent.nome : (window._examTypedStudentName || '')}"
                  oninput="window._examTypedStudentName = this.value; window.TKST_APP.onDojobookStudentSearchInput(this.value)"
                  onfocus="window.TKST_APP.onDojobookStudentSearchFocus(this)"
                  autocomplete="off"
                  spellcheck="false"
                  style="width: 100%; padding: 11px 40px 11px 40px; background: #0B0E14; border: 1.5px solid ${(examSelectedDojobookStudent || window._examTypedStudentName) ? '#10B981' : 'var(--border-color)'}; border-radius: var(--radius-sm); color: #FFF; font-size: 0.9rem; font-weight: 700; transition: border-color 0.2s;"
                >
                <div style="position: absolute; right: 10px; display: flex; align-items: center; gap: 6px; z-index: 2;">
                  <button 
                    type="button" 
                    id="examDojobookClearBtn"
                    onclick="window._examTypedStudentName = ''; window.TKST_APP.clearExamDojobookStudent()" 
                    style="display: ${(examSelectedDojobookStudent || window._examTypedStudentName) ? 'flex' : 'none'}; background: rgba(248,113,113,0.15); border: 1px solid rgba(248,113,113,0.4); color: #F87171; border-radius: 50%; width: 24px; height: 24px; align-items: center; justify-content: center; cursor: pointer; font-size: 0.75rem; padding: 0;"
                    title="Limpar campo e desvincular"
                  >
                    <i class="fas fa-times"></i>
                  </button>
                  <span id="examDojobookLinkedBadge" style="display: ${(examSelectedDojobookStudent || window._examTypedStudentName) ? 'inline-block' : 'none'}; background: #10B981; color: #000; font-weight: 900; font-size: 0.68rem; padding: 3px 8px; border-radius: 4px; white-space: nowrap;">
                    ✓ Vinculado
                  </span>
                </div>
              </div>

              <!-- Dropdown Suspenso de Resultados -->
              <div id="examDojobookAutocompleteDropdown" style="display: none; position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: #0F1420; border: 1.5px solid var(--accent-gold); border-radius: 8px; max-height: 280px; overflow-y: auto; z-index: 1000; box-shadow: 0 14px 32px rgba(0,0,0,0.95); padding: 6px;">
              </div>
            </div>

            <div id="examDojobookLinkedInfo">
              ${examSelectedDojobookStudent ? `
                <div style="margin-top: 10px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.35); padding: 8px 14px; border-radius: 6px; font-size: 0.8rem; color: #A7F3D0;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-check-circle" style="color: #10B981; font-size: 1rem;"></i>
                    <span>Aluno: <strong>${examSelectedDojobookStudent.nome}</strong> ${examSelectedDojobookStudent.dojo_nome ? `(${examSelectedDojobookStudent.dojo_nome})` : ''} · Vai para: <strong style="color: #FFF;">${examSelectedDojobookStudent.vai_para || 'Próxima Faixa'}</strong></span>
                  </div>
                  <span style="font-size: 0.72rem; color: #6EE7B7; font-weight: 600;">Folha preenchida com o nome do aluno</span>
                </div>
              ` : `
                <div style="font-size: 0.75rem; color: #94A3B8; margin-top: 6px; display: flex; align-items: center; gap: 6px;">
                  <i class="fas fa-info-circle" style="color: var(--accent-gold);"></i>
                  <span>Conforme você digita, aparecem os alunos da TKST e do DojôBook para você selecionar com 1 toque, ou digite qualquer nome livremente.</span>
                </div>
              `}
            </div>
          </div>

          <!-- BARRA DE AÇÕES PRINCIPAL COM BOTÕES DE GERAR -->
          <div style="padding: 16px 20px; border-bottom: 1px solid var(--border-color); background: rgba(255, 183, 3, 0.04); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
            <div>
              <div style="font-size: 1.05rem; font-weight: 800; color: #FFF; display: flex; align-items: center; gap: 8px;">
                <span class="badge" style="background: ${currentExamMeta.color || '#F5BE00'}; color: ${currentExamMeta.kyu === 6 ? '#000' : '#FFF'}; font-size: 0.8rem; font-weight: 800;">
                  ${currentExamMeta.fromBeltWithKyu || 'Branca'} ➔ ${currentExamMeta.toBeltWithKyu || 'Amarela'}
                </span>
                Avaliação Teórica
              </div>
              <div style="font-size: 0.8rem; color: #94A3B8; margin-top: 2px;">
                Kata Exigido: <strong>${currentExamMeta.kataName}</strong> • Avaliação Oficial de Múltipla Escolha (10 Questões)
              </div>
            </div>

            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <button class="btn btn-primary" onclick="window.TKST_APP.generateExamPreview('exam')" style="font-size: 0.85rem; padding: 10px 18px; font-weight: 800; box-shadow: 0 4px 14px rgba(255, 183, 3, 0.35);">
                <i class="fas fa-file-alt"></i> Gerar Prova
              </button>
              <button class="btn btn-secondary" onclick="window.TKST_APP.printCurrentExam()" style="font-size: 0.85rem; padding: 10px 14px; font-weight: 700;">
                <i class="fas fa-print"></i> Imprimir Direto
              </button>
            </div>
          </div>

          <!-- ÁREA DA PRÉVIA OU INSTRUÇÃO -->
          ${examPreviewGenerated ? `
            <div style="padding: 20px 14px; background: rgba(0,0,0,0.5); overflow-x: auto;">
              <div style="display: flex; justify-content: space-between; align-items: center; max-width: 1040px; margin: 0 auto 12px auto; flex-wrap: wrap; gap: 8px;">
                <div style="font-size: 0.82rem; color: #94A3B8; display: flex; align-items: center; gap: 6px;">
                  <i class="fas fa-eye" style="color: var(--accent-gold);"></i> <strong>Prova Oficial Diagramada (1 Folha A4):</strong>
                </div>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                  <button class="btn btn-sm btn-outline" onclick="window.TKST_APP.rerollExamQuestions()" style="font-size: 0.78rem; padding: 6px 12px; font-weight: 700; color: var(--accent-gold); border: 1px solid var(--accent-gold); background: rgba(245,190,0,0.1);">
                    <i class="fas fa-dice"></i> Sortear Novas Questões
                  </button>
                  <button class="btn btn-sm btn-primary" onclick="window.TKST_APP.printCurrentExam()" style="font-size: 0.78rem; padding: 6px 14px; font-weight: 800;">
                    <i class="fas fa-print"></i> Imprimir Esta Folha A4
                  </button>
                  <button class="btn btn-sm btn-secondary" onclick="window.TKST_APP.closeExamPreview()" style="font-size: 0.78rem; padding: 6px 10px;">
                    <i class="fas fa-times"></i> Fechar Prévia
                  </button>
                </div>
              </div>
              
              <div class="exam-preview-container" style="background: #FFF; color: #0F172A; border-radius: 4px; box-shadow: 0 8px 24px rgba(0,0,0,0.7); max-width: 1040px; margin: 0 auto; padding: 16px; font-size: 0.88rem; position: relative;">
                ${examPreviewHtml}
              </div>
            </div>
          ` : `
            <div style="padding: 40px 20px; text-align: center; color: #94A3B8; background: rgba(0,0,0,0.2);">
              <i class="fas fa-file-invoice" style="font-size: 2.5rem; color: var(--accent-gold); margin-bottom: 12px; display: block; opacity: 0.7;"></i>
              <div style="font-size: 1rem; font-weight: 700; color: #FFF; margin-bottom: 4px;">
                Selecione a faixa acima e clique em <strong>"Gerar Prova"</strong> ou <strong>"Imprimir Direto"</strong>
              </div>
              <div style="font-size: 0.82rem; color: #64748B;">
                A prova é montada automaticamente em folha única A4 paisagem com 10 questões diagramadas para impressão.
              </div>
            </div>
          `}
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
    const allCurriculums = window.TKST_AUTH ? window.TKST_AUTH.getCustomCurriculum() : (window.TKST_CURRICULUM || []);
    const curriculum = allCurriculums.find(c => c.kyuNumber === currentKyu) || allCurriculums[0];
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
    const todayStudents = typeof window.TKST_AUTH.getTodayRegisteredStudents === 'function' 
      ? window.TKST_AUTH.getTodayRegisteredStudents() 
      : students.filter(s => {
          if (!s || s.username === 'irons365') return false;
          const regDate = s.createdAt ? s.createdAt.split('T')[0] : (s.approvedAt ? s.approvedAt.split('T')[0] : '');
          return regDate === new Date().toISOString().split('T')[0];
        });

    // ==========================================
    // TOP 10 QUIZ RANKING CALCULATION
    // Regra Oficial: Apenas alunos de graduação Kyu (Faixa Branca 7º Kyu até Faixa Marrom 1º Kyu).
    // Faixas Pretas (Dans) e Sensei Master não entram no ranking.
    // Acerto = +1 pt, Erro = -1 pt.
    // ==========================================
    const isKyuCandidate = (belt, kyu, role, username) => {
      if (username === 'irons365' || role === 'admin') return false;
      const b = (belt || '').toLowerCase();
      if (b.includes('preta') || b.includes('dan') || b.includes('sensei') || b.includes('shodan') || b.includes('nidan') || b.includes('sandan')) return false;
      if (kyu !== undefined && kyu !== null && Number(kyu) <= 0) return false;
      return true;
    };

    const submissions = (window.TKST_AUTH ? window.TKST_AUTH.getAllQuizSubmissions() : []) || [];
    let allProgress = {};
    try {
      allProgress = JSON.parse(localStorage.getItem('tkst_progress_v2')) || JSON.parse(localStorage.getItem('tkst_student_progress')) || {};
    } catch (e) { allProgress = {}; }

    // Map de alunos elegíveis (somente graduações Kyu)
    const studentMap = new Map();
    students.forEach(s => {
      if (!s || !isKyuCandidate(s.currentBelt, s.currentKyu, s.role, s.username)) return;
      studentMap.set(s.id, {
        id: s.id,
        fullName: (s.name || 'Aluno').trim(),
        username: s.username || '',
        dojo: (s.dojo || 'TKST').replace(/^TKST\s+/i, ''),
        currentBelt: s.currentBelt || 'Faixa Branca',
        currentKyu: s.currentKyu !== undefined ? s.currentKyu : 7
      });
    });

    // Inclui também participantes encontrados nas submissões de simulados (somente Kyus)
    submissions.forEach(sub => {
      if (!sub || !isKyuCandidate(sub.studentBelt, sub.studentKyu, '', sub.studentUsername)) return;
      const key = sub.studentId || sub.studentUsername || sub.studentName;
      if (key && !studentMap.has(key)) {
        studentMap.set(key, {
          id: sub.studentId || key,
          fullName: (sub.studentName || sub.studentUsername || 'Aluno').trim(),
          username: sub.studentUsername || '',
          dojo: 'TKST',
          currentBelt: sub.studentBelt || 'Faixa Branca',
          currentKyu: sub.studentKyu !== undefined ? sub.studentKyu : 7
        });
      }
    });

    const leaderboard = Array.from(studentMap.values()).map(student => {
      let totalCorrect = 0;
      let totalWrong = 0;
      let testsTaken = 0;

      const firstName = (student.fullName || 'Aluno').split(' ')[0] || 'Aluno';
      const normStdName = (student.fullName || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      const normStdUser = (student.username || '').toLowerCase().trim();

      const studentSubs = submissions.filter(sub => {
        if (!sub) return false;
        const subId = (sub.studentId || '').trim();
        const normSubUser = (sub.studentUsername || '').toLowerCase().trim();
        const normSubName = (sub.studentName || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

        if (subId && (subId === student.id || subId === student.username)) return true;
        if (normSubUser && (normSubUser === normStdUser || normSubUser === student.id)) return true;
        if (normSubName && normStdName && (normSubName === normStdName || normSubName.includes(normStdName) || normStdName.includes(normSubName))) return true;

        return false;
      });

      // Coleta submissões ou notas diretas do perfil do aluno
      let finalScoresList = [];
      if (studentSubs.length > 0) {
        finalScoresList = studentSubs;
      } else {
        const rawStudentObj = students.find(s => s && (s.id === student.id || s.username === student.username));
        const directScores = (rawStudentObj?.quizScores || allProgress[student.id]?.quizScores || allProgress[student.username]?.quizScores || []);
        if (Array.isArray(directScores)) finalScoresList = directScores;
      }

      // Deduplica submissões com mesmo score/total/faixa e intervalo inferior a 20 segundos (elimina duplicatas de sincronização)
      const uniqueScores = [];
      finalScoresList.forEach(item => {
        if (!item) return;
        const score = typeof item.score === 'number' ? item.score : 0;
        const total = typeof item.total === 'number' ? item.total : 10;
        const belt = (item.beltLevel || item.beltKyu || '').toString().trim();
        const isDup = uniqueScores.some(u => {
          if (u.id && item.id && u.id === item.id) return true;
          const uBelt = (u.beltLevel || u.beltKyu || '').toString().trim();
          return (belt ? uBelt === belt : true) && u.score === score && u.total === total && Math.abs(new Date(u.date || 0).getTime() - new Date(item.date || 0).getTime()) <= 60000;
        });
        if (!isDup) uniqueScores.push(item);
      });

      uniqueScores.forEach(item => {
        const score = typeof item.score === 'number' ? item.score : 0;
        const total = typeof item.total === 'number' ? item.total : 10;
        totalCorrect += score;
        totalWrong += Math.max(0, total - score);
        testsTaken++;
      });

      const netPoints = totalCorrect - totalWrong;

      return {
        id: student.id,
        fullName: student.fullName,
        firstName: firstName,
        dojo: student.dojo,
        currentBelt: student.currentBelt,
        currentKyu: student.currentKyu,
        totalCorrect,
        totalWrong,
        testsTaken,
        points: netPoints
      };
    });

    // Alunos Kyu que realizaram simulados e possuem saldo de pontuação positivo (sem pontuação negativa)
    const activeRanked = leaderboard.filter(item => item.testsTaken > 0 && item.points > 0);

    activeRanked.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.totalCorrect !== a.totalCorrect) return b.totalCorrect - a.totalCorrect;
      return b.testsTaken - a.testsTaken;
    });

    const top10Leaderboard = activeRanked.slice(0, 10);

    const MESES_NOMES = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    const mesAtualNome = MESES_NOMES[new Date().getMonth()];

    let html = `
      ${isAdmin && todayStudents.length > 0 ? `
        <!-- ADMIN TODAY REGISTRATIONS BANNER -->
        <div class="admin-pending-alert-card" onclick="window.TKST_APP.setAdminSubTab('students'); window.TKST_APP.switchTab('admin');" title="Toque para ver os novos alunos cadastrados hoje" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.08)); border: 1.5px solid rgba(16, 185, 129, 0.4); box-shadow: 0 4px 16px rgba(16, 185, 129, 0.15); margin-bottom: 20px;">
          <div class="admin-pending-alert-left">
            <div class="admin-pending-icon-bell" style="background: rgba(16, 185, 129, 0.25); color: #34D399; font-size: 1.25rem;">
              <i class="fas fa-user-check"></i>
            </div>
            <div>
              <div class="admin-pending-title" style="color: #FFF; font-size: 0.95rem; font-weight: 700;">
                <span class="badge badge-verde" style="font-size: 0.74rem; padding: 3px 9px; margin-right: 6px; font-weight: 800;">
                  🎉 ${todayStudents.length} Novo${todayStudents.length > 1 ? 's' : ''} Hoje
                </span>
                Novos Alunos Cadastrados no Portal Hoje!
              </div>
              <div class="admin-pending-subtitle" style="color: #CBD5E1; font-size: 0.82rem; margin-top: 3px;">
                ${todayStudents.map(s => `<strong>${s.name.split(' ')[0]}</strong> (@${s.username} - ${s.dojo || 'TKST'})`).slice(0, 3).join(', ')}${todayStudents.length > 3 ? ` e mais ${todayStudents.length - 3} aluno(s)...` : ''} • Acesso liberado automaticamente.
              </div>
            </div>
          </div>
          <button type="button" class="btn btn-sm btn-success" style="font-size: 0.78rem; padding: 8px 16px; white-space: nowrap; flex-shrink: 0; font-weight: 700;">
            <i class="fas fa-users"></i> Ver Cadastros
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

      <!-- Quick Stats (Minimizados em 1 Linha: Rigorosamente 5 Botões Lado a Lado) -->
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

        <div class="stat-card" onclick="window.TKST_APP.switchTab('media')" style="cursor: pointer; border-color: rgba(230, 57, 70, 0.4); background: rgba(230, 57, 70, 0.08);" title="Abrir Álbuns de Fotos e Vídeos">
          <div class="stat-icon-box crimson">
            <i class="fas fa-photo-video"></i>
          </div>
          <div class="stat-value" style="color: #FF808A;">Galeria</div>
          <div class="stat-label">Álbuns</div>
        </div>

        ${!isAdmin ? `
          <div class="stat-card" onclick="window.TKST_APP.switchTab('quiz')" style="cursor: pointer;" title="Fazer Simulado Teórico">
            <div class="stat-icon-box emerald">
              <i class="fas fa-brain"></i>
            </div>
            <div class="stat-value">Simulado</div>
            <div class="stat-label">Quiz</div>
          </div>
        ` : `
          <div class="stat-card" onclick="window.TKST_APP.setAdminSubTab('exam-generator'); window.TKST_APP.switchTab('admin');" style="cursor: pointer; border-color: rgba(255, 183, 3, 0.45); background: rgba(255, 183, 3, 0.08);" title="Gerador Oficial de Provas e Gabaritos">
            <div class="stat-icon-box gold">
              <i class="fas fa-file-pdf"></i>
            </div>
            <div class="stat-value" style="color: var(--accent-gold);">Provas</div>
            <div class="stat-label">Gerador</div>
          </div>
        `}

        <div class="stat-card" onclick="window.TKST_APP.switchTab('glossary')" style="cursor: pointer;" title="Abrir Dicionário Japonês de Karatê">
          <div class="stat-icon-box crimson">
            <i class="fas fa-language"></i>
          </div>
          <div class="stat-value">Dicionário</div>
          <div class="stat-label">Japonês</div>
        </div>
      </div>

      <!-- Filosofia & Comunidade (Dojo Kun, Niju Kun e Aniversários lado a lado) -->
      <div class="dashboard-kun-grid">
        <!-- 1. Dojo Kun -->
        <div class="kun-compact-card gold-theme" onclick="window.TKST_APP.openDojoKunModal()" title="Toque para ver o Dojo Kun completo">
          <div class="kun-card-top">
            <div class="kun-title-box">
              <div class="kun-icon">
                <i class="fas fa-scroll"></i>
              </div>
              <div style="min-width: 0;">
                <h3 class="kun-name">Dojo Kun</h3>
                <span class="kun-kanji">道場訓</span>
              </div>
            </div>
            <span class="kun-btn-view">Ver <i class="fas fa-chevron-right" style="font-size: 0.55rem;"></i></span>
          </div>
        </div>

        <!-- 2. Niju Kun -->
        <div class="kun-compact-card crimson-theme" onclick="window.TKST_APP.openNijuKunModal()" title="Toque para ver os 20 Preceitos de Gichin Funakoshi">
          <div class="kun-card-top">
            <div class="kun-title-box">
              <div class="kun-icon crimson">
                <i class="fas fa-torii-gate"></i>
              </div>
              <div style="min-width: 0;">
                <h3 class="kun-name">Niju Kun</h3>
                <span class="kun-kanji">二十条</span>
              </div>
            </div>
            <span class="kun-btn-view crimson">Ver <i class="fas fa-chevron-right" style="font-size: 0.55rem;"></i></span>
          </div>
        </div>

        <!-- 3. Aniversariantes do Dojô -->
        <div class="kun-compact-card emerald-theme" onclick="window.TKST_APP.openAniversariantesModal()" title="Toque para ver os aniversariantes do Dojô no DojôBook">
          <div class="kun-card-top">
            <div class="kun-title-box">
              <div class="kun-icon emerald">
                <i class="fas fa-birthday-cake"></i>
              </div>
              <div style="min-width: 0;">
                <h3 class="kun-name">Aniversariantes</h3>
                <span class="kun-kanji" id="homeAniversariantesSubtitle">${mesAtualNome}</span>
              </div>
            </div>
            <span class="kun-btn-view emerald">Ver <i class="fas fa-chevron-right" style="font-size: 0.55rem;"></i></span>
          </div>
        </div>
      </div>

      <!-- 4ª Linha: Dividida em 2 partes (Esquerda: Slide de Fotos da Galeria | Direita: Ranking Oficial do Simulado) -->
      <div class="dashboard-bottom-grid">
        
        <!-- Lado Esquerdo: Slide com todas as fotos ocupando todo o card -->
        <div class="stat-card home-gallery-slide-card" id="homeSlideContainer">
          <!-- Ocupado 100% pelas fotos do slide -->
        </div>

        <!-- Lado Direito: Ranking Oficial de Kyus -->
        <div class="stat-card ranking-card">
          <div class="ranking-header">
            <div class="ranking-header-title">
              <div class="ranking-header-icon">
                <i class="fas fa-trophy"></i>
              </div>
              <div style="min-width: 0;">
                <h3 class="ranking-title">Ranking Oficial de Kyus</h3>
                <p class="ranking-subtitle">Top Classificação TKST • Alunos Kyu (Acerto +1 pt | Erro -1 pt)</p>
              </div>
            </div>
            <div class="ranking-header-tag">
              <i class="fas fa-award"></i> Oficial
            </div>
          </div>

          <div class="ranking-list">
            ${top10Leaderboard.length === 0 ? `
              <div style="padding: 16px 12px; text-align: center; color: #64748B; font-size: 0.78rem;">
                <i class="fas fa-medal" style="font-size: 1.5rem; color: var(--accent-gold); margin-bottom: 4px; display: block; opacity: 0.6;"></i>
                Nenhum aluno classificado ainda.<br>Faça um simulado teórico para liderar o ranking!
              </div>
            ` : top10Leaderboard.map((item, idx) => `
              <div class="ranking-single-row ${idx === 0 ? 'top-1' : (idx === 1 ? 'top-2' : (idx === 2 ? 'top-3' : ''))}">
                <!-- Linha 1: Lugar, Nome completo, Graduação -->
                <div class="ranking-row-line-1">
                  <div class="ranking-row-user-block">
                    <span class="ranking-pos-medal ${idx < 3 ? 'is-podium' : ''}">
                      ${idx === 0 ? '🥇' : (idx === 1 ? '🥈' : (idx === 2 ? '🥉' : `${idx + 1}º`))}
                    </span>
                    <span class="ranking-student-name" title="${item.fullName}">${item.fullName}</span>
                  </div>
                  <span class="ranking-belt-badge">${item.currentBelt}</span>
                </div>

                <!-- Linha 2: Dojo, Quantidade de Acertos, Quantidade de Pontos -->
                <div class="ranking-row-line-2">
                  <div class="ranking-student-dojo" title="${item.dojo}">
                    <i class="fas fa-landmark"></i> <span>${item.dojo}</span>
                  </div>
                  <div class="ranking-row-metrics">
                    <span class="ranking-stat-pill">
                      <i class="fas fa-check-circle"></i> ${item.totalCorrect} ${item.totalCorrect === 1 ? 'acerto' : 'acertos'}
                    </span>
                    <span class="ranking-row-points ${item.points > 0 ? 'positive' : (item.points < 0 ? 'negative' : 'zero')}">
                      ${item.points > 0 ? '+' : ''}${item.points} pts
                    </span>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

      </div>
    `;

    mainContent.innerHTML = html;

    // Inicializa o slide de fotos aleatórias da galeria
    initHomePhotoSlide();

    // Carrega aniversariantes do DojôBook em background para atualizar o botão na Home
    if (window.TKST_APP && window.TKST_APP.loadDojobookAniversariantes) {
      window.TKST_APP.loadDojobookAniversariantes();
    }
  }

  // =========================================================================
  // 3.1 CARROSSEL / SLIDE DE FOTOS ALEATÓRIAS DA HOME
  // =========================================================================
  let homeRandomPhotos = [];
  let homeCurrentSlideIndex = 0;
  let homeSlideInterval = null;
  let homeSlideIsPaused = false;
  let homeSlideObserver = null;
  let homeSlideIsSwiping = false;

  function clearHomeSlideInterval() {
    if (homeSlideInterval) {
      clearInterval(homeSlideInterval);
      homeSlideInterval = null;
    }
    if (homeSlideObserver) {
      try {
        homeSlideObserver.disconnect();
      } catch(e) {}
      homeSlideObserver = null;
    }
  }

  function shuffleHomePhotos(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function getAlbumDisplayTitle(albumId) {
    if (albumId === 'exames') return 'Exame de Faixa';
    if (albumId === 'competicoes') return 'Competições';
    if (albumId === 'didaticos') return 'Didáticos';
    if (typeof getAlbumsList === 'function') {
      const found = getAlbumsList().find(a => a.id === albumId);
      if (found && found.title) return found.title;
    }
    return albumId ? (albumId.charAt(0).toUpperCase() + albumId.slice(1)) : 'Galeria';
  }

  // Otimizador de URLs de imagens para celular e backdrops desfocados
  function getOptimizedSlideUrl(url, isBackdrop = false) {
    if (!url) return 'assets/images/logo-tkst-2.jpg';
    if (typeof url !== 'string') return url;

    // Se for Cloudinary, entrega formato WebP/AVIF comprimido e na dimensão exata
    if (url.includes('res.cloudinary.com')) {
      if (isBackdrop) {
        // Backdrop precisa de resolução mínima (apenas tons e cores difusas)
        return url.replace('/upload/', '/upload/f_auto,q_60,w_180,c_limit/');
      }
      return url.replace('/upload/', '/upload/f_auto,q_auto:good,w_750,c_limit/');
    }

    // Se for Unsplash
    if (url.includes('images.unsplash.com')) {
      if (isBackdrop) {
        return url.replace(/w=\d+/, 'w=180').replace(/q=\d+/, 'q=50');
      }
      return url.replace(/w=\d+/, 'w=750').replace(/q=\d+/, 'q=75');
    }

    return url;
  }

  // Pré-carrega e pré-decodifica a próxima foto silenciosamente na GPU/RAM
  function preloadNextHomeSlideImage() {
    if (!homeRandomPhotos || homeRandomPhotos.length <= 1) return;
    const nextIdx = (homeCurrentSlideIndex + 1) % homeRandomPhotos.length;
    const nextPhoto = homeRandomPhotos[nextIdx];
    if (nextPhoto) {
      const nextSrc = getOptimizedSlideUrl(nextPhoto.url || nextPhoto.thumbUrl, false);
      const preImg = new Image();
      preImg.src = nextSrc;
      if (preImg.decode) {
        preImg.decode().catch(() => {});
      }
    }
  }

  function initHomePhotoSlide() {
    clearHomeSlideInterval();

    const container = document.getElementById('homeSlideContainer');
    if (!container) return;

    const allMedia = (typeof getNormalizedMediaList === 'function') ? getNormalizedMediaList() : [];
    // Todas as fotos de qualquer álbum (exames, competições, treinos, eventos, etc.)
    const photos = allMedia.filter(m => (m.type === 'image' || !m.type) && m.url);

    if (photos.length === 0) {
      clearHomeSlideInterval();
      homeRandomPhotos = [];
      homeCurrentSlideIndex = 0;
      homeSlideIsPaused = true;
      container.innerHTML = `
        <div class="home-slide-empty">
          <i class="fas fa-images"></i>
          <p>Nenhuma foto cadastrada na galeria ainda.</p>
          <button type="button" class="btn btn-sm btn-gold" onclick="window.TKST_APP.switchTab('media')">
            <i class="fas fa-photo-video"></i> Acessar Galeria
          </button>
        </div>
      `;
      return;
    }

    // Embaralha todas as fotos da galeria em ordem aleatória
    homeRandomPhotos = shuffleHomePhotos(photos);
    homeCurrentSlideIndex = 0;
    homeSlideIsPaused = false;
    homeSlideIsSwiping = false;

    renderHomeSlideCurrentPhoto(true);
    startHomeSlideTimer();
    setupHomeSlideVisibilityObserver();
  }

  function startHomeSlideTimer() {
    if (homeSlideInterval) {
      clearInterval(homeSlideInterval);
      homeSlideInterval = null;
    }
    if (homeRandomPhotos.length <= 1) return;

    homeSlideInterval = setInterval(() => {
      if (!homeSlideIsPaused) {
        nextHomeSlide();
      }
    }, 4500);
  }

  // Touch & Swipe nativo para celular com rolagem vertical livre (passive)
  function setupHomeSlideTouchEvents() {
    const vp = document.getElementById('homeSlideViewport');
    if (!vp) return;

    let startX = 0;
    let startY = 0;
    let moveDetected = false;

    vp.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches[0]) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        moveDetected = false;
        homeSlideIsSwiping = false;
        setHomeSlidePause(true);
      }
    }, { passive: true });

    vp.addEventListener('touchmove', (e) => {
      if (!e.touches || !e.touches[0]) return;
      const curX = e.touches[0].clientX;
      const curY = e.touches[0].clientY;
      const diffX = Math.abs(curX - startX);
      const diffY = Math.abs(curY - startY);

      if (diffX > 15 || diffY > 15) {
        moveDetected = true;
      }

      // Se o movimento for horizontal com ângulo claro, ativa modo swipe
      if (diffX > 25 && diffX > diffY * 1.25) {
        homeSlideIsSwiping = true;
      }
    }, { passive: true });

    vp.addEventListener('touchend', (e) => {
      setHomeSlidePause(false);
      if (homeSlideIsSwiping && e.changedTouches && e.changedTouches[0]) {
        const finalX = e.changedTouches[0].clientX;
        const deltaX = finalX - startX;
        if (deltaX < -35) {
          nextHomeSlide();
        } else if (deltaX > 35) {
          prevHomeSlide();
        }
        setTimeout(() => { homeSlideIsSwiping = false; }, 160);
      } else {
        homeSlideIsSwiping = false;
      }
    }, { passive: true });

    vp.addEventListener('touchcancel', () => {
      setHomeSlidePause(false);
      homeSlideIsSwiping = false;
    }, { passive: true });
  }

  // Pausa automática quando o card sai da tela do celular (economiza CPU, bateria e GPU)
  function setupHomeSlideVisibilityObserver() {
    if (homeSlideObserver) {
      try { homeSlideObserver.disconnect(); } catch(e) {}
      homeSlideObserver = null;
    }

    const container = document.getElementById('homeSlideContainer');
    if (!container) return;

    if ('IntersectionObserver' in window) {
      homeSlideObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setHomeSlidePause(false);
          } else {
            setHomeSlidePause(true);
          }
        });
      }, { threshold: 0.1 });

      homeSlideObserver.observe(container);
    }
  }

  function renderHomeSlideCurrentPhoto(isInitial = false) {
    const container = document.getElementById('homeSlideContainer');
    if (!container || homeRandomPhotos.length === 0) return;

    const photo = homeRandomPhotos[homeCurrentSlideIndex];
    if (!photo) return;

    const rawSrc = photo.url || photo.thumbUrl;
    const photoSrc = getOptimizedSlideUrl(rawSrc, false);
    const backdropSrc = getOptimizedSlideUrl(photo.thumbUrl || rawSrc, true);

    if (isInitial || !container.querySelector('.home-slide-viewport')) {
      container.innerHTML = `
        <div class="home-slide-viewport" id="homeSlideViewport" onclick="window.TKST_APP.openHomeSlideLightbox()" title="Toque para ver a foto em tela cheia" onmouseenter="window.TKST_APP.setHomeSlidePause(true)" onmouseleave="window.TKST_APP.setHomeSlidePause(false)">
          <div class="home-slide-backdrop" id="homeSlideBackdrop" style="background-image: url('${backdropSrc}');"></div>
          <img src="${photoSrc}" id="homeSlideImg" alt="Foto TKST" class="home-slide-img" onerror="this.src='assets/images/logo-tkst-2.jpg'">

          <button type="button" class="home-slide-nav-btn prev" onclick="event.stopPropagation(); window.TKST_APP.prevHomeSlide();" title="Foto Anterior" aria-label="Foto Anterior">
            <i class="fas fa-chevron-left"></i>
          </button>
          <button type="button" class="home-slide-nav-btn next" onclick="event.stopPropagation(); window.TKST_APP.nextHomeSlide();" title="Próxima Foto" aria-label="Próxima Foto">
            <i class="fas fa-chevron-right"></i>
          </button>

          <div class="home-slide-progress-wrap">
            <div class="home-slide-progress-bar is-animating" id="homeSlideProgressBar"></div>
          </div>
        </div>
      `;

      setupHomeSlideTouchEvents();
      preloadNextHomeSlideImage();
    } else {
      const imgEl = document.getElementById('homeSlideImg');
      const backdropEl = document.getElementById('homeSlideBackdrop');
      const progressBar = document.getElementById('homeSlideProgressBar');

      // Transição suave com pré-decodificação sem travar a thread principal
      const incomingImg = new Image();
      incomingImg.src = photoSrc;

      const swapPhotos = () => {
        if (imgEl) {
          imgEl.src = photoSrc;
          imgEl.style.opacity = '1';
        }
        if (backdropEl) {
          backdropEl.style.backgroundImage = `url('${backdropSrc}')`;
          backdropEl.style.opacity = '0.75';
        }
        preloadNextHomeSlideImage();
      };

      if (imgEl) imgEl.style.opacity = '0.2';
      if (backdropEl) backdropEl.style.opacity = '0.35';

      if (incomingImg.decode) {
        incomingImg.decode().then(swapPhotos).catch(swapPhotos);
      } else {
        incomingImg.onload = swapPhotos;
        incomingImg.onerror = swapPhotos;
      }

      // Reinicia animação da barra de progresso via GPU transform (zero layout reflow)
      if (progressBar) {
        progressBar.classList.remove('is-animating');
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (!homeSlideIsPaused) {
              progressBar.classList.add('is-animating');
            }
          });
        });
      }
    }
  }

  function nextHomeSlide() {
    if (homeRandomPhotos.length <= 1) return;
    homeCurrentSlideIndex = (homeCurrentSlideIndex + 1) % homeRandomPhotos.length;
    renderHomeSlideCurrentPhoto(false);
  }

  function prevHomeSlide() {
    if (homeRandomPhotos.length <= 1) return;
    homeCurrentSlideIndex = (homeCurrentSlideIndex - 1 + homeRandomPhotos.length) % homeRandomPhotos.length;
    renderHomeSlideCurrentPhoto(false);
  }

  function setHomeSlidePause(paused) {
    homeSlideIsPaused = paused;
    const bar = document.getElementById('homeSlideProgressBar');
    if (bar) {
      bar.style.animationPlayState = paused ? 'paused' : 'running';
      if (paused) {
        bar.classList.remove('is-animating');
      } else {
        bar.classList.add('is-animating');
      }
    }
  }

  function openHomeSlideLightbox() {
    if (homeSlideIsSwiping) return; // Não abre lightbox se o usuário estava arrastando a foto no celular
    if (!homeRandomPhotos || homeRandomPhotos.length === 0) return;
    const photo = homeRandomPhotos[homeCurrentSlideIndex];
    if (!photo) return;
    currentLightboxList = homeRandomPhotos;
    if (typeof openMediaLightbox === 'function') {
      openMediaLightbox(photo.id);
    }
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

  // Helper para buscar qualquer base no Dicionário Japonês (com imagem, pronúncia e biomecânica)
  function findGlossaryBase(baseName) {
    const glossary = window.TKST_AUTH ? window.TKST_AUTH.getCustomGlossary() : window.TKST_GLOSSARY;
    if (!glossary) return null;
    const raw = String(baseName || '').trim();
    if (!raw) return null;

    const clean = raw.toLowerCase()
      .replace(/^\d+[\.\-\)]\s*/, '')
      .replace(/\(.*?\)/g, '')
      .trim();

    const bases = glossary.bases || [];

    // 1. Busca exata em bases
    let found = bases.find(b => b.japanese.toLowerCase().trim() === clean || b.japanese.toLowerCase().trim() === raw.toLowerCase());
    if (found) return found;

    // 2. Busca aproximada em bases
    found = bases.find(b => {
      const bClean = b.japanese.toLowerCase().replace(/\(.*?\)/g, '').trim();
      return bClean === clean || bClean.includes(clean) || clean.includes(bClean);
    });
    if (found) return found;

    // 3. Fallback em outras categorias do dicionário (ex: Seiza em comandos)
    const otherCats = ['bases', 'comandosEContagem', 'defesas', 'socosGolpes', 'chutes'];
    for (const cat of otherCats) {
      const list = glossary[cat] || [];
      found = list.find(item => {
        const iClean = item.japanese.toLowerCase().replace(/\(.*?\)/g, '').trim();
        return iClean === clean || iClean.includes(clean) || clean.includes(iClean);
      });
      if (found) return found;
    }

    return null;
  }

  function renderMyExam() {
    const user = window.TKST_AUTH.getCurrentUser();
    const allCurriculums = window.TKST_AUTH ? window.TKST_AUTH.getCustomCurriculum() : (window.TKST_CURRICULUM || []);
    const curr = allCurriculums.find(c => c.kyuNumber === selectedBeltKyu) || allCurriculums[0];
    const progress = window.TKST_AUTH.getProgress();
    const isAdmin = window.TKST_AUTH && typeof window.TKST_AUTH.isAdmin === 'function' ? window.TKST_AUTH.isAdmin() : false;

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

    const isKihonOpen = openStudySections.has('kihon');
    const isGeriOpen = openStudySections.has('geri');
    const isUkemiOpen = openStudySections.has('ukemi');
    const isKataOpen = openStudySections.has('kata');
    const isKumiteOpen = openStudySections.has('kumite');
    const isDachiOpen = openStudySections.has('dachi');

    let html = `
      <div class="section-header">
        <div class="section-title-group">
          <h3><i class="fas fa-graduation-cap" style="color: var(--accent-crimson);"></i> Plano de Estudos de Graduação</h3>
          <p>Selecione a faixa ou Dan desejado para estudar o conteúdo programático completo da TKST 2026</p>
        </div>

        <!-- Desktop Belt Chips -->
        <div class="belt-transition-chips desktop-only-belt-chips">
          ${allCurriculums.map(c => {
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
                ${allCurriculums.map(c => {
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
      <div class="dashboard-hero" style="position: relative; overflow: hidden; padding: 24px; margin-bottom: 20px; border-left: 6px solid ${curr.beltColor};">
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

      ${isAdmin ? `
        <!-- Admin Autonomous Study Plan Toolbar -->
        <div style="background: rgba(255, 183, 3, 0.08); border: 1px solid rgba(255, 183, 3, 0.3); border-radius: var(--radius-sm); padding: 12px 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span class="badge badge-gold" style="font-weight: 800; font-size: 0.74rem; letter-spacing: 0.05em;"><i class="fas fa-user-shield"></i> PAINEL ADMIN</span>
            <span style="font-size: 0.85rem; color: #F1F5F9; font-weight: 600;">
              Edição autônoma ativa para <strong>${curr.beltName}</strong> (${beltTitleText}). Você pode corrigir qualquer texto ou técnica.
            </span>
          </div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button type="button" class="btn btn-sm btn-secondary" onclick="window.TKST_APP.openAddCurriculumTechniqueModal(${curr.kyuNumber}, 'kihon')" style="font-size: 0.78rem; padding: 6px 14px; color: var(--accent-gold); border-color: rgba(255, 183, 3, 0.45); display: flex; align-items: center; gap: 6px; cursor: pointer;">
              <i class="fas fa-plus-circle"></i> + Nova Técnica
            </button>
            <button type="button" class="btn btn-sm btn-outline" onclick="window.TKST_APP.resetCurriculumBelt(${curr.kyuNumber})" style="font-size: 0.78rem; padding: 6px 12px; color: #94A3B8; border-color: rgba(255, 255, 255, 0.2); display: flex; align-items: center; gap: 6px; cursor: pointer;" title="Restaura esta faixa exatamente como na apostila oficial TKST 2026">
              <i class="fas fa-undo"></i> Restaurar Padrão Oficial
            </button>
          </div>
        </div>
      ` : ''}

      <!-- Curriculum Sections as Accordion Buttons -->
      <div style="display: flex; flex-direction: column; gap: 14px; margin-top: 16px;">
        
        <!-- 1. KIHON / TABELA OFICIAL -->
        <div class="study-accordion-card" id="studyCard_kihon">
          <button type="button" class="study-accordion-header ${isKihonOpen ? 'active' : ''}" id="studyHeader_kihon" onclick="window.TKST_APP.toggleStudyAccordion('kihon')">
            <div class="study-accordion-title">
              <i class="fas fa-fist-raised" style="color: var(--accent-crimson); font-size: 1.25rem;"></i>
              <div>
                <h3>1. Kihon (Técnicas Fundamentais${curr.kyuNumber === 0 ? ' • Tabela Oficial' : (curr.kyuNumber < 0 ? ' • 3x Cada' : '')})</h3>
                <div style="font-size: 0.78rem; color: #94A3B8;">
                  ${curr.kyuNumber === 0 ? '86 técnicas e bases oficiais divididas em 4 pilares • Toque para abrir/fechar' : `${curr.kihon.length} técnicas exigidas em avanço (Mae) e recuo (Sagate) • Toque para abrir/fechar`}
                </div>
              </div>
            </div>
            <i class="fas fa-chevron-down study-accordion-icon" id="studyIcon_kihon" style="transform: ${isKihonOpen ? 'rotate(180deg)' : 'rotate(0deg)'};"></i>
          </button>

          <div class="study-accordion-body ${isKihonOpen ? 'active' : ''}" id="studyBody_kihon">
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
                        <div class="shodan-col-subtitle">${curr.shodanProgram.teWaza.length} Técnicas • Toque para ver técnicas</div>
                      </div>
                    </div>
                    <div class="shodan-col-actions">
                      <span class="shodan-arrow-badge mae" style="font-size: 0.7rem;">Mae / Sagate</span>
                      <i class="fas fa-chevron-down shodan-col-chevron" id="shodanIcon_teWaza"></i>
                    </div>
                  </button>
                  <div class="shodan-item-list" id="shodanBody_teWaza">
                    ${curr.shodanProgram.teWaza.map((t, idx) => `
                      <div class="shodan-tech-item" style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                        <div style="display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0;">
                          ${isAdmin ? `
                            <span style="display: inline-flex; align-items: center; gap: 2px; flex-shrink: 0;">
                              <button type="button" onclick="event.stopPropagation(); window.TKST_APP.openEditCurriculumTechniqueModal(${curr.kyuNumber}, 'teWaza', ${idx})" title="Editar técnica" style="background: none; border: none; color: #FFB703; cursor: pointer; padding: 2px 3px; font-size: 0.72rem;"><i class="fas fa-edit"></i></button>
                              <button type="button" onclick="event.stopPropagation(); window.TKST_APP.deleteCurriculumTechnique(${curr.kyuNumber}, 'teWaza', ${idx})" title="Excluir técnica" style="background: none; border: none; color: #F87171; cursor: pointer; padding: 2px 3px; font-size: 0.72rem;"><i class="fas fa-trash"></i></button>
                            </span>
                          ` : ''}
                          <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"><strong>${idx + 1}.</strong> ${t.name}</span>
                        </div>
                        <span class="shodan-arrow-badge ${t.direction === 'Mae' ? 'mae' : (t.direction === 'Sagate' ? 'sagate' : 'mawate')}">${t.arrow}</span>
                      </div>
                    `).join('')}
                    ${isAdmin ? `
                      <div style="padding: 8px; text-align: center;">
                        <button type="button" class="btn btn-sm btn-secondary" onclick="window.TKST_APP.openAddCurriculumTechniqueModal(${curr.kyuNumber}, 'teWaza')" style="font-size: 0.74rem; padding: 4px 10px; color: #3B82F6; border-color: rgba(59,130,246,0.4);"><i class="fas fa-plus"></i> Adicionar Técnica Te Waza</button>
                      </div>
                    ` : ''}
                  </div>
                </div>

                <!-- Coluna 2: Uke Waza (25 Técnicas) -->
                <div class="shodan-col-card" id="shodanCard_ukeWaza" style="border-top: 3px solid #10B981;">
                  <button type="button" class="shodan-col-header" id="shodanHeader_ukeWaza" onclick="window.TKST_APP.toggleShodanCol('ukeWaza')" aria-expanded="false">
                    <div class="shodan-col-title">
                      <i class="fas fa-shield-alt" style="color: #10B981; font-size: 1.15rem;"></i>
                      <div>
                        <span>Uke Waza (Defesas)</span>
                        <div class="shodan-col-subtitle">${curr.shodanProgram.ukeWaza.length} Técnicas • Toque para ver técnicas</div>
                      </div>
                    </div>
                    <div class="shodan-col-actions">
                      <span class="shodan-arrow-badge sagate" style="font-size: 0.7rem;">Mae / Sagate</span>
                      <i class="fas fa-chevron-down shodan-col-chevron" id="shodanIcon_ukeWaza"></i>
                    </div>
                  </button>
                  <div class="shodan-item-list" id="shodanBody_ukeWaza">
                    ${curr.shodanProgram.ukeWaza.map((t, idx) => `
                      <div class="shodan-tech-item" style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                        <div style="display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0;">
                          ${isAdmin ? `
                            <span style="display: inline-flex; align-items: center; gap: 2px; flex-shrink: 0;">
                              <button type="button" onclick="event.stopPropagation(); window.TKST_APP.openEditCurriculumTechniqueModal(${curr.kyuNumber}, 'ukeWaza', ${idx})" title="Editar técnica" style="background: none; border: none; color: #FFB703; cursor: pointer; padding: 2px 3px; font-size: 0.72rem;"><i class="fas fa-edit"></i></button>
                              <button type="button" onclick="event.stopPropagation(); window.TKST_APP.deleteCurriculumTechnique(${curr.kyuNumber}, 'ukeWaza', ${idx})" title="Excluir técnica" style="background: none; border: none; color: #F87171; cursor: pointer; padding: 2px 3px; font-size: 0.72rem;"><i class="fas fa-trash"></i></button>
                            </span>
                          ` : ''}
                          <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"><strong>${idx + 1}.</strong> ${t.name}</span>
                        </div>
                        <span class="shodan-arrow-badge ${t.direction === 'Mae' ? 'mae' : (t.direction === 'Sagate' ? 'sagate' : 'mawate')}">${t.arrow}</span>
                      </div>
                    `).join('')}
                    ${isAdmin ? `
                      <div style="padding: 8px; text-align: center;">
                        <button type="button" class="btn btn-sm btn-secondary" onclick="window.TKST_APP.openAddCurriculumTechniqueModal(${curr.kyuNumber}, 'ukeWaza')" style="font-size: 0.74rem; padding: 4px 10px; color: #10B981; border-color: rgba(16,185,129,0.4);"><i class="fas fa-plus"></i> Adicionar Técnica Uke Waza</button>
                      </div>
                    ` : ''}
                  </div>
                </div>

                <!-- Coluna 3: Ashi Waza (15 Técnicas) -->
                <div class="shodan-col-card" id="shodanCard_ashiWaza" style="border-top: 3px solid #F5BE00;">
                  <button type="button" class="shodan-col-header" id="shodanHeader_ashiWaza" onclick="window.TKST_APP.toggleShodanCol('ashiWaza')" aria-expanded="false">
                    <div class="shodan-col-title">
                      <i class="fas fa-shoe-prints" style="color: #F5BE00; font-size: 1.15rem;"></i>
                      <div>
                        <span>Ashi Waza (Chutes)</span>
                        <div class="shodan-col-subtitle">${curr.shodanProgram.ashiWaza.length} Técnicas • Toque para ver técnicas</div>
                      </div>
                    </div>
                    <div class="shodan-col-actions">
                      <span class="shodan-arrow-badge mawate" style="font-size: 0.7rem;">🔄 Giro</span>
                      <i class="fas fa-chevron-down shodan-col-chevron" id="shodanIcon_ashiWaza"></i>
                    </div>
                  </button>
                  <div class="shodan-item-list" id="shodanBody_ashiWaza">
                    ${curr.shodanProgram.ashiWaza.map((t, idx) => `
                      <div class="shodan-tech-item" style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                        <div style="display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0;">
                          ${isAdmin ? `
                            <span style="display: inline-flex; align-items: center; gap: 2px; flex-shrink: 0;">
                              <button type="button" onclick="event.stopPropagation(); window.TKST_APP.openEditCurriculumTechniqueModal(${curr.kyuNumber}, 'ashiWaza', ${idx})" title="Editar técnica" style="background: none; border: none; color: #FFB703; cursor: pointer; padding: 2px 3px; font-size: 0.72rem;"><i class="fas fa-edit"></i></button>
                              <button type="button" onclick="event.stopPropagation(); window.TKST_APP.deleteCurriculumTechnique(${curr.kyuNumber}, 'ashiWaza', ${idx})" title="Excluir técnica" style="background: none; border: none; color: #F87171; cursor: pointer; padding: 2px 3px; font-size: 0.72rem;"><i class="fas fa-trash"></i></button>
                            </span>
                          ` : ''}
                          <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"><strong>${idx + 1}.</strong> ${t.name}</span>
                        </div>
                        <span class="shodan-arrow-badge mawate">${t.arrow}</span>
                      </div>
                    `).join('')}
                    ${isAdmin ? `
                      <div style="padding: 8px; text-align: center;">
                        <button type="button" class="btn btn-sm btn-secondary" onclick="window.TKST_APP.openAddCurriculumTechniqueModal(${curr.kyuNumber}, 'ashiWaza')" style="font-size: 0.74rem; padding: 4px 10px; color: #F5BE00; border-color: rgba(245,190,0,0.4);"><i class="fas fa-plus"></i> Adicionar Técnica Ashi Waza</button>
                      </div>
                    ` : ''}
                  </div>
                </div>

                <!-- Coluna 4: Dachi Waza (18 Bases) -->
                <div class="shodan-col-card" id="shodanCard_dachiWaza" style="border-top: 3px solid #8B5CF6;">
                  <button type="button" class="shodan-col-header" id="shodanHeader_dachiWaza" onclick="window.TKST_APP.toggleShodanCol('dachiWaza')" aria-expanded="false">
                    <div class="shodan-col-title">
                      <i class="fas fa-layer-group" style="color: #8B5CF6; font-size: 1.15rem;"></i>
                      <div>
                        <span>Dachi Waza (Bases & Movimentação)</span>
                        <div class="shodan-col-subtitle">${curr.shodanProgram.dachiWaza.length} Técnicas • Toque para ver técnicas</div>
                      </div>
                    </div>
                    <div class="shodan-col-actions">
                      <span class="shodan-arrow-badge dachi" style="font-size: 0.7rem;">Mae / Sagate</span>
                      <i class="fas fa-chevron-down shodan-col-chevron" id="shodanIcon_dachiWaza"></i>
                    </div>
                  </button>
                  <div class="shodan-item-list" id="shodanBody_dachiWaza">
                    ${curr.shodanProgram.dachiWaza.map((t, idx) => {
                      const baseName = t.name;
                      return `
                      <div class="shodan-tech-item" style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                        <div style="display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0;">
                          ${isAdmin ? `
                            <span style="display: inline-flex; align-items: center; gap: 2px; flex-shrink: 0;">
                              <button type="button" onclick="event.stopPropagation(); window.TKST_APP.openEditCurriculumTechniqueModal(${curr.kyuNumber}, 'dachiWaza', ${idx})" title="Editar técnica" style="background: none; border: none; color: #FFB703; cursor: pointer; padding: 2px 3px; font-size: 0.72rem;"><i class="fas fa-edit"></i></button>
                              <button type="button" onclick="event.stopPropagation(); window.TKST_APP.deleteCurriculumTechnique(${curr.kyuNumber}, 'dachiWaza', ${idx})" title="Excluir técnica" style="background: none; border: none; color: #F87171; cursor: pointer; padding: 2px 3px; font-size: 0.72rem;"><i class="fas fa-trash"></i></button>
                            </span>
                          ` : ''}
                          <button 
                            type="button" 
                            onclick="window.TKST_APP.openDachiDetailFromCurriculum('${baseName.replace(/'/g, "\\'")}')" 
                            style="background: none; border: none; color: #FFF; font-size: 0.88rem; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; text-align: left; padding: 0; font-family: inherit; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"
                            title="Toque para ver a base no dicionário"
                          >
                            <span><strong>${idx + 1}.</strong> ${baseName}</span>
                          </button>
                        </div>
                        <span class="shodan-arrow-badge ${t.direction === 'Mae' ? 'mae' : 'sagate'}">${t.arrow}</span>
                      </div>
                    `;}).join('')}
                    ${isAdmin ? `
                      <div style="padding: 8px; text-align: center;">
                        <button type="button" class="btn btn-sm btn-secondary" onclick="window.TKST_APP.openAddCurriculumTechniqueModal(${curr.kyuNumber}, 'dachiWaza')" style="font-size: 0.74rem; padding: 4px 10px; color: #8B5CF6; border-color: rgba(139,92,246,0.4);"><i class="fas fa-plus"></i> Adicionar Base Dachi Waza</button>
                      </div>
                    ` : ''}
                  </div>
                </div>
              </div>
            ` : `
              <div class="technique-list">
                ${isAdmin ? `
                  <div style="display: flex; justify-content: flex-end; margin-bottom: 12px;">
                    <button type="button" class="btn btn-sm btn-secondary" onclick="window.TKST_APP.openAddCurriculumTechniqueModal(${curr.kyuNumber}, 'kihon')" style="font-size: 0.76rem; padding: 6px 14px; border-color: rgba(255, 183, 3, 0.4); color: var(--accent-gold); display: flex; align-items: center; gap: 6px; cursor: pointer;">
                      <i class="fas fa-plus"></i> + Adicionar Técnica no Kihon
                    </button>
                  </div>
                ` : ''}
                ${curr.kihon.map((k, idx) => `
                  <div class="technique-item" style="display: flex; align-items: center; gap: 10px; padding: 10px 12px;">
                    <div style="width: 8px; height: 8px; border-radius: 50%; background: var(--accent-crimson); flex-shrink: 0;"></div>
                    <div style="flex: 1; min-width: 0;">
                      <div class="technique-name" style="display: flex; align-items: center; gap: 6px;">
                        ${isAdmin ? `
                          <span style="display: inline-flex; align-items: center; gap: 3px; flex-shrink: 0;">
                            <button type="button" onclick="event.stopPropagation(); window.TKST_APP.openEditCurriculumTechniqueModal(${curr.kyuNumber}, 'kihon', ${idx})" title="Editar técnica" style="background: none; border: none; color: #FFB703; cursor: pointer; padding: 2px 4px; font-size: 0.78rem;"><i class="fas fa-edit"></i></button>
                            <button type="button" onclick="event.stopPropagation(); window.TKST_APP.deleteCurriculumTechnique(${curr.kyuNumber}, 'kihon', ${idx})" title="Excluir técnica" style="background: none; border: none; color: #F87171; cursor: pointer; padding: 2px 4px; font-size: 0.78rem;"><i class="fas fa-trash"></i></button>
                          </span>
                        ` : ''}
                        <span style="font-weight: 700; color: #FFF; font-size: 0.95rem;">${k.technique}</span>
                      </div>
                      <div class="technique-meta" style="white-space: nowrap; overflow-x: auto; scrollbar-width: none; -webkit-overflow-scrolling: touch; display: flex; align-items: center; gap: 6px; font-size: 0.78rem; margin-top: 3px; color: #94A3B8;">
                        <span class="stance" style="color: var(--accent-gold); font-weight: 600; white-space: nowrap;">${k.stance}</span>
                        <span style="color: #475569;">•</span>
                        <span style="white-space: nowrap;">${k.direction}</span>
                        <span style="color: #475569;">•</span>
                        <span style="color: #94A3B8; white-space: nowrap;">${k.count}</span>
                        ${k.focus ? `<span style="color: #475569;">•</span><span style="color: var(--accent-gold); font-size: 0.76rem; white-space: nowrap;">${k.focus}</span>` : ''}
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
            <button type="button" class="study-accordion-header ${isGeriOpen ? 'active' : ''}" id="studyHeader_geri" onclick="window.TKST_APP.toggleStudyAccordion('geri')">
              <div class="study-accordion-title">
                <i class="fas fa-shoe-prints" style="color: #F5BE00; font-size: 1.25rem;"></i>
                <div>
                  <h3>2. Geri Waza (Técnicas de Chutes • 3x)</h3>
                  <div style="font-size: 0.78rem; color: #94A3B8;">${curr.geri.length} sequências dinâmicas de chutes exigidas em avaliação • Toque para abrir/fechar</div>
                </div>
              </div>
              <i class="fas fa-chevron-down study-accordion-icon" id="studyIcon_geri" style="transform: ${isGeriOpen ? 'rotate(180deg)' : 'rotate(0deg)'};"></i>
            </button>

            <div class="study-accordion-body ${isGeriOpen ? 'active' : ''}" id="studyBody_geri">
              ${isAdmin ? `
                <div style="display: flex; justify-content: flex-end; margin-bottom: 12px;">
                  <button type="button" class="btn btn-sm btn-secondary" onclick="window.TKST_APP.openAddCurriculumTechniqueModal(${curr.kyuNumber}, 'geri')" style="font-size: 0.76rem; padding: 6px 14px; border-color: rgba(255, 183, 3, 0.4); color: var(--accent-gold); display: flex; align-items: center; gap: 6px; cursor: pointer;">
                    <i class="fas fa-plus"></i> + Adicionar Chute em Geri Waza
                  </button>
                </div>
              ` : ''}
              <div class="technique-list">
                ${curr.geri.map((g, idx) => `
                  <div class="technique-item" style="border-left: 3px solid #F5BE00; display: flex; align-items: center; gap: 10px; padding: 10px 12px;">
                    <div style="width: 8px; height: 8px; border-radius: 50%; background: #F5BE00; flex-shrink: 0;"></div>
                    <div style="flex: 1; min-width: 0;">
                      <div class="technique-name" style="display: flex; align-items: center; gap: 6px;">
                        ${isAdmin ? `
                          <span style="display: inline-flex; align-items: center; gap: 3px; flex-shrink: 0;">
                            <button type="button" onclick="event.stopPropagation(); window.TKST_APP.openEditCurriculumTechniqueModal(${curr.kyuNumber}, 'geri', ${idx})" title="Editar chute" style="background: none; border: none; color: #FFB703; cursor: pointer; padding: 2px 4px; font-size: 0.78rem;"><i class="fas fa-edit"></i></button>
                            <button type="button" onclick="event.stopPropagation(); window.TKST_APP.deleteCurriculumTechnique(${curr.kyuNumber}, 'geri', ${idx})" title="Excluir chute" style="background: none; border: none; color: #F87171; cursor: pointer; padding: 2px 4px; font-size: 0.78rem;"><i class="fas fa-trash"></i></button>
                          </span>
                        ` : ''}
                        <span style="font-weight: 700; color: #FFF; font-size: 0.95rem;">${g.name}</span>
                      </div>
                      <div class="technique-meta" style="margin-top: 3px; color: #94A3B8; white-space: nowrap; overflow-x: auto; scrollbar-width: none; font-size: 0.78rem;">
                        <i class="fas fa-info-circle" style="color: var(--accent-gold); font-size: 0.75rem;"></i> ${g.detail}
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
            <button type="button" class="study-accordion-header ${isUkemiOpen ? 'active' : ''}" id="studyHeader_ukemi" onclick="window.TKST_APP.toggleStudyAccordion('ukemi')">
              <div class="study-accordion-title">
                <i class="fas fa-user-ninja" style="color: #10B981; font-size: 1.25rem;"></i>
                <div>
                  <h3>${curr.geri ? '3' : '2'}. Ukemi (Quedas & Rolamentos Amortecidos • 3x)</h3>
                  <div style="font-size: 0.78rem; color: #94A3B8;">4 técnicas de amortecimento de impacto e projeção • Toque para abrir/fechar</div>
                </div>
              </div>
              <i class="fas fa-chevron-down study-accordion-icon" id="studyIcon_ukemi" style="transform: ${isUkemiOpen ? 'rotate(180deg)' : 'rotate(0deg)'};"></i>
            </button>

            <div class="study-accordion-body ${isUkemiOpen ? 'active' : ''}" id="studyBody_ukemi">
              ${isAdmin ? `
                <div style="display: flex; justify-content: flex-end; margin-bottom: 12px;">
                  <button type="button" class="btn btn-sm btn-secondary" onclick="window.TKST_APP.openAddCurriculumTechniqueModal(${curr.kyuNumber}, 'ukemi')" style="font-size: 0.76rem; padding: 6px 14px; border-color: rgba(255, 183, 3, 0.4); color: var(--accent-gold); display: flex; align-items: center; gap: 6px; cursor: pointer;">
                    <i class="fas fa-plus"></i> + Adicionar Queda em Ukemi
                  </button>
                </div>
              ` : ''}
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 10px;">
                ${curr.ukemi.map((u, idx) => `
                  <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-left: 3px solid #10B981; border-radius: var(--radius-sm); padding: 10px 12px;">
                    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 3px;">
                      ${isAdmin ? `
                        <span style="display: inline-flex; align-items: center; gap: 3px; flex-shrink: 0;">
                          <button type="button" onclick="event.stopPropagation(); window.TKST_APP.openEditCurriculumTechniqueModal(${curr.kyuNumber}, 'ukemi', ${idx})" title="Editar" style="background: none; border: none; color: #FFB703; cursor: pointer; padding: 2px 4px; font-size: 0.75rem;"><i class="fas fa-edit"></i></button>
                          <button type="button" onclick="event.stopPropagation(); window.TKST_APP.deleteCurriculumTechnique(${curr.kyuNumber}, 'ukemi', ${idx})" title="Excluir" style="background: none; border: none; color: #F87171; cursor: pointer; padding: 2px 4px; font-size: 0.75rem;"><i class="fas fa-trash"></i></button>
                        </span>
                      ` : ''}
                      <span style="font-weight: 700; color: #FFF; font-size: 0.92rem;">🥋 ${u.name}</span>
                    </div>
                    <div style="font-size: 0.8rem; color: #94A3B8; white-space: nowrap; overflow-x: auto; scrollbar-width: none;">${u.detail}</div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        ` : ''}

        <!-- KATA EXIGIDO -->
        <div class="study-accordion-card" id="studyCard_kata">
          <button type="button" class="study-accordion-header ${isKataOpen ? 'active' : ''}" id="studyHeader_kata" onclick="window.TKST_APP.toggleStudyAccordion('kata')">
            <div class="study-accordion-title">
              <i class="fas fa-book-open" style="color: var(--accent-gold); font-size: 1.25rem;"></i>
              <div>
                <h3>${(curr.geri && curr.ukemi) ? '4' : ((curr.geri || curr.ukemi) ? '3' : '2')}. Kata Exigido</h3>
                <div style="font-size: 0.78rem; color: #94A3B8;">
                  ${curr.shodanProgram ? '9 Katas Oficiais (5 Heian com Bunkai + 4 Superiores)' : `${(curr.kata.required || []).join(', ')}${curr.kata.optional ? ` • +${curr.kata.optional.length} Opcionais` : ''}`} • Toque para ver detalhes
                </div>
              </div>
            </div>
            <i class="fas fa-chevron-down study-accordion-icon" id="studyIcon_kata" style="transform: ${isKataOpen ? 'rotate(180deg)' : 'rotate(0deg)'};"></i>
          </button>

          <div class="study-accordion-body ${isKataOpen ? 'active' : ''}" id="studyBody_kata">
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
          <button type="button" class="study-accordion-header ${isKumiteOpen ? 'active' : ''}" id="studyHeader_kumite" onclick="window.TKST_APP.toggleStudyAccordion('kumite')">
            <div class="study-accordion-title">
              <i class="fas fa-shield-alt" style="color: var(--accent-blue); font-size: 1.25rem;"></i>
              <div>
                <h3>${(curr.geri && curr.ukemi) ? '5' : ((curr.geri || curr.ukemi) ? '4' : '3')}. Kumite (Combate)</h3>
                <div style="font-size: 0.78rem; color: #94A3B8;">${curr.kumite.type} • Toque para ver regras e postura</div>
              </div>
            </div>
            <i class="fas fa-chevron-down study-accordion-icon" id="studyIcon_kumite" style="transform: ${isKumiteOpen ? 'rotate(180deg)' : 'rotate(0deg)'};"></i>
          </button>

          <div class="study-accordion-body ${isKumiteOpen ? 'active' : ''}" id="studyBody_kumite">
            <div style="color: var(--accent-gold); font-weight: 700; font-size: 1rem; margin-bottom: 8px;">
              <i class="fas fa-fist-raised" style="margin-right: 6px;"></i> ${curr.kumite.type}
            </div>
            <p style="font-size: 0.9rem; color: #CBD5E1; line-height: 1.6; margin-bottom: 16px;">${curr.kumite.description}</p>

            ${renderBeltKumiteInfographic(curr)}
          </div>
        </div>

        ${curr.dachiWaza && !curr.shodanProgram ? `
        <!-- DACHI WAZA (Bases Exigidas) -->
        <div class="study-accordion-card" id="studyCard_dachi">
          <button type="button" class="study-accordion-header ${isDachiOpen ? 'active' : ''}" id="studyHeader_dachi" onclick="window.TKST_APP.toggleStudyAccordion('dachi')">
            <div class="study-accordion-title">
              <i class="fas fa-layer-group" style="color: #8B5CF6; font-size: 1.25rem;"></i>
              <div>
                <h3>${(curr.geri && curr.ukemi) ? '6' : ((curr.geri || curr.ukemi) ? '5' : '4')}. Dachi Waza (Bases Exigidas)</h3>
                <div style="font-size: 0.78rem; color: #94A3B8;">${curr.dachiWaza.length} bases avaliadas • Toque para ver</div>
              </div>
            </div>
            <i class="fas fa-chevron-down study-accordion-icon" id="studyIcon_dachi" style="transform: ${isDachiOpen ? 'rotate(180deg)' : 'rotate(0deg)'};"></i>
          </button>
          <div class="study-accordion-body ${isDachiOpen ? 'active' : ''}" id="studyBody_dachi">
            <div class="dachi-grid-quadrados">
              ${curr.dachiWaza.map((d, idx) => {
                const baseName = typeof d === 'string' ? d : (d.name || '');
                return `
                <div class="dachi-quadrado-card" onclick="window.TKST_APP.openDachiDetailFromCurriculum('${baseName.replace(/'/g, "\\'")}')" title="Toque para ver a foto da base ${baseName}">
                  ${isAdmin ? `
                    <div class="dachi-quadrado-admin" onclick="event.stopPropagation();">
                      <button type="button" onclick="event.stopPropagation(); window.TKST_APP.openEditCurriculumTechniqueModal(${curr.kyuNumber}, 'dachiWaza', ${idx})" style="color: #FFB703;" title="Editar base"><i class="fas fa-edit"></i></button>
                      <button type="button" onclick="event.stopPropagation(); window.TKST_APP.deleteCurriculumTechnique(${curr.kyuNumber}, 'dachiWaza', ${idx})" style="color: #F87171;" title="Excluir base"><i class="fas fa-trash"></i></button>
                    </div>
                  ` : ''}
                  <span class="dachi-quadrado-name">${baseName}</span>
                </div>
              `;}).join('')}
            </div>
            ${isAdmin ? `
              <div style="margin-top: 12px; text-align: center;">
                <button type="button" class="btn btn-sm btn-outline" onclick="window.TKST_APP.openAddCurriculumTechniqueModal(${curr.kyuNumber}, 'dachiWaza')" style="font-size: 0.76rem; padding: 7px 14px; color: #A78BFA; border-color: rgba(167,139,250,0.4); display: inline-flex; align-items: center; gap: 5px; cursor: pointer; border-radius: var(--radius-sm);">
                  <i class="fas fa-plus"></i> + Adicionar Base
                </button>
              </div>
            ` : ''}
          </div>
        </div>
        ` : ''}

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
          <div class="glossary-card-trio" onclick="window.TKST_APP.openGlossaryDetailModal('${t.categoryKey}', '${t.japanese.replace(/'/g, "\\'")}')" title="Toque para ver detalhes de ${t.japanese}">
            <div class="glossary-card-line-name" title="${t.japanese}">${t.japanese}</div>
            <div class="glossary-card-line-jp" title="${t.kanji || t.japanese}">${t.kanji || t.japanese}</div>
            <div class="glossary-card-line-link">
              <span>Ver detalhes</span>
              <i class="fas fa-chevron-right" style="font-size: 0.55rem;"></i>
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

  // ==========================================
  // TKST AUDIO ENGINE (Web Audio API Synthesizer + Hans Zimmer Track)
  // ==========================================
  const TKST_AUDIO = {
    audioCtx: null,
    interstellarAudio: null,
    isMuted: localStorage.getItem('tkst_quiz_muted') === 'true',

    init: function() {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      if (!this.interstellarAudio) {
        try {
          this.interstellarAudio = new Audio('assets/audio/interstellar-ticktock-15s.mp3');
          this.interstellarAudio.preload = 'auto';
        } catch(e) {}
      }
    },

    playInterstellarTrack: function() {
      if (this.isMuted) return;
      this.init();
      if (!this.interstellarAudio) return;

      try {
        this.interstellarAudio.loop = true;
        this.interstellarAudio.volume = 0.85;
        if (this.interstellarAudio.paused) {
          const p = this.interstellarAudio.play();
          if (p !== undefined) {
            p.catch(() => {
              // Autoplay prevented before first gesture, fallback silently
            });
          }
        }
      } catch (err) {
        console.warn('Interstellar audio play error:', err);
      }
    },

    stopInterstellarTrack: function() {
      if (this.interstellarAudio) {
        try {
          this.interstellarAudio.pause();
          this.interstellarAudio.currentTime = 0;
        } catch (e) {}
      }
    },

    toggleMute: function() {
      this.isMuted = !this.isMuted;
      localStorage.setItem('tkst_quiz_muted', String(this.isMuted));
      if (this.isMuted) {
        this.stopInterstellarTrack();
      } else {
        this.init();
        if (quizActive && !quizAnswered) {
          this.playInterstellarTrack();
        }
      }
      const btns = document.querySelectorAll('.quiz-sound-toggle');
      btns.forEach(btn => {
        if (this.isMuted) {
          btn.classList.add('muted');
          btn.innerHTML = '<i class="fas fa-volume-mute"></i>';
          btn.title = 'Ativar Som do Simulado';
        } else {
          btn.classList.remove('muted');
          btn.innerHTML = '<i class="fas fa-volume-up"></i>';
          btn.title = 'Silenciar Som do Simulado';
        }
      });
      return this.isMuted;
    },

    // Hans Zimmer "Miller's Planet" Interstellar Clock Ticking Fallback
    playInterstellarTick: function(isCritical) {
      if (this.isMuted) return;
      this.init();
      if (!this.audioCtx) return;

      try {
        const now = this.audioCtx.currentTime;

        // 1. High-frequency crisp acoustic tick
        const bufferSize = Math.floor(this.audioCtx.sampleRate * 0.028);
        const noiseBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = this.audioCtx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;

        const bandpass = this.audioCtx.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.setValueAtTime(isCritical ? 2500 : 1650, now);
        bandpass.Q.setValueAtTime(9.0, now);

        const noiseGain = this.audioCtx.createGain();
        noiseGain.gain.setValueAtTime(isCritical ? 0.38 : 0.24, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);

        whiteNoise.connect(bandpass);
        bandpass.connect(noiseGain);
        noiseGain.connect(this.audioCtx.destination);

        whiteNoise.start(now);
        whiteNoise.stop(now + 0.028);

        // 2. Low-frequency cinematic acoustic thud (Miller's planet pulse)
        const osc = this.audioCtx.createOscillator();
        const oscGain = this.audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(isCritical ? 135 : 95, now);
        osc.frequency.exponentialRampToValueAtTime(42, now + 0.045);

        oscGain.gain.setValueAtTime(isCritical ? 0.42 : 0.28, now);
        oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

        osc.connect(oscGain);
        oscGain.connect(this.audioCtx.destination);

        osc.start(now);
        osc.stop(now + 0.05);
      } catch (err) {}
    },

    // Microwave Oven End Timer Bell ("Plim / Ding!")
    playMicrowaveDing: function() {
      if (this.isMuted) return;
      this.init();
      if (!this.audioCtx) return;

      try {
        const now = this.audioCtx.currentTime;

        // Primary chime oscillator (approx 2450 Hz)
        const osc1 = this.audioCtx.createOscillator();
        const gain1 = this.audioCtx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(2450, now);

        gain1.gain.setValueAtTime(0.5, now);
        gain1.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);

        osc1.connect(gain1);
        gain1.connect(this.audioCtx.destination);

        // Overtone / upper harmonic oscillator (approx 4900 Hz)
        const osc2 = this.audioCtx.createOscillator();
        const gain2 = this.audioCtx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(4900, now);

        gain2.gain.setValueAtTime(0.18, now);
        gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);

        osc2.connect(gain2);
        gain2.connect(this.audioCtx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.45);
        osc2.stop(now + 0.95);
      } catch (err) {}
    },

    // Fullscreen Countdown Taiko / Martial Arts Gong
    playCountdownBeat: function(step) {
      if (this.isMuted) return;
      this.init();
      if (!this.audioCtx) return;

      try {
        const now = this.audioCtx.currentTime;

        if (step === 'hajime') {
          // Grand Hajime Gong / Cymbal Strike
          const osc = this.audioCtx.createOscillator();
          const oscGain = this.audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(320, now);
          osc.frequency.exponentialRampToValueAtTime(65, now + 0.7);

          oscGain.gain.setValueAtTime(0.65, now);
          oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);

          osc.connect(oscGain);
          oscGain.connect(this.audioCtx.destination);
          osc.start(now);
          osc.stop(now + 0.75);

          // High shimmer
          const oscHigh = this.audioCtx.createOscillator();
          const highGain = this.audioCtx.createGain();
          oscHigh.type = 'triangle';
          oscHigh.frequency.setValueAtTime(880, now);
          highGain.gain.setValueAtTime(0.3, now);
          highGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

          oscHigh.connect(highGain);
          highGain.connect(this.audioCtx.destination);
          oscHigh.start(now);
          oscHigh.stop(now + 0.55);
        } else {
          // Deep Taiko Drum Strike (Ichi, Ni, San)
          const osc = this.audioCtx.createOscillator();
          const oscGain = this.audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(190, now);
          osc.frequency.exponentialRampToValueAtTime(55, now + 0.35);

          oscGain.gain.setValueAtTime(0.55, now);
          oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

          osc.connect(oscGain);
          oscGain.connect(this.audioCtx.destination);
          osc.start(now);
          osc.stop(now + 0.38);
        }
      } catch (err) {}
    }
  };

  let quizCountdownTimeout = null;

  function runQuizCountdown(onComplete) {
    TKST_AUDIO.init();

    if (quizCountdownTimeout) {
      clearTimeout(quizCountdownTimeout);
      quizCountdownTimeout = null;
    }

    // Remove any existing overlay
    const existing = document.getElementById('quizCountdownOverlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'quizCountdownOverlay';
    overlay.className = 'quiz-countdown-overlay';

    document.body.appendChild(overlay);

    const steps = [
      { kanji: '一', romaji: 'ICHI', sub: '1 • Concentração e Postura (Yoi)', sound: 1 },
      { kanji: '二', romaji: 'NI', sub: '2 • Foco e Respiração (Kokyu)', sound: 2 },
      { kanji: '三', romaji: 'SAN', sub: '3 • Espírito Alerta (Zanshin)', sound: 3 },
      { kanji: '始め', romaji: 'HAJIME!', sub: 'Começar! Dê o seu melhor!', sound: 'hajime', isHajime: true }
    ];

    let currentStep = 0;

    function renderStep() {
      if (currentStep >= steps.length) {
        overlay.classList.add('fade-out');
        setTimeout(() => {
          overlay.remove();
          if (typeof onComplete === 'function') onComplete();
        }, 350);
        return;
      }

      const s = steps[currentStep];
      TKST_AUDIO.playCountdownBeat(s.sound);

      overlay.className = `quiz-countdown-overlay ${s.isHajime ? 'quiz-countdown-hajime' : ''}`;
      overlay.innerHTML = `
        <div class="quiz-countdown-card">
          <div class="quiz-countdown-ring">
            <div class="quiz-countdown-kanji">${s.kanji}</div>
          </div>
          <div class="quiz-countdown-romaji">${s.romaji}</div>
          <div class="quiz-countdown-sub">${s.sub}</div>
          <div style="margin-top: 24px; font-size: 0.8rem; color: #64748B; display: flex; align-items: center; gap: 6px;">
            <i class="fas fa-hand-rock" style="color: var(--accent-gold);"></i> TKST Karatê Shotokan
          </div>
        </div>
      `;

      const delay = s.isHajime ? 1150 : 950;
      currentStep++;
      quizCountdownTimeout = setTimeout(renderStep, delay);
    }

    renderStep();
  }

  function startQuiz(kyuNumber, beltName) {
    if (quizTimerInterval) { clearInterval(quizTimerInterval); quizTimerInterval = null; }
    if (quizAutoAdvanceTimeout) { clearTimeout(quizAutoAdvanceTimeout); quizAutoAdvanceTimeout = null; }
    if (quizCountdownTimeout) { clearTimeout(quizCountdownTimeout); quizCountdownTimeout = null; }

    TKST_AUDIO.init();

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
      const parsedKyu = parseInt(kyuNumber, 10);
      pool = bank.filter(q => {
        const qKyu = Number(q.kyuNumber !== undefined ? q.kyuNumber : (q.kyu !== undefined ? q.kyu : -999));
        return (parsedKyu === 6) ? (qKyu === 6 || qKyu === 7) : (qKyu === parsedKyu);
      });
      if (pool.length === 0) {
        pool = bank.filter(q => {
          const qKyu = Number(q.kyuNumber !== undefined ? q.kyuNumber : (q.kyu !== undefined ? q.kyu : -999));
          return qKyu <= parsedKyu && qKyu >= 0;
        });
      }
      if (pool.length === 0) {
        pool = [...bank];
      }
      questionCount = 10;
    }

    if (!pool || pool.length === 0) {
      alert('ℹ️ Nenhuma questão cadastrada no simulado no momento. Acesse a área de administração para cadastrar novas questões.');
      return;
    }

    // Ensure all questions have smart contextual options without any placeholder text
    pool = pool.map(q => ensureSmartQuestionOptions(q));

    // Shuffle pool
    const shuffled = [...pool].sort(() => 0.5 - Math.random());

    // Filter to guarantee NO duplicate questions and NO duplicate correct answers in the same quiz
    const uniqueSelected = [];
    const seenQuestions = new Set();
    const seenCorrectAnswers = new Set();

    for (const q of shuffled) {
      if (uniqueSelected.length >= questionCount) break;

      const qKey = (q.question || '').trim().toLowerCase().replace(/[^\w\s]/g, '');
      const correctAns = (q.options && q.options[q.correctIndex] ? q.options[q.correctIndex] : '').trim().toLowerCase();
      const ansKey = correctAns.replace(/[^\w\s]/g, '').trim();

      if (qKey && !seenQuestions.has(qKey) && ansKey && !seenCorrectAnswers.has(ansKey)) {
        seenQuestions.add(qKey);
        seenCorrectAnswers.add(ansKey);
        uniqueSelected.push(q);
      }
    }

    // Fallback if strict answer uniqueness returned fewer questions than questionCount
    if (uniqueSelected.length < questionCount) {
      for (const q of shuffled) {
        if (uniqueSelected.length >= questionCount) break;
        const qKey = (q.question || '').trim().toLowerCase().replace(/[^\w\s]/g, '');
        if (qKey && !seenQuestions.has(qKey)) {
          seenQuestions.add(qKey);
          uniqueSelected.push(q);
        }
      }
    }

    currentQuizQuestions = uniqueSelected.length > 0 ? uniqueSelected : shuffled.slice(0, Math.min(questionCount, shuffled.length));
    currentQuizIndex = 0;
    quizScore = 0;
    quizAnswered = false;
    currentQuizKyu = kyuNumber;
    currentQuizBelt = beltName;
    quizSubmissionDetails = [];

    // Executa a contagem regressiva em tela cheia (Ichi, Ni, San, Hajime!)
    runQuizCountdown(() => {
      quizActive = true;
      renderQuiz();
    });
  }

  function exitQuiz(forceQuitWithoutPenalty) {
    if (quizTimerInterval) { clearInterval(quizTimerInterval); quizTimerInterval = null; }
    if (quizAutoAdvanceTimeout) { clearTimeout(quizAutoAdvanceTimeout); quizAutoAdvanceTimeout = null; }
    if (quizCountdownTimeout) { clearTimeout(quizCountdownTimeout); quizCountdownTimeout = null; }
    TKST_AUDIO.stopInterstellarTrack();
    const overlay = document.getElementById('quizCountdownOverlay');
    if (overlay) overlay.remove();

    // Se o simulado estiver em andamento, alerta o aluno e computa as questões restantes como erros
    if (quizActive && currentQuizQuestions.length > 0 && currentQuizIndex < currentQuizQuestions.length && !forceQuitWithoutPenalty) {
      const remainingCount = currentQuizQuestions.length - quizSubmissionDetails.length;
      const confirmExit = confirm(`⚠️ ATENÇÃO: Abandonar o simulado em andamento!\n\nAs ${remainingCount} questão(ões) restantes serão computadas como ERROS no Ranking Oficial (-1 ponto por erro).\n\nDeseja realmente desistir desta tentativa?`);
      if (!confirmExit) {
        return;
      }

      // Preenche as questões restantes como erro/desistência
      for (let i = quizSubmissionDetails.length; i < currentQuizQuestions.length; i++) {
        const remQ = currentQuizQuestions[i];
        quizSubmissionDetails.push({
          question: remQ.question,
          image: remQ.image || '',
          options: remQ.options,
          selectedIndex: -1,
          selectedText: 'Desistência / Não respondida',
          correctIndex: remQ.correctIndex,
          correctText: remQ.options[remQ.correctIndex],
          isCorrect: false
        });
      }

      if (quizActive) {
        quizActive = false;
        window.TKST_AUTH.saveQuizSubmission({
          beltLevel: currentQuizBelt,
          beltKyu: currentQuizKyu,
          score: quizScore,
          total: currentQuizQuestions.length,
          details: quizSubmissionDetails
        });
      }

      currentQuizIndex = currentQuizQuestions.length; // Redireciona direto para a tela de resultado
      renderQuiz();
      return;
    }

    quizActive = false;
    currentQuizQuestions = [];
    renderQuiz();
  }

  function renderQuiz() {
    if (quizTimerInterval) { clearInterval(quizTimerInterval); quizTimerInterval = null; }
    if (quizAutoAdvanceTimeout) { clearTimeout(quizAutoAdvanceTimeout); quizAutoAdvanceTimeout = null; }
    if (!quizActive) {
      TKST_AUDIO.stopInterstellarTrack();
    }

    const user = window.TKST_AUTH.getCurrentUser();
    const isAdmin = window.TKST_AUTH.isAdmin();
    const userProgress = window.TKST_AUTH.getProgress();
    const userKyu = user ? (user.currentKyu !== undefined ? user.currentKyu : 7) : 7;

    const quizScores = (userProgress && userProgress.quizScores) || [];
    const hasPerfectInOwnBelt = quizScores.some(s => (s.score === 10 || s.percentage === 100) && (s.beltKyu === userKyu || s.beltLevel === (user ? user.currentBelt : '')));

    // 1. DETAILED RESULTS SCREEN (Exibe e mantém na tela até que o aluno feche ou refaça)
    if (currentQuizQuestions.length > 0 && currentQuizIndex >= currentQuizQuestions.length) {
      TKST_AUDIO.stopInterstellarTrack();
      const finalPercent = Math.round((quizScore / currentQuizQuestions.length) * 100);
      const isPassed = finalPercent >= 70;
      const isPerfect = quizScore === currentQuizQuestions.length;

      let resultHtml = `
        <div class="section-header" style="justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
          <div class="section-title-group">
            <h3><i class="fas fa-trophy" style="color: var(--accent-gold);"></i> Resultado do Simulado • ${currentQuizBelt}</h3>
          </div>
          <button class="btn btn-secondary" onclick="window.TKST_APP.exitQuiz()" style="font-size: 0.80rem; padding: 7px 14px; font-weight: 700; display: inline-flex; align-items: center; gap: 6px;">
            <i class="fas fa-times-circle"></i> Fechar / Voltar aos Simulados
          </button>
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
              <i class="fas fa-list"></i> Fechar e Escolher Outro Nível
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

          <div style="display: flex; justify-content: center; margin-top: 24px;">
            <button class="btn btn-secondary" onclick="window.TKST_APP.exitQuiz()" style="padding: 10px 24px; font-weight: 700;">
              <i class="fas fa-check"></i> Fechar Gabarito / Concluir
            </button>
          </div>
        </div>
      `;
      mainContent.innerHTML = resultHtml;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // 2. LEVEL SELECTOR SCREEN
    if (!quizActive) {
      const quizLevels = [
        { kyu: 7, name: "Faixa Branca", kyuLabel: "7º Kyu", color: "#FFFFFF" },
        { kyu: 6, name: "Faixa Amarela", kyuLabel: "6º Kyu", color: "#F5BE00" },
        { kyu: 5, name: "Faixa Vermelha", kyuLabel: "5º Kyu", color: "#E63946" },
        { kyu: 4, name: "Faixa Laranja", kyuLabel: "4º Kyu", color: "#FF7700" },
        { kyu: 3, name: "Faixa Verde", kyuLabel: "3º Kyu", color: "#10B981" },
        { kyu: 2, name: "Faixa Roxa", kyuLabel: "2º Kyu", color: "#8B5CF6" },
        { kyu: 1, name: "Faixa Marrom", kyuLabel: "1º Kyu", color: "#78350F" },
        { kyu: 0, name: "Faixa Preta", kyuLabel: "Shodan (1º Dan)", color: "#18181B" },
        { kyu: -1, name: "Faixa Preta", kyuLabel: "Nidan (2º Dan)", color: "#1E293B" },
        { kyu: -2, name: "Faixa Preta", kyuLabel: "Sandan (3º Dan)", color: "#020617" }
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
        <div class="section-header" style="margin-bottom: 8px;">
          <div class="section-title-group">
            <h3 style="font-size: 1.05rem; margin-bottom: 2px;"><i class="fas fa-brain" style="color: var(--accent-gold);"></i> Simulador de Exame Teórico</h3>
          </div>
        </div>

        <!-- Simulado Geral (Destaque com Logo TKST de Fundo) -->
        <div class="dashboard-hero" style="margin-bottom: 8px; padding: 10px 12px; position: relative; overflow: hidden; border: 1px solid rgba(255, 183, 3, 0.35); background: linear-gradient(135deg, rgba(20, 26, 38, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%);">
          <!-- Logo TKST Marca d'Água de Fundo -->
          <img src="assets/images/logo-tkst-projeto-transp.png" alt="TKST Logo Background" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); height: 130%; max-width: 140px; object-fit: contain; opacity: 0.12; pointer-events: none; z-index: 0;">

          <div style="position: relative; z-index: 1; display: flex; justify-content: space-between; align-items: center; gap: 10px;">
            <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
              <div style="width: 36px; height: 36px; border-radius: var(--radius-sm); background: linear-gradient(135deg, rgba(255,183,3,0.3) 0%, rgba(217,119,6,0.3) 100%); display: flex; align-items: center; justify-content: center; font-size: 1.15rem; color: var(--accent-gold); border: 1.5px solid var(--accent-gold); flex-shrink: 0; box-shadow: 0 0 10px rgba(255, 183, 3, 0.2);">
                🏆
              </div>
              <div style="min-width: 0;">
                <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                  <h4 style="color: #FFF; font-family: var(--font-heading); font-size: 0.94rem; margin: 0; font-weight: 700; white-space: nowrap;">
                    Simulado Geral
                  </h4>
                  <span class="badge badge-amarela" style="font-size: 0.60rem; padding: 1.5px 5px; font-weight: 800;">30 Questões</span>
                </div>
                <div style="color: #CBD5E1; font-size: 0.68rem; line-height: 1.2; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  Desafio com todas as faixas sorteadas
                </div>
              </div>
            </div>
            <button class="btn btn-primary" onclick="window.TKST_APP.startQuizLevel('all', 'Simulado Geral')" style="padding: 7px 13px; font-weight: 800; font-size: 0.78rem; background: linear-gradient(135deg, #FFB703 0%, #D97706 100%); color: #000; border: none; box-shadow: 0 3px 10px rgba(245, 190, 0, 0.35); cursor: pointer; flex-shrink: 0; white-space: nowrap;">
              <i class="fas fa-play" style="margin-right: 4px; font-size: 0.66rem;"></i> Iniciar Geral
            </button>
          </div>
        </div>

        <!-- Banner de Regras / Status (Descrição na linha de baixo) -->
        <div class="dashboard-hero" style="margin-bottom: 8px; padding: 7px 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 6px; margin-bottom: 3px;">
            <span class="badge badge-amarela" style="font-size: 0.64rem; padding: 2px 6px; font-weight: 700;">
              Sua Graduação: ${user ? user.currentBelt : 'Faixa Branca'}
            </span>
            ${hasPerfectInOwnBelt ? `
              <span style="background: rgba(16,185,129,0.15); border: 1px solid var(--accent-emerald); color: #6EE7B7; padding: 1.5px 6px; border-radius: 3px; font-size: 0.62rem; font-weight: 700; white-space: nowrap;">
                <i class="fas fa-unlock"></i> Liberado!
              </span>
            ` : ''}
          </div>
          <div style="color: #94A3B8; font-size: 0.68rem; line-height: 1.25; margin-top: 2px;">
            Acerte <strong style="color: var(--accent-gold);">10/10 (100%)</strong> no seu nível para desbloquear as graduações superiores.<br>
            <span style="color: #CBD5E1;"><i class="fas fa-shield-alt" style="color: var(--accent-gold); margin-right: 3px;"></i> <strong>Modo Exame Oficial:</strong> Gabarito ao final • Abandonar computa erro no Ranking.</span>
          </div>
        </div>

        <!-- Grade de Níveis de Graduação em 3 Colunas -->
        <div class="quiz-levels-grid">
          ${quizLevels.map(lvl => {
            const isUnlocked = isLevelUnlocked(lvl.kyu);
            const fullName = `${lvl.name} ${lvl.kyuLabel}`;

            return `
              <div class="quiz-level-card ${isUnlocked ? 'unlocked' : 'locked'}" style="border-top: 3.5px solid ${lvl.color};">
                <div class="quiz-level-header">
                  <span class="quiz-level-dot" style="background: ${lvl.color};"></span>
                  <h4 class="quiz-level-name">${lvl.name}</h4>
                  <span class="quiz-level-kyu">${lvl.kyuLabel}</span>
                </div>

                ${isUnlocked ? `
                  <button type="button" class="btn btn-primary quiz-level-btn" onclick="window.TKST_APP.startQuizLevel(${lvl.kyu}, '${fullName}')">
                    <i class="fas fa-play" style="font-size: 0.65rem; margin-right: 3px;"></i> Iniciar
                  </button>
                ` : `
                  <button type="button" class="btn btn-secondary quiz-level-btn disabled" disabled>
                    <i class="fas fa-lock" style="font-size: 0.62rem; margin-right: 2px;"></i> Bloqueado
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

    // 3. ACTIVE QUIZ QUESTION SCREEN (Otimizado para caber 100% na tela sem rolagem)
    const q = currentQuizQuestions[currentQuizIndex];

    let html = `
      <div class="section-header" style="justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 6px;">
        <div class="section-title-group">
          <h3 style="font-size: 1.02rem; margin: 0;"><i class="fas fa-brain" style="color: var(--accent-gold);"></i> Simulado • ${currentQuizBelt}</h3>
        </div>
        <button class="btn btn-secondary" onclick="window.TKST_APP.exitQuiz()" style="font-size: 0.72rem; padding: 4px 10px;">
          <i class="fas fa-times"></i> Cancelar / Trocar Nível
        </button>
      </div>

      <div class="quiz-card active-quiz">
        <!-- Temporizador Visual de 20 Segundos por Questão com Controle de Som -->
        <div class="quiz-timer-container">
          <div class="quiz-timer-header">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span><i class="fas fa-stopwatch" style="color: var(--accent-gold); margin-right: 4px;"></i> Tempo:</span>
              <span id="quizTimerBadge" class="quiz-timer-badge">20s</span>
            </div>
            <button id="quizSoundToggleBtn" class="quiz-sound-toggle ${TKST_AUDIO.isMuted ? 'muted' : ''}" onclick="window.TKST_APP.toggleQuizSound()" title="${TKST_AUDIO.isMuted ? 'Ativar Som do Simulado' : 'Silenciar Som do Simulado'}">
              <i class="fas ${TKST_AUDIO.isMuted ? 'fa-volume-mute' : 'fa-volume-up'}"></i>
            </button>
          </div>
          <div class="quiz-timer-bar-bg">
            <div id="quizTimerBar" class="quiz-timer-bar-fill" style="width: 100%;"></div>
          </div>
        </div>

        <div class="quiz-question-header" style="display: flex; justify-content: space-between; align-items: center;">
          <span class="badge badge-amarela" style="font-size: 0.68rem; padding: 2px 7px;">${currentQuizBelt}</span>
          <span style="font-size: 0.80rem; color: #94A3B8; font-weight: 600;">Questão ${currentQuizIndex + 1} de ${currentQuizQuestions.length}</span>
        </div>

        <div class="quiz-question-text">${q.question}</div>

        ${q.image ? `
          <div class="quiz-image-box" style="text-align: center; margin: 4px 0 6px 0; background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 4px; display: flex; align-items: center; justify-content: center; position: relative;">
            <img src="${q.image}" alt="Ilustração da Questão" style="max-height: 95px; max-width: 100%; object-fit: contain; border-radius: 3px; cursor: pointer;" onclick="window.TKST_APP.openImagePreview('${q.image}')" title="Clique para ampliar">
            <span style="position: absolute; right: 6px; bottom: 4px; font-size: 0.62rem; color: #94A3B8; background: rgba(0,0,0,0.65); padding: 1px 5px; border-radius: 3px; pointer-events: none;">
              <i class="fas fa-search-plus"></i> Ampliar
            </span>
          </div>
        ` : ''}

        <div class="quiz-options-list">
          ${q.options.map((opt, idx) => `
            <button class="quiz-option-btn" id="quizOpt_${idx}" onclick="window.TKST_APP.answerQuiz(${idx})">
              <span style="width: 24px; height: 24px; border-radius: var(--radius-full); background: rgba(255,255,255,0.08); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.76rem; flex-shrink: 0;">
                ${['A', 'B', 'C', 'D'][idx]}
              </span>
              <span style="line-height: 1.3;">${opt}</span>
            </button>
          `).join('')}
        </div>

        <div id="quizFeedbackArea"></div>

        <div style="display: flex; justify-content: flex-end; margin-top: 8px;">
          <button id="quizNextBtn" class="btn btn-primary" style="display: none; padding: 6px 14px; font-size: 0.82rem;" onclick="window.TKST_APP.nextQuizQuestion()">
            ${currentQuizIndex + 1 === currentQuizQuestions.length ? 'Finalizar Prova <i class="fas fa-check-circle"></i>' : 'Próxima Questão <i class="fas fa-arrow-right"></i>'}
          </button>
        </div>
      </div>
    `;

    mainContent.innerHTML = html;

    // Inicia o temporizador oficial de 20 segundos da questão
    startQuizTimer();
  }

  function startQuizTimer() {
    if (quizTimerInterval) clearInterval(quizTimerInterval);
    if (quizAutoAdvanceTimeout) clearTimeout(quizAutoAdvanceTimeout);

    const timerStartTime = Date.now();
    const totalDuration = 20000; // 20 segundos

    const timerBadge = document.getElementById('quizTimerBadge');
    const timerBar = document.getElementById('quizTimerBar');

    // Dispara a trilha oficial de 20 segundos de Hans Zimmer (Tick-Tock) a partir de 2:08
    TKST_AUDIO.playInterstellarTrack();

    let lastTickSec = -1;

    quizTimerInterval = setInterval(() => {
      if (!quizActive || quizAnswered) {
        clearInterval(quizTimerInterval);
        return;
      }

      const elapsed = Date.now() - timerStartTime;
      const remaining = Math.max(0, totalDuration - elapsed);
      const remainingSec = Math.ceil(remaining / 1000);
      const pct = Math.max(0, (remaining / totalDuration) * 100);

      // Fallback ticking sintetizado se o áudio não estiver tocando
      if (remainingSec !== lastTickSec && remainingSec > 0) {
        lastTickSec = remainingSec;
        if (!TKST_AUDIO.interstellarAudio || TKST_AUDIO.interstellarAudio.paused) {
          TKST_AUDIO.playInterstellarTick(remainingSec <= 5);
        }
      }

      if (timerBadge) {
        timerBadge.textContent = `${remainingSec}s`;
        if (remainingSec <= 5) {
          timerBadge.className = 'quiz-timer-badge critical';
        } else if (remainingSec <= 10) {
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
        TKST_AUDIO.playMicrowaveDing();
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
      selectedText: 'Tempo Esgotado (20s)',
      correctIndex: q.correctIndex,
      correctText: q.options[q.correctIndex],
      isCorrect: false
    });

    q.options.forEach((_, idx) => {
      const btn = document.getElementById(`quizOpt_${idx}`);
      if (btn) btn.disabled = true;
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
          <div style="font-weight: 600; color: #FF808A; font-size: 0.9rem; display: flex; align-items: center; gap: 6px;">
            <i class="fas fa-hourglass-end"></i> Tempo Esgotado (20s) — Resposta não computada a tempo.
          </div>
          <div style="color: #94A3B8; font-size: 0.78rem; margin-top: 4px;">
            <i class="fas fa-forward"></i> Avançando para a próxima questão...
          </div>
        </div>
      `;
    }

    const nextBtn = document.getElementById('quizNextBtn');
    if (nextBtn) nextBtn.style.display = 'inline-flex';

    quizAutoAdvanceTimeout = setTimeout(() => {
      if (quizActive) {
        nextQuizQuestion();
      }
    }, 900);
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
        if (idx === optionIndex) {
          btn.classList.add('selected');
        }
      }
    });

    const feedbackArea = document.getElementById('quizFeedbackArea');
    if (feedbackArea) {
      feedbackArea.innerHTML = `
        <div class="quiz-feedback-box" style="border-left: 4px solid var(--accent-gold);">
          <div style="font-weight: 600; color: #FFF; font-size: 0.9rem; display: flex; align-items: center; gap: 6px;">
            <i class="fas fa-check"></i> Resposta Registrada!
          </div>
          <div style="color: #94A3B8; font-size: 0.78rem; margin-top: 4px;">
            <i class="fas fa-forward"></i> Avançando para a próxima questão...
          </div>
        </div>
      `;
    }

    const nextBtn = document.getElementById('quizNextBtn');
    if (nextBtn) nextBtn.style.display = 'inline-flex';

    // Avança suavemente em 650ms sem revelar o gabarito
    quizAutoAdvanceTimeout = setTimeout(() => {
      if (quizActive) {
        nextQuizQuestion();
      }
    }, 650);
  }

  function nextQuizQuestion() {
    if (quizTimerInterval) { clearInterval(quizTimerInterval); quizTimerInterval = null; }
    if (quizAutoAdvanceTimeout) { clearTimeout(quizAutoAdvanceTimeout); quizAutoAdvanceTimeout = null; }

    quizAnswered = false;
    currentQuizIndex++;
    if (currentQuizIndex >= currentQuizQuestions.length) {
      if (quizActive) {
        quizActive = false;
        window.TKST_AUTH.saveQuizSubmission({
          beltLevel: currentQuizBelt,
          beltKyu: currentQuizKyu,
          score: quizScore,
          total: currentQuizQuestions.length,
          details: quizSubmissionDetails
        });
      }
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
  // 6.7 GALERIA DE MÍDIA TKST (FOTOS & VÍDEOS) & LIGHTBOX IN-APP
  // =========================================================================
  // =========================================================================
  // 6.7 SISTEMA DE ÁLBUNS TKST (FOTOS & VÍDEOS) & LIGHTBOX IN-APP
  // =========================================================================
  // Motor IndexedDB para mídias pesadas (Vídeos MP4 e Fotos direto do celular)
  const TKST_IDB_MEDIA = {
    dbName: 'TKST_Media_Storage',
    storeName: 'blobs',
    dbPromise: null,
    urlCache: new Map(),

    getDB: function() {
      if (this.dbPromise) return this.dbPromise;
      this.dbPromise = new Promise((resolve, reject) => {
        if (!window.indexedDB) {
          console.warn('IndexedDB não suportado neste navegador.');
          return resolve(null);
        }
        const req = indexedDB.open(this.dbName, 1);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            db.createObjectStore(this.storeName, { keyPath: 'id' });
          }
        };
        req.onsuccess = (e) => resolve(e.target.result);
        req.onerror = (e) => {
          console.warn('Erro ao abrir IndexedDB:', e.target.error);
          resolve(null);
        };
      });
      return this.dbPromise;
    },

    saveBlob: async function(id, blob, mimeType = '', filename = '') {
      try {
        const db = await this.getDB();
        if (!db) return false;
        return new Promise((resolve, reject) => {
          const tx = db.transaction(this.storeName, 'readwrite');
          const store = tx.objectStore(this.storeName);
          const record = {
            id,
            blob,
            mimeType: mimeType || (blob && blob.type) || 'application/octet-stream',
            filename: filename || id,
            updatedAt: Date.now()
          };
          const req = store.put(record);
          req.onsuccess = () => resolve(true);
          req.onerror = (e) => reject(e.target.error);
        });
      } catch (err) {
        console.warn('TKST_IDB_MEDIA saveBlob error:', err);
        return false;
      }
    },

    getBlob: async function(id) {
      try {
        const db = await this.getDB();
        if (!db) return null;
        return new Promise((resolve) => {
          const tx = db.transaction(this.storeName, 'readonly');
          const store = tx.objectStore(this.storeName);
          const req = store.get(id);
          req.onsuccess = () => resolve(req.result ? req.result.blob : null);
          req.onerror = () => resolve(null);
        });
      } catch (err) {
        return null;
      }
    },

    deleteBlob: async function(id) {
      try {
        if (this.urlCache.has(id)) {
          URL.revokeObjectURL(this.urlCache.get(id));
          this.urlCache.delete(id);
        }
        const db = await this.getDB();
        if (!db) return false;
        return new Promise((resolve) => {
          const tx = db.transaction(this.storeName, 'readwrite');
          const store = tx.objectStore(this.storeName);
          const req = store.delete(id);
          req.onsuccess = () => resolve(true);
          req.onerror = () => resolve(false);
        });
      } catch (err) {
        return false;
      }
    },

    getMediaUrl: async function(item) {
      if (!item) return '';
      const url = item.url || '';
      if (!url.startsWith('idb:')) return url;
      const id = url.replace('idb:', '');
      if (this.urlCache.has(id)) return this.urlCache.get(id);
      const blob = await this.getBlob(id);
      if (blob) {
        const objUrl = URL.createObjectURL(blob);
        this.urlCache.set(id, objUrl);
        return objUrl;
      }
      return item.thumbUrl || '';
    }
  };
  window.TKST_IDB_MEDIA = TKST_IDB_MEDIA;

  let currentAlbumId = null; // null = Visão Geral dos 3 Álbuns, 'exames', 'competicoes', 'didaticos'
  let currentSubAlbumName = null; // null = lista de subálbuns (quando em 'exames'), ou string com nome do exame
  let mediaSelectionMode = false;
  let selectedMediaIds = new Set();
  let currentMediaSearch = '';
  let currentLightboxMediaId = null;
  let currentLightboxList = [];

  let activeMediaSelectedFile = null;
  let activeMediaSelectedFiles = [];
  let activeMediaThumbnailBase64 = null;
  let activeMediaSourceMode = 'file'; // 'file' ou 'url'

  // Normalização de mídias para compatibilidade total
  function getNormalizedMediaList() {
    const albums = getAlbumsList();
    if (!albums || albums.length === 0) return [];
    const validAlbumIds = new Set(albums.map(a => a.id));
    const deletedSubAlbums = (window.TKST_AUTH && window.TKST_AUTH.getDeletedSubAlbumKeys) 
      ? window.TKST_AUTH.getDeletedSubAlbumKeys() 
      : (JSON.parse(localStorage.getItem('tkst_deleted_subalbums')) || []);

    const rawList = (window.TKST_AUTH ? window.TKST_AUTH.getCustomMedia() : (window.TKST_DEFAULT_MEDIA || [])) || [];
    return rawList
      .filter(m => {
        if (!m || !m.url) return false;
        let album = m.album || m.category;
        if (!album || !validAlbumIds.has(album)) return false;
        let subAlbum = m.subAlbum || '';
        if (subAlbum) {
          const key = album + '::' + subAlbum.trim().toLowerCase();
          if (deletedSubAlbums.includes(key)) return false;
        }
        return true;
      })
      .map(m => {
        let album = m.album || m.category;
        let subAlbum = m.subAlbum || '';
        return { ...m, album, category: album, subAlbum };
      });
  }

  // Retorna álbuns padrão mesclados com álbuns customizados do admin
  function getAlbumsList() {
    const deletedAlbumIds = (window.TKST_AUTH && window.TKST_AUTH.getDeletedAlbumIds) 
      ? window.TKST_AUTH.getDeletedAlbumIds() 
      : (JSON.parse(localStorage.getItem('tkst_deleted_album_ids')) || []);
    const deletedSet = new Set(deletedAlbumIds);

    const defaultAlbums = window.TKST_ALBUMS || [];
    const customAlbums = (window.TKST_AUTH && window.TKST_AUTH.getCustomAlbums) ? window.TKST_AUTH.getCustomAlbums() : [];
    // Mescla eventuais customizações feitas pelo admin nos álbuns padrão
    const mergedDefaults = defaultAlbums.map(def => {
      const custom = customAlbums.find(c => c.id === def.id);
      return custom ? { ...def, ...custom, _default: true } : def;
    });
    const defaultIds = new Set(defaultAlbums.map(a => a.id));
    const all = [
      ...mergedDefaults,
      ...customAlbums.filter(a => !defaultIds.has(a.id))
    ];
    return all.filter(a => !deletedSet.has(a.id));
  }

  function renderMedia() {
    const user = window.TKST_AUTH.getCurrentUser();
    const isAdmin = window.TKST_AUTH ? window.TKST_AUTH.isAdmin() : false;
    const allMedia = getNormalizedMediaList();
    const albums = getAlbumsList();

    let html = '';

    // =========================================================================
    // NÍVEL 0: VISÃO GERAL DOS ÁLBUNS
    // =========================================================================
    if (!currentAlbumId) {
      html = `
        <div class="media-gallery-hero">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
            <div>
              <div style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: var(--radius-full); background: rgba(230, 57, 70, 0.2); border: 1px solid rgba(230, 57, 70, 0.4); color: #FF808A; font-size: 0.72rem; font-weight: 800; margin-bottom: 6px;">
                <i class="fas fa-camera-retro"></i> ÁLBUNS OFICIAIS TKST
              </div>
              <h2 style="font-size: 1.35rem; color: #FFF; margin: 0; font-family: var(--font-heading);">
                Galeria de Fotos & Vídeos
              </h2>
              <p style="font-size: 0.82rem; color: #CBD5E1; margin-top: 4px; margin-bottom: 0;">
                Selecione um álbum abaixo para ver e baixar fotos e vídeos direto no seu celular.
              </p>
            </div>
            ${isAdmin ? `
              <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button type="button" class="btn btn-gold btn-sm" onclick="window.TKST_APP.openAddMediaModal()" style="font-weight: 700; display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px;">
                  <i class="fas fa-plus-circle"></i> Adicionar Mídia
                </button>
                <button type="button" class="btn btn-secondary btn-sm" onclick="window.TKST_APP.openCreateAlbumModal()" style="font-weight: 700; display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-color: rgba(255, 183, 3, 0.4);">
                  <i class="fas fa-folder-plus"></i> Criar Álbum
                </button>
              </div>
            ` : ''}
          </div>
        </div>

        ${albums.length === 0 ? `
          <div style="text-align: center; padding: 60px 20px; background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.15); border-radius: var(--radius-lg); margin-top: 16px;">
            <i class="fas fa-images" style="font-size: 2.5rem; color: var(--accent-gold); opacity: 0.6; margin-bottom: 12px; display: block;"></i>
            <h3 style="color: #fff; font-size: 1.1rem; margin-bottom: 6px;">Nenhum álbum na galeria</h3>
            <p style="color: #94a3b8; font-size: 0.85rem; max-width: 420px; margin: 0 auto 16px;">
              A galeria está vazia no momento. Quando quiser, toque no botão abaixo para criar seu álbum e enviar fotos para a nuvem.
            </p>
            ${isAdmin ? `
              <button type="button" class="btn btn-gold btn-sm" onclick="window.TKST_APP.openCreateAlbumModal()" style="font-weight: 700; padding: 8px 16px;">
                <i class="fas fa-folder-plus"></i> Criar Primeiro Álbum
              </button>
            ` : ''}
          </div>
        ` : `
          <div class="albums-grid">
            ${albums.map(alb => {
              const albMedia = allMedia.filter(m => m.album === alb.id);
              const count = albMedia.length;
              let subCountText = '';
              if (alb.hasSubAlbums) {
                const savedSubsForAlb = (window.TKST_AUTH && window.TKST_AUTH.getCustomSubAlbums) ? window.TKST_AUTH.getCustomSubAlbums(alb.id) : [];
                const uniqueSubs = new Set([
                  ...albMedia.map(m => m.subAlbum).filter(Boolean),
                  ...savedSubsForAlb.map(s => s.name).filter(Boolean)
                ]);
                const subWord = alb.id === 'exames' ? 'exame' : 'subálbum';
                const subWordPlural = alb.id === 'exames' ? 'exames' : 'subálbuns';
                subCountText = `${uniqueSubs.size} ${uniqueSubs.size === 1 ? subWord : subWordPlural} • `;
              }
              const coverImg = (albMedia.length > 0 && albMedia[0].thumbUrl) ? albMedia[0].thumbUrl : (alb.cover || 'assets/images/logo-tkst-alunos.png');
              const isCustom = alb._custom;

              return `
                <div class="album-card" title="Toque para abrir o álbum ${alb.title}">
                  <div class="album-card-cover-wrap" onclick="window.TKST_APP.openAlbum('${alb.id}')">
                    <img src="${coverImg}" alt="${alb.title}" class="album-card-cover" onerror="this.src='assets/images/logo-tkst-2.jpg'">
                    <div class="album-card-gradient"></div>
                    <span class="album-badge-top">
                      <i class="${alb.icon || 'fas fa-folder'}"></i> ${alb.badge || alb.title}
                    </span>
                    <span class="album-count-top">
                      ${subCountText}${count} ${count === 1 ? 'mídia' : 'mídias'}
                    </span>
                    ${isAdmin ? `
                      <div style="position: absolute; top: 8px; right: 8px; display: flex; gap: 6px;">
                        <button type="button" class="album-edit-btn" onclick="event.stopPropagation(); window.TKST_APP.openEditAlbumModal('${alb.id}')" title="Editar álbum" style="width: 30px; height: 30px; border-radius: 8px; background: rgba(255,183,3,0.85); border: none; color: #000; font-size: 0.8rem; cursor: pointer; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px);">
                          <i class="fas fa-pencil-alt"></i>
                        </button>
                        <button type="button" class="album-delete-btn" onclick="event.stopPropagation(); window.TKST_APP.deleteCustomAlbum('${alb.id}', '${escapeHtml(alb.title)}')" title="Excluir álbum" style="width: 30px; height: 30px; border-radius: 8px; background: rgba(230,57,70,0.85); border: none; color: #fff; font-size: 0.8rem; cursor: pointer; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px);">
                          <i class="fas fa-trash-alt"></i>
                        </button>
                      </div>
                    ` : ''}
                  </div>
                  <div class="album-card-body" onclick="window.TKST_APP.openAlbum('${alb.id}')">
                    <h3 class="album-card-title">
                      <span>${alb.title}</span>
                    </h3>
                    <p class="album-card-desc">${alb.description || ''}</p>
                    <div class="album-card-footer">
                      <span>${alb.hasSubAlbums ? 'Ver Subálbuns' : 'Acessar Galeria'}</span>
                      <i class="fas fa-arrow-right"></i>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      `;
      mainContent.innerHTML = html;
      return;
    }

    // =========================================================================
    // NÍVEL 1: SUBÁLBUNS DO ÁLBUM
    // =========================================================================
    const currentAlbum = albums.find(a => a.id === currentAlbumId);
    if (!currentAlbum) {
      currentAlbumId = null;
      currentSubAlbumName = null;
      renderMedia();
      return;
    }
    const albumMedia = allMedia.filter(m => m.album === currentAlbumId);

    const hasSubAlbums = (currentAlbumId === 'exames') || (currentAlbum && currentAlbum.hasSubAlbums);

    if (hasSubAlbums && !currentSubAlbumName) {
      // Agrupar subálbuns (subálbuns explicitamente salvos + subálbuns inferidos das mídias existentes)
      const subAlbumMap = new Map();
      const deletedSubs = JSON.parse(localStorage.getItem('tkst_deleted_subalbums')) || [];
      const deletedSubSet = new Set(deletedSubs.map(s => String(s).toLowerCase().trim()));

      // 1. Carrega subálbuns salvos no banco local/nuvem
      const savedSubs = (window.TKST_AUTH && window.TKST_AUTH.getCustomSubAlbums) ? window.TKST_AUTH.getCustomSubAlbums(currentAlbumId) : [];
      savedSubs.forEach(sub => {
        if (sub && sub.name && sub.name.trim()) {
          const subKey = sub.name.trim();
          const checkKey1 = `${currentAlbumId}::${subKey.toLowerCase()}`;
          const checkKey2 = subKey.toLowerCase();
          if (deletedSubSet.has(checkKey1) || deletedSubSet.has(checkKey2)) return;
          subAlbumMap.set(subKey, {
            name: subKey,
            items: [],
            dojo: sub.dojo || 'TKST',
            cover: sub.cover || currentAlbum.cover || 'assets/images/logo-tkst-alunos.png',
            createdAt: sub.createdAt || 0,
            isCustom: true
          });
        }
      });

      // 2. Mescla mídias existentes do álbum
      albumMedia.forEach(m => {
        const subName = (m.subAlbum && m.subAlbum.trim()) || (currentAlbumId === 'exames' ? 'Exame de Faixa Geral' : null);
        if (!subName) return;
        const checkKey1 = `${currentAlbumId}::${subName.toLowerCase()}`;
        const checkKey2 = subName.toLowerCase();
        if (deletedSubSet.has(checkKey1) || deletedSubSet.has(checkKey2)) return;

        if (!subAlbumMap.has(subName)) {
          subAlbumMap.set(subName, {
            name: subName,
            items: [],
            dojo: m.dojo || 'TKST',
            cover: m.thumbUrl || m.url || currentAlbum.cover || 'assets/images/logo-tkst-alunos.png',
            createdAt: 0,
            isCustom: false
          });
        }
        subAlbumMap.get(subName).items.push(m);
      });

      // 3. Monta a lista de subálbuns
      const subAlbumsList = Array.from(subAlbumMap.values()).map(subData => {
        const sortedItems = [...subData.items].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        const latestDate = sortedItems[0]?.date || '';
        const dojo = sortedItems[0]?.dojo || subData.dojo || 'TKST';
        const cover = sortedItems[0]?.thumbUrl || sortedItems[0]?.url || subData.cover || 'assets/images/logo-tkst-alunos.png';
        return {
          name: subData.name,
          items: sortedItems,
          count: sortedItems.length,
          latestDate,
          dojo,
          cover
        };
      });

      const albumTitleLabel = currentAlbum.title || 'Exame de Faixa';
      const albumIconClass = currentAlbum.icon || 'fas fa-graduation-cap';
      const newSubLabel = currentAlbumId === 'exames' ? 'Novo Exame' : 'Novo Subálbum';
      const subPluralLabel = currentAlbumId === 'exames' ? 'Exames de Faixa (Subálbuns)' : `${escapeHtml(albumTitleLabel)} (Subálbuns)`;
      const subDescLabel = currentAlbumId === 'exames'
        ? 'Selecione o exame de graduação desejado para ver as fotos e vídeos.'
        : 'Selecione o subálbum desejado para ver as fotos e vídeos.';

      html = `
        <div class="media-nav-header">
          <button type="button" class="media-back-btn" onclick="window.TKST_APP.openAlbum(null)">
            <i class="fas fa-arrow-left"></i> Voltar aos Álbuns
          </button>
          <div style="font-weight: 800; color: #FFF; font-size: 0.9rem;">
            <i class="${albumIconClass}" style="color: var(--accent-gold); margin-right: 6px;"></i> ${escapeHtml(albumTitleLabel)}
          </div>
          ${isAdmin ? `
            <button type="button" class="btn btn-gold btn-sm" onclick="window.TKST_APP.openCreateAlbumModal('sub-exame')" style="font-weight: 700; display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; font-size: 0.78rem;">
              <i class="fas fa-folder-plus"></i> ${newSubLabel}
            </button>
          ` : '<span style="width: 20px;"></span>'}
        </div>

        <div class="media-gallery-hero" style="margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
            <div>
              <h2 style="font-size: 1.25rem; color: #FFF; margin: 0; font-family: var(--font-heading);">
                ${subPluralLabel}
              </h2>
              <p style="font-size: 0.8rem; color: #CBD5E1; margin-top: 4px; margin-bottom: 0;">
                ${subDescLabel}
              </p>
            </div>
            ${isAdmin ? `
              <button type="button" class="btn btn-secondary btn-sm" onclick="window.TKST_APP.openAddMediaModal('${currentAlbumId}')" style="font-weight: 700; display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; font-size: 0.78rem;">
                <i class="fas fa-plus-circle"></i> Adicionar Foto
              </button>
            ` : ''}
          </div>
        </div>

        ${subAlbumsList.length === 0 ? `
          <div style="text-align: center; padding: 40px 20px; background: rgba(18, 23, 34, 0.6); border: 1px dashed var(--border-color); border-radius: var(--radius-md);">
            <i class="${albumIconClass}" style="font-size: 2.5rem; color: #64748B; margin-bottom: 12px; display: block;"></i>
            <h4 style="color: #FFF; margin-bottom: 6px;">Nenhum subálbum cadastrado</h4>
            <p style="color: #94A3B8; font-size: 0.82rem; margin: 0;">O Sensei pode cadastrar novos subálbuns e adicionar fotos a qualquer momento.</p>
            ${isAdmin ? `
              <button type="button" class="btn btn-gold btn-sm" onclick="window.TKST_APP.openCreateAlbumModal('sub-exame')" style="margin-top: 14px; font-size: 0.8rem;">
                <i class="fas fa-folder-plus"></i> ${currentAlbumId === 'exames' ? 'Criar Primeiro Exame' : 'Criar Primeiro Subálbum'}
              </button>
            ` : ''}
          </div>
        ` : `
          <div class="subalbums-grid">
            ${subAlbumsList.map(sub => {
              const formattedDate = sub.latestDate ? sub.latestDate.split('-').reverse().join('/') : '';
              return `
                <div class="subalbum-card" onclick="window.TKST_APP.openSubAlbum('${escapeHtml(sub.name)}')" title="Abrir ${escapeHtml(sub.name)}">
                  <img src="${sub.cover}" alt="${escapeHtml(sub.name)}" class="subalbum-thumb" onerror="this.src='assets/images/logo-tkst-2.jpg'">
                  <div class="subalbum-info">
                    <h4 class="subalbum-name">${escapeHtml(sub.name)}</h4>
                    <div class="subalbum-meta">
                      <span class="badge badge-amarela" style="font-size: 0.68rem; padding: 1px 6px;">
                        <i class="fas fa-camera"></i> ${sub.count} ${sub.count === 1 ? 'mídia' : 'mídias'}
                      </span>
                      ${formattedDate ? `<span><i class="fas fa-calendar-alt"></i> ${formattedDate}</span>` : ''}
                      <span><i class="fas fa-map-marker-alt"></i> ${escapeHtml(sub.dojo)}</span>
                    </div>
                  </div>
                  ${isAdmin ? `
                    <div style="display: flex; gap: 4px; align-items: center;" onclick="event.stopPropagation();">
                      <button type="button" onclick="window.TKST_APP.promptEditSubAlbum('${escapeHtml(sub.name)}')" title="Renomear subálbum" style="width: 30px; height: 30px; border-radius: 6px; background: rgba(255,183,3,0.85); border: none; color: #000; font-size: 0.75rem; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                        <i class="fas fa-pencil-alt"></i>
                      </button>
                      <button type="button" onclick="window.TKST_APP.promptDeleteSubAlbum('${escapeHtml(sub.name)}')" title="Excluir subálbum" style="width: 30px; height: 30px; border-radius: 6px; background: rgba(239,68,68,0.2); border: 1px solid rgba(239,68,68,0.5); color: #EF4444; font-size: 0.75rem; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                        <i class="fas fa-trash-alt"></i>
                      </button>
                    </div>
                  ` : ''}
                  <div style="color: var(--accent-gold); font-size: 0.9rem; flex-shrink: 0; padding-left: 6px;">
                    <i class="fas fa-chevron-right"></i>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      `;
      mainContent.innerHTML = html;
      return;
    }

    // =========================================================================
    // NÍVEL 2: GRADE DE MÍDIAS DO ÁLBUM / SUBÁLBUM
    // =========================================================================
    let currentTitle = currentAlbum.title;
    let currentSubtitle = currentAlbum.description;
    let backAction = "window.TKST_APP.openAlbum(null)";
    let backLabel = "Voltar aos Álbuns";

    let targetMedia = albumMedia;
    if (hasSubAlbums && currentSubAlbumName) {
      targetMedia = albumMedia.filter(m => (m.subAlbum || (currentAlbumId === 'exames' ? 'Exame de Faixa Geral' : '')) === currentSubAlbumName);
      currentTitle = currentSubAlbumName;
      currentSubtitle = `Fotos e vídeos oficiais deste subálbum.`;
      backAction = "window.TKST_APP.openSubAlbum(null)";
      backLabel = `Voltar aos ${currentAlbum.title || 'Subálbuns'}`;
    }

    // Filtro por busca textual
    let filteredMedia = targetMedia;
    if (currentMediaSearch && currentMediaSearch.trim()) {
      const q = currentMediaSearch.toLowerCase().trim();
      filteredMedia = filteredMedia.filter(m => 
        (m.title && m.title.toLowerCase().includes(q)) ||
        (m.description && m.description.toLowerCase().includes(q)) ||
        (m.dojo && m.dojo.toLowerCase().includes(q)) ||
        (m.author && m.author.toLowerCase().includes(q)) ||
        (m.date && m.date.includes(q))
      );
    }

    currentLightboxList = filteredMedia;
    const allFilteredIds = filteredMedia.map(m => m.id);

    html = `
      <div class="media-nav-header">
        <button type="button" class="media-back-btn" onclick="${backAction}">
          <i class="fas fa-arrow-left"></i> ${backLabel}
        </button>
        <div style="font-weight: 800; color: #FFF; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 50%;">
          ${escapeHtml(currentTitle)}
        </div>
        <div style="display: flex; gap: 6px; align-items: center;">
          ${isAdmin ? `
            <button type="button" class="btn ${mediaSelectionMode ? 'btn-crimson' : 'btn-secondary'} btn-sm" onclick="window.TKST_APP.toggleMediaSelectionMode()" style="font-weight: 700; font-size: 0.76rem; padding: 6px 10px;">
              <i class="fas ${mediaSelectionMode ? 'fa-times' : 'fa-check-square'}"></i> ${mediaSelectionMode ? 'Cancelar' : 'Selecionar'}
            </button>
            <button type="button" class="btn btn-gold btn-sm" onclick="window.TKST_APP.openAddMediaModal('${currentAlbumId}', '${escapeHtml(currentSubAlbumName || '')}')" style="font-weight: 700; font-size: 0.76rem; padding: 6px 10px;">
              <i class="fas fa-plus"></i> Adicionar
            </button>
          ` : ''}
        </div>
      </div>

      ${mediaSelectionMode ? `
        <!-- Barra Fixa de Seleção em Lote (Batch Delete) -->
        <div class="media-selection-bar">
          <div class="media-selection-title">
            <i class="fas fa-check-circle" style="color: #FF808A;"></i>
            <span>${selectedMediaIds.size} de ${filteredMedia.length} selecionadas</span>
          </div>
          <div class="media-selection-actions">
            <button type="button" class="btn btn-secondary btn-sm" onclick="window.TKST_APP.selectAllMedia()" style="font-size: 0.76rem; padding: 5px 10px;">
              ${selectedMediaIds.size === filteredMedia.length && filteredMedia.length > 0 ? 'Desmarcar Todas' : 'Selecionar Todas'}
            </button>
            ${isAdmin ? `
              <button type="button" class="btn btn-crimson btn-sm" onclick="window.TKST_APP.deleteSelectedMedia()" style="font-size: 0.76rem; padding: 5px 12px; font-weight: 800; background: #B91C1C;" ${selectedMediaIds.size === 0 ? 'disabled' : ''}>
                <i class="fas fa-trash-alt"></i> Excluir Selecionadas (${selectedMediaIds.size})
              </button>
            ` : ''}
          </div>
        </div>
      ` : ''}

      <!-- Header Informativo -->
      <div class="media-gallery-hero" style="margin-bottom: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <h2 style="font-size: 1.25rem; color: #FFF; margin: 0; font-family: var(--font-heading);">
                ${escapeHtml(currentTitle)}
              </h2>
              ${isAdmin && currentSubAlbumName ? `
                <button type="button" class="btn btn-secondary btn-sm" onclick="window.TKST_APP.promptEditSubAlbum('${escapeHtml(currentSubAlbumName)}')" title="Renomear este subálbum" style="padding: 3px 8px; font-size: 0.72rem; border-color: rgba(255,183,3,0.5); color: var(--accent-gold);">
                  <i class="fas fa-pencil-alt"></i> Renomear
                </button>
                <button type="button" class="btn btn-secondary btn-sm" onclick="window.TKST_APP.promptDeleteSubAlbum('${escapeHtml(currentSubAlbumName)}')" title="Excluir este subálbum" style="padding: 3px 8px; font-size: 0.72rem; border-color: rgba(239,68,68,0.5); color: #EF4444;">
                  <i class="fas fa-trash-alt"></i> Excluir
                </button>
              ` : ''}
            </div>
            <p style="font-size: 0.8rem; color: #CBD5E1; margin-top: 3px; margin-bottom: 0;">
              ${currentSubtitle} • <strong>${filteredMedia.length} ${filteredMedia.length === 1 ? 'mídia' : 'mídias'}</strong>
            </p>
          </div>
        </div>
      </div>

      <!-- Barra de Busca Rápida -->
      <div class="media-search-wrap" style="margin-bottom: 16px;">
        <i class="fas fa-search"></i>
        <input type="text" class="media-search-input" placeholder="Buscar neste álbum por título, data ou dojô..." value="${escapeHtml(currentMediaSearch)}" oninput="window.TKST_APP.handleMediaSearch(this.value)">
      </div>

      <!-- Grid de Mídias -->
      ${filteredMedia.length === 0 ? `
        <div style="text-align: center; padding: 40px 20px; background: rgba(18, 23, 34, 0.6); border: 1px dashed var(--border-color); border-radius: var(--radius-md);">
          <i class="fas fa-images" style="font-size: 2.5rem; color: #64748B; margin-bottom: 12px; display: block;"></i>
          <h4 style="color: #FFF; margin-bottom: 6px;">Nenhuma foto ou vídeo encontrado</h4>
          <p style="color: #94A3B8; font-size: 0.82rem; margin: 0;">${currentMediaSearch ? 'Tente limpar os termos de busca.' : 'Este álbum ainda não possui mídias cadastradas.'}</p>
          ${isAdmin ? `
            <button type="button" class="btn btn-gold btn-sm" onclick="window.TKST_APP.openAddMediaModal('${currentAlbumId}', '${escapeHtml(currentSubAlbumName || '')}')" style="margin-top: 14px; font-size: 0.78rem;">
              <i class="fas fa-plus-circle"></i> Adicionar Primeira Mídia
            </button>
          ` : ''}
        </div>
      ` : `
        <div class="media-grid">
          ${filteredMedia.map(m => {
            const isVideo = m.type === 'video';
            const dateStr = m.date ? m.date.split('-').reverse().slice(0, 2).join('/') : '';
            const isSelected = selectedMediaIds.has(m.id);

            return `
              <div class="media-card ${isSelected ? 'is-selected' : ''}" style="position: relative;">
                ${mediaSelectionMode ? `
                  <div class="media-card-select-checkbox ${isSelected ? 'selected' : ''}" onclick="event.stopPropagation(); window.TKST_APP.toggleMediaSelection('${m.id}')" title="Marcar/Desmarcar">
                    <i class="fas ${isSelected ? 'fa-check' : ''}"></i>
                  </div>
                ` : ''}

                <div class="media-thumb-box" onclick="${mediaSelectionMode ? `window.TKST_APP.toggleMediaSelection('${m.id}')` : `window.TKST_APP.openMediaLightbox('${m.id}')`}">
                  <span class="media-badge-tag ${isVideo ? 'video' : 'foto'}">
                    <i class="fas ${isVideo ? 'fa-video' : 'fa-camera'}"></i> ${isVideo ? 'Vídeo' : 'Foto'}
                  </span>
                  ${dateStr ? `<span class="media-date-tag">${dateStr}</span>` : ''}
                  <img src="${m.thumbUrl || m.url}" alt="${escapeHtml(m.title)}" class="media-thumb-img" loading="lazy" onerror="this.src='assets/images/logo-tkst-2.jpg'">
                  ${isVideo ? `
                    <div class="media-play-icon-overlay">
                      <i class="fas fa-play"></i>
                    </div>
                  ` : ''}
                </div>
                <div class="media-card-body">
                  <h4 class="media-card-title" title="${escapeHtml(m.title)}">${escapeHtml(m.title)}</h4>
                  <div class="media-card-sub">
                    <i class="fas fa-map-marker-alt" style="color: var(--accent-gold); font-size: 0.65rem;"></i>
                    <span>${escapeHtml(m.dojo || 'TKST')}</span>
                  </div>
                  <div class="media-card-actions">
                    <button type="button" class="btn-view" onclick="window.TKST_APP.openMediaLightbox('${m.id}')" title="Visualizar no app sem sair">
                      <i class="fas fa-expand"></i> Ver
                    </button>
                    <button type="button" class="btn-dl" onclick="window.TKST_APP.downloadMediaFile('${m.url}', '${escapeHtml(m.title)}', '${m.type}')" title="Baixar foto/vídeo no seu celular">
                      <i class="fas fa-download"></i>
                    </button>
                    ${isAdmin ? `
                      <button type="button" class="btn-dl" onclick="window.TKST_APP.deleteSingleMedia('${m.id}')" style="color: #FF808A; border-color: rgba(230, 57, 70, 0.4); background: rgba(230, 57, 70, 0.1);" title="Excluir esta mídia">
                        <i class="fas fa-trash-alt"></i>
                      </button>
                    ` : ''}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}
    `;

    mainContent.innerHTML = html;
  }

  // =========================================================================
  // NAVEGAÇÃO DE ÁLBUNS & SUBÁLBUNS
  // =========================================================================
  function openAlbum(albumId) {
    currentAlbumId = albumId;
    currentSubAlbumName = null;
    mediaSelectionMode = false;
    selectedMediaIds.clear();
    currentMediaSearch = '';
    renderMedia();
    // Push state para botão voltar funcionar
    history.pushState({ tab: 'media', albumId, subAlbum: null }, '', '#media-album');
  }

  function openSubAlbum(subAlbumName) {
    currentSubAlbumName = subAlbumName;
    mediaSelectionMode = false;
    selectedMediaIds.clear();
    currentMediaSearch = '';
    renderMedia();
    // Push state para botão voltar funcionar
    history.pushState({ tab: 'media', albumId: currentAlbumId, subAlbum: subAlbumName }, '', '#media-subalbum');
  }

  function promptCreateSubAlbum() {
    // Abre o modal de criação pré-configurado para subálbum de exame
    openCreateAlbumModal('sub-exame');
  }

  // =========================================================================
  // CRIAR ÁLBUM (MODAL)
  // =========================================================================
  function openCreateAlbumModal(mode) {
    // mode: 'principal' | 'sub-exame' | undefined (mostra seleção)
    const modal = document.getElementById('createAlbumModal');
    if (!modal) return;

    const modeField = document.getElementById('createAlbumMode');
    const mainGroup = document.getElementById('createAlbumMainGroup');
    const subGroup = document.getElementById('createAlbumSubGroup');
    const form = document.getElementById('createAlbumForm');
    const radios = document.querySelectorAll('input[name="albumTypeRadio"]');
    if (form) form.reset();

    const submitBtn = modal.querySelector('button[type="submit"]');

    function applyMode(m) {
      if (modeField) modeField.value = m;
      const isMain = m === 'principal';
      const isSub = m === 'sub-exame';
      if (mainGroup) mainGroup.style.display = isMain ? '' : 'none';
      if (subGroup) subGroup.style.display = isSub ? '' : 'none';
      if (submitBtn) {
        submitBtn.innerHTML = isSub ? `<i class="fas fa-folder-plus"></i> Salvar Subálbum` : `<i class="fas fa-plus-circle"></i> Criar Álbum`;
      }
      radios.forEach(r => {
        r.closest && (r.closest('.album-type-option') || r.parentElement).classList.toggle('selected', r.value === m);
      });
    }

    const initialMode = mode || 'principal';
    applyMode(initialMode);
    const radioToCheck = document.querySelector(`input[name="albumTypeRadio"][value="${initialMode}"]`);
    if (radioToCheck) radioToCheck.checked = true;

    // Populate subalbum datalist
    populateSubAlbumDatalist();

    // Populate custom album select in sub-exame mode
    const albumsWithSubs = getAlbumsList().filter(a => a.hasSubAlbums);
    const subParentSelect = document.getElementById('createAlbumSubParent');
    if (subParentSelect) {
      subParentSelect.innerHTML = albumsWithSubs.map(a =>
        `<option value="${a.id}">${a.title}</option>`
      ).join('');
      if (currentAlbumId && albumsWithSubs.some(a => a.id === currentAlbumId)) {
        subParentSelect.value = currentAlbumId;
      }
    }

    modal.classList.add('active');
    history.pushState({ modal: 'create-album', tab: currentTab, albumId: currentAlbumId, subAlbum: currentSubAlbumName }, '', '#modal-album');

    // Wire up radio switches
    radios.forEach(r => {
      r.onchange = () => applyMode(r.value);
    });
  }

  function closeCreateAlbumModal(triggerBack = true) {
    const modal = document.getElementById('createAlbumModal');
    if (modal) {
      modal.classList.remove('active');
      delete modal.dataset.editAlbumId;
      const typeSelectorWrap = document.getElementById('createAlbumTypeSelectorWrap');
      if (typeSelectorWrap) typeSelectorWrap.style.display = '';
      const modalTitle = modal.querySelector('.modal-header h3') || modal.querySelector('.modal-title');
      if (modalTitle) modalTitle.innerHTML = `<i class="fas fa-folder-plus" style="color: var(--accent-gold); margin-right: 8px;"></i> Criar Álbum`;
      const submitBtn = modal.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.innerHTML = `<i class="fas fa-plus-circle"></i> Criar Álbum`;
      const form = document.getElementById('createAlbumForm');
      if (form) form.reset();
    }
    if (triggerBack && window.location.hash === '#modal-album') {
      history.back();
    }
  }

  // =========================================================================
  // EDITAR ÁLBUM (MODAL)
  // =========================================================================
  function openEditAlbumModal(albumId) {
    const albums = getAlbumsList();
    const alb = albums.find(a => a.id === albumId);
    if (!alb) return;

    // Reutiliza o modal de criação em modo edição
    const modal = document.getElementById('createAlbumModal');
    if (!modal) return;

    const form = document.getElementById('createAlbumForm');
    if (form) form.reset();

    // Força modo principal e esconde seleção de tipo
    const modeField = document.getElementById('createAlbumMode');
    const mainGroup = document.getElementById('createAlbumMainGroup');
    const subGroup = document.getElementById('createAlbumSubGroup');
    const typeSelectorWrap = document.getElementById('createAlbumTypeSelectorWrap');

    if (modeField) modeField.value = 'principal';
    if (mainGroup) mainGroup.style.display = '';
    if (subGroup) subGroup.style.display = 'none';
    if (typeSelectorWrap) typeSelectorWrap.style.display = 'none';

    // Preenche os campos com dados atuais
    const titleInput = document.getElementById('createAlbumTitleInput');
    const descInput = document.getElementById('createAlbumDescInput');
    const iconSelect = document.getElementById('createAlbumIconSelect');
    const hasSubCheck = document.getElementById('createAlbumHasSubAlbums');
    const modalTitle = modal.querySelector('.modal-header h3') || modal.querySelector('.modal-title');
    const submitBtn = modal.querySelector('button[type="submit"]');

    if (titleInput) titleInput.value = alb.title || '';
    if (descInput) descInput.value = alb.description || '';
    if (iconSelect) iconSelect.value = alb.icon || 'fas fa-folder';
    if (hasSubCheck) hasSubCheck.checked = alb.hasSubAlbums || false;
    if (modalTitle) modalTitle.innerHTML = `<i class="fas fa-pencil-alt" style="color: var(--accent-gold); margin-right: 8px;"></i> Editar Álbum`;
    if (submitBtn) submitBtn.innerHTML = `<i class="fas fa-save"></i> Salvar Alterações`;

    // Marca qual álbum está sendo editado
    modal.dataset.editAlbumId = albumId;
    history.pushState({ modal: 'edit-album', albumId, tab: currentTab }, '', '#modal-album');
    modal.classList.add('active');
  }

  // =========================================================================
  // RENOMEAR SUBÁLBUM / EXAME DE FAIXA
  // =========================================================================
  function promptEditSubAlbum(oldName) {
    const newName = prompt(`✏️ Digite o novo nome para o exame/subálbum:\n\nAtual: "${oldName}"`, oldName);
    if (!newName || !newName.trim() || newName.trim() === oldName) return;
    const trimmed = newName.trim();
    if (window.TKST_AUTH && window.TKST_AUTH.renameSubAlbum) {
      window.TKST_AUTH.renameSubAlbum(currentAlbumId || 'exames', oldName, trimmed);
    }
    if (currentSubAlbumName === oldName) {
      currentSubAlbumName = trimmed;
    }
    populateSubAlbumDatalist();
    renderMedia();
    alert(`✅ Subálbum renomeado com sucesso para "${trimmed}"!`);
  }

  // =========================================================================
  // EXCLUIR SUBÁLBUM / EXAME DE FAIXA
  // =========================================================================
  function promptDeleteSubAlbum(subName) {
    if (!subName) return;
    const confirmMsg = `⚠️ Tem certeza que deseja excluir o subálbum "${subName}"?\n\nEle será removido permanentemente.`;
    if (!confirm(confirmMsg)) return;
    if (window.TKST_AUTH && window.TKST_AUTH.deleteSubAlbum) {
      window.TKST_AUTH.deleteSubAlbum(currentAlbumId || 'exames', subName);
    }
    if (currentSubAlbumName === subName) {
      currentSubAlbumName = null;
    }
    populateSubAlbumDatalist();
    renderMedia();
    if (typeof initHomePhotoSlide === 'function') initHomePhotoSlide();
    alert(`✅ Subálbum "${subName}" excluído com sucesso!`);
  }

  function handleSaveAlbum(e) {
    e.preventDefault();
    const modal = document.getElementById('createAlbumModal');
    const editId = modal && modal.dataset.editAlbumId;

    // Se veio do openEditAlbumModal, salva como edição
    if (editId) {
      const title = ((document.getElementById('createAlbumTitleInput') || {}).value || '').trim();
      const description = ((document.getElementById('createAlbumDescInput') || {}).value || '').trim();
      const iconValue = (document.getElementById('createAlbumIconSelect') || {}).value || 'fas fa-folder';
      const hasSubAlbums = (document.getElementById('createAlbumHasSubAlbums') || {}).checked || false;

      if (!title) { alert('Por favor, informe o nome do álbum.'); return; }

      if (window.TKST_AUTH && window.TKST_AUTH.updateAlbum) {
        window.TKST_AUTH.updateAlbum(editId, { title, description, icon: iconValue, badge: title, hasSubAlbums });
      }

      closeCreateAlbumModal();
      updateMediaAlbumSelect();
      renderMedia();
      alert(`✅ Álbum "${title}" atualizado com sucesso!`);
      return;
    }

    const mode = (document.getElementById('createAlbumMode') || {}).value || 'principal';

    if (mode === 'sub-exame') {
      const parentAlbumId = (document.getElementById('createAlbumSubParent') || {}).value || 'exames';
      const subName = ((document.getElementById('createAlbumSubNameInput') || {}).value || '').trim();
      if (!subName) { alert('Por favor, digite o nome do subálbum.'); return; }
      
      // Salva o subálbum explicitamente na base permanente
      if (window.TKST_AUTH && window.TKST_AUTH.addSubAlbum) {
        window.TKST_AUTH.addSubAlbum(parentAlbumId, subName);
      }

      closeCreateAlbumModal();
      currentAlbumId = parentAlbumId;
      currentSubAlbumName = null;
      populateSubAlbumDatalist();
      renderMedia();
      alert(`✅ Subálbum "${subName}" criado e salvo com sucesso!`);
      return;
    }

    // Criação de álbum principal customizado
    const title = ((document.getElementById('createAlbumTitleInput') || {}).value || '').trim();
    const description = ((document.getElementById('createAlbumDescInput') || {}).value || '').trim();
    const iconValue = (document.getElementById('createAlbumIconSelect') || {}).value || 'fas fa-folder';
    const hasSubAlbums = (document.getElementById('createAlbumHasSubAlbums') || {}).checked || false;

    if (!title) { alert('Por favor, informe o nome do álbum.'); return; }

    const slug = 'album_' + title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') + '_' + Date.now();

    if (window.TKST_AUTH && window.TKST_AUTH.addAlbum) {
      window.TKST_AUTH.addAlbum({ id: slug, title, description, icon: iconValue, badge: title, hasSubAlbums });
    }

    closeCreateAlbumModal();
    updateMediaAlbumSelect();
    renderMedia();
    alert(`✅ Álbum "${title}" criado com sucesso!`);
  }

  function deleteCustomAlbum(albumId, albumTitle) {
    if (!confirm(`🗑️ Excluir o álbum "${albumTitle}"?\n\nO álbum será removido da galeria.`)) return;
    if (window.TKST_AUTH && window.TKST_AUTH.deleteAlbum) {
      window.TKST_AUTH.deleteAlbum(albumId);
    }
    const deleted = JSON.parse(localStorage.getItem('tkst_deleted_album_ids')) || [];
    if (!deleted.includes(albumId)) {
      deleted.push(albumId);
      localStorage.setItem('tkst_deleted_album_ids', JSON.stringify(deleted));
    }
    updateMediaAlbumSelect();
    renderMedia();
    if (typeof initHomePhotoSlide === 'function') initHomePhotoSlide();
  }

  // Atualiza dinamicamente as opções do select de álbum no modal de mídia
  function updateMediaAlbumSelect() {
    const sel = document.getElementById('adminMediaCategorySelect');
    if (!sel) return;
    const all = getAlbumsList();
    const icons = { 'exames': '🥋', 'competicoes': '🏆', 'didaticos': '🎬' };
    sel.innerHTML = all.map(a =>
      `<option value="${a.id}">${icons[a.id] || '📁'} ${a.title}</option>`
    ).join('');
  }


  function handleMediaSearch(query) {
    currentMediaSearch = query;
    renderMedia();
  }

  // =========================================================================
  // SELEÇÃO MÚLTIPLA & EXCLUSÃO (UNITÁRIA E EM LOTE)
  // =========================================================================
  function toggleMediaSelectionMode() {
    mediaSelectionMode = !mediaSelectionMode;
    selectedMediaIds.clear();
    renderMedia();
  }

  function toggleMediaSelection(mediaId) {
    if (selectedMediaIds.has(mediaId)) {
      selectedMediaIds.delete(mediaId);
    } else {
      selectedMediaIds.add(mediaId);
    }
    renderMedia();
  }

  function selectAllMedia() {
    const allMedia = getNormalizedMediaList();
    let target = allMedia.filter(m => m.album === currentAlbumId);
    if (currentAlbumId === 'exames' && currentSubAlbumName) {
      target = target.filter(m => (m.subAlbum || 'Exame de Faixa Geral') === currentSubAlbumName);
    }
    if (currentMediaSearch && currentMediaSearch.trim()) {
      const q = currentMediaSearch.toLowerCase().trim();
      target = target.filter(m => 
        (m.title && m.title.toLowerCase().includes(q)) ||
        (m.description && m.description.toLowerCase().includes(q)) ||
        (m.dojo && m.dojo.toLowerCase().includes(q)) ||
        (m.author && m.author.toLowerCase().includes(q)) ||
        (m.date && m.date.includes(q))
      );
    }

    if (selectedMediaIds.size === target.length && target.length > 0) {
      selectedMediaIds.clear();
    } else {
      target.forEach(m => selectedMediaIds.add(m.id));
    }
    renderMedia();
  }

  function deleteSelectedMedia() {
    if (selectedMediaIds.size === 0) return;
    const count = selectedMediaIds.size;
    const msg = `⚠️ Tem certeza que deseja excluir as ${count} foto(s)/vídeo(s) selecionadas da galeria?`;
    if (confirm(msg)) {
      const idsArray = Array.from(selectedMediaIds);
      if (window.TKST_AUTH && window.TKST_AUTH.deleteMediaItems) {
        window.TKST_AUTH.deleteMediaItems(idsArray);
      } else {
        idsArray.forEach(id => window.TKST_AUTH.deleteMediaItem(id));
      }
      selectedMediaIds.clear();
      mediaSelectionMode = false;
      renderMedia();
      if (typeof initHomePhotoSlide === 'function') initHomePhotoSlide();
      alert(`✅ ${count} mídia(s) excluída(s) com sucesso!`);
    }
  }

  async function deleteSingleMedia(mediaId) {
    if (confirm('⚠️ Tem certeza que deseja remover esta foto/vídeo da galeria?')) {
      if (window.TKST_IDB_MEDIA) {
        await window.TKST_IDB_MEDIA.deleteBlob(mediaId);
      }
      window.TKST_AUTH.deleteMediaItem(mediaId);
      if (currentLightboxMediaId === mediaId) {
        closeMediaLightbox();
      }
      renderMedia();
      if (typeof initHomePhotoSlide === 'function') initHomePhotoSlide();
    }
  }

  async function deleteCurrentLightboxMedia() {
    if (!currentLightboxMediaId) return;
    if (confirm('⚠️ Tem certeza que deseja excluir permanentemente esta foto/vídeo da galeria?')) {
      const idToDelete = currentLightboxMediaId;
      closeMediaLightbox();
      if (window.TKST_IDB_MEDIA) {
        await window.TKST_IDB_MEDIA.deleteBlob(idToDelete);
      }
      window.TKST_AUTH.deleteMediaItem(idToDelete);
      renderMedia();
      if (typeof initHomePhotoSlide === 'function') initHomePhotoSlide();
    }
  }

  // =========================================================================
  // LIGHTBOX IN-APP VIEWER (NUNCA REDIRECIONA PARA FORA DO APP)
  // =========================================================================
  async function openMediaLightbox(mediaId) {
    const allMedia = getNormalizedMediaList();
    const item = allMedia.find(m => m.id === mediaId);
    if (!item) return;

    currentLightboxMediaId = mediaId;
    if (!currentLightboxList || currentLightboxList.length === 0) {
      currentLightboxList = allMedia;
    }

    const modal = document.getElementById('mediaLightboxModal');
    const titleEl = document.getElementById('mediaLightboxTitle');
    const catEl = document.getElementById('mediaLightboxCategory');
    const dateEl = document.getElementById('mediaLightboxDate');
    const bodyEl = document.getElementById('mediaLightboxBody');
    const counterEl = document.getElementById('mediaLightboxCounter');
    const descEl = document.getElementById('mediaLightboxDesc');
    const delBtn = document.getElementById('mediaLightboxDeleteBtn');

    if (!modal || !bodyEl) return;

    const isAdmin = window.TKST_AUTH ? window.TKST_AUTH.isAdmin() : false;
    if (delBtn) {
      delBtn.style.display = isAdmin ? 'inline-flex' : 'none';
    }

    const catLabels = {
      'exames': '🥋 Exame de Faixa',
      'competicoes': '🏆 Competições',
      'didaticos': '🎬 Vídeo Didático'
    };

    if (titleEl) titleEl.textContent = item.title;
    if (catEl) catEl.textContent = catLabels[item.album || item.category] || 'TKST';
    if (dateEl) {
      const dateFormatted = item.date ? item.date.split('-').reverse().join('/') : '';
      dateEl.textContent = `${dateFormatted}${item.dojo ? ' • ' + item.dojo : ''}${item.subAlbum ? ' • ' + item.subAlbum : ''}`;
    }
    if (descEl) {
      descEl.innerHTML = item.description 
        ? `<i class="fas fa-info-circle" style="color: var(--accent-gold); margin-right: 5px;"></i> ${item.description}${item.author ? ` <span style="color: #94A3B8;">(Por: ${item.author})</span>` : ''}`
        : (item.author ? `<span style="color: #94A3B8;">Registro: ${item.author}</span>` : '');
    }

    const currentIndex = currentLightboxList.findIndex(m => m.id === mediaId);
    if (counterEl) {
      counterEl.textContent = `${currentIndex >= 0 ? currentIndex + 1 : 1} de ${currentLightboxList.length}`;
    }

    // Exibição interna direta (NUNCA redireciona para páginas fora do app)
    if (item.type === 'video') {
      let videoSrc = item.url;
      if (videoSrc && videoSrc.startsWith('idb:')) {
        videoSrc = await TKST_IDB_MEDIA.getMediaUrl(item);
      }
      const embed = getEmbedUrl(videoSrc);
      if (embed.type === 'video') {
        bodyEl.innerHTML = `
          <div class="media-lightbox-video-wrap">
            <video controls autoplay playsinline style="width: 100%; max-height: 65vh; background: #000; border-radius: 6px;">
              <source src="${embed.url}" type="video/mp4">
              Seu navegador não suporta reprodução direta.
            </video>
          </div>
        `;
      } else {
        bodyEl.innerHTML = `
          <div class="media-lightbox-video-wrap" style="width: 100%; aspect-ratio: 16/9; max-height: 65vh;">
            <iframe 
              src="${embed.url}" 
              style="width: 100%; height: 100%; border: 0; border-radius: 6px;" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowfullscreen>
            </iframe>
          </div>
        `;
      }
    } else {
      let imgSrc = item.url;
      if (imgSrc && imgSrc.startsWith('idb:')) {
        imgSrc = await TKST_IDB_MEDIA.getMediaUrl(item);
      }
      bodyEl.innerHTML = `
        <div style="position: relative; max-width: 100%; max-height: 100%; display: flex; align-items: center; justify-content: center;">
          <img src="${imgSrc}" alt="${escapeHtml(item.title)}" class="media-lightbox-img" id="mediaLightboxCurrentImg" loading="eager" onerror="this.src='assets/images/logo-tkst-2.jpg'">
        </div>
      `;
    }

    if (!modal.classList.contains('active')) {
      history.pushState({ modal: 'lightbox', tab: currentTab, albumId: currentAlbumId, subAlbum: currentSubAlbumName }, '', '#lightbox');
    }
    modal.classList.add('active');
  }

  function closeMediaLightbox(triggerBack = true) {
    const modal = document.getElementById('mediaLightboxModal');
    if (modal) {
      modal.classList.remove('active');
      const bodyEl = document.getElementById('mediaLightboxBody');
      if (bodyEl) {
        // Pausa qualquer vídeo tocando
        const vid = bodyEl.querySelector('video');
        if (vid) vid.pause();
        bodyEl.innerHTML = '';
      }
    }
    if (triggerBack && window.location.hash === '#lightbox') {
      history.back();
    }
  }

  function navigateMediaLightbox(step) {
    if (!currentLightboxList || currentLightboxList.length === 0) return;
    const currentIndex = currentLightboxList.findIndex(m => m.id === currentLightboxMediaId);
    if (currentIndex === -1) return;
    let nextIndex = currentIndex + step;
    if (nextIndex < 0) nextIndex = currentLightboxList.length - 1;
    if (nextIndex >= currentLightboxList.length) nextIndex = 0;
    const nextItem = currentLightboxList[nextIndex];
    if (nextItem) {
      openMediaLightbox(nextItem.id);
    }
  }

  async function downloadCurrentLightboxMedia() {
    if (!currentLightboxMediaId) return;
    const allMedia = getNormalizedMediaList();
    const item = allMedia.find(m => m.id === currentLightboxMediaId);
    if (item) {
      let downloadUrl = item.url;
      if (downloadUrl && downloadUrl.startsWith('idb:')) {
        downloadUrl = await TKST_IDB_MEDIA.getMediaUrl(item);
      }
      downloadMediaFile(downloadUrl, item.title, item.type);
    }
  }

  // Download direto no celular / dispositivo
  async function downloadMediaFile(url, title, type) {
    if (!url) return;
    const cleanTitle = (title || 'tkst-midia').replace(/[^a-zA-Z0-9_-]/g, '_');

    // Se for YouTube ou Vimeo
    if (url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo.com')) {
      alert('ℹ️ Vídeos hospedados no YouTube ou Vimeo são reproduzidos diretamente dentro do app e não possuem arquivo de mídia direto para download.');
      return;
    }

    let ext = 'jpg';
    if (type === 'video') ext = 'mp4';
    const matchExt = url.split(/[#?]/)[0].match(/\.(jpg|jpeg|png|webp|gif|svg|mp4|webm)$/i);
    if (matchExt) ext = matchExt[1].toLowerCase();
    const filename = `${cleanTitle}.${ext}`;

    const dlBtn = document.getElementById('mediaLightboxDownloadBtn');
    const prevHtml = dlBtn ? dlBtn.innerHTML : '';
    if (dlBtn) dlBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> <span>Baixando...</span>`;

    // Se for IndexedDB pointer direto
    if (url.startsWith('idb:')) {
      const id = url.replace('idb:', '');
      const blob = await TKST_IDB_MEDIA.getBlob(id);
      if (blob) {
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(blobUrl);
        }, 15000);
        if (dlBtn) {
          dlBtn.innerHTML = `<i class="fas fa-check"></i> <span>Salvo!</span>`;
          setTimeout(() => {
            if (dlBtn) dlBtn.innerHTML = prevHtml || `<i class="fas fa-download"></i> <span>Baixar</span>`;
          }, 2000);
        }
        return;
      }
    }

    // Se for Data URL ou Blob URL já pronto
    if (url.startsWith('data:') || url.startsWith('blob:')) {
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
      }, 1000);
      if (dlBtn) {
        dlBtn.innerHTML = `<i class="fas fa-check"></i> <span>Salvo!</span>`;
        setTimeout(() => {
          if (dlBtn) dlBtn.innerHTML = prevHtml || `<i class="fas fa-download"></i> <span>Baixar</span>`;
        }, 2000);
      }
      return;
    }

    try {
      // 1. Tenta baixar via Fetch + Blob (salva direto no celular na pasta de downloads)
      const res = await fetch(url, { mode: 'cors' });
      if (res.ok) {
        const blob = await res.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(blobUrl);
        }, 15000);
        if (dlBtn) {
          dlBtn.innerHTML = `<i class="fas fa-check"></i> <span>Salvo!</span>`;
          setTimeout(() => {
            if (dlBtn) dlBtn.innerHTML = prevHtml || `<i class="fas fa-download"></i> <span>Baixar</span>`;
          }, 2000);
        }
        return;
      }
    } catch (e) {
      console.log('Download via blob bloqueado por CORS, usando fallback nativo:', e);
    }

    // 2. Fallback direto com atributo download
    try {
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.setAttribute('download', filename);
      a.setAttribute('target', '_blank');
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
      }, 1000);
      if (dlBtn) {
        dlBtn.innerHTML = `<i class="fas fa-check"></i> <span>Iniciado!</span>`;
        setTimeout(() => {
          if (dlBtn) dlBtn.innerHTML = prevHtml || `<i class="fas fa-download"></i> <span>Baixar</span>`;
        }, 2000);
      }
    } catch (e) {
      if (dlBtn) dlBtn.innerHTML = prevHtml;
      alert('Não foi possível iniciar o download automático. Toque e segure na imagem para salvar.');
    }
  }

  // =========================================================================
  // ADMIN MODAL PARA CADASTRO / EDIÇÃO DE MÍDIA & ÁLBUNS
  // =========================================================================
  function handleMediaAlbumSelectChange(albumVal) {
    const subGroup = document.getElementById('adminMediaSubAlbumGroup');
    const albums = getAlbumsList();
    const currentAlbumObj = albums.find(a => a.id === albumVal);
    const allowsSub = (albumVal === 'exames') || (currentAlbumObj && currentAlbumObj.hasSubAlbums);
    if (subGroup) {
      subGroup.style.display = allowsSub ? 'block' : 'none';
    }
  }

  function setMediaSourceMode(mode) {
    activeMediaSourceMode = mode;
    const tabFile = document.getElementById('mediaSourceTabFile');
    const tabUrl = document.getElementById('mediaSourceTabUrl');
    const groupFile = document.getElementById('mediaSourceFileGroup');
    const groupUrl = document.getElementById('mediaSourceUrlGroup');
    const urlInput = document.getElementById('adminMediaUrlInput');
    const modeInput = document.getElementById('adminMediaSourceMode');

    if (modeInput) modeInput.value = mode;

    if (mode === 'file') {
      if (tabFile) {
        tabFile.style.background = 'rgba(255, 183, 3, 0.15)';
        tabFile.style.borderColor = 'var(--accent-gold)';
        tabFile.style.color = 'var(--accent-gold)';
      }
      if (tabUrl) {
        tabUrl.style.background = 'rgba(255, 255, 255, 0.05)';
        tabUrl.style.borderColor = 'rgba(255, 255, 255, 0.15)';
        tabUrl.style.color = '#94A3B8';
      }
      if (groupFile) groupFile.style.display = 'block';
      if (groupUrl) groupUrl.style.display = 'none';
      if (urlInput) urlInput.removeAttribute('required');
    } else {
      if (tabFile) {
        tabFile.style.background = 'rgba(255, 255, 255, 0.05)';
        tabFile.style.borderColor = 'rgba(255, 255, 255, 0.15)';
        tabFile.style.color = '#94A3B8';
      }
      if (tabUrl) {
        tabUrl.style.background = 'rgba(255, 183, 3, 0.15)';
        tabUrl.style.borderColor = 'var(--accent-gold)';
        tabUrl.style.color = 'var(--accent-gold)';
      }
      if (groupFile) groupFile.style.display = 'none';
      if (groupUrl) groupUrl.style.display = 'block';
      if (urlInput) urlInput.setAttribute('required', 'required');
    }
  }

  // =========================================================================
  // CLOUDINARY — Upload externo gratuito (sem gastar Vercel/GitHub)
  // Arquivos ficam no servidor do Cloudinary, acessíveis de qualquer celular
  // =========================================================================
  async function uploadToCloudinary(file, onProgress) {
    const CLOUD_NAME = 'pjviqlqu';
    const UPLOAD_PRESET = 'tkst_alunos';
    const resourceType = file.type.startsWith('video/') ? 'video' : 'image';
    const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', 'tkst-alunos');

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', endpoint);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          const data = JSON.parse(xhr.responseText);
          const url = data.secure_url;
          let thumbUrl = url;
          if (resourceType === 'image') {
            // Thumbnail via transformação do Cloudinary (sem custo extra)
            thumbUrl = url.replace('/upload/', '/upload/w_320,h_220,c_fill,q_75/');
          } else {
            // Thumbnail do vídeo: captura o frame do segundo 1
            thumbUrl = url
              .replace('/upload/', '/upload/so_1,w_320,h_220,c_fill,q_75/')
              .replace(/\.(mp4|mov|webm|avi)(\?.*)?$/i, '.jpg');
          }
          resolve({ url, thumbUrl, publicId: data.public_id });
        } else {
          reject(new Error(`Erro no upload (${xhr.status}). Verifique o Upload Preset no Cloudinary.`));
        }
      };

      xhr.onerror = () => reject(new Error('Falha de rede ao enviar para o Cloudinary. Verifique sua conexão.'));
      xhr.send(formData);
    });
  }

  async function handleMediaFileSelected(input) {
    const files = input.files ? Array.from(input.files) : [];
    if (files.length === 0) return;

    activeMediaSelectedFiles = files;
    activeMediaSelectedFile = files[0];
    activeMediaThumbnailBase64 = null;

    const previewContainer = document.getElementById('mediaFilePreviewContainer');
    const badge = document.getElementById('mediaFileBadge');
    const imgWrapper = document.getElementById('mediaImagePreviewWrapper');
    const imgPreview = document.getElementById('mediaImagePreview');
    const vidWrapper = document.getElementById('mediaVideoPreviewWrapper');
    const vidPreview = document.getElementById('mediaVideoPreview');
    const multiWrapper = document.getElementById('mediaMultiPreviewWrapper');
    const multiGrid = document.getElementById('mediaMultiThumbsGrid');
    const infoText = document.getElementById('mediaFileInfoText');
    const titleInput = document.getElementById('adminMediaTitleInput');
    const typeSelect = document.getElementById('adminMediaTypeSelect');
    const submitBtn = document.getElementById('adminMediaSubmitBtn');

    // Se selecionou múltiplos arquivos
    if (files.length > 1) {
      let totalBytes = 0;
      let hasVideo = false;
      let hasImage = false;

      files.forEach(f => {
        totalBytes += f.size;
        if (f.type.startsWith('video/')) hasVideo = true;
        if (f.type.startsWith('image/')) hasImage = true;
      });

      const formattedTotal = totalBytes > 1024 * 1024
        ? (totalBytes / (1024 * 1024)).toFixed(1) + ' MB'
        : (totalBytes / 1024).toFixed(0) + ' KB';

      if (typeSelect) {
        typeSelect.value = hasImage ? 'image' : 'video';
      }

      if (badge) {
        badge.textContent = `📷 ${files.length} Fotos/Vídeos Selecionados (${formattedTotal})`;
      }

      if (imgWrapper) imgWrapper.style.display = 'none';
      if (vidWrapper) vidWrapper.style.display = 'none';
      if (vidPreview) { vidPreview.pause(); vidPreview.src = ''; }

      if (multiGrid) {
        multiGrid.innerHTML = '';
        files.slice(0, 15).forEach((f) => {
          const itemUrl = URL.createObjectURL(f);
          const thumbDiv = document.createElement('div');
          thumbDiv.style.cssText = 'flex-shrink: 0; width: 68px; height: 68px; border-radius: 6px; overflow: hidden; border: 1.5px solid rgba(255,183,3,0.5); position: relative; background: #000;';
          if (f.type.startsWith('image/')) {
            thumbDiv.innerHTML = `<img src="${itemUrl}" style="width:100%; height:100%; object-fit:cover;">`;
          } else {
            thumbDiv.innerHTML = `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; color:var(--accent-gold); font-size:1.2rem;"><i class="fas fa-video"></i></div>`;
          }
          multiGrid.appendChild(thumbDiv);
        });
        if (files.length > 15) {
          const moreDiv = document.createElement('div');
          moreDiv.style.cssText = 'flex-shrink: 0; width: 68px; height: 68px; border-radius: 6px; display: flex; align-items: center; justify-content: center; background: rgba(255,183,3,0.15); border: 1.5px dashed var(--accent-gold); color: #FFF; font-size: 0.75rem; font-weight: 700;';
          moreDiv.textContent = `+${files.length - 15}`;
          multiGrid.appendChild(moreDiv);
        }
      }
      if (multiWrapper) multiWrapper.style.display = 'block';

      if (infoText) {
        infoText.innerHTML = `<strong>${files.length} fotos prontas</strong> (${formattedTotal}) • Serão enviadas em sequência ao Cloudinary`;
      }

      if (submitBtn) {
        submitBtn.innerHTML = `<i class="fas fa-cloud-upload-alt"></i> Enviar ${files.length} Fotos para o Álbum`;
      }

      // Preenche título base automaticamente se vazio
      if (titleInput && (!titleInput.value || !titleInput.value.trim())) {
        const subInput = document.getElementById('adminMediaSubAlbumInput');
        const catSelect = document.getElementById('adminMediaCategorySelect');
        const defaultName = (subInput && subInput.value.trim()) || (catSelect && catSelect.value) || 'Foto';
        titleInput.value = defaultName.charAt(0).toUpperCase() + defaultName.slice(1);
      }

      if (previewContainer) previewContainer.style.display = 'block';
      return;
    }

    // Caso arquivo único (1 arquivo selecionado)
    const file = files[0];
    const formattedSize = file.size > 1024 * 1024
      ? (file.size / (1024 * 1024)).toFixed(1) + ' MB'
      : (file.size / 1024).toFixed(0) + ' KB';

    if (multiWrapper) multiWrapper.style.display = 'none';
    if (multiGrid) multiGrid.innerHTML = '';

    if (titleInput && (!titleInput.value || !titleInput.value.trim())) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ');
      titleInput.value = nameWithoutExt.charAt(0).toUpperCase() + nameWithoutExt.slice(1);
    }

    const objUrl = URL.createObjectURL(file);

    if (file.type.startsWith('image/')) {
      if (typeSelect) typeSelect.value = 'image';
      if (badge) badge.textContent = `📷 Foto Selecionada (${formattedSize})`;
      if (vidWrapper) vidWrapper.style.display = 'none';
      if (vidPreview) { vidPreview.pause(); vidPreview.src = ''; }
      if (imgWrapper) imgWrapper.style.display = 'block';
      if (imgPreview) imgPreview.src = objUrl;
      if (infoText) {
        infoText.innerHTML = `<strong>${escapeHtml(file.name)}</strong> (${formattedSize}) • Pronta para enviar ao Cloudinary`;
      }
    } else if (file.type.startsWith('video/')) {
      if (typeSelect) typeSelect.value = 'video';
      if (badge) badge.textContent = `🎬 Vídeo Selecionado (${formattedSize})`;
      if (imgWrapper) imgWrapper.style.display = 'none';
      if (vidWrapper) vidWrapper.style.display = 'block';
      if (vidPreview) { vidPreview.src = objUrl; vidPreview.load(); }
      if (infoText) {
        infoText.innerHTML = `<strong>${escapeHtml(file.name)}</strong> (${formattedSize}) • Pronto para enviar ao Cloudinary`;
      }
    } else {
      alert('Por favor, selecione um arquivo de imagem (PNG, JPG, WEBP) ou vídeo (MP4, MOV, WEBM).');
      return;
    }

    if (submitBtn) {
      submitBtn.innerHTML = `<i class="fas fa-save"></i> Salvar Mídia`;
    }

    if (previewContainer) previewContainer.style.display = 'block';
  }

  function clearSelectedMediaFile() {
    activeMediaSelectedFile = null;
    activeMediaSelectedFiles = [];
    activeMediaThumbnailBase64 = null;
    const fileInput = document.getElementById('adminMediaFileInput');
    if (fileInput) fileInput.value = '';
    const b64Input = document.getElementById('adminMediaFileBase64');
    if (b64Input) b64Input.value = '';
    const thumbInput = document.getElementById('adminMediaFileThumb');
    if (thumbInput) thumbInput.value = '';
    const blobKeyInput = document.getElementById('adminMediaFileBlobKey');
    if (blobKeyInput) blobKeyInput.value = '';

    const previewContainer = document.getElementById('mediaFilePreviewContainer');
    if (previewContainer) previewContainer.style.display = 'none';
    const multiWrapper = document.getElementById('mediaMultiPreviewWrapper');
    if (multiWrapper) multiWrapper.style.display = 'none';
    const multiGrid = document.getElementById('mediaMultiThumbsGrid');
    if (multiGrid) multiGrid.innerHTML = '';
    const vidPreview = document.getElementById('mediaVideoPreview');
    if (vidPreview) { vidPreview.pause(); vidPreview.src = ''; }
    const imgPreview = document.getElementById('mediaImagePreview');
    if (imgPreview) imgPreview.src = '';
    const submitBtn = document.getElementById('adminMediaSubmitBtn');
    if (submitBtn) {
      submitBtn.innerHTML = `<i class="fas fa-save"></i> Salvar Mídia`;
    }
  }

  function populateSubAlbumDatalist() {
    const datalist = document.getElementById('adminMediaSubAlbumList');
    if (!datalist) return;
    const allMedia = getNormalizedMediaList();
    const customSubs = (window.TKST_AUTH && window.TKST_AUTH.getCustomSubAlbums) ? window.TKST_AUTH.getCustomSubAlbums() : [];
    const mediaSubs = allMedia
      .filter(m => (m.album === 'exames' || m.subAlbum) && m.subAlbum)
      .map(m => m.subAlbum.trim());
    const customNames = customSubs.map(s => (s.name || '').trim()).filter(Boolean);
    const subs = Array.from(new Set([...mediaSubs, ...customNames]));
    datalist.innerHTML = subs.map(s => `<option value="${escapeHtml(s)}">`).join('');
  }

  function openAddMediaModal(defaultAlbum = null, defaultSubAlbum = null) {
    const modal = document.getElementById('adminMediaModal');
    const form = document.getElementById('adminMediaForm');
    const titleEl = document.getElementById('adminMediaModalTitle');
    if (!modal) return;
    if (form) form.reset();

    clearSelectedMediaFile();
    setMediaSourceMode('file');
    populateSubAlbumDatalist();
    updateMediaAlbumSelect();

    const targetAlbum = defaultAlbum || currentAlbumId || 'exames';
    document.getElementById('adminMediaId').value = '';
    document.getElementById('adminMediaDateInput').value = new Date().toISOString().split('T')[0];
    document.getElementById('adminMediaCategorySelect').value = targetAlbum;

    const subInput = document.getElementById('adminMediaSubAlbumInput');
    if (subInput) {
      subInput.value = defaultSubAlbum || currentSubAlbumName || (targetAlbum === 'exames' ? 'Exame de Faixa 2026 - Dojô Central' : '');
    }

    handleMediaAlbumSelectChange(targetAlbum);

    if (titleEl) titleEl.innerHTML = `<i class="fas fa-photo-video" style="color: var(--accent-gold); margin-right: 8px;"></i> Cadastrar Nova Mídia`;
    history.pushState({ modal: 'admin-media', tab: currentTab, albumId: currentAlbumId, subAlbum: currentSubAlbumName }, '', '#modal-media');
    modal.classList.add('active');
  }

  function openEditMediaModal(mediaId) {
    const all = getNormalizedMediaList();
    const item = all.find(m => m.id === mediaId);
    if (!item) return;

    const modal = document.getElementById('adminMediaModal');
    const titleEl = document.getElementById('adminMediaModalTitle');
    if (!modal) return;

    clearSelectedMediaFile();
    populateSubAlbumDatalist();
    updateMediaAlbumSelect();

    document.getElementById('adminMediaId').value = item.id;
    document.getElementById('adminMediaTitleInput').value = item.title || '';
    document.getElementById('adminMediaTypeSelect').value = item.type || 'image';
    document.getElementById('adminMediaCategorySelect').value = item.album || item.category || 'exames';
    document.getElementById('adminMediaUrlInput').value = item.url || '';
    document.getElementById('adminMediaDateInput').value = item.date || '';
    document.getElementById('adminMediaDojoInput').value = item.dojo || '';
    document.getElementById('adminMediaDescInput').value = item.description || '';

    const subInput = document.getElementById('adminMediaSubAlbumInput');
    if (subInput) {
      subInput.value = item.subAlbum || '';
    }

    handleMediaAlbumSelectChange(item.album || item.category || 'exames');

    if (item.url && item.url.includes('cloudinary.com')) {
      // Mídia hospedada no Cloudinary — mostra preview direto da URL pública
      setMediaSourceMode('file');
      const previewContainer = document.getElementById('mediaFilePreviewContainer');
      const badge = document.getElementById('mediaFileBadge');
      const imgWrapper = document.getElementById('mediaImagePreviewWrapper');
      const imgPreview = document.getElementById('mediaImagePreview');
      const vidWrapper = document.getElementById('mediaVideoPreviewWrapper');
      const vidPreview = document.getElementById('mediaVideoPreview');
      const infoText = document.getElementById('mediaFileInfoText');

      if (badge) badge.textContent = item.type === 'video' ? '🎬 Vídeo no Cloudinary' : '📷 Foto no Cloudinary';
      if (item.type === 'video') {
        if (imgWrapper) imgWrapper.style.display = 'none';
        if (vidWrapper) vidWrapper.style.display = 'block';
        if (vidPreview) vidPreview.src = item.url;
      } else {
        if (vidWrapper) vidWrapper.style.display = 'none';
        if (imgWrapper) imgWrapper.style.display = 'block';
        if (imgPreview) imgPreview.src = item.thumbUrl || item.url;
      }
      if (infoText) infoText.textContent = 'Mídia hospedada no Cloudinary. Toque em Trocar Arquivo para substituir.';
      if (previewContainer) previewContainer.style.display = 'block';
    } else if (item.isLocalUpload || (item.url && (item.url.startsWith('idb:') || item.url.startsWith('data:')))) {
      // Legado: mídia armazenada localmente (IndexedDB)
      setMediaSourceMode('file');
      const previewContainer = document.getElementById('mediaFilePreviewContainer');
      const badge = document.getElementById('mediaFileBadge');
      const imgWrapper = document.getElementById('mediaImagePreviewWrapper');
      const imgPreview = document.getElementById('mediaImagePreview');
      const vidWrapper = document.getElementById('mediaVideoPreviewWrapper');
      const vidPreview = document.getElementById('mediaVideoPreview');
      const infoText = document.getElementById('mediaFileInfoText');

      if (badge) badge.textContent = item.type === 'video' ? '🎬 Vídeo Local' : '📷 Foto Local';
      if (item.type === 'video') {
        if (imgWrapper) imgWrapper.style.display = 'none';
        if (vidWrapper) vidWrapper.style.display = 'block';
        if (vidPreview) {
          TKST_IDB_MEDIA.getMediaUrl(item).then(vUrl => { if (vidPreview) vidPreview.src = vUrl; });
        }
      } else {
        if (vidWrapper) vidWrapper.style.display = 'none';
        if (imgWrapper) imgWrapper.style.display = 'block';
        if (imgPreview) {
          TKST_IDB_MEDIA.getMediaUrl(item).then(iUrl => { if (imgPreview) imgPreview.src = iUrl || item.thumbUrl || item.url; });
        }
      }
      if (infoText) infoText.textContent = 'Mídia local. Toque em Trocar Arquivo para substituir e hospedar no Cloudinary.';
      if (previewContainer) previewContainer.style.display = 'block';
    } else {
      setMediaSourceMode('url');
    }

    if (titleEl) titleEl.innerHTML = `<i class="fas fa-edit" style="color: var(--accent-gold); margin-right: 8px;"></i> Editar Mídia`;
    history.pushState({ modal: 'admin-media', mediaId, tab: currentTab }, '', '#modal-media');
    modal.classList.add('active');
  }

  function closeAdminMediaModal(triggerBack = true) {
    const modal = document.getElementById('adminMediaModal');
    if (modal) modal.classList.remove('active');
    clearSelectedMediaFile();
    if (triggerBack && window.location.hash === '#modal-media') {
      history.back();
    }
  }

  async function handleSaveMediaSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('adminMediaId').value;
    const title = document.getElementById('adminMediaTitleInput').value.trim();
    const type = document.getElementById('adminMediaTypeSelect').value;
    const album = document.getElementById('adminMediaCategorySelect').value;
    const date = document.getElementById('adminMediaDateInput').value;
    const dojo = document.getElementById('adminMediaDojoInput').value.trim() || 'TKST Matriz';
    const description = document.getElementById('adminMediaDescInput').value.trim();
    const sourceMode = document.getElementById('adminMediaSourceMode').value || 'file';

    const subInput = document.getElementById('adminMediaSubAlbumInput');
    let subAlbum = (subInput && (album === 'exames' || subInput.value)) ? subInput.value.trim() : '';
    if (album === 'exames' && !subAlbum) {
      subAlbum = 'Exame de Faixa 2026 - Dojô Central';
    }

    const saveBtn = e.target.querySelector('button[type="submit"]');
    const originalBtnHtml = saveBtn ? saveBtn.innerHTML : '';

    try {
      if (sourceMode === 'file') {
        const filesToUpload = (activeMediaSelectedFiles && activeMediaSelectedFiles.length > 0)
          ? activeMediaSelectedFiles
          : (activeMediaSelectedFile ? [activeMediaSelectedFile] : []);

        if (filesToUpload.length > 0) {
          const total = filesToUpload.length;
          if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Enviando (${total} ${total === 1 ? 'arquivo' : 'fotos'})...`;
          }

          const progressWrap = document.getElementById('mediaUploadProgressWrap');
          const progressBar = document.getElementById('mediaUploadProgressBar');
          const progressText = document.getElementById('mediaUploadProgressText');
          if (progressWrap) progressWrap.style.display = 'block';
          if (progressBar) progressBar.style.width = '0%';

          const uploadedPayloads = [];
          const baseTitle = title || (subAlbum || album || 'Foto');

          for (let i = 0; i < total; i++) {
            const curFile = filesToUpload[i];
            const fileIdx = i + 1;
            const curType = curFile.type.startsWith('video/') ? 'video' : 'image';

            if (progressText) {
              progressText.textContent = total > 1
                ? `⬆️ Enviando foto ${fileIdx} de ${total}...`
                : `⬆️ Enviando para Cloudinary...`;
            }

            const result = await uploadToCloudinary(curFile, (pct) => {
              const overallPct = Math.round(((i + (pct / 100)) / total) * 100);
              if (progressBar) progressBar.style.width = overallPct + '%';
              if (progressText) {
                progressText.textContent = total > 1
                  ? `⬆️ Enviando foto ${fileIdx} de ${total} (${pct}%) • Total: ${overallPct}%`
                  : `Enviando... ${pct}%`;
              }
            });

            const itemTitle = total === 1 ? baseTitle : `${baseTitle} (${fileIdx})`;

            uploadedPayloads.push({
              title: itemTitle,
              type: curType,
              album,
              category: album,
              subAlbum,
              url: result.url,
              thumbUrl: result.thumbUrl || result.url,
              date,
              dojo,
              description,
              isLocalUpload: false,
              author: window.TKST_AUTH.getCurrentUser() ? window.TKST_AUTH.getCurrentUser().name : 'Sensei Diego'
            });
          }

          if (progressWrap) progressWrap.style.display = 'none';

          if (id && total === 1) {
            window.TKST_AUTH.updateMediaItem(id, uploadedPayloads[0]);
          } else if (window.TKST_AUTH && window.TKST_AUTH.addMediaItems) {
            window.TKST_AUTH.addMediaItems(uploadedPayloads);
          } else {
            uploadedPayloads.forEach(p => window.TKST_AUTH.addMediaItem(p));
          }

          if (subAlbum && window.TKST_AUTH && window.TKST_AUTH.addSubAlbum) {
            window.TKST_AUTH.addSubAlbum(album, subAlbum, { dojo });
          }

          closeAdminMediaModal();
          clearSelectedMediaFile();
          populateSubAlbumDatalist();

          if (currentTab === 'media') {
            if (subAlbum) {
              currentAlbumId = album;
              currentSubAlbumName = subAlbum;
            }
            renderMedia();
          } else if (currentTab === 'admin') {
            renderAdminMaster();
          }

          alert(total > 1
            ? `✅ ${total} fotos/vídeos enviados ao Cloudinary com sucesso!`
            : (id ? '✅ Mídia atualizada com sucesso!' : '✅ Foto/vídeo enviado ao Cloudinary e adicionado ao álbum!'));
          return;
        } else if (id) {
          // Edição sem trocar arquivo — mantém URL atual
          if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Salvando alterações...`;
          }
          const existing = getNormalizedMediaList().find(m => m.id === id);
          let finalUrl = existing ? existing.url : '';
          let thumbUrl = existing ? (existing.thumbUrl || existing.url) : '';
          let isLocalUpload = existing ? (existing.isLocalUpload || false) : false;

          const payload = {
            title: title || (subAlbum || album || 'Foto'),
            type,
            album,
            category: album,
            subAlbum,
            url: finalUrl,
            thumbUrl: thumbUrl || finalUrl,
            date,
            dojo,
            description,
            isLocalUpload,
            author: window.TKST_AUTH.getCurrentUser() ? window.TKST_AUTH.getCurrentUser().name : 'Sensei Diego'
          };

          window.TKST_AUTH.updateMediaItem(id, payload);

          if (subAlbum && window.TKST_AUTH && window.TKST_AUTH.addSubAlbum) {
            window.TKST_AUTH.addSubAlbum(album, subAlbum, { dojo });
          }

          closeAdminMediaModal();
          clearSelectedMediaFile();
          populateSubAlbumDatalist();

          if (currentTab === 'media') {
            if (subAlbum) {
              currentAlbumId = album;
              currentSubAlbumName = subAlbum;
            }
            renderMedia();
          } else if (currentTab === 'admin') {
            renderAdminMaster();
          }
          alert('✅ Mídia atualizada com sucesso!');
          return;
        } else {
          alert('Por favor, toque para escolher uma foto ou vídeo do seu celular ou mude para a aba "Link".');
          if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = originalBtnHtml; }
          return;
        }
      } else {
        // Modo Link URL (YouTube, ImgBB, etc.)
        if (saveBtn) {
          saveBtn.disabled = true;
          saveBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Salvando link...`;
        }
        let finalUrl = document.getElementById('adminMediaUrlInput').value.trim();
        if (!finalUrl) {
          alert('Por favor, preencha o link da imagem ou vídeo.');
          if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = originalBtnHtml; }
          return;
        }
        let thumbUrl = finalUrl;
        if (type === 'video') {
          const ytId = extractYouTubeId(finalUrl);
          if (ytId) thumbUrl = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
        }

        const payload = {
          title: title || (subAlbum || album || 'Foto'),
          type,
          album,
          category: album,
          subAlbum,
          url: finalUrl,
          thumbUrl: thumbUrl || finalUrl,
          date,
          dojo,
          description,
          isLocalUpload: false,
          author: window.TKST_AUTH.getCurrentUser() ? window.TKST_AUTH.getCurrentUser().name : 'Sensei Diego'
        };

        if (id) {
          window.TKST_AUTH.updateMediaItem(id, payload);
        } else {
          payload.id = `media_custom_${Date.now()}`;
          window.TKST_AUTH.addMediaItem(payload);
        }

        if (subAlbum && window.TKST_AUTH && window.TKST_AUTH.addSubAlbum) {
          window.TKST_AUTH.addSubAlbum(album, subAlbum, { dojo });
        }

        closeAdminMediaModal();
        clearSelectedMediaFile();
        populateSubAlbumDatalist();

        if (currentTab === 'media') {
          if (subAlbum) {
            currentAlbumId = album;
            currentSubAlbumName = subAlbum;
          }
          renderMedia();
        } else if (currentTab === 'admin') {
          renderAdminMaster();
        }
        alert(id ? '✅ Mídia atualizada com sucesso!' : '✅ Foto/vídeo adicionado ao álbum!');
      }
    } catch (err) {
      console.error('Erro ao salvar mídia:', err);
      const progressWrap = document.getElementById('mediaUploadProgressWrap');
      if (progressWrap) progressWrap.style.display = 'none';
      alert('Erro ao salvar mídia: ' + err.message);
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalBtnHtml;
      }
    }
  }

  // =========================================================================
  // 7. PUBLIC APPLICATION API (Attached to window.TKST_APP)
  // =========================================================================
  window.TKST_APP = {
    closeModal: () => {
      if (window.TKST_APP && typeof window.TKST_APP.closeDetailModal === 'function') {
        window.TKST_APP.closeDetailModal();
      } else {
        const modal = document.getElementById('detailModal');
        if (modal) {
          modal.removeAttribute('data-prevent-outside-close');
          modal.classList.remove('active');
        }
      }
    },
    switchTab,
    openAdminPanel,
    openAdmin: (subTab) => openAdminPanel(subTab),
    openUserAccountOrAdmin,
    renderMedia,
    openAlbum,
    openSubAlbum,
    promptCreateSubAlbum,
    openCreateAlbumModal,
    closeCreateAlbumModal,
    openEditAlbumModal,
    promptEditSubAlbum,
    promptDeleteSubAlbum,
    handleSaveAlbum,
    deleteCustomAlbum,
    updateMediaAlbumSelect,
    toggleMediaSelectionMode,
    toggleMediaSelection,
    selectAllMedia,
    deleteSelectedMedia,
    deleteSingleMedia,
    deleteCurrentLightboxMedia,
    handleMediaAlbumSelectChange,
    openMediaLightbox,
    closeMediaLightbox,
    navigateMediaLightbox,
    downloadCurrentLightboxMedia,
    downloadMediaFile,
    handleMediaSearch,
    openAddMediaModal,
    openEditMediaModal,
    closeAdminMediaModal,
    handleSaveMediaSubmit,
    setMediaSourceMode,
    handleMediaFileSelected,
    clearSelectedMediaFile,
    nextHomeSlide,
    prevHomeSlide,
    setHomeSlidePause,
    openHomeSlideLightbox,
    initHomePhotoSlide,
    TKST_IDB_MEDIA,
    deleteMediaItemConfirm: deleteSingleMedia,
    setAuthMode: (mode) => {
      authMode = mode;
      renderLogin();
    },
    setAdminSubTab: (subTab, forceOpen = false) => {
      if (subTab === null) {
        adminSubTab = null;
      } else if (adminSubTab === subTab && !forceOpen) {
        adminSubTab = null;
      } else {
        adminSubTab = subTab;
      }
      try { sessionStorage.setItem('tkst_admin_subtab', adminSubTab || ''); } catch(e) {}
      renderAdminMaster();
      if (adminSubTab) {
        setTimeout(() => {
          const target = document.querySelector('.admin-active-tab-banner') || document.querySelector('.admin-table-container');
          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 60);
      }
      if (subTab === 'quizzes' && window.TKST_AUTH && window.TKST_AUTH.pullQuizSubmissionsFromCloud) {
        window.TKST_AUTH.pullQuizSubmissionsFromCloud().then(() => {
          if (adminSubTab === 'quizzes') renderAdminMaster();
        }).catch(() => {});
      }
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
    toggleStudentsAccordion: () => {
      const body = document.getElementById('studentsAccordionBody');
      const icon = document.getElementById('studentsChevronIcon');
      const badge = document.getElementById('studentsToggleBadge');
      if (!body) return;

      const isHidden = body.style.display === 'none' || body.hidden;
      if (isHidden) {
        body.hidden = false;
        body.style.display = 'block';
        if (icon) icon.style.transform = 'rotate(180deg)';
        if (badge) badge.innerHTML = '<i class="fas fa-chevron-up" id="studentsChevronIcon" style="transition: transform 0.3s ease; margin-right: 4px;"></i> Toque para Recolher';
      } else {
        body.hidden = true;
        body.style.display = 'none';
        if (icon) icon.style.transform = 'rotate(0deg)';
        const count = window.TKST_AUTH ? window.TKST_AUTH.getAllStudents().length : '';
        if (badge) badge.innerHTML = `<i class="fas fa-chevron-down" id="studentsChevronIcon" style="transition: transform 0.3s ease; margin-right: 4px;"></i> Ver Alunos (${count})`;
      }
    },
    togglePendingAccordion: () => {
      const body = document.getElementById('pendingAccordionBody');
      const icon = document.getElementById('pendingChevronIcon');
      const badge = document.getElementById('pendingToggleBadge');
      if (!body) return;

      const isHidden = body.style.display === 'none' || body.hidden;
      if (isHidden) {
        body.hidden = false;
        body.style.display = 'block';
        if (icon) icon.style.transform = 'rotate(180deg)';
        if (badge) badge.innerHTML = '<i class="fas fa-chevron-up" id="pendingChevronIcon" style="transition: transform 0.3s ease; margin-right: 4px;"></i> Toque para Recolher';
      } else {
        body.hidden = true;
        body.style.display = 'none';
        if (icon) icon.style.transform = 'rotate(0deg)';
        const pendingCount = window.TKST_AUTH ? window.TKST_AUTH.getAllStudents().filter(s => s.status === 'pending').length : '';
        if (badge) badge.innerHTML = `<i class="fas fa-chevron-down" id="pendingChevronIcon" style="transition: transform 0.3s ease; margin-right: 4px;"></i> Ver Pendentes (${pendingCount})`;
      }
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
    openDojoKunModal: () => {
      const modal = document.getElementById('detailModal');
      const modalTitle = document.getElementById('detailModalTitle');
      const modalBody = document.getElementById('detailModalBody');
      if (!modal || !modalTitle || !modalBody) return;

      modalTitle.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <i class="fas fa-scroll" style="color: var(--accent-gold);"></i>
          <span>道場訓 • Dojo Kun (5 Princípios Sagrados)</span>
        </div>
      `;

      const dojoKunList = (window.TKST_GLOSSARY && window.TKST_GLOSSARY.dojoKun) ? window.TKST_GLOSSARY.dojoKun : [
        { number: 1, title: "Hitotsu! Jinkaku kansei ni tsutomuru koto!", translation: "Esforçar-se para a formação do caráter!", description: "O objetivo supremo reside no aperfeiçoamento do caráter e integridade do praticante." },
        { number: 2, title: "Hitotsu! Makoto no michi o mamoru koto!", translation: "Fidelidade para com o verdadeiro caminho da razão!", description: "Agir com lealdade, verdade e honestidade perante seus mestres, colegas e a si próprio." },
        { number: 3, title: "Hitotsu! Doryoku no seishin o yashinau koto!", translation: "Criar o espírito de esforço e perseverança!", description: "A dedicação e o treino contínuo superam qualquer obstáculo. Jamais desistir." },
        { number: 4, title: "Hitotsu! Reigi o omonzuru koto!", translation: "Respeitar acima de tudo!", description: "O Karatê começa e termina com respeito e cortesia sincera (Rei)." },
        { number: 5, title: "Hitotsu! Kekki no yū o imashimuru koto!", translation: "Conter o espírito de agressão!", description: "Dominar impulsos, cultivar o autocontrole e buscar sempre a serenidade e a paz." }
      ];

      modalBody.innerHTML = `
        <div class="dojokun-modal-view">
          <div class="dojokun-top-banner">
            <i class="fas fa-info-circle" style="color: var(--accent-gold); font-size: 0.85rem; flex-shrink: 0;"></i>
            <span>Todos os 5 preceitos iniciam com <strong>"Hitotsu!" (一つ - Em primeiro lugar)</strong>: todos possuem o mesmo valor supremo.</span>
          </div>

          <div class="dojokun-list-compact">
            ${dojoKunList.map((d, idx) => `
              <div class="dojokun-item-row">
                <div class="dojokun-item-left">
                  <span class="dojokun-num-badge">一.${idx + 1}</span>
                  <div class="dojokun-item-texts">
                    <div class="dojokun-item-pt">${d.translation}</div>
                    <div class="dojokun-item-jp">${d.title}</div>
                    <div class="dojokun-item-desc">${d.description}</div>
                  </div>
                </div>
                <button type="button" class="audio-pronounce-btn dojokun-audio-btn" onclick="window.TKST_APP.speakJapanese('${d.title.replace(/'/g, "\\'")}')" title="Ouvir pronúncia em Japonês">
                  <i class="fas fa-volume-up"></i>
                </button>
              </div>
            `).join('')}
          </div>

          <div class="dojokun-footer-action">
            <button type="button" class="btn btn-secondary btn-sm" style="font-size: 0.74rem; padding: 5px 12px; width: 100%;" onclick="window.TKST_APP.closeModal(); window.TKST_APP.switchTab('philosophy');">
              <i class="fas fa-torii-gate"></i> Ver Filosofia Completa do Karatê
            </button>
          </div>
        </div>
      `;

      modal.classList.add('active');
    },
    openNijuKunModal: () => {
      const modal = document.getElementById('detailModal');
      const modalTitle = document.getElementById('detailModalTitle');
      const modalBody = document.getElementById('detailModalBody');
      if (!modal || !modalTitle || !modalBody) return;

      modalTitle.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <i class="fas fa-torii-gate" style="color: var(--accent-crimson);"></i>
          <span>二十訓 • Niju Kun (20 Preceitos de Funakoshi)</span>
        </div>
      `;

      const nijuKunList = (window.TKST_GLOSSARY && window.TKST_GLOSSARY.nijuKun) ? window.TKST_GLOSSARY.nijuKun : [];

      modalBody.innerHTML = `
        <div class="nijukun-modal-view">
          <div class="nijukun-top-banner">
            <i class="fas fa-torii-gate" style="color: var(--accent-crimson); font-size: 0.85rem; flex-shrink: 0;"></i>
            <span>Os <strong>20 Preceitos Fundamentais</strong> de Gichin Funakoshi para o aperfeiçoamento da mente e da vida.</span>
          </div>

          <div class="nijukun-grid-compact">
            ${nijuKunList.map((n, idx) => `
              <div class="nijukun-item-row">
                <div class="nijukun-item-left">
                  <span class="nijukun-num-badge">${n.number || (idx + 1)}</span>
                  <div class="nijukun-item-texts">
                    <div class="nijukun-item-pt">${n.translation}</div>
                    <div class="nijukun-item-jp">${n.title}</div>
                    <div class="nijukun-item-desc">${n.description}</div>
                  </div>
                </div>
                <button type="button" class="audio-pronounce-btn nijukun-audio-btn" onclick="window.TKST_APP.speakJapanese('${n.title.replace(/'/g, "\\'")}')" title="Ouvir pronúncia em Japonês">
                  <i class="fas fa-volume-up"></i>
                </button>
              </div>
            `).join('')}
          </div>

          <div class="dojokun-footer-action">
            <button type="button" class="btn btn-secondary btn-sm" style="font-size: 0.74rem; padding: 5px 12px; width: 100%;" onclick="window.TKST_APP.closeModal(); window.TKST_APP.switchTab('philosophy');">
              <i class="fas fa-torii-gate"></i> Ver Filosofia Completa do Karatê
            </button>
          </div>
        </div>
      `;

      modal.classList.add('active');
    },

    loadDojobookAniversariantes: async function(forceRefresh = false) {
      if (!forceRefresh && window._tkstAniversariantesCache) {
        return window._tkstAniversariantesCache;
      }
      try {
        const cachedStr = localStorage.getItem('tkst_aniversariantes_cache');
        if (cachedStr) {
          const parsed = JSON.parse(cachedStr);
          if (parsed && (parsed.aniversariantes || parsed.todosPorMes)) {
            window._tkstAniversariantesCache = parsed;
          }
        }
      } catch (e) {}

      try {
        const res = await fetch('https://dojobook-five.vercel.app/api/aniversariantes?todosMeses=1', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data && data.success) {
            window._tkstAniversariantesCache = data;
            try {
              localStorage.setItem('tkst_aniversariantes_cache', JSON.stringify(data));
            } catch (e) {}

            // Atualiza o subtítulo do botão na Home se houver aniversariante hoje
            const subEl = document.getElementById('homeAniversariantesSubtitle');
            if (subEl) {
              const MESES_NOMES = [
                "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
                "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
              ];
              const mesAtualNome = MESES_NOMES[new Date().getMonth()];
              if (data.aniversariantesHoje && data.aniversariantesHoje.length > 0) {
                subEl.innerHTML = `<strong style="color: var(--accent-gold);">🎂 ${data.aniversariantesHoje.length} hoje!</strong>`;
              } else {
                subEl.textContent = mesAtualNome;
              }
            }
            return data;
          }
        }
      } catch (err) {
        console.warn('Falha ao consultar aniversariantes do DojôBook:', err);
      }
      return window._tkstAniversariantesCache || { aniversariantes: [], aniversariantesHoje: [], todosPorMes: {} };
    },

    openAniversariantesModal: async function(selectedMes = null) {
      const modal = document.getElementById('detailModal');
      const modalTitle = document.getElementById('detailModalTitle');
      const modalBody = document.getElementById('detailModalBody');
      if (!modal || !modalTitle || !modalBody) return;

      modal.removeAttribute('data-prevent-outside-close');

      const mesHoje = new Date().getMonth() + 1;
      const mesAtivo = selectedMes !== null ? Number(selectedMes) : mesHoje;

      modalTitle.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <i class="fas fa-birthday-cake" style="color: #10B981;"></i>
          <span>Aniversariantes do Dojô • DojôBook</span>
        </div>
      `;

      let data = window._tkstAniversariantesCache;
      if (!data) {
        modalBody.innerHTML = `
          <div style="text-align: center; padding: 36px 12px;">
            <i class="fas fa-circle-notch fa-spin" style="font-size: 2rem; color: #10B981; margin-bottom: 12px;"></i>
            <div style="color: #FFF; font-weight: 700; font-size: 0.95rem;">Consultando DojôBook...</div>
            <div style="color: #94A3B8; font-size: 0.78rem; margin-top: 4px;">Buscando os aniversariantes cadastrados via integração oficial.</div>
          </div>
        `;
        modal.classList.add('active');
        data = await window.TKST_APP.loadDojobookAniversariantes();
      } else {
        modal.classList.add('active');
        window.TKST_APP.loadDojobookAniversariantes(true).then(newData => {
          if (newData && modal.classList.contains('active')) {
            window.TKST_APP.renderAniversariantesModalContent(newData, mesAtivo);
          }
        });
      }

      window.TKST_APP.renderAniversariantesModalContent(data, mesAtivo);
    },

    renderAniversariantesModalContent: function(data, mesAtivo) {
      const modalBody = document.getElementById('detailModalBody');
      if (!modalBody) return;

      const MESES = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
      ];
      const MESES_CURTO = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

      const hoje = new Date();
      const mesHoje = hoje.getMonth() + 1;
      const diaHoje = hoje.getDate();

      let listaDoMes = [];
      if (data && data.todosPorMes && data.todosPorMes[mesAtivo]) {
        listaDoMes = data.todosPorMes[mesAtivo];
      } else if (data && data.aniversariantes && (data.mes === mesAtivo || !data.todosPorMes)) {
        listaDoMes = data.aniversariantes;
      }

      const aniversariantesHoje = (data && data.aniversariantesHoje) ? data.aniversariantesHoje : [];

      modalBody.innerHTML = `
        <div class="aniversariantes-modal-view">
          ${aniversariantesHoje.length > 0 ? `
            <div class="aniversariantes-top-banner">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 1.25rem;">🎉</span>
                <div>
                  <strong style="color: var(--accent-gold);">Aniversário Hoje!</strong>
                  <div style="font-size: 0.78rem; color: #FFF;">
                    ${aniversariantesHoje.map(a => `<strong>${escapeHtml(a.nome)}</strong>`).join(', ')}
                  </div>
                </div>
              </div>
              <button type="button" class="btn btn-sm btn-gold" onclick="window.TKST_APP.copyBirthdayWish('${escapeHtml(aniversariantesHoje[0].nome)}')" style="font-size: 0.70rem; padding: 4px 8px; font-weight: 700;">
                <i class="fas fa-copy"></i> Copiar Parabéns
              </button>
            </div>
          ` : `
            <div class="aniversariantes-top-banner">
              <div style="display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-info-circle" style="color: #10B981; font-size: 0.95rem;"></i>
                <span>Mural oficial de aniversariantes da <strong>TKST Karatê-Do</strong> sincronizado diretamente do <strong>DojôBook</strong>.</span>
              </div>
            </div>
          `}

          <!-- Navegação por Mês (12 meses) -->
          <div class="aniversariantes-months-grid">
            ${MESES_CURTO.map((m, idx) => {
              const numMes = idx + 1;
              const isActive = numMes === mesAtivo;
              const qtd = (data && data.todosPorMes && data.todosPorMes[numMes]) ? data.todosPorMes[numMes].length : 0;
              return `
                <div class="aniversariantes-month-pill ${isActive ? 'active' : ''}" onclick="window.TKST_APP.renderAniversariantesModalContent(window._tkstAniversariantesCache, ${numMes})">
                  <div>${m}</div>
                  ${qtd > 0 ? `<div style="font-size: 0.58rem; opacity: 0.85; margin-top: 1px;">(${qtd})</div>` : ''}
                </div>
              `;
            }).join('')}
          </div>

          <!-- Título da listagem -->
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 6px;">
            <div style="font-weight: 800; font-size: 0.88rem; color: #FFF; display: flex; align-items: center; gap: 6px;">
              <i class="fas fa-calendar-alt" style="color: #10B981;"></i>
              <span>${MESES[mesAtivo - 1]}</span>
            </div>
            <span style="font-size: 0.74rem; color: #94A3B8;">
              ${listaDoMes.length} ${listaDoMes.length === 1 ? 'aniversariante' : 'aniversariantes'}
            </span>
          </div>

          <!-- Lista de Aniversariantes -->
          <div class="aniversariantes-list">
            ${listaDoMes.length === 0 ? `
              <div style="text-align: center; padding: 32px 14px; border: 1px dashed rgba(255,255,255,0.12); border-radius: 8px; color: #94A3B8;">
                <i class="fas fa-calendar-times" style="font-size: 1.8rem; margin-bottom: 8px; opacity: 0.5;"></i>
                <div style="font-size: 0.86rem; color: #CBD5E1;">Nenhum aniversariante cadastrado em ${MESES[mesAtivo - 1]}.</div>
                <div style="font-size: 0.74rem; margin-top: 4px;">Os cadastros com data de nascimento no DojôBook aparecem aqui automaticamente.</div>
              </div>
            ` : listaDoMes.map(a => {
              const ehHoje = mesAtivo === mesHoje && a.dia === diaHoje;
              const beltCol = (function(bName) {
                if (!bName) return '#E2E8F0';
                const b = bName.toLowerCase();
                if (b.includes('preta') || b.includes('dan')) return '#18181B';
                if (b.includes('marrom')) return '#78350F';
                if (b.includes('roxa')) return '#8B5CF6';
                if (b.includes('verde')) return '#10B981';
                if (b.includes('laranja')) return '#FF7700';
                if (b.includes('vermelha')) return '#E63946';
                if (b.includes('amarela')) return '#F5BE00';
                return '#E2E8F0';
              })(a.graduacao_atual);

              const initials = (a.nome || 'A').trim().split(' ').filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('');

              return `
                <div class="aniversariante-item-card ${ehHoje ? 'is-today' : ''}">
                  <div class="aniversariante-left-box">
                    <div class="aniversariante-day-badge ${ehHoje ? 'is-today' : ''}">
                      <span class="aniversariante-day-num">${a.dia}</span>
                      <span class="aniversariante-day-label">${MESES_CURTO[mesAtivo - 1]}</span>
                    </div>

                    ${a.foto_url ? `
                      <img src="${escapeHtml(a.foto_url)}" alt="${escapeHtml(a.nome)}" class="aniversariante-avatar">
                    ` : `
                      <div class="aniversariante-avatar-placeholder">${initials}</div>
                    `}

                    <div style="min-width: 0; flex: 1;">
                      <div class="aniversariante-name-row">
                        <span class="aniversariante-name">${escapeHtml(a.nome)}</span>
                        ${ehHoje ? `<span class="aniversariante-today-tag">🎂 Aniversário Hoje!</span>` : ''}
                      </div>
                      <div class="aniversariante-meta">
                        <span class="aniversariante-belt-badge" style="border-left: 3px solid ${beltCol};">
                          <i class="fas fa-medal" style="color: ${beltCol}; font-size: 0.65rem;"></i>
                          ${escapeHtml(a.graduacao_atual || 'Karatê')}
                        </span>
                        ${a.faz_idade ? `<span>· Faz <strong>${a.faz_idade} anos</strong></span>` : ''}
                        ${a.dojo_nome ? `<span>· Dojô ${escapeHtml(a.dojo_nome)}</span>` : ''}
                      </div>
                    </div>
                  </div>

                  <button type="button" class="btn btn-sm btn-secondary" onclick="window.TKST_APP.copyBirthdayWish('${escapeHtml(a.nome.replace(/'/g, "\\'"))}')" style="font-size: 0.70rem; padding: 4px 8px; flex-shrink: 0;" title="Copiar mensagem para parabenizar">
                    <i class="fas fa-comment-dots"></i>
                  </button>
                </div>
              `;
            }).join('')}
          </div>

          <div style="display: flex; gap: 8px; margin-top: 4px;">
            <a href="https://dojobook-five.vercel.app/aniversarios" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm" style="flex: 1; font-size: 0.74rem; padding: 7px 12px; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 6px;">
              <i class="fas fa-external-link-alt" style="color: #10B981;"></i> Abrir no DojôBook
            </a>
            <button type="button" class="btn btn-primary btn-sm" onclick="window.TKST_APP.closeDetailModal()" style="font-size: 0.74rem; padding: 7px 16px;">
              Fechar
            </button>
          </div>
        </div>
      `;
    },

    copyBirthdayWish: function(nome) {
      const msg = `Oss! Parabéns pelo seu aniversário, guerreiro(a) ${nome}! Muita saúde, foco, sabedoria e muita evolução nos treinos de Karatê-Do na TKST! 🥋🎂🎉`;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(msg).then(() => {
          showToast(`📋 Mensagem de parabéns para ${nome} copiada com sucesso!`, 'success', 3500);
        }).catch(() => {
          prompt('Copie a mensagem de parabéns:', msg);
        });
      } else {
        prompt('Copie a mensagem de parabéns:', msg);
      }
    },
    toggleStudyAccordion: (sectionId) => {
      const body = document.getElementById(`studyBody_${sectionId}`);
      const header = document.getElementById(`studyHeader_${sectionId}`);
      const icon = document.getElementById(`studyIcon_${sectionId}`);
      if (!body) return;

      const isOpen = openStudySections.has(sectionId) || body.classList.contains('active');
      if (isOpen) {
        openStudySections.delete(sectionId);
        body.classList.remove('active');
        header?.classList.remove('active');
        if (icon) icon.style.transform = 'rotate(0deg)';
      } else {
        openStudySections.add(sectionId);
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
    startQuiz: (kyu, beltName) => startQuiz(kyu, beltName),
    startQuizLevel: (kyu, beltName) => startQuiz(kyu, beltName),
    toggleQuizSound: () => TKST_AUDIO.toggleMute(),
    exitQuiz,
    setAdminQuizSelectedKyu: (kyu) => {
      adminQuizSelectedKyu = parseInt(kyu);
      try { sessionStorage.setItem('tkst_admin_quiz_kyu', adminQuizSelectedKyu); } catch(e) {}
      renderAdminMaster();
    },

    loadDojobookCandidates: async function() {
      // 1. In-memory cache
      if (dojobookCandidatesCache && Array.isArray(dojobookCandidatesCache.candidatos) && dojobookCandidatesCache.candidatos.length > 0) {
        return dojobookCandidatesCache;
      }
      // 2. LocalStorage cache
      try {
        const cached = localStorage.getItem('tkst_dojobook_candidates_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && Array.isArray(parsed.candidatos)) {
            dojobookCandidatesCache = parsed;
            // Atualiza em segundo plano silenciosamente
            setTimeout(() => window.TKST_APP.fetchDojobookCandidatesBackground(), 100);
            return dojobookCandidatesCache;
          }
        }
      } catch (e) {}

      // 3. Fallback: busca com timeout curto de 3.5s
      return await window.TKST_APP.fetchDojobookCandidatesBackground();
    },

    fetchDojobookCandidatesBackground: async function() {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      try {
        const res = await fetch('https://dojobook-five.vercel.app/api/exames/candidatos', { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data === 'object') {
            dojobookCandidatesCache = data;
            try {
              localStorage.setItem('tkst_dojobook_candidates_cache', JSON.stringify(data));
            } catch(e) {}
            return data;
          }
        }
      } catch (err) {
        clearTimeout(timeoutId);
      }
      return dojobookCandidatesCache || { candidatos: [], alunos: [], exames: [] };
    },

    getAllAvailableStudentsForExam: function() {
      const results = [];
      const seen = new Set();

      // 1. Alunos cadastrados no Portal TKST (window.TKST_AUTH.getAllStudents())
      try {
        const appStudents = (window.TKST_AUTH && window.TKST_AUTH.getAllStudents()) || [];
        appStudents.forEach(s => {
          if (!s || s.username === 'irons365') return;
          const key = (s.name || '').toLowerCase().trim();
          if (!key || seen.has(key)) return;
          seen.add(key);

          results.push({
            id: s.id || ('app_' + key),
            nome: s.name,
            username: s.username,
            graduacao_atual: s.currentBelt || 'Branca',
            vai_para: s.targetBelt || s.nextBelt || 'Próxima Faixa',
            dojo_nome: s.dojo || s.unit || 'TKST',
            foto_url: s.photo || null,
            source: 'tkst_app',
            sourceLabel: 'Portal TKST',
            sourceColor: '#3B82F6',
            isExamCand: false
          });
        });
      } catch(e) {}

      // 2. Candidatos e Alunos do DojôBook (Cache)
      try {
        const dData = dojobookCandidatesCache || JSON.parse(localStorage.getItem('tkst_dojobook_candidates_cache') || 'null') || {};
        const candidatos = dData.candidatos || [];
        const dAlunos = dData.alunos || [];

        candidatos.forEach(c => {
          if (!c || !c.nome) return;
          const key = c.nome.toLowerCase().trim();
          if (seen.has(key)) {
            const existing = results.find(r => r.nome.toLowerCase().trim() === key);
            if (existing) {
              existing.isExamCand = true;
              existing.vai_para = c.vai_para || c.graduacao_destino || existing.vai_para;
              existing.dojo_nome = c.dojo_nome || existing.dojo_nome;
              if (c.foto_url) existing.foto_url = c.foto_url;
              existing.sourceLabel = 'DojôBook (Inscrito no Exame)';
              existing.sourceColor = '#F5BE00';
            }
            return;
          }
          seen.add(key);
          results.push({
            id: c.id,
            nome: c.nome,
            graduacao_atual: c.graduacao_atual || 'Branca',
            vai_para: c.vai_para || c.graduacao_destino || 'Amarela',
            dojo_nome: c.dojo_nome || 'DojôBook',
            foto_url: c.foto_url || null,
            source: 'dojobook',
            sourceLabel: 'DojôBook (Exame)',
            sourceColor: '#F5BE00',
            isExamCand: true
          });
        });

        dAlunos.forEach(a => {
          if (!a || !a.nome) return;
          const key = a.nome.toLowerCase().trim();
          if (seen.has(key)) return;
          seen.add(key);
          results.push({
            id: a.id,
            nome: a.nome,
            graduacao_atual: a.graduacao_atual || 'Branca',
            vai_para: a.vai_para || 'Próxima Faixa',
            dojo_nome: a.dojo_nome || 'DojôBook',
            foto_url: a.foto_url || null,
            source: 'dojobook',
            sourceLabel: 'DojôBook',
            sourceColor: '#10B981',
            isExamCand: false
          });
        });
      } catch(e) {}

      return results;
    },

    onDojobookStudentSearchFocus: function(inputEl) {
      if (inputEl) {
        inputEl.select();
      }
      window.TKST_APP.onDojobookStudentSearchInput(inputEl ? inputEl.value : '');
    },

    onDojobookStudentSearchInput: function(query) {
      const inputEl = document.getElementById('examDojobookStudentSearch');
      const clearBtn = document.getElementById('examDojobookClearBtn');
      const linkedBadge = document.getElementById('examDojobookLinkedBadge');
      const dropdown = document.getElementById('examDojobookAutocompleteDropdown');
      
      const rawVal = query !== undefined ? query : (inputEl ? inputEl.value : '');
      const cleanQ = (rawVal || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

      if (clearBtn) {
        clearBtn.style.display = rawVal ? 'flex' : 'none';
      }

      // Se o usuário digitou algo diferente do aluno vinculado, desvincula suavemente sem quebrar o fluxo
      if (examSelectedDojobookStudent && cleanQ !== (examSelectedDojobookStudent.nome || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()) {
        examSelectedDojobookStudent = null;
        if (linkedBadge) linkedBadge.style.display = 'none';
        if (inputEl) inputEl.style.borderColor = 'var(--border-color)';
      }

      if (!dropdown) return;

      const allStudents = window.TKST_APP.getAllAvailableStudentsForExam();
      const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      let matches = [];
      if (!cleanQ) {
        matches = [...allStudents].sort((a, b) => (b.isExamCand ? 1 : 0) - (a.isExamCand ? 1 : 0)).slice(0, 12);
      } else {
        matches = allStudents.filter(s => {
          const n = norm(s.nome);
          const u = norm(s.username);
          const d = norm(s.dojo_nome);
          return n.includes(cleanQ) || u.includes(cleanQ) || d.includes(cleanQ);
        }).sort((a, b) => {
          const nA = norm(a.nome);
          const nB = norm(b.nome);
          if (nA === cleanQ) return -1;
          if (nB === cleanQ) return 1;
          if (nA.startsWith(cleanQ) && !nB.startsWith(cleanQ)) return -1;
          if (!nA.startsWith(cleanQ) && nB.startsWith(cleanQ)) return 1;
          return (b.isExamCand ? 1 : 0) - (a.isExamCand ? 1 : 0);
        }).slice(0, 15);
      }

      let html = '';

      if (cleanQ && !matches.some(m => norm(m.nome) === cleanQ)) {
        html += `
          <div 
            class="dojobook-auto-item" 
            onclick="window.TKST_APP.selectCustomTypedStudent('${encodeURIComponent(rawVal.trim())}')" 
            style="padding: 10px 12px; border-radius: 6px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; gap: 10px; background: rgba(245,190,0,0.08); border-bottom: 1px solid rgba(255,255,255,0.08); margin-bottom: 4px;"
            onmouseenter="this.style.background='rgba(245,190,0,0.2)'"
            onmouseleave="this.style.background='rgba(245,190,0,0.08)'"
          >
            <div style="display: flex; align-items: center; gap: 8px;">
              <i class="fas fa-edit" style="color: var(--accent-gold); font-size: 1rem;"></i>
              <div>
                <div style="font-weight: 700; color: #FFF; font-size: 0.88rem;">Usar nome digitado: <span style="color: var(--accent-gold);">"${rawVal.trim()}"</span></div>
                <div style="font-size: 0.72rem; color: #94A3B8;">Gerar prova nominal com este nome avulso</div>
              </div>
            </div>
            <span style="font-size: 0.74rem; color: var(--accent-gold); font-weight: 800;">Aplicar ➔</span>
          </div>
        `;
      }

      if (matches.length === 0 && !cleanQ) {
        html += `
          <div style="padding: 12px; text-align: center; color: #94A3B8; font-size: 0.8rem;">
            Nenhum aluno cadastrado. Digite o nome para gerar prova nominal.
          </div>
        `;
      } else if (matches.length === 0 && cleanQ) {
        html += `
          <div style="padding: 8px 12px; text-align: center; color: #94A3B8; font-size: 0.78rem;">
            Nenhum aluno pré-cadastrado com "${rawVal}". Clique na opção acima para usar este nome.
          </div>
        `;
      } else {
        html += matches.map((m, idx) => {
          const photoHtml = m.foto_url 
            ? `<img src="${m.foto_url}" alt="${m.nome}" style="width: 34px; height: 34px; border-radius: 50%; object-fit: cover; border: 1.5px solid var(--accent-gold); flex-shrink: 0;" onerror="this.onerror=null;this.src='assets/images/logo-tkst-alunos.png'">`
            : `<div style="width: 34px; height: 34px; border-radius: 50%; background: rgba(255,183,3,0.15); border: 1px solid var(--accent-gold); display: flex; align-items: center; justify-content: center; color: var(--accent-gold); font-weight: bold; font-size: 0.8rem; flex-shrink: 0;">${(m.nome || 'A')[0]}</div>`;

          return `
            <div 
              class="dojobook-auto-item" 
              onclick="window.TKST_APP.selectDojobookCandidateByIndex(${idx})" 
              style="padding: 8px 12px; border-radius: 6px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; gap: 10px; transition: background 0.15s; border-bottom: 1px solid rgba(255,255,255,0.05);"
              onmouseenter="this.style.background='rgba(245,190,0,0.16)'"
              onmouseleave="this.style.background='transparent'"
            >
              <div style="display: flex; align-items: center; gap: 10px;">
                ${photoHtml}
                <div>
                  <div style="font-weight: 700; color: #FFF; font-size: 0.86rem; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                    ${m.nome}
                    <span class="badge" style="background: ${m.sourceColor}; color: #000; font-size: 0.62rem; padding: 1px 6px; font-weight: 800;">${m.sourceLabel}</span>
                  </div>
                  <div style="font-size: 0.72rem; color: #94A3B8; margin-top: 2px;">
                    ${m.graduacao_atual || 'Branca'} ${m.vai_para ? `➔ <strong style="color: var(--accent-gold);">${m.vai_para}</strong>` : ''}
                    ${m.dojo_nome ? ` · ${m.dojo_nome}` : ''}
                  </div>
                </div>
              </div>
              <span style="font-size: 0.74rem; color: var(--accent-gold); font-weight: 700; white-space: nowrap;">Vincular ➔</span>
            </div>
          `;
        }).join('');
      }

      window._lastDojobookMatches = matches;
      dropdown.innerHTML = html;
      dropdown.style.display = 'block';

      window.TKST_APP.fetchDojobookCandidatesBackground().catch(() => {});
    },

    selectCustomTypedStudent: function(encodedName) {
      const name = decodeURIComponent(encodedName).trim();
      if (!name) return;
      window._examTypedStudentName = name;
      examSelectedDojobookStudent = {
        id: 'std_custom_' + Date.now(),
        nome: name,
        dojo_nome: 'TKST',
        vai_para: 'Próxima Faixa'
      };
      const inputEl = document.getElementById('examDojobookStudentSearch');
      if (inputEl) {
        inputEl.value = name;
        inputEl.style.borderColor = '#10B981';
      }
      const linkedBadge = document.getElementById('examDojobookLinkedBadge');
      if (linkedBadge) linkedBadge.style.display = 'inline-block';
      const clearBtn = document.getElementById('examDojobookClearBtn');
      if (clearBtn) clearBtn.style.display = 'flex';
      const dropdown = document.getElementById('examDojobookAutocompleteDropdown');
      if (dropdown) dropdown.style.display = 'none';
      const infoBox = document.getElementById('examDojobookLinkedInfo');
      if (infoBox) {
        infoBox.innerHTML = `
          <div style="margin-top: 10px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.35); padding: 8px 14px; border-radius: 6px; font-size: 0.8rem; color: #A7F3D0;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <i class="fas fa-check-circle" style="color: #10B981; font-size: 1rem;"></i>
              <span>Aluno: <strong>${name}</strong> · Prova nominal personalizada</span>
            </div>
            <span style="font-size: 0.72rem; color: #6EE7B7; font-weight: 600;">Folha preenchida com este nome</span>
          </div>
        `;
      }
      if (examPreviewGenerated && window.TKST_EXAM_GENERATOR) {
        window.TKST_APP.generateExamPreview('exam');
      }
      if (typeof showToast === 'function') {
        showToast(`🥋 Nome "${name}" vinculado à prova!`, 'success');
      }
    },

    selectDojobookCandidateByIndex: function(idx) {
      const matches = window._lastDojobookMatches || [];
      const candidate = matches[idx];
      if (candidate) {
        window.TKST_APP.selectDojobookCandidate(candidate);
      }
    },

    selectDojobookCandidate: function(candidate) {
      window._examTypedStudentName = '';
      examSelectedDojobookStudent = candidate;
      const targetBelt = candidate.vai_para || candidate.graduacao_destino || candidate.graduacao_atual || '';
      
      const s = String(targetBelt).toLowerCase();
      let targetKyu = 6;
      if (s.includes('amarela') || s.includes('6º') || s.includes('6o')) targetKyu = 6;
      else if (s.includes('vermelha') || s.includes('5º') || s.includes('5o')) targetKyu = 5;
      else if (s.includes('laranja') || s.includes('4º') || s.includes('4o')) targetKyu = 4;
      else if (s.includes('verde') || s.includes('3º') || s.includes('3o')) targetKyu = 3;
      else if (s.includes('roxa') || s.includes('2º') || s.includes('2o')) targetKyu = 2;
      else if (s.includes('marrom') || s.includes('1º') || s.includes('1o')) targetKyu = 1;
      else if (s.includes('shodan') || s.includes('1º dan') || (s.includes('preta') && !s.includes('2') && !s.includes('3'))) targetKyu = 0;
      else if (s.includes('nidan') || s.includes('2º dan')) targetKyu = -1;
      else if (s.includes('sandan') || s.includes('3º dan')) targetKyu = -2;

      examGeneratorSelectedKyu = targetKyu;
      examCurrentRandomQuestions = null;
      if (examPreviewGenerated && window.TKST_EXAM_GENERATOR) {
        examCurrentRandomQuestions = window.TKST_EXAM_GENERATOR.getRandomQuizQuestionsForKyu(examGeneratorSelectedKyu, 10);
      }
      renderAdminMaster();
      if (typeof showToast === 'function') {
        showToast(`🥋 Aluno ${candidate.nome} vinculado! Faixa: ${targetBelt || 'Ajustada'}`, 'success');
      }
    },

    clearExamDojobookStudent: function() {
      window._examTypedStudentName = '';
      examSelectedDojobookStudent = null;
      renderAdminMaster();
      setTimeout(() => {
        const inp = document.getElementById('examDojobookStudentSearch');
        if (inp) {
          inp.value = '';
          inp.focus();
        }
      }, 50);
    },

    pushGradeToDojobook: async function({ studentName, studentId, score, total, beltName, kyu, examId }) {
      try {
        const data = await window.TKST_APP.loadDojobookCandidates();
        const todos = [...(data.candidatos || []), ...(data.alunos || [])];

        const norm = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
        const targetNorm = norm(studentName);

        let match = todos.find(a => a.id === studentId);
        if (!match) {
          match = todos.find(a => norm(a.nome) === targetNorm);
        }
        if (!match) {
          match = todos.find(a => norm(a.nome).includes(targetNorm) || targetNorm.includes(norm(a.nome)));
        }

        if (match && match.id) {
          const res = await fetch(`https://dojobook-five.vercel.app/api/alunos/${match.id}/notas-exame`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nota: Number(score),
              total: Number(total) || 10,
              data: new Date().toISOString().slice(0, 10),
              graduacao: beltName || 'Exame de Faixa',
              exam_id: examId || null,
              origem: 'tkst-alunos-camera'
            })
          });

          if (res.ok) {
            console.log(`[DojôBook] Nota ${score}/10 gravada com sucesso para ${match.nome}`);
            if (typeof showToast === 'function') {
              showToast(`🥋 Nota ${score}/10 gravada na ficha de ${match.nome} no DojôBook!`, 'success');
            }
          }
        }
      } catch (err) {
        console.warn('[DojôBook] Erro ao sincronizar nota com DojôBook:', err);
      }
    },

    onModalDojobookSearchInput: async function(query) {
      if (examGradingPendingResult) {
        examGradingPendingResult.detectedName = (query || '').trim();
      }
      const dropdown = document.getElementById('modalDojobookAutocompleteDropdown');
      if (!dropdown) return;

      const cleanQ = (query || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      const allStudents = window.TKST_APP.getAllAvailableStudentsForExam();
      const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      let matches = [];
      if (!cleanQ) {
        matches = [...allStudents].sort((a, b) => (b.isExamCand ? 1 : 0) - (a.isExamCand ? 1 : 0)).slice(0, 12);
      } else {
        matches = allStudents.filter(s => {
          const n = norm(s.nome);
          const u = norm(s.username);
          const d = norm(s.dojo_nome);
          return n.includes(cleanQ) || u.includes(cleanQ) || d.includes(cleanQ);
        }).sort((a, b) => {
          const nA = norm(a.nome);
          const nB = norm(b.nome);
          if (nA === cleanQ) return -1;
          if (nB === cleanQ) return 1;
          if (nA.startsWith(cleanQ) && !nB.startsWith(cleanQ)) return -1;
          if (!nA.startsWith(cleanQ) && nB.startsWith(cleanQ)) return 1;
          return (b.isExamCand ? 1 : 0) - (a.isExamCand ? 1 : 0);
        }).slice(0, 15);
      }

      if (matches.length === 0) {
        dropdown.innerHTML = `
          <div style="padding: 10px; text-align: center; color: #94A3B8; font-size: 0.8rem;">
            Nenhum aluno encontrado com "${query || ''}".
          </div>
        `;
        dropdown.style.display = 'block';
        return;
      }

      dropdown.innerHTML = matches.map((m, idx) => {
        const isExamCand = m.isExamCand;
        const targetBelt = m.vai_para || m.graduacao_destino || 'Amarela';
        const photoHtml = m.foto_url 
          ? `<img src="${m.foto_url}" alt="${m.nome}" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover; border: 1.5px solid var(--accent-gold); flex-shrink: 0;" onerror="this.onerror=null;this.src='assets/images/logo-tkst-alunos.png'">`
          : `<div style="width: 36px; height: 36px; border-radius: 50%; background: rgba(255,183,3,0.15); border: 1px solid var(--accent-gold); display: flex; align-items: center; justify-content: center; color: var(--accent-gold); font-weight: bold; font-size: 0.82rem; flex-shrink: 0;">${(m.nome || 'A')[0]}</div>`;

        return `
          <div 
            class="modal-dojobook-auto-item" 
            onclick="window.TKST_APP.selectModalDojobookCandidateByIndex(${idx})" 
            style="padding: 9px 12px; border-radius: 6px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; gap: 10px; transition: background 0.15s; border-bottom: 1px solid rgba(255,255,255,0.06);"
            onmouseenter="this.style.background='rgba(245,190,0,0.18)'"
            onmouseleave="this.style.background='transparent'"
          >
            <div style="display: flex; align-items: center; gap: 10px;">
              ${photoHtml}
              <div>
                <div style="font-weight: 700; color: #FFF; font-size: 0.88rem; display: flex; align-items: center; gap: 6px;">
                  ${m.nome}
                  <span class="badge" style="background: ${m.sourceColor}; color: #000; font-size: 0.62rem; padding: 1px 6px; font-weight: 800;">${m.sourceLabel}</span>
                </div>
                <div style="font-size: 0.74rem; color: #94A3B8; margin-top: 2px;">
                  ${m.graduacao_atual || 'Branca'} ➔ <strong style="color: var(--accent-gold);">${targetBelt}</strong>
                  ${m.dojo_nome ? ` · ${m.dojo_nome}` : ''}
                </div>
              </div>
            </div>
            <span style="font-size: 0.74rem; color: var(--accent-gold); font-weight: 700; white-space: nowrap;">Selecionar ➔</span>
          </div>
        `;
      }).join('');
      window._lastModalDojobookMatches = matches;
      dropdown.style.display = 'block';
    },

    selectModalDojobookCandidateByIndex: function(idx) {
      const matches = window._lastModalDojobookMatches || [];
      const candidate = matches[idx];
      if (candidate) {
        window.TKST_APP.selectModalDojobookCandidate(candidate);
      }
    },

    selectModalDojobookCandidate: function(candidate) {
      if (examGradingPendingResult) {
        examGradingPendingResult.selectedDojobookStudent = candidate;
        examGradingPendingResult.selectedAppStudent = null;
        examGradingPendingResult.detectedName = candidate.nome;
      }
      const dropdown = document.getElementById('modalDojobookAutocompleteDropdown');
      if (dropdown) dropdown.style.display = 'none';

      window.TKST_APP.refreshGradingReviewUI();
      if (typeof showToast === 'function') {
        showToast(`🥋 Aluno ${candidate.nome} vinculado à prova!`, 'success');
      }
    },

    clearModalDojobookStudent: function() {
      if (examGradingPendingResult) {
        examGradingPendingResult.selectedDojobookStudent = null;
        examGradingPendingResult.selectedAppStudent = null;
        examGradingPendingResult.detectedName = '';
      }
      window.TKST_APP.refreshGradingReviewUI();
    },

    onModalStudentSelectChange: function(selectEl) {
      if (!selectEl) return;
      const customWrap = document.getElementById('examGradeCustomStudentWrap');
      if (customWrap) {
        customWrap.style.display = (selectEl.value === '__guest__') ? 'block' : 'none';
      }
      if (selectEl.value && selectEl.value.startsWith('dojo_')) {
        const dId = selectEl.value.replace('dojo_', '');
        const dataCands = dojobookCandidatesCache || { candidatos: [], alunos: [] };
        const todos = [...(dataCands.candidatos || []), ...(dataCands.alunos || [])];
        let match = todos.find(t => String(t.id) === String(dId));
        if (!match && examGradingPendingResult && examGradingPendingResult.selectedDojobookStudent && String(examGradingPendingResult.selectedDojobookStudent.id) === String(dId)) {
          match = examGradingPendingResult.selectedDojobookStudent;
        }
        if (match && examGradingPendingResult) {
          examGradingPendingResult.selectedDojobookStudent = match;
          examGradingPendingResult.selectedAppStudent = null;
          examGradingPendingResult.detectedName = match.nome;
          const searchInput = document.getElementById('modalDojobookStudentSearch');
          if (searchInput) searchInput.value = match.nome;
        }
      } else if (selectEl.value && selectEl.value !== '__guest__') {
        if (examGradingPendingResult) {
          examGradingPendingResult.selectedDojobookStudent = null;
          const allSt = (window.TKST_AUTH && window.TKST_AUTH.getAllStudents()) || [];
          const aMatch = allSt.find(s => String(s.id) === String(selectEl.value));
          if (aMatch) {
            examGradingPendingResult.selectedAppStudent = aMatch;
            examGradingPendingResult.detectedName = aMatch.name;
            const searchInput = document.getElementById('modalDojobookStudentSearch');
            if (searchInput) searchInput.value = aMatch.name;
          }
        }
      } else if (selectEl.value === '__guest__') {
        if (examGradingPendingResult) {
          examGradingPendingResult.selectedDojobookStudent = null;
          examGradingPendingResult.selectedAppStudent = null;
        }
      }
    },

    setExamGeneratorKyu: (kyu) => {
      examGeneratorSelectedKyu = parseInt(kyu);
      examCurrentRandomQuestions = null;
      renderAdminMaster();
    },
    setExamGeneratorFormat: (fmt) => {
      examGeneratorFormat = fmt;
      examCurrentRandomQuestions = null;
      renderAdminMaster();
    },
    generateExamPreview: (mode = 'exam') => {
      const typedInp = document.getElementById('examDojobookStudentSearch');
      if (typedInp && typedInp.value.trim()) {
        window._examTypedStudentName = typedInp.value.trim();
      }
      if (window.TKST_EXAM_GENERATOR) {
        examCurrentRandomQuestions = window.TKST_EXAM_GENERATOR.getRandomQuizQuestionsForKyu(examGeneratorSelectedKyu, 10);
      }
      examPreviewGenerated = mode;
      renderAdminMaster();
    },
    rerollExamQuestions: () => {
      if (window.TKST_EXAM_GENERATOR) {
        examCurrentRandomQuestions = window.TKST_EXAM_GENERATOR.getRandomQuizQuestionsForKyu(examGeneratorSelectedKyu, 10);
        if (typeof showToast === 'function') {
          showToast('🎲 10 novas questões sorteadas com sucesso!', 'success');
        }
      }
      renderAdminMaster();
    },
    closeExamPreview: () => {
      examPreviewGenerated = false;
      renderAdminMaster();
    },
    printCurrentExam: () => {
      if (!window.TKST_EXAM_GENERATOR) return;
      if (!examCurrentRandomQuestions) {
        examCurrentRandomQuestions = window.TKST_EXAM_GENERATOR.getRandomQuizQuestionsForKyu(examGeneratorSelectedKyu, 10);
      }
      const exam = window.TKST_EXAM_GENERATOR.getExamData(examGeneratorSelectedKyu);
      let studentOptions = {};
      if (examSelectedDojobookStudent) {
        studentOptions = {
          studentName: examSelectedDojobookStudent.nome,
          studentId: examSelectedDojobookStudent.id,
          dojoName: examSelectedDojobookStudent.dojo_nome
        };
      } else {
        const typedStudent = (document.getElementById('examDojobookStudentSearch')?.value || window._examTypedStudentName || '').trim();
        if (typedStudent) {
          studentOptions = {
            studentName: typedStudent,
            studentId: 'std_typed_' + Date.now(),
            dojoName: 'TKST'
          };
        }
      }
      const html = window.TKST_EXAM_GENERATOR.buildQuizExamWithKeyHtml(examGeneratorSelectedKyu, examCurrentRandomQuestions, studentOptions);
      window.TKST_EXAM_GENERATOR.printHtml(`Prova Oficial - ${exam.targetBelt}`, html);
      // Mantém examCurrentRandomQuestions para que o gabarito corresponda à mesma prova impressa
    },
    printCurrentAnswerKey: () => {
      if (!window.TKST_EXAM_GENERATOR) return;
      if (!examCurrentRandomQuestions) {
        examCurrentRandomQuestions = window.TKST_EXAM_GENERATOR.getRandomQuizQuestionsForKyu(examGeneratorSelectedKyu, 10);
      }
      const exam = window.TKST_EXAM_GENERATOR.getExamData(examGeneratorSelectedKyu);
      const html = window.TKST_EXAM_GENERATOR.buildQuizAnswerKeySheetHtml(examGeneratorSelectedKyu, examCurrentRandomQuestions);
      window.TKST_EXAM_GENERATOR.printHtml(`Gabarito Oficial - ${exam.title}`, html);
    },
    printAllExams: () => {
      if (!window.TKST_EXAM_GENERATOR) return;
      const html = window.TKST_EXAM_GENERATOR.buildAllExamsHtml('quiz');
      window.TKST_EXAM_GENERATOR.printHtml("Caderno de Provas Completo (6º Kyu ao 3º Dan)", html);
    },
    printMasterAnswerKey: () => {
      if (!window.TKST_EXAM_GENERATOR) return;
      const html = window.TKST_EXAM_GENERATOR.buildMasterAnswerKeyHtml();
      window.TKST_EXAM_GENERATOR.printHtml("Gabarito Geral Unificado de Todas as Faixas", html);
    },



    autoFillWrongOptionsFromInputs: (mode) => {
      const qInput = document.getElementById(mode === 'edit' ? 'editQuizQuestionInput' : 'newQuizQuestionInput');
      const cInput = document.getElementById(mode === 'edit' ? 'editQuizCorrectAnswerInput' : 'newQuizCorrectAnswerInput');
      const w1 = document.getElementById(mode === 'edit' ? 'editQuizWrong1Input' : 'newQuizWrong1Input');
      const w2 = document.getElementById(mode === 'edit' ? 'editQuizWrong2Input' : 'newQuizWrong2Input');
      const w3 = document.getElementById(mode === 'edit' ? 'editQuizWrong3Input' : 'newQuizWrong3Input');

      if (!cInput) return;
      const qText = qInput ? qInput.value.trim() : '';
      const cText = cInput.value.trim();
      if (!cText) {
        showToast('⚠️ Digite a resposta correta primeiro para auto-sugerir alternativas do mesmo tipo!', 'warning', 3500);
        cInput.focus();
        return;
      }

      const smart = generateSmartOptions(qText, cText);
      const fallback = (smart.options || []).filter(o => o.trim().toLowerCase() !== cText.toLowerCase());

      if (w1 && fallback[0]) w1.value = fallback[0];
      if (w2 && fallback[1]) w2.value = fallback[1];
      if (w3 && fallback[2]) w3.value = fallback[2];

      const category = detectKarateCategory(qText, cText);
      const catLabels = {
        defesas: 'Defesas',
        socos: 'Socos e Ataques',
        chutes: 'Chutes',
        bases: 'Bases',
        katas: 'Katas',
        kumite: 'Kumite',
        alturas: 'Alturas/Níveis',
        armas: 'Armas Corporais',
        comandos: 'Comandos do Dojô',
        frases: 'Frases de tamanho similar'
      };
      const label = (category && catLabels[category]) || 'Itens equivalentes';
      showToast(`✨ 3 alternativas erradas geradas para a categoria: ${label}!`, 'success', 3500);
    },

    generateBatchQuestionSuggestions: (kyu, count = 5) => {
      function normalizeQuestionKey(text) {
        if (!text) return '';
        return String(text)
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .replace(/[^a-z0-9]/gi, '')
          .trim();
      }

      const existingSet = new Set();
      const bank = (window.TKST_AUTH && typeof window.TKST_AUTH.getCustomQuizBank === 'function')
        ? window.TKST_AUTH.getCustomQuizBank()
        : (window.TKST_QUIZ_BANK || window.TKST_DEFAULT_QUIZ_BANK || []);

      if (Array.isArray(bank)) {
        bank.forEach(item => {
          if (item && item.question) {
            existingSet.add(normalizeQuestionKey(item.question));
          }
        });
      }

      if (!window._tkstSuggestedHistory) {
        try {
          const raw = sessionStorage.getItem('tkst_suggested_history');
          window._tkstSuggestedHistory = raw ? JSON.parse(raw) : [];
        } catch (e) {
          window._tkstSuggestedHistory = [];
        }
      }
      (window._tkstSuggestedHistory || []).forEach(norm => existingSet.add(norm));

      const kyuKey = (parseInt(kyu) === 7) ? 6 : parseInt(kyu);
      const allCurriculums = (window.TKST_AUTH && typeof window.TKST_AUTH.getCustomCurriculum === 'function')
        ? window.TKST_AUTH.getCustomCurriculum()
        : (window.TKST_CURRICULUM || window.TKST_DEFAULT_CURRICULUM || []);

      const beltCurr = allCurriculums.find(c => Number(c.kyuNumber) === kyuKey)
        || allCurriculums.find(c => c.id === `kyu-${kyuKey}`)
        || null;

      const beltName = beltCurr ? beltCurr.beltName : getBeltNameFromKyu(kyuKey);
      const targetBelt = beltCurr ? (beltCurr.targetBelt || beltName) : beltName;
      const kihonList = beltCurr && Array.isArray(beltCurr.kihon) ? beltCurr.kihon : [];
      const requiredKatas = (beltCurr && beltCurr.kata && Array.isArray(beltCurr.kata.required)) ? beltCurr.kata.required : [];
      const kataDescription = (beltCurr && beltCurr.kata && beltCurr.kata.description) ? beltCurr.kata.description : '';
      const kumiteType = (beltCurr && beltCurr.kumite && beltCurr.kumite.type) ? beltCurr.kumite.type : '';
      const dachiWazaList = (beltCurr && Array.isArray(beltCurr.dachiWaza)) ? beltCurr.dachiWaza : [];
      const reqList = (beltCurr && Array.isArray(beltCurr.requirements)) ? beltCurr.requirements : [];

      const ALL_STANCES = [
        "Zenkutsu Dachi", "Kokutsu Dachi", "Kiba Dachi", "Fudo Dachi",
        "Neko Ashi Dachi", "Sanchin Dachi", "Heiko Dachi", "Musubi Dachi",
        "Kosa Dachi", "Heisoku Dachi", "Hachiji Dachi"
      ];
      const ALL_TECHNIQUES = [
        "Oi Tsuki", "Gyaku Tsuki", "Kizami Tsuki", "Sanbon Tsuki", "Nihon Tsuki",
        "Jodan Age Uke", "Chudan Soto Uke", "Chudan Uchi Uke", "Gedan Barai",
        "Chudan Shuto Uke", "Morote Uke", "Juji Uke", "Manji Uke", "Kakiwake Uke",
        "Mae Geri", "Mawashi Geri", "Yoko Geri Keage", "Yoko Geri Kekomi", "Ushiro Geri",
        "Empi Uchi", "Uraken Uchi", "Teisho Uchi", "Nukite", "Hiza Geri"
      ];
      const ALL_KATAS = [
        "Heian Shodan", "Heian Nidan", "Heian Sandan", "Heian Yondan", "Heian Godan",
        "Tekki Shodan", "Bassai Dai", "Kanku Dai", "Jion", "Enpi", "Hangetsu",
        "Gankaku", "Jitte", "Sochin", "Nijushiho", "Chinte", "Meikyo", "Unsu"
      ];
      const ALL_KUMITE = [
        "Gohon Kumite (5 passos)", "Sanbon Kumite (1ª e 2ª Forma)",
        "Kihon Ippon Kumite", "Jiyu Ippon Kumite (semilivre)",
        "Shiai Kumite (combate de competição)", "Jiyu Kumite (luta livre)"
      ];
      const ALL_COUNTS = ["5 vezes (Go Kai)", "3 vezes (San Kai)", "10 vezes (Ju Kai)", "1 vez (Ippon)", "4 vezes (Yon Kai)"];
      const ALL_DIRECTIONS = ["Mae (Avançando à frente)", "Sagate (Recuando para trás)", "Mawate (Girando / Mudança de frente)", "Yoko (Deslocamento lateral)"];

      function pickDistractors(pool, correct, num = 3) {
        const normC = normalizeQuestionKey(correct);
        const filtered = pool.filter(item => normalizeQuestionKey(item) !== normC);
        const shuffled = [...filtered].sort(() => 0.5 - Math.random());
        const result = shuffled.slice(0, num);
        while (result.length < num) {
          result.push(`Alternativa ${result.length + 1}`);
        }
        return result;
      }

      const generatedCandidates = [];

      // 1. QUESTÕES DIRETAS DO PLANO DE ESTUDOS (KIHON DA FAIXA)
      kihonList.forEach(k => {
        if (!k || !k.technique) return;

        // Base exigida na técnica
        if (k.stance) {
          generatedCandidates.push({
            question: `No Kihon do exame oficial para ${beltName}, em qual base (Dachi Waza) é executada a técnica '${k.technique}'?`,
            correctAnswer: k.stance,
            wrongAnswers: pickDistractors(ALL_STANCES, k.stance, 3),
            topic: "Kihon • Bases",
            beltName: beltName
          });
        }

        // Quantidade de repetições
        if (k.count) {
          generatedCandidates.push({
            question: `Quantas repetições são exigidas na linha de Kihon para a técnica '${k.technique}' no exame de ${beltName}?`,
            correctAnswer: k.count,
            wrongAnswers: pickDistractors(ALL_COUNTS, k.count, 3),
            topic: "Kihon • Contagem",
            beltName: beltName
          });
        }

        // Direção de deslocamento
        if (k.direction) {
          const dirFull = k.direction.includes('Mae') ? 'Mae (Avançando à frente)'
            : (k.direction.includes('Sagate') ? 'Sagate (Recuando para trás)'
            : (k.direction.includes('Mawate') ? 'Mawate (Girando)' : k.direction));
          generatedCandidates.push({
            question: `Segundo o plano de estudos da ${beltName}, qual a direção de deslocamento ao executar '${k.technique}'?`,
            correctAnswer: dirFull,
            wrongAnswers: pickDistractors(ALL_DIRECTIONS, dirFull, 3),
            topic: "Kihon • Deslocamento",
            beltName: beltName
          });
        }

        // Reconhecimento de técnica do plano de estudos
        generatedCandidates.push({
          question: `Qual das seguintes técnicas de Kihon faz parte das exigências oficiais no plano de estudos para ${beltName}?`,
          correctAnswer: k.technique,
          wrongAnswers: pickDistractors(ALL_TECHNIQUES, k.technique, 3),
          topic: "Kihon • Técnicas",
          beltName: beltName
        });
      });

      // 2. QUESTÕES DO PLANO DE ESTUDOS (KATA DA FAIXA)
      if (requiredKatas.length > 0) {
        const kataName = requiredKatas.join(', ');
        generatedCandidates.push({
          question: `Qual é o Kata obrigatório exigido no plano de estudos oficial para o exame de ${beltName}?`,
          correctAnswer: kataName,
          wrongAnswers: pickDistractors(ALL_KATAS, kataName, 3),
          topic: "Kata • Exame Oficial",
          beltName: beltName
        });

        if (kataDescription) {
          generatedCandidates.push({
            question: `Segundo o plano de estudos da ${beltName}, quais diretrizes técnicas são avaliadas no Kata ${requiredKatas[0]}?`,
            correctAnswer: kataDescription,
            wrongAnswers: [
              "Execução rápida sem pausas ou ritmo definido, dispensando o uso de Kiai.",
              "Treinamento exclusivo em base Kokutsu Dachi com golpes apenas circulares.",
              "Apresentação adaptada de armas com técnicas de salto acrobático livre."
            ],
            topic: "Kata • Diretrizes",
            beltName: beltName
          });
        }
      }

      // 3. QUESTÕES DO PLANO DE ESTUDOS (KUMITE DA FAIXA)
      if (kumiteType) {
        generatedCandidates.push({
          question: `Qual modalidade de combate (Kumite) é exigida no plano de estudos para o exame de ${beltName}?`,
          correctAnswer: kumiteType,
          wrongAnswers: pickDistractors(ALL_KUMITE, kumiteType, 3),
          topic: "Kumite • Combate",
          beltName: beltName
        });
      }

      // 4. QUESTÕES DO PLANO DE ESTUDOS (DACHI WAZA / BASES)
      if (dachiWazaList.length > 0) {
        dachiWazaList.slice(0, 3).forEach(base => {
          generatedCandidates.push({
            question: `Qual das seguintes posturas (Dachi Waza) é expressamente exigida no plano de estudos da ${beltName}?`,
            correctAnswer: base,
            wrongAnswers: pickDistractors(ALL_STANCES, base, 3),
            topic: "Dachi Waza • Posturas",
            beltName: beltName
          });
        });
      }

      // 5. QUESTÕES DO PLANO DE ESTUDOS (REQUISITOS E CARÊNCIA)
      if (reqList.length > 0) {
        generatedCandidates.push({
          question: `Qual é um dos pré-requisitos oficiais no plano de estudos para poder realizar o exame de ${beltName}?`,
          correctAnswer: reqList[0],
          wrongAnswers: [
            "Mínimo de 5 anos ininterruptos de treino como faixa preta",
            "Apenas participação em torneio internacional de Kumite",
            "Isenção total de frequência em treinos práticos semanais"
          ],
          topic: "Requisitos • Carência",
          beltName: beltName
        });
      }

      // 6. QUESTÕES ESPECÍFICAS CURADAS POR KYU (ordem oficial do Plano de Estudos: 6º ao 1º Kyu e Dan)
      const CURATED_BY_KYU = {
        6: [
          { q: "Qual é o primeiro Kata fundamental ensinado no exame de Faixa Branca para Faixa Amarela (6º Kyu)?", c: "Heian Shodan", w: ["Heian Nidan", "Tekki Shodan", "Bassai Dai"], t: "Kata" },
          { q: "Quantos movimentos oficiais compõem o Kata Heian Shodan?", c: "21 movimentos", w: ["26 movimentos", "20 movimentos", "18 movimentos"], t: "Kata" },
          { q: "Em quais movimentos do Kata Heian Shodan ocorrem os Kiais oficiais?", c: "No 9º e no 17º movimentos", w: ["No 1º e no 21º movimentos", "No 5º e no 10º movimentos", "No 12º e no 19º movimentos"], t: "Kata" },
          { q: "Qual é o nome do Kumite de 5 passos praticado no exame de Faixa Amarela (6º Kyu)?", c: "Gohon Kumite", w: ["Sanbon Kumite", "Jiyu Kumite", "Jiyu Ippon Kumite"], t: "Kumite" },
          { q: "O que significa a palavra KARATÊ-DO em sua tradução literal?", c: "Caminho das Mãos Vazias", w: ["Caminho da Espada Rápida", "Arte dos Pés de Ferro", "Caminho da Lança Dourada"], t: "Filosofia" },
          { q: "Quais são as três alturas fundamentais de golpe no Karatê (Jodan, Chudan e Gedan)?", c: "Jodan (Alto), Chudan (Médio) e Gedan (Baixo)", w: ["Mae, Sagate e Mawate", "Ichi, Ni e San", "Rei, Mokuso e Yame"], t: "Fundamentos" },
          { q: "Qual é o nome da base frontal com 60% do peso na perna da frente e 40% atrás?", c: "Zenkutsu Dachi", w: ["Kokutsu Dachi", "Kiba Dachi", "Heisoku Dachi"], t: "Bases" },
          { q: "Qual é o nome da base recuada em L com 70% do peso na perna de trás?", c: "Kokutsu Dachi", w: ["Zenkutsu Dachi", "Kiba Dachi", "Fudo Dachi"], t: "Bases" },
          { q: "Qual é o nome da defesa baixa com antebraço mais ensinada aos iniciantes?", c: "Gedan Barai", w: ["Age Uke", "Soto Uke", "Shuto Uke"], t: "Defesas" },
          { q: "Como se chama o soco contrário à perna que se encontra à frente na base?", c: "Gyaku Tsuki", w: ["Oi Tsuki", "Kizami Tsuki", "Tate Tsuki"], t: "Socos" },
          { q: "Qual é o nome do chute frontal executado atingindo com a bola do pé (Koshi)?", c: "Mae Geri", w: ["Mawashi Geri", "Yoko Geri", "Ushiro Geri"], t: "Chutes" }
        ],
        7: [
          { q: "Qual é o primeiro Kata fundamental ensinado no exame de Faixa Branca para Faixa Amarela (6º Kyu)?", c: "Heian Shodan", w: ["Heian Nidan", "Tekki Shodan", "Bassai Dai"], t: "Kata" },
          { q: "Quantos movimentos oficiais compõem o Kata Heian Shodan?", c: "21 movimentos", w: ["26 movimentos", "20 movimentos", "18 movimentos"], t: "Kata" },
          { q: "O que significa a palavra KARATÊ-DO em sua tradução literal?", c: "Caminho das Mãos Vazias", w: ["Caminho da Espada Rápida", "Arte dos Pés de Ferro", "Caminho da Lança Dourada"], t: "Filosofia" },
          { q: "Quais são as três alturas fundamentais de golpe no Karatê (Jodan, Chudan e Gedan)?", c: "Jodan (Alto), Chudan (Médio) e Gedan (Baixo)", w: ["Mae, Sagate e Mawate", "Ichi, Ni e San", "Rei, Mokuso e Yame"], t: "Fundamentos" },
          { q: "Qual é o nome da base frontal com 60% do peso na perna da frente e 40% atrás?", c: "Zenkutsu Dachi", w: ["Kokutsu Dachi", "Kiba Dachi", "Heisoku Dachi"], t: "Bases" },
          { q: "Qual é o nome da defesa baixa com antebraço mais ensinada aos iniciantes?", c: "Gedan Barai", w: ["Age Uke", "Soto Uke", "Shuto Uke"], t: "Defesas" },
          { q: "Qual é o nome do chute frontal executado atingindo com a bola do pé (Koshi)?", c: "Mae Geri", w: ["Mawashi Geri", "Yoko Geri", "Ushiro Geri"], t: "Chutes" }
        ],
        5: [
          { q: "Qual é o Kata oficial exigido para o exame de graduação de Faixa Amarela para Faixa Vermelha (5º Kyu)?", c: "Heian Nidan", w: ["Heian Shodan", "Heian Sandan", "Tekki Shodan"], t: "Kata" },
          { q: "Quantos movimentos oficiais possui o Kata Heian Nidan?", c: "26 movimentos", w: ["21 movimentos", "20 movimentos", "24 movimentos"], t: "Kata" },
          { q: "Qual forma de Kumite de 3 passos é exigida no exame de Faixa Vermelha (5º Kyu)?", c: "Sanbon Kumite (1ª e 2ª Forma)", w: ["Gohon Kumite", "Jiyu Kumite", "Jiyu Ippon Kumite"], t: "Kumite" },
          { q: "Qual técnica de ataque com a ponta dos quatro dedos estendidos (Nukite) aparece no Heian Nidan?", c: "Chudan Nukite", w: ["Seiken Tsuki", "Empi Uchi", "Uraken Uchi"], t: "Técnicas" },
          { q: "Qual é a função e o significado da defesa reforçada com os dois braços (Morote Uke)?", c: "Defesa com suporte do braço oposto para resistir a impactos pesados", w: ["Defesa de pernas cruzadas no solo", "Ataque duplo de ponta de dedos aos olhos", "Bloqueio com esquiva lateral de corpo"], t: "Defesas" },
          { q: "Qual é a diferença biomecânica entre Yoko Geri Keage e Yoko Geri Kekomi?", c: "Keage é ascendente/percussivo e Kekomi é linear/penetrante", w: ["Keage é circular para trás e Kekomi é frontal", "Keage atinge com a coxa e Kekomi com os dedos", "Não há diferença, são o mesmo chute"], t: "Chutes" }
        ],
        4: [
          { q: "Qual é o Kata oficial exigido para a graduação de Faixa Vermelha para Faixa Laranja (4º Kyu)?", c: "Heian Sandan", w: ["Heian Nidan", "Heian Yondan", "Bassai Dai"], t: "Kata" },
          { q: "Quantos movimentos oficiais compõem o Kata Heian Sandan?", c: "20 movimentos", w: ["26 movimentos", "21 movimentos", "23 movimentos"], t: "Kata" },
          { q: "Quais formas de Sanbon Kumite são cobradas no exame para Faixa Laranja (4º Kyu)?", c: "Sanbon Kumite (3ª, 4ª e 5ª Forma)", w: ["1ª e 2ª Forma", "Apenas Gohon Kumite", "Jiyu Kumite"], t: "Kumite" },
          { q: "Qual é a postura do cavaleiro (Kiba Dachi) com peso igualmente distribuído?", c: "50% na perna esquerda e 50% na direita", w: ["70% atrás e 30% na frente", "60% na frente e 40% atrás", "90% na perna de apoio"], t: "Bases" },
          { q: "Qual técnica de cotovelada (Empi Uchi) é praticada na faixa laranja e no Heian Sandan?", c: "Mawashi Empi Uchi (ou Mae Empi Uchi)", w: ["Yoko Geri", "Shuto Uke", "Gedan Barai"], t: "Golpes" },
          { q: "O que significa o termo 'BUNKAI' no estudo dos Katas de Karatê?", c: "Análise e aplicação prática das técnicas de combate do Kata", w: ["Contagem numérica em japonês", "Saudação cerimonial de início de treino", "Uniforme tradicional e faixa"], t: "Conceitos" }
        ],
        3: [
          { q: "Qual é o Kata oficial exigido para a graduação de Faixa Laranja para Faixa Verde (3º Kyu)?", c: "Heian Yondan", w: ["Heian Sandan", "Heian Godan", "Tekki Shodan"], t: "Kata" },
          { q: "Quantos movimentos oficiais compõem o Kata Heian Yondan?", c: "27 movimentos", w: ["20 movimentos", "26 movimentos", "21 movimentos"], t: "Kata" },
          { q: "Qual modalidade de Kumite de um passo semi-livre é cobrada no 3º Kyu (Faixa Verde)?", c: "Kihon Ippon Kumite", w: ["Gohon Kumite", "Sanbon Kumite", "Shiai Kumite"], t: "Kumite" },
          { q: "Qual chute circular atinge o oponente com o peito do pé ou a bola do pé?", c: "Mawashi Geri", w: ["Mae Geri", "Ushiro Geri", "Yoko Geri"], t: "Chutes" },
          { q: "O que significa manter o estado de alerta e foco mental (ZANSHIN) após um golpe?", c: "Postura e atenção contínua mantida antes, durante e após a técnica", w: ["Comemorar imediatamente o ponto obtido", "Relaxar totalmente os músculos e baixar a guarda", "Gritar Kiai repetidamente sem recuar"], t: "Filosofia" },
          { q: "Qual é a defesa em cruz com os punhos fechados ou abertos apresentada no Heian Yondan?", c: "Juji Uke", w: ["Manji Uke", "Age Uke", "Gedan Barai"], t: "Defesas" }
        ],
        2: [
          { q: "Quais Katas são exigidos no exame de Faixa Verde para Faixa Roxa (2º Kyu)?", c: "2 Heians da banca examinadora, Tekki Shodan e Katas Superiores", w: ["Apenas Heian Shodan", "Apenas Taikyoku Shodan", "Nenhum Kata"], t: "Kata" },
          { q: "Qual modalidade de Kumite de um passo livre é introduzida no exame para Faixa Roxa (2º Kyu)?", c: "Jiyu Ippon Kumite", w: ["Gohon Kumite", "Sanbon Kumite", "Yakusoku Kumite"], t: "Kumite" },
          { q: "Qual requisito de combate livre múltiplo é avaliado no exame de 2º Kyu (Faixa Roxa)?", c: "Jiyu Kumite contra 1 e contra 2 oponentes", w: ["Luta contra 10 oponentes", "Apenas luta contra o Sensei", "Não há combate"], t: "Kumite" },
          { q: "Qual exigência prática de Defesa Pessoal é cobrada no exame para Faixa Roxa (2º Kyu)?", c: "Defesa Pessoal com queda/projeção e imobilização no solo", w: ["Apenas esquiva sem contato", "Apenas combate esportivo", "Desarme com bastão"], t: "Defesa Pessoal" },
          { q: "Qual tarefa pedagógica de elaboração própria é exigida do aluno no exame para 2º Kyu?", c: "Elaboração própria de um Kihon de 3 passos para um graduado", w: ["Compor uma canção marcial", "Construir um makiwara", "Escrever um livro"], t: "Kihon" },
          { q: "O que caracteriza a aplicação máxima de foco, velocidade e contração no KIME?", c: "Concentração máxima de força e energia no instante do impacto", w: ["Relaxamento muscular total sem impacto", "Apenas respiração suave sem foco", "Esquiva sem desferir contra-ataque"], t: "Conceitos" }
        ],
        1: [
          { q: "Quais Katas são cobrados no exame de graduação de Faixa Roxa para Faixa Marrom (1º Kyu)?", c: "Tekki Shodan com Bunkai dos Heian Katas e Katas Superiores (Bassai Dai)", w: ["Heian Shodan e Heian Nidan", "Gankaku e Unsu", "Jion e Sochin"], t: "Kata" },
          { q: "Quantos movimentos compõem o Kata superior Bassai Dai ('Romper a Fortaleza') cobrado no 1º Kyu?", c: "42 movimentos", w: ["23 movimentos", "27 movimentos", "54 movimentos"], t: "Kata" },
          { q: "Como é estruturado o exame de Kihon Go Kai para a Faixa Marrom (1º Kyu)?", c: "5 técnicas em modo Execução e 5 técnicas em modo Aplicação prática", w: ["Apenas 2 técnicas estáticas", "Kihon apenas para crianças", "10 socos idênticos"], t: "Kihon" },
          { q: "Qual formato de combate livre múltiplo avançado é testado na Faixa Marrom (1º Kyu)?", c: "Jiyu Kumite contra 1, 2 e 4 oponentes", w: ["Apenas luta com regras de ponto único", "Combate individual de 1 minuto", "Não há luta"], t: "Kumite" },
          { q: "Quais formas de Jiyu Ippon Kumite devem ser dominadas no exame de 1º Kyu?", c: "1ª à 4ª Forma com tempo de reação e contra-ataque decisivo", w: ["Apenas a 1ª forma de ataque", "Apenas defesa sem contra-golpe", "Gohon Kumite básico"], t: "Kumite" },
          { q: "Qual postura linear e lateral é mantida ao longo de todo o Kata Tekki Shodan?", c: "Kiba Dachi", w: ["Zenkutsu Dachi", "Kokutsu Dachi", "Fudo Dachi"], t: "Bases" }
        ],
        0: [
          { q: "Qual é o significado original do termo 'SHODAN' na faixa preta?", c: "Primeiro degrau / O verdadeiro início do aprendizado", w: ["Grau supremo e término de todo estudo", "Mestre absoluto invencível", "Instrutor de elite aposentado"], t: "Filosofia" },
          { q: "Quais Katas superiores compõem os Sentei Katas do estilo Shotokan?", c: "Kanku Dai, Jion, Enpi e Hangetsu", w: ["Heian Shodan, Nidan e Sandan", "Gojushiho Dai e Sho", "Unsu e Meikyo"], t: "Kata" },
          { q: "Como se define a harmonia marcial da tríade SHIN-GI-TAI?", c: "Mente/Coração (Shin), Técnica (Gi) e Condição Física/Corpo (Tai)", w: ["Soco, Chute e Defesa", "Árbitro, Atleta e Técnico", "Força, Peso e Altura"], t: "Filosofia" },
          { q: "Quais são os critérios exigidos pelas regras da WKF para validação de um IPPON?", c: "Boa forma, atitude esportiva, vigor, Zanshin, tempo e distância corretos", w: ["Apenas força muscular máxima atingindo o oponente", "Queda forçada sem controle técnico", "Qualquer golpe que derrube o adversário"], t: "Regulamento" },
          { q: "O que significa alcançar a atitude mental de MUSHIN no Karatê?", c: "Mente vazia de pensamentos dispersos, atenta e fluida em estado presente", w: ["Agressividade descontrolada em combate", "Dúvida e hesitação antes de atacar", "Apego à vitória a qualquer custo"], t: "Filosofia" }
        ],
        "-1": [
          { q: "Qual é o papel e a maturidade técnica exigida de um Sensei Nidan (2º Dan)?", c: "Aprofundamento técnico, liderança marcial e refinamento pedagógico", w: ["Apenas treinar sem responsabilidade no Dojô", "Desconsiderar os fundamentos do estilo", "Prática exclusiva de luta esportiva"], t: "Liderança" },
          { q: "Quais Katas superiores compõem o aprofundamento oficial do 2º Dan?", c: "Jitte, Gankaku e Sochin", w: ["Heian Shodan e Heian Nidan", "Tekki Shodan e Bassai Dai", "Taikyoku Shodan"], t: "Kata" },
          { q: "Qual é a postura em uma só perna (Tsuruashi Dachi) destacada no Kata Gankaku?", c: "Base da Garça sobre a Rocha para equilíbrio e contra-ataque rápido", w: ["Base sentada no solo para defesa de pernas", "Postura deitada para rolamento marcial", "Base do cavaleiro aberta"], t: "Bases" },
          { q: "Como o Sensei Nidan deve conduzir a pedagogia motora de novos faixas pretas?", c: "Com clareza nos detalhes biomecânicos, respeito mútuo e exemplo prático", w: ["Com punições físicas e sem explicações", "Exigindo apenas força bruta sem postura", "Delegando todas as aulas a iniciantes"], t: "Pedagogia" },
          { q: "Qual o objetivo da base Fudo Dachi (Sochin Dachi) na execução potente do Kata Sochin?", c: "Estabilidade inabalável combinando a firmeza do Kiba Dachi com o avanço do Zenkutsu", w: ["Salto em altura com pernas recolhidas", "Recuo evasivo com 90% do peso atrás", "Base de repouso sem flexão de joelhos"], t: "Bases" }
        ],
        "-2": [
          { q: "Qual a responsabilidade de liderança do Sensei Sandan (3º Dan) na formação marcial?", c: "Formação de instrutores, preservação dos valores do Budo e visão ética do Dojô", w: ["Apenas competir em torneios locais", "Não participar mais de bancas de exame", "Focar apenas em aspectos comerciais"], t: "Liderança" },
          { q: "Quais Katas mestres de alto grau são tradicionalmente estudados no nível Sandan?", c: "Nijushiho, Meikyo, Chinte e Gojushiho", w: ["Heian Shodan, Nidan e Sandan", "Tekki Shodan", "Bassai Dai"], t: "Kata" },
          { q: "Como o princípio ancestral do 'Shuhari' descreve a evolução marcial?", c: "Shu (Obedecer às regras), Ha (Romper/Compreender) e Ri (Transcender e criar)", w: ["Começar, Parar e Desistir", "Ataque, Defesa e Contra-ataque", "Infantil, Juvenil e Adulto"], t: "Filosofia" },
          { q: "O que preceitua a filosofia Budo a respeito da 'Vitória sobre o próprio ego' (Katsu Hayabi)?", c: "A verdadeira maestria consiste em vencer a si mesmo antes de vencer qualquer outro", w: ["Derrotar todos os adversários publicamente", "Acumular troféus e medalhas de ouro", "Provar superioridade sobre outros estilos"], t: "Filosofia" },
          { q: "Quais as peculiaridades do Kata Unsu ('Nuvens Dispersas') no Karatê Shotokan?", c: "Complexidade dinâmica com variação rápida de ritmo, defesas circulares e salto aéreo de 360°", w: ["Apenas movimentos lentos em linha reta", "Execução sentada sem deslocamento", "Kata exclusivo com armas tradicionais"], t: "Kata" }
        ]
      };

      if (CURATED_BY_KYU[kyuKey]) {
        CURATED_BY_KYU[kyuKey].forEach(item => {
          generatedCandidates.push({
            question: item.q,
            correctAnswer: item.c,
            wrongAnswers: item.w,
            topic: item.t,
            beltName: beltName
          });
        });
      }

      // Embaralha todas as opções candidatas originadas do plano de estudos
      const shuffledCandidates = [...generatedCandidates].sort(() => 0.5 - Math.random());
      const selectedBatch = [];

      for (const item of shuffledCandidates) {
        const normKey = normalizeQuestionKey(item.question);
        if (!existingSet.has(normKey)) {
          existingSet.add(normKey);
          window._tkstSuggestedHistory.push(normKey);
          selectedBatch.push({
            id: `batch_${Date.now()}_${selectedBatch.length}`,
            question: item.question,
            correctAnswer: item.correctAnswer,
            wrongAnswers: item.wrongAnswers,
            topic: item.topic || "Plano de Estudos",
            beltName: item.beltName || beltName,
            toString: function() { return this.question; },
            valueOf: function() { return this.question; }
          });
          if (selectedBatch.length >= count) break;
        }
      }

      // Fallback garantido se o banco já tiver quase todas
      while (selectedBatch.length < count && generatedCandidates.length > 0) {
        const fallbackItem = generatedCandidates[Math.floor(Math.random() * generatedCandidates.length)];
        selectedBatch.push({
          id: `batch_${Date.now()}_${selectedBatch.length}`,
          question: fallbackItem.question,
          correctAnswer: fallbackItem.correctAnswer,
          wrongAnswers: fallbackItem.wrongAnswers,
          topic: fallbackItem.topic || "Plano de Estudos",
          beltName: fallbackItem.beltName || beltName,
          toString: function() { return this.question; },
          valueOf: function() { return this.question; }
        });
      }

      try {
        sessionStorage.setItem('tkst_suggested_history', JSON.stringify(window._tkstSuggestedHistory.slice(-300)));
      } catch (e) {}

      return selectedBatch;
    },

    generateUniqueQuestionSuggestion: (kyu) => {
      if (window.TKST_SHOTOKAN_ENGINE && typeof window.TKST_SHOTOKAN_ENGINE.formulateQuestions === 'function') {
        try {
          const shotokan = window.TKST_SHOTOKAN_ENGINE.formulateQuestions(kyu, { count: 1, avoidExisting: true });
          if (shotokan && shotokan[0]) {
            return shotokan[0];
          }
        } catch (e) {
          console.warn('Nota ao formular sugestão com Shotokan Engine:', e);
        }
      }
      const batch = window.TKST_APP.generateBatchQuestionSuggestions(kyu, 1);
      return batch && batch[0] ? batch[0] : "Descreva a execução correta da técnica principal exigida nesta graduação:";
    },

    suggestQuizQuestion: (kyu, targetInputId = 'newQuizQuestionInput') => {
      const inputEl = document.getElementById(targetInputId);
      if (!inputEl) return;
      const suggested = window.TKST_APP.generateUniqueQuestionSuggestion(kyu);
      if (!suggested) {
        showToast('⚠️ Nenhuma sugestão disponível no momento.', 'warning');
        return;
      }

      const qText = typeof suggested === 'object' ? suggested.question : suggested;
      inputEl.value = qText;
      inputEl.focus();

      const isEdit = targetInputId.includes('edit');
      const cInput = document.getElementById(isEdit ? 'editQuizCorrectAnswerInput' : 'newQuizCorrectAnswerInput');
      const w1 = document.getElementById(isEdit ? 'editQuizWrong1Input' : 'newQuizWrong1Input');
      const w2 = document.getElementById(isEdit ? 'editQuizWrong2Input' : 'newQuizWrong2Input');
      const w3 = document.getElementById(isEdit ? 'editQuizWrong3Input' : 'newQuizWrong3Input');

      if (typeof suggested === 'object' && suggested.correctAnswer) {
        if (cInput && (!cInput.value.trim() || !isEdit)) {
          cInput.value = suggested.correctAnswer;
        }
        if (suggested.wrongAnswers && suggested.wrongAnswers.length >= 3) {
          if (w1 && (!w1.value.trim() || !isEdit)) w1.value = suggested.wrongAnswers[0] || '';
          if (w2 && (!w2.value.trim() || !isEdit)) w2.value = suggested.wrongAnswers[1] || '';
          if (w3 && (!w3.value.trim() || !isEdit)) w3.value = suggested.wrongAnswers[2] || '';
        }
      }

      const beltName = (typeof suggested === 'object' && suggested.beltName) ? suggested.beltName : getBeltNameFromKyu(kyu);
      showToast(`📖 Pergunta e gabarito pesquisados no Plano de Estudos da ${beltName}!`, 'success', 3500);
    },

    openAddQuizQuestionWithSuggestion: (kyu) => {
      const suggested = window.TKST_APP.generateUniqueQuestionSuggestion(kyu);
      window.TKST_APP.openAddQuizQuestionModal(kyu, suggested);
      const beltName = (typeof suggested === 'object' && suggested.beltName) ? suggested.beltName : getBeltNameFromKyu(kyu);
      showToast(`💡 Pergunta e alternativas pesquisadas no Plano de Estudos da ${beltName}!`, 'info', 3500);
    },

    openBatchSuggestQuestionsModal: (kyu) => {
      const modal = document.getElementById('detailModal');
      const modalTitle = document.getElementById('detailModalTitle');
      const modalBody = document.getElementById('detailModalBody');
      if (!modal || !modalTitle || !modalBody) return;

      const beltName = getBeltNameFromKyu(kyu);
      const batch = window.TKST_APP.generateBatchQuestionSuggestions(kyu, 5);
      window._currentBatchSuggestions = batch;

      modalTitle.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 8px;">
          <span><i class="fas fa-layer-group" style="color: var(--accent-gold);"></i> Sugestão em Lote (5 Questões • ${beltName})</span>
          <span class="badge badge-gold" style="font-size: 0.70rem; font-weight: 700; white-space: nowrap;"><i class="fas fa-book-reader"></i> Plano de Estudos</span>
        </div>
      `;

      modalBody.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 14px;">
          <!-- Top Banner com ações -->
          <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,183,3,0.08); border: 1px solid rgba(255,183,3,0.3); border-radius: var(--radius-sm); padding: 10px 14px; flex-wrap: wrap; gap: 8px;">
            <div style="font-size: 0.82rem; color: #E2E8F0; flex: 1; min-width: 220px;">
              <i class="fas fa-magic" style="color: var(--accent-gold); margin-right: 6px;"></i>
              <strong>5 questões completas</strong> pesquisadas automaticamente no Plano de Estudos oficial de <strong>${beltName}</strong> com resposta correta e 3 erradas.
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
              <button type="button" class="btn btn-sm btn-secondary" onclick="window.TKST_APP.autoFillAllBatchWrongOptions()" style="font-size: 0.74rem; padding: 5px 11px; font-weight: 700; background: rgba(230, 57, 70, 0.18); border: 1px solid rgba(230, 57, 70, 0.45); color: #FECACA; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; border-radius: 4px;" title="Auto-sugerir alternativas incorretas para as 5 questões de uma só vez">
                <i class="fas fa-magic" style="color: #F87171;"></i> Auto-sugerir Todas Erradas (5)
              </button>
              <button type="button" class="btn btn-secondary btn-sm" onclick="window.TKST_APP.regenerateBatchSuggestions(${kyu})" style="font-size: 0.74rem; padding: 5px 11px; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; border-radius: 4px;" title="Gerar outro conjunto de 5 questões">
                <i class="fas fa-sync-alt"></i> Gerar Outro Lote
              </button>
            </div>
          </div>

          <!-- Cards das 5 Perguntas -->
          <div style="display: flex; flex-direction: column; gap: 12px; max-height: 480px; overflow-y: auto; padding-right: 4px;">
            ${batch.map((q, idx) => `
              <div class="batch-question-card" style="background: rgba(22, 28, 42, 0.85); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: var(--radius-sm); padding: 12px; display: flex; flex-direction: column; gap: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px;">
                  <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; margin-bottom: 0;">
                    <input type="checkbox" id="batchCheck_${idx}" checked onchange="window.TKST_APP.updateBatchSelectedCount()" style="width: 16px; height: 16px; accent-color: var(--accent-gold); cursor: pointer;">
                    <strong style="color: #FFF; font-size: 0.86rem;">Questão #${idx + 1}</strong>
                  </label>
                  <span id="batchTopic_${idx}" class="badge" style="background: rgba(255,183,3,0.14); border: 1px solid rgba(255,183,3,0.35); color: var(--accent-gold); font-size: 0.68rem; font-weight: 700;">
                    ${q.topic || 'Plano de Estudos'}
                  </span>
                </div>

                <!-- Enunciado -->
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; gap: 6px;">
                    <label style="font-size: 0.74rem; font-weight: 700; color: #CBD5E1; display: flex; align-items: center; gap: 6px; margin-bottom: 0;">
                      <i class="fas fa-question-circle" style="color: var(--accent-gold);"></i> Pergunta / Enunciado:
                    </label>
                    <button type="button" class="btn btn-sm btn-secondary" onclick="window.TKST_APP.suggestBatchSingleQuestion(${idx}, ${kyu})" style="font-size: 0.70rem; padding: 2px 8px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px; cursor: pointer; border-radius: 4px; background: rgba(255, 183, 3, 0.15); border: 1px solid rgba(255, 183, 3, 0.4); color: var(--accent-gold);" title="Sugerir outra pergunta e alternativas do Plano de Estudos para esta questão">
                      <i class="fas fa-lightbulb"></i> Auto-sugerir Pergunta
                    </button>
                  </div>
                  <textarea id="batchQ_${idx}" class="form-input" rows="2" style="font-size: 0.86rem; font-weight: 600; width: 100%; resize: vertical;" required>${escapeHtml(q.question)}</textarea>
                </div>

                <!-- Resposta Correta (Gabarito) -->
                <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: var(--radius-sm); padding: 8px 10px;">
                  <label style="font-size: 0.74rem; font-weight: 700; color: #6EE7B7; display: flex; align-items: center; gap: 6px; margin-bottom: 3px;">
                    <i class="fas fa-check-circle" style="color: var(--accent-emerald);"></i> Resposta Correta (Gabarito Oficial):
                  </label>
                  <input type="text" id="batchCorrect_${idx}" class="form-input" value="${escapeHtml(q.correctAnswer)}" required style="font-size: 0.84rem; font-weight: 600; color: #FFF; background: rgba(0,0,0,0.4); border-color: rgba(16, 185, 129, 0.4);">
                </div>

                <!-- 3 Alternativas Erradas -->
                <div style="background: rgba(230, 57, 70, 0.05); border: 1px solid rgba(230, 57, 70, 0.22); border-radius: var(--radius-sm); padding: 8px 10px; display: flex; flex-direction: column; gap: 6px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; gap: 6px;">
                    <label style="font-size: 0.74rem; font-weight: 700; color: #FCA5A5; display: flex; align-items: center; gap: 6px; margin-bottom: 0;">
                      <i class="fas fa-times-circle" style="color: var(--accent-crimson);"></i> 3 Alternativas Incorretas (Distratores):
                    </label>
                    <button type="button" class="btn btn-sm btn-secondary" onclick="window.TKST_APP.autoFillBatchWrongOptions(${idx})" style="font-size: 0.70rem; padding: 2px 8px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px; cursor: pointer; border-radius: 4px; background: rgba(230, 57, 70, 0.18); border: 1px solid rgba(230, 57, 70, 0.4); color: #FECACA;" title="Auto-sugerir 3 alternativas erradas para esta questão">
                      <i class="fas fa-magic" style="color: #F87171;"></i> Auto-sugerir
                    </button>
                  </div>
                  <input type="text" id="batchWrong1_${idx}" class="form-input" value="${escapeHtml(q.wrongAnswers[0] || '')}" placeholder="Alternativa errada 1..." style="font-size: 0.80rem; background: rgba(0,0,0,0.35);">
                  <input type="text" id="batchWrong2_${idx}" class="form-input" value="${escapeHtml(q.wrongAnswers[1] || '')}" placeholder="Alternativa errada 2..." style="font-size: 0.80rem; background: rgba(0,0,0,0.35);">
                  <input type="text" id="batchWrong3_${idx}" class="form-input" value="${escapeHtml(q.wrongAnswers[2] || '')}" placeholder="Alternativa errada 3..." style="font-size: 0.80rem; background: rgba(0,0,0,0.35);">
                </div>
              </div>
            `).join('')}
          </div>

          <!-- Rodapé com Ações -->
          <div style="display: flex; gap: 10px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px; flex-wrap: wrap;">
            <button type="button" class="btn btn-secondary" onclick="window.TKST_APP.closeModal()" style="padding: 10px 16px;">
              Cancelar
            </button>
            <button type="button" class="btn btn-secondary" onclick="window.TKST_APP.autoFillAllBatchWrongOptions()" style="padding: 10px 14px; font-weight: 700; font-size: 0.82rem; background: rgba(230, 57, 70, 0.18); border: 1px solid rgba(230, 57, 70, 0.45); color: #FECACA; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; border-radius: 4px;" title="Auto-sugerir alternativas incorretas para as 5 questões de uma só vez">
              <i class="fas fa-magic" style="color: #F87171;"></i> Auto-sugerir 5 Erradas
            </button>
            <button type="button" class="btn btn-primary" onclick="window.TKST_APP.saveBatchQuestionsToBank(${kyu})" style="flex: 1; min-width: 200px; padding: 10px 20px; font-weight: 800; font-size: 0.90rem; display: flex; align-items: center; justify-content: center; gap: 8px;">
              <i class="fas fa-check-double"></i> Aprovar e Adicionar (<span id="batchCountBadge">5</span>) ao Simulado
            </button>
          </div>
        </div>
      `;

      modal.classList.add('active');
    },

    regenerateBatchSuggestions: (kyu) => {
      window.TKST_APP.openBatchSuggestQuestionsModal(kyu);
      showToast('🔄 Novo lote de 5 questões pesquisado no Plano de Estudos!', 'info', 2500);
    },

    suggestBatchSingleQuestion: (idx, kyu) => {
      const qInput = document.getElementById(`batchQ_${idx}`);
      const cInput = document.getElementById(`batchCorrect_${idx}`);
      const w1 = document.getElementById(`batchWrong1_${idx}`);
      const w2 = document.getElementById(`batchWrong2_${idx}`);
      const w3 = document.getElementById(`batchWrong3_${idx}`);
      const topicEl = document.getElementById(`batchTopic_${idx}`);

      const suggested = window.TKST_APP.generateUniqueQuestionSuggestion(kyu);
      if (!suggested) {
        showToast('⚠️ Nenhuma sugestão disponível no momento.', 'warning');
        return;
      }

      const qText = typeof suggested === 'object' ? suggested.question : suggested;
      const cText = typeof suggested === 'object' ? (suggested.correctAnswer || '') : '';
      const wAnswers = (typeof suggested === 'object' && Array.isArray(suggested.wrongAnswers)) ? suggested.wrongAnswers : [];
      const topic = (typeof suggested === 'object' && suggested.topic) ? suggested.topic : 'Plano de Estudos';

      if (qInput) qInput.value = qText;
      if (cInput && cText) cInput.value = cText;
      if (w1 && wAnswers[0]) w1.value = wAnswers[0];
      if (w2 && wAnswers[1]) w2.value = wAnswers[1];
      if (w3 && wAnswers[2]) w3.value = wAnswers[2];
      if (topicEl) topicEl.textContent = topic;

      [qInput, cInput, w1, w2, w3].forEach(el => {
        if (el) {
          el.style.transition = 'all 0.3s ease';
          const origBg = el.style.background;
          el.style.background = 'rgba(255, 183, 3, 0.22)';
          el.style.borderColor = 'rgba(255, 183, 3, 0.7)';
          setTimeout(() => {
            el.style.background = origBg || '';
            el.style.borderColor = '';
          }, 700);
        }
      });

      showToast(`💡 Pergunta e alternativas da Questão #${idx + 1} pesquisadas no Plano de Estudos!`, 'success', 3000);
    },

    autoFillBatchWrongOptions: (idx) => {
      const qInput = document.getElementById(`batchQ_${idx}`);
      const cInput = document.getElementById(`batchCorrect_${idx}`);
      const w1 = document.getElementById(`batchWrong1_${idx}`);
      const w2 = document.getElementById(`batchWrong2_${idx}`);
      const w3 = document.getElementById(`batchWrong3_${idx}`);

      if (!cInput) return false;
      const qText = qInput ? qInput.value.trim() : '';
      const cText = cInput.value.trim();
      if (!cText) {
        showToast(`⚠️ Digite a resposta correta da Questão #${idx + 1} primeiro para auto-sugerir alternativas do mesmo tipo!`, 'warning', 3500);
        cInput.focus();
        return false;
      }

      const smart = generateSmartOptions(qText, cText);
      const fallback = (smart.options || []).filter(o => o.trim().toLowerCase() !== cText.toLowerCase());

      if (w1 && fallback[0]) w1.value = fallback[0];
      if (w2 && fallback[1]) w2.value = fallback[1];
      if (w3 && fallback[2]) w3.value = fallback[2];

      [w1, w2, w3].forEach(el => {
        if (el) {
          el.style.transition = 'all 0.3s ease';
          const origBg = el.style.background;
          el.style.background = 'rgba(230, 57, 70, 0.28)';
          el.style.borderColor = 'rgba(230, 57, 70, 0.7)';
          setTimeout(() => {
            el.style.background = origBg || 'rgba(0,0,0,0.35)';
            el.style.borderColor = '';
          }, 700);
        }
      });

      const category = detectKarateCategory(qText, cText);
      const catLabels = {
        defesas: 'Defesas',
        socos: 'Socos e Ataques',
        chutes: 'Chutes',
        bases: 'Bases',
        katas: 'Katas',
        kumite: 'Kumite',
        alturas: 'Alturas/Níveis',
        armas: 'Armas Corporais',
        comandos: 'Comandos do Dojô',
        frases: 'Frases de tamanho similar'
      };
      const label = (category && catLabels[category]) || 'Itens equivalentes';
      showToast(`✨ 3 alternativas erradas geradas para a Questão #${idx + 1} (${label})!`, 'success', 3000);
      return true;
    },

    autoFillAllBatchWrongOptions: () => {
      const checkboxes = document.querySelectorAll('[id^="batchCheck_"]');
      const totalCards = checkboxes.length || 5;
      let filledCount = 0;
      let missingCorrectCount = 0;

      for (let idx = 0; idx < totalCards; idx++) {
        const qInput = document.getElementById(`batchQ_${idx}`);
        const cInput = document.getElementById(`batchCorrect_${idx}`);
        const w1 = document.getElementById(`batchWrong1_${idx}`);
        const w2 = document.getElementById(`batchWrong2_${idx}`);
        const w3 = document.getElementById(`batchWrong3_${idx}`);

        if (!cInput || !qInput) continue;
        const qText = qInput.value.trim();
        const cText = cInput.value.trim();

        if (!cText) {
          missingCorrectCount++;
          continue;
        }

        const smart = generateSmartOptions(qText, cText);
        const fallback = (smart.options || []).filter(o => o.trim().toLowerCase() !== cText.toLowerCase());

        if (w1 && fallback[0]) w1.value = fallback[0];
        if (w2 && fallback[1]) w2.value = fallback[1];
        if (w3 && fallback[2]) w3.value = fallback[2];

        [w1, w2, w3].forEach(el => {
          if (el) {
            el.style.transition = 'all 0.3s ease';
            const origBg = el.style.background;
            el.style.background = 'rgba(230, 57, 70, 0.28)';
            el.style.borderColor = 'rgba(230, 57, 70, 0.7)';
            setTimeout(() => {
              el.style.background = origBg || 'rgba(0,0,0,0.35)';
              el.style.borderColor = '';
            }, 700);
          }
        });

        filledCount++;
      }

      if (filledCount > 0) {
        showToast(`✨ Alternativas erradas auto-sugeridas para todas as ${filledCount} questões!`, 'success', 3500);
      } else if (missingCorrectCount > 0) {
        showToast('⚠️ Preencha a resposta correta das questões antes de auto-sugerir as alternativas erradas!', 'warning', 3500);
      }
    },

    updateBatchSelectedCount: () => {
      const checkboxes = document.querySelectorAll('[id^="batchCheck_"]');
      let count = 0;
      checkboxes.forEach(cb => { if (cb.checked) count++; });
      const badge = document.getElementById('batchCountBadge');
      if (badge) badge.textContent = count;
    },

    saveBatchQuestionsToBank: (kyu) => {
      const checkboxes = document.querySelectorAll('[id^="batchCheck_"]');
      const itemsToSave = [];
      const beltName = getBeltNameFromKyu(kyu);

      checkboxes.forEach((cb, idx) => {
        if (!cb.checked) return;
        const qInput = document.getElementById(`batchQ_${idx}`);
        const cInput = document.getElementById(`batchCorrect_${idx}`);
        const w1Input = document.getElementById(`batchWrong1_${idx}`);
        const w2Input = document.getElementById(`batchWrong2_${idx}`);
        const w3Input = document.getElementById(`batchWrong3_${idx}`);

        const questionText = qInput ? qInput.value.trim() : '';
        const correctAnswer = cInput ? cInput.value.trim() : '';
        let wrong1 = w1Input ? w1Input.value.trim() : '';
        let wrong2 = w2Input ? w2Input.value.trim() : '';
        let wrong3 = w3Input ? w3Input.value.trim() : '';

        if (!questionText || !correctAnswer) return;

        if (!wrong1 || !wrong2 || !wrong3) {
          const smart = generateSmartOptions(questionText, correctAnswer);
          const fallback = (smart.options || []).filter(o => o.trim().toLowerCase() !== correctAnswer.toLowerCase());
          if (!wrong1) wrong1 = fallback[0] || 'Opção B';
          if (!wrong2) wrong2 = fallback[1] || 'Opção C';
          if (!wrong3) wrong3 = fallback[2] || 'Opção D';
        }

        const numKyu = parseInt(kyu, 10);
        itemsToSave.push({
          id: `q_custom_${numKyu}_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
          kyuNumber: numKyu,
          kyu: numKyu,
          beltName: beltName,
          question: questionText,
          image: '',
          options: [correctAnswer, wrong1, wrong2, wrong3],
          correctIndex: 0,
          _edited: true,
          updatedAt: Date.now()
        });
      });

      if (itemsToSave.length === 0) {
        showToast('⚠️ Selecione pelo menos uma questão para adicionar.', 'warning', 3500);
        return;
      }

      const bank = window.TKST_AUTH ? window.TKST_AUTH.getCustomQuizBank() : (window.TKST_QUIZ_BANK || []);
      itemsToSave.forEach(item => bank.push(item));

      if (window.TKST_AUTH && window.TKST_AUTH.saveCustomQuizBank) {
        window.TKST_AUTH.saveCustomQuizBank(bank);
      }

      const modal = document.getElementById('detailModal');
      if (modal) modal.classList.remove('active');

      showToast(`🎉 ${itemsToSave.length} questões do Plano de Estudos adicionadas ao simulado da ${beltName}! Sincronizando...`, 'sync', 4500);
      renderAdminMaster();
    },

    openShotokanStudyModal: (kyu) => {
      const modal = document.getElementById('detailModal');
      const modalTitle = document.getElementById('detailModalTitle');
      const modalBody = document.getElementById('detailModalBody');
      if (!modal || !modalTitle || !modalBody) return;

      const beltName = getBeltNameFromKyu(kyu);
      
      let initialQuestions = [];
      if (window.TKST_SHOTOKAN_ENGINE && typeof window.TKST_SHOTOKAN_ENGINE.formulateQuestions === 'function') {
        initialQuestions = window.TKST_SHOTOKAN_ENGINE.formulateQuestions(kyu, { count: 5, category: 'todos' });
      }
      window._currentShotokanQuestions = initialQuestions;

      modalTitle.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 8px;">
          <span style="display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-brain" style="color: var(--accent-gold); font-size: 1.15rem;"></i>
            <strong>Plano de Estudos & Estudo Shotokan (${beltName})</strong>
          </span>
          <span class="badge badge-gold" style="font-size: 0.70rem; font-weight: 800; white-space: nowrap;">
            <i class="fas fa-user-shield"></i> Exclusivo Sensei / Admin
          </span>
        </div>
      `;

      modalBody.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 14px;">
          <!-- Painel Superior de Configuração do Estudo -->
          <div style="background: linear-gradient(135deg, rgba(245, 190, 0, 0.12) 0%, rgba(20, 25, 38, 0.95) 100%); border: 1px solid rgba(245, 190, 0, 0.35); border-radius: var(--radius-sm); padding: 12px 14px; display: flex; flex-direction: column; gap: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
              <div style="font-size: 0.84rem; color: #F8FAFC;">
                <i class="fas fa-book-reader" style="color: var(--accent-gold); margin-right: 6px;"></i>
                <strong>Graduação Reconhecida (${beltName}):</strong> O gerador pesquisa diretamente o <strong>Plano de Estudos Oficial</strong> da graduação (Katas exigidos, Kumite, Kihon e bases) combinado ao <strong>Estudo Geral Shotokan</strong>. As perguntas e respostas são <strong>curtas e objetivas</strong> (1 a 5 palavras) sem repetições no simulado.
              </div>
            </div>

            <!-- Controles de Foco e Quantidade -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; align-items: end;">
              <div>
                <label style="font-size: 0.75rem; font-weight: 700; color: #CBD5E1; display: block; margin-bottom: 4px;">
                  <i class="fas fa-filter" style="color: var(--accent-gold);"></i> Área Técnica de Foco:
                </label>
                <select id="shotokanCategorySelect" class="form-input" style="font-size: 0.82rem; padding: 6px 10px; background: rgba(11, 14, 20, 0.85); color: #FFF; border: 1px solid rgba(255, 183, 3, 0.4); width: 100%;">
                  <option value="todos">🌐 Estudo Completo (Todas as Áreas)</option>
                  <option value="bases">📐 Bases (Dachi Waza) & Distribuição de Peso</option>
                  <option value="defesas">🛡️ Defesas (Uke Waza) & Alturas</option>
                  <option value="socos">👊 Socos (Tsuki) & Golpes de Punho (Uchi)</option>
                  <option value="chutes">🦵 Chutes (Geri Waza) & Armas dos Pés</option>
                  <option value="katas">📜 Katas Oficiais Shotokan (Passos & Kiais)</option>
                  <option value="kumite">🥊 Kumite (Passos & Regras WKF)</option>
                  <option value="filosofia">⛩️ Filosofia, Dojô Kun & Mestre Funakoshi</option>
                  <option value="terminologia">🈳 Terminologia & Níveis (Jodan/Chudan/Gedan)</option>
                </select>
              </div>

              <div>
                <label style="font-size: 0.75rem; font-weight: 700; color: #CBD5E1; display: block; margin-bottom: 4px;">
                  <i class="fas fa-list-ol" style="color: var(--accent-gold);"></i> Quantidade de Questões:
                </label>
                <select id="shotokanCountSelect" class="form-input" style="font-size: 0.82rem; padding: 6px 10px; background: rgba(11, 14, 20, 0.85); color: #FFF; border: 1px solid rgba(255, 183, 3, 0.4); width: 100%;">
                  <option value="5" selected>5 Questões (Rápido)</option>
                  <option value="10">10 Questões (Exame Completo)</option>
                  <option value="15">15 Questões (Simulado Rico)</option>
                  <option value="20">20 Questões (Banco Aprofundado)</option>
                </select>
              </div>

              <div>
                <button type="button" class="btn btn-gold" onclick="window.TKST_APP.runShotokanFormulation(${kyu})" style="width: 100%; font-size: 0.82rem; padding: 8px 12px; font-weight: 800; color: #000; box-shadow: 0 4px 12px rgba(245, 190, 0, 0.3); display: flex; align-items: center; justify-content: center; gap: 6px;">
                  <i class="fas fa-bolt"></i> Estudar & Formular Questões
                </button>
              </div>
            </div>
          </div>

          <!-- Container das Perguntas Formuladas -->
          <div id="shotokanQuestionsContainer" style="display: flex; flex-direction: column; gap: 12px; max-height: 480px; overflow-y: auto; padding-right: 4px;">
            ${window.TKST_APP.renderShotokanQuestionCards(initialQuestions, kyu)}
          </div>

          <!-- Rodapé com Ações -->
          <div style="display: flex; gap: 10px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px; flex-wrap: wrap;">
            <button type="button" class="btn btn-secondary" onclick="window.TKST_APP.closeModal()" style="padding: 10px 16px;">
              Cancelar
            </button>
            <button type="button" class="btn btn-secondary" onclick="window.TKST_APP.runShotokanFormulation(${kyu})" style="padding: 10px 14px; font-weight: 700; font-size: 0.82rem; background: rgba(255, 183, 3, 0.12); border: 1px solid var(--accent-gold); color: var(--accent-gold); display: inline-flex; align-items: center; gap: 6px; cursor: pointer; border-radius: 4px;">
              <i class="fas fa-sync-alt"></i> Formular Outras Questões
            </button>
            <button type="button" class="btn btn-primary" onclick="window.TKST_APP.saveShotokanQuestionsToBank(${kyu})" style="flex: 1; min-width: 220px; padding: 10px 20px; font-weight: 800; font-size: 0.90rem; display: flex; align-items: center; justify-content: center; gap: 8px; background: linear-gradient(135deg, #10B981 0%, #059669 100%); border: none;">
              <i class="fas fa-check-double"></i> Aprovar e Adicionar (<span id="shotokanCountBadge">${initialQuestions.length}</span>) ao Simulado
            </button>
          </div>
        </div>
      `;

      modal.classList.add('active');
    },

    renderShotokanQuestionCards: (questions, kyu) => {
      if (!questions || questions.length === 0) {
        return `
          <div style="padding: 30px; text-align: center; color: #94A3B8; background: rgba(0,0,0,0.25); border-radius: var(--radius-sm);">
            <i class="fas fa-info-circle" style="font-size: 2rem; color: var(--accent-gold); margin-bottom: 8px; display: block;"></i>
            Nenhuma questão gerada com os filtros atuais. Selecione outra área ou clique em 'Estudar & Formular Questões'.
          </div>
        `;
      }

      return questions.map((q, idx) => `
        <div class="shotokan-question-card" style="background: rgba(22, 28, 42, 0.9); border: 1px solid rgba(255, 255, 255, 0.12); border-left: 4px solid var(--accent-gold); border-radius: var(--radius-sm); padding: 12px; display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px;">
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; margin-bottom: 0;">
              <input type="checkbox" id="shotokanCheck_${idx}" checked onchange="window.TKST_APP.updateShotokanSelectedCount()" style="width: 16px; height: 16px; accent-color: var(--accent-gold); cursor: pointer;">
              <strong style="color: #FFF; font-size: 0.88rem;">Questão Shotokan #${idx + 1}</strong>
            </label>
            <div style="display: flex; gap: 6px; align-items: center;">
              <span id="shotokanTopic_${idx}" class="badge" style="background: rgba(255,183,3,0.15); border: 1px solid rgba(255,183,3,0.4); color: var(--accent-gold); font-size: 0.70rem; font-weight: 700;">
                ${q.topic || 'Shotokan'}
              </span>
              <button type="button" class="btn btn-sm btn-secondary" onclick="window.TKST_APP.reformulateSingleShotokanQuestion(${idx}, ${kyu})" style="font-size: 0.68rem; padding: 2px 7px; color: #CBD5E1; background: rgba(255,255,255,0.08);" title="Gerar outra pergunta para este card">
                <i class="fas fa-random"></i> Trocar
              </button>
            </div>
          </div>

          <!-- Enunciado -->
          <div>
            <label style="font-size: 0.74rem; font-weight: 700; color: #CBD5E1; display: flex; align-items: center; gap: 6px; margin-bottom: 3px;">
              <i class="fas fa-question-circle" style="color: var(--accent-gold);"></i> Pergunta formulada (Direta):
            </label>
            <textarea id="shotokanQ_${idx}" class="form-input" rows="2" style="font-size: 0.86rem; font-weight: 600; width: 100%; resize: vertical; line-height: 1.4;" required>${escapeHtml(q.question)}</textarea>
          </div>

          <!-- Resposta Correta (Curta e Objetiva) -->
          <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.35); border-radius: var(--radius-sm); padding: 8px 10px;">
            <label style="font-size: 0.74rem; font-weight: 700; color: #6EE7B7; display: flex; align-items: center; gap: 6px; margin-bottom: 3px;">
              <i class="fas fa-check-circle" style="color: var(--accent-emerald);"></i> Resposta Correta (Curta e Objetiva):
            </label>
            <input type="text" id="shotokanCorrect_${idx}" class="form-input" value="${escapeHtml(q.correctAnswer)}" required style="font-size: 0.84rem; font-weight: 600; color: #FFF; background: rgba(0,0,0,0.45); border-color: rgba(16, 185, 129, 0.45); width: 100%;">
          </div>

          <!-- 3 Alternativas Incorretas (Curtas) -->
          <div style="background: rgba(230, 57, 70, 0.05); border: 1px solid rgba(230, 57, 70, 0.25); border-radius: var(--radius-sm); padding: 8px 10px; display: flex; flex-direction: column; gap: 6px;">
            <label style="font-size: 0.74rem; font-weight: 700; color: #FCA5A5; display: flex; align-items: center; gap: 6px; margin-bottom: 0;">
              <i class="fas fa-times-circle" style="color: var(--accent-crimson);"></i> 3 Alternativas Incorretas (Curtas):
            </label>
            <input type="text" id="shotokanWrong1_${idx}" class="form-input" value="${escapeHtml(q.wrongAnswers?.[0] || '')}" placeholder="Alternativa errada 1..." style="font-size: 0.80rem; background: rgba(0,0,0,0.35); width: 100%;">
            <input type="text" id="shotokanWrong2_${idx}" class="form-input" value="${escapeHtml(q.wrongAnswers?.[1] || '')}" placeholder="Alternativa errada 2..." style="font-size: 0.80rem; background: rgba(0,0,0,0.35); width: 100%;">
            <input type="text" id="shotokanWrong3_${idx}" class="form-input" value="${escapeHtml(q.wrongAnswers?.[2] || '')}" placeholder="Alternativa errada 3..." style="font-size: 0.80rem; background: rgba(0,0,0,0.35); width: 100%;">
          </div>
        </div>
      `).join('');
    },

    runShotokanFormulation: (kyu) => {
      const catSelect = document.getElementById('shotokanCategorySelect');
      const countSelect = document.getElementById('shotokanCountSelect');
      const category = catSelect ? catSelect.value : 'todos';
      const count = countSelect ? parseInt(countSelect.value, 10) : 5;

      let questions = [];
      if (window.TKST_SHOTOKAN_ENGINE && typeof window.TKST_SHOTOKAN_ENGINE.formulateQuestions === 'function') {
        questions = window.TKST_SHOTOKAN_ENGINE.formulateQuestions(kyu, { count, category });
      }
      window._currentShotokanQuestions = questions;

      const container = document.getElementById('shotokanQuestionsContainer');
      if (container) {
        container.innerHTML = window.TKST_APP.renderShotokanQuestionCards(questions, kyu);
      }
      window.TKST_APP.updateShotokanSelectedCount();
      showToast(`⚡ ${questions.length} questões com respostas curtas e objetivas formuladas para o simulado!`, 'success', 3000);
    },

    updateShotokanSelectedCount: () => {
      const checkboxes = document.querySelectorAll('[id^="shotokanCheck_"]');
      let count = 0;
      checkboxes.forEach(cb => { if (cb.checked) count++; });
      const badge = document.getElementById('shotokanCountBadge');
      if (badge) badge.textContent = count;
    },

    reformulateSingleShotokanQuestion: (idx, kyu) => {
      const catSelect = document.getElementById('shotokanCategorySelect');
      const category = catSelect ? catSelect.value : 'todos';

      // Coletar respostas e perguntas das outras perguntas abertas no modal para evitar repetições
      const excludeAnswers = [];
      const excludeQuestions = [];
      document.querySelectorAll('[id^="shotokanCorrect_"]').forEach(el => {
        if (el.id !== `shotokanCorrect_${idx}` && el.value && el.value.trim()) {
          excludeAnswers.push(el.value.trim());
        }
      });
      document.querySelectorAll('[id^="shotokanQ_"]').forEach(el => {
        if (el.value && el.value.trim()) {
          excludeQuestions.push(el.value.trim());
        }
      });

      let singleQ = null;
      if (window.TKST_SHOTOKAN_ENGINE && typeof window.TKST_SHOTOKAN_ENGINE.formulateQuestions === 'function') {
        const pool = window.TKST_SHOTOKAN_ENGINE.formulateQuestions(kyu, { count: 1, category, excludeAnswers, excludeQuestions });
        if (pool && pool[0]) singleQ = pool[0];
      }
      if (!singleQ) return;

      const qInput = document.getElementById(`shotokanQ_${idx}`);
      const cInput = document.getElementById(`shotokanCorrect_${idx}`);
      const w1 = document.getElementById(`shotokanWrong1_${idx}`);
      const w2 = document.getElementById(`shotokanWrong2_${idx}`);
      const w3 = document.getElementById(`shotokanWrong3_${idx}`);
      const topicEl = document.getElementById(`shotokanTopic_${idx}`);

      if (qInput) qInput.value = singleQ.question;
      if (cInput) cInput.value = singleQ.correctAnswer;
      if (w1 && singleQ.wrongAnswers?.[0]) w1.value = singleQ.wrongAnswers[0];
      if (w2 && singleQ.wrongAnswers?.[1]) w2.value = singleQ.wrongAnswers[1];
      if (w3 && singleQ.wrongAnswers?.[2]) w3.value = singleQ.wrongAnswers[2];
      if (topicEl) topicEl.textContent = singleQ.topic || 'Shotokan';

      [qInput, cInput, w1, w2, w3].forEach(el => {
        if (el) {
          el.style.transition = 'all 0.3s ease';
          const origBg = el.style.background;
          el.style.background = 'rgba(255, 183, 3, 0.22)';
          setTimeout(() => { el.style.background = origBg || ''; }, 600);
        }
      });
      showToast(`💡 Questão #${idx + 1} reformulada com nova técnica Shotokan!`, 'info', 2000);
    },

    saveShotokanQuestionsToBank: (kyu) => {
      const checkboxes = document.querySelectorAll('[id^="shotokanCheck_"]');
      const itemsToSave = [];
      const beltName = getBeltNameFromKyu(kyu);

      checkboxes.forEach((cb, idx) => {
        if (!cb.checked) return;
        const qInput = document.getElementById(`shotokanQ_${idx}`);
        const cInput = document.getElementById(`shotokanCorrect_${idx}`);
        const w1Input = document.getElementById(`shotokanWrong1_${idx}`);
        const w2Input = document.getElementById(`shotokanWrong2_${idx}`);
        const w3Input = document.getElementById(`shotokanWrong3_${idx}`);

        const questionText = qInput ? qInput.value.trim() : '';
        const correctAnswer = cInput ? cInput.value.trim() : '';
        let wrong1 = w1Input ? w1Input.value.trim() : '';
        let wrong2 = w2Input ? w2Input.value.trim() : '';
        let wrong3 = w3Input ? w3Input.value.trim() : '';

        if (!questionText || !correctAnswer) return;

        if (!wrong1 || !wrong2 || !wrong3) {
          const smart = generateSmartOptions(questionText, correctAnswer);
          const fallback = (smart.options || []).filter(o => o.trim().toLowerCase() !== correctAnswer.toLowerCase());
          if (!wrong1) wrong1 = fallback[0] || 'Opção B';
          if (!wrong2) wrong2 = fallback[1] || 'Opção C';
          if (!wrong3) wrong3 = fallback[2] || 'Opção D';
        }

        const numKyu = parseInt(kyu, 10);
        // Embaralha as alternativas para que a resposta correta não fique fixada sempre na opção A (índice 0)
        const rawOpts = [correctAnswer, wrong1, wrong2, wrong3];
        const shuffledOpts = [...rawOpts].sort(() => 0.5 - Math.random());
        const correctIndex = shuffledOpts.indexOf(correctAnswer);

        itemsToSave.push({
          id: `q_custom_shotokan_${numKyu}_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
          kyuNumber: numKyu,
          kyu: numKyu,
          beltName: beltName,
          question: questionText,
          image: '',
          options: shuffledOpts,
          correctIndex: correctIndex >= 0 ? correctIndex : 0,
          source: "Estudo Especialista de Karatê Shotokan (JKA/WKF)",
          _edited: true,
          updatedAt: Date.now()
        });
      });

      if (itemsToSave.length === 0) {
        showToast('⚠️ Selecione pelo menos uma questão para adicionar.', 'warning', 3500);
        return;
      }

      const bank = window.TKST_AUTH ? window.TKST_AUTH.getCustomQuizBank() : (window.TKST_QUIZ_BANK || []);
      itemsToSave.forEach(item => bank.push(item));

      if (window.TKST_AUTH && window.TKST_AUTH.saveCustomQuizBank) {
        window.TKST_AUTH.saveCustomQuizBank(bank);
      }

      const modal = document.getElementById('detailModal');
      if (modal) modal.classList.remove('active');

      showToast(`🥋 ${itemsToSave.length} questões técnicas de Karatê Shotokan salvas no simulado da ${beltName}! Sincronizando...`, 'sync', 4500);
      renderAdminMaster();
    },

    openAddQuizQuestionModal: (kyu, initialQuestion = '') => {
      quizModalTempImage = '';
      const modalTitle = document.getElementById('detailModalTitle');
      const modalBody = document.getElementById('detailModalBody');
      const beltName = getBeltNameFromKyu(kyu);

      const qText = typeof initialQuestion === 'object' ? (initialQuestion.question || '') : (initialQuestion || '');
      const cText = typeof initialQuestion === 'object' ? (initialQuestion.correctAnswer || '') : '';
      const w1Text = typeof initialQuestion === 'object' ? (initialQuestion.wrongAnswers?.[0] || '') : '';
      const w2Text = typeof initialQuestion === 'object' ? (initialQuestion.wrongAnswers?.[1] || '') : '';
      const w3Text = typeof initialQuestion === 'object' ? (initialQuestion.wrongAnswers?.[2] || '') : '';

      modalTitle.innerHTML = `<div style="display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 8px;"><span><i class="fas fa-plus-circle" style="color: var(--accent-gold);"></i> Nova Questão (${beltName})</span><span class="badge badge-gold" style="font-size: 0.7rem; font-weight: 600; white-space: nowrap;"><i class="fas fa-lock"></i> Edição Protegida</span></div>`;

      modalBody.innerHTML = `
        <form onsubmit="event.preventDefault(); window.TKST_APP.submitAddQuizQuestion(${kyu});" style="display: flex; flex-direction: column; gap: 12px;">
          <div style="background: rgba(255,183,3,0.08); border: 1px solid rgba(255,183,3,0.3); border-radius: var(--radius-sm); padding: 8px 12px; font-size: 0.80rem; color: #E2E8F0;">
            <i class="fas fa-shield-alt" style="color: var(--accent-gold); margin-right: 6px;"></i> <strong>Modo Seguro:</strong> Cadastre o enunciado, a resposta correta e as 3 respostas erradas.
          </div>

          <div class="form-group">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; flex-wrap: wrap; gap: 6px;">
              <label class="form-label" style="font-size: 0.82rem; margin-bottom: 0;">
                <i class="fas fa-question-circle" style="color: var(--accent-gold); margin-right: 6px;"></i> Pergunta / Enunciado:
              </label>
              <div style="display: flex; gap: 6px;">
                <button type="button" class="btn btn-sm btn-gold" onclick="window.TKST_APP.openBatchSuggestQuestionsModal(${kyu})" style="font-size: 0.72rem; padding: 3px 8px; font-weight: 700; color: #000;" title="Sugerir 5 perguntas em lote">
                  <i class="fas fa-layer-group"></i> Lote (5)
                </button>
                <button type="button" class="btn btn-sm btn-secondary" onclick="window.TKST_APP.suggestQuizQuestion(${kyu}, 'newQuizQuestionInput')" style="font-size: 0.72rem; padding: 3px 8px; font-weight: 700;" title="Sugerir pergunta inédita para esta faixa">
                  <i class="fas fa-lightbulb"></i> Sugerir 1
                </button>
              </div>
            </div>
            <textarea id="newQuizQuestionInput" class="form-input" rows="3" required placeholder="Digite sua pergunta aqui ou clique em 'Sugerir Pergunta' acima..." style="resize: vertical; font-size: 0.88rem;">${escapeHtml(qText)}</textarea>
            <div style="font-size: 0.72rem; color: #94A3B8; margin-top: 3px;">
              <i class="fas fa-keyboard"></i> Você pode digitar livremente sua própria pergunta ou usar a sugestão baseada no Plano de Estudos.
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" style="font-size: 0.82rem; margin-bottom: 4px;">
              <i class="fas fa-image" style="color: var(--accent-gold); margin-right: 6px;"></i> Imagem Ilustrativa (Opcional):
            </label>
            
            <div id="quizModalImagePreviewBox" style="display: none; margin-bottom: 8px; background: rgba(0,0,0,0.35); border: 1px dashed var(--border-color); border-radius: var(--radius-sm); padding: 8px; text-align: center;">
              <img id="quizModalImagePreview" src="" style="max-height: 140px; max-width: 100%; object-fit: contain; border-radius: 4px; margin-bottom: 6px;">
              <div>
                <button type="button" class="btn btn-sm btn-danger" onclick="window.TKST_APP.removeQuizModalImage()" style="font-size: 0.72rem; padding: 3px 8px;">
                  <i class="fas fa-trash"></i> Remover Imagem
                </button>
              </div>
            </div>

            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
              <label class="btn btn-secondary" style="font-size: 0.76rem; padding: 6px 10px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;">
                <i class="fas fa-camera"></i> Escolher ou Tirar Foto
                <input type="file" accept="image/*" id="quizModalFileInput" style="display: none;" onchange="window.TKST_APP.handleQuizModalImageUpload(this)">
              </label>
              <input type="url" id="quizModalUrlInput" class="form-input" placeholder="Ou cole o link da imagem (https://...)" oninput="window.TKST_APP.handleQuizModalImageUrl(this.value)" style="flex: 1; min-width: 160px; font-size: 0.78rem;">
            </div>
          </div>

          <!-- Resposta Correta -->
          <div class="form-group" style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: var(--radius-sm); padding: 10px 12px;">
            <label class="form-label" style="font-size: 0.82rem; margin-bottom: 4px; color: #6EE7B7; font-weight: 700;">
              <i class="fas fa-check-circle" style="color: var(--accent-emerald); margin-right: 6px;"></i> Resposta Correta (Gabarito Oficial):
            </label>
            <input type="text" id="newQuizCorrectAnswerInput" class="form-input" value="${escapeHtml(cText)}" required placeholder="Digite a resposta correta oficial..." style="font-size: 0.88rem; font-weight: 600; color: #FFF; background: rgba(0,0,0,0.4); border-color: rgba(16, 185, 129, 0.4);">
          </div>

          <!-- 3 Respostas Erradas -->
          <div class="form-group" style="background: rgba(230, 57, 70, 0.06); border: 1px solid rgba(230, 57, 70, 0.25); border-radius: var(--radius-sm); padding: 10px 12px; display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <label class="form-label" style="font-size: 0.82rem; margin-bottom: 0; color: #FCA5A5; font-weight: 700;">
                <i class="fas fa-times-circle" style="color: var(--accent-crimson); margin-right: 6px;"></i> 3 Alternativas Incorretas (Respostas Erradas):
              </label>
              <button type="button" class="btn btn-sm btn-secondary" onclick="window.TKST_APP.autoFillWrongOptionsFromInputs('add')" style="font-size: 0.70rem; padding: 2px 7px;" title="Preencher com sugestões automáticas">
                <i class="fas fa-magic"></i> Auto-sugerir
              </button>
            </div>

            <div>
              <span style="font-size: 0.70rem; color: #94A3B8; font-weight: 600;">Alternativa Errada 1:</span>
              <input type="text" id="newQuizWrong1Input" class="form-input" value="${escapeHtml(w1Text)}" placeholder="Digite a 1ª alternativa errada (ou use Auto-sugerir)..." style="font-size: 0.84rem; margin-top: 2px; background: rgba(0,0,0,0.35);">
            </div>

            <div>
              <span style="font-size: 0.70rem; color: #94A3B8; font-weight: 600;">Alternativa Errada 2:</span>
              <input type="text" id="newQuizWrong2Input" class="form-input" value="${escapeHtml(w2Text)}" placeholder="Digite a 2ª alternativa errada..." style="font-size: 0.84rem; margin-top: 2px; background: rgba(0,0,0,0.35);">
            </div>

            <div>
              <span style="font-size: 0.70rem; color: #94A3B8; font-weight: 600;">Alternativa Errada 3:</span>
              <input type="text" id="newQuizWrong3Input" class="form-input" value="${escapeHtml(w3Text)}" placeholder="Digite a 3ª alternativa errada..." style="font-size: 0.84rem; margin-top: 2px; background: rgba(0,0,0,0.35);">
            </div>
          </div>

          <div style="display: flex; gap: 10px; margin-top: 6px;">
            <button type="button" class="btn btn-secondary" onclick="window.TKST_APP.cancelModalEdit()" style="flex: 1; padding: 10px;">
              Cancelar
            </button>
            <button type="submit" class="btn btn-primary" style="flex: 2; padding: 10px; font-weight: 700;">
              <i class="fas fa-plus-circle"></i> Cadastrar Questão
            </button>
          </div>
        </form>
      `;

      detailModal.setAttribute('data-prevent-outside-close', 'true');
      detailModal.classList.add('active');
    },

    submitAddQuizQuestion: async (kyu) => {
      const submitBtn = document.querySelector('#detailModalBody button[type="submit"]');
      const originalBtnHtml = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Otimizando e Cadastrando...';
      }

      try {
        const bank = window.TKST_AUTH ? window.TKST_AUTH.getCustomQuizBank() : (window.TKST_QUIZ_BANK || []);
        const questionText = document.getElementById('newQuizQuestionInput').value.trim();
        const correctAnswer = document.getElementById('newQuizCorrectAnswerInput').value.trim();
        let wrong1 = (document.getElementById('newQuizWrong1Input')?.value || '').trim();
        let wrong2 = (document.getElementById('newQuizWrong2Input')?.value || '').trim();
        let wrong3 = (document.getElementById('newQuizWrong3Input')?.value || '').trim();

        if (!questionText || !correctAnswer) {
          alert('Por favor, preencha a pergunta e a resposta correta.');
          return;
        }

        if (!wrong1 || !wrong2 || !wrong3) {
          const smart = generateSmartOptions(questionText, correctAnswer);
          const fallback = (smart.options || []).filter(o => o.trim().toLowerCase() !== correctAnswer.toLowerCase());
          if (!wrong1) wrong1 = fallback[0] || 'Opção B';
          if (!wrong2) wrong2 = fallback[1] || 'Opção C';
          if (!wrong3) wrong3 = fallback[2] || 'Opção D';
        }

        // Redução e compressão automática da imagem (evita estouro de armazenamento)
        if (quizModalTempImage) {
          try {
            quizModalTempImage = await compressImageSource(quizModalTempImage, 400, 400, 0.62);
          } catch(imgErr) {
            console.warn('Compress image fallback em add:', imgErr);
          }
        }

        const numericKyu = parseInt(kyu, 10);
        const beltName = getBeltNameFromKyu(numericKyu);
        const newQuestion = {
          id: `q_custom_${numericKyu}_${Date.now()}`,
          kyuNumber: numericKyu,
          kyu: numericKyu,
          beltName: beltName,
          question: questionText,
          image: quizModalTempImage || '',
          options: [correctAnswer, wrong1, wrong2, wrong3],
          correctIndex: 0,
          _edited: true,
          updatedAt: Date.now()
        };

        bank.push(newQuestion);
        window.TKST_AUTH.saveCustomQuizBank(bank);
        detailModal.classList.remove('active');
        showToast('✅ Nova questão cadastrada e salva no simulado! Sincronizando...', 'sync');
        renderAdminMaster();
      } catch (err) {
        console.error('Erro ao cadastrar questão:', err);
        alert('Ocorreu um erro ao cadastrar a questão.');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnHtml;
        }
      }
    },

    autoFillWrongOptionsFromInputs: (mode = 'add') => {
      const isEdit = mode === 'edit';
      const qInput = document.getElementById(isEdit ? 'editQuizQuestionInput' : 'newQuizQuestionInput');
      const cInput = document.getElementById(isEdit ? 'editQuizCorrectAnswerInput' : 'newQuizCorrectAnswerInput');
      const w1 = document.getElementById(isEdit ? 'editQuizWrong1Input' : 'newQuizWrong1Input');
      const w2 = document.getElementById(isEdit ? 'editQuizWrong2Input' : 'newQuizWrong2Input');
      const w3 = document.getElementById(isEdit ? 'editQuizWrong3Input' : 'newQuizWrong3Input');

      if (!cInput) return false;
      const qText = qInput ? qInput.value.trim() : '';
      const cText = cInput.value.trim();
      if (!cText) {
        showToast('⚠️ Digite a resposta correta primeiro para auto-sugerir alternativas do mesmo tipo!', 'warning', 3500);
        cInput.focus();
        return false;
      }

      const smart = generateSmartOptions(qText, cText);
      const fallback = (smart.options || []).filter(o => o.trim().toLowerCase() !== cText.toLowerCase());

      if (w1 && fallback[0]) w1.value = fallback[0];
      if (w2 && fallback[1]) w2.value = fallback[1];
      if (w3 && fallback[2]) w3.value = fallback[2];

      [w1, w2, w3].forEach(el => {
        if (el) {
          el.style.transition = 'all 0.3s ease';
          const origBg = el.style.background;
          el.style.background = 'rgba(230, 57, 70, 0.28)';
          el.style.borderColor = 'rgba(230, 57, 70, 0.7)';
          setTimeout(() => {
            el.style.background = origBg || 'rgba(0,0,0,0.35)';
            el.style.borderColor = '';
          }, 700);
        }
      });

      const category = detectKarateCategory(qText, cText);
      const catLabels = {
        defesas: 'Defesas',
        socos: 'Socos e Ataques',
        chutes: 'Chutes',
        bases: 'Bases',
        katas: 'Katas',
        kumite: 'Kumite',
        alturas: 'Alturas/Níveis',
        armas: 'Armas Corporais',
        comandos: 'Comandos do Dojô',
        frases: 'Frases equivalentes'
      };
      const label = (category && catLabels[category]) || 'Alternativas equivalentes';
      showToast(`✨ 3 alternativas erradas geradas automaticamente (${label})!`, 'success', 3000);
      return true;
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
      const qKyu = Number(q.kyuNumber !== undefined ? q.kyuNumber : (q.kyu !== undefined ? q.kyu : 6));
      const beltName = q.beltName || getBeltNameFromKyu(qKyu);

      const qText = q.question || '';
      const cText = (q.options && q.options[q.correctIndex]) || (q.options && q.options[0]) || '';
      const wrongList = (q.options || []).filter((_, idx) => idx !== (q.correctIndex !== undefined ? q.correctIndex : 0));
      const w1Text = wrongList[0] || '';
      const w2Text = wrongList[1] || '';
      const w3Text = wrongList[2] || '';

      modalTitle.innerHTML = `<div style="display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 8px;"><span><i class="fas fa-edit" style="color: var(--accent-gold);"></i> Editar Questão (${beltName})</span><span class="badge badge-gold" style="font-size: 0.7rem; font-weight: 600; white-space: nowrap;"><i class="fas fa-lock"></i> ID: ${q.id}</span></div>`;

      modalBody.innerHTML = `
        <form onsubmit="event.preventDefault(); window.TKST_APP.submitEditQuizQuestion('${q.id}');" style="display: flex; flex-direction: column; gap: 12px;">
          <div style="background: rgba(255,183,3,0.08); border: 1px solid rgba(255,183,3,0.3); border-radius: var(--radius-sm); padding: 8px 12px; font-size: 0.80rem; color: #E2E8F0;">
            <i class="fas fa-edit" style="color: var(--accent-gold); margin-right: 6px;"></i> <strong>Edição da Questão:</strong> Altere os campos desejados e clique em Salvar Alterações.
          </div>

          <div class="form-group">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; flex-wrap: wrap; gap: 6px;">
              <label class="form-label" style="font-size: 0.82rem; margin-bottom: 0;">
                <i class="fas fa-question-circle" style="color: var(--accent-gold); margin-right: 6px;"></i> Pergunta / Enunciado:
              </label>
              <button type="button" class="btn btn-sm btn-secondary" onclick="window.TKST_APP.suggestQuizQuestion(${qKyu}, 'editQuizQuestionInput')" style="font-size: 0.72rem; padding: 3px 8px; font-weight: 700;" title="Sugerir pergunta inédita para esta faixa">
                <i class="fas fa-lightbulb"></i> Sugerir Pergunta
              </button>
            </div>
            <textarea id="editQuizQuestionInput" class="form-input" rows="3" required placeholder="Digite a pergunta..." style="resize: vertical; font-size: 0.88rem;">${escapeHtml(qText)}</textarea>
          </div>

          <div class="form-group">
            <label class="form-label" style="font-size: 0.82rem; margin-bottom: 4px;">
              <i class="fas fa-image" style="color: var(--accent-gold); margin-right: 6px;"></i> Imagem Ilustrativa (Opcional):
            </label>
            
            <div id="quizModalImagePreviewBox" style="display: ${quizModalTempImage ? 'block' : 'none'}; margin-bottom: 8px; background: rgba(0,0,0,0.35); border: 1px dashed var(--border-color); border-radius: var(--radius-sm); padding: 8px; text-align: center;">
              <img id="quizModalImagePreview" src="${quizModalTempImage}" style="max-height: 140px; max-width: 100%; object-fit: contain; border-radius: 4px; margin-bottom: 6px;">
              <div>
                <button type="button" class="btn btn-sm btn-danger" onclick="window.TKST_APP.removeQuizModalImage()" style="font-size: 0.72rem; padding: 3px 8px;">
                  <i class="fas fa-trash"></i> Remover Imagem
                </button>
              </div>
            </div>

            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
              <label class="btn btn-secondary" style="font-size: 0.76rem; padding: 6px 10px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;">
                <i class="fas fa-camera"></i> Escolher ou Tirar Foto
                <input type="file" accept="image/*" id="quizModalFileInput" style="display: none;" onchange="window.TKST_APP.handleQuizModalImageUpload(this)">
              </label>
              <input type="url" id="quizModalUrlInput" class="form-input" placeholder="Ou cole o link da imagem (https://...)" oninput="window.TKST_APP.handleQuizModalImageUrl(this.value)" style="flex: 1; min-width: 160px; font-size: 0.78rem;">
            </div>
          </div>

          <!-- Resposta Correta -->
          <div class="form-group" style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: var(--radius-sm); padding: 10px 12px;">
            <label class="form-label" style="font-size: 0.82rem; margin-bottom: 4px; color: #6EE7B7; font-weight: 700;">
              <i class="fas fa-check-circle" style="color: var(--accent-emerald); margin-right: 6px;"></i> Resposta Correta (Gabarito Oficial):
            </label>
            <input type="text" id="editQuizCorrectAnswerInput" class="form-input" value="${escapeHtml(cText)}" required placeholder="Digite a resposta correta oficial..." style="font-size: 0.88rem; font-weight: 600; color: #FFF; background: rgba(0,0,0,0.4); border-color: rgba(16, 185, 129, 0.4);">
          </div>

          <!-- 3 Respostas Erradas -->
          <div class="form-group" style="background: rgba(230, 57, 70, 0.06); border: 1px solid rgba(230, 57, 70, 0.25); border-radius: var(--radius-sm); padding: 10px 12px; display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <label class="form-label" style="font-size: 0.82rem; margin-bottom: 0; color: #FCA5A5; font-weight: 700;">
                <i class="fas fa-times-circle" style="color: var(--accent-crimson); margin-right: 6px;"></i> 3 Alternativas Incorretas (Respostas Erradas):
              </label>
              <button type="button" class="btn btn-sm btn-secondary" onclick="window.TKST_APP.autoFillWrongOptionsFromInputs('edit')" style="font-size: 0.70rem; padding: 2px 7px;" title="Preencher com sugestões automáticas">
                <i class="fas fa-magic"></i> Auto-sugerir
              </button>
            </div>

            <div>
              <span style="font-size: 0.70rem; color: #94A3B8; font-weight: 600;">Alternativa Errada 1:</span>
              <input type="text" id="editQuizWrong1Input" class="form-input" value="${escapeHtml(w1Text)}" placeholder="Digite a 1ª alternativa errada..." style="font-size: 0.84rem; margin-top: 2px; background: rgba(0,0,0,0.35);">
            </div>

            <div>
              <span style="font-size: 0.70rem; color: #94A3B8; font-weight: 600;">Alternativa Errada 2:</span>
              <input type="text" id="editQuizWrong2Input" class="form-input" value="${escapeHtml(w2Text)}" placeholder="Digite a 2ª alternativa errada..." style="font-size: 0.84rem; margin-top: 2px; background: rgba(0,0,0,0.35);">
            </div>

            <div>
              <span style="font-size: 0.70rem; color: #94A3B8; font-weight: 600;">Alternativa Errada 3:</span>
              <input type="text" id="editQuizWrong3Input" class="form-input" value="${escapeHtml(w3Text)}" placeholder="Digite a 3ª alternativa errada..." style="font-size: 0.84rem; margin-top: 2px; background: rgba(0,0,0,0.35);">
            </div>
          </div>

          <div style="display: flex; gap: 10px; margin-top: 6px;">
            <button type="button" class="btn btn-secondary" onclick="window.TKST_APP.cancelModalEdit()" style="flex: 1; padding: 10px;">
              Cancelar
            </button>
            <button type="submit" class="btn btn-primary" style="flex: 2; padding: 10px; font-weight: 700;">
              <i class="fas fa-save"></i> Salvar Alterações
            </button>
          </div>
        </form>
      `;

      detailModal.setAttribute('data-prevent-outside-close', 'true');
      detailModal.classList.add('active');
    },

    submitEditQuizQuestion: async (qId) => {
      const submitBtn = document.querySelector('#detailModalBody button[type="submit"]');
      const originalBtnHtml = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
      }

      try {
        const bank = window.TKST_AUTH ? window.TKST_AUTH.getCustomQuizBank() : (window.TKST_QUIZ_BANK || []);
        const idx = bank.findIndex(item => item.id === qId);
        if (idx === -1) {
          alert('Questão não encontrada no banco.');
          return;
        }

        const questionText = document.getElementById('editQuizQuestionInput').value.trim();
        const correctAnswer = document.getElementById('editQuizCorrectAnswerInput').value.trim();
        let wrong1 = (document.getElementById('editQuizWrong1Input')?.value || '').trim();
        let wrong2 = (document.getElementById('editQuizWrong2Input')?.value || '').trim();
        let wrong3 = (document.getElementById('editQuizWrong3Input')?.value || '').trim();

        if (!questionText || !correctAnswer) {
          alert('Por favor, preencha a pergunta e a resposta correta.');
          return;
        }

        if (!wrong1 || !wrong2 || !wrong3) {
          const smart = generateSmartOptions(questionText, correctAnswer);
          const fallback = (smart.options || []).filter(o => o.trim().toLowerCase() !== correctAnswer.toLowerCase());
          if (!wrong1) wrong1 = fallback[0] || 'Opção B';
          if (!wrong2) wrong2 = fallback[1] || 'Opção C';
          if (!wrong3) wrong3 = fallback[2] || 'Opção D';
        }

        if (quizModalTempImage) {
          try {
            quizModalTempImage = await compressImageSource(quizModalTempImage, 400, 400, 0.62);
          } catch(imgErr) {}
        }

        const existing = bank[idx];
        const numKyu = Number(existing.kyuNumber !== undefined ? existing.kyuNumber : (existing.kyu !== undefined ? existing.kyu : 6));
        bank[idx] = {
          ...existing,
          kyuNumber: numKyu,
          kyu: numKyu,
          question: questionText,
          image: quizModalTempImage || existing.image || '',
          options: [correctAnswer, wrong1, wrong2, wrong3],
          correctIndex: 0,
          _edited: true,
          _custom: true,
          updatedAt: Date.now()
        };

        // Salvar imediatamente no mapa de questões editadas para garantia total de persistência
        try {
          const editedMap = JSON.parse(localStorage.getItem('tkst_edited_quiz_questions') || '{}');
          const cleanToStore = { ...bank[idx] };
          if (cleanToStore.image && cleanToStore.image.length > 50000) {
            cleanToStore.image = '';
          }
          editedMap[qId] = cleanToStore;
          localStorage.setItem('tkst_edited_quiz_questions', JSON.stringify(editedMap));
        } catch(e) {}

        if (Array.isArray(window.TKST_DEFAULT_QUIZ_BANK)) {
          const dIdx = window.TKST_DEFAULT_QUIZ_BANK.findIndex(item => item.id === qId);
          if (dIdx !== -1) {
            window.TKST_DEFAULT_QUIZ_BANK[dIdx] = { ...window.TKST_DEFAULT_QUIZ_BANK[dIdx], ...bank[idx] };
          }
        }
        if (Array.isArray(window.TKST_CUSTOM_VAULT_QUESTIONS)) {
          const vIdx = window.TKST_CUSTOM_VAULT_QUESTIONS.findIndex(item => item.id === qId);
          if (vIdx !== -1) {
            window.TKST_CUSTOM_VAULT_QUESTIONS[vIdx] = { ...window.TKST_CUSTOM_VAULT_QUESTIONS[vIdx], ...bank[idx] };
          }
        }

        window.TKST_AUTH.saveCustomQuizBank(bank);
        detailModal.classList.remove('active');
        showToast('✅ Questão atualizada com sucesso! Sincronizando...', 'sync');
        renderAdminMaster();
      } catch (err) {
        console.error('Erro ao editar questão:', err);
        alert('Ocorreu um erro ao editar a questão.');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnHtml;
        }
      }
    },

    handleQuizModalImageUpload: (input) => {
      if (input.files && input.files[0]) {
        compressQuizImage(input.files[0], (dataUrl) => {
          quizModalTempImage = dataUrl;
          const previewBox = document.getElementById('quizModalImagePreviewBox');
          const previewImg = document.getElementById('quizModalImagePreview');
          const urlInput = document.getElementById('quizModalUrlInput');
          if (urlInput) urlInput.value = '';
          if (previewBox && previewImg) {
            previewImg.src = dataUrl;
            previewBox.style.display = 'block';
          }
        });
      }
    },

    handleQuizModalImageUrl: async (url) => {
      const trimmed = (url || '').trim();
      const previewBox = document.getElementById('quizModalImagePreviewBox');
      const previewImg = document.getElementById('quizModalImagePreview');
      if (!trimmed) {
        quizModalTempImage = '';
        if (previewBox) previewBox.style.display = 'none';
        if (previewImg) previewImg.src = '';
        return;
      }
      if (previewBox && previewImg) {
        previewImg.src = trimmed;
        previewBox.style.display = 'block';
      }
      if (trimmed.startsWith('data:image/')) {
        const compressed = await compressImageSource(trimmed, 600, 600, 0.78);
        quizModalTempImage = compressed;
        if (previewImg) previewImg.src = compressed;
      } else {
        quizModalTempImage = trimmed;
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

    openCopyTransferQuizModal: (qId) => {
      const allBank = window.TKST_AUTH ? window.TKST_AUTH.getCustomQuizBank() : (window.TKST_QUIZ_BANK || []);
      const q = allBank.find(item => item && item.id === qId) ||
                (window.TKST_DEFAULT_QUIZ_BANK || []).find(item => item && item.id === qId);

      if (!q) {
        showToast('⚠️ Questão não encontrada.', 'warning');
        return;
      }

      const modal = document.getElementById('detailModal');
      const modalTitle = document.getElementById('detailModalTitle');
      const modalBody = document.getElementById('detailModalBody');
      if (!modal || !modalTitle || !modalBody) return;

      const currentKyu = Number(q.kyuNumber !== undefined ? q.kyuNumber : (q.kyu !== undefined ? q.kyu : 6));
      const currentBeltName = q.beltName || getBeltNameFromKyu(currentKyu);
      const correctText = (q.options && q.options[q.correctIndex]) || (q.options && q.options[0]) || '';

      const allBelts = [
        { kyu: 6, label: "6º Kyu (Branca p/ Amarela)" },
        { kyu: 5, label: "5º Kyu (Amarela p/ Vermelha)" },
        { kyu: 4, label: "4º Kyu (Vermelha p/ Laranja)" },
        { kyu: 3, label: "3º Kyu (Laranja p/ Verde)" },
        { kyu: 2, label: "2º Kyu (Verde p/ Roxa)" },
        { kyu: 1, label: "1º Kyu (Roxa p/ Marrom)" },
        { kyu: 0, label: "1º Dan (Shodan)" },
        { kyu: -1, label: "2º Dan (Nidan)" },
        { kyu: -2, label: "3º Dan (Sandan)" }
      ];

      modalTitle.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 8px;">
          <span style="display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-exchange-alt" style="color: #60A5FA;"></i>
            <strong>Copiar ou Transferir Questão</strong>
          </span>
          <span class="badge" style="background: rgba(59,130,246,0.18); border: 1px solid rgba(59,130,246,0.4); color: #93C5FD; font-size: 0.70rem; font-weight: 700;">
            Graduação Atual: ${currentBeltName}
          </span>
        </div>
      `;

      modalBody.innerHTML = `
        <form onsubmit="event.preventDefault(); window.TKST_APP.submitCopyTransferQuiz('${q.id}');" style="display: flex; flex-direction: column; gap: 14px;">
          <!-- Preview da Questão -->
          <div style="background: rgba(18, 23, 34, 0.95); border: 1px solid var(--border-color); border-left: 4px solid #60A5FA; border-radius: var(--radius-sm); padding: 12px 14px; display: flex; flex-direction: column; gap: 6px;">
            <div style="font-size: 0.76rem; color: #94A3B8; font-weight: 600;">ENUNCIADO DA QUESTÃO SELECIONADA:</div>
            <div style="font-size: 0.95rem; font-weight: 700; color: #FFF; line-height: 1.4;">
              ${escapeHtml(q.question)}
            </div>
            <div style="font-size: 0.82rem; color: #6EE7B7; display: flex; align-items: center; gap: 6px; margin-top: 4px;">
              <i class="fas fa-check-circle" style="color: var(--accent-emerald);"></i> <strong>Gabarito:</strong> ${escapeHtml(correctText)}
            </div>
          </div>

          <!-- Seleção da Ação: Copiar ou Transferir -->
          <div>
            <label style="font-size: 0.82rem; font-weight: 700; color: #FFF; display: block; margin-bottom: 8px;">
              <i class="fas fa-sliders-h" style="color: var(--accent-gold);"></i> Escolha o Tipo de Operação:
            </label>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <label id="copyTransferOptCopy" style="display: flex; flex-direction: column; gap: 4px; padding: 12px; background: rgba(59, 130, 246, 0.12); border: 2px solid #3B82F6; border-radius: var(--radius-sm); cursor: pointer; transition: all 0.2s ease;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <input type="radio" name="copyTransferMode" value="copy" checked onchange="window.TKST_APP.toggleCopyTransferUI('copy')" style="accent-color: #3B82F6; width: 16px; height: 16px; cursor: pointer;">
                  <strong style="color: #93C5FD; font-size: 0.90rem;"><i class="fas fa-copy"></i> Copiar (Duplicar)</strong>
                </div>
                <div style="font-size: 0.74rem; color: #CBD5E1; padding-left: 24px; line-height: 1.3;">
                  Mantém a questão na graduação atual (<strong>${currentBeltName}</strong>) e cria uma cópia idêntica na graduação escolhida.
                </div>
              </label>

              <label id="copyTransferOptMove" style="display: flex; flex-direction: column; gap: 4px; padding: 12px; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: var(--radius-sm); cursor: pointer; transition: all 0.2s ease;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <input type="radio" name="copyTransferMode" value="move" onchange="window.TKST_APP.toggleCopyTransferUI('move')" style="accent-color: #F5BE00; width: 16px; height: 16px; cursor: pointer;">
                  <strong style="color: #FDE047; font-size: 0.90rem;"><i class="fas fa-arrows-alt-h"></i> Transferir (Mover)</strong>
                </div>
                <div style="font-size: 0.74rem; color: #CBD5E1; padding-left: 24px; line-height: 1.3;">
                  <strong>Remove</strong> a questão da graduação atual e move para que passe a pertencer exclusivamente à graduação escolhida.
                </div>
              </label>
            </div>
          </div>

          <!-- Graduação de Destino -->
          <div class="form-group">
            <label style="font-size: 0.82rem; font-weight: 700; color: #FFF; display: block; margin-bottom: 6px;">
              <i class="fas fa-graduation-cap" style="color: var(--accent-gold);"></i> Graduação de Destino:
            </label>
            <select id="copyTransferTargetKyu" class="form-input" style="width: 100%; padding: 10px; font-size: 0.88rem; background: #0B0E14; border: 1px solid var(--border-color); color: #FFF; border-radius: var(--radius-sm);" required>
              ${allBelts.map(b => `
                <option value="${b.kyu}" ${b.kyu !== currentKyu ? '' : 'disabled'}>
                  ${b.label} ${b.kyu === currentKyu ? '(Graduação Atual)' : ''}
                </option>
              `).join('')}
            </select>
            <div style="font-size: 0.72rem; color: #94A3B8; margin-top: 4px;">
              Selecione a faixa ou Dan para o qual a questão será enviada.
            </div>
          </div>

          <!-- Botões de Ação -->
          <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 6px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 12px;">
            <button type="button" class="btn btn-secondary" onclick="window.TKST_APP.closeModal()" style="padding: 9px 16px;">
              Cancelar
            </button>
            <button type="submit" id="copyTransferSubmitBtn" class="btn btn-primary" style="padding: 9px 20px; font-weight: 700; display: inline-flex; align-items: center; gap: 8px;">
              <i class="fas fa-check"></i> <span id="copyTransferSubmitText">Confirmar Cópia</span>
            </button>
          </div>
        </form>
      `;

      modal.classList.add('active');
    },

    toggleCopyTransferUI: (mode) => {
      const copyBox = document.getElementById('copyTransferOptCopy');
      const moveBox = document.getElementById('copyTransferOptMove');
      const btnText = document.getElementById('copyTransferSubmitText');
      const btn = document.getElementById('copyTransferSubmitBtn');

      if (mode === 'move') {
        if (moveBox) {
          moveBox.style.background = 'rgba(245, 190, 0, 0.12)';
          moveBox.style.border = '2px solid #F5BE00';
        }
        if (copyBox) {
          copyBox.style.background = 'rgba(255, 255, 255, 0.04)';
          copyBox.style.border = '1px solid rgba(255, 255, 255, 0.15)';
        }
        if (btnText) btnText.textContent = 'Confirmar Transferência';
        if (btn) btn.style.background = 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)';
      } else {
        if (copyBox) {
          copyBox.style.background = 'rgba(59, 130, 246, 0.12)';
          copyBox.style.border = '2px solid #3B82F6';
        }
        if (moveBox) {
          moveBox.style.background = 'rgba(255, 255, 255, 0.04)';
          moveBox.style.border = '1px solid rgba(255, 255, 255, 0.15)';
        }
        if (btnText) btnText.textContent = 'Confirmar Cópia';
        if (btn) btn.style.background = '';
      }
    },

    submitCopyTransferQuiz: (qId) => {
      const modeRadio = document.querySelector('input[name="copyTransferMode"]:checked');
      const targetSelect = document.getElementById('copyTransferTargetKyu');
      if (!modeRadio || !targetSelect) return;

      const mode = modeRadio.value;
      const targetKyu = parseInt(targetSelect.value, 10);
      const targetBeltName = getBeltNameFromKyu(targetKyu);

      const allBank = window.TKST_AUTH ? window.TKST_AUTH.getCustomQuizBank() : (window.TKST_QUIZ_BANK || []);
      let q = allBank.find(item => item && item.id === qId);

      if (!q) {
        const defaultQ = (window.TKST_DEFAULT_QUIZ_BANK || []).find(item => item && item.id === qId);
        if (defaultQ) {
          q = JSON.parse(JSON.stringify(defaultQ));
          allBank.push(q);
        }
      }

      if (!q) {
        showToast('⚠️ Erro: Questão não encontrada.', 'error');
        return;
      }

      const originalKyu = Number(q.kyuNumber !== undefined ? q.kyuNumber : (q.kyu !== undefined ? q.kyu : 6));
      const originalBeltName = q.beltName || getBeltNameFromKyu(originalKyu);

      if (mode === 'move') {
        if (originalKyu === targetKyu) {
          showToast('⚠️ A questão já pertence a esta graduação!', 'warning');
          return;
        }

        q.kyuNumber = targetKyu;
        q.kyu = targetKyu;
        q.beltName = targetBeltName;
        q._edited = true;
        q.updatedAt = Date.now();

        if (window.TKST_AUTH && window.TKST_AUTH.saveCustomQuizBank) {
          window.TKST_AUTH.saveCustomQuizBank(allBank);
        }

        const modal = document.getElementById('detailModal');
        if (modal) modal.classList.remove('active');

        showToast(`🔄 Questão transferida com sucesso de ${originalBeltName} para ${targetBeltName}!`, 'sync', 4500);
        renderAdminMaster();
      } else {
        const cloned = JSON.parse(JSON.stringify(q));
        cloned.id = `q_custom_${targetKyu}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        cloned.kyuNumber = targetKyu;
        cloned.kyu = targetKyu;
        cloned.beltName = targetBeltName;
        cloned._edited = true;
        cloned.updatedAt = Date.now();

        allBank.push(cloned);

        if (window.TKST_AUTH && window.TKST_AUTH.saveCustomQuizBank) {
          window.TKST_AUTH.saveCustomQuizBank(allBank);
        }

        const modal = document.getElementById('detailModal');
        if (modal) modal.classList.remove('active');

        showToast(`📋 Questão copiada com sucesso para ${targetBeltName}! (Original mantida em ${originalBeltName})`, 'success', 4500);
        renderAdminMaster();
      }
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
    submitLogin: async () => {
      const idInput = document.getElementById('loginIdentifier');
      const passInput = document.getElementById('loginPassword');
      const alertBox = document.getElementById('authAlertBox');
      const submitBtn = document.querySelector('#authModal form button[type="submit"]') || document.querySelector('.auth-form button[type="submit"]') || document.querySelector('button[onclick*="submitLogin"]');

      const originalBtnText = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando acesso...';
      }
      if (alertBox) {
        alertBox.className = 'auth-alert';
        alertBox.textContent = '';
      }

      try {
        const res = await window.TKST_AUTH.login(idInput.value, passInput.value);
        if (res.success) {
          if (window.TKST_AUTH.isAdmin()) {
            switchTab('admin');
          } else {
            switchTab('dashboard');
          }
        } else {
          if (alertBox) {
            alertBox.textContent = res.message;
            alertBox.className = 'auth-alert error';
          }
        }
      } catch (err) {
        if (alertBox) {
          alertBox.textContent = 'Erro ao verificar credenciais. Tente novamente.';
          alertBox.className = 'auth-alert error';
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnText;
        }
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
        status: 'approved'
      });

      if (res.success) {
        feedback.innerHTML = `
          <div style="background: rgba(16, 185, 129, 0.15); border: 1.5px solid var(--accent-emerald); color: #FFF; padding: 20px 16px; border-radius: var(--radius-md); font-size: 0.9rem; text-align: center;">
            <div style="font-size: 1.25rem; font-weight: 700; color: #6EE7B7; margin-bottom: 8px;">
              <i class="fas fa-check-circle"></i> Matrícula Realizada com Sucesso!
            </div>
            <p style="font-size: 0.92rem; color: #E2E8F0; margin-bottom: 16px; line-height: 1.5;">
              Bem-vindo(a) à TKST, <strong>${res.user.name}</strong>!<br>
              Seu acesso aos estudos, apostilas, simulados e vídeos de Kata foi <strong>100% liberado</strong>!
            </p>
            <button type="button" class="btn btn-primary" onclick="document.getElementById('detailModal').classList.remove('active'); window.TKST_APP.switchTab('dashboard');" style="width: 100%; padding: 13px; font-weight: 700; font-size: 0.95rem; margin-bottom: 10px; cursor: pointer;">
              <i class="fas fa-sign-in-alt"></i> Acessar Meu Portal de Aluno Agora
            </button>
          </div>
        `;
        // Auto-redireciona para o dashboard após 1.5s
        setTimeout(() => {
          const modal = document.getElementById('detailModal');
          if (modal && modal.classList.contains('active')) {
            modal.classList.remove('active');
            window.TKST_APP.switchTab('dashboard');
          }
        }, 1500);
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
      if (!window.TKST_AUTH.canManageStudents()) {
        alert('Apenas o Administrador Master (Sensei Diego) pode aprovar cadastros de alunos.');
        return;
      }
      const res = window.TKST_AUTH.approveStudent(studentId);
      if (res.success) {
        alert(`Aluno ${res.student.name} (Login: ${res.student.username}) aprovado com sucesso!`);
        renderAdminMaster();
      } else {
        alert(res.message);
      }
    },

    openDojobookImportModal: () => {
      if (!window.TKST_AUTH.canManageStudents()) {
        alert('Apenas o Administrador Master (Sensei Diego) pode importar alunos.');
        return;
      }
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
      if (!window.TKST_AUTH.canManageStudents()) {
        alert('Apenas o Administrador Master (Sensei Diego) pode importar alunos.');
        return;
      }
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
      if (!window.TKST_AUTH.canManageStudents()) {
        alert('Apenas o Administrador Master (Sensei Diego) pode recusar solicitações de alunos.');
        return;
      }
      if (confirm('Deseja recusar esta solicitação de cadastro?')) {
        const res = window.TKST_AUTH.rejectStudent(studentId);
        if (res.success) {
          alert('Cadastro recusado.');
          renderAdminMaster();
        }
      }
    },

    deleteStudent: (studentId, studentName) => {
      if (!window.TKST_AUTH.canManageStudents()) {
        alert('Apenas o Administrador Master (Sensei Diego) pode excluir alunos.');
        return;
      }
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
      if (!window.TKST_AUTH.canManageStudents()) {
        alert('Apenas o Administrador Master (Sensei Diego) pode cadastrar alunos manualmente.');
        return;
      }
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
      if (!term || !term.videoUrl || !term.videoUrl.trim()) {
        alert(`O termo "${japaneseName}" ainda não possui vídeo cadastrado.`);
        return;
      }
      const title = `${term.japanese} - ${term.meaning}`;
      openVideoModal(title, term.videoUrl.trim());
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
      const custom_quiz_bank = window.TKST_AUTH ? window.TKST_AUTH.getCustomQuizBank() : (window.TKST_QUIZ_BANK || []);
      const quiz_submissions = window.TKST_AUTH ? window.TKST_AUTH.getQuizSubmissions() : [];
      const custom_glossary = window.TKST_AUTH ? window.TKST_AUTH.getCustomGlossary() : {};
      const custom_curriculum = window.TKST_AUTH ? window.TKST_AUTH.getCurriculum() : {};
      let generated_exams = {};
      try {
        generated_exams = JSON.parse(localStorage.getItem('tkst_generated_exams') || '{}');
      } catch(e) {}

      const backupData = {
        exportDate: new Date().toISOString(),
        organization: 'Tradicional Karate-Do Shotokan Tsuyoi',
        admin: 'irons365',
        dojos,
        students,
        progress,
        customKataVideos: customVideos,
        custom_quiz_bank,
        quiz_submissions,
        custom_glossary,
        custom_curriculum,
        generated_exams
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `tkst_backup_completo_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    },

    importFullBackup: () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.onchange = (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            const content = evt.target.result;
            const data = JSON.parse(content);
            window.TKST_APP.applyBackupData(data);
          } catch(err) {
            alert('Erro ao processar o arquivo de backup: ' + err.message);
          }
        };
        reader.readAsText(file);
      };
      input.click();
    },

    applyBackupData: (data) => {
      if (!data || typeof data !== 'object') {
        alert('Arquivo inválido: JSON não reconhecido.');
        return;
      }
      let summary = [];

      // 1. Questões do Simulado
      let incomingQuestions = [];
      if (Array.isArray(data)) {
        incomingQuestions = data;
      } else if (Array.isArray(data.custom_quiz_bank)) {
        incomingQuestions = data.custom_quiz_bank;
      } else if (Array.isArray(data.bank)) {
        incomingQuestions = data.bank;
      } else if (Array.isArray(data.questions)) {
        incomingQuestions = data.questions;
      }

      if (incomingQuestions.length > 0) {
        const currentBank = window.TKST_AUTH ? window.TKST_AUTH.getCustomQuizBank() : (window.TKST_QUIZ_BANK || []);
        const map = new Map();
        currentBank.forEach(q => { if (q && q.id) map.set(q.id, q); });
        incomingQuestions.forEach(q => { if (q && q.id && q.question) map.set(q.id, q); });
        const mergedQuestions = Array.from(map.values());
        if (window.TKST_AUTH && typeof window.TKST_AUTH.saveCustomQuizBank === 'function') {
          window.TKST_AUTH.saveCustomQuizBank(mergedQuestions);
        } else {
          localStorage.setItem('tkst_custom_quiz_bank', JSON.stringify(mergedQuestions));
          localStorage.setItem('tkst_quiz_vault_permanent', JSON.stringify(mergedQuestions));
          window.TKST_QUIZ_BANK = mergedQuestions;
          window.TKST_QUIZ = mergedQuestions;
        }
        summary.push(`${mergedQuestions.length} questões`);
      }

      // 2. Alunos
      if (Array.isArray(data.students) && data.students.length > 0) {
        let localStudents = window.TKST_AUTH.getAllStudents();
        const sMap = new Map();
        localStudents.forEach(s => { if (s && s.id) sMap.set(s.id, s); });
        data.students.forEach(s => { if (s && s.id) sMap.set(s.id, s); });
        const mergedStudents = Array.from(sMap.values());
        localStorage.setItem('tkst_students', JSON.stringify(mergedStudents));
        summary.push(`${mergedStudents.length} alunos`);
      }

      // 3. Dojos
      if (Array.isArray(data.dojos) && data.dojos.length > 0) {
        let localDojos = window.TKST_AUTH.getDojos();
        const mergedDojos = Array.from(new Set([...localDojos, ...data.dojos])).filter(Boolean);
        localStorage.setItem('tkst_dojos', JSON.stringify(mergedDojos));
      }

      // 4. Vídeos
      if (data.customKataVideos && typeof data.customKataVideos === 'object') {
        let localVideos = getCustomKataVideos();
        const mergedVideos = { ...localVideos, ...data.customKataVideos };
        localStorage.setItem('tkst_custom_videos', JSON.stringify(mergedVideos));
      }

      // 5. Progresso
      if (data.progress && typeof data.progress === 'object') {
        let localProgress = window.TKST_AUTH.getProgress();
        const mergedProgress = { ...localProgress, ...data.progress };
        localStorage.setItem('tkst_progress', JSON.stringify(mergedProgress));
      }

      // 6. Provas / Simulados
      if (Array.isArray(data.quiz_submissions) && data.quiz_submissions.length > 0) {
        const localSubs = JSON.parse(localStorage.getItem('tkst_quiz_submissions') || '[]');
        const subMap = new Map();
        localSubs.forEach(s => { if (s && s.id) subMap.set(s.id, s); });
        data.quiz_submissions.forEach(s => { if (s && s.id) subMap.set(s.id, s); });
        localStorage.setItem('tkst_quiz_submissions', JSON.stringify(Array.from(subMap.values())));
      }

      // Dispara sincronização em nuvem para que o outro aparelho receba imediatamente
      if (window.TKST_AUTH && typeof window.TKST_AUTH.pushToCloud === 'function') {
        window.TKST_AUTH.pushToCloud();
      }

      alert(`✅ Dados importados com sucesso!\n\n${summary.join(' | ')}\n\nO sistema foi atualizado e sincronizado com os outros aparelhos.`);
      window.location.reload();
    },

    exportQuizQuestionsJson: () => {
      const bank = window.TKST_AUTH ? window.TKST_AUTH.getCustomQuizBank() : (window.TKST_QUIZ_BANK || []);
      if (!bank || bank.length === 0) {
        alert('Nenhuma questão encontrada para exportar.');
        return;
      }
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(bank, null, 2));
      const a = document.createElement('a');
      a.setAttribute("href", dataStr);
      a.setAttribute("download", `tkst_questoes_${bank.length}_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(a);
      a.click();
      a.remove();
    },

    importQuizQuestionsFile: () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.onchange = (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            let parsed = JSON.parse(evt.target.result);
            if (!Array.isArray(parsed) && parsed.custom_quiz_bank && Array.isArray(parsed.custom_quiz_bank)) {
              parsed = parsed.custom_quiz_bank;
            } else if (!Array.isArray(parsed) && parsed.bank && Array.isArray(parsed.bank)) {
              parsed = parsed.bank;
            }
            if (!Array.isArray(parsed) || parsed.length === 0) {
              alert('O arquivo selecionado não contém uma lista válida de questões.');
              return;
            }
            const currentBank = window.TKST_AUTH ? window.TKST_AUTH.getCustomQuizBank() : (window.TKST_QUIZ_BANK || []);
            const map = new Map();
            currentBank.forEach(q => { if (q && q.id) map.set(q.id, q); });
            parsed.forEach(q => { if (q && q.id && q.question) map.set(q.id, q); });
            const merged = Array.from(map.values());
            if (window.TKST_AUTH && typeof window.TKST_AUTH.saveCustomQuizBank === 'function') {
              window.TKST_AUTH.saveCustomQuizBank(merged);
            } else {
              localStorage.setItem('tkst_custom_quiz_bank', JSON.stringify(merged));
              localStorage.setItem('tkst_quiz_vault_permanent', JSON.stringify(merged));
              window.TKST_QUIZ_BANK = merged;
              window.TKST_QUIZ = merged;
            }
            if (window.TKST_AUTH && typeof window.TKST_AUTH.broadcastQuizBank === 'function') {
              window.TKST_AUTH.broadcastQuizBank(merged);
            }
            alert(`🎉 Sucesso! Banco atualizado com ${merged.length} questões e sincronizado.`);
            if (typeof renderAdminView === 'function') renderAdminView();
          } catch(err) {
            alert('Erro ao importar arquivo de questões: ' + err.message);
          }
        };
        reader.readAsText(file);
      };
      input.click();
    },

    syncQuizQuestionsNow: async () => {
      const bank = window.TKST_AUTH ? window.TKST_AUTH.getCustomQuizBank() : (window.TKST_QUIZ_BANK || []);
      if (!bank || bank.length === 0) {
        alert('Nenhuma questão para sincronizar.');
        return;
      }
      showToast(`🔄 Transmitindo ${bank.length} questões para todos os aparelhos...`, 'sync', 4000);
      try {
        if (window.TKST_AUTH && typeof window.TKST_AUTH.broadcastQuizBank === 'function') {
          await window.TKST_AUTH.broadcastQuizBank(bank);
        }
        if (window.TKST_AUTH && typeof window.TKST_AUTH.pushToCloud === 'function') {
          await window.TKST_AUTH.pushToCloud();
        }
        showToast(`✅ ${bank.length} questões transmitidas com sucesso!`, 'success', 4000);
      } catch(e) {
        showToast('Erro ao transmitir questões: ' + e.message, 'danger', 4000);
      }
    },

    openInviteModal: (initialMode = 'access') => {
      const modalTitle = document.getElementById('detailModalTitle');
      const modalBody = document.getElementById('detailModalBody');

      modalTitle.innerHTML = `<span><i class="fab fa-whatsapp" style="color: #25D366;"></i> Compartilhar Link / Convite</span>`;

      const renderInviteBody = (mode) => {
        const isAccess = mode === 'access';
        const url = isAccess 
          ? 'https://tkst-alunos.pages.dev/' 
          : 'https://tkst-alunos.pages.dev/?cadastro=1';
        
        const previewText = isAccess
          ? `OSS!!! 🥋\nAcesse o portal oficial de estudos e treinos TKST Alunos:\n\n👉 Toque no link abaixo para entrar no app:\n${url}`
          : `OSS!!! 🥋\nO Sensei Diego convida você para se cadastrar no portal de estudos TKST Alunos.\n\n👉 Toque no link abaixo para realizar seu cadastro:\n${url}`;

        const descText = isAccess
          ? `Envie o link direto de <strong>Acesso ao Portal / App</strong> para alunos que já possuem conta ou que desejam acessar a plataforma:`
          : `Envie o convite oficial do portal <strong>TKST Alunos</strong> para novos praticantes realizarem o cadastro no sistema:`;

        modalBody.innerHTML = `
          <div style="padding: 6px 2px;">
            <!-- Seletor de Tipo de Link: Acesso ao App vs Novo Cadastro -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px;">
              <button type="button" class="btn ${isAccess ? 'btn-gold' : 'btn-secondary'}" onclick="window.TKST_APP.openInviteModal('access')" style="padding: 10px 8px; font-size: 0.82rem; font-weight: 700; border-radius: 8px; display: flex; align-items: center; justify-content: center; gap: 6px; ${isAccess ? 'box-shadow: 0 4px 12px rgba(255, 183, 3, 0.3);' : ''}">
                <i class="fas fa-mobile-alt"></i> Acesso ao App
              </button>
              <button type="button" class="btn ${!isAccess ? 'btn-gold' : 'btn-secondary'}" onclick="window.TKST_APP.openInviteModal('register')" style="padding: 10px 8px; font-size: 0.82rem; font-weight: 700; border-radius: 8px; display: flex; align-items: center; justify-content: center; gap: 6px; ${!isAccess ? 'box-shadow: 0 4px 12px rgba(255, 183, 3, 0.3);' : ''}">
                <i class="fas fa-user-plus"></i> Novo Cadastro
              </button>
            </div>

            <p style="font-size: 0.85rem; color: #94A3B8; margin-bottom: 14px; line-height: 1.5;">
              ${descText}
            </p>

            <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 14px; margin-bottom: 16px; font-size: 0.85rem; color: #E2E8F0; line-height: 1.5;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <div style="font-size: 0.78rem; color: var(--accent-gold); font-weight: 700; text-transform: uppercase;">
                  <i class="fas fa-comment-dots"></i> ${isAccess ? 'Mensagem com Link do App:' : 'Mensagem Oficial de Convite:'}
                </div>
                <span style="font-size: 0.72rem; color: #64748B; font-family: monospace;">${isAccess ? 'Link Direto' : 'Formulário Cadastro'}</span>
              </div>
              <div id="inviteMsgPreview" style="font-family: monospace; font-size: 0.84rem; white-space: pre-wrap; color: #CBD5E1; background: rgba(0,0,0,0.35); padding: 12px; border-radius: 6px; line-height: 1.6; border: 1px solid rgba(255,255,255,0.06);">${previewText}</div>
            </div>

            <div id="inviteFeedback" style="margin-bottom: 12px;"></div>

            <div style="display: flex; flex-direction: column; gap: 10px;">
              <button type="button" class="btn" onclick="window.TKST_APP.sendInviteWhatsApp('${mode}')" style="width: 100%; padding: 13px; font-weight: 700; background: #25D366; color: #FFF; font-size: 0.95rem; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 15px rgba(37, 211, 102, 0.35); border: none;">
                <i class="fab fa-whatsapp" style="font-size: 1.25rem;"></i> ${isAccess ? 'Enviar Link de Acesso no WhatsApp' : 'Enviar Convite de Cadastro no WhatsApp'}
              </button>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <button type="button" class="btn btn-secondary" onclick="window.TKST_APP.copyInviteText('${mode}')" style="padding: 11px 8px; font-size: 0.84rem; font-weight: 600;">
                  <i class="fas fa-copy"></i> Copiar Mensagem
                </button>
                <button type="button" class="btn btn-secondary" onclick="window.TKST_APP.copyInviteLink('${mode}')" style="padding: 11px 8px; font-size: 0.84rem; font-weight: 600;">
                  <i class="fas fa-link"></i> Copiar Link
                </button>
              </div>
            </div>
          </div>
        `;
      };

      renderInviteBody(initialMode);
      detailModal.classList.add('active');
    },

    sendInviteWhatsApp: (mode = 'access') => {
      const isAccess = mode === 'access';
      const url = isAccess ? 'https://tkst-alunos.pages.dev/' : 'https://tkst-alunos.pages.dev/?cadastro=1';
      const text = isAccess
        ? `OSS!!! 🥋\nAcesse o portal oficial de estudos e treinos TKST Alunos:\n\n👉 *Toque no link abaixo para entrar no app:*\n${url}`
        : `OSS!!! 🥋\nO Sensei Diego convida você para se cadastrar no portal de estudos TKST Alunos.\n\n👉 *Toque no link abaixo para realizar seu cadastro:*\n${url}`;
      const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
      window.open(waUrl, '_blank');
    },

    copyInviteText: (mode = 'access') => {
      const isAccess = mode === 'access';
      const url = isAccess ? 'https://tkst-alunos.pages.dev/' : 'https://tkst-alunos.pages.dev/?cadastro=1';
      const text = isAccess
        ? `OSS!!! 🥋\nAcesse o portal oficial de estudos e treinos TKST Alunos:\n\n👉 Toque no link abaixo para entrar no app:\n${url}`
        : `OSS!!! 🥋\nO Sensei Diego convida você para se cadastrar no portal de estudos TKST Alunos.\n\n👉 Toque no link abaixo para realizar seu cadastro:\n${url}`;
      navigator.clipboard.writeText(text).then(() => {
        const fb = document.getElementById('inviteFeedback');
        if (fb) {
          fb.innerHTML = `<div style="background: rgba(16, 185, 129, 0.2); border: 1px solid #10B981; color: #6EE7B7; padding: 8px 12px; border-radius: 6px; font-size: 0.82rem; text-align: center;"><i class="fas fa-check-circle"></i> Mensagem copiada com sucesso!</div>`;
          setTimeout(() => { if (fb) fb.innerHTML = ''; }, 3000);
        }
      });
    },

    copyInviteLink: (mode = 'access') => {
      const isAccess = mode === 'access';
      const url = isAccess ? 'https://tkst-alunos.pages.dev/' : 'https://tkst-alunos.pages.dev/?cadastro=1';
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

      const hasVideo = !!(term.videoUrl && term.videoUrl.trim().length > 0);
      const embed = hasVideo ? getEmbedUrl(term.videoUrl.trim()) : null;

      modalTitle.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
          <span class="badge badge-amarela" style="font-size: 0.72rem;">${catMap[actualCat] || 'Técnica'}</span>
          <span style="color: #FFF; font-weight: 700;">${term.japanese}</span>
        </div>
      `;

      modalBody.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 10px;">
          
          <!-- Top Card: Kanji, Pronunciation & Meaning -->
          <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 10px 12px; display: flex; flex-direction: column; gap: 10px;">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px; gap: 8px;">
                <div style="font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--accent-gold); font-weight: 700;">
                  Termo Tradicional Shotokan
                </div>
                ${isAdmin ? `
                  <div style="display: inline-flex; align-items: center; gap: 6px;">
                    <button type="button" class="btn btn-sm" onclick="window.TKST_APP.openEditGlossaryTermModal('${actualCat}', '${term.japanese.replace(/'/g, "\\'")}', false)" title="Editar texto e significado do termo" style="font-size: 0.70rem; padding: 3px 9px; background: rgba(255, 183, 3, 0.2); border: 1px solid var(--accent-gold); color: #FFB703; display: inline-flex; align-items: center; gap: 4px; border-radius: var(--radius-sm); margin: 0; cursor: pointer;">
                      <i class="fas fa-edit"></i> <span>Editar</span>
                    </button>
                    <button type="button" class="btn btn-sm btn-danger" onclick="window.TKST_APP.deleteGlossaryTerm('${actualCat}', '${term.japanese.replace(/'/g, "\\'")}'); document.getElementById('detailModal').classList.remove('active');" title="Excluir este termo" style="font-size: 0.70rem; padding: 3px 9px; display: inline-flex; align-items: center; gap: 4px; border-radius: var(--radius-sm); margin: 0; cursor: pointer;">
                      <i class="fas fa-trash"></i> <span>Excluir</span>
                    </button>
                  </div>
                ` : ''}
              </div>
              <h2 style="font-family: var(--font-heading); font-size: 1.25rem; color: #FFF; margin: 0 0 4px 0; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                ${term.japanese}
                ${term.kanji ? `<span style="font-family: var(--font-kanji); color: rgba(255, 183, 3, 0.85); font-size: 1.1rem;">(${term.kanji})</span>` : ''}
              </h2>
              <div style="font-size: 0.84rem; color: #E2E8F0; line-height: 1.4;">
                <strong>Significado:</strong> ${term.meaning}
              </div>
            </div>

            <!-- Action Buttons Bar (Ouvir Pronúncia & Configurar Mídias) -->
            <div style="display: flex; gap: 8px; align-items: center; width: 100%; flex-wrap: nowrap;">
              <button type="button" class="btn btn-sm" onclick="window.TKST_APP.speakJapanese('${term.japanese.replace(/'/g, "\\'")}')" title="Ouvir pronúncia em Japonês" style="flex: 1; min-width: 0; font-size: 0.76rem; padding: 8px; background: rgba(255, 183, 3, 0.15); border: 1px solid var(--accent-gold); color: #FFB703; display: inline-flex; align-items: center; justify-content: center; gap: 5px; white-space: nowrap; border-radius: var(--radius-sm); margin: 0;">
                <i class="fas fa-volume-up"></i> <span>Ouvir Pronúncia</span>
              </button>
              ${isAdmin ? `
                <button type="button" class="btn btn-sm" onclick="window.TKST_APP.openEditGlossaryTermModal('${actualCat}', '${term.japanese.replace(/'/g, "\\'")}', true)" title="Configurar fotos e vídeos do termo" style="flex: 1; min-width: 0; font-size: 0.76rem; padding: 8px; background: rgba(59, 130, 246, 0.2); border: 1px solid var(--accent-blue); color: #60A5FA; display: inline-flex; align-items: center; justify-content: center; gap: 5px; white-space: nowrap; border-radius: var(--radius-sm); margin: 0;">
                  <i class="fas fa-photo-video"></i> <span>Configurar Mídias</span>
                </button>
              ` : ''}
            </div>
          </div>

          <!-- Media Grid: Illustrated Movement + Video Demonstration (Apenas se houver vídeo cadastrado) -->
          <div class="technique-media-grid" style="${hasVideo ? '' : 'grid-template-columns: 1fr;'}">
            
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
                  <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 140px; color: #94A3B8; padding: 20px; text-align: center; gap: 8px;">
                    <i class="fas fa-image" style="font-size: 2.2rem; color: #64748B; opacity: 0.5;"></i>
                    <span style="font-size: 0.88rem; color: #94A3B8; font-weight: 600;">Ainda sem imagem correspondente</span>
                  </div>
                `}
              </div>
            </div>

            ${hasVideo && embed ? `
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

                <button type="button" class="btn" onclick="window.TKST_APP.openVideoModal('${term.japanese.replace(/'/g, "\\'")}', '${term.videoUrl.trim().replace(/'/g, "\\'")}')" style="width: 100%; font-size: 0.78rem; padding: 8px; display: flex; align-items: center; justify-content: center; gap: 6px; background: #DC2626; color: #FFF; font-weight: 700; border: none; border-radius: var(--radius-sm); box-shadow: 0 4px 12px rgba(220, 38, 38, 0.35); cursor: pointer;">
                  <i class="fas fa-expand"></i> Assistir Expandido
                </button>
              </div>
            ` : ''}

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

          <div style="width: 100%;">
            <button type="button" class="btn btn-secondary" onclick="window.TKST_APP.closeDetailModal()" style="width: 100%; padding: 10px; font-weight: 600; font-size: 0.84rem;">
              Fechar
            </button>
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
          const maxDim = 320;
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
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          // Super leve para mobile: ~15KB a 25KB
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.65);

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
            <input type="text" id="newGlossaryVideoUrl" class="form-input" placeholder="https://www.youtube.com/embed/... ou link de vídeo" style="font-size: 0.85rem;">
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
            <button type="button" id="btnAddGlossaryTerm" onclick="window.TKST_APP.submitAddGlossaryTerm();" class="btn btn-primary" style="flex: 2; padding: 12px; font-weight: 700; cursor: pointer;">
              <i class="fas fa-plus-circle"></i> Cadastrar Termo
            </button>
          </div>
        </form>
      `;

      detailModal.classList.add('active');
    },

    submitAddGlossaryTerm: () => {
      try {
        if (!window.TKST_AUTH.isAdmin()) {
          alert('Acesso restrito ao Administrador Geral (Sensei Diego).');
          return;
        }

        const catEl = document.getElementById('newGlossaryCategory');
        const jpEl = document.getElementById('newGlossaryJapanese');
        const kanjiEl = document.getElementById('newGlossaryKanji');
        const meaningEl = document.getElementById('newGlossaryMeaning');
        const imgEl = document.getElementById('newGlossaryImage');
        const videoEl = document.getElementById('newGlossaryVideoUrl');
        const tipsEl = document.getElementById('newGlossaryTips');

        const cat = catEl ? catEl.value : '';
        const japanese = jpEl ? jpEl.value.trim() : '';
        const kanji = kanjiEl ? kanjiEl.value.trim() : '';
        const meaning = meaningEl ? meaningEl.value.trim() : '';
        const image = imgEl ? imgEl.value.trim() : '';
        const videoUrl = videoEl ? videoEl.value.trim() : '';
        const technicalTips = tipsEl ? tipsEl.value.trim() : '';

        if (!cat || !japanese || !meaning) {
          alert('Por favor, preencha o termo em japonês e o seu significado.');
          return;
        }

        const btn = document.getElementById('btnAddGlossaryTerm');
        if (btn) {
          btn.disabled = true;
          btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cadastrando...';
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
          if (typeof showToast === 'function') {
            showToast(`Termo "${japanese}" adicionado com sucesso!`, 'success');
          } else {
            alert(`Termo "${japanese}" adicionado com sucesso ao dicionário!`);
          }
          if (typeof renderGlossary === 'function') {
            renderGlossary();
          }
        } else {
          alert((res && res.error) || 'Erro ao adicionar termo.');
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-plus-circle"></i> Cadastrar Termo';
          }
        }
      } catch(err) {
        console.error('submitAddGlossaryTerm error:', err);
        alert('Erro ao cadastrar termo: ' + err.message);
        const btn = document.getElementById('btnAddGlossaryTerm');
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<i class="fas fa-plus-circle"></i> Cadastrar Termo';
        }
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

    openEditGlossaryTermModal: (categoryKey, japaneseName, focusMedia = false) => {
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

      modalTitle.innerHTML = `<span><i class="fas ${focusMedia ? 'fa-photo-video' : 'fa-edit'}" style="color: var(--accent-gold);"></i> ${focusMedia ? 'Configurar Mídias' : 'Editar Termo'}: ${term.japanese} (Admin)</span>`;

      modalBody.innerHTML = `
        <form id="editGlossaryForm" novalidate onsubmit="event.preventDefault(); window.TKST_APP.submitEditGlossaryTerm();" style="display: flex; flex-direction: column; gap: 14px;">
          <input type="hidden" id="editGlossaryOldCategory" value="${actualCat}">
          <input type="hidden" id="editGlossaryOldJapanese" value="${term.japanese.replace(/"/g, '&quot;')}">

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
            <input type="text" id="editGlossaryVideoUrl" class="form-input" value="${(term.videoUrl || '').replace(/"/g, '&quot;')}" placeholder="https://www.youtube.com/embed/... ou link de vídeo" style="font-size: 0.85rem;">
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
            <button type="button" id="btnSaveGlossaryTerm" onclick="window.TKST_APP.submitEditGlossaryTerm();" class="btn btn-primary" style="flex: 2; padding: 12px; font-weight: 700; cursor: pointer;">
              <i class="fas fa-save"></i> Salvar Alterações
            </button>
          </div>
        </form>
      `;

      detailModal.classList.add('active');

      if (focusMedia) {
        setTimeout(() => {
          const mediaEl = document.getElementById('editGlossaryFileInput') || document.getElementById('editGlossaryImage') || document.getElementById('editGlossaryVideoUrl');
          if (mediaEl) {
            mediaEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            mediaEl.focus();
          }
        }, 150);
      }
    },

    submitEditGlossaryTerm: (oldCategoryArg, oldJapaneseNameArg) => {
      try {
        if (!window.TKST_AUTH.isAdmin()) {
          alert('Acesso restrito aos administradores (Sensei Diego).');
          return;
        }

        const oldCategory = oldCategoryArg || (document.getElementById('editGlossaryOldCategory') && document.getElementById('editGlossaryOldCategory').value);
        const oldJapaneseName = oldJapaneseNameArg || (document.getElementById('editGlossaryOldJapanese') && document.getElementById('editGlossaryOldJapanese').value);

        const categoryEl = document.getElementById('editGlossaryCategory');
        const jpEl = document.getElementById('editGlossaryJapanese');
        const kanjiEl = document.getElementById('editGlossaryKanji');
        const meaningEl = document.getElementById('editGlossaryMeaning');
        const imageEl = document.getElementById('editGlossaryImage');
        const videoEl = document.getElementById('editGlossaryVideoUrl');
        const tipsEl = document.getElementById('editGlossaryTips');

        const newCategory = categoryEl ? categoryEl.value : '';
        const japanese = jpEl ? jpEl.value.trim() : '';
        const kanji = kanjiEl ? kanjiEl.value.trim() : '';
        const meaning = meaningEl ? meaningEl.value.trim() : '';
        const image = imageEl ? imageEl.value.trim() : '';
        const videoUrl = videoEl ? videoEl.value.trim() : '';
        const technicalTips = tipsEl ? tipsEl.value.trim() : '';

        if (!newCategory || !japanese || !meaning) {
          alert('Por favor, preencha o termo em japonês e o seu significado.');
          return;
        }

        const btn = document.getElementById('btnSaveGlossaryTerm');
        if (btn) {
          btn.disabled = true;
          btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
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
          if (typeof showToast === 'function') {
            showToast(`Termo "${japanese}" atualizado com sucesso no dicionário!`, 'success');
          } else {
            alert(`Termo "${japanese}" atualizado com sucesso no dicionário!`);
          }
          if (typeof renderGlossary === 'function') {
            renderGlossary();
          }
        } else {
          alert((res && res.error) || 'Erro ao atualizar termo.');
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save"></i> Salvar Alterações';
          }
        }
      } catch(err) {
        console.error('submitEditGlossaryTerm error:', err);
        alert('Erro ao salvar termo: ' + err.message);
        const btn = document.getElementById('btnSaveGlossaryTerm');
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<i class="fas fa-save"></i> Salvar Alterações';
        }
      }
    },
    openEditStudentModal: (studentId) => {
      if (!window.TKST_AUTH.canManageStudents()) {
        alert('Apenas o Administrador Master (Sensei Diego) pode editar cadastros de alunos.');
        return;
      }

      const students = window.TKST_AUTH.getAllStudents();
      const s = students.find(item => item.id === studentId);
      if (!s) {
        alert('Aluno não encontrado na base.');
        return;
      }

      const isMaster = s.username === 'irons365';
      const canManageCreds = window.TKST_AUTH.canManageCredentials();
      const dojos = window.TKST_AUTH.getDojos();

      const modal = document.getElementById('detailModal');
      const modalTitle = document.getElementById('detailModalTitle');
      const modalBody = document.getElementById('detailModalBody');

      modal.setAttribute('data-prevent-outside-close', 'true');
      modalTitle.innerHTML = `<span><i class="fas fa-user-edit" style="color: var(--accent-gold);"></i> Editar Cadastro do Aluno</span>`;

      const belts = [
        'Faixa Branca (7º Kyu)',
        'Faixa Amarela (6º Kyu)',
        'Faixa Vermelha (5º Kyu)',
        'Faixa Laranja (4º Kyu)',
        'Faixa Verde (3º Kyu)',
        'Faixa Roxa (2º Kyu)',
        'Faixa Marrom (1º Kyu)',
        'Faixa Preta (Shodan - 1º Dan)',
        'Faixa Preta (Nidan - 2º Dan)',
        'Faixa Preta (Sandan - 3º Dan)',
        'Faixa Preta (Sensei Master)'
      ];

      modalBody.innerHTML = `
        <form onsubmit="event.preventDefault(); window.TKST_APP.submitEditStudent('${s.id}');" style="display: flex; flex-direction: column; gap: 12px;">
          <div style="background: rgba(255,183,3,0.08); border: 1px solid rgba(255,183,3,0.3); border-radius: var(--radius-sm); padding: 10px 12px; font-size: 0.8rem; color: #E2E8F0;">
            <i class="fas fa-key" style="color: var(--accent-gold); margin-right: 6px;"></i>
            <strong>Gerenciamento Sensei:</strong> Altere os dados ou <strong>redefina a senha</strong> caso o aluno tenha esquecido.
          </div>

          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 0.8rem; margin-bottom: 4px;">
              <i class="fas fa-user" style="color: var(--accent-gold); margin-right: 6px;"></i> Nome Completo do Aluno:
            </label>
            <input type="text" id="editStudentName" class="form-input" required value="${(s.name || '').replace(/"/g, '&quot;')}" style="font-size: 0.9rem; font-weight: 600;">
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 0.8rem; margin-bottom: 4px;">
                <i class="fas fa-at" style="color: var(--accent-gold); margin-right: 6px;"></i> Login (Nick):
              </label>
              <input type="text" id="editStudentUsername" class="form-input" required value="${(s.username || '').replace(/"/g, '&quot;')}" style="font-size: 0.88rem; font-weight: 600;" ${isMaster ? 'readonly title="Não é possível alterar o login master"' : ''}>
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 0.8rem; margin-bottom: 4px;">
                <i class="fas fa-lock" style="color: var(--accent-gold); margin-right: 6px;"></i> Senha de Acesso:
              </label>
              <div style="position: relative;">
                <input type="text" id="editStudentPassword" class="form-input" value="${(s.password || '1234').replace(/"/g, '&quot;')}" placeholder="Nova senha..." style="font-size: 0.88rem; font-weight: 700; color: var(--accent-gold); padding-right: 32px;">
                <i class="fas fa-key" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: #64748B; font-size: 0.8rem;"></i>
              </div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 0.8rem; margin-bottom: 4px;">
                <i class="fas fa-ribbon" style="color: var(--accent-gold); margin-right: 6px;"></i> Faixa / Graduação:
              </label>
              <select id="editStudentBelt" class="form-input" required style="font-size: 0.82rem;">
                ${belts.map(b => `
                  <option value="${b}" ${((s.currentBelt || '').toLowerCase().includes(b.split(' ')[1]?.toLowerCase() || 'xyz') || s.currentBelt === b) ? 'selected' : ''}>
                    ${b}
                  </option>
                `).join('')}
              </select>
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 0.8rem; margin-bottom: 4px;">
                <i class="fas fa-torii-gate" style="color: var(--accent-gold); margin-right: 6px;"></i> Dojo / Unidade:
              </label>
              <select id="editStudentDojo" class="form-input" required style="font-size: 0.82rem;">
                ${dojos.map(d => `
                  <option value="${d}" ${(s.dojo === d || (s.dojo || '').toLowerCase() === d.toLowerCase()) ? 'selected' : ''}>
                    ${d}
                  </option>
                `).join('')}
              </select>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 0.8rem; margin-bottom: 4px;">
                <i class="fab fa-whatsapp" style="color: var(--accent-emerald); margin-right: 6px;"></i> Telefone / WhatsApp:
              </label>
              <input type="text" id="editStudentPhone" class="form-input" value="${(s.phone || '').replace(/"/g, '&quot;')}" placeholder="(21) 9...." style="font-size: 0.85rem;">
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 0.8rem; margin-bottom: 4px;">
                <i class="fas fa-user-shield" style="color: var(--accent-gold); margin-right: 6px;"></i> Credencial / Permissão:
              </label>
              <select id="editStudentRole" class="form-input" style="font-size: 0.82rem; font-weight: 700;" ${(isMaster || !canManageCreds) ? 'disabled title="Apenas o Administrador Master pode alterar credenciais"' : ''}>
                <option value="aluno" ${s.role !== 'admin' ? 'selected' : ''}>🥋 Aluno (Acesso padrão aos treinos)</option>
                <option value="admin" ${s.role === 'admin' ? 'selected' : ''}>⭐ Administrador (Acesso ao Painel Sensei)</option>
              </select>
            </div>
          </div>

          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 0.8rem; margin-bottom: 4px;">
              <i class="fas fa-sticky-note" style="color: var(--accent-gold); margin-right: 6px;"></i> Observações do Sensei (Opcional):
            </label>
            <textarea id="editStudentNotes" class="form-input" rows="2" placeholder="Observações do exame, notas técnicas..." style="resize: vertical; font-size: 0.82rem;">${(s.notes || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
          </div>

          <div style="display: flex; gap: 10px; margin-top: 6px;">
            <button type="button" class="btn btn-secondary" onclick="window.TKST_APP.cancelModalEdit()" style="flex: 1; padding: 11px; font-size: 0.85rem;">
              Cancelar
            </button>
            <button type="submit" class="btn btn-primary" style="flex: 2; padding: 11px; font-weight: 700; font-size: 0.85rem;">
              <i class="fas fa-save"></i> Salvar Cadastro
            </button>
          </div>
        </form>
      `;

      modal.classList.add('active');
    },

    toggleAdminRole: (studentId, newRole) => {
      if (!window.TKST_AUTH.canManageCredentials()) {
        alert('Apenas o Sensei Diego pode alterar credenciais de administrador.');
        return;
      }
      const students = window.TKST_AUTH.getAllStudents();
      const student = students.find(s => s.id === studentId);
      if (!student) return;
      if (student.username === 'irons365') {
        alert('Não é possível alterar o cargo do Administrador Master.');
        return;
      }

      const roleName = newRole === 'admin' ? '⭐ Administrador' : '🥋 Aluno';
      const confirmAction = confirm(`Deseja alterar a credencial de "${student.name}" para ${roleName}?`);
      if (!confirmAction) return;

      const res = window.TKST_AUTH.adminUpdateStudent(studentId, { role: newRole });
      if (res && res.success) {
        showToast(`⭐ Credencial de ${student.name} atualizada para ${roleName}!`, 'success', 4000);
        renderAdminMaster();
      } else {
        alert((res && res.message) || 'Erro ao alterar credencial.');
      }
    },

    submitEditStudent: (studentId) => {
      if (!window.TKST_AUTH.canManageStudents()) {
        alert('Apenas o Administrador Master (Sensei Diego) pode salvar alterações de alunos.');
        return;
      }

      const name = document.getElementById('editStudentName').value.trim();
      const username = document.getElementById('editStudentUsername').value.trim();
      const password = document.getElementById('editStudentPassword').value.trim();
      const currentBelt = document.getElementById('editStudentBelt').value;
      const dojo = document.getElementById('editStudentDojo').value;
      const phone = document.getElementById('editStudentPhone').value.trim();
      const role = document.getElementById('editStudentRole') ? document.getElementById('editStudentRole').value : 'aluno';
      const notes = document.getElementById('editStudentNotes').value.trim();

      if (!name || !username) {
        alert('Por favor, preencha o Nome e o Login do aluno.');
        return;
      }

      const res = window.TKST_AUTH.adminUpdateStudent(studentId, {
        name,
        username,
        password,
        currentBelt,
        dojo,
        phone,
        role,
        status: 'approved',
        notes
      });

      if (res && res.success) {
        window.TKST_APP.cancelModalEdit();
        showToast(`✅ Cadastro de ${name} atualizado! [Credencial: ${role === 'admin' ? '⭐ Administrador' : '🥋 Aluno'}]`, 'success', 4000);
        renderAdminMaster();
      } else {
        alert((res && res.message) || 'Erro ao atualizar aluno.');
      }
    },
    closeDetailModal: () => {
      const modal = document.getElementById('detailModal');
      if (modal) {
        modal.removeAttribute('data-prevent-outside-close');
        modal.classList.remove('active');
        stopModalMedia(modal);
      }
    },
    closeModal: () => {
      window.TKST_APP.closeDetailModal();
    },
    closeVideoModal: () => {
      const modal = document.getElementById('videoModal');
      if (modal) {
        modal.classList.remove('active');
        stopModalMedia(modal);
      }
    },
    cancelModalEdit: () => {
      const modal = document.getElementById('detailModal');
      if (modal) {
        modal.removeAttribute('data-prevent-outside-close');
        modal.classList.remove('active');
        stopModalMedia(modal);
      }
    },

    // =========================================================================
    // STUDY PLAN (CURRICULUM) AUTONOMOUS MANAGEMENT (Admin Only)
    // =========================================================================
    openEditCurriculumTechniqueModal: (kyuNumber, sectionKey, index) => {
      if (!window.TKST_AUTH || !window.TKST_AUTH.isAdmin()) {
        alert('Acesso restrito ao administrador (Sensei Diego).');
        return;
      }
      const belt = window.TKST_AUTH.getBeltCurriculum(kyuNumber);
      if (!belt) {
        alert('Graduação não encontrada.');
        return;
      }

      const modalTitle = document.getElementById('detailModalTitle');
      const modalBody = document.getElementById('detailModalBody');
      const modal = document.getElementById('detailModal');
      if (!modal || !modalTitle || !modalBody) return;

      modal.setAttribute('data-prevent-outside-close', 'true');

      let titleHtml = '';
      let formBodyHtml = '';

      const isShodan = belt.shodanProgram && ['teWaza', 'ukeWaza', 'ashiWaza', 'dachiWaza'].includes(sectionKey);

      if (isShodan) {
        const sectionNames = {
          teWaza: 'Te Waza (Técnicas de Mãos)',
          ukeWaza: 'Uke Waza (Defesas)',
          ashiWaza: 'Ashi Waza / Geri (Pernas e Chutes)',
          dachiWaza: 'Dachi Waza (Bases e Movimentação)'
        };
        const list = belt.shodanProgram[sectionKey] || [];
        const item = list[index];
        if (!item) {
          alert('Técnica não encontrada.');
          return;
        }

        titleHtml = `<span><i class="fas fa-edit" style="color: var(--accent-gold);"></i> Editar Técnica: ${belt.beltName}</span>`;

        formBodyHtml = `
          <form onsubmit="event.preventDefault(); window.TKST_APP.submitEditCurriculumTechnique(${kyuNumber}, '${sectionKey}', ${index});" style="display: flex; flex-direction: column; gap: 14px;">
            <div style="background: rgba(255,183,3,0.08); border: 1px solid rgba(255,183,3,0.25); border-radius: var(--radius-sm); padding: 10px 12px; font-size: 0.82rem; color: #E2E8F0;">
              <i class="fas fa-layer-group" style="color: var(--accent-gold); margin-right: 6px;"></i>
              <strong>Coluna Shodan:</strong> ${sectionNames[sectionKey] || sectionKey} • Posição: #${index + 1}
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 0.82rem; margin-bottom: 4px; color: #FFF; font-weight: 700;">
                Nome da Técnica / Base: *
              </label>
              <input type="text" id="editTechName" class="form-input" required value="${(item.name || '').replace(/"/g, '&quot;')}" placeholder="Ex: Oi Tsuki / Mae Geri" style="font-size: 0.92rem; font-weight: 600;">
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label" style="font-size: 0.82rem; margin-bottom: 4px; color: #FFF; font-weight: 700;">
                  Direção / Movimentação:
                </label>
                <select id="editTechDirection" class="form-input" onchange="const a = document.getElementById('editTechArrow'); if (a) { a.value = (this.value === 'Sagate' ? '⬅' : (this.value === 'Mae / Mawate' ? '🔄' : '➡')); }" style="font-size: 0.88rem;">
                  <option value="Mae" ${item.direction === 'Mae' ? 'selected' : ''}>➡ Mae (Avanço)</option>
                  <option value="Sagate" ${item.direction === 'Sagate' ? 'selected' : ''}>⬅ Sagate (Recuo)</option>
                  <option value="Mae / Mawate" ${(item.direction === 'Mae / Mawate' || item.direction === 'Mawate') ? 'selected' : ''}>🔄 Mae / Mawate (Avanço e Giro)</option>
                </select>
              </div>

              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label" style="font-size: 0.82rem; margin-bottom: 4px; color: #FFF; font-weight: 700;">
                  Seta / Símbolo:
                </label>
                <select id="editTechArrow" class="form-input" style="font-size: 0.88rem;">
                  <option value="➡" ${item.arrow === '➡' ? 'selected' : ''}>➡ (Avanço)</option>
                  <option value="⬅" ${item.arrow === '⬅' ? 'selected' : ''}>⬅ (Recuo)</option>
                  <option value="🔄" ${item.arrow === '🔄' ? 'selected' : ''}>🔄 (Giro)</option>
                </select>
              </div>
            </div>

            <div style="display: flex; gap: 10px; margin-top: 8px;">
              <button type="button" class="btn btn-secondary" onclick="window.TKST_APP.closeDetailModal()" style="flex: 1; padding: 11px;">
                Cancelar
              </button>
              <button type="submit" class="btn btn-primary" style="flex: 2; padding: 11px; font-weight: 700;">
                <i class="fas fa-save"></i> Salvar Alteração
              </button>
            </div>
          </form>
        `;
      } else if (sectionKey === 'kihon') {
        const list = belt.kihon || [];
        const item = list[index];
        if (!item) {
          alert('Técnica de Kihon não encontrada.');
          return;
        }

        titleHtml = `<span><i class="fas fa-edit" style="color: var(--accent-gold);"></i> Editar Kihon: ${belt.beltName}</span>`;

        formBodyHtml = `
          <form onsubmit="event.preventDefault(); window.TKST_APP.submitEditCurriculumTechnique(${kyuNumber}, 'kihon', ${index});" style="display: flex; flex-direction: column; gap: 14px;">
            <div style="background: rgba(255,183,3,0.08); border: 1px solid rgba(255,183,3,0.25); border-radius: var(--radius-sm); padding: 10px 12px; font-size: 0.82rem; color: #E2E8F0;">
              <i class="fas fa-fist-raised" style="color: var(--accent-crimson); margin-right: 6px;"></i>
              <strong>Kihon Oficial TKST:</strong> Técnica #${index + 1} para exame de ${belt.beltName}
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 0.82rem; margin-bottom: 4px; color: #FFF; font-weight: 700;">
                Nome da Técnica / Sequência: *
              </label>
              <input type="text" id="editTechName" class="form-input" required value="${(item.technique || '').replace(/"/g, '&quot;')}" placeholder="Ex: Chudan Oi Tsuki / Mae Geri" style="font-size: 0.92rem; font-weight: 600;">
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label" style="font-size: 0.82rem; margin-bottom: 4px; color: #FFF; font-weight: 700;">
                  Base / Postura:
                </label>
                <input type="text" id="editTechStance" class="form-input" value="${(item.stance || '').replace(/"/g, '&quot;')}" placeholder="Ex: Zenkutsu Dachi, Kokutsu Dachi" style="font-size: 0.88rem;">
              </div>

              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label" style="font-size: 0.82rem; margin-bottom: 4px; color: #FFF; font-weight: 700;">
                  Direção / Deslocamento:
                </label>
                <input type="text" id="editTechDirection" class="form-input" value="${(item.direction || '').replace(/"/g, '&quot;')}" placeholder="Ex: Mae (Avanço), Sagate (Recuo)" style="font-size: 0.88rem;">
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label" style="font-size: 0.82rem; margin-bottom: 4px; color: #FFF; font-weight: 700;">
                  Repetições / Contagem:
                </label>
                <input type="text" id="editTechCount" class="form-input" value="${(item.count || '').replace(/"/g, '&quot;')}" placeholder="Ex: 5 vezes (Go Kai), 3x" style="font-size: 0.88rem;">
              </div>

              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label" style="font-size: 0.82rem; margin-bottom: 4px; color: #FFF; font-weight: 700;">
                  Foco Técnico / Detalhe (Opcional):
                </label>
                <input type="text" id="editTechFocus" class="form-input" value="${(item.focus || '').replace(/"/g, '&quot;')}" placeholder="Ex: Quadril em Shomen, Kime" style="font-size: 0.88rem;">
              </div>
            </div>

            <div style="display: gap: 10px; margin-top: 8px; display: flex;">
              <button type="button" class="btn btn-secondary" onclick="window.TKST_APP.closeDetailModal()" style="flex: 1; padding: 11px;">
                Cancelar
              </button>
              <button type="submit" class="btn btn-primary" style="flex: 2; padding: 11px; font-weight: 700;">
                <i class="fas fa-save"></i> Salvar Técnica
              </button>
            </div>
          </form>
        `;
      } else if (sectionKey === 'geri') {
        const list = belt.geri || [];
        const item = list[index];
        if (!item) {
          alert('Técnica de chute não encontrada.');
          return;
        }

        titleHtml = `<span><i class="fas fa-edit" style="color: var(--accent-gold);"></i> Editar Geri Waza: ${belt.beltName}</span>`;

        formBodyHtml = `
          <form onsubmit="event.preventDefault(); window.TKST_APP.submitEditCurriculumTechnique(${kyuNumber}, 'geri', ${index});" style="display: flex; flex-direction: column; gap: 14px;">
            <div style="background: rgba(255,183,3,0.08); border: 1px solid rgba(255,183,3,0.25); border-radius: var(--radius-sm); padding: 10px 12px; font-size: 0.82rem; color: #E2E8F0;">
              <i class="fas fa-shoe-prints" style="color: #F5BE00; margin-right: 6px;"></i>
              <strong>Geri Waza:</strong> Sequência de chute #${index + 1}
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 0.82rem; margin-bottom: 4px; color: #FFF; font-weight: 700;">
                Nome do Chute / Sequência: *
              </label>
              <input type="text" id="editTechName" class="form-input" required value="${(item.name || '').replace(/"/g, '&quot;')}" placeholder="Ex: Mae Geri Keage" style="font-size: 0.92rem; font-weight: 600;">
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 0.82rem; margin-bottom: 4px; color: #FFF; font-weight: 700;">
                Detalhe da Execução / Observações:
              </label>
              <textarea id="editTechDetail" class="form-input" rows="3" placeholder="Ex: Chudan ou Jodan, perna de trás com retorno à base..." style="resize: vertical; font-size: 0.88rem;">${(item.detail || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
            </div>

            <div style="display: flex; gap: 10px; margin-top: 8px;">
              <button type="button" class="btn btn-secondary" onclick="window.TKST_APP.closeDetailModal()" style="flex: 1; padding: 11px;">
                Cancelar
              </button>
              <button type="submit" class="btn btn-primary" style="flex: 2; padding: 11px; font-weight: 700;">
                <i class="fas fa-save"></i> Salvar Chute
              </button>
            </div>
          </form>
        `;
      } else if (sectionKey === 'ukemi') {
        const list = belt.ukemi || [];
        const item = list[index];
        if (!item) {
          alert('Técnica de Ukemi não encontrada.');
          return;
        }

        titleHtml = `<span><i class="fas fa-edit" style="color: var(--accent-gold);"></i> Editar Ukemi: ${belt.beltName}</span>`;

        formBodyHtml = `
          <form onsubmit="event.preventDefault(); window.TKST_APP.submitEditCurriculumTechnique(${kyuNumber}, 'ukemi', ${index});" style="display: flex; flex-direction: column; gap: 14px;">
            <div style="background: rgba(255,183,3,0.08); border: 1px solid rgba(255,183,3,0.25); border-radius: var(--radius-sm); padding: 10px 12px; font-size: 0.82rem; color: #E2E8F0;">
              <i class="fas fa-user-ninja" style="color: #10B981; margin-right: 6px;"></i>
              <strong>Ukemi Waza:</strong> Queda ou rolamento #${index + 1}
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 0.82rem; margin-bottom: 4px; color: #FFF; font-weight: 700;">
                Nome do Ukemi / Rolamento: *
              </label>
              <input type="text" id="editTechName" class="form-input" required value="${(item.name || '').replace(/"/g, '&quot;')}" placeholder="Ex: Ushiro Ukemi" style="font-size: 0.92rem; font-weight: 600;">
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 0.82rem; margin-bottom: 4px; color: #FFF; font-weight: 700;">
                Detalhe da Execução / Amortecimento:
              </label>
              <textarea id="editTechDetail" class="form-input" rows="3" placeholder="Ex: Queda amortecida para trás com queixo no peito e batida de braços 45°..." style="resize: vertical; font-size: 0.88rem;">${(item.detail || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
            </div>

            <div style="display: flex; gap: 10px; margin-top: 8px;">
              <button type="button" class="btn btn-secondary" onclick="window.TKST_APP.closeDetailModal()" style="flex: 1; padding: 11px;">
                Cancelar
              </button>
              <button type="submit" class="btn btn-primary" style="flex: 2; padding: 11px; font-weight: 700;">
                <i class="fas fa-save"></i> Salvar Queda
              </button>
            </div>
          </form>
        `;
      } else if (sectionKey === 'dachiWaza') {
        const list = belt.dachiWaza || [];
        const item = list[index];
        const nameVal = typeof item === 'string' ? item : (item?.name || '');

        titleHtml = `<span><i class="fas fa-edit" style="color: var(--accent-gold);"></i> Editar Base Dachi Waza: ${belt.beltName}</span>`;

        formBodyHtml = `
          <form onsubmit="event.preventDefault(); window.TKST_APP.submitEditCurriculumTechnique(${kyuNumber}, 'dachiWaza', ${index});" style="display: flex; flex-direction: column; gap: 14px;">
            <div style="background: rgba(255,183,3,0.08); border: 1px solid rgba(255,183,3,0.25); border-radius: var(--radius-sm); padding: 10px 12px; font-size: 0.82rem; color: #E2E8F0;">
              <i class="fas fa-layer-group" style="color: #8B5CF6; margin-right: 6px;"></i>
              <strong>Dachi Waza:</strong> Base avaliada #${index + 1}
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 0.82rem; margin-bottom: 4px; color: #FFF; font-weight: 700;">
                Nome da Base (Dachi): *
              </label>
              <input type="text" id="editTechName" class="form-input" required value="${nameVal.replace(/"/g, '&quot;')}" placeholder="Ex: Zenkutsu Dachi" style="font-size: 0.92rem; font-weight: 600;">
            </div>

            <div style="display: flex; gap: 10px; margin-top: 8px;">
              <button type="button" class="btn btn-secondary" onclick="window.TKST_APP.closeDetailModal()" style="flex: 1; padding: 11px;">
                Cancelar
              </button>
              <button type="submit" class="btn btn-primary" style="flex: 2; padding: 11px; font-weight: 700;">
                <i class="fas fa-save"></i> Salvar Base
              </button>
            </div>
          </form>
        `;
      }

      modalTitle.innerHTML = titleHtml;
      modalBody.innerHTML = formBodyHtml;
      modal.classList.add('active');
    },

    submitEditCurriculumTechnique: (kyuNumber, sectionKey, index) => {
      if (!window.TKST_AUTH || !window.TKST_AUTH.isAdmin()) {
        alert('Acesso restrito ao administrador.');
        return;
      }

      const nameEl = document.getElementById('editTechName');
      if (!nameEl || !nameEl.value.trim()) {
        alert('Por favor, informe o nome da técnica.');
        return;
      }

      const name = nameEl.value.trim();
      let updatedData = {};

      const belt = window.TKST_AUTH.getBeltCurriculum(kyuNumber);
      const isShodan = belt && belt.shodanProgram && ['teWaza', 'ukeWaza', 'ashiWaza', 'dachiWaza'].includes(sectionKey);

      if (isShodan) {
        const direction = document.getElementById('editTechDirection')?.value || 'Mae';
        const arrow = document.getElementById('editTechArrow')?.value || (direction === 'Sagate' ? '⬅' : (direction === 'Mae / Mawate' ? '🔄' : '➡'));
        updatedData = { name, direction, arrow };
      } else if (sectionKey === 'kihon') {
        const stance = document.getElementById('editTechStance')?.value.trim() || '';
        const direction = document.getElementById('editTechDirection')?.value.trim() || '';
        const count = document.getElementById('editTechCount')?.value.trim() || '';
        const focus = document.getElementById('editTechFocus')?.value.trim() || '';
        updatedData = { technique: name, stance, direction, count, focus };
      } else if (sectionKey === 'geri' || sectionKey === 'ukemi') {
        const detail = document.getElementById('editTechDetail')?.value.trim() || '';
        updatedData = { name, detail };
      } else if (sectionKey === 'dachiWaza') {
        updatedData = name;
      }

      const res = window.TKST_AUTH.updateCurriculumTechnique(kyuNumber, sectionKey, index, updatedData);
      if (res && res.success) {
        window.TKST_APP.closeDetailModal();
        if (typeof showToast === 'function') {
          showToast('✅ Técnica atualizada e sincronizada com sucesso!', 'success');
        } else {
          alert('Técnica atualizada com sucesso!');
        }
        renderMyExam();
      } else {
        alert((res && res.error) || 'Erro ao salvar alteração da técnica.');
      }
    },

    openAddCurriculumTechniqueModal: (kyuNumber, defaultSectionKey) => {
      if (!window.TKST_AUTH || !window.TKST_AUTH.isAdmin()) {
        alert('Acesso restrito ao administrador (Sensei Diego).');
        return;
      }
      const belt = window.TKST_AUTH.getBeltCurriculum(kyuNumber);
      if (!belt) {
        alert('Graduação não encontrada.');
        return;
      }

      const modalTitle = document.getElementById('detailModalTitle');
      const modalBody = document.getElementById('detailModalBody');
      const modal = document.getElementById('detailModal');
      if (!modal || !modalTitle || !modalBody) return;

      modal.setAttribute('data-prevent-outside-close', 'true');

      modalTitle.innerHTML = `<span><i class="fas fa-plus-circle" style="color: var(--accent-gold);"></i> Adicionar Técnica: ${belt.beltName}</span>`;

      let sectionOptions = [];
      if (belt.shodanProgram) {
        sectionOptions = [
          { key: 'teWaza', label: 'Te Waza (Técnicas de Mãos)' },
          { key: 'ukeWaza', label: 'Uke Waza (Defesas)' },
          { key: 'ashiWaza', label: 'Ashi Waza / Geri (Pernas e Chutes)' },
          { key: 'dachiWaza', label: 'Dachi Waza (Bases e Movimentação)' }
        ];
      } else {
        sectionOptions.push({ key: 'kihon', label: 'Kihon (Técnicas Fundamentais)' });
        if (belt.geri || defaultSectionKey === 'geri') {
          sectionOptions.push({ key: 'geri', label: 'Geri Waza (Técnicas de Chutes)' });
        }
        if (belt.ukemi || defaultSectionKey === 'ukemi') {
          sectionOptions.push({ key: 'ukemi', label: 'Ukemi (Quedas & Rolamentos)' });
        }
        if (belt.dachiWaza || defaultSectionKey === 'dachiWaza') {
          sectionOptions.push({ key: 'dachiWaza', label: 'Dachi Waza (Bases Exigidas)' });
        }
      }

      const selectedKey = (defaultSectionKey && sectionOptions.some(o => o.key === defaultSectionKey)) ? defaultSectionKey : sectionOptions[0].key;

      modalBody.innerHTML = `
        <form onsubmit="event.preventDefault(); window.TKST_APP.submitAddCurriculumTechnique(${kyuNumber});" style="display: flex; flex-direction: column; gap: 14px;">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 0.82rem; margin-bottom: 4px; color: #FFF; font-weight: 700;">
              <i class="fas fa-folder" style="color: var(--accent-gold); margin-right: 6px;"></i> Seção do Plano de Estudos:
            </label>
            <select id="addTechSection" class="form-input" onchange="window.TKST_APP.updateAddCurriculumFields(this.value, ${kyuNumber})" style="font-size: 0.88rem; font-weight: 600;">
              ${sectionOptions.map(opt => `
                <option value="${opt.key}" ${opt.key === selectedKey ? 'selected' : ''}>${opt.label}</option>
              `).join('')}
            </select>
          </div>

          <div id="addTechFieldsContainer">
            <!-- Dynamic fields -->
          </div>

          <div style="display: flex; gap: 10px; margin-top: 8px;">
            <button type="button" class="btn btn-secondary" onclick="window.TKST_APP.closeDetailModal()" style="flex: 1; padding: 11px;">
              Cancelar
            </button>
            <button type="submit" class="btn btn-primary" style="flex: 2; padding: 11px; font-weight: 700;">
              <i class="fas fa-plus"></i> Inserir Técnica
            </button>
          </div>
        </form>
      `;

      window.TKST_APP.updateAddCurriculumFields(selectedKey, kyuNumber);
      modal.classList.add('active');
    },

    updateAddCurriculumFields: (sectionKey, kyuNumber) => {
      const container = document.getElementById('addTechFieldsContainer');
      if (!container) return;

      const belt = window.TKST_AUTH.getBeltCurriculum(kyuNumber);
      const isShodan = belt && belt.shodanProgram && ['teWaza', 'ukeWaza', 'ashiWaza', 'dachiWaza'].includes(sectionKey);

      if (isShodan) {
        container.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 12px;">
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 0.82rem; margin-bottom: 4px; color: #FFF; font-weight: 700;">
                Nome da Técnica / Base: *
              </label>
              <input type="text" id="addTechName" class="form-input" required placeholder="Ex: Oi Tsuki / Uraken Uchi" style="font-size: 0.92rem; font-weight: 600;">
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label" style="font-size: 0.82rem; margin-bottom: 4px; color: #FFF; font-weight: 700;">
                  Direção / Movimentação:
                </label>
                <select id="addTechDirection" class="form-input" onchange="const a = document.getElementById('addTechArrow'); if (a) { a.value = (this.value === 'Sagate' ? '⬅' : (this.value === 'Mae / Mawate' ? '🔄' : '➡')); }" style="font-size: 0.88rem;">
                  <option value="Mae">➡ Mae (Avanço)</option>
                  <option value="Sagate">⬅ Sagate (Recuo)</option>
                  <option value="Mae / Mawate">🔄 Mae / Mawate (Avanço e Giro)</option>
                </select>
              </div>

              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label" style="font-size: 0.82rem; margin-bottom: 4px; color: #FFF; font-weight: 700;">
                  Seta / Símbolo:
                </label>
                <select id="addTechArrow" class="form-input" style="font-size: 0.88rem;">
                  <option value="➡">➡ (Avanço)</option>
                  <option value="⬅">⬅ (Recuo)</option>
                  <option value="🔄">🔄 (Giro)</option>
                </select>
              </div>
            </div>
          </div>
        `;
      } else if (sectionKey === 'kihon') {
        container.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 12px;">
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 0.82rem; margin-bottom: 4px; color: #FFF; font-weight: 700;">
                Nome da Técnica / Sequência: *
              </label>
              <input type="text" id="addTechName" class="form-input" required placeholder="Ex: Chudan Gyaku Tsuki" style="font-size: 0.92rem; font-weight: 600;">
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label" style="font-size: 0.82rem; margin-bottom: 4px; color: #FFF; font-weight: 700;">
                  Base / Postura:
                </label>
                <input type="text" id="addTechStance" class="form-input" placeholder="Ex: Zenkutsu Dachi" style="font-size: 0.88rem;" value="Zenkutsu Dachi">
              </div>

              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label" style="font-size: 0.82rem; margin-bottom: 4px; color: #FFF; font-weight: 700;">
                  Direção / Deslocamento:
                </label>
                <input type="text" id="addTechDirection" class="form-input" placeholder="Ex: Mae (Avanço) ou Sagate (Recuo)" style="font-size: 0.88rem;" value="Mae (Avanço)">
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label" style="font-size: 0.82rem; margin-bottom: 4px; color: #FFF; font-weight: 700;">
                  Repetições / Contagem:
                </label>
                <input type="text" id="addTechCount" class="form-input" placeholder="Ex: 5 vezes (Go Kai) ou 3x" style="font-size: 0.88rem;" value="5 vezes (Go Kai)">
              </div>

              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label" style="font-size: 0.82rem; margin-bottom: 4px; color: #FFF; font-weight: 700;">
                  Foco Técnico / Observação:
                </label>
                <input type="text" id="addTechFocus" class="form-input" placeholder="Ex: Quadril em Shomen no Kime" style="font-size: 0.88rem;">
              </div>
            </div>
          </div>
        `;
      } else if (sectionKey === 'geri' || sectionKey === 'ukemi') {
        container.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 12px;">
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 0.82rem; margin-bottom: 4px; color: #FFF; font-weight: 700;">
                Nome da Técnica / ${sectionKey === 'geri' ? 'Chute' : 'Queda'}: *
              </label>
              <input type="text" id="addTechName" class="form-input" required placeholder="Ex: ${sectionKey === 'geri' ? 'Mae Geri Keage' : 'Mae Ukemi'}" style="font-size: 0.92rem; font-weight: 600;">
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 0.82rem; margin-bottom: 4px; color: #FFF; font-weight: 700;">
                Detalhe da Execução / Observações:
              </label>
              <textarea id="addTechDetail" class="form-input" rows="3" placeholder="Ex: Explicação detalhada da técnica, postura e execução..." style="resize: vertical; font-size: 0.88rem;"></textarea>
            </div>
          </div>
        `;
      } else if (sectionKey === 'dachiWaza') {
        container.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 12px;">
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 0.82rem; margin-bottom: 4px; color: #FFF; font-weight: 700;">
                Nome da Base (Dachi): *
              </label>
              <input type="text" id="addTechName" class="form-input" required placeholder="Ex: Kiba Dachi" style="font-size: 0.92rem; font-weight: 600;">
            </div>
          </div>
        `;
      }
    },

    submitAddCurriculumTechnique: (kyuNumber) => {
      if (!window.TKST_AUTH || !window.TKST_AUTH.isAdmin()) {
        alert('Acesso restrito ao administrador.');
        return;
      }

      const sectionEl = document.getElementById('addTechSection');
      const nameEl = document.getElementById('addTechName');
      if (!sectionEl || !nameEl || !nameEl.value.trim()) {
        alert('Por favor, informe a seção e o nome da técnica.');
        return;
      }

      const sectionKey = sectionEl.value;
      const name = nameEl.value.trim();
      let newTechData = {};

      const belt = window.TKST_AUTH.getBeltCurriculum(kyuNumber);
      const isShodan = belt && belt.shodanProgram && ['teWaza', 'ukeWaza', 'ashiWaza', 'dachiWaza'].includes(sectionKey);

      if (isShodan) {
        const direction = document.getElementById('addTechDirection')?.value || 'Mae';
        const arrow = document.getElementById('addTechArrow')?.value || (direction === 'Sagate' ? '⬅' : (direction === 'Mae / Mawate' ? '🔄' : '➡'));
        newTechData = { name, direction, arrow };
      } else if (sectionKey === 'kihon') {
        const stance = document.getElementById('addTechStance')?.value.trim() || 'Zenkutsu Dachi';
        const direction = document.getElementById('addTechDirection')?.value.trim() || 'Mae (Avanço)';
        const count = document.getElementById('addTechCount')?.value.trim() || '5 vezes (Go Kai)';
        const focus = document.getElementById('addTechFocus')?.value.trim() || '';
        newTechData = { technique: name, stance, direction, count, focus };
      } else if (sectionKey === 'geri' || sectionKey === 'ukemi') {
        const detail = document.getElementById('addTechDetail')?.value.trim() || '';
        newTechData = { name, detail };
      } else if (sectionKey === 'dachiWaza') {
        newTechData = name;
      }

      const res = window.TKST_AUTH.addCurriculumTechnique(kyuNumber, sectionKey, newTechData);
      if (res && res.success) {
        window.TKST_APP.closeDetailModal();
        if (typeof showToast === 'function') {
          showToast('✅ Nova técnica cadastrada com sucesso!', 'success');
        } else {
          alert('Nova técnica cadastrada com sucesso!');
        }
        renderMyExam();
      } else {
        alert((res && res.error) || 'Erro ao adicionar técnica.');
      }
    },

    deleteCurriculumTechnique: (kyuNumber, sectionKey, index) => {
      if (!window.TKST_AUTH || !window.TKST_AUTH.isAdmin()) {
        alert('Acesso restrito ao administrador (Sensei Diego).');
        return;
      }

      if (!confirm('Deseja realmente excluir esta técnica do plano de estudos?\nEsta alteração entrará em vigor imediatamente e será sincronizada com todos os dispositivos.')) {
        return;
      }

      const res = window.TKST_AUTH.deleteCurriculumTechnique(kyuNumber, sectionKey, index);
      if (res && res.success) {
        if (typeof showToast === 'function') {
          showToast('🗑️ Técnica removida com sucesso!', 'success');
        } else {
          alert('Técnica removida com sucesso!');
        }
        renderMyExam();
      } else {
        alert((res && res.error) || 'Erro ao excluir técnica.');
      }
    },

    resetCurriculumBelt: (kyuNumber) => {
      if (!window.TKST_AUTH || !window.TKST_AUTH.isAdmin()) {
        alert('Acesso restrito ao administrador (Sensei Diego).');
        return;
      }

      const belt = window.TKST_AUTH.getBeltCurriculum(kyuNumber);
      const beltName = belt ? belt.beltName : `Faixa #${kyuNumber}`;

      if (!confirm(`Deseja restaurar o plano de estudos de "${beltName}" para o padrão oficial da apostila TKST 2026?\nTodas as alterações ou correções manuais desta faixa serão revertidas para o padrão oficial.`)) {
        return;
      }

      const res = window.TKST_AUTH.resetCurriculumBelt(kyuNumber);
      if (res && res.success) {
        if (typeof showToast === 'function') {
          showToast('🔄 Conteúdo oficial da faixa restaurado com sucesso!', 'success');
        } else {
          alert('Conteúdo oficial da faixa restaurado com sucesso!');
        }
        renderMyExam();
      } else {
        alert((res && res.error) || 'Erro ao restaurar faixa.');
      }
    },

    openDachiDetailFromCurriculum: (baseName) => {
      const gTerm = findGlossaryBase(baseName);
      if (gTerm) {
        window.TKST_APP.openGlossaryDetailModal('bases', gTerm.japanese);
      } else {
        const modalTitle = document.getElementById('detailModalTitle');
        const modalBody = document.getElementById('detailModalBody');
        const isAdmin = window.TKST_AUTH ? window.TKST_AUTH.isAdmin() : false;

        modalTitle.innerHTML = `
          <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
            <span class="badge badge-amarela" style="font-size: 0.72rem;">Base (Dachi)</span>
            <span style="color: #FFF; font-weight: 700;">${baseName}</span>
          </div>
        `;

        modalBody.innerHTML = `
          <div style="display: flex; flex-direction: column; gap: 12px;">
            <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 10px 12px;">
              <h2 style="font-family: var(--font-heading); font-size: 1.25rem; color: #FFF; margin: 0 0 4px 0;">
                ${baseName}
              </h2>
              <div style="font-size: 0.84rem; color: #E2E8F0;">
                <strong>Significado:</strong> Postura tradicional de Karatê Shotokan (${baseName}).
              </div>
              <div style="margin-top: 10px; display: flex; gap: 8px;">
                <button type="button" class="btn btn-sm" onclick="window.TKST_APP.speakJapanese('${baseName.replace(/'/g, "\\'")}')" style="background: rgba(255, 183, 3, 0.15); border: 1px solid var(--accent-gold); color: #FFB703; font-size: 0.76rem; padding: 6px 10px; border-radius: var(--radius-sm);">
                  <i class="fas fa-volume-up"></i> Ouvir Pronúncia
                </button>
                ${isAdmin ? `
                  <button type="button" class="btn btn-sm btn-primary" onclick="window.TKST_APP.openAddGlossaryTermModal('bases'); setTimeout(() => { const jp = document.getElementById('newGlossaryJapanese'); if(jp) jp.value = '${baseName.replace(/'/g, "\\'")}'; }, 100);" style="font-size: 0.76rem; padding: 6px 10px;">
                    <i class="fas fa-camera"></i> Cadastrar Foto da Base
                  </button>
                ` : ''}
              </div>
            </div>

            <div class="technique-media-card" style="padding: 10px 12px; background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); border-radius: var(--radius-sm);">
              <div class="technique-image-container" style="background: #080c14; border: 1px dashed var(--border-color); border-radius: var(--radius-sm); display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 150px; padding: 20px; text-align: center; gap: 8px;">
                <i class="fas fa-image" style="font-size: 2.2rem; color: #64748B; opacity: 0.5;"></i>
                <span style="font-size: 0.88rem; color: #94A3B8; font-weight: 600;">Ainda sem imagem correspondente</span>
              </div>
            </div>

            <div style="width: 100%;">
              <button type="button" class="btn btn-secondary" onclick="window.TKST_APP.closeDetailModal()" style="width: 100%; padding: 10px; font-weight: 600; font-size: 0.84rem;">
                Fechar
              </button>
            </div>
          </div>
        `;
        document.getElementById('detailModal').classList.add('active');
      }
    },

    openExamCameraScanner: function(kyu) {
      const modal = document.getElementById('examOmrScannerModal');
      if (!modal) return;

      // Popula lista de alunos matriculados
      const sel = document.getElementById('omrStudentSelect');
      if (sel && window.TKST_AUTH && typeof window.TKST_AUTH.getAllStudents === 'function') {
        const students = window.TKST_AUTH.getAllStudents() || [];
        sel.innerHTML = '<option value="">Detectar automaticamente ou selecionar...</option>' +
          students.map(s => `<option value="${s.id}">${s.name || s.username} (${s.dojo || 'TKST'})</option>`).join('');
      }

      const kyuSelect = document.getElementById('omrKyuSelect');
      if (kyuSelect && kyu !== undefined && kyu !== null) {
        kyuSelect.value = String(kyu);
      }

      this.resetOmrScanner();
      modal.classList.add('active');
      modal.style.display = 'flex';
    },

    closeExamCameraScanner: function() {
      this.closeExamOmrModal();
    },

    closeExamOmrModal: function() {
      this.stopOmrCamera();
      const modal = document.getElementById('examOmrScannerModal');
      if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
      }
    },

    setOmrCaptureMode: function(mode) {
      omrCaptureMode = mode === 'sheet' ? 'sheet' : 'card';
      const cardBtn = document.getElementById('omrModeCardBtn');
      const sheetBtn = document.getElementById('omrModeSheetBtn');
      const hint = document.getElementById('omrModeHint');
      const frame = document.getElementById('omrCardTargetFrame');

      if (cardBtn && sheetBtn) {
        if (omrCaptureMode === 'card') {
          cardBtn.style.background = 'var(--accent-gold)';
          cardBtn.style.color = '#000';
          cardBtn.style.border = '1px solid var(--accent-gold)';
          sheetBtn.style.background = 'rgba(255,255,255,0.06)';
          sheetBtn.style.color = '#CBD5E1';
          sheetBtn.style.border = '1px solid rgba(255,255,255,0.15)';
        } else {
          sheetBtn.style.background = 'var(--accent-gold)';
          sheetBtn.style.color = '#000';
          sheetBtn.style.border = '1px solid var(--accent-gold)';
          cardBtn.style.background = 'rgba(255,255,255,0.06)';
          cardBtn.style.color = '#CBD5E1';
          cardBtn.style.border = '1px solid rgba(255,255,255,0.15)';
        }
      }

      if (hint) {
        hint.textContent = omrCaptureMode === 'card'
          ? '🎯 Modo Cartão (Recomendado): Aproxime a câmera focando apenas no retângulo do gabarito (9x4 cm).'
          : '📄 Modo Folha A4: Enquadre a folha inteira na vertical com boa iluminação e sobre fundo escuro.';
      }

      if (frame) {
        frame.style.aspectRatio = omrCaptureMode === 'card' ? '2.14 / 1' : '1 / 1.41';
        frame.style.maxHeight = omrCaptureMode === 'card' ? '200px' : '360px';
      }
    },

    onOmrExamCodeInput: function(code) {
      const clean = (code || '').trim().toUpperCase();
      if (!clean) return;

      if (window.TKST_EXAM_GENERATOR && typeof window.TKST_EXAM_GENERATOR.decodeCompactExamCode === 'function') {
        const decoded = window.TKST_EXAM_GENERATOR.decodeCompactExamCode(clean);
        if (decoded && decoded.valid) {
          const kyuSelect = document.getElementById('omrKyuSelect');
          if (kyuSelect && decoded.kyu !== undefined) {
            kyuSelect.value = String(decoded.kyu);
          }
          if (Array.isArray(decoded.key) && decoded.key.length === 10) {
            omrCurrentExpectedKey = decoded.key;
            if (typeof showToast === 'function') {
              showToast(`🎯 Prova decodificada: Kyu ${decoded.kyu} | Gabarito auto-carregado!`, 'success', 3000);
            }
            if (omrCurrentScanResult) {
              this.recalculateOmrScore();
            }
          }
        }
      }
    },

    startOmrCamera: async function() {
      try {
        const video = document.getElementById('omrVideoElement');
        const container = document.getElementById('omrVideoContainer');
        const captureBtn = document.getElementById('omrCaptureBtn');
        const startBtn = document.getElementById('omrStartCameraBtn');

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          alert('Seu navegador ou dispositivo não suporta acesso direto à câmera. Utilize a opção "Escolher Foto do Arquivo".');
          return;
        }

        if (video) {
          video.muted = true;
          video.setAttribute('playsinline', 'true');
          video.setAttribute('webkit-playsinline', 'true');
        }

        let stream = null;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1920 },
              height: { ideal: 1080 }
            },
            audio: false
          });
        } catch (firstErr) {
          console.warn('Tentativa com ideal environment falhou, tentando fallback genérico de vídeo:', firstErr);
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
          });
        }

        omrCameraStream = stream;
        if (video) {
          video.srcObject = stream;
          try {
            await video.play();
          } catch(playErr) {
            console.warn('video.play() precisou de fallback:', playErr);
          }
        }
        if (container) container.style.display = 'block';
        if (captureBtn) captureBtn.style.display = 'inline-flex';
        if (startBtn) startBtn.style.display = 'none';
      } catch(err) {
        console.error('Erro ao acessar câmera para OMR:', err);
        alert('Não foi possível acessar a câmera (' + (err.message || err.name || 'Permissão negada') + '). Verifique as permissões do navegador ou utilize o botão "Escolher Foto do Arquivo".');
      }
    },

    stopOmrCamera: function() {
      if (omrCameraStream) {
        omrCameraStream.getTracks().forEach(track => {
          try { track.stop(); } catch(e) {}
        });
        omrCameraStream = null;
      }
      const video = document.getElementById('omrVideoElement');
      if (video) video.srcObject = null;
      const container = document.getElementById('omrVideoContainer');
      if (container) container.style.display = 'none';
      const captureBtn = document.getElementById('omrCaptureBtn');
      if (captureBtn) captureBtn.style.display = 'none';
      const startBtn = document.getElementById('omrStartCameraBtn');
      if (startBtn) startBtn.style.display = 'inline-flex';
    },

    captureOmrFrame: function() {
      const video = document.getElementById('omrVideoElement');
      if (!video || !video.videoWidth) return;

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      this.stopOmrCamera();
      this.processOmrImage(canvas.toDataURL('image/jpeg', 0.92));
    },

    handleOmrFileUpload: function(event) {
      const input = event.target;
      if (input.files && input.files[0]) {
        const file = input.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
          this.stopOmrCamera();
          this.processOmrImage(e.target.result);
        };
        reader.readAsDataURL(file);
      }
    },

    onOmrKyuChanged: function() {
      const kyuSelect = document.getElementById('omrKyuSelect');
      const kyu = kyuSelect ? Number(kyuSelect.value) : 6;
      omrCurrentExpectedKey = this.getExpectedKeyForKyu(kyu);
      if (omrCurrentScanResult) {
        this.recalculateOmrScore();
      }
    },

    getExpectedKeyForKyu: function(kyu) {
      try {
        if (window.TKST_EXAM_GENERATOR && typeof window.TKST_EXAM_GENERATOR.getExamData === 'function') {
          const exam = window.TKST_EXAM_GENERATOR.getExamData(kyu);
          if (exam && Array.isArray(exam.questions) && exam.questions.length >= 10) {
            return exam.questions.slice(0, 10).map(q => String.fromCharCode(65 + (q.correctIndex || 0)));
          }
        }
      } catch(e) {}

      const bank = window.TKST_AUTH ? window.TKST_AUTH.getCustomQuizBank() : (window.TKST_QUIZ_BANK || []);
      const kyuQuestions = bank.filter(q => Number(q.kyuNumber !== undefined ? q.kyuNumber : (q.kyu !== undefined ? q.kyu : 6)) === Number(kyu));
      if (kyuQuestions.length >= 10) {
        return kyuQuestions.slice(0, 10).map(q => String.fromCharCode(65 + (q.correctIndex || 0)));
      }
      return ['A', 'B', 'C', 'D', 'A', 'B', 'C', 'D', 'A', 'B'];
    },

    processOmrImage: async function(imageSrc, forceAi = false) {
      omrCurrentSourceImage = imageSrc;

      const captureView = document.getElementById('omrCaptureView');
      const processingView = document.getElementById('omrProcessingView');
      const reviewView = document.getElementById('omrReviewView');

      if (captureView) captureView.style.display = 'none';
      if (reviewView) reviewView.style.display = 'none';
      if (processingView) processingView.style.display = 'block';

      const kyuSelect = document.getElementById('omrKyuSelect');
      const kyu = kyuSelect ? Number(kyuSelect.value) : 6;
      const examCodeInput = document.getElementById('omrExamCodeInput');
      const examCode = examCodeInput ? examCodeInput.value.trim() : '';

      if (examCode) {
        this.onOmrExamCodeInput(examCode);
      }
      if (!omrCurrentExpectedKey || omrCurrentExpectedKey.length < 10) {
        omrCurrentExpectedKey = this.getExpectedKeyForKyu(kyu);
      }

      try {
        if (!window.TKST_OMR_ENGINE) {
          throw new Error('Motor OMR não carregado. Recarregue a página.');
        }

        const scanResult = await window.TKST_OMR_ENGINE.scanExamImage(imageSrc, {
          kyu,
          expectedKey: omrCurrentExpectedKey,
          forceAi,
          mode: omrCaptureMode || 'card',
          examCode: examCode || ''
        });

        omrCurrentScanResult = scanResult;

        if (processingView) processingView.style.display = 'none';
        if (reviewView) reviewView.style.display = 'block';

        this.renderOmrReviewView(scanResult);

        if (scanResult.usedAi) {
          showToast('🤖 Avaliação validada com sucesso pelo Gemini Vision!', 'info', 3500);
        } else if (scanResult.hasDoubt) {
          showToast('⚠️ Rasuras ou marcas fracas detectadas. Revise as marcações abaixo.', 'warning', 4500);
        } else {
          showToast('✅ Cartão OMR escaneado e lido com alta precisão!', 'success', 3000);
        }
      } catch(err) {
        console.error('Erro no processamento OMR:', err);
        if (processingView) processingView.style.display = 'none';
        if (captureView) captureView.style.display = 'block';
        alert('Ocorreu um erro ao processar a prova: ' + (err.message || err));
      }
    },

    renderOmrReviewView: function(scanResult) {
      const cardImg = document.getElementById('omrScannedCardImg');
      if (cardImg && scanResult.croppedCardDataUrl) {
        cardImg.src = scanResult.croppedCardDataUrl;
      }

      const confBadge = document.getElementById('omrConfidenceBadge');
      if (confBadge) {
        const confPct = Math.round((scanResult.overallConfidence || 0.9) * 100);
        confBadge.textContent = `Confiança: ${confPct}%`;
        confBadge.style.background = confPct >= 85 ? '#065F46' : (confPct >= 60 ? '#854D0E' : '#991B1B');
        confBadge.style.color = confPct >= 85 ? '#34D399' : (confPct >= 60 ? '#FBBF24' : '#F87171');
      }

      // Preenche lista de questões com botões de override 1-clique
      const listContainer = document.getElementById('omrQuestionsReviewList');
      if (listContainer) {
        listContainer.innerHTML = scanResult.questions.map(q => {
          const isCorrect = q.answer && q.answer === omrCurrentExpectedKey[q.num - 1];
          const confPct = Math.round(q.confidence * 100);
          let badgeColor = '#10B981';
          let badgeText = `${confPct}%`;
          if (q.doubt) {
            badgeColor = '#EF4444';
            badgeText = 'Rasura/Dúvida';
          } else if (confPct < 80) {
            badgeColor = '#F59E0B';
            badgeText = `${confPct}%`;
          }

          const options = ['A', 'B', 'C', 'D'];
          const buttonsHtml = options.map(opt => {
            const isSelected = q.answer === opt;
            const btnStyle = isSelected
              ? 'background: var(--accent-gold); color: #000; font-weight: 800; border: 1px solid var(--accent-gold); box-shadow: 0 0 6px rgba(245, 190, 0, 0.6);'
              : 'background: rgba(255,255,255,0.06); color: #CBD5E1; border: 1px solid rgba(255,255,255,0.15);';
            return `<button type="button" class="btn btn-sm" onclick="window.TKST_APP.overrideOmrAnswer(${q.num}, '${opt}')" style="padding: 3px 8px; font-size: 0.78rem; border-radius: 4px; ${btnStyle}">${opt}</button>`;
          }).join(' ');

          return `
            <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid var(--border-color); border-radius: 6px; padding: 8px 12px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-weight: 800; color: #FFF; font-size: 0.85rem;">Q${q.num}:</span>
                <span style="display: flex; gap: 4px;">${buttonsHtml}</span>
                <button type="button" class="btn btn-sm" onclick="window.TKST_APP.overrideOmrAnswer(${q.num}, null)" style="padding: 2px 6px; font-size: 0.7rem; color: #94A3B8; background: transparent; border: 1px solid rgba(255,255,255,0.1);" title="Marcar como em branco">Em branco</button>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 0.72rem; padding: 2px 6px; border-radius: 4px; background: rgba(0,0,0,0.4); color: ${badgeColor}; font-weight: 700;">${badgeText}</span>
                <span style="font-size: 0.75rem; color: #94A3B8;">Gabarito: <strong style="color: #FFF;">${omrCurrentExpectedKey[q.num - 1] || '-'}</strong></span>
                <span>${isCorrect ? '✅' : '❌'}</span>
              </div>
            </div>
          `;
        }).join('');
      }

      this.recalculateOmrScore();
    },

    overrideOmrAnswer: function(questionNum, letter) {
      if (!omrCurrentScanResult || !omrCurrentScanResult.questions) return;
      const target = omrCurrentScanResult.questions.find(q => q.num === questionNum);
      if (target) {
        target.answer = letter;
        target.doubt = false;
        target.confidence = 1.0;
        target.notes = 'Corrigido manualmente pelo Sensei';
        this.renderOmrReviewView(omrCurrentScanResult);
      }
    },

    recalculateOmrScore: function() {
      if (!omrCurrentScanResult || !omrCurrentScanResult.questions) return;
      let hits = 0;
      omrCurrentScanResult.questions.forEach((q, idx) => {
        const expected = omrCurrentExpectedKey[idx];
        if (q.answer && q.answer === expected) {
          hits++;
        }
      });

      const score = hits; // 1 ponto por questão = total 10
      const passed = score >= 7;

      const scoreDisplay = document.getElementById('omrScoreDisplay');
      if (scoreDisplay) {
        scoreDisplay.innerHTML = `${score.toFixed(1).replace('.', ',')} <span style="font-size: 0.9rem; color: #64748B;">/ 10,0</span>`;
      }

      const hitsDisplay = document.getElementById('omrHitsDisplay');
      if (hitsDisplay) {
        hitsDisplay.textContent = `${hits} de 10 acertos (${hits * 10}%)`;
      }

      const scoreBadge = document.getElementById('omrScoreBadge');
      if (scoreBadge) {
        scoreBadge.textContent = passed ? 'APROVADO' : 'REPROVADO';
        scoreBadge.className = passed ? 'badge badge-success' : 'badge badge-danger';
        scoreBadge.style.background = passed ? '#059669' : '#DC2626';
        scoreBadge.style.color = '#FFF';
      }
    },

    forceGeminiOmrValidation: async function() {
      if (!omrCurrentSourceImage) {
        alert('Nenhuma imagem carregada para validação.');
        return;
      }
      await this.processOmrImage(omrCurrentSourceImage, true);
    },

    resetOmrScanner: function() {
      this.stopOmrCamera();
      omrCurrentScanResult = null;
      omrCurrentSourceImage = null;

      const captureView = document.getElementById('omrCaptureView');
      const processingView = document.getElementById('omrProcessingView');
      const reviewView = document.getElementById('omrReviewView');

      if (captureView) captureView.style.display = 'block';
      if (processingView) processingView.style.display = 'none';
      if (reviewView) reviewView.style.display = 'none';

      const fileInput = document.getElementById('omrFileInput');
      if (fileInput) fileInput.value = '';

      const examCodeInput = document.getElementById('omrExamCodeInput');
      if (examCodeInput) examCodeInput.value = '';
    },

    saveOmrOfficialGrade: async function() {
      if (!omrCurrentScanResult || !omrCurrentScanResult.questions) {
        alert('Nenhum resultado de exame disponível para salvar.');
        return;
      }

      const kyuSelect = document.getElementById('omrKyuSelect');
      const kyu = kyuSelect ? Number(kyuSelect.value) : 6;
      const beltName = typeof getBeltNameFromKyu === 'function' ? getBeltNameFromKyu(kyu) : `Kyu ${kyu}`;

      let hits = 0;
      omrCurrentScanResult.questions.forEach((q, idx) => {
        if (q.answer && q.answer === omrCurrentExpectedKey[idx]) hits++;
      });

      const studentSelect = document.getElementById('omrStudentSelect');
      const studentId = studentSelect ? studentSelect.value : '';
      const allStudents = window.TKST_AUTH ? window.TKST_AUTH.getAllStudents() : [];
      const student = allStudents.find(s => s && s.id === studentId);

      const submissionData = {
        score: hits,
        total: 10,
        beltLevel: beltName,
        beltKyu: kyu,
        studentId: student ? student.id : null,
        studentName: student ? (student.name || student.username) : 'Aluno TKST',
        isOmr: true,
        examCode: omrCurrentScanResult.examCode || '',
        overallConfidence: omrCurrentScanResult.overallConfidence,
        details: omrCurrentScanResult.questions.map((q, idx) => ({
          num: q.num,
          studentAnswer: q.answer,
          correctAnswer: omrCurrentExpectedKey[idx],
          isCorrect: q.answer === omrCurrentExpectedKey[idx],
          confidence: q.confidence,
          doubt: q.doubt,
          notes: q.notes
        }))
      };

      if (window.TKST_AUTH && typeof window.TKST_AUTH.saveQuizSubmission === 'function') {
        window.TKST_AUTH.saveQuizSubmission(submissionData);
        showToast(`✅ Avaliação OMR salva: Nota ${hits},0 registrada com sucesso!`, 'success', 3500);
        this.closeExamOmrModal();
        if (typeof renderAdminMaster === 'function') {
          renderAdminMaster();
        }
      } else {
        alert('Módulo de autenticação indisponível.');
      }
    }
  };

  let omrCameraStream = null;
  let omrCurrentScanResult = null;
  let omrCurrentSourceImage = null;
  let omrCurrentExpectedKey = [];
  let omrCaptureMode = 'card';

  // Helper para parar imediatamente qualquer áudio / vídeo em execução dentro de modais
  function stopModalMedia(modalElement) {
    if (!modalElement) return;

    // 1. Limpa container de player de vídeo dedicado
    const videoContainer = modalElement.querySelector('#videoModalContainer');
    if (videoContainer) {
      videoContainer.innerHTML = '';
    }

    // 2. Pausa e remove fonte de todos os vídeos HTML5
    const videos = modalElement.querySelectorAll('video');
    videos.forEach(v => {
      try {
        v.pause();
        v.currentTime = 0;
        v.removeAttribute('src');
        v.load();
      } catch(e) {}
    });

    // 3. Remove ou redefine imediatamente iframes de vídeo (YouTube, Vimeo, etc.)
    const iframes = modalElement.querySelectorAll('iframe');
    iframes.forEach(f => {
      try {
        f.src = 'about:blank';
      } catch(e) {}
    });

    // 4. Se houver wrappers de vídeo em cards de detalhe, limpa os iframes dentro deles
    const videoWrappers = modalElement.querySelectorAll('.modal-video-wrapper');
    videoWrappers.forEach(w => {
      if (w.id !== 'videoModalContainer') {
        w.innerHTML = '';
      }
    });

    // 5. Limpa Lightbox de Galeria de Mídia
    const mediaLightboxBody = modalElement.querySelector('#mediaLightboxBody');
    if (mediaLightboxBody) {
      mediaLightboxBody.innerHTML = '';
    }
  }

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
        stopModalMedia(m);
      }
    });
  });

  // ESC e teclas de seta no teclado para fechar/navegar no Lightbox
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || e.key === 'Esc') {
      document.querySelectorAll('.modal-overlay.active').forEach(m => {
        if (m.getAttribute('data-prevent-outside-close') !== 'true' && !m.querySelector('form')) {
          m.removeAttribute('data-prevent-outside-close');
          m.classList.remove('active');
          stopModalMedia(m);
        }
      });
    }

    const lightbox = document.getElementById('mediaLightboxModal');
    if (lightbox && lightbox.classList.contains('active')) {
      if (e.key === 'ArrowLeft') {
        navigateMediaLightbox(-1);
      } else if (e.key === 'ArrowRight') {
        navigateMediaLightbox(1);
      }
    }
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
    if (typeof shouldSkipRerender === 'function' && shouldSkipRerender()) return;
    if (currentTab === 'admin') {
      renderAdminMaster();
    }
  });

  // Pausa o slide e economiza bateria/CPU ao minimizar o navegador ou bloquear a tela do celular
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (typeof setHomeSlidePause === 'function') setHomeSlidePause(true);
    } else if (currentTab === 'dashboard') {
      if (typeof setHomeSlidePause === 'function') setHomeSlidePause(false);
    }
  });

  // Start
  init();
});
