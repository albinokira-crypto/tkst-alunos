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
  const AUTH_VERSION_KEY = 'tkst_auth_v3_nick';

  const SYNC_TOPIC = 'tkst_karate_cloud_v2_sync';
  const SYNC_URL = 'https://ntfy.sh/' + SYNC_TOPIC;
  let isSyncing = false;
  let syncPending = false;

  // Load custom quiz bank on initialization if present
  try {
    const deletedIds = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED_QUIZZES)) || [];
    const savedBank = JSON.parse(localStorage.getItem(STORAGE_KEY_QUIZ_BANK));
    const defaultList = (window.TKST_DEFAULT_QUIZ_BANK || []).filter(q => !deletedIds.includes(q.id));
    if (Array.isArray(savedBank) && savedBank.length > 0) {
      const bankMap = new Map();
      defaultList.forEach(q => bankMap.set(q.id, { ...q }));
      savedBank.forEach(q => {
        if (!deletedIds.includes(q.id)) bankMap.set(q.id, q);
      });
      const merged = Array.from(bankMap.values());
      localStorage.setItem(STORAGE_KEY_QUIZ_BANK, JSON.stringify(merged));
      window.TKST_QUIZ_BANK = merged;
    } else if (defaultList.length > 0) {
      window.TKST_QUIZ_BANK = defaultList;
      localStorage.setItem(STORAGE_KEY_QUIZ_BANK, JSON.stringify(defaultList));
    }
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
  // QUIZ BANK — Endpoint dedicado para persistência permanente das questões
  // =========================================================================

  async function pushQuizBankToCloud(bank, deletedIds) {
    try {
      const customOnly = (bank || []).filter(q => q && (q._edited || (q.id && q.id.startsWith('q_custom_'))));
      const deleted = Array.isArray(deletedIds) ? deletedIds : (JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED_QUIZZES)) || []);
      // 1. Endpoint dedicado /api/quiz-bank (persistência entre requisições)
      fetch('/api/quiz-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bank: customOnly, deletedQuizIds: deleted })
      }).catch(() => {});

      // 2. Commit automático no GitHub via endpoint server-side seguro
      pushQuizBankToServer(customOnly, deleted).catch(() => {});
    } catch(err) {
      console.warn('Quiz bank push notice:', err);
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
      const deletedIds = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED_QUIZZES)) || [];
      const defaultList = (window.TKST_DEFAULT_QUIZ_BANK || []).filter(q => !deletedIds.includes(q.id));
      const localSaved = JSON.parse(localStorage.getItem(STORAGE_KEY_QUIZ_BANK)) || [];
      const bankMap = new Map();

      // 1. Base default questions
      defaultList.forEach(q => bankMap.set(q.id, { ...q }));

      // 2. Overlay current local questions (never overwrite what was edited locally)
      localSaved.forEach(q => {
        if (!deletedIds.includes(q.id)) bankMap.set(q.id, q);
      });

      // 3. 1ª tentativa: endpoint dedicado /api/quiz-bank
      let cloudQuestions = [];
      try {
        const res = await fetch('/api/quiz-bank', { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            cloudQuestions = json.data;
          }
        }
      } catch(e) {}

      // 4. 2ª tentativa (fallback): lê direto do GitHub se /api/quiz-bank veio vazio
      if (cloudQuestions.length === 0) {
        cloudQuestions = await pullQuizBankFromGitHub();
      }

      if (cloudQuestions.length > 0) {
        cloudQuestions.forEach(q => {
          if (!deletedIds.includes(q.id) && q && q.id) {
            const localQ = bankMap.get(q.id);
            if (!localQ || !localQ.updatedAt || (q.updatedAt && q.updatedAt >= localQ.updatedAt) || !localQ._edited) {
              bankMap.set(q.id, q);
            }
          }
        });
      }

      const merged = Array.from(bankMap.values());
      const localStr = localStorage.getItem(STORAGE_KEY_QUIZ_BANK);
      const newStr = JSON.stringify(merged);
      if (localStr !== newStr) {
        localStorage.setItem(STORAGE_KEY_QUIZ_BANK, newStr);
        window.TKST_QUIZ_BANK = merged;
        window.dispatchEvent(new CustomEvent('tkst_quiz_bank_updated', { detail: { count: merged.length } }));
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
        headers: { 'Content-Type': 'application/json' },
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
          if (json && json.success && json.data) {
            applyCloudData({
              students: json.data.students || [],
              deletedStudentIds: json.data.deletedStudentIds || []
            });
            return;
          }
        }
      } catch(e) {}

      // 2. Tenta carregar assets/data/students.json diretamente (CDN/Vercel)
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
      fetch('/api/student-commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          students,
          deletedStudentIds: deleted
        })
      }).catch(() => {});
    } catch(err) {
      console.warn('Student server commit notice:', err);
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
      const students = JSON.parse(localStorage.getItem(STORAGE_KEY_STUDENTS)) || [];
      const videos = JSON.parse(localStorage.getItem(STORAGE_KEY_VIDEOS)) || {};
      const progress = JSON.parse(localStorage.getItem(STORAGE_KEY_PROGRESS)) || {};
      const deletedStudentIds = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED)) || [];
      const deletedQuizIds = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED_QUIZZES)) || [];
      const deletedQuizSubIds = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED_QUIZ_SUBS)) || [];
      const deletedGlossaryTerms = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED_GLOSSARY)) || [];
      const quiz_submissions = (JSON.parse(localStorage.getItem(STORAGE_KEY_QUIZ_SUBMISSIONS)) || []).filter(s => !deletedQuizSubIds.includes(s.id));
      const allSavedQuiz = JSON.parse(localStorage.getItem(STORAGE_KEY_QUIZ_BANK)) || [];
      const custom_quiz_bank = allSavedQuiz.filter(q => !deletedQuizIds.includes(q.id) && (q._edited || (q.id && q.id.startsWith('q_custom_'))));
      const custom_glossary = JSON.parse(localStorage.getItem(STORAGE_KEY_GLOSSARY)) || {};

      const payload = {
        dojos,
        students,
        custom_videos: videos,
        progress,
        quiz_submissions,
        custom_quiz_bank,
        custom_glossary,
        deletedStudentIds,
        deletedQuizIds,
        deletedQuizSubIds,
        deletedGlossaryTerms,
        deletedDojos,
        timestamp: Date.now()
      };

      const payloadStr = JSON.stringify(payload);

      // 1. Post to Vercel Serverless Sync API
      fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payloadStr
      }).catch(() => {});

      // 2. Post directly to real-time pubsub stream (ntfy.sh)
      await fetch(SYNC_URL, {
        method: 'POST',
        headers: { 
          'Title': 'TKST_DATA_V2',
          'Content-Type': 'text/plain; charset=utf-8'
        },
        body: payloadStr
      });

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

          // Profile fields: update if cloud updatedAt >= local updatedAt
          const localUpdateTime = existing.updatedAt || 0;
          const cloudUpdateTime = s.updatedAt || 0;
          if (cloudUpdateTime >= localUpdateTime) {
            ['name', 'phone', 'currentBelt', 'currentKyu', 'targetBelt', 'dojo', 'notes', 'avatar', 'startDate'].forEach(f => {
              if (s[f] !== undefined && s[f] !== null && s[f] !== '' && s[f] !== merged[f]) {
                merged[f] = s[f];
                studentModified = true;
              }
            });
            if (s.password && !merged.password) {
              merged.password = s.password;
              studentModified = true;
            }
            merged.updatedAt = cloudUpdateTime || Date.now();
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
        if (!localDeletedSubIds.includes(s.id)) subMap.set(s.id, s);
      });
      cloudData.quiz_submissions.forEach(s => {
        if (!localDeletedSubIds.includes(s.id)) subMap.set(s.id, s);
      });
      const mergedSubs = Array.from(subMap.values()).sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 200);
      const newSubsStr = JSON.stringify(mergedSubs);
      if (localStorage.getItem(STORAGE_KEY_QUIZ_SUBMISSIONS) !== newSubsStr) {
        localStorage.setItem(STORAGE_KEY_QUIZ_SUBMISSIONS, newSubsStr);
        changed = true;
      }
    }

    // 7. Sync Custom Quiz Bank (Filter out tombstoned deleted questions and merge with defaults)
    if (Array.isArray(cloudData.custom_quiz_bank) && cloudData.custom_quiz_bank.length > 0) {
      const defaultList = (window.TKST_DEFAULT_QUIZ_BANK || []).filter(q => !localDeletedQuizzes.includes(q.id));
      const localSaved = JSON.parse(localStorage.getItem(STORAGE_KEY_QUIZ_BANK)) || [];
      const bankMap = new Map();
      defaultList.forEach(q => bankMap.set(q.id, { ...q }));
      localSaved.forEach(q => {
        if (!localDeletedQuizzes.includes(q.id)) bankMap.set(q.id, q);
      });
      cloudData.custom_quiz_bank.forEach(q => {
        if (!localDeletedQuizzes.includes(q.id) && q && q.id) {
          const localQ = bankMap.get(q.id);
          if (!localQ || !localQ.updatedAt || (q.updatedAt && q.updatedAt >= localQ.updatedAt) || !localQ._edited) {
            bankMap.set(q.id, q);
          }
        }
      });
      const mergedBank = Array.from(bankMap.values());
      const localBankStr = localStorage.getItem(STORAGE_KEY_QUIZ_BANK);
      const newBankStr = JSON.stringify(mergedBank);
      if (localBankStr !== newBankStr) {
        localStorage.setItem(STORAGE_KEY_QUIZ_BANK, newBankStr);
        window.TKST_QUIZ_BANK = mergedBank;
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

    if (cloudData.custom_glossary && typeof cloudData.custom_glossary === 'object') {
      const defaultGlossary = window.TKST_DEFAULT_GLOSSARY || window.TKST_GLOSSARY || {};
      let baseGlossary = JSON.parse(JSON.stringify(defaultGlossary));
      let localGlossary = JSON.parse(localStorage.getItem(STORAGE_KEY_GLOSSARY)) || baseGlossary;

      ['bases', 'defesas', 'socosGolpes', 'chutes', 'comandosEContagem'].forEach(cat => {
        if (!baseGlossary[cat]) baseGlossary[cat] = [];
        const termMap = new Map();
        baseGlossary[cat].forEach(t => termMap.set(t.japanese.toLowerCase().trim(), { ...t }));
        (localGlossary[cat] || []).forEach(t => termMap.set(t.japanese.toLowerCase().trim(), t));
        (cloudData.custom_glossary[cat] || []).forEach(t => termMap.set(t.japanese.toLowerCase().trim(), t));

        baseGlossary[cat] = Array.from(termMap.values()).filter(t => !localDeletedTerms.includes(t.japanese.toLowerCase().trim()));
      });

      const localGStr = localStorage.getItem(STORAGE_KEY_GLOSSARY);
      const newGStr = JSON.stringify(baseGlossary);
      if (localGStr !== newGStr) {
        localStorage.setItem(STORAGE_KEY_GLOSSARY, newGStr);
        window.TKST_GLOSSARY = baseGlossary;
        changed = true;
      }
    }

    if (changed) {
      window.dispatchEvent(new CustomEvent('tkst_cloud_synced', { detail: { type: 'pull', time: new Date() } }));
      window.dispatchEvent(new CustomEvent('tkst_user_changed'));
      window.dispatchEvent(new CustomEvent('tkst_videos_updated'));
    }
  }

  async function pullFromCloud() {
    try {
      // 1. Endpoint dedicado do quiz bank (mais confiável — dados nunca são sobrescritos)
      pullQuizBankFromCloud().catch(() => {});

      // 2. Endpoint dedicado de alunos permanentes no GitHub
      pullStudentsFromCloud().catch(() => {});

      // 3. Vercel Serverless /api/sync (dados gerais: alunos, dojos, etc.)
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
          for (let i = lines.length - 1; i >= 0; i--) {
            try {
              const item = JSON.parse(lines[i]);
              const cloudData = await parseNtfyItem(item);
              if (cloudData) {
                applyCloudData(cloudData);
                break;
              }
            } catch(e) {}
          }
        }
      }
    } catch(err) {
      console.warn('Initial cloud pull notice:', err);
    }
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
                applyCloudData(cloudData);
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

    // Seed default accounts (including Admin irons365)
    let students = [];
    try {
      students = JSON.parse(localStorage.getItem(STORAGE_KEY_STUDENTS)) || [];
    } catch(e) {
      students = [];
    }

    // Ensure Master Admin exists with requested initial credentials without overwriting custom edits
    const adminIndex = students.findIndex(s => s.username === 'irons365');
    const masterAdminDefault = {
      id: 'admin_irons365',
      username: 'irons365',
      email: 'irons365@tkst.com.br',
      password: 'Irons365.',
      name: 'Sensei Diego',
      role: 'admin',
      currentBelt: 'Faixa Preta (Sensei Master)',
      targetBelt: 'Faixa Preta',
      currentKyu: 0,
      dojo: 'TKST Central & Diretoria Geral',
      startDate: '2000-01-01',
      avatar: 'assets/images/logo-tkst.png',
      status: 'approved',
      phone: '(21) 97607-7598',
      notes: 'Administrador Master responsável por todo o sistema, arquivos e aprovações.'
    };

    if (adminIndex === -1) {
      students.unshift(masterAdminDefault);
    } else {
      // Keep all user edits (name, phone, belt, etc.) and only fill missing fields
      students[adminIndex] = { ...masterAdminDefault, ...students[adminIndex] };
    }

    // Default sample students
    if (students.length === 1) {
      students.push(
        {
          id: 'std_01',
          username: 'lucas.karate',
          email: 'lucas@tkst.com.br',
          password: '1234',
          name: 'Lucas Silva',
          role: 'aluno',
          currentBelt: 'Faixa Branca',
          targetBelt: 'Faixa Amarela (6º Kyu)',
          currentKyu: 6,
          dojo: 'TKST Matriz - Central',
          startDate: '2026-01-10',
          avatar: 'assets/images/tigre.png',
          status: 'approved',
          phone: '(21) 98888-1111',
          notes: 'Treinando para o exame de Faixa Amarela.'
        },
        {
          id: 'std_02',
          username: 'mariana.costa',
          email: 'mariana@tkst.com.br',
          password: '1234',
          name: 'Mariana Costa',
          role: 'aluno',
          currentBelt: 'Faixa Vermelha',
          targetBelt: 'Faixa Laranja (4º Kyu)',
          currentKyu: 4,
          dojo: 'TKST Santo Aleixo',
          startDate: '2025-06-15',
          avatar: 'assets/images/logo-tkst-clean.png',
          status: 'approved',
          phone: '(21) 97777-2222',
          notes: 'Focada no Heian Sandan e Sanbon Kumite.'
        },
        {
          id: 'std_03',
          username: 'rodrigo99',
          email: 'rodrigo@email.com',
          password: '1234',
          name: 'Rodrigo Alcantara',
          role: 'aluno',
          currentBelt: 'Faixa Branca',
          targetBelt: 'Faixa Amarela (6º Kyu)',
          currentKyu: 6,
          dojo: 'TKST Santo Aleixo',
          startDate: '2026-08-10',
          avatar: 'assets/images/tigre.png',
          status: 'pending',
          phone: '(21) 96666-3333',
          notes: 'Cadastro recente aguardando aprovação do Sensei.'
        }
      );
    }

    localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(students));

    if (!localStorage.getItem(STORAGE_KEY_PROGRESS)) {
      localStorage.setItem(STORAGE_KEY_PROGRESS, JSON.stringify({}));
    }

    // Pull from cloud immediately on boot
    pullFromCloud(false);
  }

  initStorage();

  window.TKST_AUTH = {
    syncNow: function() {
      return pullFromCloud(true);
    },

    pushNow: function() {
      return pushToCloud();
    },

    getCurrentUser: function() {
      try {
        const user = JSON.parse(localStorage.getItem(STORAGE_KEY_USER)) || null;
        if (user && (user.username === 'irons365' || user.role === 'admin')) {
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

    getAllStudents: function() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY_STUDENTS)) || [];
      } catch (e) {
        return [];
      }
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
    // CUSTOM KATA VIDEOS (CLOUD SYNCED)
    // ==========================================
    getCustomKataVideos: function() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY_VIDEOS)) || {};
      } catch (e) {
        return {};
      }
    },

    saveCustomKataVideos: function(videos) {
      localStorage.setItem(STORAGE_KEY_VIDEOS, JSON.stringify(videos || {}));
      pushToCloud();
      window.dispatchEvent(new CustomEvent('tkst_videos_updated', { detail: videos }));
    },

    saveKataVideo: function(kataId, url) {
      const videos = this.getCustomKataVideos();
      if (url && url.trim()) {
        videos[kataId] = url.trim();
      } else {
        delete videos[kataId];
      }
      this.saveCustomKataVideos(videos);
      return { success: true, videos };
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
          pushToCloud();
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
      this.setCurrentUser(null);
    },

    login: function(identifier, password) {
      if (!identifier || !password) {
        return { success: false, message: 'Por favor, preencha o seu Nick de Usuário e a senha.' };
      }

      const cleanId = identifier.trim().toLowerCase();
      const cleanPass = password.trim();

      // Master Admin Fast Path
      if (cleanId === 'irons365' && (cleanPass === 'Irons365.' || cleanPass === 'irons365.')) {
        const students = this.getAllStudents();
        let admin = students.find(s => s.username === 'irons365');
        if (!admin) {
          initStorage();
          admin = this.getAllStudents().find(s => s.username === 'irons365');
        }
        admin.lastActive = Date.now();
        const aIdx = students.findIndex(s => s.username === 'irons365');
        if (aIdx !== -1) {
          students[aIdx].lastActive = admin.lastActive;
          localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(students));
          pushToCloud();
        }
        this.setCurrentUser(admin);
        return { success: true, user: admin };
      }

      const students = this.getAllStudents();
      const found = students.find(s => 
        (s.username && s.username.toLowerCase() === cleanId) ||
        (s.email && s.email.toLowerCase() === cleanId)
      );

      if (!found) {
        return { success: false, message: 'Nick ou usuário não encontrado. Verifique a digitação ou cadastre-se.' };
      }

      if (found.password !== cleanPass) {
        return { success: false, message: 'Senha incorreta. Tente novamente.' };
      }

      if (found.status === 'pending') {
        return { 
          success: false, 
          message: 'Seu cadastro está em análise pela coordenação técnica da TKST. Aguarde a aprovação do Sensei Diego.' 
        };
      }

      if (found.status === 'rejected') {
        return { 
          success: false, 
          message: 'Seu cadastro não foi aprovado pela coordenação. Entre em contato com seu Sensei.' 
        };
      }

      found.lastActive = Date.now();
      const fIdx = students.findIndex(s => s.id === found.id || s.username === found.username);
      if (fIdx !== -1) {
        students[fIdx].lastActive = found.lastActive;
        localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(students));
        pushToCloud();
      }

      this.setCurrentUser(found);
      return { success: true, user: found };
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

      let isAutoApproved = false;
      let initialStatus = studentData.status || 'pending';
      let autoApprovedAt = null;

      if (matchedExistingStudent) {
        // Aluno reconhecido no gerenciador de alunos! Auto-aprovação imediata!
        isAutoApproved = true;
        initialStatus = 'approved';
        autoApprovedAt = new Date().toISOString();
      }

      const newStudent = {
        id: matchedExistingStudent ? matchedExistingStudent.id : ('std_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5)),
        username: cleanNick,
        email: studentData.email ? studentData.email.trim() : `${cleanNick}@tkst.local`,
        password: pass,
        name: cleanName,
        role: studentData.role || 'aluno',
        currentBelt: selectedBelt,
        targetBelt: targetBelt,
        currentKyu: parsedKyu,
        dojo: studentData.dojo || (matchedExistingStudent ? matchedExistingStudent.dojo : 'TKST Santo Aleixo'),
        startDate: studentData.startDate || (matchedExistingStudent ? matchedExistingStudent.startDate : new Date().toISOString().split('T')[0]),
        avatar: studentData.avatar || (matchedExistingStudent ? matchedExistingStudent.avatar : 'assets/images/logo-tkst.png'),
        status: initialStatus,
        approvedAt: autoApprovedAt,
        createdAt: matchedExistingStudent ? (matchedExistingStudent.createdAt || new Date().toISOString()) : new Date().toISOString(),
        updatedAt: Date.now(),
        statusUpdatedAt: Date.now(),
        phone: studentData.phone ? studentData.phone.trim() : (matchedExistingStudent ? matchedExistingStudent.phone : ''),
        notes: (studentData.notes || 'Novo cadastro realizado pelo portal.') + (isAutoApproved ? ' [Auto-aprovado: Aluno reconhecido na base]' : '')
      };

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
      return { success: true, user: newStudent, autoApproved: isAutoApproved };
    },

    approveStudent: function(studentId) {
      if (!this.isAdmin()) return { success: false, message: 'Apenas administradores podem aprovar alunos.' };
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

    rejectStudent: function(studentId) {
      if (!this.isAdmin()) return { success: false, message: 'Apenas administradores podem recusar alunos.' };
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
      if (!this.isAdmin()) return { success: false, message: 'Apenas administradores podem excluir alunos.' };
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
      if (!user) return null;

      // 1. Update user progress in local storage
      const allProgress = JSON.parse(localStorage.getItem(STORAGE_KEY_PROGRESS)) || {};
      if (!allProgress[user.id]) {
        allProgress[user.id] = { masteredItems: {}, quizScores: [] };
      }
      if (!allProgress[user.id].quizScores) {
        allProgress[user.id].quizScores = [];
      }
      allProgress[user.id].quizScores.push({
        date: new Date().toISOString(),
        score: data.score,
        total: data.total,
        percentage: Math.round((data.score / data.total) * 100),
        beltLevel: data.beltLevel
      });
      localStorage.setItem(STORAGE_KEY_PROGRESS, JSON.stringify(allProgress));

      // 2. Add to global submissions for admin review
      let submissions = [];
      try {
        submissions = JSON.parse(localStorage.getItem(STORAGE_KEY_QUIZ_SUBMISSIONS)) || [];
      } catch(e) { submissions = []; }

      const submission = {
        id: 'quiz_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        studentId: user.id,
        studentName: user.name,
        studentUsername: user.username,
        studentBelt: user.currentBelt,
        studentKyu: user.currentKyu !== undefined ? user.currentKyu : 7,
        beltLevel: data.beltLevel,
        beltKyu: data.beltKyu !== undefined ? data.beltKyu : 7,
        score: data.score,
        total: data.total,
        percentage: Math.round((data.score / data.total) * 100),
        passed: Math.round((data.score / data.total) * 100) >= 70,
        perfect: data.score === data.total,
        date: new Date().toISOString(),
        details: data.details || [] // [{ question, options, selectedIndex, correctIndex, isCorrect, explanation }]
      };

      submissions.unshift(submission);
      if (submissions.length > 200) submissions = submissions.slice(0, 200);
      localStorage.setItem(STORAGE_KEY_QUIZ_SUBMISSIONS, JSON.stringify(submissions));

      pushToCloud();
      return submission;
    },

    getAllQuizSubmissions: function() {
      try {
        const deletedSubIds = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED_QUIZ_SUBS)) || [];
        const subs = JSON.parse(localStorage.getItem(STORAGE_KEY_QUIZ_SUBMISSIONS)) || [];
        return subs.filter(s => !deletedSubIds.includes(s.id));
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

      pushToCloud();
      return { success: true, remaining: submissions.length };
    },

    getCustomQuizBank: function() {
      const del = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED_QUIZZES)) || [];
      const rawDefault = (window.TKST_DEFAULT_QUIZ_BANK || window.TKST_QUIZ || []).filter(q => !del.includes(q.id));
      
      const bankMap = new Map();
      rawDefault.forEach(q => { if (q && q.id) bankMap.set(q.id, { ...q }); });

      try {
        let saved = JSON.parse(localStorage.getItem(STORAGE_KEY_QUIZ_BANK));
        if (Array.isArray(saved) && saved.length > 0) {
          saved.forEach(q => {
            if (q && q.id && !del.includes(q.id)) {
              bankMap.set(q.id, q);
            }
          });
        }
      } catch(e) {}

      const mergedBank = Array.from(bankMap.values());
      localStorage.setItem(STORAGE_KEY_QUIZ_BANK, JSON.stringify(mergedBank));
      window.TKST_QUIZ_BANK = mergedBank;
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
      const cleanBank = Array.from(bankMap.values());

      // 1. Salva localmente
      localStorage.setItem(STORAGE_KEY_QUIZ_BANK, JSON.stringify(cleanBank));
      window.TKST_QUIZ_BANK = cleanBank;

      // 2. Envia ao endpoint DEDICADO /api/quiz-bank (persistência garantida)
      pushQuizBankToCloud(cleanBank, deletedIds);

      // 3. Envia ao sync geral (ntfy.sh + /api/sync) para outros dados
      pushToCloud();

      // 4. Dispara evento de sync para atualizar badge na UI
      window.dispatchEvent(new CustomEvent('tkst_quiz_bank_saved', {
        detail: { count: cleanBank.length, savedAt: new Date() }
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

      try {
        let saved = JSON.parse(localStorage.getItem(STORAGE_KEY_GLOSSARY));
        if (saved && typeof saved === 'object') {
          ['bases', 'defesas', 'socosGolpes', 'chutes', 'comandosEContagem'].forEach(cat => {
            if (!baseGlossary[cat]) baseGlossary[cat] = [];
            const termMap = new Map();
            baseGlossary[cat].forEach(t => termMap.set(t.japanese.toLowerCase().trim(), { ...t }));
            (saved[cat] || []).forEach(t => {
              if (!deletedTerms.includes(t.japanese.toLowerCase().trim())) {
                termMap.set(t.japanese.toLowerCase().trim(), t);
              }
            });
            baseGlossary[cat] = Array.from(termMap.values()).filter(t => !deletedTerms.includes(t.japanese.toLowerCase().trim()));
          });
          localStorage.setItem(STORAGE_KEY_GLOSSARY, JSON.stringify(baseGlossary));
          window.TKST_GLOSSARY = baseGlossary;
          return baseGlossary;
        }
      } catch(e) {}

      ['bases', 'defesas', 'socosGolpes', 'chutes', 'comandosEContagem'].forEach(cat => {
        if (baseGlossary[cat]) {
          baseGlossary[cat] = baseGlossary[cat].filter(t => !deletedTerms.includes(t.japanese.toLowerCase().trim()));
        }
      });
      localStorage.setItem(STORAGE_KEY_GLOSSARY, JSON.stringify(baseGlossary));
      window.TKST_GLOSSARY = baseGlossary;
      return baseGlossary;
    },

    saveCustomGlossary: function(glossary) {
      if (!glossary || typeof glossary !== 'object') return false;
      localStorage.setItem(STORAGE_KEY_GLOSSARY, JSON.stringify(glossary));
      window.TKST_GLOSSARY = glossary;
      pushToCloud();
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

      const existingIdx = glossary[category].findIndex(t => t.japanese.toLowerCase().trim() === cleanKey);
      if (existingIdx !== -1) {
        glossary[category][existingIdx] = { ...term };
      } else {
        glossary[category].unshift({ ...term });
      }

      this.saveCustomGlossary(glossary);
      return { success: true, term };
    },

    deleteGlossaryTerm: function(category, japaneseName) {
      if (!this.isAdmin()) return { success: false, error: 'Apenas o administrador pode excluir termos.' };
      const cleanKey = (japaneseName || '').toLowerCase().trim();

      let deletedTerms = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED_GLOSSARY)) || [];
      if (!deletedTerms.includes(cleanKey)) deletedTerms.push(cleanKey);
      localStorage.setItem(STORAGE_KEY_DELETED_GLOSSARY, JSON.stringify(deletedTerms));

      const glossary = this.getCustomGlossary();
      if (glossary[category]) {
        glossary[category] = glossary[category].filter(t => t.japanese.toLowerCase().trim() !== cleanKey);
      }
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
      if (oldCleanKey !== newCleanKey) {
        if (!deletedTerms.includes(oldCleanKey)) deletedTerms.push(oldCleanKey);
        deletedTerms = deletedTerms.filter(k => k !== newCleanKey);
        localStorage.setItem(STORAGE_KEY_DELETED_GLOSSARY, JSON.stringify(deletedTerms));
      }

      const glossary = this.getCustomGlossary();

      // Remove from old category if exists
      if (glossary[oldCategory]) {
        glossary[oldCategory] = glossary[oldCategory].filter(t => t.japanese.toLowerCase().trim() !== oldCleanKey);
      }

      if (!glossary[newCategory]) glossary[newCategory] = [];

      // Remove any existing in new category and insert
      glossary[newCategory] = glossary[newCategory].filter(t => t.japanese.toLowerCase().trim() !== newCleanKey);
      glossary[newCategory].unshift({ ...newTermData });

      this.saveCustomGlossary(glossary);
      return { success: true, term: newTermData };
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
    }
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
