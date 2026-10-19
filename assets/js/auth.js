/**
 * TKST Alunos - Master Authentication & Student State Manager
 * Fully automated background cloud sync (PC <-> Mobile <-> All devices in real time)
 */

(function() {
  const STORAGE_KEY_USER = 'tkst_current_user';
  const STORAGE_KEY_STUDENTS = 'tkst_all_students';
  const STORAGE_KEY_PROGRESS = 'tkst_student_progress';
  const STORAGE_KEY_DOJOS = 'tkst_all_dojos';
  const STORAGE_KEY_DELETED_DOJOS = 'tkst_deleted_dojos';
  const STORAGE_KEY_VIDEOS = 'tkst_custom_kata_videos';
  const STORAGE_KEY_DELETED = 'tkst_deleted_student_ids';
  const STORAGE_KEY_QUIZ_SUBMISSIONS = 'tkst_quiz_submissions';
  const STORAGE_KEY_QUIZ_BANK = 'tkst_custom_quiz_bank';
  const STORAGE_KEY_DELETED_QUIZZES = 'tkst_deleted_quiz_ids';
  const STORAGE_KEY_DELETED_QUIZ_SUBS = 'tkst_deleted_quiz_sub_ids';
  const STORAGE_KEY_GLOSSARY = 'tkst_custom_glossary';
  const STORAGE_KEY_DELETED_GLOSSARY = 'tkst_deleted_glossary_terms';
  const STORAGE_KEY_MEDIA = 'tkst_custom_media';
  const STORAGE_KEY_DELETED_MEDIA = 'tkst_deleted_media_ids';
  const STORAGE_KEY_ALBUMS = 'tkst_custom_albums';
  const STORAGE_KEY_DELETED_ALBUMS = 'tkst_deleted_album_ids';
  const STORAGE_KEY_SUBALBUMS = 'tkst_custom_subalbums';
  const STORAGE_KEY_DELETED_SUBALBUMS = 'tkst_deleted_subalbums';
  const STORAGE_KEY_CURRICULUM = 'tkst_custom_curriculum';
  const AUTH_VERSION_KEY = 'tkst_auth_v3_nick';

  const SYNC_TOPIC = 'tkst_karate_sync_v3_live';
  const SYNC_URL = 'https://ntfy.sh/' + SYNC_TOPIC;
  const CLIENT_SENDER_ID = 'tkst_client_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  let isSyncing = false;
  let syncPending = false;

  // Gravação segura no LocalStorage com tratamento e limpeza de QuotaExceededError
  function safeLocalStorageSet(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (err) {
      console.warn('LocalStorage write notice for', key, err);
      try {
        // 1. Reduz quiz submissions no cache local para liberar espaço imediato
        const rawSubs = localStorage.getItem(STORAGE_KEY_QUIZ_SUBMISSIONS);
        if (rawSubs) {
          try {
            let subs = JSON.parse(rawSubs);
            if (Array.isArray(subs) && subs.length > 25) {
              localStorage.setItem(STORAGE_KEY_QUIZ_SUBMISSIONS, JSON.stringify(subs.slice(0, 25)));
            }
          } catch(e) {}
        }

        // 2. Se for o dicionário, armazena somente os termos customizados/editados (delta)
        if (key === STORAGE_KEY_GLOSSARY) {
          try {
            const parsed = typeof value === 'string' ? JSON.parse(value) : value;
            const delta = {};
            ['bases', 'defesas', 'socosGolpes', 'chutes', 'comandosEContagem'].forEach(c => {
              if (Array.isArray(parsed[c])) {
                const editedOnly = parsed[c].filter(t => t && (t._edited || t._custom));
                if (editedOnly.length > 0) delta[c] = editedOnly;
              }
            });
            localStorage.setItem(key, JSON.stringify(delta));
            return true;
          } catch(e) {}
        }

        // 3. Tenta gravar novamente após limpeza
        localStorage.setItem(key, value);
        return true;
      } catch (innerErr) {
        console.warn('LocalStorage quota limit reached; proceeding in-memory and server sync:', innerErr);
        return false;
      }
    }
  }

  // Remove imagens duplicadas das questões padrão (já empacotadas no window.TKST_DEFAULT_QUIZ_BANK)
  // para poupar até 95% do armazenamento no localStorage e prevenir QuotaExceededError em celulares
  function stripDefaultImages(bank) {
    if (!Array.isArray(bank)) return [];
    const defaults = window.TKST_DEFAULT_QUIZ_BANK || [];
    const defMap = new Map();
    defaults.forEach(dq => { if (dq && dq.id) defMap.set(dq.id, dq); });

    return bank.map(q => {
      if (!q) return null;
      const dq = defMap.get(q.id);
      if (dq && q.image && dq.image === q.image) {
        const { image, ...rest } = q;
        return { ...rest, image: '' };
      }
      return q;
    }).filter(Boolean);
  }

  // Restaura as imagens em base64 das questões padrão quando lidas do localStorage ou da nuvem
  function restoreDefaultImages(bank) {
    if (!Array.isArray(bank)) return [];
    const defaults = window.TKST_DEFAULT_QUIZ_BANK || [];
    const defMap = new Map();
    defaults.forEach(dq => { if (dq && dq.id) defMap.set(dq.id, dq); });

    return bank.map(q => {
      if (!q) return null;
      if ((!q.image || q.image === '') && defMap.has(q.id)) {
        const dq = defMap.get(q.id);
        if (dq && dq.image) {
          return { ...q, image: dq.image };
        }
      }
      return q;
    }).filter(Boolean);
  }

  // Gravação ultra-segura do Quiz Bank com isolamento de quota para iOS/Android
  function safeSaveQuizBank(bank) {
    if (!Array.isArray(bank)) return false;
    const cleanBank = stripDefaultImages(bank);
    const jsonStr = JSON.stringify(cleanBank);
    try {
      localStorage.setItem(STORAGE_KEY_QUIZ_BANK, jsonStr);
      try { localStorage.setItem('tkst_quiz_vault_permanent', jsonStr); } catch(e) {}
      return true;
    } catch(err) {
      console.warn('safeSaveQuizBank quota exceeded, stripping backup history and saving delta...', err);
      try {
        localStorage.removeItem('tkst_quiz_backup_history');
        const customDelta = cleanBank.filter(q => q && q.id && (q._edited || q._custom));
        localStorage.setItem(STORAGE_KEY_QUIZ_BANK, JSON.stringify(customDelta));
        try { localStorage.setItem('tkst_quiz_vault_permanent', JSON.stringify(customDelta)); } catch(e) {}
        return true;
      } catch(innerErr) {
        console.warn('safeSaveQuizBank inner write failed, keeping in memory:', innerErr);
        return false;
      }
    }
  }

  // Load custom quiz bank on initialization if present (com cofre permanente e histórico de proteção)
  try {
    // Limpa histórico de backup inflado se existir para liberar espaço no localStorage
    try {
      const histRaw = localStorage.getItem('tkst_quiz_backup_history');
      if (histRaw && histRaw.length > 200000) {
        localStorage.removeItem('tkst_quiz_backup_history');
      }
    } catch(e) {}

    const deletedIds = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED_QUIZZES)) || [];
    let savedBank = JSON.parse(localStorage.getItem(STORAGE_KEY_QUIZ_BANK));

    // Auto-recupera do cofre permanente se savedBank estiver vazio
    if (!Array.isArray(savedBank) || savedBank.length === 0) {
      try {
        const vault = JSON.parse(localStorage.getItem('tkst_quiz_vault_permanent')) || [];
        if (Array.isArray(vault) && vault.length > 0) {
          savedBank = vault;
        }
      } catch(e) {}
    }

    if (Array.isArray(savedBank)) {
      savedBank = restoreDefaultImages(savedBank);
    }

    const defaultList = (window.TKST_DEFAULT_QUIZ_BANK || []).filter(q => !deletedIds.includes(q.id));
    const bankMap = new Map();
    defaultList.forEach(q => bankMap.set(q.id, { ...q }));
    if (Array.isArray(window.TKST_QUIZ_BANK)) {
      window.TKST_QUIZ_BANK.forEach(q => {
        if (!deletedIds.includes(q.id)) {
          const vaultQ = bankMap.get(q.id);
          if (vaultQ) {
            q = { ...vaultQ, ...q, image: q.image || vaultQ.image };
          }
          bankMap.set(q.id, q);
        }
      });
    }
    if (Array.isArray(savedBank) && savedBank.length > 0) {
      savedBank.forEach(q => {
        if (!deletedIds.includes(q.id)) {
          const vaultQ = bankMap.get(q.id);
          if (vaultQ) {
            q = { ...vaultQ, ...q, image: q.image || vaultQ.image };
          }
          bankMap.set(q.id, q);
        }
      });
    }

    // Sobrepõe prioritariamente o cofre dedicado de edições locais do usuário
    try {
      const editedStored = localStorage.getItem('tkst_edited_quiz_questions');
      if (editedStored) {
        const editedMap = JSON.parse(editedStored);
        if (editedMap && typeof editedMap === 'object') {
          Object.keys(editedMap).forEach(qId => {
            const eq = editedMap[qId];
            if (eq && eq.id && eq.question && !deletedIds.includes(eq.id)) {
              const vaultQ = bankMap.get(eq.id);
              bankMap.set(eq.id, { ...(vaultQ || {}), ...eq, image: eq.image || (vaultQ && vaultQ.image) || '' });
            }
          });
        }
      }
    } catch(e) {}

    const merged = Array.from(bankMap.values());
    window.TKST_QUIZ_BANK = merged;
    window.TKST_QUIZ = merged;

    safeSaveQuizBank(merged);
  } catch(e) {}

  const OFFICIAL_DOJOS = [
    'TKST Santo Aleixo',
    'QG TKST ( Capela )',
    'TKST Rio do Ouro'
  ];
  const DEFAULT_DOJOS = OFFICIAL_DOJOS;

  // =========================================================================
  // AUTOMATIC REAL-TIME CLOUD SYNC ENGINE (PC <-> MOBILE IN REAL TIME)
  // =========================================================================
  async function parseNtfyItem(item) {
    if (!item) return null;
    if (item.message && typeof item.message === 'string') {
      try {
        const parsed = JSON.parse(item.message);
        if (parsed && typeof parsed === 'object') return parsed;
      } catch(e) {}
    }
    if (item.attachment && item.attachment.url) {
      try {
        const res = await fetch(item.attachment.url);
        if (res.ok) {
          return await res.json();
        }
      } catch(e) {
        console.warn('Failed to fetch ntfy attachment:', e);
      }
    }
    return null;
  }

  // =========================================================================
  // AUTH HEADERS & SESSION TOKEN HELPER
  // =========================================================================
  function getClientAuthHeaders(extra = {}) {
    const headers = { 'Content-Type': 'application/json', ...extra };
    try {
      const token = localStorage.getItem('tkst_session_token');
      if (token) {
        headers['Authorization'] = 'Bearer ' + token;
      }
    } catch(e) {}
    return headers;
  }

  // =========================================================================
  // QUIZ BANK — Endpoint dedicado para persistência permanente das questões
  // =========================================================================

  async function pushQuizBankToCloud(bank, deletedIds) {
    try {
      const customOnly = stripDefaultImages((bank || []).filter(q => q && q.id && q.question));
      const deleted = Array.isArray(deletedIds) ? deletedIds : (JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED_QUIZZES)) || []);
      
      // Obtém o mapa de questões editadas do usuário
      let editedMap = {};
      try {
        editedMap = JSON.parse(localStorage.getItem('tkst_edited_quiz_questions') || '{}');
      } catch(e) {}

      // 1. Endpoint dedicado /api/quiz-bank (persistência entre requisições)
      fetch('/api/quiz-bank', {
        method: 'POST',
        headers: getClientAuthHeaders(),
        body: JSON.stringify({ bank: customOnly, deletedQuizIds: deleted, editedMap })
      }).catch(() => {});

      // 2. Commit automático no GitHub via endpoint server-side seguro
      pushQuizBankToServer(customOnly, deleted).catch(() => {});

      // 3. Transmissão prioritária e imediata do Delta de Edições via NTFY (pacote único e leve < 2KB)
      // Garante sincronização instantânea com celulares e outros PCs sem risco de rate limit (429)
      broadcastQuizEditDelta(editedMap, customOnly);

      // 4. Transmissão secundária em lote (para sincronização de novas questões completas)
      if (customOnly.length > 0 && customOnly.length <= 20) {
        broadcastQuizBankChunks(customOnly);
      }
    } catch(err) {
      console.warn('Quiz bank push notice:', err);
    }
  }

  // Transmite delta direto de questões editadas em pacote ultra-leve (< 2KB) via NTFY
  async function broadcastQuizEditDelta(editedMap, questions) {
    try {
      const localEdited = (editedMap && Object.keys(editedMap).length > 0)
        ? editedMap
        : JSON.parse(localStorage.getItem('tkst_edited_quiz_questions') || '{}');
      
      const cleanEditedMap = {};
      Object.keys(localEdited).forEach(id => {
        const q = localEdited[id];
        if (q && q.id && q.question) {
          const { image, ...rest } = q;
          cleanEditedMap[id] = (image && image.length > 400) ? { ...rest, image: '' } : q;
        }
      });

      const keys = Object.keys(cleanEditedMap);
      if (keys.length === 0) return;

      // Pacotes compactos garantindo estritamente < 2.5KB por envio no ntfy.sh
      if (keys.length <= 4) {
        const msg = {
          type: 'tkst_quiz_edit_delta',
          senderId: CLIENT_SENDER_ID,
          editedMap: cleanEditedMap,
          timestamp: Date.now()
        };
        await fetch(SYNC_URL, {
          method: 'POST',
          headers: {
            'Title': 'TKST_QUIZ_EDIT_DELTA',
            'Content-Type': 'text/plain; charset=utf-8'
          },
          body: JSON.stringify(msg)
        });
      } else {
        for (let i = 0; i < keys.length; i += 2) {
          const chunkMap = {};
          keys.slice(i, i + 2).forEach(k => { chunkMap[k] = cleanEditedMap[k]; });
          const msg = {
            type: 'tkst_quiz_edit_delta',
            senderId: CLIENT_SENDER_ID,
            editedMap: chunkMap,
            timestamp: Date.now()
          };
          await fetch(SYNC_URL, {
            method: 'POST',
            headers: {
              'Title': 'TKST_QUIZ_EDIT_DELTA',
              'Content-Type': 'text/plain; charset=utf-8'
            },
            body: JSON.stringify(msg)
          });
        }
      }

      // Notificação leve para dispositivos em repouso
      await fetch(SYNC_URL, {
        method: 'POST',
        headers: {
          'Title': 'TKST_DATA_V2_PING',
          'Content-Type': 'text/plain; charset=utf-8'
        },
        body: JSON.stringify({ type: 'sync_notification', senderId: CLIENT_SENDER_ID, timestamp: Date.now() })
      });
    } catch(err) {
      console.warn('Quiz edit delta broadcast notice:', err);
    }
  }

  // Recebe e aplica imediatamente edições de questões feitas no PC ou em outros dispositivos
  function handleIncomingQuizEditDelta(data) {
    if (!data) return;
    try {
      const incomingMap = data.editedMap || {};
      const incomingQuestions = Array.isArray(data.questions) ? data.questions : [];
      let localEditedMap = {};
      try {
        localEditedMap = JSON.parse(localStorage.getItem('tkst_edited_quiz_questions') || '{}');
      } catch(e) {}

      let modified = false;
      Object.keys(incomingMap).forEach(qId => {
        const eq = incomingMap[qId];
        if (eq && eq.id && eq.question) {
          const cur = localEditedMap[qId];
          if (!cur || !cur.updatedAt || (eq.updatedAt && eq.updatedAt >= cur.updatedAt)) {
            localEditedMap[qId] = eq;
            modified = true;
          }
        }
      });
      incomingQuestions.forEach(q => {
        if (q && q.id && q.question) {
          const cur = localEditedMap[q.id];
          if (!cur || !cur.updatedAt || (q.updatedAt && q.updatedAt >= cur.updatedAt)) {
            localEditedMap[q.id] = q;
            modified = true;
          }
        }
      });

      if (modified) {
        localStorage.setItem('tkst_edited_quiz_questions', JSON.stringify(localEditedMap));
        // Atualiza o banco oficial em memória e cofre local
        if (window.TKST_AUTH && typeof window.TKST_AUTH.getCustomQuizBank === 'function') {
          const updatedBank = window.TKST_AUTH.getCustomQuizBank();
          window.dispatchEvent(new CustomEvent('tkst_quiz_bank_updated', {
            detail: { count: updatedBank.length, updated: true, fromDelta: true }
          }));
        }
      }
    } catch(err) {
      console.warn('handleIncomingQuizEditDelta error:', err);
    }
  }

  // Transmite questões em lotes leves (chunks de até 5 questões) para garantir que
  // nunca ultrapassem o limite de 4KB do pubsub ntfy.sh
  async function broadcastQuizBankChunks(bank) {
    if (!Array.isArray(bank) || bank.length === 0) return;
    try {
      const customOnly = stripDefaultImages(bank.filter(q => q && q.id && q.question));
      const CHUNK_SIZE = 5;
      const totalChunks = Math.ceil(customOnly.length / CHUNK_SIZE);
      const broadcastId = 'quiz_sync_' + Date.now();

      for (let i = 0; i < totalChunks; i++) {
        const slice = customOnly.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        const chunkMsg = {
          type: 'tkst_quiz_chunk',
          senderId: CLIENT_SENDER_ID,
          broadcastId,
          chunkIndex: i,
          totalChunks,
          count: customOnly.length,
          questions: slice,
          timestamp: Date.now()
        };
        try {
          await fetch(SYNC_URL, {
            method: 'POST',
            headers: {
              'Title': `TKST_QUIZ_CHUNK_${i+1}_OF_${totalChunks}`,
              'Content-Type': 'text/plain; charset=utf-8'
            },
            body: JSON.stringify(chunkMsg)
          });
          if (totalChunks > 1) await new Promise(r => setTimeout(r, 60));
        } catch(e) {}
      }
    } catch(err) {
      console.warn('Quiz chunk broadcast notice:', err);
    }
  }

  // Recebe e mescla lotes de questões transmitidos via nuvem NTFY
  function handleIncomingQuizChunk(data) {
    if (!data || (!Array.isArray(data.questions) && !Array.isArray(data.bank))) return;
    const incoming = Array.isArray(data.questions) ? data.questions : data.bank;
    if (incoming.length === 0) return;
    try {
      const deletedIds = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED_QUIZZES)) || [];
      let localSaved = JSON.parse(localStorage.getItem(STORAGE_KEY_QUIZ_BANK)) || [];
      if (!Array.isArray(localSaved) || localSaved.length === 0) {
        try {
          localSaved = JSON.parse(localStorage.getItem('tkst_quiz_vault_permanent')) || [];
        } catch(e) {}
      }
      const defaultList = (window.TKST_DEFAULT_QUIZ_BANK || []).filter(q => !deletedIds.includes(q.id));
      const bankMap = new Map();
      defaultList.forEach(q => bankMap.set(q.id, { ...q }));
      if (Array.isArray(localSaved)) {
        restoreDefaultImages(localSaved).forEach(q => {
          if (!deletedIds.includes(q.id)) {
            const vaultQ = bankMap.get(q.id);
            if (vaultQ) {
              q = { ...vaultQ, ...q, image: q.image || vaultQ.image };
            }
            bankMap.set(q.id, q);
          }
        });
      }

      let anyNew = false;
      let anyModified = false;
      const initialBankSize = bankMap.size;
      const restored = restoreDefaultImages(incoming);
      let localEditedMap = {};
      try {
        localEditedMap = JSON.parse(localStorage.getItem('tkst_edited_quiz_questions') || '{}');
      } catch(e) {}

      restored.forEach(q => {
        if (q && q.id && q.question && !deletedIds.includes(q.id)) {
          const existing = bankMap.get(q.id);
          if (!existing) {
            bankMap.set(q.id, q);
            anyNew = true;
          } else if (q._edited || (q.updatedAt && (!existing.updatedAt || q.updatedAt >= existing.updatedAt))) {
            const updatedItem = { ...existing, ...q, image: q.image || existing.image };
            bankMap.set(q.id, updatedItem);
            anyModified = true;
            if (q._edited) {
              localEditedMap[q.id] = updatedItem;
            }
          }
        }
      });

      try {
        localStorage.setItem('tkst_edited_quiz_questions', JSON.stringify(localEditedMap));
      } catch(e) {}

      const merged = Array.from(bankMap.values());
      safeSaveQuizBank(merged);
      window.TKST_QUIZ_BANK = merged;
      window.TKST_QUIZ = merged;

      if (anyNew || anyModified) {
        window.dispatchEvent(new CustomEvent('tkst_quiz_bank_updated', {
          detail: { count: merged.length, updated: true }
        }));
      }
    } catch(err) {
      console.warn('Incoming quiz chunk notice:', err);
    }
  }

  // Busca questões customizadas diretamente do data-quiz.js no GitHub (fonte permanente).
  // Usado como fallback final quando /api/quiz-bank retorna vazio após cold-start da Vercel.
  async function pullQuizBankFromGitHub() {
    try {
      const REPO = 'albinokira-crypto/tkst-alunos';
      const BRANCH = 'main';
      // raw.githubusercontent.com serve o arquivo diretamente sem autenticação
      const rawUrl = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/assets/js/data-quiz.js`;
      const res = await fetch(rawUrl + '?_=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) return [];

      const text = await res.text();
      const MARKER_START = '// ==TKST_CUSTOM_QUESTIONS_START==';
      const MARKER_END = '// ==TKST_CUSTOM_QUESTIONS_END==';
      const startIdx = text.indexOf(MARKER_START);
      const endIdx = text.indexOf(MARKER_END);
      if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) return [];

      const block = text.slice(startIdx + MARKER_START.length, endIdx).trim();
      if (!block) return [];

      // O bloco é uma lista de objetos JSON separados por vírgulas
      const cleanBlock = '[' + block.replace(/,\s*$/, '') + ']';
      const questions = JSON.parse(cleanBlock);
      return Array.isArray(questions) ? questions : [];
    } catch(err) {
      console.warn('Quiz bank GitHub pull notice:', err);
      return [];
    }
  }

  async function pullQuizBankFromCloud() {
    try {
      const QUIZ_STAMP = 'tkst_quiz_stamp_v275_clean';
      if (localStorage.getItem('tkst_quiz_official_stamp') !== QUIZ_STAMP) {
        localStorage.setItem('tkst_quiz_official_stamp', QUIZ_STAMP);
      }
      const deletedIds = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED_QUIZZES)) || [];
      const defaultList = (window.TKST_DEFAULT_QUIZ_BANK || []).filter(q => !deletedIds.includes(q.id));
      let localSaved = JSON.parse(localStorage.getItem(STORAGE_KEY_QUIZ_BANK)) || [];

      // Mantém todas as questões válidas do banco
      if (Array.isArray(localSaved) && localSaved.length > 0) {
        localSaved = localSaved.filter(q => q && q.id && q.question);
      }

      // Auto-recupera do cofre permanente se localSaved estiver vazio
      if (!Array.isArray(localSaved) || localSaved.length === 0) {
        try {
          const vault = JSON.parse(localStorage.getItem('tkst_quiz_vault_permanent')) || [];
          if (Array.isArray(vault) && vault.length > 0) {
            localSaved = vault.filter(q => q && q.id && q.question);
            safeSaveQuizBank(localSaved);
          }
        } catch(e) {}
      }

      const bankMap = new Map();

      // 1. Base default questions (questões oficiais com imagens do Sensei)
      defaultList.forEach(q => bankMap.set(q.id, { ...q }));

      // 2. Overlay current local questions (preserva texto limpo oficial para questões do cofre)
      if (Array.isArray(localSaved)) {
        restoreDefaultImages(localSaved).forEach(q => {
          if (!deletedIds.includes(q.id)) {
            const vaultQ = bankMap.get(q.id);
            if (vaultQ) {
              q = { ...vaultQ, ...q, image: q.image || vaultQ.image };
            }
            bankMap.set(q.id, q);
          }
        });
      }

      // 3. 1ª tentativa: endpoint dedicado /api/quiz-bank
      let cloudQuestions = [];
      try {
        const res = await fetch('/api/quiz-bank', { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            cloudQuestions = json.data;
          }
          if (json && json.editedMap && typeof json.editedMap === 'object' && Object.keys(json.editedMap).length > 0) {
            try {
              const curMap = JSON.parse(localStorage.getItem('tkst_edited_quiz_questions') || '{}');
              localStorage.setItem('tkst_edited_quiz_questions', JSON.stringify({ ...curMap, ...json.editedMap }));
            } catch(e) {}
          }
        }
      } catch(e) {}

      // 4. 2ª tentativa: busca de /api/sync se /api/quiz-bank veio vazio (resiliente a reinício da Vercel)
      try {
        const syncRes = await fetch('/api/sync', { cache: 'no-store' });
        if (syncRes.ok) {
          const syncJson = await syncRes.json();
          if (cloudQuestions.length === 0 && syncJson && syncJson.data && Array.isArray(syncJson.data.custom_quiz_bank) && syncJson.data.custom_quiz_bank.length > 0) {
            cloudQuestions = syncJson.data.custom_quiz_bank;
          }
          const syncEdited = (syncJson && syncJson.edited_quiz_questions) || (syncJson && syncJson.data && syncJson.data.edited_quiz_questions);
          if (syncEdited && typeof syncEdited === 'object' && Object.keys(syncEdited).length > 0) {
            try {
              const curMap = JSON.parse(localStorage.getItem('tkst_edited_quiz_questions') || '{}');
              localStorage.setItem('tkst_edited_quiz_questions', JSON.stringify({ ...curMap, ...syncEdited }));
            } catch(e) {}
          }
        }
      } catch(e) {}

      // 5. 3ª tentativa (fallback): lê direto do GitHub se /api/quiz-bank e /api/sync vieram vazios
      if (cloudQuestions.length === 0) {
        cloudQuestions = await pullQuizBankFromGitHub();
      }

      // 6. 4ª tentativa (fallback estático): lê assets/data/quiz-questions.json
      if (cloudQuestions.length === 0) {
        try {
          const jsonRes = await fetch('./assets/data/quiz-questions.json?_=' + Date.now(), { cache: 'no-store' });
          if (jsonRes.ok) {
            const staticQ = await jsonRes.json();
            if (Array.isArray(staticQ) && staticQ.length > 0) {
              cloudQuestions = staticQ;
            }
          }
        } catch(e) {}
      }

      // Recupera o mapa permanente de questões editadas pelo Sensei
      let activeEditedMap = {};
      try {
        activeEditedMap = JSON.parse(localStorage.getItem('tkst_edited_quiz_questions') || '{}');
      } catch(e) {}

      if (cloudQuestions.length > 0) {
        const restoredCloud = restoreDefaultImages(cloudQuestions);
        restoredCloud.forEach(q => {
          if (q && q.id && q.question && !deletedIds.includes(q.id)) {
            // Se a questão já foi editada pelo Sensei localmente, JAMAIS sobrescreve com padrão antigo da nuvem!
            if (activeEditedMap[q.id]) {
              const eq = activeEditedMap[q.id];
              // Só aceita a versão da nuvem se for explicitamente editada e tiver timestamp mais recente
              if (q._edited && q.updatedAt && eq.updatedAt && q.updatedAt > eq.updatedAt) {
                activeEditedMap[q.id] = q;
                bankMap.set(q.id, q);
              } else {
                bankMap.set(q.id, eq);
              }
            } else {
              const localQ = bankMap.get(q.id);
              const updatedItem = { ...(localQ || {}), ...q, image: q.image || (localQ && localQ.image) || '' };
              bankMap.set(q.id, updatedItem);
              if (q._edited) {
                activeEditedMap[q.id] = updatedItem;
              }
            }
          }
        });
      }

      // Re-aplica TODAS as questões editadas do Sensei com prioridade absoluta
      Object.keys(activeEditedMap).forEach(qId => {
        const eq = activeEditedMap[qId];
        if (eq && eq.id && eq.question && !deletedIds.includes(eq.id)) {
          const vaultQ = bankMap.get(eq.id);
          const finalItem = { ...(vaultQ || {}), ...eq, _edited: true, _custom: true, image: eq.image || (vaultQ && vaultQ.image) || '' };
          bankMap.set(eq.id, finalItem);
          activeEditedMap[qId] = finalItem;
        }
      });

      try {
        localStorage.setItem('tkst_edited_quiz_questions', JSON.stringify(activeEditedMap));
      } catch(e) {}

      const merged = Array.from(bankMap.values());
      const prevBank = window.TKST_QUIZ_BANK || [];
      const actuallyChanged = prevBank.length !== merged.length || JSON.stringify(prevBank.map(q => q.id + ':' + (q.question || '') + ':' + (q._edited || ''))) !== JSON.stringify(merged.map(q => q.id + ':' + (q.question || '') + ':' + (q._edited || '')));
      safeSaveQuizBank(merged);
      window.TKST_QUIZ_BANK = merged;
      window.TKST_QUIZ = merged;
      if (actuallyChanged) {
        window.dispatchEvent(new CustomEvent('tkst_quiz_bank_updated', { detail: { count: merged.length, updated: true } }));
      }
    } catch(err) {
      console.warn('Quiz bank pull notice:', err);
    }
  }

  // Commit server-side seguro: o token GITHUB_TOKEN fica exclusivamente
  // na variável de ambiente da Vercel — nunca exposto ao browser.
  async function pushQuizBankToServer(bank, deletedIds) {
    if (!Array.isArray(bank) && (!deletedIds || !deletedIds.length)) return;
    const deleted = Array.isArray(deletedIds) ? deletedIds : (JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED_QUIZZES)) || []);
    try {
      const res = await fetch('/api/quiz-commit', {
        method: 'POST',
        headers: getClientAuthHeaders(),
        body: JSON.stringify({
          customQuestions: bank || [],
          deletedQuizIds: deleted
        })
      });

      if (!res.ok) return;
      const json = await res.json();

      if (json.success) {
        window.dispatchEvent(new CustomEvent('tkst_quiz_committed', {
          detail: { count: json.committed, commitUrl: json.commitUrl }
        }));
      }
      // Falha silenciosa — questões já estão salvas no localStorage e /api/quiz-bank
    } catch(err) {
      console.warn('Quiz server commit notice:', err);
    }
  }

  // =========================================================================
  // STUDENTS PERMANENT CLOUD SYNC & GITHUB STORAGE
  // =========================================================================
  async function pullStudentsFromCloud() {
    try {
      // 1. Tenta endpoint dedicado /api/student-commit (GitHub API)
      try {
        const res = await fetch('/api/student-commit', { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          if (json && json.success && json.data && Array.isArray(json.data.students) && json.data.students.length > 0) {
            applyCloudData({
              students: json.data.students || [],
              deletedStudentIds: json.data.deletedStudentIds || []
            });
            return;
          }
        }
      } catch(e) {}

      // 2. Tenta endpoint /api/sync (Estado em memória serverless)
      try {
        const syncRes = await fetch('/api/sync', { cache: 'no-store' });
        if (syncRes.ok) {
          const syncJson = await syncRes.json();
          if (syncJson && syncJson.success && syncJson.data && Array.isArray(syncJson.data.students) && syncJson.data.students.length > 0) {
            applyCloudData({
              students: syncJson.data.students || [],
              deletedStudentIds: syncJson.data.deletedStudentIds || []
            });
            return;
          }
        }
      } catch(e) {}

      // 3. Tenta carregar diretamente do GitHub Raw (dados permanentes sem cache)
      try {
        const rawUrl = 'https://raw.githubusercontent.com/albinokira-crypto/tkst-alunos/main/assets/data/students.json?_=' + Date.now();
        const rawRes = await fetch(rawUrl, { cache: 'no-store' });
        if (rawRes.ok) {
          const rawJson = await rawRes.json();
          if (rawJson && Array.isArray(rawJson.students) && rawJson.students.length > 0) {
            applyCloudData({
              students: rawJson.students,
              deletedStudentIds: rawJson.deletedStudentIds || []
            });
            return;
          }
        }
      } catch(e) {}

      // 4. Tenta carregar assets/data/students.json diretamente (CDN/Vercel)
      try {
        const res = await fetch('./assets/data/students.json?_=' + Date.now(), { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          if (json && Array.isArray(json.students)) {
            applyCloudData({
              students: json.students,
              deletedStudentIds: json.deletedStudentIds || []
            });
            return;
          }
        }
      } catch(e) {}
    } catch(err) {
      console.warn('Students pull notice:', err);
    }
  }

  async function pushStudentsToServer(students, deletedIds) {
    if (!Array.isArray(students) || students.length === 0) return;
    const deleted = Array.isArray(deletedIds) ? deletedIds : (JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED)) || []);
    try {
      const sanitized = students.map(s => {
        if (!s) return null;
        const { password, phone, passwordHash, passwordSalt, ...safe } = s;
        return safe;
      }).filter(Boolean);

      fetch('/api/student-commit', {
        method: 'POST',
        headers: getClientAuthHeaders(),
        body: JSON.stringify({
          students: sanitized,
          deletedStudentIds: deleted
        })
      }).catch(() => {});
    } catch(err) {
      console.warn('Student server commit notice:', err);
    }
  }

  // =========================================================================
  // GLOSSARY PERMANENT CLOUD SYNC & GITHUB STORAGE
  // =========================================================================
  // GLOSSARY CLOUD SYNC & AUTO-PERSISTENCE
  // =========================================================================
  async function pullGlossaryFromCloud() {
    try {
      const deletedTerms = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED_GLOSSARY)) || [];
      const defaultGlossary = window.TKST_DEFAULT_GLOSSARY || window.TKST_GLOSSARY || {};
      let baseGlossary = JSON.parse(JSON.stringify(defaultGlossary));
      let localGlossary = JSON.parse(localStorage.getItem(STORAGE_KEY_GLOSSARY));
      const fileCustom = window.TKST_CUSTOM_GLOSSARY || {};
      const cats = ['bases', 'defesas', 'socosGolpes', 'chutes', 'comandosEContagem'];

      let cloudGlossary = null;
      let cloudDeleted = [];

      // 1. Tenta endpoint dedicado /api/glossary
      try {
        const res = await fetch('/api/glossary', { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          if (json && json.success && (json.custom_glossary || json.data) && typeof (json.custom_glossary || json.data) === 'object') {
            const dataObj = json.custom_glossary || json.data;
            if (Object.keys(dataObj).length > 0) {
              cloudGlossary = dataObj;
              if (Array.isArray(json.deletedGlossaryTerms)) {
                cloudDeleted = json.deletedGlossaryTerms;
              }
            }
          }
        }
      } catch(e) {}

      // 2. Fallback: assets/data/glossary-custom.json
      if (!cloudGlossary || Object.keys(cloudGlossary).length === 0) {
        try {
          const staticRes = await fetch('assets/data/glossary-custom.json?_=' + Date.now());
          if (staticRes.ok) {
            const staticJson = await staticRes.json();
            if (staticJson && (staticJson.custom_glossary || staticJson.glossary)) {
              cloudGlossary = staticJson.custom_glossary || staticJson.glossary;
              if (Array.isArray(staticJson.deletedGlossaryTerms)) {
                cloudDeleted = staticJson.deletedGlossaryTerms;
              }
            }
          }
        } catch(e) {}
      }

      // 3. Mescla deleted terms
      const allDeleted = Array.from(new Set([...deletedTerms, ...cloudDeleted]));
      if (allDeleted.length !== deletedTerms.length) {
        localStorage.setItem(STORAGE_KEY_DELETED_GLOSSARY, JSON.stringify(allDeleted));
      }

      const hasBase = cats.some(c => Array.isArray(baseGlossary[c]) && baseGlossary[c].length > 0);
      const hasCloud = cloudGlossary && cats.some(c => Array.isArray(cloudGlossary[c]) && cloudGlossary[c].length > 0);
      const hasLocal = localGlossary && cats.some(c => Array.isArray(localGlossary[c]) && localGlossary[c].length > 0);

      // Se scripts do dicionário ainda não carregaram e local vazio, não sobrescreve com vazio
      if (!hasBase && !hasCloud && !hasLocal) {
        return;
      }

      // 4. Monta dicionário mesclado
      cats.forEach(cat => {
        if (!baseGlossary[cat]) baseGlossary[cat] = [];
        const termMap = new Map();

        // 4.1 Termos base padrão
        baseGlossary[cat].forEach(t => {
          if (t && t.japanese) termMap.set(t.japanese.toLowerCase().trim(), { ...t });
        });

        // 4.2 Termos do arquivo bundle (GitHub commits estáticos)
        if (fileCustom && Array.isArray(fileCustom[cat])) {
          fileCustom[cat].forEach(t => {
            if (t && t.japanese && !allDeleted.includes(t.japanese.toLowerCase().trim())) {
              termMap.set(t.japanese.toLowerCase().trim(), t);
            }
          });
        }

        // 4.3 Termos da nuvem (/api/glossary ou assets/data/glossary-custom.json)
        if (cloudGlossary && Array.isArray(cloudGlossary[cat])) {
          cloudGlossary[cat].forEach(t => {
            if (t && t.japanese && !allDeleted.includes(t.japanese.toLowerCase().trim())) {
              const existing = termMap.get(t.japanese.toLowerCase().trim());
              if (!existing || !existing.updatedAt || (t.updatedAt && t.updatedAt >= existing.updatedAt)) {
                termMap.set(t.japanese.toLowerCase().trim(), t);
              }
            }
          });
        }

        // 4.4 Termos locais (preserva edições locais recentes do Sensei)
        if (localGlossary && Array.isArray(localGlossary[cat])) {
          localGlossary[cat].forEach(t => {
            if (t && t.japanese && !allDeleted.includes(t.japanese.toLowerCase().trim())) {
              const existing = termMap.get(t.japanese.toLowerCase().trim());
              if (!existing || !existing.updatedAt || (t.updatedAt && t.updatedAt >= existing.updatedAt) || t._edited) {
                termMap.set(t.japanese.toLowerCase().trim(), t);
              }
            }
          });
        }

        baseGlossary[cat] = Array.from(termMap.values()).filter(t => t && t.japanese && !allDeleted.includes(t.japanese.toLowerCase().trim()));
      });

      const localStr = localStorage.getItem(STORAGE_KEY_GLOSSARY);
      const newStr = JSON.stringify(baseGlossary);
      if (localStr !== newStr) {
        localStorage.setItem(STORAGE_KEY_GLOSSARY, newStr);
        window.TKST_GLOSSARY = baseGlossary;
        window.dispatchEvent(new CustomEvent('tkst_glossary_updated'));
      }
    } catch(err) {
      console.warn('Glossary pull notice:', err);
    }
  }

  async function pushGlossaryToServer(glossary, deletedTerms) {
    if (!glossary || typeof glossary !== 'object') return;
    const deleted = Array.isArray(deletedTerms) ? deletedTerms : (JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED_GLOSSARY)) || []);

    const payload = {
      custom_glossary: glossary,
      customGlossary: glossary,
      glossary: glossary,
      deletedGlossaryTerms: deleted
    };

    // 1. Post para endpoint dedicado /api/glossary
    try {
      fetch('/api/glossary', {
        method: 'POST',
        headers: getClientAuthHeaders(),
        body: JSON.stringify(payload)
      }).catch(() => {});
    } catch(e) {}

    // 2. Post para commit permanente no GitHub /api/glossary-commit
    try {
      const res = await fetch('/api/glossary-commit', {
        method: 'POST',
        headers: getClientAuthHeaders(),
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const json = await res.json();
        if (json && json.success) {
          window.dispatchEvent(new CustomEvent('tkst_glossary_committed', {
            detail: { commitUrl: json.commitUrl }
          }));
        }
      }
    } catch(err) {
      console.warn('Glossary server commit notice:', err);
    }
  }

  // =========================================================================
  // QUIZ SUBMISSIONS DEDUPLICATION & PERMANENT CLOUD SYNC
  // =========================================================================
  function normalizeBelt(belt, kyu) {
    if (kyu !== undefined && kyu !== null && kyu !== '') {
      const kStr = String(kyu).toLowerCase().trim();
      if (kStr === 'all' || kStr === 'geral') return 'all';
      const num = parseInt(kStr, 10);
      if (!isNaN(num) && num >= 1 && num <= 7) return 'kyu_' + num;
    }
    const bStr = String(belt || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (bStr.includes('branca') || bStr.includes('7')) return 'kyu_7';
    if (bStr.includes('amarela') || bStr.includes('6')) return 'kyu_6';
    if (bStr.includes('vermelha') || bStr.includes('5')) return 'kyu_5';
    if (bStr.includes('laranja') || bStr.includes('4')) return 'kyu_4';
    if (bStr.includes('verde') || bStr.includes('3')) return 'kyu_3';
    if (bStr.includes('roxa') || bStr.includes('2')) return 'kyu_2';
    if (bStr.includes('marrom') || bStr.includes('1')) return 'kyu_1';
    if (bStr.includes('geral') || bStr.includes('all')) return 'all';
    return bStr || 'all';
  }

  function deduplicateQuizSubmissions(list) {
    if (!Array.isArray(list)) return [];
    const sorted = [...list].filter(Boolean).sort((a, b) => {
      const timeA = new Date(a.date || 0).getTime();
      const timeB = new Date(b.date || 0).getTime();
      return timeA - timeB;
    });

    const kept = [];
    for (const item of sorted) {
      const itemTime = new Date(item.date || 0).getTime();
      const itemStudentId = (item.studentId || '').toString().trim().toLowerCase();
      const itemStudentUser = (item.studentUsername || '').toString().trim().toLowerCase();
      const itemBeltNorm = normalizeBelt(item.beltLevel, item.beltKyu);
      const itemScore = Number(item.score);
      const itemTotal = Number(item.total);

      let matchIdx = -1;
      for (let i = 0; i < kept.length; i++) {
        const k = kept[i];
        const kTime = new Date(k.date || 0).getTime();
        const kStudentId = (k.studentId || '').toString().trim().toLowerCase();
        const kStudentUser = (k.studentUsername || '').toString().trim().toLowerCase();
        const kBeltNorm = normalizeBelt(k.beltLevel, k.beltKyu);
        const kScore = Number(k.score);
        const kTotal = Number(k.total);

        const sameStudent = (itemStudentId && (itemStudentId === kStudentId || itemStudentId === kStudentUser)) ||
                            (itemStudentUser && (itemStudentUser === kStudentId || itemStudentUser === kStudentUser));

        if (sameStudent &&
            itemBeltNorm === kBeltNorm &&
            kScore === itemScore &&
            kTotal === itemTotal &&
            Math.abs(itemTime - kTime) <= 60000) {
          matchIdx = i;
          break;
        }
      }

      if (matchIdx === -1) {
        kept.push(item);
      } else {
        const existing = kept[matchIdx];
        const itemHasDetails = Array.isArray(item.details) && item.details.length > 0;
        const existingHasDetails = Array.isArray(existing.details) && existing.details.length > 0;
        const itemIsOrig = !item.id?.startsWith('quiz_rec_') && !item.id?.startsWith('quiz_std_');
        const existingIsOrig = !existing.id?.startsWith('quiz_rec_') && !existing.id?.startsWith('quiz_std_');

        if ((!existingHasDetails && itemHasDetails) || (!existingIsOrig && itemIsOrig)) {
          kept[matchIdx] = item;
        }
      }
    }
    return kept.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }

  // Saneamento imediato no startup para eliminar duplicatas acumuladas em localStorage
  try {
    const rawLocal = JSON.parse(localStorage.getItem(STORAGE_KEY_QUIZ_SUBMISSIONS));
    if (Array.isArray(rawLocal) && rawLocal.length > 0) {
      const sanitized = deduplicateQuizSubmissions(rawLocal);
      if (sanitized.length !== rawLocal.length) {
        safeLocalStorageSet(STORAGE_KEY_QUIZ_SUBMISSIONS, JSON.stringify(sanitized.slice(0, 500)));
      }
    }
  } catch(e) {}

  async function pullQuizSubmissionsFromCloud() {
    try {
      const deletedSubIds = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED_QUIZ_SUBS)) || [];
      const deletedSet = new Set(deletedSubIds);
      let fetchedSubs = null;

      // 1. Tenta endpoint dedicado /api/submission-commit (GitHub API)
      try {
        const res = await fetch('/api/submission-commit', { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          if (json && json.success && json.data && Array.isArray(json.data.quiz_submissions) && json.data.quiz_submissions.length > 0) {
            fetchedSubs = json.data.quiz_submissions;
            if (Array.isArray(json.data.deletedQuizSubIds)) {
              json.data.deletedQuizSubIds.forEach(id => deletedSet.add(id));
            }
          }
        }
      } catch(e) {}

      // 2. Tenta carregar diretamente do GitHub Raw (dados permanentes sem cache)
      if (!fetchedSubs) {
        try {
          const rawUrl = 'https://raw.githubusercontent.com/albinokira-crypto/tkst-alunos/main/assets/data/submissions.json?_=' + Date.now();
          const rawRes = await fetch(rawUrl, { cache: 'no-store' });
          if (rawRes.ok) {
            const rawJson = await rawRes.json();
            if (rawJson && Array.isArray(rawJson.quiz_submissions) && rawJson.quiz_submissions.length > 0) {
              fetchedSubs = rawJson.quiz_submissions;
              if (Array.isArray(rawJson.deletedQuizSubIds)) {
                rawJson.deletedQuizSubIds.forEach(id => deletedSet.add(id));
              }
            }
          }
        } catch(e) {}
      }

      // 3. Tenta carregar assets/data/submissions.json diretamente (CDN/Vercel)
      if (!fetchedSubs) {
        try {
          const res = await fetch('./assets/data/submissions.json?_=' + Date.now(), { cache: 'no-store' });
          if (res.ok) {
            const json = await res.json();
            if (json && Array.isArray(json.quiz_submissions)) {
              fetchedSubs = json.quiz_submissions;
              if (Array.isArray(json.deletedQuizSubIds)) {
                json.deletedQuizSubIds.forEach(id => deletedSet.add(id));
              }
            }
          }
        } catch(e) {}
      }

      // 4. Tenta carregar do endpoint /api/sync
      if (!fetchedSubs) {
        try {
          const syncRes = await fetch('/api/sync', { cache: 'no-store' });
          if (syncRes.ok) {
            const syncJson = await syncRes.json();
            if (syncJson && syncJson.data && Array.isArray(syncJson.data.quiz_submissions) && syncJson.data.quiz_submissions.length > 0) {
              fetchedSubs = syncJson.data.quiz_submissions;
            }
          }
        } catch(e) {}
      }

      const localSubs = JSON.parse(localStorage.getItem(STORAGE_KEY_QUIZ_SUBMISSIONS)) || [];
      const subMap = new Map();
      localSubs.forEach(s => {
        if (s && s.id && !deletedSet.has(s.id)) subMap.set(s.id, s);
      });
      if (Array.isArray(fetchedSubs)) {
        fetchedSubs.forEach(s => {
          if (s && s.id && !deletedSet.has(s.id)) subMap.set(s.id, s);
        });
      }

      // Helper para verificar se simulado equivalente já existe em subMap
      const hasEquivalentSubmission = (sid, suser, belt, score, total, date) => {
        const dt = new Date(date || 0).getTime();
        const targetSid = (sid || '').toString().trim().toLowerCase();
        const targetUser = (suser || '').toString().trim().toLowerCase();
        const targetBelt = normalizeBelt(belt);
        return Array.from(subMap.values()).some(s => {
          if (!s) return false;
          const sId = (s.studentId || '').toString().trim().toLowerCase();
          const sUser = (s.studentUsername || '').toString().trim().toLowerCase();
          const sameStd = (targetSid && (targetSid === sId || targetSid === sUser)) ||
                          (targetUser && (targetUser === sId || targetUser === sUser));
          const sBelt = normalizeBelt(s.beltLevel, s.beltKyu);
          return sameStd && sBelt === targetBelt && Number(s.score) === Number(score) && Number(s.total) === Number(total) && Math.abs(new Date(s.date || 0).getTime() - dt) <= 60000;
        });
      };

      // 5. Auto-recupera simulados salvos em tkst_student_progress caso não existam ainda em submissions
      try {
        const allProgress = JSON.parse(localStorage.getItem(STORAGE_KEY_PROGRESS)) || {};
        const allStudents = JSON.parse(localStorage.getItem(STORAGE_KEY_STUDENTS)) || [];
        let recoveredAny = false;

        Object.keys(allProgress).forEach(uid => {
          const prog = allProgress[uid];
          if (prog && Array.isArray(prog.quizScores)) {
            const student = allStudents.find(s => s && (s.id === uid || s.username === uid)) || { id: uid, name: 'Aluno', username: uid, currentBelt: 'Faixa Branca', currentKyu: 7 };
            prog.quizScores.forEach((qs, qIdx) => {
              const score = typeof qs.score === 'number' ? qs.score : 10;
              const total = typeof qs.total === 'number' ? qs.total : 10;
              const belt = qs.beltLevel || student.currentBelt;
              const date = qs.date || new Date().toISOString();
              const subId = `quiz_rec_${uid}_${qIdx}_${new Date(date).getTime()}`;

              if (!hasEquivalentSubmission(student.id, student.username, belt, score, total, date) && !subMap.has(subId) && !deletedSet.has(subId)) {
                const recSub = {
                  id: subId,
                  studentId: student.id,
                  studentName: student.name,
                  studentUsername: student.username,
                  studentBelt: student.currentBelt,
                  studentKyu: student.currentKyu !== undefined ? student.currentKyu : 7,
                  beltLevel: belt,
                  beltKyu: qs.beltKyu !== undefined ? qs.beltKyu : (student.currentKyu !== undefined ? student.currentKyu : 7),
                  score: score,
                  total: total,
                  percentage: typeof qs.percentage === 'number' ? qs.percentage : 100,
                  passed: typeof qs.score === 'number' ? (score / (total || 10)) >= 0.7 : true,
                  perfect: typeof qs.score === 'number' ? score === (total || 10) : true,
                  date: date,
                  details: []
                };
                subMap.set(subId, recSub);
                recoveredAny = true;
              }
            });
          }
        });

        // Também varre allStudents.quizScores
        allStudents.forEach(std => {
          if (std && Array.isArray(std.quizScores)) {
            std.quizScores.forEach((qs, qIdx) => {
              const score = typeof qs.score === 'number' ? qs.score : 10;
              const total = typeof qs.total === 'number' ? qs.total : 10;
              const belt = qs.beltLevel || std.currentBelt;
              const date = qs.date || new Date().toISOString();
              const subId = `quiz_std_${std.id}_${qIdx}_${new Date(date).getTime()}`;

              if (!hasEquivalentSubmission(std.id, std.username, belt, score, total, date) && !subMap.has(subId) && !deletedSet.has(subId)) {
                const recSub = {
                  id: subId,
                  studentId: std.id,
                  studentName: std.name,
                  studentUsername: std.username,
                  studentBelt: std.currentBelt,
                  studentKyu: std.currentKyu !== undefined ? std.currentKyu : 7,
                  beltLevel: belt,
                  beltKyu: qs.beltKyu !== undefined ? qs.beltKyu : (std.currentKyu !== undefined ? std.currentKyu : 7),
                  score: score,
                  total: total,
                  percentage: typeof qs.percentage === 'number' ? qs.percentage : 100,
                  passed: typeof qs.score === 'number' ? (score / (total || 10)) >= 0.7 : true,
                  perfect: typeof qs.score === 'number' ? score === (total || 10) : true,
                  date: date,
                  details: []
                };
                subMap.set(subId, recSub);
                recoveredAny = true;
              }
            });
          }
        });

        if (recoveredAny) {
          const syncList = deduplicateQuizSubmissions(Array.from(subMap.values()));
          pushQuizSubmissionsToServer(syncList, Array.from(deletedSet));
        }
      } catch(e) {}

      const rawMerged = Array.from(subMap.values())
        .map(s => {
          if (!s) return null;
          const { details, ...lightweight } = s;
          return lightweight;
        })
        .filter(Boolean);

      const mergedSubs = deduplicateQuizSubmissions(rawMerged).slice(0, 500);

      safeLocalStorageSet(STORAGE_KEY_QUIZ_SUBMISSIONS, JSON.stringify(mergedSubs));
      window.dispatchEvent(new CustomEvent('tkst_submissions_updated', { detail: mergedSubs }));
    } catch(err) {
      console.warn('Quiz submissions pull notice:', err);
    }
  }

  async function pushQuizSubmissionsToServer(submissions, deletedIds) {
    if (!Array.isArray(submissions)) return;
    const deleted = Array.isArray(deletedIds) ? deletedIds : (JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED_QUIZ_SUBS)) || []);
    try {
      fetch('/api/submission-commit', {
        method: 'POST',
        headers: getClientAuthHeaders(),
        body: JSON.stringify({
          quiz_submissions: submissions,
          deletedQuizSubIds: deleted
        })
      }).catch(() => {});
    } catch(err) {
      console.warn('Quiz submissions server commit notice:', err);
    }
  }

  // =========================================================================
  // KATA VIDEOS PERMANENT CLOUD SYNC & GITHUB STORAGE
  // =========================================================================
  async function pullKataVideosFromCloud() {
    try {
      let cloudVideos = null;
      try {
        const res = await fetch('/api/kata-commit', { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          if (json && json.success && json.data && typeof json.data === 'object' && Object.keys(json.data).length > 0) {
            cloudVideos = json.data;
          }
        }
      } catch(e) {}

      if (!cloudVideos) {
        try {
          const res = await fetch('assets/data/kata-videos.json?_=' + Date.now(), { cache: 'no-store' });
          if (res.ok) {
            const json = await res.json();
            if (json && typeof json === 'object' && Object.keys(json).length > 0) {
              cloudVideos = json;
            }
          }
        } catch(e) {}
      }

      if (cloudVideos) {
        let localVideos = {};
        try { localVideos = JSON.parse(localStorage.getItem(STORAGE_KEY_VIDEOS)) || {}; } catch(e) {}
        const merged = { ...cloudVideos, ...localVideos };
        const vStr = JSON.stringify(merged);
        if (localStorage.getItem(STORAGE_KEY_VIDEOS) !== vStr) {
          localStorage.setItem(STORAGE_KEY_VIDEOS, vStr);
          window.dispatchEvent(new CustomEvent('tkst_videos_updated', { detail: merged }));
        }
      }
    } catch(err) {
      console.warn('Kata videos pull notice:', err);
    }
  }

  async function pushKataVideosToServer(videos) {
    if (!videos || typeof videos !== 'object') return;
    try {
      fetch('/api/kata-commit', {
        method: 'POST',
        headers: getClientAuthHeaders(),
        body: JSON.stringify({
          custom_videos: videos
        })
      }).catch(() => {});
    } catch(err) {
      console.warn('Kata videos server commit notice:', err);
    }
  }

  async function pushToCloud() {
    if (isSyncing) {
      syncPending = true;
      return;
    }
    isSyncing = true;
    try {
      const deletedDojos = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED_DOJOS)) || [];
      const dojos = (JSON.parse(localStorage.getItem(STORAGE_KEY_DOJOS)) || []).filter(d => typeof d === 'string' && d.trim().length > 0 && !deletedDojos.includes(d.toLowerCase().trim()));
      const rawStudents = JSON.parse(localStorage.getItem(STORAGE_KEY_STUDENTS)) || [];
      const students = rawStudents.map(s => {
        if (!s) return null;
        const { password, phone, passwordHash, passwordSalt, ...safe } = s;
        return safe;
      }).filter(Boolean);

      const videos = JSON.parse(localStorage.getItem(STORAGE_KEY_VIDEOS)) || {};
      const progress = JSON.parse(localStorage.getItem(STORAGE_KEY_PROGRESS)) || {};
      const deletedStudentIds = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED)) || [];
      const deletedQuizIds = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED_QUIZZES)) || [];
      const deletedQuizSubIds = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED_QUIZ_SUBS)) || [];
      const deletedGlossaryTerms = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED_GLOSSARY)) || [];
      const quiz_submissions = (JSON.parse(localStorage.getItem(STORAGE_KEY_QUIZ_SUBMISSIONS)) || []).filter(s => !deletedQuizSubIds.includes(s.id));
      const allSavedQuiz = JSON.parse(localStorage.getItem(STORAGE_KEY_QUIZ_BANK)) || [];
      const custom_quiz_bank = stripDefaultImages(allSavedQuiz.filter(q => q && q.id && q.question && !deletedQuizIds.includes(q.id)));
      
      const allGlossary = JSON.parse(localStorage.getItem(STORAGE_KEY_GLOSSARY)) || {};
      const custom_glossary = {};
      ['bases', 'defesas', 'socosGolpes', 'chutes', 'comandosEContagem'].forEach(cat => {
        if (Array.isArray(allGlossary[cat])) {
          const edited = allGlossary[cat].filter(t => t && (t._edited || t._custom));
          if (edited.length > 0) custom_glossary[cat] = edited;
        }
      });

      const deletedMediaIds = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED_MEDIA)) || [];
      const allMedia = JSON.parse(localStorage.getItem(STORAGE_KEY_MEDIA)) || [];
      const custom_media = allMedia.filter(m => !deletedMediaIds.includes(m.id));

      const deletedAlbums = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED_ALBUMS)) || [];
      const allAlbums = JSON.parse(localStorage.getItem(STORAGE_KEY_ALBUMS)) || [];
      const custom_albums = allAlbums.filter(a => a && a.id && !deletedAlbums.includes(a.id));

      const deletedSubAlbums = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED_SUBALBUMS)) || [];
      const allSubAlbums = JSON.parse(localStorage.getItem(STORAGE_KEY_SUBALBUMS)) || [];
      const custom_subalbums = allSubAlbums.filter(s => {
        if (!s || !s.name) return false;
        const key = (s.albumId || 'exames') + '::' + s.name.trim().toLowerCase();
        return !deletedSubAlbums.includes(key);
      });

      const payload = {
        dojos,
        students,
        custom_videos: videos,
        progress,
        quiz_submissions,
        custom_quiz_bank,
        edited_quiz_questions: JSON.parse(localStorage.getItem('tkst_edited_quiz_questions') || '{}'),
        custom_glossary,
        custom_media,
        custom_albums,
        custom_subalbums,
        custom_curriculum: JSON.parse(localStorage.getItem(STORAGE_KEY_CURRICULUM)) || {},
        generated_exams: JSON.parse(localStorage.getItem('tkst_generated_exams') || '{}'),
        deletedMediaIds,
        deletedAlbums,
        deletedSubAlbums,
        deletedStudentIds,
        deletedQuizIds,
        deletedQuizSubIds,
        deletedGlossaryTerms,
        deletedDojos,
        senderId: CLIENT_SENDER_ID,
        timestamp: Date.now()
      };

      const payloadStr = JSON.stringify(payload);

      // 1. Post to Vercel Serverless Sync API (garante persistência de estado em nuvem)
      try {
        await fetch('/api/sync', {
          method: 'POST',
          headers: getClientAuthHeaders(),
          body: payloadStr
        });
      } catch(syncErr) {
        console.warn('Vercel sync notice:', syncErr);
      }

      // 2. Post to real-time pubsub stream (ntfy.sh) com proteção estrita do limite de 4KB
      try {
        if (payloadStr.length <= 3500) {
          await fetch(SYNC_URL, {
            method: 'POST',
            headers: { 
              'Title': 'TKST_DATA_V2',
              'Content-Type': 'text/plain; charset=utf-8'
            },
            body: payloadStr
          });
        } else {
          // Payload grande: envia ping de notificação ultra-leve (< 100 bytes) para não estourar o limite de 4KB do ntfy.sh
          await fetch(SYNC_URL, {
            method: 'POST',
            headers: { 
              'Title': 'TKST_DATA_V2_PING',
              'Content-Type': 'text/plain; charset=utf-8'
            },
            body: JSON.stringify({ type: 'sync_notification', senderId: CLIENT_SENDER_ID, timestamp: Date.now() })
          });
          // Garante transmissão das questões em lotes seguros (< 3.5KB) para o PC/celular em tempo real
          if (custom_quiz_bank && custom_quiz_bank.length > 0) {
            broadcastQuizBankChunks(custom_quiz_bank);
          }
        }
      } catch(ntfyErr) {
        console.warn('ntfy.sh stream notice:', ntfyErr);
      }

      window.dispatchEvent(new CustomEvent('tkst_cloud_synced', { detail: { type: 'push', time: new Date() } }));
    } catch(err) {
      console.warn('Cloud auto-push notice:', err);
    } finally {
      isSyncing = false;
      if (syncPending) {
        syncPending = false;
        setTimeout(pushToCloud, 300);
      }
    }
  }

  function applyCloudData(cloudData) {
    if (!cloudData || typeof cloudData !== 'object') return;
    let changed = false;

    // 1. Sync Deleted Student IDs (Tombstones)
    let localDeleted = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED)) || [];
    if (Array.isArray(cloudData.deletedStudentIds)) {
      const mergedDeleted = Array.from(new Set([...localDeleted, ...cloudData.deletedStudentIds]));
      if (mergedDeleted.length !== localDeleted.length) {
        localStorage.setItem(STORAGE_KEY_DELETED, JSON.stringify(mergedDeleted));
        localDeleted = mergedDeleted;
        changed = true;
      }
    }

    // 2. Sync Deleted Quiz IDs (Tombstones for Quiz Questions)
    let localDeletedQuizzes = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED_QUIZZES)) || [];
    if (Array.isArray(cloudData.deletedQuizIds)) {
      const mergedDelQuizzes = Array.from(new Set([...localDeletedQuizzes, ...cloudData.deletedQuizIds]));
      if (mergedDelQuizzes.length !== localDeletedQuizzes.length) {
        localStorage.setItem(STORAGE_KEY_DELETED_QUIZZES, JSON.stringify(mergedDelQuizzes));
        localDeletedQuizzes = mergedDelQuizzes;
        changed = true;
      }
    }

    // 3. Sync Deleted Quiz Submissions (Tombstones for Deleted Student Tests)
    let localDeletedSubIds = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED_QUIZ_SUBS)) || [];
    if (Array.isArray(cloudData.deletedQuizSubIds)) {
      const mergedDelSubs = Array.from(new Set([...localDeletedSubIds, ...cloudData.deletedQuizSubIds]));
      if (mergedDelSubs.length !== localDeletedSubIds.length) {
        localStorage.setItem(STORAGE_KEY_DELETED_QUIZ_SUBS, JSON.stringify(mergedDelSubs));
        localDeletedSubIds = mergedDelSubs;
        changed = true;
      }
    }

    // 4. Sync Students (Expunge deleted & merge active with conflict protection)
    if (Array.isArray(cloudData.students)) {
      let localStudents = JSON.parse(localStorage.getItem(STORAGE_KEY_STUDENTS)) || [];
      const studentMap = new Map();

      // Keep local students not deleted
      localStudents.forEach(s => {
        if (s && s.id && !localDeleted.includes(s.id)) {
          studentMap.set(s.id, { ...s });
        }
      });

      // Merge cloud students not deleted
      cloudData.students.forEach(s => {
        if (!s || !s.id || localDeleted.includes(s.id)) return;
        const existing = studentMap.get(s.id);
        if (!existing) {
          studentMap.set(s.id, { ...s });
          changed = true;
        } else {
          let studentModified = false;
          const merged = { ...existing };

          // Status conflict resolution:
          const existingStatus = existing.status || 'pending';
          const cloudStatus = s.status || 'pending';
          const localStatusTime = existing.statusUpdatedAt || (existingStatus === 'approved' ? 1 : 0);
          const cloudStatusTime = s.statusUpdatedAt || (cloudStatus === 'approved' ? 1 : 0);

          if (existingStatus !== 'pending' && cloudStatus === 'pending') {
            // NEVER revert approved/rejected to pending unless cloud statusUpdatedAt is strictly newer than local approval!
            if (cloudStatusTime > localStatusTime && cloudStatusTime > (existing.approvedAt ? new Date(existing.approvedAt).getTime() : 0)) {
              merged.status = cloudStatus;
              merged.statusUpdatedAt = cloudStatusTime;
              studentModified = true;
            }
          } else if (existingStatus === 'pending' && cloudStatus !== 'pending') {
            // Cloud has approval/rejection! Accept it!
            merged.status = cloudStatus;
            merged.statusUpdatedAt = cloudStatusTime || Date.now();
            if (s.approvedAt) merged.approvedAt = s.approvedAt;
            if (s.rejectedAt) merged.rejectedAt = s.rejectedAt;
            studentModified = true;
          } else if (cloudStatusTime >= localStatusTime) {
            if (merged.status !== cloudStatus) {
              merged.status = cloudStatus;
              studentModified = true;
            }
            merged.statusUpdatedAt = cloudStatusTime;
          }

          // Profile fields: update only if cloud is strictly newer than local edits
          const localUpdateTime = existing.updatedAt || 0;
          const cloudUpdateTime = s.updatedAt || 0;
          if (cloudUpdateTime > localUpdateTime) {
            ['name', 'phone', 'currentBelt', 'currentKyu', 'targetBelt', 'dojo', 'notes', 'avatar', 'startDate'].forEach(f => {
              if (s[f] !== undefined && s[f] !== null && s[f] !== '' && s[f] !== merged[f]) {
                merged[f] = s[f];
                studentModified = true;
              }
            });
            if (Array.isArray(s.quizScores) && s.quizScores.length > 0) {
              merged.quizScores = s.quizScores;
              studentModified = true;
            }
            if (s.password && !merged.password) {
              merged.password = s.password;
              studentModified = true;
            }
            merged.updatedAt = cloudUpdateTime;
          } else if (Array.isArray(s.quizScores) && (!Array.isArray(merged.quizScores) || s.quizScores.length > merged.quizScores.length)) {
            merged.quizScores = s.quizScores;
            studentModified = true;
          }

          // Presence / Last Active (always take newer)
          const localActive = existing.lastActive ? new Date(existing.lastActive).getTime() : 0;
          const cloudActive = s.lastActive ? new Date(s.lastActive).getTime() : 0;
          if (cloudActive > localActive) {
            merged.lastActive = cloudActive;
            studentModified = true;
          }

          if (studentModified) {
            studentMap.set(s.id, merged);
            changed = true;
          }
        }
      });

      const finalStudents = Array.from(studentMap.values());
      const localStr = localStorage.getItem(STORAGE_KEY_STUDENTS);
      const newStr = JSON.stringify(finalStudents);
      if (localStr !== newStr) {
        localStorage.setItem(STORAGE_KEY_STUDENTS, newStr);
        changed = true;
      }

      // Update logged-in user if their profile changed
      const currentUser = JSON.parse(localStorage.getItem(STORAGE_KEY_USER));
      if (currentUser) {
        const freshUser = finalStudents.find(s => s.id === currentUser.id || s.username === currentUser.username);
        if (freshUser && JSON.stringify(freshUser) !== JSON.stringify(currentUser)) {
          localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(freshUser));
          changed = true;
        }
      }
    }

    // Sync Deleted Dojos (Tombstone)
    let localDeletedDojos = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED_DOJOS)) || [];
    if (!localDeletedDojos.includes('tkst matriz - central')) {
      localDeletedDojos.push('tkst matriz - central');
    }
    if (Array.isArray(cloudData.deletedDojos)) {
      const mergedDeletedDojos = Array.from(new Set([...localDeletedDojos, ...cloudData.deletedDojos.map(d => (d || '').toLowerCase().trim())]));
      if (mergedDeletedDojos.length !== localDeletedDojos.length) {
        localStorage.setItem(STORAGE_KEY_DELETED_DOJOS, JSON.stringify(mergedDeletedDojos));
        localDeletedDojos = mergedDeletedDojos;
        changed = true;
      }
    }

    // 4. Sync Dojos (Tombstones ALWAYS win, never un-delete!)
    if (Array.isArray(cloudData.dojos)) {
      let localDojos = JSON.parse(localStorage.getItem(STORAGE_KEY_DOJOS)) || [];
      const combined = [...localDojos, ...cloudData.dojos];
      const mergedDojos = Array.from(new Set(combined))
        .filter(d => typeof d === 'string' && d.trim().length > 0 && !localDeletedDojos.includes(d.toLowerCase().trim()) && d.toLowerCase().trim() !== 'tkst matriz - central');
      const currentDojosStr = localStorage.getItem(STORAGE_KEY_DOJOS);
      const newDojosStr = JSON.stringify(mergedDojos);
      if (currentDojosStr !== newDojosStr) {
        localStorage.setItem(STORAGE_KEY_DOJOS, newDojosStr);
        changed = true;
      }
    }

    // 5. Sync Custom Videos (Incoming cloud updates take precedence over stale local storage)
    if (cloudData.custom_videos && typeof cloudData.custom_videos === 'object') {
      let localVideos = JSON.parse(localStorage.getItem(STORAGE_KEY_VIDEOS)) || {};
      const mergedVideos = { ...localVideos, ...cloudData.custom_videos };
      const vStr = JSON.stringify(mergedVideos);
      if (localStorage.getItem(STORAGE_KEY_VIDEOS) !== vStr) {
        localStorage.setItem(STORAGE_KEY_VIDEOS, vStr);
        window.dispatchEvent(new CustomEvent('tkst_videos_updated', { detail: mergedVideos }));
        changed = true;
      }
    }

    if (cloudData.progress && typeof cloudData.progress === 'object') {
      const pStr = JSON.stringify(cloudData.progress);
      if (localStorage.getItem(STORAGE_KEY_PROGRESS) !== pStr) {
        localStorage.setItem(STORAGE_KEY_PROGRESS, pStr);
        changed = true;
      }
    }

    // 6. Sync Quiz Submissions (Filter out tombstoned deleted tests)
    if (Array.isArray(cloudData.quiz_submissions)) {
      const localSubs = JSON.parse(localStorage.getItem(STORAGE_KEY_QUIZ_SUBMISSIONS)) || [];
      const subMap = new Map();
      localSubs.forEach(s => {
        if (!localDeletedSubIds.includes(s.id)) {
          const { details, ...lightweight } = s || {};
          subMap.set(s.id, lightweight);
        }
      });
      cloudData.quiz_submissions.forEach(s => {
        if (!localDeletedSubIds.includes(s.id)) {
          const { details, ...lightweight } = s || {};
          subMap.set(s.id, lightweight);
        }
      });
      const mergedSubs = Array.from(subMap.values()).sort((a,b) => new Date(b.date || 0) - new Date(a.date || 0)).slice(0, 500);
      const newSubsStr = JSON.stringify(mergedSubs);
      if (localStorage.getItem(STORAGE_KEY_QUIZ_SUBMISSIONS) !== newSubsStr) {
        safeLocalStorageSet(STORAGE_KEY_QUIZ_SUBMISSIONS, newSubsStr);
        changed = true;
      }
    }

    // 7. Sync Custom Quiz Bank & Edited Questions (Filter out tombstoned deleted questions and merge with defaults)
    if ((Array.isArray(cloudData.custom_quiz_bank) && cloudData.custom_quiz_bank.length > 0) || (cloudData.edited_quiz_questions && typeof cloudData.edited_quiz_questions === 'object')) {
      const defaultList = (window.TKST_DEFAULT_QUIZ_BANK || []).filter(q => !localDeletedQuizzes.includes(q.id));
      let localSaved = JSON.parse(localStorage.getItem(STORAGE_KEY_QUIZ_BANK)) || [];
      if (Array.isArray(localSaved)) {
        localSaved = restoreDefaultImages(localSaved);
      }
      const bankMap = new Map();
      defaultList.forEach(q => bankMap.set(q.id, { ...q }));
      localSaved.forEach(q => {
        if (!localDeletedQuizzes.includes(q.id)) bankMap.set(q.id, q);
      });

      let activeEditedMap = {};
      try {
        activeEditedMap = JSON.parse(localStorage.getItem('tkst_edited_quiz_questions') || '{}');
      } catch(e) {}

      // Mescla edições que vieram da nuvem
      if (cloudData.edited_quiz_questions && typeof cloudData.edited_quiz_questions === 'object') {
        Object.keys(cloudData.edited_quiz_questions).forEach(qId => {
          const incomingQ = cloudData.edited_quiz_questions[qId];
          if (incomingQ && incomingQ.id && incomingQ.question && !localDeletedQuizzes.includes(incomingQ.id)) {
            const currentQ = activeEditedMap[qId];
            if (!currentQ || !currentQ.updatedAt || (incomingQ.updatedAt && incomingQ.updatedAt >= currentQ.updatedAt)) {
              activeEditedMap[qId] = incomingQ;
              changed = true;
            }
          }
        });
      }

      if (Array.isArray(cloudData.custom_quiz_bank)) {
        const restoredIncoming = restoreDefaultImages(cloudData.custom_quiz_bank);
        restoredIncoming.forEach(q => {
          if (!localDeletedQuizzes.includes(q.id) && q && q.id && q.question) {
            if (activeEditedMap[q.id]) {
              const eq = activeEditedMap[q.id];
              if (q._edited && q.updatedAt && eq.updatedAt && q.updatedAt > eq.updatedAt) {
                activeEditedMap[q.id] = q;
                bankMap.set(q.id, q);
                changed = true;
              } else {
                bankMap.set(q.id, eq);
              }
            } else {
              const localQ = bankMap.get(q.id);
              const updatedItem = { ...(localQ || {}), ...q, image: q.image || (localQ && localQ.image) || '' };
              bankMap.set(q.id, updatedItem);
              if (q._edited) {
                activeEditedMap[q.id] = updatedItem;
                changed = true;
              }
            }
          }
        });
      }

      // Re-aplica mapa dedicado de edições com prioridade absoluta
      Object.keys(activeEditedMap).forEach(qId => {
        const eq = activeEditedMap[qId];
        if (eq && eq.id && eq.question && !localDeletedQuizzes.includes(eq.id)) {
          const vaultQ = bankMap.get(eq.id);
          const finalItem = { ...(vaultQ || {}), ...eq, _edited: true, _custom: true, image: eq.image || (vaultQ && vaultQ.image) || '' };
          bankMap.set(eq.id, finalItem);
          activeEditedMap[qId] = finalItem;
        }
      });

      try {
        localStorage.setItem('tkst_edited_quiz_questions', JSON.stringify(activeEditedMap));
      } catch(e) {}

      const mergedBank = Array.from(bankMap.values());
      const currentBankLength = Array.isArray(window.TKST_QUIZ_BANK) ? window.TKST_QUIZ_BANK.length : 0;
      safeSaveQuizBank(mergedBank);
      window.TKST_QUIZ_BANK = mergedBank;
      window.TKST_QUIZ = mergedBank;
      if (changed || currentBankLength !== mergedBank.length) {
        window.dispatchEvent(new CustomEvent('tkst_quiz_bank_updated', { detail: { count: mergedBank.length, updated: true } }));
        changed = true;
      }
    }

    // 8. Sync Custom Glossary (Merge with defaults and filter deleted terms)
    let localDeletedTerms = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED_GLOSSARY)) || [];
    if (Array.isArray(cloudData.deletedGlossaryTerms)) {
      const mergedDelTerms = Array.from(new Set([...localDeletedTerms, ...cloudData.deletedGlossaryTerms]));
      if (mergedDelTerms.length !== localDeletedTerms.length) {
        localStorage.setItem(STORAGE_KEY_DELETED_GLOSSARY, JSON.stringify(mergedDelTerms));
        localDeletedTerms = mergedDelTerms;
        changed = true;
      }
    }

    if (cloudData.custom_glossary && typeof cloudData.custom_glossary === 'object' && Object.keys(cloudData.custom_glossary).length > 0) {
      const defaultGlossary = window.TKST_DEFAULT_GLOSSARY || window.TKST_GLOSSARY || {};
      let baseGlossary = JSON.parse(JSON.stringify(defaultGlossary));
      let localGlossary = JSON.parse(localStorage.getItem(STORAGE_KEY_GLOSSARY)) || baseGlossary;
      const fileCustom = window.TKST_CUSTOM_GLOSSARY || {};

      ['bases', 'defesas', 'socosGolpes', 'chutes', 'comandosEContagem'].forEach(cat => {
        if (!baseGlossary[cat]) baseGlossary[cat] = [];
        const termMap = new Map();
        baseGlossary[cat].forEach(t => {
          if (t && t.japanese) termMap.set(t.japanese.toLowerCase().trim(), { ...t });
        });
        if (fileCustom && Array.isArray(fileCustom[cat])) {
          fileCustom[cat].forEach(t => {
            if (t && t.japanese && !localDeletedTerms.includes(t.japanese.toLowerCase().trim())) {
              termMap.set(t.japanese.toLowerCase().trim(), t);
            }
          });
        }
        (cloudData.custom_glossary[cat] || []).forEach(t => {
          if (t && t.japanese && !localDeletedTerms.includes(t.japanese.toLowerCase().trim())) {
            const existing = termMap.get(t.japanese.toLowerCase().trim());
            if (!existing || !existing.updatedAt || (t.updatedAt && t.updatedAt >= existing.updatedAt)) {
              termMap.set(t.japanese.toLowerCase().trim(), t);
            }
          }
        });
        (localGlossary[cat] || []).forEach(t => {
          if (t && t.japanese && !localDeletedTerms.includes(t.japanese.toLowerCase().trim())) {
            const existing = termMap.get(t.japanese.toLowerCase().trim());
            if (!existing || !existing.updatedAt || (t.updatedAt && t.updatedAt >= existing.updatedAt) || t._edited) {
              termMap.set(t.japanese.toLowerCase().trim(), t);
            }
          }
        });

        baseGlossary[cat] = Array.from(termMap.values()).filter(t => t && t.japanese && !localDeletedTerms.includes(t.japanese.toLowerCase().trim()));
      });

      const localGStr = localStorage.getItem(STORAGE_KEY_GLOSSARY);
      const newGStr = JSON.stringify(baseGlossary);
      if (localGStr !== newGStr) {
        localStorage.setItem(STORAGE_KEY_GLOSSARY, newGStr);
        window.TKST_GLOSSARY = baseGlossary;
        changed = true;
      }
    }

    // 9. Sync Deleted Media IDs & Custom Media
    let localDeletedMediaIds = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED_MEDIA)) || [];
    if (Array.isArray(cloudData.deletedMediaIds)) {
      const mergedDelMedia = Array.from(new Set([...localDeletedMediaIds, ...cloudData.deletedMediaIds]));
      if (mergedDelMedia.length !== localDeletedMediaIds.length) {
        localStorage.setItem(STORAGE_KEY_DELETED_MEDIA, JSON.stringify(mergedDelMedia));
        localDeletedMediaIds = mergedDelMedia;
        changed = true;
      }
    }

    if (Array.isArray(cloudData.custom_media)) {
      let localMedia = JSON.parse(localStorage.getItem(STORAGE_KEY_MEDIA)) || [];
      const mediaMap = new Map();
      localMedia.forEach(m => {
        if (m && m.id && !localDeletedMediaIds.includes(m.id)) mediaMap.set(m.id, m);
      });
      cloudData.custom_media.forEach(m => {
        if (m && m.id && !localDeletedMediaIds.includes(m.id)) {
          const localM = mediaMap.get(m.id);
          if (!localM || !localM.updatedAt || (m.updatedAt && m.updatedAt >= localM.updatedAt)) {
            mediaMap.set(m.id, m);
          }
        }
      });
      const mergedMedia = Array.from(mediaMap.values());
      const localMediaStr = localStorage.getItem(STORAGE_KEY_MEDIA);
      const newMediaStr = JSON.stringify(mergedMedia);
      if (localMediaStr !== newMediaStr) {
        localStorage.setItem(STORAGE_KEY_MEDIA, newMediaStr);
        window.dispatchEvent(new CustomEvent('tkst_media_updated', { detail: mergedMedia }));
        changed = true;
      }
    }

    // 10. Sync Deleted Albums & Custom Albums
    let localDeletedAlbums = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED_ALBUMS)) || [];
    if (Array.isArray(cloudData.deletedAlbums)) {
      const mergedDelAlbums = Array.from(new Set([...localDeletedAlbums, ...cloudData.deletedAlbums]));
      if (mergedDelAlbums.length !== localDeletedAlbums.length) {
        localStorage.setItem(STORAGE_KEY_DELETED_ALBUMS, JSON.stringify(mergedDelAlbums));
        localDeletedAlbums = mergedDelAlbums;
        changed = true;
      }
    }

    if (Array.isArray(cloudData.custom_albums)) {
      let localAlbums = JSON.parse(localStorage.getItem(STORAGE_KEY_ALBUMS)) || [];
      const albumMap = new Map();
      localAlbums.forEach(a => {
        if (a && a.id && !localDeletedAlbums.includes(a.id)) albumMap.set(a.id, a);
      });
      cloudData.custom_albums.forEach(a => {
        if (a && a.id && !localDeletedAlbums.includes(a.id)) {
          const localA = albumMap.get(a.id);
          if (!localA || !localA.updatedAt || (a.updatedAt && a.updatedAt >= localA.updatedAt)) {
            albumMap.set(a.id, a);
          }
        }
      });
      const mergedAlbums = Array.from(albumMap.values());
      const localAlbStr = localStorage.getItem(STORAGE_KEY_ALBUMS);
      const newAlbStr = JSON.stringify(mergedAlbums);
      if (localAlbStr !== newAlbStr) {
        localStorage.setItem(STORAGE_KEY_ALBUMS, newAlbStr);
        window.dispatchEvent(new CustomEvent('tkst_albums_updated', { detail: mergedAlbums }));
        changed = true;
      }
    }

    // 11. Sync Deleted SubAlbums & Custom SubAlbums
    let localDeletedSubAlbums = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED_SUBALBUMS)) || [];
    if (Array.isArray(cloudData.deletedSubAlbums)) {
      const mergedDelSubs = Array.from(new Set([...localDeletedSubAlbums, ...cloudData.deletedSubAlbums.map(k => (k || '').toLowerCase().trim())]));
      if (mergedDelSubs.length !== localDeletedSubAlbums.length) {
        localStorage.setItem(STORAGE_KEY_DELETED_SUBALBUMS, JSON.stringify(mergedDelSubs));
        localDeletedSubAlbums = mergedDelSubs;
        changed = true;
      }
    }

    if (Array.isArray(cloudData.custom_subalbums)) {
      let localSubAlbums = JSON.parse(localStorage.getItem(STORAGE_KEY_SUBALBUMS)) || [];
      const subMap = new Map();
      localSubAlbums.forEach(s => {
        if (s && s.name) {
          const key = (s.albumId || 'exames') + '::' + s.name.trim().toLowerCase();
          if (!localDeletedSubAlbums.includes(key)) subMap.set(key, s);
        }
      });
      cloudData.custom_subalbums.forEach(s => {
        if (s && s.name) {
          const key = (s.albumId || 'exames') + '::' + s.name.trim().toLowerCase();
          if (!localDeletedSubAlbums.includes(key)) {
            const localS = subMap.get(key);
            if (!localS || !localS.updatedAt || (s.updatedAt && s.updatedAt >= localS.updatedAt)) {
              subMap.set(key, s);
            }
          }
        }
      });
      const mergedSubs = Array.from(subMap.values());
      const localSubsStr = localStorage.getItem(STORAGE_KEY_SUBALBUMS);
      const newSubsStr = JSON.stringify(mergedSubs);
      if (localSubsStr !== newSubsStr) {
        localStorage.setItem(STORAGE_KEY_SUBALBUMS, newSubsStr);
        window.dispatchEvent(new CustomEvent('tkst_subalbums_updated', { detail: mergedSubs }));
        changed = true;
      }
    }

    // 12. Sync Custom Curriculum (Plano de Estudos)
    if (cloudData.custom_curriculum && typeof cloudData.custom_curriculum === 'object') {
      let localCurr = {};
      try { localCurr = JSON.parse(localStorage.getItem(STORAGE_KEY_CURRICULUM)) || {}; } catch(e) {}
      const mergedCurr = { ...localCurr, ...cloudData.custom_curriculum };
      const currStr = JSON.stringify(mergedCurr);
      if (localStorage.getItem(STORAGE_KEY_CURRICULUM) !== currStr) {
        safeLocalStorageSet(STORAGE_KEY_CURRICULUM, currStr);
        window.dispatchEvent(new CustomEvent('tkst_curriculum_updated'));
        changed = true;
      }
    }

    // 13. Sync Generated Exams (Provas Geradas vinculadas ao código de 5 caracteres)
    if (cloudData.generated_exams && typeof cloudData.generated_exams === 'object') {
      try {
        let localExams = JSON.parse(localStorage.getItem('tkst_generated_exams') || '{}');
        const incoming = cloudData.generated_exams;
        const mergedExams = { ...localExams, ...incoming };
        Object.keys(incoming).forEach(k => {
          const rec = incoming[k];
          if (rec) {
            const raw = String(rec.examId || rec.baseExamId || k).replace(/^#/, '').trim().toUpperCase();
            const b5 = raw.split('-')[0].replace(/[^0-9A-Z]/g, '').slice(0, 5);
            mergedExams[k] = rec;
            mergedExams[raw] = rec;
            if (b5) mergedExams[b5] = rec;
          }
        });
        const exStr = JSON.stringify(mergedExams);
        if (!window.TKST_GENERATED_EXAMS_CACHE) window.TKST_GENERATED_EXAMS_CACHE = {};
        Object.assign(window.TKST_GENERATED_EXAMS_CACHE, mergedExams);
        if (localStorage.getItem('tkst_generated_exams') !== exStr) {
          safeLocalStorageSet('tkst_generated_exams', exStr);
        }
      } catch(e) {}
    }

    if (changed) {
      window.dispatchEvent(new CustomEvent('tkst_cloud_synced', { detail: { type: 'pull', time: new Date() } }));
      window.dispatchEvent(new CustomEvent('tkst_user_changed'));
      window.dispatchEvent(new CustomEvent('tkst_videos_updated'));
      window.dispatchEvent(new CustomEvent('tkst_glossary_updated'));
      window.dispatchEvent(new CustomEvent('tkst_submissions_updated'));
      window.dispatchEvent(new CustomEvent('tkst_media_updated'));
      window.dispatchEvent(new CustomEvent('tkst_albums_updated'));
      window.dispatchEvent(new CustomEvent('tkst_subalbums_updated'));
      window.dispatchEvent(new CustomEvent('tkst_curriculum_updated'));
    }
  }

  async function pullFromCloud() {
    try {
      // 0. Hidrata provas geradas diretamente do arquivo JSON estático
      try {
        const examsRes = await fetch('./assets/data/generated-exams.json?_=' + Date.now(), { cache: 'no-store' });
        if (examsRes.ok) {
          const fileExams = await examsRes.json();
          if (fileExams && typeof fileExams === 'object') {
            let localExams = {};
            try { localExams = JSON.parse(localStorage.getItem('tkst_generated_exams') || '{}'); } catch(e) {}
            const merged = { ...fileExams, ...localExams };
            if (!window.TKST_GENERATED_EXAMS_CACHE) window.TKST_GENERATED_EXAMS_CACHE = {};
            Object.assign(window.TKST_GENERATED_EXAMS_CACHE, merged);
            safeLocalStorageSet('tkst_generated_exams', JSON.stringify(merged));
          }
        }
      } catch(e) {}

      // 1. Endpoint dedicado do quiz bank (mais confiável — dados nunca são sobrescritos)
      pullQuizBankFromCloud().catch(() => {});

      // 2. Endpoint dedicado de alunos permanentes no GitHub
      pullStudentsFromCloud().catch(() => {});

      // 3. Endpoint dedicado de simulados permanentes no GitHub
      pullQuizSubmissionsFromCloud().catch(() => {});

      // 4. Endpoint dedicado de glossário japonês permanente no GitHub
      pullGlossaryFromCloud().catch(() => {});

      // 5. Endpoint dedicado de vídeos dos Katas permanente no GitHub
      pullKataVideosFromCloud().catch(() => {});

      // 6. Vercel Serverless /api/sync (dados gerais: alunos, dojos, etc.)
      try {
        const apiRes = await fetch('/api/sync', { cache: 'no-store' });
        if (apiRes.ok) {
          const apiJson = await apiRes.json();
          if (apiJson && apiJson.success && apiJson.data) {
            applyCloudData(apiJson.data);
          }
        }
      } catch(e) {}

      // 3. Poll ntfy.sh (tempo real — dados mais recentes das últimas 24h)
      const res = await fetch(SYNC_URL + '/json?poll=1');
      if (res.ok) {
        const text = await res.text();
        if (text && text.trim()) {
          const lines = text.trim().split('\n');
          let appliedMainCloudData = false;
          for (let i = lines.length - 1; i >= 0; i--) {
            try {
              const item = JSON.parse(lines[i]);
              const cloudData = await parseNtfyItem(item);
              if (cloudData) {
                // Previne auto-eco: se a mensagem foi originada por esta mesma aba/dispositivo, ignora
                if (cloudData.senderId && cloudData.senderId === CLIENT_SENDER_ID) {
                  continue;
                }
                if (cloudData.type === 'tkst_exam_generated' && cloudData.record) {
                  handleIncomingExamRecord(cloudData.record);
                  continue;
                }
                if (cloudData.type === 'tkst_quiz_edit_delta') {
                  handleIncomingQuizEditDelta(cloudData);
                  continue;
                }
                if (cloudData.type === 'tkst_quiz_chunk') {
                  handleIncomingQuizChunk(cloudData);
                  continue;
                }
                if (cloudData.type === 'quiz_sync_broadcast' && Array.isArray(cloudData.bank)) {
                  handleIncomingQuizChunk({ questions: cloudData.bank });
                  continue;
                }
                if (cloudData.type === 'sync_notification') {
                  if (!appliedMainCloudData) {
                    pullFromCloud();
                    appliedMainCloudData = true;
                  }
                  continue;
                }
                if (!appliedMainCloudData) {
                  applyCloudData(cloudData);
                  appliedMainCloudData = true;
                }
              }
            } catch(e) {}
          }
        }
      }
    } catch(err) {
      console.warn('Initial cloud pull notice:', err);
    }
  }

  function handleIncomingExamRecord(rec) {
    if (!rec) return;
    try {
      const cleanId = String(rec.examId || rec.baseExamId || '').trim().toUpperCase();
      const baseCode = cleanId.replace(/^#/, '').split('-')[0].replace(/[^0-9A-Z]/g, '').slice(0, 5);
      if (!window.TKST_GENERATED_EXAMS_CACHE) window.TKST_GENERATED_EXAMS_CACHE = {};
      if (rec.examId) window.TKST_GENERATED_EXAMS_CACHE[rec.examId] = rec;
      if (cleanId) window.TKST_GENERATED_EXAMS_CACHE[cleanId] = rec;
      if (baseCode) window.TKST_GENERATED_EXAMS_CACHE[baseCode] = rec;
      let localExams = {};
      try { localExams = JSON.parse(localStorage.getItem('tkst_generated_exams') || '{}'); } catch(e) {}
      if (rec.examId) localExams[rec.examId] = rec;
      if (cleanId) localExams[cleanId] = rec;
      if (baseCode) localExams[baseCode] = rec;
      safeLocalStorageSet('tkst_generated_exams', JSON.stringify(localExams));
    } catch(e) {}
  }

  function initRealtimeStream() {
    try {
      if (typeof EventSource !== 'undefined') {
        const es = new EventSource(SYNC_URL + '/sse');
        es.onmessage = async function(e) {
          try {
            const parsed = JSON.parse(e.data);
            if (parsed) {
              const cloudData = await parseNtfyItem(parsed);
              if (cloudData) {
                // Previne auto-eco: se a mensagem foi transmitida por este mesmo cliente, ignora completamente
                if (cloudData.senderId && cloudData.senderId === CLIENT_SENDER_ID) {
                  return;
                }
                if (cloudData.type === 'tkst_exam_generated' && cloudData.record) {
                  handleIncomingExamRecord(cloudData.record);
                } else if (cloudData.type === 'tkst_quiz_edit_delta') {
                  handleIncomingQuizEditDelta(cloudData);
                } else if (cloudData.type === 'tkst_quiz_chunk') {
                  handleIncomingQuizChunk(cloudData);
                } else if (cloudData.type === 'quiz_sync_broadcast' && Array.isArray(cloudData.bank)) {
                  handleIncomingQuizChunk({ questions: cloudData.bank });
                } else if (cloudData.type === 'sync_notification') {
                  pullFromCloud();
                } else {
                  applyCloudData(cloudData);
                }
              }
            }
          } catch(err) {}
        };
        es.onerror = function() {
          // EventSource auto-reconnects on disconnection
        };
      }
    } catch(err) {}
  }

  // Start automatic stream & initial pull
  pullFromCloud().then(() => {
    // Initial bootstrap push if cloud was empty
    const students = JSON.parse(localStorage.getItem(STORAGE_KEY_STUDENTS)) || [];
    if (students.length > 0) {
      pushToCloud();
    }
  });
  initRealtimeStream();

  // Automatic pull on window focus / tab switch
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') pullFromCloud();
    });
    window.addEventListener('focus', () => pullFromCloud());
    window.addEventListener('DOMContentLoaded', () => {
      pullGlossaryFromCloud();
    });
  }

  function initStorage() {
    // Reset legacy sessions if migrating to Nick system
    if (!localStorage.getItem(AUTH_VERSION_KEY)) {
      localStorage.removeItem(STORAGE_KEY_USER);
      localStorage.setItem(AUTH_VERSION_KEY, 'true');
    }

    // Initialize Dojos (Ensure deleted dojos and default list are clean)
    try {
      let deletedDojos = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED_DOJOS)) || [];
      if (!deletedDojos.includes('tkst matriz - central')) {
        deletedDojos.push('tkst matriz - central');
        localStorage.setItem(STORAGE_KEY_DELETED_DOJOS, JSON.stringify(deletedDojos));
      }

      let savedDojos = JSON.parse(localStorage.getItem(STORAGE_KEY_DOJOS));
      if (Array.isArray(savedDojos)) {
        savedDojos = savedDojos.filter(d => typeof d === 'string' && d.trim().length > 0 && !deletedDojos.includes(d.toLowerCase().trim()) && d.toLowerCase().trim() !== 'tkst matriz - central');
        localStorage.setItem(STORAGE_KEY_DOJOS, JSON.stringify(savedDojos));
      } else {
        localStorage.setItem(STORAGE_KEY_DOJOS, JSON.stringify(OFFICIAL_DOJOS));
      }
    } catch(e) {}

    // Seed default accounts (including Admin irons365 and João Gabriel)
    let students = [];
    try {
      students = JSON.parse(localStorage.getItem(STORAGE_KEY_STUDENTS)) || [];
    } catch(e) {
      students = [];
    }

    // Ensure Master Admin exists without hardcoded plain text credentials
    const adminIndex = students.findIndex(s => s.username === 'irons365');
    const masterAdminDefault = {
      id: 'admin_irons365',
      username: 'irons365',
      email: 'irons365@tkst.com.br',
      name: 'Sensei Diego',
      role: 'admin',
      currentBelt: 'Faixa Preta',
      targetBelt: 'Faixa Preta',
      currentKyu: 0,
      dojo: 'TKST Central & Diretoria Geral',
      startDate: '2000-01-01',
      avatar: 'assets/images/logo-tkst.png',
      status: 'approved',
      updatedAt: 1,
      notes: 'Administrador Master responsável por todo o sistema, arquivos e aprovações.'
    };

    if (adminIndex === -1) {
      students.unshift(masterAdminDefault);
    } else {
      // Keep all user edits (name, belt, etc.) and only fill missing fields
      students[adminIndex] = { ...masterAdminDefault, ...students[adminIndex] };
    }

    // Ensure João Gabriel Fonseca da Silva is ALWAYS present and approved
    const joaoIndex = students.findIndex(s => 
      (s.username && s.username.toLowerCase().includes('joaogabriel')) ||
      (s.email && s.email.toLowerCase().includes('joaogabriel')) ||
      (s.name && s.name.toLowerCase().includes('joão gabriel'))
    );
    const joaoGabrielDefault = {
      id: 'std_joaogabriel',
      username: 'joaogabriel.dasilva3150@gmail.com',
      email: 'joaogabriel.dasilva3150@gmail.com',
      name: 'João Gabriel Fonseca da Silva',
      role: 'aluno',
      currentBelt: 'Faixa Amarela (6º Kyu)',
      targetBelt: 'Faixa Vermelha (5º Kyu)',
      currentKyu: 6,
      dojo: 'TKST Santo Aleixo',
      startDate: '2026-08-20',
      avatar: 'assets/images/logo-tkst.png',
      status: 'approved',
      approvedAt: '2026-08-20T15:30:00.000Z',
      createdAt: '2026-08-20T15:08:00.000Z',
      updatedAt: Date.now(),
      statusUpdatedAt: Date.now(),
      notes: 'Aluno matriculado na unidade TKST Santo Aleixo. Acesso liberado pelo Sensei Diego.'
    };

    if (joaoIndex === -1) {
      students.push(joaoGabrielDefault);
    } else {
      students[joaoIndex] = { ...students[joaoIndex], ...joaoGabrielDefault, status: 'approved' };
    }

    // Default sample students
    if (students.length === 2) {
      students.push(
        {
          id: 'std_01',
          username: 'lucas.karate',
          email: 'lucas@tkst.com.br',
          name: 'Lucas Silva',
          role: 'aluno',
          currentBelt: 'Faixa Branca',
          targetBelt: 'Faixa Amarela (6º Kyu)',
          currentKyu: 6,
          dojo: 'TKST Matriz - Central',
          startDate: '2026-01-10',
          avatar: 'assets/images/tigre.png',
          status: 'approved',
          notes: 'Treinando para o exame de Faixa Amarela.'
        },
        {
          id: 'std_02',
          username: 'mariana.costa',
          email: 'mariana@tkst.com.br',
          name: 'Mariana Costa',
          role: 'aluno',
          currentBelt: 'Faixa Vermelha',
          targetBelt: 'Faixa Laranja (4º Kyu)',
          currentKyu: 4,
          dojo: 'TKST Santo Aleixo',
          startDate: '2025-06-15',
          avatar: 'assets/images/logo-tkst-clean.png',
          status: 'approved',
          notes: 'Focada no Heian Sandan e Sanbon Kumite.'
        }
      );
    }

    // Auto-migra qualquer aluno pendente para aprovado imediatamente (elimina bloqueios de cadastro)
    let hadPending = false;
    students.forEach(s => {
      if (s && s.status === 'pending') {
        s.status = 'approved';
        s.approvedAt = s.approvedAt || new Date().toISOString();
        s.statusUpdatedAt = Date.now();
        hadPending = true;
      }
    });

    localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(students));

    if (!localStorage.getItem(STORAGE_KEY_PROGRESS)) {
      localStorage.setItem(STORAGE_KEY_PROGRESS, JSON.stringify({}));
    }

    // Inicializa vídeos oficiais dos 26 Kata garantindo que nenhum Kata fique sem vídeo
    try {
      let currentVideos = JSON.parse(localStorage.getItem(STORAGE_KEY_VIDEOS));
      if (!currentVideos || typeof currentVideos !== 'object' || Object.keys(currentVideos).length === 0) {
        currentVideos = window.TKST_DEFAULT_KATA_VIDEOS || {};
        localStorage.setItem(STORAGE_KEY_VIDEOS, JSON.stringify(currentVideos));
      } else if (window.TKST_DEFAULT_KATA_VIDEOS) {
        let changedVideos = false;
        Object.keys(window.TKST_DEFAULT_KATA_VIDEOS).forEach(kId => {
          if (!currentVideos[kId] || (Array.isArray(currentVideos[kId]) && currentVideos[kId].length === 0)) {
            currentVideos[kId] = window.TKST_DEFAULT_KATA_VIDEOS[kId];
            changedVideos = true;
          }
        });
        if (changedVideos) {
          localStorage.setItem(STORAGE_KEY_VIDEOS, JSON.stringify(currentVideos));
        }
      }
    } catch(e) {}

    // Limpeza de emergência para simulados pesados (details) que estouram a cota do localStorage em celulares
    try {
      const rawSubs = localStorage.getItem(STORAGE_KEY_QUIZ_SUBMISSIONS);
      if (rawSubs && (rawSubs.length > 30000 || rawSubs.includes('"details":['))) {
        const parsed = JSON.parse(rawSubs);
        if (Array.isArray(parsed)) {
          const lightweight = parsed.map(s => {
            if (!s) return null;
            const { details, ...rest } = s;
            return rest;
          }).filter(Boolean);
          safeLocalStorageSet(STORAGE_KEY_QUIZ_SUBMISSIONS, JSON.stringify(lightweight.slice(0, 500)));
        }
      }
    } catch(e) {}

    // Pull from cloud immediately on boot
    pullFromCloud(false);
  }

  initStorage();

  window.TKST_AUTH = {
    syncNow: function() {
      return pullFromCloud(true);
    },

    pullStudentsFromCloud: function() {
      return pullStudentsFromCloud();
    },

    pullQuizSubmissionsFromCloud: function() {
      return pullQuizSubmissionsFromCloud();
    },

    pushNow: function() {
      return pushToCloud();
    },

    getAuthHeaders: function(extra = {}) {
      return getClientAuthHeaders(extra);
    },

    getCurrentUser: function() {
      try {
        const user = JSON.parse(localStorage.getItem(STORAGE_KEY_USER)) || null;
        if (user && (user.username === 'irons365' || (user.name && user.name.toLowerCase().includes('diego')))) {
          user.name = 'Sensei Diego';
        }
        return user;
      } catch (e) {
        return null;
      }
    },

    isAdmin: function() {
      const user = this.getCurrentUser();
      if (!user) return false;
      const uRole = (user.role || '').toLowerCase();
      const uName = (user.username || '').toLowerCase();
      return uRole === 'admin' || uName === 'irons365' || uName === 'admin' || (user.name && user.name.toLowerCase().includes('diego'));
    },

    isMasterAdmin: function() {
      const user = this.getCurrentUser();
      if (!user) return false;
      const uName = (user.username || '').toLowerCase();
      return uName === 'irons365' || uName === 'admin' || (user.name && user.name.toLowerCase().includes('diego'));
    },

    canManageStudents: function() {
      return this.isMasterAdmin();
    },

    canManageCredentials: function() {
      return this.isMasterAdmin();
    },

    getAllStudents: function() {
      try {
        let students = JSON.parse(localStorage.getItem(STORAGE_KEY_STUDENTS)) || [];
        let updated = false;
        students.forEach(s => {
          if (s && s.status === 'pending') {
            s.status = 'approved';
            s.approvedAt = s.approvedAt || new Date().toISOString();
            updated = true;
          }
        });
        if (updated) {
          localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(students));
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

        // Ordena por data de cadastro (mais recentes primeiro, Sensei Master no topo)
        students.sort((a, b) => {
          if (a.username === 'irons365') return -1;
          if (b.username === 'irons365') return 1;
          return getStudentRegTime(b) - getStudentRegTime(a);
        });

        return students;
      } catch (e) {
        return [];
      }
    },

    getTodayRegisteredStudents: function() {
      const students = this.getAllStudents();
      const todayStr = new Date().toISOString().split('T')[0];
      return students.filter(s => {
        if (!s || s.username === 'irons365') return false;
        const regDate = s.createdAt ? s.createdAt.split('T')[0] : (s.approvedAt ? s.approvedAt.split('T')[0] : '');
        return regDate === todayStr;
      });
    },

    setStudentRole: function(studentId, newRole) {
      if (!this.canManageCredentials()) {
        return { success: false, message: 'Apenas o Administrador Master (Sensei Diego) pode alterar credenciais de administradores.' };
      }
      return this.adminUpdateStudent(studentId, { role: newRole });
    },

    // ==========================================
    // DOJO MANAGEMENT
    // ==========================================
    getDojos: function() {
      let deletedDojos = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED_DOJOS)) || [];
      if (!deletedDojos.includes('tkst matriz - central')) {
        deletedDojos.push('tkst matriz - central');
      }
      try {
        const dojos = JSON.parse(localStorage.getItem(STORAGE_KEY_DOJOS));
        if (Array.isArray(dojos) && dojos.length > 0) {
          const filtered = dojos.filter(d => typeof d === 'string' && d.trim().length > 0 && !deletedDojos.includes(d.toLowerCase().trim()) && d.toLowerCase().trim() !== 'tkst matriz - central');
          if (filtered.length > 0) return filtered;
        }
      } catch(e) {}
      return OFFICIAL_DOJOS.filter(d => !deletedDojos.includes(d.toLowerCase().trim()) && d.toLowerCase().trim() !== 'tkst matriz - central');
    },

    addDojo: function(dojoName) {
      const trimmed = (dojoName || '').trim();
      if (!trimmed) return { success: false, message: 'Digite o nome do Dojo.' };

      let deletedDojos = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED_DOJOS)) || [];
      deletedDojos = deletedDojos.filter(d => (d || '').toLowerCase().trim() !== trimmed.toLowerCase());
      localStorage.setItem(STORAGE_KEY_DELETED_DOJOS, JSON.stringify(deletedDojos));

      let dojos = this.getDojos();
      if (dojos.some(d => (d || '').toLowerCase().trim() === trimmed.toLowerCase())) {
        return { success: false, message: 'Já existe um Dojo cadastrado com este nome.' };
      }

      dojos.push(trimmed);
      localStorage.setItem(STORAGE_KEY_DOJOS, JSON.stringify(dojos));
      pushToCloud();
      return { success: true, dojos };
    },

    deleteDojo: function(dojoName) {
      const trimmed = (dojoName || '').trim();
      if (!trimmed) return { success: false, message: 'Nome inválido de Dojo.' };

      let deletedDojos = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED_DOJOS)) || [];
      if (!deletedDojos.includes(trimmed.toLowerCase())) {
        deletedDojos.push(trimmed.toLowerCase());
      }
      localStorage.setItem(STORAGE_KEY_DELETED_DOJOS, JSON.stringify(deletedDojos));

      let dojos = this.getDojos();
      dojos = dojos.filter(d => (d || '').toLowerCase().trim() !== trimmed.toLowerCase());
      localStorage.setItem(STORAGE_KEY_DOJOS, JSON.stringify(dojos));
      pushToCloud();
      return { success: true, dojos };
    },

    // ==========================================
    // CUSTOM KATA VIDEOS (CLOUD SYNCED - MULTI-VIDEO SUPPORT)
    // ==========================================
    getCustomKataVideos: function() {
      try {
        const raw = JSON.parse(localStorage.getItem(STORAGE_KEY_VIDEOS)) || {};
        const normalized = {};
        Object.keys(raw).forEach(kataId => {
          const val = raw[kataId];
          if (typeof val === 'string') {
            if (val.trim()) {
              normalized[kataId] = [{
                id: 'vid_legacy',
                title: 'Vídeo Técnico Principal',
                description: 'Demonstração oficial do Kata.',
                url: val.trim()
              }];
            }
          } else if (Array.isArray(val)) {
            normalized[kataId] = val.filter(v => v && v.url && v.url.trim()).map((v, i) => ({
              id: v.id || `vid_${i + 1}`,
              title: (v.title && v.title.trim()) || `Vídeo ${i + 1}`,
              description: (v.description && v.description.trim()) || '',
              url: v.url.trim()
            }));
          }
        });

        // Garante que todo Kata sem vídeo customizado receba os vídeos oficiais recuperados
        const defaults = window.TKST_DEFAULT_KATA_VIDEOS || {};
        Object.keys(defaults).forEach(kataId => {
          if (!normalized[kataId] || normalized[kataId].length === 0) {
            normalized[kataId] = defaults[kataId];
          }
        });

        return normalized;
      } catch (e) {
        return window.TKST_DEFAULT_KATA_VIDEOS || {};
      }
    },

    saveCustomKataVideos: function(videos) {
      localStorage.setItem(STORAGE_KEY_VIDEOS, JSON.stringify(videos || {}));
      pushToCloud();
      pushKataVideosToServer(videos);
      window.dispatchEvent(new CustomEvent('tkst_videos_updated', { detail: videos }));
    },

    saveKataVideosList: function(kataId, list) {
      const allVideos = this.getCustomKataVideos();
      if (Array.isArray(list) && list.length > 0) {
        allVideos[kataId] = list.filter(v => v && v.url && v.url.trim()).map((v, i) => ({
          id: v.id || `vid_${Date.now()}_${i}`,
          title: (v.title && v.title.trim()) || `Vídeo ${i + 1}`,
          description: (v.description && v.description.trim()) || '',
          url: v.url.trim()
        }));
      } else {
        delete allVideos[kataId];
      }
      this.saveCustomKataVideos(allVideos);
      return { success: true, videos: allVideos };
    },

    addKataVideo: function(kataId, title, url, description = '') {
      const allVideos = this.getCustomKataVideos();
      const currentList = allVideos[kataId] || [];
      if (!url || !url.trim()) return { success: false, message: 'URL do vídeo é obrigatória.' };

      currentList.push({
        id: `vid_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        title: (title && title.trim()) || `Vídeo ${currentList.length + 1}`,
        description: (description && description.trim()) || '',
        url: url.trim()
      });
      allVideos[kataId] = currentList;
      this.saveCustomKataVideos(allVideos);
      return { success: true, videos: allVideos };
    },

    updateKataVideo: function(kataId, videoId, title, url, description = '') {
      const allVideos = this.getCustomKataVideos();
      const currentList = allVideos[kataId] || [];
      const idx = currentList.findIndex(v => v.id === videoId);
      if (idx === -1) return { success: false, message: 'Vídeo não encontrado.' };

      currentList[idx] = {
        id: videoId,
        title: (title && title.trim()) || `Vídeo ${idx + 1}`,
        description: (description && description.trim()) || '',
        url: url.trim()
      };
      allVideos[kataId] = currentList;
      this.saveCustomKataVideos(allVideos);
      return { success: true, videos: allVideos };
    },

    deleteKataVideo: function(kataId, videoId) {
      const allVideos = this.getCustomKataVideos();
      let currentList = allVideos[kataId] || [];
      currentList = currentList.filter(v => v.id !== videoId);
      if (currentList.length > 0) {
        allVideos[kataId] = currentList;
      } else {
        delete allVideos[kataId];
      }
      this.saveCustomKataVideos(allVideos);
      return { success: true, videos: allVideos };
    },

    saveKataVideo: function(kataId, url) {
      if (url && url.trim()) {
        return this.addKataVideo(kataId, 'Vídeo Técnico', url.trim(), '');
      } else {
        return this.saveKataVideosList(kataId, []);
      }
    },

    // ==========================================
    // PRESENCE & ONLINE STATUS TRACKING
    // ==========================================
    isOnline: function(studentOrTimestamp) {
      if (!studentOrTimestamp) return false;
      let timestamp = studentOrTimestamp;
      if (typeof studentOrTimestamp === 'object') {
        const currentUser = this.getCurrentUser();
        if (currentUser && (currentUser.id === studentOrTimestamp.id || currentUser.username === studentOrTimestamp.username)) {
          return true;
        }
        timestamp = studentOrTimestamp.lastActive;
      }
      if (!timestamp) return false;
      const time = typeof timestamp === 'number' ? timestamp : new Date(timestamp).getTime();
      if (isNaN(time) || time <= 0) return false;
      const diff = Date.now() - time;
      return diff >= 0 && diff <= 4 * 60 * 1000;
    },

    getLastSeenText: function(studentOrTimestamp) {
      if (this.isOnline(studentOrTimestamp)) return 'Online agora';
      let timestamp = studentOrTimestamp;
      if (typeof studentOrTimestamp === 'object') {
        timestamp = studentOrTimestamp.lastActive;
      }
      if (!timestamp) return 'Nunca acessou';
      const time = typeof timestamp === 'number' ? timestamp : new Date(timestamp).getTime();
      if (isNaN(time) || time <= 0) return 'Nunca acessou';
      const diffMin = Math.max(0, Math.floor((Date.now() - time) / (1000 * 60)));
      if (diffMin < 1) return 'Online há instantes';
      if (diffMin < 60) return `Visto há ${diffMin}m`;
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return `Visto há ${diffHours}h`;
      const diffDays = Math.floor(diffHours / 24);
      return `Visto há ${diffDays}d`;
    },

    recordHeartbeat: function() {
      const user = this.getCurrentUser();
      if (!user) return;
      const now = Date.now();
      const students = this.getAllStudents();
      const idx = students.findIndex(s => s.id === user.id || s.username === user.username);
      if (idx !== -1) {
        const prev = students[idx].lastActive ? new Date(students[idx].lastActive).getTime() : 0;
        if (now - prev >= 30000) {
          students[idx].lastActive = now;
          localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(students));
          user.lastActive = now;
          localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
          // lastActive atualizado localmente - pushToCloud() desativado aqui para evitar loop de tráfego a cada 30s
        }
      }
    },

    // ==========================================
    // AUTHENTICATION (BY NICK OR USERNAME)
    // ==========================================
    setCurrentUser: function(user) {
      if (user) {
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
      } else {
        localStorage.removeItem(STORAGE_KEY_USER);
      }
      window.dispatchEvent(new CustomEvent('tkst_user_changed', { detail: user }));
    },

    logout: function() {
      try {
        localStorage.removeItem('tkst_session_token');
      } catch(e) {}
      this.setCurrentUser(null);
    },

    login: async function(identifier, password) {
      if (!identifier || !password) {
        return { success: false, message: 'Por favor, preencha o seu Nick de Usuário e a senha.' };
      }

      const cleanId = identifier.trim().toLowerCase();
      const cleanPass = password.trim();

      // 1. Chamar endpoint centralizado /api/login com validação segura no backend
      try {
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: cleanId, password: cleanPass })
        });

        const data = await res.json().catch(() => ({}));

        if (res.ok && data && data.success && data.user) {
          if (data.token) {
            try {
              localStorage.setItem('tkst_session_token', data.token);
            } catch(e) {}
          }
          data.user.lastActive = Date.now();
          this.setCurrentUser(data.user);
          return { success: true, user: data.user };
        } else {
          return { 
            success: false, 
            message: (data && data.message) || 'Usuário ou senha incorretos.' 
          };
        }
      } catch (networkErr) {
        // Fallback Offline / PWA: se a rede falhar e o usuário atual já for este usuário
        const currentUser = this.getCurrentUser();
        if (currentUser && (
          (currentUser.username && currentUser.username.toLowerCase() === cleanId) ||
          (currentUser.email && currentUser.email.toLowerCase() === cleanId) ||
          (currentUser.id && currentUser.id.toLowerCase() === cleanId)
        )) {
          return { success: true, user: currentUser, offline: true };
        }
        return {
          success: false,
          message: 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet.'
        };
      }
    },

    register: function(studentData) {
      const students = this.getAllStudents();
      const cleanNick = (studentData.username || '').trim().toLowerCase();

      if (!cleanNick) {
        return { success: false, message: 'O campo Nick é obrigatório para sua matrícula.' };
      }

      if (cleanNick.length < 3) {
        return { success: false, message: 'O Nick deve conter no mínimo 3 caracteres.' };
      }

      if (students.some(s => s.username && s.username.toLowerCase() === cleanNick)) {
        return { success: false, message: `O Nick "${cleanNick}" já está em uso por outro aluno. Por favor, escolha outro Nick.` };
      }

      const pass = (studentData.password || '').trim();
      const passRegex = /^[a-zA-Z0-9]{4,11}$/;
      if (!passRegex.test(pass)) {
        return { success: false, message: 'A senha deve conter entre 4 e 11 caracteres (somente letras e números).' };
      }

      const beltKyuMap = {
        'Faixa Branca': 7,
        'Faixa Branca (7º Kyu)': 7,
        'Faixa Amarela': 6,
        'Faixa Amarela (6º Kyu)': 6,
        'Faixa Vermelha': 5,
        'Faixa Vermelha (5º Kyu)': 5,
        'Faixa Laranja': 4,
        'Faixa Laranja (4º Kyu)': 4,
        'Faixa Verde': 3,
        'Faixa Verde (3º Kyu)': 3,
        'Faixa Roxa': 2,
        'Faixa Roxa (2º Kyu)': 2,
        'Faixa Marrom': 1,
        'Faixa Marrom (1º Kyu)': 1,
        'Faixa Preta': 0,
        'Faixa Preta (Shodan)': 0,
        'Faixa Preta (Shodan - 1º Dan)': 0,
        'Faixa Preta (Nidan - 2º Dan)': 0,
        'Faixa Preta (Sandan - 3º Dan)': 0,
        'Faixa Preta (Yondan - 4º Dan)': 0,
        'Faixa Preta (Godan - 5º Dan)': 0,
        'Faixa Preta (Sensei Master)': 0
      };

      const selectedBelt = studentData.currentBelt || 'Faixa Branca (7º Kyu)';
      let parsedKyu = parseInt(studentData.currentKyu);
      if (isNaN(parsedKyu) || parsedKyu === undefined) {
        parsedKyu = beltKyuMap[selectedBelt] !== undefined ? beltKyuMap[selectedBelt] : 7;
      }
      if (selectedBelt.toLowerCase().includes('preta') || selectedBelt.toLowerCase().includes('dan') || selectedBelt.toLowerCase().includes('sensei')) {
        parsedKyu = 0;
      }

      const isBlack = parsedKyu === 0 || selectedBelt.toLowerCase().includes('preta') || selectedBelt.toLowerCase().includes('dan');
      const targetBelt = isBlack ? 'Faixa Preta' : (studentData.targetBelt || (parsedKyu === 7 ? 'Faixa Amarela (6º Kyu)' : 'Faixa Preta'));

      // Cruzamento inteligente de nomes com a base de alunos gerenciada pelo Sensei
      const cleanName = (studentData.name || '').trim();
      const normInput = cleanName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\s+/g, ' ');

      // Procura na base se já existe algum aluno cadastrado com este nome ou parte do nome
      let matchedExistingStudent = null;
      if (normInput.length >= 3) {
        matchedExistingStudent = students.find(s => {
          if (!s || !s.name || s.username === 'irons365') return false;
          const normExisting = s.name
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/\s+/g, ' ');

          if (normInput === normExisting) return true;
          if (normInput.length >= 4 && normExisting.length >= 4 && (normExisting.includes(normInput) || normInput.includes(normExisting))) return true;

          const inParts = normInput.split(' ');
          const exParts = normExisting.split(' ');
          if (inParts.length >= 2 && exParts.length >= 2) {
            if (inParts[0] === exParts[0] && inParts[inParts.length - 1] === exParts[exParts.length - 1]) return true;
          }
          return false;
        });
      }

      const newStudent = {
        id: matchedExistingStudent ? matchedExistingStudent.id : ('std_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5)),
        username: cleanNick,
        email: studentData.email ? studentData.email.trim() : `${cleanNick}@tkst.local`,
        name: cleanName,
        role: studentData.role || 'aluno',
        currentBelt: selectedBelt,
        targetBelt: targetBelt,
        currentKyu: parsedKyu,
        dojo: studentData.dojo || (matchedExistingStudent ? matchedExistingStudent.dojo : 'TKST Santo Aleixo'),
        startDate: studentData.startDate || (matchedExistingStudent ? matchedExistingStudent.startDate : new Date().toISOString().split('T')[0]),
        avatar: studentData.avatar || (matchedExistingStudent ? matchedExistingStudent.avatar : 'assets/images/logo-tkst.png'),
        status: 'approved',
        approvedAt: new Date().toISOString(),
        createdAt: matchedExistingStudent ? (matchedExistingStudent.createdAt || new Date().toISOString()) : new Date().toISOString(),
        updatedAt: Date.now(),
        statusUpdatedAt: Date.now(),
        notes: studentData.notes || 'Novo aluno cadastrado pelo portal.'
      };

      if (pass && typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
        (async () => {
          try {
            const enc = new TextEncoder();
            const saltBytes = new Uint8Array(16);
            window.crypto.getRandomValues(saltBytes);
            const saltHex = Array.from(saltBytes).map(b => b.toString(16).padStart(2, '0')).join('');
            const passKey = await window.crypto.subtle.importKey('raw', enc.encode(pass), { name: 'PBKDF2' }, false, ['deriveBits']);
            const bits = await window.crypto.subtle.deriveBits({ name: 'PBKDF2', salt: saltBytes, iterations: 100000, hash: 'SHA-256' }, passKey, 256);
            const hashHex = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');

            const curStudents = JSON.parse(localStorage.getItem(STORAGE_KEY_STUDENTS)) || [];
            const idx = curStudents.findIndex(s => s.id === newStudent.id);
            if (idx !== -1) {
              curStudents[idx].passwordHash = hashHex;
              curStudents[idx].passwordSalt = saltHex;
              localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(curStudents));
            }
          } catch(e) {}
        })();
      }

      if (matchedExistingStudent) {
        const existIdx = students.findIndex(s => s.id === matchedExistingStudent.id);
        if (existIdx !== -1) {
          students[existIdx] = { ...students[existIdx], ...newStudent };
        } else {
          students.push(newStudent);
        }
      } else {
        students.push(newStudent);
      }

      localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(students));
      
      const deletedStudentIds = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED)) || [];
      pushStudentsToServer(students, deletedStudentIds);
      pushToCloud();

      // Login automático imediato após o cadastro
      this.setCurrentUser(newStudent);

      return { success: true, user: newStudent, autoApproved: true };
    },

    approveStudent: function(studentId) {
      if (!this.canManageStudents()) return { success: false, message: 'Apenas o Administrador Master (Sensei Diego) pode aprovar alunos.' };
      const students = this.getAllStudents();
      const idx = students.findIndex(s => s.id === studentId);
      if (idx !== -1) {
        students[idx].status = 'approved';
        students[idx].approvedAt = new Date().toISOString();
        students[idx].statusUpdatedAt = Date.now();
        students[idx].updatedAt = Date.now();
        localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(students));
        const deleted = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED)) || [];
        pushStudentsToServer(students, deleted);
        pushToCloud();
        return { success: true, student: students[idx] };
      }
      return { success: false, message: 'Aluno não encontrado.' };
    },

    importDojobookStudents: function(studentsList) {
      if (!this.canManageStudents()) return { success: false, message: 'Apenas o Administrador Master (Sensei Diego) pode importar alunos.' };
      if (!Array.isArray(studentsList) || studentsList.length === 0) return { success: false, message: 'Nenhum aluno para importar.' };
      let currentStudents = this.getAllStudents();
      const studentMap = new Map();
      currentStudents.forEach(s => {
        if (s && s.id) studentMap.set(s.id, s);
      });

      let addedCount = 0;
      let updatedCount = 0;

      studentsList.forEach(item => {
        if (!item || !item.name) return;
        const cleanName = item.name.trim();
        if (cleanName.length < 2) return;

        // Normalização para busca
        const normItem = cleanName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        let existing = null;
        for (const [id, s] of studentMap.entries()) {
          if (s && s.name && s.username !== 'irons365') {
            const normS = s.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
            if (normS === normItem || normS.includes(normItem) || normItem.includes(normS)) {
              existing = s;
              break;
            }
          }
        }

        if (existing) {
          if (item.currentBelt) existing.currentBelt = item.currentBelt;
          if (item.dojo) existing.dojo = item.dojo;
          if (item.phone) existing.phone = item.phone;
          existing.status = 'approved';
          existing.updatedAt = Date.now();
          updatedCount++;
        } else {
          const newId = 'std_dojo_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
          const genNick = cleanName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '') + Math.floor(Math.random()*90 + 10);
          const newObj = {
            id: newId,
            username: item.username || genNick,
            email: item.email || `${genNick}@tkst.local`,
            password: item.password || '1234',
            name: cleanName,
            role: 'aluno',
            currentBelt: item.currentBelt || 'Faixa Branca (7º Kyu)',
            targetBelt: item.targetBelt || 'Faixa Amarela (6º Kyu)',
            currentKyu: item.currentKyu !== undefined ? item.currentKyu : 7,
            dojo: item.dojo || 'TKST Santo Aleixo',
            startDate: item.startDate || new Date().toISOString().split('T')[0],
            avatar: 'assets/images/logo-tkst.png',
            status: 'approved',
            approvedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: Date.now(),
            phone: item.phone || '',
            notes: 'Importado da base oficial DojôBook.'
          };
          studentMap.set(newId, newObj);
          addedCount++;
        }
      });

      const finalStudents = Array.from(studentMap.values());
      localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(finalStudents));
      const deleted = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED)) || [];
      pushStudentsToServer(finalStudents, deleted);
      pushToCloud();

      return { success: true, added: addedCount, updated: updatedCount, total: finalStudents.length };
    },

    rejectStudent: function(studentId) {
      if (!this.canManageStudents()) return { success: false, message: 'Apenas o Administrador Master (Sensei Diego) pode recusar alunos.' };
      const students = this.getAllStudents();
      const idx = students.findIndex(s => s.id === studentId);
      if (idx !== -1) {
        students[idx].status = 'rejected';
        students[idx].rejectedAt = new Date().toISOString();
        students[idx].statusUpdatedAt = Date.now();
        students[idx].updatedAt = Date.now();
        localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(students));
        const deleted = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED)) || [];
        pushStudentsToServer(students, deleted);
        pushToCloud();
        return { success: true, student: students[idx] };
      }
      return { success: false, message: 'Aluno não encontrado.' };
    },

    deleteStudent: function(studentId) {
      if (!this.canManageStudents()) return { success: false, message: 'Apenas o Administrador Master (Sensei Diego) pode excluir alunos.' };
      let students = this.getAllStudents();
      const target = students.find(s => s.id === studentId);
      if (target && target.username === 'irons365') {
        return { success: false, message: 'Não é permitido excluir o Administrador Geral Master.' };
      }

      // Record tombstone so this student is never resurrected by other devices
      let deleted = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED) || '[]');
      if (!deleted.includes(studentId)) {
        deleted.push(studentId);
        localStorage.setItem(STORAGE_KEY_DELETED, JSON.stringify(deleted));
      }

      students = students.filter(s => s.id !== studentId);
      localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(students));
      pushStudentsToServer(students, deleted);
      pushToCloud();
      return { success: true };
    },

    adminUpdateStudent: function(studentId, updatedData) {
      if (!studentId) return { success: false, message: 'ID do aluno inválido.' };

      // Se for apenas alteração de credencial/role, exige canManageCredentials
      const isRoleOnlyChange = updatedData && Object.keys(updatedData).length === 1 && updatedData.role !== undefined;
      if (isRoleOnlyChange) {
        if (!this.canManageCredentials()) {
          return { success: false, message: 'Apenas o Administrador Master (Sensei Diego) pode conceder ou alterar credenciais de administrador.' };
        }
      } else {
        if (!this.canManageStudents()) {
          return { success: false, message: 'Apenas o Administrador Master (Sensei Diego) pode gerenciar ou editar cadastros de alunos.' };
        }
      }

      let students = this.getAllStudents();
      const idx = students.findIndex(s => s.id === studentId);
      if (idx === -1) {
        return { success: false, message: 'Aluno não encontrado na base.' };
      }

      const existing = { ...students[idx] };

      // Validate new username if changed
      if (updatedData.username) {
        const cleanNick = updatedData.username.trim().toLowerCase();
        if (cleanNick.length < 3) {
          return { success: false, message: 'O Nick/Login deve conter no mínimo 3 caracteres.' };
        }
        const duplicate = students.find(s => s.id !== studentId && s.username && s.username.toLowerCase() === cleanNick);
        if (duplicate) {
          return { success: false, message: `O Nick "${cleanNick}" já está em uso por outro aluno.` };
        }
        existing.username = cleanNick;
      }

      // Update password if provided
      if (updatedData.password) {
        const pass = updatedData.password.trim();
        if (pass.length < 4 || pass.length > 20) {
          return { success: false, message: 'A nova senha deve conter entre 4 e 20 caracteres.' };
        }
        existing.password = pass;
      }

      if (updatedData.name && updatedData.name.trim()) {
        existing.name = updatedData.name.trim();
      }

      if (updatedData.email !== undefined) {
        existing.email = updatedData.email.trim();
      }

      if (updatedData.phone !== undefined) {
        existing.phone = updatedData.phone.trim();
      }

      if (updatedData.dojo) {
        existing.dojo = updatedData.dojo.trim();
      }

      if (updatedData.currentBelt) {
        existing.currentBelt = updatedData.currentBelt;
        const beltKyuMap = {
          'Faixa Branca': 7,
          'Faixa Branca (7º Kyu)': 7,
          'Faixa Amarela': 6,
          'Faixa Amarela (6º Kyu)': 6,
          'Faixa Vermelha': 5,
          'Faixa Vermelha (5º Kyu)': 5,
          'Faixa Laranja': 4,
          'Faixa Laranja (4º Kyu)': 4,
          'Faixa Verde': 3,
          'Faixa Verde (3º Kyu)': 3,
          'Faixa Roxa': 2,
          'Faixa Roxa (2º Kyu)': 2,
          'Faixa Marrom': 1,
          'Faixa Marrom (1º Kyu)': 1,
          'Faixa Preta': 0,
          'Faixa Preta (Shodan)': 0,
          'Faixa Preta (Shodan - 1º Dan)': 0,
          'Faixa Preta (Nidan - 2º Dan)': 0,
          'Faixa Preta (Sandan - 3º Dan)': 0,
          'Faixa Preta (Yondan - 4º Dan)': 0,
          'Faixa Preta (Godan - 5º Dan)': 0,
          'Faixa Preta (Sensei Master)': 0
        };
        if (beltKyuMap[updatedData.currentBelt] !== undefined) {
          existing.currentKyu = beltKyuMap[updatedData.currentBelt];
        }
      }

      if (updatedData.targetBelt) {
        existing.targetBelt = updatedData.targetBelt.trim();
      }

      if (updatedData.status) {
        existing.status = updatedData.status;
        existing.statusUpdatedAt = Date.now();
        if (updatedData.status === 'approved' && !existing.approvedAt) {
          existing.approvedAt = new Date().toISOString();
        }
      }

      if (updatedData.role) {
        if (!this.canManageCredentials()) {
          return { success: false, message: 'Apenas o Administrador Master pode conceder ou alterar credenciais.' };
        }
        if (existing.username === 'irons365') {
          existing.role = 'admin';
        } else {
          existing.role = updatedData.role === 'admin' ? 'admin' : 'aluno';
        }
      }

      if (updatedData.notes !== undefined) {
        existing.notes = updatedData.notes.trim();
      }

      existing.updatedAt = Date.now();
      students[idx] = existing;

      localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(students));
      const deleted = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED)) || [];
      pushStudentsToServer(students, deleted);
      pushToCloud();

      // If updating currently logged in user profile
      const currentUser = this.getCurrentUser();
      if (currentUser && currentUser.id === studentId) {
        this.setCurrentUser(existing);
      }

      return { success: true, student: existing };
    },

    getProgress: function(userId) {
      const uid = userId || (this.getCurrentUser() ? this.getCurrentUser().id : 'guest');
      try {
        const allProgress = JSON.parse(localStorage.getItem(STORAGE_KEY_PROGRESS)) || {};
        return allProgress[uid] || { masteredItems: {}, quizScores: [] };
      } catch (e) {
        return { masteredItems: {}, quizScores: [] };
      }
    },

    toggleMasteredItem: function(itemId) {
      const user = this.getCurrentUser();
      if (!user) return false;
      const allProgress = JSON.parse(localStorage.getItem(STORAGE_KEY_PROGRESS)) || {};
      if (!allProgress[user.id]) {
        allProgress[user.id] = { masteredItems: {}, quizScores: [] };
      }
      const isMastered = !allProgress[user.id].masteredItems[itemId];
      allProgress[user.id].masteredItems[itemId] = isMastered;
      localStorage.setItem(STORAGE_KEY_PROGRESS, JSON.stringify(allProgress));
      pushToCloud();
      window.dispatchEvent(new CustomEvent('tkst_progress_updated', { detail: { itemId, isMastered } }));
      return isMastered;
    },

    updateProfile: function(updatedData) {
      const currentUser = this.getCurrentUser();
      if (!currentUser) return { success: false, message: 'Nenhum usuário logado no momento.' };

      let students = this.getAllStudents();
      const userIndex = students.findIndex(s => s.id === currentUser.id || (s.username && s.username.toLowerCase() === (currentUser.username || '').toLowerCase()));

      const cleanName = (updatedData.name || '').trim();
      if (!cleanName) {
        return { success: false, message: 'O nome completo não pode ficar vazio.' };
      }

      const cleanNick = (updatedData.username || '').trim().toLowerCase();
      if (!cleanNick || cleanNick.length < 3) {
        return { success: false, message: 'O Nick deve ter no mínimo 3 caracteres.' };
      }

      // Check if new nick is taken by another user
      if (students.some(s => s.id !== currentUser.id && s.username && s.username.toLowerCase() === cleanNick)) {
        return { success: false, message: `O Nick "${cleanNick}" já está sendo usado por outro aluno.` };
      }

      let newPassword = currentUser.password;
      if (updatedData.password && updatedData.password.trim()) {
        const pass = updatedData.password.trim();
        const passRegex = /^[a-zA-Z0-9]{4,11}$/;
        if (!passRegex.test(pass)) {
          return { success: false, message: 'A nova senha deve ter entre 4 e 11 caracteres (somente letras e números).' };
        }
        if (updatedData.passwordConfirm && pass !== updatedData.passwordConfirm.trim()) {
          return { success: false, message: 'A confirmação da nova senha não confere.' };
        }
        newPassword = pass;
      }

      const beltKyuMap = {
        'Faixa Branca': 6,
        'Faixa Amarela': 6,
        'Faixa Amarela (6º Kyu)': 6,
        'Faixa Vermelha': 5,
        'Faixa Vermelha (5º Kyu)': 5,
        'Faixa Laranja': 4,
        'Faixa Laranja (4º Kyu)': 4,
        'Faixa Verde': 3,
        'Faixa Verde (3º Kyu)': 3,
        'Faixa Roxa': 2,
        'Faixa Roxa (2º Kyu)': 2,
        'Faixa Marrom': 1,
        'Faixa Marrom (1º Kyu)': 1,
        'Faixa Preta': 0,
        'Faixa Preta (Shodan)': 0,
        'Faixa Preta (Shodan - 1º Dan)': 0,
        'Faixa Preta (Nidan - 2º Dan)': 0,
        'Faixa Preta (Sandan - 3º Dan)': 0,
        'Faixa Preta (Yondan - 4º Dan)': 0,
        'Faixa Preta (Godan - 5º Dan)': 0,
        'Faixa Preta (Sensei Master)': 0
      };

      const beltTargetMap = {
        6: 'Faixa Amarela (6º Kyu)',
        5: 'Faixa Vermelha (5º Kyu)',
        4: 'Faixa Laranja (4º Kyu)',
        3: 'Faixa Verde (3º Kyu)',
        2: 'Faixa Roxa (2º Kyu)',
        1: 'Faixa Marrom (1º Kyu)',
        0: 'Faixa Preta'
      };

      const selectedBelt = updatedData.currentBelt || currentUser.currentBelt;
      const kyu = beltKyuMap[selectedBelt] !== undefined ? beltKyuMap[selectedBelt] : (currentUser.currentKyu || 6);
      const targetBelt = (selectedBelt.includes('Sensei') || selectedBelt.includes('Preta') || selectedBelt.includes('Dan')) ? 'Faixa Preta' : (beltTargetMap[kyu] || 'Faixa Preta');

      const updatedUser = {
        ...currentUser,
        name: cleanName,
        username: cleanNick,
        phone: updatedData.phone !== undefined ? updatedData.phone.trim() : (currentUser.phone || ''),
        dojo: updatedData.dojo ? updatedData.dojo.trim() : (currentUser.dojo || 'TKST Santo Aleixo'),
        currentBelt: selectedBelt,
        currentKyu: kyu,
        targetBelt: targetBelt,
        avatar: updatedData.avatar || currentUser.avatar || 'assets/images/logo-tkst.png',
        password: newPassword,
        updatedAt: Date.now()
      };

      if (currentUser.username === 'irons365' || currentUser.role === 'admin') {
        updatedUser.role = 'admin';
      }

      if (userIndex !== -1) {
        students[userIndex] = { ...students[userIndex], ...updatedUser };
      } else {
        students.push(updatedUser);
      }

      localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(students));
      this.setCurrentUser(updatedUser);
      const deleted = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED)) || [];
      pushStudentsToServer(students, deleted);
      pushToCloud();

      return { success: true, user: updatedUser };
    },

    syncNow: async function() {
      await pushToCloud();
      await pullFromCloud(true);
      return { success: true, timestamp: new Date() };
    },

    saveQuizSubmission: function(data) {
      const user = this.getCurrentUser();
      if (!user && !data.studentId && !data.studentName) return null;

      const nowIso = new Date().toISOString();
      const allStudents = JSON.parse(localStorage.getItem(STORAGE_KEY_STUDENTS)) || [];
      const evaluatedUser = (data.studentId && allStudents.find(s => s && s.id === data.studentId)) ||
                            (data.studentName && allStudents.find(s => s && (s.name === data.studentName || s.username === data.studentName))) ||
                            user || { id: 'temp_student', name: data.studentName || 'Aluno TKST', username: 'aluno' };

      // 1. Update user progress in local storage
      const allProgress = JSON.parse(localStorage.getItem(STORAGE_KEY_PROGRESS)) || {};
      if (!allProgress[evaluatedUser.id]) {
        allProgress[evaluatedUser.id] = { masteredItems: {}, quizScores: [] };
      }
      if (!allProgress[evaluatedUser.id].quizScores) {
        allProgress[evaluatedUser.id].quizScores = [];
      }
      const scoreItem = {
        date: nowIso,
        score: data.score,
        total: data.total,
        percentage: Math.round((data.score / data.total) * 100),
        beltLevel: data.beltLevel,
        beltKyu: data.beltKyu !== undefined ? data.beltKyu : 7,
        isOmr: Boolean(data.isOmr)
      };
      allProgress[evaluatedUser.id].quizScores.push(scoreItem);
      localStorage.setItem(STORAGE_KEY_PROGRESS, JSON.stringify(allProgress));

      // 2. Also record directly into the student profile object in allStudents
      try {
        const studentIndex = allStudents.findIndex(s => s && (s.id === evaluatedUser.id || s.username === evaluatedUser.username));
        if (studentIndex >= 0) {
          const std = allStudents[studentIndex];
          std.quizScores = std.quizScores || [];
          std.quizScores.push(scoreItem);
          std.updatedAt = Date.now();
          allStudents[studentIndex] = std;
          localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(allStudents));
          const deletedStudentIds = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED)) || [];
          pushStudentsToServer(allStudents, deletedStudentIds);
        }
      } catch(e) {}

      // 3. Add to global submissions for admin review
      let submissions = [];
      try {
        submissions = JSON.parse(localStorage.getItem(STORAGE_KEY_QUIZ_SUBMISSIONS)) || [];
      } catch(e) { submissions = []; }

      const submission = {
        id: 'quiz_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        studentId: evaluatedUser.id,
        studentName: evaluatedUser.name || evaluatedUser.username,
        studentUsername: evaluatedUser.username || evaluatedUser.name,
        studentBelt: evaluatedUser.currentBelt || data.beltLevel || 'Faixa Branca',
        studentKyu: evaluatedUser.currentKyu !== undefined ? evaluatedUser.currentKyu : (data.beltKyu !== undefined ? data.beltKyu : 7),
        beltLevel: data.beltLevel,
        beltKyu: data.beltKyu !== undefined ? data.beltKyu : 7,
        score: data.score,
        total: data.total,
        percentage: Math.round((data.score / data.total) * 100),
        passed: Math.round((data.score / data.total) * 100) >= 70,
        perfect: data.score === data.total,
        date: nowIso,
        details: Array.isArray(data.details) ? data.details : [],
        isOmr: Boolean(data.isOmr),
        examCode: data.examCode || '',
        overallConfidence: data.overallConfidence || null
      };

      submissions.unshift(submission);
      submissions = deduplicateQuizSubmissions(submissions).slice(0, 500);
      safeLocalStorageSet(STORAGE_KEY_QUIZ_SUBMISSIONS, JSON.stringify(submissions));
      window.dispatchEvent(new CustomEvent('tkst_submissions_updated', { detail: submissions }));

      const deletedQuizSubIds = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED_QUIZ_SUBS)) || [];
      pushQuizSubmissionsToServer(submissions, deletedQuizSubIds);
      pushToCloud();
      return submission;
    },

    getAllQuizSubmissions: function() {
      try {
        const deletedSubIds = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED_QUIZ_SUBS)) || [];
        const deletedSet = new Set(deletedSubIds);
        let subs = JSON.parse(localStorage.getItem(STORAGE_KEY_QUIZ_SUBMISSIONS)) || [];
        
        const subMap = new Map();
        subs.forEach(s => {
          if (s && s.id && !deletedSet.has(s.id)) subMap.set(s.id, s);
        });

        // Auto-recupera de allStudents.quizScores (garante que provas salvas nos perfis nunca fiquem invisíveis)
        try {
          const allStudents = JSON.parse(localStorage.getItem(STORAGE_KEY_STUDENTS)) || [];
          allStudents.forEach(std => {
            if (std && Array.isArray(std.quizScores)) {
              std.quizScores.forEach((qs, qIdx) => {
                const score = typeof qs.score === 'number' ? qs.score : 10;
                const total = typeof qs.total === 'number' ? qs.total : 10;
                const pct = typeof qs.percentage === 'number' ? qs.percentage : Math.round((score / total) * 100);
                const date = qs.date || new Date().toISOString();
                const dt = new Date(date).getTime();
                const subId = `quiz_std_${std.id}_${qIdx}_${dt}`;

                // Verifica se já existe simulado equivalente no mapa
                const existsEquiv = Array.from(subMap.values()).some(s => {
                  if (!s) return false;
                  const sId = (s.studentId || '').toString().trim().toLowerCase();
                  const sUser = (s.studentUsername || '').toString().trim().toLowerCase();
                  const stdId = (std.id || '').toString().trim().toLowerCase();
                  const stdUser = (std.username || '').toString().trim().toLowerCase();
                  const sameStd = (stdId && (stdId === sId || stdId === sUser)) ||
                                  (stdUser && (stdUser === sId || stdUser === sUser));
                  const sBelt = normalizeBelt(s.beltLevel, s.beltKyu);
                  const qsBelt = normalizeBelt(qs.beltLevel || std.currentBelt, qs.beltKyu !== undefined ? qs.beltKyu : std.currentKyu);
                  return sameStd && sBelt === qsBelt && Number(s.score) === Number(score) && Number(s.total) === Number(total) && Math.abs(new Date(s.date || 0).getTime() - dt) <= 60000;
                });

                if (!existsEquiv && !subMap.has(subId) && !deletedSet.has(subId)) {
                  subMap.set(subId, {
                    id: subId,
                    studentId: std.id,
                    studentName: std.name,
                    studentUsername: std.username,
                    studentBelt: std.currentBelt || 'Faixa Branca',
                    studentKyu: std.currentKyu !== undefined ? std.currentKyu : 7,
                    beltLevel: qs.beltLevel || std.currentBelt || 'Geral',
                    beltKyu: qs.beltKyu !== undefined ? qs.beltKyu : (std.currentKyu !== undefined ? std.currentKyu : 7),
                    score: score,
                    total: total,
                    percentage: pct,
                    passed: pct >= 70,
                    perfect: score === total,
                    date: date,
                    details: []
                  });
                }
              });
            }
          });
        } catch(e) {}

        const result = deduplicateQuizSubmissions(Array.from(subMap.values()));
        result.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
        if (result.length !== subs.length) {
          safeLocalStorageSet(STORAGE_KEY_QUIZ_SUBMISSIONS, JSON.stringify(result.slice(0, 500)));
        }
        return result;
      } catch(e) {
        return [];
      }
    },

    deleteQuizSubmission: function(subId) {
      if (!this.isAdmin()) return { success: false, error: 'Apenas o administrador pode excluir simulados.' };

      let deletedSubs = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED_QUIZ_SUBS)) || [];
      if (!deletedSubs.includes(subId)) deletedSubs.push(subId);
      localStorage.setItem(STORAGE_KEY_DELETED_QUIZ_SUBS, JSON.stringify(deletedSubs));

      let submissions = (JSON.parse(localStorage.getItem(STORAGE_KEY_QUIZ_SUBMISSIONS)) || []).filter(s => s.id !== subId);
      localStorage.setItem(STORAGE_KEY_QUIZ_SUBMISSIONS, JSON.stringify(submissions));

      pushQuizSubmissionsToServer(submissions, deletedSubs);
      pushToCloud();
      return { success: true, remaining: submissions.length };
    },

    getCustomQuizBank: function() {
      const del = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED_QUIZZES)) || [];
      const rawDefault = (window.TKST_DEFAULT_QUIZ_BANK || window.TKST_QUIZ || []).filter(q => !del.includes(q.id));
      
      const bankMap = new Map();
      rawDefault.forEach(q => { if (q && q.id) bankMap.set(q.id, { ...q }); });

      // Preserva e mescla questões já em memória
      if (Array.isArray(window.TKST_QUIZ_BANK)) {
        window.TKST_QUIZ_BANK.forEach(q => {
          if (q && q.id && !del.includes(q.id)) {
            bankMap.set(q.id, q);
          }
        });
      }

      try {
        let saved = JSON.parse(localStorage.getItem(STORAGE_KEY_QUIZ_BANK));
        if (Array.isArray(saved) && saved.length > 0) {
          saved = restoreDefaultImages(saved);
        }

        // Auto-recupera do cofre se estiver vazio
        if (!Array.isArray(saved) || saved.length === 0) {
          const vault = JSON.parse(localStorage.getItem('tkst_quiz_vault_permanent') || '[]');
          if (Array.isArray(vault) && vault.length > 0) {
            saved = restoreDefaultImages(vault);
          }
        }

        if (Array.isArray(saved) && saved.length > 0) {
          saved.forEach(q => {
            if (q && q.id && !del.includes(q.id)) {
              const vaultQ = bankMap.get(q.id);
              if (vaultQ) {
                q = { ...vaultQ, ...q, image: q.image || vaultQ.image };
              }
              bankMap.set(q.id, q);
            }
          });
        }
      } catch(e) {}

      // Sobrepõe o mapa permanente de edições locais do usuário
      try {
        const editedStored = localStorage.getItem('tkst_edited_quiz_questions');
        if (editedStored) {
          const editedMap = JSON.parse(editedStored);
          if (editedMap && typeof editedMap === 'object') {
            Object.keys(editedMap).forEach(qId => {
              const eq = editedMap[qId];
              if (eq && eq.id && eq.question && !del.includes(eq.id)) {
                const vaultQ = bankMap.get(eq.id);
                bankMap.set(eq.id, { ...(vaultQ || {}), ...eq, image: eq.image || (vaultQ && vaultQ.image) || '' });
              }
            });
          }
        }
      } catch(e) {}

      const mergedBank = restoreDefaultImages(Array.from(bankMap.values()));
      window.TKST_QUIZ_BANK = mergedBank;
      window.TKST_QUIZ = mergedBank;

      safeSaveQuizBank(mergedBank);

      return mergedBank;
    },

    saveCustomQuizBank: function(bank) {
      if (!Array.isArray(bank)) return false;
      const deletedIds = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED_QUIZZES)) || [];
      
      // Deduplica rigorosamente por ID para garantir que cada questão só exista uma única vez
      const bankMap = new Map();
      bank.forEach(q => {
        if (q && q.id && !deletedIds.includes(q.id)) {
          bankMap.set(q.id, q);
        }
      });
      const cleanBank = restoreDefaultImages(Array.from(bankMap.values()));

      window.TKST_QUIZ_BANK = cleanBank;
      window.TKST_QUIZ = cleanBank;

      // 1. Salva localmente com redundância no Cofre Permanente e proteção de quota
      safeSaveQuizBank(cleanBank);

      // Mantém histórico leve (sem base64 duplicado) para auditoria sem estourar o storage
      try {
        let history = [];
        try {
          history = JSON.parse(localStorage.getItem('tkst_quiz_backup_history') || '[]');
        } catch(e) { history = []; }
        const lightSummary = cleanBank.map(q => ({ id: q.id, kyuNumber: q.kyuNumber, question: q.question, hasImage: !!q.image }));
        history.unshift({ timestamp: Date.now(), count: cleanBank.length, bankSummary: lightSummary });
        if (history.length > 5) history = history.slice(0, 5);
        try {
          localStorage.setItem('tkst_quiz_backup_history', JSON.stringify(history));
        } catch(e) {}
      } catch (storageErr) {}

      // 2. Envia ao endpoint DEDICADO /api/quiz-bank (persistência garantida)
      pushQuizBankToCloud(cleanBank, deletedIds);

      // 3. Envia ao sync geral (ntfy.sh + /api/sync) para outros dados
      pushToCloud();

      // 4. Dispara evento de sync para atualizar badge na UI
      window.dispatchEvent(new CustomEvent('tkst_quiz_bank_saved', {
        detail: { count: cleanBank.length, savedAt: new Date() }
      }));
      window.dispatchEvent(new CustomEvent('tkst_quiz_bank_updated', {
        detail: cleanBank
      }));

      return true;
    },

    deleteQuizQuestion: function(qId) {
      let deleted = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED_QUIZZES)) || [];
      if (!deleted.includes(qId)) deleted.push(qId);
      localStorage.setItem(STORAGE_KEY_DELETED_QUIZZES, JSON.stringify(deleted));

      let current = this.getCustomQuizBank();
      let bank = current.filter(item => item.id !== qId);
      localStorage.setItem(STORAGE_KEY_QUIZ_BANK, JSON.stringify(bank));
      try {
        localStorage.setItem('tkst_quiz_vault_permanent', JSON.stringify(bank));
      } catch(e) {}

      try {
        const editedStored = localStorage.getItem('tkst_edited_quiz_questions');
        if (editedStored) {
          const editedMap = JSON.parse(editedStored);
          if (editedMap && editedMap[qId]) {
            delete editedMap[qId];
            localStorage.setItem('tkst_edited_quiz_questions', JSON.stringify(editedMap));
          }
        }
      } catch(e) {}

      window.TKST_QUIZ_BANK = bank;

      // Sincroniza deleção no endpoint dedicado
      pushQuizBankToCloud(bank, deleted);
      pushToCloud();
      return bank;
    },

    saveQuizResult: function(score, total, kyu) {
      return this.saveQuizSubmission({ score, total, beltLevel: kyu || 'Geral' });
    },

    getCustomGlossary: function() {
      const deletedTerms = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED_GLOSSARY)) || [];
      const defaultGlossary = window.TKST_DEFAULT_GLOSSARY || window.TKST_GLOSSARY || {};
      let baseGlossary = JSON.parse(JSON.stringify(defaultGlossary));
      const fileCustom = window.TKST_CUSTOM_GLOSSARY || {};
      const cats = ['bases', 'defesas', 'socosGolpes', 'chutes', 'comandosEContagem'];

      try {
        let saved = JSON.parse(localStorage.getItem(STORAGE_KEY_GLOSSARY));
        cats.forEach(cat => {
          if (!baseGlossary[cat]) baseGlossary[cat] = [];
          const termMap = new Map();
          
          // 1. Termos padrão
          baseGlossary[cat].forEach(t => {
            if (t && t.japanese) termMap.set(t.japanese.toLowerCase().trim(), { ...t });
          });

          // 2. Termos do arquivo bundle (GitHub)
          if (fileCustom && Array.isArray(fileCustom[cat])) {
            fileCustom[cat].forEach(t => {
              if (t && t.japanese && !deletedTerms.includes(t.japanese.toLowerCase().trim())) {
                termMap.set(t.japanese.toLowerCase().trim(), t);
              }
            });
          }

          // 3. Termos salvos localmente
          if (saved && Array.isArray(saved[cat])) {
            saved[cat].forEach(t => {
              if (t && t.japanese && !deletedTerms.includes(t.japanese.toLowerCase().trim())) {
                const existing = termMap.get(t.japanese.toLowerCase().trim());
                if (!existing || !existing.updatedAt || (t.updatedAt && t.updatedAt >= existing.updatedAt) || t._edited) {
                  termMap.set(t.japanese.toLowerCase().trim(), t);
                }
              }
            });
          }

          baseGlossary[cat] = Array.from(termMap.values()).filter(t => t && t.japanese && !deletedTerms.includes(t.japanese.toLowerCase().trim()));
        });

        window.TKST_GLOSSARY = baseGlossary;
        return baseGlossary;
      } catch(e) {
        cats.forEach(cat => {
          if (baseGlossary[cat]) {
            baseGlossary[cat] = baseGlossary[cat].filter(t => t && t.japanese && !deletedTerms.includes(t.japanese.toLowerCase().trim()));
          }
        });
        window.TKST_GLOSSARY = baseGlossary;
        return baseGlossary;
      }
    },

    saveCustomGlossary: function(glossary) {
      if (!glossary || typeof glossary !== 'object') return false;
      const deletedTerms = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED_GLOSSARY)) || [];
      
      // 1. Atualiza memória global imediatamente
      window.TKST_GLOSSARY = glossary;

      // 2. Salva no localStorage com proteção contra QuotaExceededError
      safeLocalStorageSet(STORAGE_KEY_GLOSSARY, JSON.stringify(glossary));

      // 3. Sincroniza com o servidor (onde não há limitação de localStorage)
      try {
        pushGlossaryToServer(glossary, deletedTerms);
      } catch(e) {
        console.warn('pushGlossaryToServer notice:', e);
      }
      try {
        pushToCloud();
      } catch(e) {
        console.warn('pushToCloud notice:', e);
      }

      try {
        window.dispatchEvent(new CustomEvent('tkst_glossary_updated'));
      } catch(e) {}

      return true;
    },

    addGlossaryTerm: function(category, term) {
      if (!this.isAdmin()) return { success: false, error: 'Apenas o administrador pode cadastrar novos termos.' };
      if (!category || !term || !term.japanese || !term.meaning) {
        return { success: false, error: 'Preencha todos os campos obrigatórios.' };
      }

      let deletedTerms = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED_GLOSSARY)) || [];
      const cleanKey = term.japanese.toLowerCase().trim();
      deletedTerms = deletedTerms.filter(k => k !== cleanKey);
      localStorage.setItem(STORAGE_KEY_DELETED_GLOSSARY, JSON.stringify(deletedTerms));

      const glossary = this.getCustomGlossary();
      if (!glossary[category]) glossary[category] = [];

      const finalTerm = {
        ...term,
        _custom: true,
        _edited: true,
        updatedAt: Date.now()
      };

      const existingIdx = glossary[category].findIndex(t => t.japanese && t.japanese.toLowerCase().trim() === cleanKey);
      if (existingIdx !== -1) {
        glossary[category][existingIdx] = finalTerm;
      } else {
        glossary[category].unshift(finalTerm);
      }

      this.saveCustomGlossary(glossary);
      return { success: true, term: finalTerm };
    },

    deleteGlossaryTerm: function(category, japaneseName) {
      if (!this.isAdmin()) return { success: false, error: 'Apenas o administrador pode excluir termos.' };
      const cleanKey = (japaneseName || '').toLowerCase().trim();

      let deletedTerms = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED_GLOSSARY)) || [];
      if (!deletedTerms.includes(cleanKey)) deletedTerms.push(cleanKey);
      localStorage.setItem(STORAGE_KEY_DELETED_GLOSSARY, JSON.stringify(deletedTerms));

      const glossary = this.getCustomGlossary();
      const cats = ['bases', 'defesas', 'socosGolpes', 'chutes', 'comandosEContagem'];
      cats.forEach(c => {
        if (glossary[c]) {
          glossary[c] = glossary[c].filter(t => (t.japanese || '').toLowerCase().trim() !== cleanKey);
        }
      });
      this.saveCustomGlossary(glossary);
      return { success: true };
    },

    updateGlossaryTerm: function(oldCategory, oldJapaneseName, newCategory, newTermData) {
      if (!this.isAdmin()) return { success: false, error: 'Apenas o administrador pode editar termos.' };
      if (!newCategory || !newTermData || !newTermData.japanese || !newTermData.meaning) {
        return { success: false, error: 'Preencha todos os campos obrigatórios.' };
      }

      const oldCleanKey = (oldJapaneseName || '').toLowerCase().trim();
      const newCleanKey = newTermData.japanese.toLowerCase().trim();

      let deletedTerms = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED_GLOSSARY)) || [];
      if (oldCleanKey && oldCleanKey !== newCleanKey) {
        if (!deletedTerms.includes(oldCleanKey)) deletedTerms.push(oldCleanKey);
        deletedTerms = deletedTerms.filter(k => k !== newCleanKey);
        localStorage.setItem(STORAGE_KEY_DELETED_GLOSSARY, JSON.stringify(deletedTerms));
      }

      const glossary = this.getCustomGlossary();

      // Recupera propriedades técnicas anteriores caso não tenham sido enviadas
      let existingTerm = null;
      const cats = ['bases', 'defesas', 'socosGolpes', 'chutes', 'comandosEContagem'];

      // 1. Procura na categoria de origem informada
      if (oldCategory && glossary[oldCategory]) {
        existingTerm = glossary[oldCategory].find(t => (t.japanese || '').toLowerCase().trim() === oldCleanKey);
        if (existingTerm) {
          glossary[oldCategory] = glossary[oldCategory].filter(t => (t.japanese || '').toLowerCase().trim() !== oldCleanKey);
        }
      }

      // 2. Se não encontrou na categoria informada, busca e remove de qualquer outra categoria onde esteja
      if (!existingTerm) {
        for (const c of cats) {
          if (glossary[c]) {
            const found = glossary[c].find(t => (t.japanese || '').toLowerCase().trim() === oldCleanKey);
            if (found) {
              existingTerm = found;
              glossary[c] = glossary[c].filter(t => (t.japanese || '').toLowerCase().trim() !== oldCleanKey);
              break;
            }
          }
        }
      }

      if (!glossary[newCategory]) glossary[newCategory] = [];

      const finalTerm = {
        ...(existingTerm || {}),
        ...newTermData,
        _edited: true,
        updatedAt: Date.now()
      };

      // Remove duplicatas em newCategory e insere no topo
      glossary[newCategory] = glossary[newCategory].filter(t => (t.japanese || '').toLowerCase().trim() !== newCleanKey);
      glossary[newCategory].unshift(finalTerm);

      this.saveCustomGlossary(glossary);
      return { success: true, term: finalTerm };
    },

    // ==========================================
    // MEDIA GALLERY (FOTOS & VÍDEOS) MANAGEMENT
    // ==========================================
    getCustomMedia: function() {
      try {
        const deletedIds = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED_MEDIA)) || [];
        const defaults = (window.TKST_DEFAULT_MEDIA || []).filter(m => !deletedIds.includes(m.id));
        const saved = (JSON.parse(localStorage.getItem(STORAGE_KEY_MEDIA)) || []).filter(m => !deletedIds.includes(m.id));
        
        const mediaMap = new Map();
        // 1. Base default items
        defaults.forEach(m => mediaMap.set(m.id, { ...m }));
        // 2. Saved custom additions/edits
        saved.forEach(m => mediaMap.set(m.id, { ...m }));

        const list = Array.from(mediaMap.values());
        // Sort descending by date, then id
        return list.sort((a, b) => {
          const dateA = a.date || '';
          const dateB = b.date || '';
          if (dateA && dateB) return dateB.localeCompare(dateA);
          return (b.id || '').localeCompare(a.id || '');
        });
      } catch (e) {
        return window.TKST_DEFAULT_MEDIA || [];
      }
    },

    saveCustomMedia: function(mediaList) {
      safeLocalStorageSet(STORAGE_KEY_MEDIA, JSON.stringify(mediaList || []));
      pushToCloud();
      window.dispatchEvent(new CustomEvent('tkst_media_updated', { detail: mediaList }));
    },

    addMediaItem: function(mediaItem) {
      const all = this.getCustomMedia();
      const newItem = {
        ...mediaItem,
        id: mediaItem.id || `media_custom_${Date.now()}`,
        date: mediaItem.date || new Date().toISOString().split('T')[0],
        updatedAt: Date.now(),
        _custom: true
      };
      all.unshift(newItem);
      this.saveCustomMedia(all);
      return newItem;
    },

    addMediaItems: function(mediaItemsList) {
      if (!Array.isArray(mediaItemsList) || mediaItemsList.length === 0) return [];
      const all = this.getCustomMedia();
      const now = Date.now();
      const today = new Date().toISOString().split('T')[0];
      const newItems = mediaItemsList.map((item, idx) => ({
        ...item,
        id: item.id || `media_custom_${now}_${idx}_${Math.random().toString(36).substr(2, 5)}`,
        date: item.date || today,
        updatedAt: now,
        _custom: true
      }));
      all.unshift(...newItems);
      this.saveCustomMedia(all);
      return newItems;
    },

    updateMediaItem: function(id, updatedFields) {
      const all = this.getCustomMedia();
      const index = all.findIndex(m => m.id === id);
      if (index === -1) return null;
      all[index] = {
        ...all[index],
        ...updatedFields,
        updatedAt: Date.now(),
        _edited: true
      };
      this.saveCustomMedia(all);
      return all[index];
    },

    deleteMediaItem: function(id) {
      let deleted = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED_MEDIA)) || [];
      if (!deleted.includes(id)) {
        deleted.push(id);
        safeLocalStorageSet(STORAGE_KEY_DELETED_MEDIA, JSON.stringify(deleted));
      }
      const all = this.getCustomMedia().filter(m => m.id !== id);
      this.saveCustomMedia(all);
      return true;
    },

    deleteMediaItems: function(ids) {
      if (!Array.isArray(ids) || ids.length === 0) return false;
      let deleted = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED_MEDIA)) || [];
      let addedCount = 0;
      ids.forEach(id => {
        if (!deleted.includes(id)) {
          deleted.push(id);
          addedCount++;
        }
      });
      if (addedCount > 0) {
        safeLocalStorageSet(STORAGE_KEY_DELETED_MEDIA, JSON.stringify(deleted));
      }
      const all = this.getCustomMedia().filter(m => !ids.includes(m.id));
      this.saveCustomMedia(all);
      return true;
    },

    // ==========================================
    // CUSTOM ALBUMS MANAGEMENT
    // ==========================================
    getCustomAlbums: function() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY_ALBUMS)) || [];
      } catch(e) {
        return [];
      }
    },

    getDeletedAlbumIds: function() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED_ALBUMS)) || [];
      } catch(e) {
        return [];
      }
    },

    saveCustomAlbums: function(albums) {
      safeLocalStorageSet(STORAGE_KEY_ALBUMS, JSON.stringify(albums || []));
      pushToCloud();
      window.dispatchEvent(new CustomEvent('tkst_albums_updated', { detail: albums }));
    },

    addAlbum: function(albumData) {
      const all = this.getCustomAlbums();
      const slug = albumData.id || ('album_' + Date.now());
      const newAlbum = {
        id: slug,
        title: albumData.title || 'Novo Álbum',
        icon: albumData.icon || 'fas fa-folder',
        badge: albumData.badge || albumData.title || 'Álbum',
        description: albumData.description || '',
        cover: albumData.cover || 'assets/images/logo-tkst-2.jpg',
        hasSubAlbums: albumData.hasSubAlbums || false,
        _custom: true,
        createdAt: Date.now()
      };
      // Prevent duplicate id
      const existingIndex = all.findIndex(a => a.id === slug);
      if (existingIndex !== -1) {
        all[existingIndex] = { ...all[existingIndex], ...newAlbum };
      } else {
        all.push(newAlbum);
      }
      this.saveCustomAlbums(all);
      return newAlbum;
    },

    deleteAlbum: function(albumId) {
      if (!albumId) return false;
      let deleted = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED_ALBUMS)) || [];
      if (!deleted.includes(albumId)) {
        deleted.push(albumId);
        safeLocalStorageSet(STORAGE_KEY_DELETED_ALBUMS, JSON.stringify(deleted));
      }
      const all = this.getCustomAlbums().filter(a => a.id !== albumId);
      this.saveCustomAlbums(all);
      return true;
    },

    updateAlbum: function(albumId, updatedFields) {
      const all = this.getCustomAlbums();
      const index = all.findIndex(a => a.id === albumId);
      if (index === -1) {
        const override = { id: albumId, ...updatedFields, updatedAt: Date.now() };
        all.push(override);
        this.saveCustomAlbums(all);
        return override;
      }
      all[index] = { ...all[index], ...updatedFields, updatedAt: Date.now() };
      this.saveCustomAlbums(all);
      return all[index];
    },

    // ==========================================
    // CUSTOM SUBALBUMS MANAGEMENT
    // ==========================================
    getCustomSubAlbums: function(albumId) {
      try {
        const deleted = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED_SUBALBUMS)) || [];
        const all = JSON.parse(localStorage.getItem(STORAGE_KEY_SUBALBUMS)) || [];
        const valid = all.filter(sub => {
          if (!sub || !sub.name) return false;
          const key = (sub.albumId || 'exames') + '::' + sub.name.trim().toLowerCase();
          return !deleted.includes(key);
        });
        if (albumId) {
          return valid.filter(sub => (sub.albumId || 'exames') === albumId);
        }
        return valid;
      } catch(e) {
        return [];
      }
    },

    saveCustomSubAlbums: function(subalbums) {
      safeLocalStorageSet(STORAGE_KEY_SUBALBUMS, JSON.stringify(subalbums || []));
      pushToCloud();
      window.dispatchEvent(new CustomEvent('tkst_subalbums_updated', { detail: subalbums }));
    },

    addSubAlbum: function(albumId, name, extra = {}) {
      if (!name || typeof name !== 'string' || !name.trim()) return null;
      const cleanName = name.trim();
      const parentId = albumId || 'exames';
      const key = parentId + '::' + cleanName.toLowerCase();

      let deleted = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED_SUBALBUMS)) || [];
      if (deleted.includes(key)) {
        deleted = deleted.filter(k => k !== key);
        safeLocalStorageSet(STORAGE_KEY_DELETED_SUBALBUMS, JSON.stringify(deleted));
      }

      const all = JSON.parse(localStorage.getItem(STORAGE_KEY_SUBALBUMS)) || [];
      const existingIdx = all.findIndex(s => (s.albumId || 'exames') === parentId && s.name.trim().toLowerCase() === cleanName.toLowerCase());

      const slug = extra.id || ('sub_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5));
      const subItem = {
        id: slug,
        albumId: parentId,
        name: cleanName,
        description: extra.description || '',
        cover: extra.cover || '',
        dojo: extra.dojo || 'TKST',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        ...extra
      };

      if (existingIdx !== -1) {
        all[existingIdx] = { ...all[existingIdx], ...subItem, updatedAt: Date.now() };
      } else {
        all.push(subItem);
      }

      this.saveCustomSubAlbums(all);
      return subItem;
    },

    deleteSubAlbum: function(albumId, name) {
      if (!name) return false;
      const cleanName = name.trim();
      const parentId = albumId || 'exames';
      const key = parentId + '::' + cleanName.toLowerCase();

      let deleted = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED_SUBALBUMS)) || [];
      if (!deleted.includes(key)) {
        deleted.push(key);
        safeLocalStorageSet(STORAGE_KEY_DELETED_SUBALBUMS, JSON.stringify(deleted));
      }

      let all = JSON.parse(localStorage.getItem(STORAGE_KEY_SUBALBUMS)) || [];
      all = all.filter(s => !((s.albumId || 'exames') === parentId && s.name.trim().toLowerCase() === cleanName.toLowerCase()));
      this.saveCustomSubAlbums(all);

      // Desassocia subálbum das mídias existentes
      const customMedia = this.getCustomMedia();
      let mediaChanged = false;
      customMedia.forEach(m => {
        if ((m.album === parentId || m.category === parentId) && m.subAlbum && m.subAlbum.trim().toLowerCase() === cleanName.toLowerCase()) {
          m.subAlbum = '';
          m.updatedAt = Date.now();
          mediaChanged = true;
        }
      });
      if (mediaChanged) {
        this.saveCustomMedia(customMedia);
      }

      return true;
    },

    renameSubAlbum: function(albumId, oldName, newName) {
      if (!oldName || !newName || oldName === newName) return false;
      const cleanOld = oldName.trim();
      const cleanNew = newName.trim();
      const parentId = albumId || 'exames';

      // 1. Atualiza nos subálbuns persistentes
      let allSubs = JSON.parse(localStorage.getItem(STORAGE_KEY_SUBALBUMS)) || [];
      const subIdx = allSubs.findIndex(s => (s.albumId || 'exames') === parentId && s.name.trim().toLowerCase() === cleanOld.toLowerCase());
      if (subIdx !== -1) {
        allSubs[subIdx].name = cleanNew;
        allSubs[subIdx].updatedAt = Date.now();
      } else {
        allSubs.push({
          id: 'sub_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
          albumId: parentId,
          name: cleanNew,
          description: '',
          cover: '',
          dojo: 'TKST',
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      }
      this.saveCustomSubAlbums(allSubs);

      // 2. Atualiza nas mídias
      const customMedia = this.getCustomMedia();
      const allMedia = this.getMediaList();
      let modified = false;

      allMedia.forEach(m => {
        if ((!albumId || m.album === albumId || m.category === albumId) && m.subAlbum === oldName) {
          const cIndex = customMedia.findIndex(cm => cm.id === m.id);
          if (cIndex !== -1) {
            customMedia[cIndex] = { ...customMedia[cIndex], subAlbum: cleanNew, updatedAt: Date.now() };
          } else {
            customMedia.push({ ...m, subAlbum: cleanNew, updatedAt: Date.now(), _edited: true });
          }
          modified = true;
        }
      });

      if (modified) {
        this.saveCustomMedia(customMedia);
      }
      return true;
    },

    getFirebaseUrl: function() {
      return localStorage.getItem(STORAGE_KEY_FIREBASE) || '';
    },

    setFirebaseUrl: function(url) {
      if (!url || !url.trim()) {
        localStorage.removeItem(STORAGE_KEY_FIREBASE);
      } else {
        localStorage.setItem(STORAGE_KEY_FIREBASE, url.trim());
      }
      pushToCloud();
      pullFromCloud(true);
      return true;
    },

    // ==========================================
    // STUDY PLAN (CURRICULUM) MANAGEMENT
    // Autonomia total de edição de técnicas para o Administrador (Sensei Diego)
    // ==========================================
    getCustomCurriculum: function() {
      const defaults = window.TKST_DEFAULT_CURRICULUM || window.TKST_CURRICULUM || [];
      let customMap = {};
      try {
        customMap = JSON.parse(localStorage.getItem(STORAGE_KEY_CURRICULUM)) || {};
      } catch(e) {}

      return defaults.map(defBelt => {
        const customBelt = customMap[defBelt.kyuNumber];
        if (customBelt && typeof customBelt === 'object') {
          return {
            ...defBelt,
            ...customBelt,
            kihon: Array.isArray(customBelt.kihon) ? customBelt.kihon : defBelt.kihon,
            geri: Array.isArray(customBelt.geri) ? customBelt.geri : defBelt.geri,
            ukemi: Array.isArray(customBelt.ukemi) ? customBelt.ukemi : defBelt.ukemi,
            dachiWaza: Array.isArray(customBelt.dachiWaza) ? customBelt.dachiWaza : defBelt.dachiWaza,
            shodanProgram: customBelt.shodanProgram ? customBelt.shodanProgram : defBelt.shodanProgram,
            _customized: true
          };
        }
        return JSON.parse(JSON.stringify(defBelt));
      });
    },

    getBeltCurriculum: function(kyuNumber) {
      const curr = this.getCustomCurriculum();
      const num = Number(kyuNumber);
      return curr.find(c => c.kyuNumber === num) || null;
    },

    saveBeltCurriculum: function(kyuNumber, beltData) {
      if (!this.isAdmin()) return { success: false, error: 'Apenas administradores podem alterar o plano de estudos.' };
      let customMap = {};
      try {
        customMap = JSON.parse(localStorage.getItem(STORAGE_KEY_CURRICULUM)) || {};
      } catch(e) {}

      const num = Number(kyuNumber);
      customMap[num] = {
        ...beltData,
        updatedAt: Date.now(),
        _customized: true
      };
      safeLocalStorageSet(STORAGE_KEY_CURRICULUM, JSON.stringify(customMap));
      pushToCloud();
      window.dispatchEvent(new CustomEvent('tkst_curriculum_updated', { detail: { kyuNumber: num } }));
      return { success: true };
    },

    updateCurriculumTechnique: function(kyuNumber, sectionKey, indexOrId, updatedData) {
      if (!this.isAdmin()) return { success: false, error: 'Apenas administradores podem alterar o plano de estudos.' };
      const belt = this.getBeltCurriculum(kyuNumber);
      if (!belt) return { success: false, error: 'Exame de graduação não encontrado.' };

      if (sectionKey === 'kihon') {
        if (!Array.isArray(belt.kihon)) belt.kihon = [];
        const idx = typeof indexOrId === 'number' ? indexOrId : belt.kihon.findIndex(k => k.id === indexOrId);
        if (idx < 0 || idx >= belt.kihon.length) return { success: false, error: 'Técnica de Kihon não encontrada.' };
        belt.kihon[idx] = {
          ...belt.kihon[idx],
          ...updatedData,
          updatedAt: Date.now()
        };
      } else if (sectionKey === 'geri') {
        if (!Array.isArray(belt.geri)) belt.geri = [];
        const idx = typeof indexOrId === 'number' ? indexOrId : belt.geri.findIndex(g => g.id === indexOrId);
        if (idx < 0 || idx >= belt.geri.length) return { success: false, error: 'Técnica de Geri não encontrada.' };
        belt.geri[idx] = {
          ...belt.geri[idx],
          ...updatedData,
          updatedAt: Date.now()
        };
      } else if (sectionKey === 'ukemi') {
        if (!Array.isArray(belt.ukemi)) belt.ukemi = [];
        const idx = Number(indexOrId);
        if (idx < 0 || idx >= belt.ukemi.length) return { success: false, error: 'Técnica de Ukemi não encontrada.' };
        belt.ukemi[idx] = {
          ...belt.ukemi[idx],
          ...updatedData,
          updatedAt: Date.now()
        };
      } else if (sectionKey === 'dachiWaza') {
        if (!Array.isArray(belt.dachiWaza)) belt.dachiWaza = [];
        const idx = Number(indexOrId);
        if (idx >= 0 && idx < belt.dachiWaza.length) {
          belt.dachiWaza[idx] = typeof updatedData === 'string' ? updatedData : (updatedData.name || updatedData.technique || '');
        }
      } else if (sectionKey && belt.shodanProgram && belt.shodanProgram[sectionKey]) {
        const list = belt.shodanProgram[sectionKey];
        const idx = Number(indexOrId);
        if (idx >= 0 && idx < list.length) {
          list[idx] = {
            ...list[idx],
            ...updatedData,
            updatedAt: Date.now()
          };
        }
      }

      return this.saveBeltCurriculum(kyuNumber, belt);
    },

    addCurriculumTechnique: function(kyuNumber, sectionKey, newTechData) {
      if (!this.isAdmin()) return { success: false, error: 'Apenas administradores podem alterar o plano de estudos.' };
      const belt = this.getBeltCurriculum(kyuNumber);
      if (!belt) return { success: false, error: 'Exame de graduação não encontrado.' };

      if (sectionKey === 'kihon') {
        if (!Array.isArray(belt.kihon)) belt.kihon = [];
        const newId = `k${kyuNumber}-${Date.now().toString().slice(-4)}`;
        belt.kihon.push({
          id: newId,
          technique: newTechData.technique || '',
          stance: newTechData.stance || 'Zenkutsu Dachi',
          direction: newTechData.direction || 'Mae (Avanço)',
          count: newTechData.count || '5 vezes (Go Kai)',
          focus: newTechData.focus || '',
          videoUrl: newTechData.videoUrl || '',
          _custom: true,
          updatedAt: Date.now()
        });
      } else if (sectionKey === 'geri') {
        if (!Array.isArray(belt.geri)) belt.geri = [];
        belt.geri.push({
          name: newTechData.name || '',
          detail: newTechData.detail || '',
          _custom: true,
          updatedAt: Date.now()
        });
      } else if (sectionKey === 'ukemi') {
        if (!Array.isArray(belt.ukemi)) belt.ukemi = [];
        belt.ukemi.push({
          name: newTechData.name || '',
          detail: newTechData.detail || '',
          _custom: true,
          updatedAt: Date.now()
        });
      } else if (sectionKey === 'dachiWaza') {
        if (!Array.isArray(belt.dachiWaza)) belt.dachiWaza = [];
        const dName = typeof newTechData === 'string' ? newTechData : (newTechData.name || newTechData.technique || '');
        if (dName) belt.dachiWaza.push(dName);
      } else if (sectionKey && belt.shodanProgram && belt.shodanProgram[sectionKey]) {
        belt.shodanProgram[sectionKey].push({
          name: newTechData.name || '',
          direction: newTechData.direction || 'Mae',
          arrow: newTechData.arrow || (newTechData.direction === 'Sagate' ? '⬅' : (newTechData.direction === 'Mae / Mawate' ? '🔄' : '➡')),
          _custom: true,
          updatedAt: Date.now()
        });
      }

      return this.saveBeltCurriculum(kyuNumber, belt);
    },

    deleteCurriculumTechnique: function(kyuNumber, sectionKey, indexOrId) {
      if (!this.isAdmin()) return { success: false, error: 'Apenas administradores podem alterar o plano de estudos.' };
      const belt = this.getBeltCurriculum(kyuNumber);
      if (!belt) return { success: false, error: 'Exame de graduação não encontrado.' };

      if (sectionKey === 'kihon' && Array.isArray(belt.kihon)) {
        const idx = typeof indexOrId === 'number' ? indexOrId : belt.kihon.findIndex(k => k.id === indexOrId);
        if (idx >= 0 && idx < belt.kihon.length) belt.kihon.splice(idx, 1);
      } else if (sectionKey === 'geri' && Array.isArray(belt.geri)) {
        const idx = typeof indexOrId === 'number' ? indexOrId : belt.geri.findIndex(g => g.id === indexOrId);
        if (idx >= 0 && idx < belt.geri.length) belt.geri.splice(idx, 1);
      } else if (sectionKey === 'ukemi' && Array.isArray(belt.ukemi)) {
        const idx = Number(indexOrId);
        if (idx >= 0 && idx < belt.ukemi.length) belt.ukemi.splice(idx, 1);
      } else if (sectionKey === 'dachiWaza' && Array.isArray(belt.dachiWaza)) {
        const idx = Number(indexOrId);
        if (idx >= 0 && idx < belt.dachiWaza.length) belt.dachiWaza.splice(idx, 1);
      } else if (sectionKey && belt.shodanProgram && belt.shodanProgram[sectionKey]) {
        const idx = Number(indexOrId);
        if (idx >= 0 && idx < belt.shodanProgram[sectionKey].length) {
          belt.shodanProgram[sectionKey].splice(idx, 1);
        }
      }

      return this.saveBeltCurriculum(kyuNumber, belt);
    },

    resetCurriculumBelt: function(kyuNumber) {
      if (!this.isAdmin()) return { success: false, error: 'Apenas administradores podem alterar o plano de estudos.' };
      let customMap = {};
      try {
        customMap = JSON.parse(localStorage.getItem(STORAGE_KEY_CURRICULUM)) || {};
      } catch(e) {}

      const num = Number(kyuNumber);
      delete customMap[num];
      safeLocalStorageSet(STORAGE_KEY_CURRICULUM, JSON.stringify(customMap));
      pushToCloud();
      window.dispatchEvent(new CustomEvent('tkst_curriculum_updated', { detail: { kyuNumber: num } }));
      return { success: true };
    },

    broadcastGeneratedExam: function(record) {
      if (!record || (!record.examId && !record.baseExamId)) return;
      try {
        const cleanId = String(record.examId || record.baseExamId).trim().toUpperCase();
        const baseCode = cleanId.replace(/^#/, '').split('-')[0].replace(/[^0-9A-Z]/g, '').slice(0, 5);
        if (!window.TKST_GENERATED_EXAMS_CACHE) window.TKST_GENERATED_EXAMS_CACHE = {};
        if (record.examId) window.TKST_GENERATED_EXAMS_CACHE[record.examId] = record;
        if (cleanId) window.TKST_GENERATED_EXAMS_CACHE[cleanId] = record;
        if (baseCode) window.TKST_GENERATED_EXAMS_CACHE[baseCode] = record;
        let store = {};
        try { store = JSON.parse(localStorage.getItem('tkst_generated_exams') || '{}'); } catch(e) {}
        if (record.examId) store[record.examId] = record;
        if (cleanId) store[cleanId] = record;
        if (baseCode) store[baseCode] = record;
        safeLocalStorageSet('tkst_generated_exams', JSON.stringify(store));

        // 1. Transmissão instantânea ultra-leve via NTFY (< 300 bytes) para sincronizar com o celular/PC imediatamente
        fetch(SYNC_URL, {
          method: 'POST',
          headers: {
            'Title': 'TKST_EXAM_GENERATED',
            'Content-Type': 'text/plain; charset=utf-8'
          },
          body: JSON.stringify({
            type: 'tkst_exam_generated',
            senderId: CLIENT_SENDER_ID,
            record: record,
            timestamp: Date.now()
          })
        }).catch(() => {});

        // 2. Persistência direta em /api/sync para retenção imediata na nuvem
        fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            generated_exams: {
              [baseCode]: record,
              [cleanId]: record,
              [record.examId]: record
            }
          })
        }).catch(() => {});
      } catch(e) {}
    },

    getGeneratedExam: function(examId) {
      if (!examId) return null;
      const clean = String(examId).replace(/^#/, '').replace(/^C[OÓ]DIGO:?\s*/i, '').trim().toUpperCase();
      const baseCode = clean.split('-')[0].replace(/[^0-9A-Z]/g, '').slice(0, 5);
      try {
        if (window.TKST_GENERATED_EXAMS_CACHE) {
          if (window.TKST_GENERATED_EXAMS_CACHE[baseCode]) return window.TKST_GENERATED_EXAMS_CACHE[baseCode];
          if (window.TKST_GENERATED_EXAMS_CACHE[clean]) return window.TKST_GENERATED_EXAMS_CACHE[clean];
          const cacheKey = Object.keys(window.TKST_GENERATED_EXAMS_CACHE).find(k => {
            const kBase = k.replace(/^#/, '').trim().toUpperCase().split('-')[0].replace(/[^0-9A-Z]/g, '').slice(0, 5);
            return kBase === baseCode;
          });
          if (cacheKey && window.TKST_GENERATED_EXAMS_CACHE[cacheKey]) return window.TKST_GENERATED_EXAMS_CACHE[cacheKey];
        }
        const store = JSON.parse(localStorage.getItem('tkst_generated_exams') || '{}');
        if (store[baseCode]) return store[baseCode];
        if (store[clean]) return store[clean];
        const foundKey = Object.keys(store).find(k => {
          const kBase = k.replace(/^#/, '').trim().toUpperCase().split('-')[0].replace(/[^0-9A-Z]/g, '').slice(0, 5);
          return kBase === baseCode;
        });
        if (foundKey && store[foundKey]) return store[foundKey];
      } catch(e) {}
      return null;
    },

    fetchExamFromCloud: async function(examId) {
      if (!examId) return null;
      const clean = String(examId).replace(/^#/, '').replace(/^C[OÓ]DIGO:?\s*/i, '').trim().toUpperCase();
      const baseCode = clean.split('-')[0].replace(/[^0-9A-Z]/g, '').slice(0, 5);

      // 1. Verifica cache local
      const local = this.getGeneratedExam(baseCode) || this.getGeneratedExam(clean);
      if (local && (local.studentName || local.studentAbbr)) return local;

      // 2. Tenta buscar diretamente do arquivo estático de provas geradas
      try {
        const resFile = await fetch('./assets/data/generated-exams.json?_=' + Date.now(), { cache: 'no-store' });
        if (resFile.ok) {
          const examsData = await resFile.json();
          if (examsData && typeof examsData === 'object') {
            if (!window.TKST_GENERATED_EXAMS_CACHE) window.TKST_GENERATED_EXAMS_CACHE = {};
            Object.assign(window.TKST_GENERATED_EXAMS_CACHE, examsData);
            let store = {};
            try { store = JSON.parse(localStorage.getItem('tkst_generated_exams') || '{}'); } catch(e) {}
            Object.assign(store, examsData);
            safeLocalStorageSet('tkst_generated_exams', JSON.stringify(store));

            let match = examsData[baseCode] || examsData[clean];
            if (!match) {
              match = Object.values(examsData).find(x => {
                if (!x) return false;
                const xCode = String(x.examId || x.baseExamId || '').replace(/^#/, '').toUpperCase().split('-')[0].replace(/[^0-9A-Z]/g, '').slice(0, 5);
                return xCode === baseCode;
              });
            }
            if (match) {
              handleIncomingExamRecord(match);
              if (match.studentName || match.studentAbbr) return match;
            }
          }
        }
      } catch(e) {}

      // 3. Tenta buscar em /api/sync com timeout estendido de 3.5s para conexões móveis
      try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 3500);
        const res = await fetch('/api/sync', { cache: 'no-store', signal: controller.signal });
        clearTimeout(tid);
        if (res.ok) {
          const json = await res.json();
          const cloudExams = (json && json.data && json.data.generated_exams) || (json && json.generated_exams);
          if (cloudExams && typeof cloudExams === 'object') {
            if (!window.TKST_GENERATED_EXAMS_CACHE) window.TKST_GENERATED_EXAMS_CACHE = {};
            Object.assign(window.TKST_GENERATED_EXAMS_CACHE, cloudExams);
            let store = {};
            try { store = JSON.parse(localStorage.getItem('tkst_generated_exams') || '{}'); } catch(e) {}
            Object.assign(store, cloudExams);
            safeLocalStorageSet('tkst_generated_exams', JSON.stringify(store));

            let match = cloudExams[baseCode] || cloudExams[clean];
            if (!match) {
              match = Object.values(cloudExams).find(x => {
                if (!x) return false;
                const xCode = String(x.examId || x.baseExamId || '').replace(/^#/, '').toUpperCase().split('-')[0].replace(/[^0-9A-Z]/g, '').slice(0, 5);
                return xCode === baseCode;
              });
            }
            if (match) {
              handleIncomingExamRecord(match);
              if (match.studentName || match.studentAbbr) return match;
            }
          }
        }
      } catch(e) {}

      // 3. Fallback: faz poll no NTFY para capturar exames gerados recentemente com timeout de 3.5s
      try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 3500);
        const pollRes = await fetch(SYNC_URL + '/json?poll=1', { signal: controller.signal });
        clearTimeout(tid);
        if (pollRes.ok) {
          const text = await pollRes.text();
          if (text && text.trim()) {
            const lines = text.trim().split('\n');
            for (let i = lines.length - 1; i >= 0; i--) {
              try {
                const item = JSON.parse(lines[i]);
                const cloudData = await parseNtfyItem(item);
                if (cloudData && cloudData.type === 'tkst_exam_generated' && cloudData.record) {
                  handleIncomingExamRecord(cloudData.record);
                  const r = cloudData.record;
                  const rCode = String(r.examId || r.baseExamId || '').replace(/^#/, '').toUpperCase().split('-')[0].replace(/[^0-9A-Z]/g, '').slice(0, 5);
                  if (rCode === baseCode) {
                    return r;
                  }
                }
              } catch(e) {}
            }
          }
        }
      } catch(e) {}

      return this.getGeneratedExam(baseCode) || this.getGeneratedExam(clean);
    },

    deduplicateQuizSubmissions: deduplicateQuizSubmissions,
    broadcastQuizBank: broadcastQuizBankChunks,
    pullQuizBankFromCloud: pullQuizBankFromCloud
  };

  // Background Heartbeat Engine (Keeps presence updated while using app)
  setInterval(() => {
    try {
      if (window.TKST_AUTH && window.TKST_AUTH.getCurrentUser()) {
        window.TKST_AUTH.recordHeartbeat();
      }
    } catch(e) {}
  }, 40000);

  if (typeof window !== 'undefined') {
    ['focus', 'click', 'touchstart'].forEach(evt => {
      window.addEventListener(evt, () => {
        try {
          if (window.TKST_AUTH && window.TKST_AUTH.getCurrentUser()) {
            window.TKST_AUTH.recordHeartbeat();
          }
        } catch(e) {}
      }, { passive: true });
    });
  }
})();
