/**
 * TKST Alunos - Master Authentication & Student State Manager
 * Fully automated background cloud sync (PC <-> Mobile <-> All devices in real time)
 */

(function() {
  const STORAGE_KEY_USER = 'tkst_current_user';
  const STORAGE_KEY_STUDENTS = 'tkst_all_students';
  const STORAGE_KEY_PROGRESS = 'tkst_student_progress';
  const STORAGE_KEY_DOJOS = 'tkst_all_dojos';
  const STORAGE_KEY_VIDEOS = 'tkst_custom_kata_videos';
  const STORAGE_KEY_DELETED = 'tkst_deleted_student_ids';
  const STORAGE_KEY_QUIZ_SUBMISSIONS = 'tkst_quiz_submissions';
  const STORAGE_KEY_QUIZ_BANK = 'tkst_custom_quiz_bank';
  const STORAGE_KEY_DELETED_QUIZZES = 'tkst_deleted_quiz_ids';
  const AUTH_VERSION_KEY = 'tkst_auth_v3_nick';

  const SYNC_TOPIC = 'tkst_karate_master_stream_2026';
  const SYNC_URL = 'https://ntfy.sh/' + SYNC_TOPIC;
  let isSyncing = false;
  let syncPending = false;

  // Load custom quiz bank on initialization if present
  try {
    const deletedIds = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED_QUIZZES)) || [];
    const savedBank = JSON.parse(localStorage.getItem(STORAGE_KEY_QUIZ_BANK));
    if (Array.isArray(savedBank) && savedBank.length > 0) {
      window.TKST_QUIZ_BANK = savedBank.filter(q => !deletedIds.includes(q.id));
    }
  } catch(e) {}

  const DEFAULT_DOJOS = [
    'TKST Matriz - Central',
    'TKST Santo Aleixo',
    'QG TKST ( Capela )',
    'TKST Rio do Ouro',
    'TKST Jardim Esmeralda',
    'TKST Alcântara',
    'TKST Niterói',
    'TKST Maricá',
    'TKST São Gonçalo',
    'TKST Itaboraí'
  ];

  // =========================================================================
  // AUTOMATIC REAL-TIME CLOUD SYNC ENGINE (PC <-> MOBILE IN REAL TIME)
  // =========================================================================
  async function pushToCloud() {
    if (isSyncing) {
      syncPending = true;
      return;
    }
    try {
      isSyncing = true;
      const dojos = JSON.parse(localStorage.getItem(STORAGE_KEY_DOJOS)) || DEFAULT_DOJOS;
      const students = JSON.parse(localStorage.getItem(STORAGE_KEY_STUDENTS)) || [];
      const videos = JSON.parse(localStorage.getItem(STORAGE_KEY_VIDEOS)) || {};
      const progress = JSON.parse(localStorage.getItem(STORAGE_KEY_PROGRESS)) || {};
      const quiz_submissions = JSON.parse(localStorage.getItem(STORAGE_KEY_QUIZ_SUBMISSIONS)) || [];
      const deletedStudentIds = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED)) || [];
      const deletedQuizIds = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED_QUIZZES)) || [];
      const custom_quiz_bank = (JSON.parse(localStorage.getItem(STORAGE_KEY_QUIZ_BANK)) || (window.TKST_QUIZ_BANK || [])).filter(q => !deletedQuizIds.includes(q.id));

      const payload = {
        dojos,
        students,
        custom_videos: videos,
        progress,
        quiz_submissions,
        custom_quiz_bank,
        deletedStudentIds,
        deletedQuizIds,
        timestamp: Date.now()
      };

      await fetch(SYNC_URL, {
        method: 'POST',
        headers: { 'Title': 'TKST_SYNC' },
        body: JSON.stringify(payload)
      });

      window.dispatchEvent(new CustomEvent('tkst_cloud_synced', { detail: { type: 'push', time: new Date() } }));
    } catch(err) {
      console.warn('Cloud auto-push notice:', err);
    } finally {
      isSyncing = false;
      if (syncPending) {
        syncPending = false;
        setTimeout(pushToCloud, 200);
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

    // 3. Sync Students (Expunge deleted & merge active)
    if (Array.isArray(cloudData.students)) {
      let localStudents = JSON.parse(localStorage.getItem(STORAGE_KEY_STUDENTS)) || [];
      const studentMap = new Map();

      // Keep local students not deleted
      localStudents.forEach(s => {
        if (!localDeleted.includes(s.id)) {
          studentMap.set(s.id || s.username, s);
        }
      });

      // Merge cloud students not deleted
      cloudData.students.forEach(s => {
        if (!localDeleted.includes(s.id)) {
          studentMap.set(s.id || s.username, { ...(studentMap.get(s.id || s.username) || {}), ...s });
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

    // 4. Sync Dojos
    if (Array.isArray(cloudData.dojos) && cloudData.dojos.length > 0) {
      let localDojos = JSON.parse(localStorage.getItem(STORAGE_KEY_DOJOS)) || DEFAULT_DOJOS;
      const mergedDojos = Array.from(new Set([...localDojos, ...cloudData.dojos]));
      const currentDojosStr = localStorage.getItem(STORAGE_KEY_DOJOS);
      const newDojosStr = JSON.stringify(mergedDojos);
      if (currentDojosStr !== newDojosStr) {
        localStorage.setItem(STORAGE_KEY_DOJOS, newDojosStr);
        changed = true;
      }
    }

    // 5. Sync Custom Videos (MERGE without losing local video links)
    if (cloudData.custom_videos && typeof cloudData.custom_videos === 'object') {
      let localVideos = JSON.parse(localStorage.getItem(STORAGE_KEY_VIDEOS)) || {};
      const mergedVideos = { ...cloudData.custom_videos, ...localVideos };
      const vStr = JSON.stringify(mergedVideos);
      if (localStorage.getItem(STORAGE_KEY_VIDEOS) !== vStr) {
        localStorage.setItem(STORAGE_KEY_VIDEOS, vStr);
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

    // 6. Sync Quiz Submissions
    if (Array.isArray(cloudData.quiz_submissions)) {
      const localSubs = JSON.parse(localStorage.getItem(STORAGE_KEY_QUIZ_SUBMISSIONS)) || [];
      const subMap = new Map();
      localSubs.forEach(s => subMap.set(s.id, s));
      cloudData.quiz_submissions.forEach(s => subMap.set(s.id, s));
      const mergedSubs = Array.from(subMap.values()).sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 200);
      const newSubsStr = JSON.stringify(mergedSubs);
      if (localStorage.getItem(STORAGE_KEY_QUIZ_SUBMISSIONS) !== newSubsStr) {
        localStorage.setItem(STORAGE_KEY_QUIZ_SUBMISSIONS, newSubsStr);
        changed = true;
      }
    }

    // 7. Sync Custom Quiz Bank (Filter out tombstoned deleted questions)
    if (Array.isArray(cloudData.custom_quiz_bank) && cloudData.custom_quiz_bank.length > 0) {
      const cleanBank = cloudData.custom_quiz_bank.filter(q => !localDeletedQuizzes.includes(q.id));
      const localBankStr = localStorage.getItem(STORAGE_KEY_QUIZ_BANK);
      const newBankStr = JSON.stringify(cleanBank);
      if (localBankStr !== newBankStr) {
        localStorage.setItem(STORAGE_KEY_QUIZ_BANK, newBankStr);
        window.TKST_QUIZ_BANK = cleanBank;
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
      const res = await fetch(SYNC_URL + '/json?poll=1');
      if (res.ok) {
        const text = await res.text();
        if (text && text.trim()) {
          const lines = text.trim().split('\n');
          for (let i = lines.length - 1; i >= 0; i--) {
            try {
              const item = JSON.parse(lines[i]);
              if (item && item.message) {
                const cloudData = JSON.parse(item.message);
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
        es.onmessage = function(e) {
          try {
            const parsed = JSON.parse(e.data);
            if (parsed && parsed.event === 'message' && parsed.message) {
              const cloudData = JSON.parse(parsed.message);
              applyCloudData(cloudData);
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

    // Initialize Dojos
    if (!localStorage.getItem(STORAGE_KEY_DOJOS)) {
      localStorage.setItem(STORAGE_KEY_DOJOS, JSON.stringify(DEFAULT_DOJOS));
    }

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
          dojo: 'TKST Matriz - Central',
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
      return !!(user && (user.role === 'admin' || user.username === 'irons365'));
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
      try {
        const dojos = JSON.parse(localStorage.getItem(STORAGE_KEY_DOJOS));
        if (Array.isArray(dojos) && dojos.length > 0) return dojos;
      } catch(e) {}
      return DEFAULT_DOJOS;
    },

    addDojo: function(dojoName) {
      if (!this.isAdmin()) return { success: false, message: 'Apenas o Administrador pode cadastrar Dojos.' };
      const trimmed = (dojoName || '').trim();
      if (!trimmed) return { success: false, message: 'Digite o nome do Dojo.' };

      const dojos = this.getDojos();
      if (dojos.some(d => d.toLowerCase() === trimmed.toLowerCase())) {
        return { success: false, message: 'Já existe um Dojo cadastrado com este nome.' };
      }

      dojos.push(trimmed);
      localStorage.setItem(STORAGE_KEY_DOJOS, JSON.stringify(dojos));
      pushToCloud();
      return { success: true, dojos };
    },

    deleteDojo: function(dojoName) {
      if (!this.isAdmin()) return { success: false, message: 'Apenas o Administrador pode excluir Dojos.' };
      let dojos = this.getDojos();
      if (dojos.length <= 1) {
        return { success: false, message: 'O sistema deve manter pelo menos um Dojo cadastrado.' };
      }
      dojos = dojos.filter(d => d !== dojoName);
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

      const newStudent = {
        id: 'std_' + Date.now(),
        username: cleanNick,
        email: studentData.email ? studentData.email.trim() : `${cleanNick}@tkst.local`,
        password: pass,
        name: studentData.name.trim(),
        role: studentData.role || 'aluno',
        currentBelt: selectedBelt,
        targetBelt: targetBelt,
        currentKyu: parsedKyu,
        dojo: studentData.dojo || 'TKST Matriz - Central',
        startDate: studentData.startDate || new Date().toISOString().split('T')[0],
        avatar: studentData.avatar || 'assets/images/logo-tkst.png',
        status: studentData.status || 'pending',
        phone: studentData.phone ? studentData.phone.trim() : '',
        notes: studentData.notes || 'Novo cadastro realizado pelo portal.'
      };

      students.push(newStudent);
      localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(students));
      pushToCloud();
      return { success: true, user: newStudent };
    },

    approveStudent: function(studentId) {
      if (!this.isAdmin()) return { success: false, message: 'Apenas administradores podem aprovar alunos.' };
      const students = this.getAllStudents();
      const idx = students.findIndex(s => s.id === studentId);
      if (idx !== -1) {
        students[idx].status = 'approved';
        localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(students));
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
        localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(students));
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
        dojo: updatedData.dojo ? updatedData.dojo.trim() : (currentUser.dojo || 'TKST Matriz - Central'),
        currentBelt: selectedBelt,
        currentKyu: kyu,
        targetBelt: targetBelt,
        avatar: updatedData.avatar || currentUser.avatar || 'assets/images/logo-tkst.png',
        password: newPassword
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
        return JSON.parse(localStorage.getItem(STORAGE_KEY_QUIZ_SUBMISSIONS)) || [];
      } catch(e) {
        return [];
      }
    },

    getCustomQuizBank: function() {
      try {
        const deletedIds = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED_QUIZZES)) || [];
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_QUIZ_BANK));
        if (Array.isArray(saved) && saved.length > 0) return saved.filter(q => !deletedIds.includes(q.id));
      } catch(e) {}
      const del = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED_QUIZZES)) || [];
      return (window.TKST_QUIZ_BANK || []).filter(q => !del.includes(q.id));
    },

    saveCustomQuizBank: function(bank) {
      if (!Array.isArray(bank)) return false;
      const deletedIds = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED_QUIZZES)) || [];
      const cleanBank = bank.filter(q => !deletedIds.includes(q.id));
      localStorage.setItem(STORAGE_KEY_QUIZ_BANK, JSON.stringify(cleanBank));
      window.TKST_QUIZ_BANK = cleanBank;
      pushToCloud();
      return true;
    },

    deleteQuizQuestion: function(qId) {
      let deleted = JSON.parse(localStorage.getItem(STORAGE_KEY_DELETED_QUIZZES)) || [];
      if (!deleted.includes(qId)) deleted.push(qId);
      localStorage.setItem(STORAGE_KEY_DELETED_QUIZZES, JSON.stringify(deleted));

      let bank = (window.TKST_QUIZ_BANK || []).filter(item => item.id !== qId);
      localStorage.setItem(STORAGE_KEY_QUIZ_BANK, JSON.stringify(bank));
      window.TKST_QUIZ_BANK = bank;
      pushToCloud();
      return bank;
    },

    saveQuizResult: function(score, total, kyu) {
      return this.saveQuizSubmission({ score, total, beltLevel: kyu || 'Geral' });
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
})();
