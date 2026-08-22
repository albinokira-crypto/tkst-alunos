// Serverless Real-Time Sync API for TKST Karate Portal
const fs = require('fs');
const path = require('path');
const TMP_QUIZ_FILE = path.join('/tmp', 'tkst_sync_quiz_bank.json');
const TMP_FULL_STATE_FILE = path.join('/tmp', 'tkst_sync_full_state.json');

function readFullStateFromTmp() {
  try {
    if (fs.existsSync(TMP_FULL_STATE_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(TMP_FULL_STATE_FILE, 'utf8'));
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch (e) {}
  return null;
}

function writeFullStateToTmp(state) {
  try {
    fs.writeFileSync(TMP_FULL_STATE_FILE, JSON.stringify(state), 'utf8');
  } catch (e) {}
}

function readQuizBankFromTmp() {
  try {
    if (fs.existsSync(TMP_QUIZ_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(TMP_QUIZ_FILE, 'utf8'));
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return null;
}

function writeQuizBankToTmp(bank) {
  try {
    fs.writeFileSync(TMP_QUIZ_FILE, JSON.stringify(bank), 'utf8');
  } catch (e) {}
}

let inMemoryData = {
  dojos: [
    'TKST Santo Aleixo',
    'QG TKST ( Capela )',
    'TKST Rio do Ouro'
  ],
  students: [
    {
      id: 'admin_irons365',
      name: 'Sensei Diego',
      username: 'irons365',
      email: 'irons365@tkst.com.br',
      phone: '(21) 97607-7598',
      role: 'admin',
      currentBelt: 'Faixa Preta (Sensei Master)',
      currentKyu: 0,
      targetBelt: 'Faixa Preta',
      dojo: 'TKST Central & Diretoria Geral',
      status: 'approved',
      approvedAt: '2026-01-01T00:00:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: 1,
      statusUpdatedAt: 1
    }
  ],
  custom_videos: {},
  progress: {},
  quiz_submissions: [],
  custom_quiz_bank: [],
  custom_glossary: {},
  deletedStudentIds: [],
  deletedQuizIds: [],
  deletedQuizSubIds: [],
  deletedGlossaryTerms: [],
  deletedDojos: ['tkst matriz - central'],
  lastSync: new Date().toISOString()
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    // Hidrata do /tmp se disponível para garantir persistência total
    const tmpFull = readFullStateFromTmp();
    if (tmpFull) {
      inMemoryData = { ...inMemoryData, ...tmpFull };
    }
    if (!inMemoryData.custom_quiz_bank || inMemoryData.custom_quiz_bank.length === 0) {
      const tmpBank = readQuizBankFromTmp();
      if (tmpBank) inMemoryData.custom_quiz_bank = tmpBank;
    }

    // Hidrata base de alunos do assets/data/students.json se a lista em memória só tiver o admin
    if (!inMemoryData.students || inMemoryData.students.length <= 1) {
      try {
        const localStudentsPath = path.resolve(process.cwd(), 'assets/data/students.json');
        if (fs.existsSync(localStudentsPath)) {
          const sParsed = JSON.parse(fs.readFileSync(localStudentsPath, 'utf8'));
          if (sParsed && Array.isArray(sParsed.students) && sParsed.students.length > 0) {
            inMemoryData.students = sParsed.students;
            if (Array.isArray(sParsed.deletedStudentIds)) {
              inMemoryData.deletedStudentIds = sParsed.deletedStudentIds;
            }
          }
        }
      } catch(e) {}
    }

    return res.status(200).json({
      success: true,
      data: inMemoryData
    });
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    try {
      let body = req.body;
      if (typeof body === 'string') {
        body = JSON.parse(body);
      }
      const incoming = body.data || body;

      // 1. Merge deleted IDs (tombstones)
      let deletedSet = new Set(inMemoryData.deletedStudentIds || []);
      if (Array.isArray(incoming.deletedStudentIds)) {
        incoming.deletedStudentIds.forEach(id => deletedSet.add(id));
      }
      const allDeleted = Array.from(deletedSet);

      // 2. Intelligent Student Merge with Status Authority
      const studentMap = new Map();
      (inMemoryData.students || []).forEach(s => {
        if (s && s.id && !deletedSet.has(s.id)) {
          studentMap.set(s.id, { ...s });
        }
      });

      if (Array.isArray(incoming.students)) {
        incoming.students.forEach(s => {
          if (!s || !s.id || deletedSet.has(s.id)) return;
          const existing = studentMap.get(s.id);
          if (!existing) {
            studentMap.set(s.id, { ...s });
          } else {
            const merged = { ...existing };
            const existingStatus = existing.status || 'pending';
            const cloudStatus = s.status || 'pending';
            const localStatusTime = existing.statusUpdatedAt || (existingStatus === 'approved' ? 1 : 0);
            const cloudStatusTime = s.statusUpdatedAt || (cloudStatus === 'approved' ? 1 : 0);

            if (existingStatus !== 'pending' && cloudStatus === 'pending') {
              if (cloudStatusTime > localStatusTime && cloudStatusTime > (existing.approvedAt ? new Date(existing.approvedAt).getTime() : 0)) {
                merged.status = cloudStatus;
                merged.statusUpdatedAt = cloudStatusTime;
              }
            } else if (existingStatus === 'pending' && cloudStatus !== 'pending') {
              merged.status = cloudStatus;
              merged.statusUpdatedAt = cloudStatusTime || Date.now();
              if (s.approvedAt) merged.approvedAt = s.approvedAt;
              if (s.rejectedAt) merged.rejectedAt = s.rejectedAt;
            } else if (cloudStatusTime >= localStatusTime) {
              merged.status = cloudStatus;
              merged.statusUpdatedAt = cloudStatusTime;
            }

            const localUpdateTime = existing.updatedAt || 0;
            const cloudUpdateTime = s.updatedAt || 0;
            if (cloudUpdateTime >= localUpdateTime) {
              ['name', 'phone', 'currentBelt', 'currentKyu', 'targetBelt', 'dojo', 'notes', 'avatar', 'startDate'].forEach(f => {
                if (s[f] !== undefined && s[f] !== null && s[f] !== '') merged[f] = s[f];
              });
              if (s.password && !merged.password) merged.password = s.password;
              merged.updatedAt = cloudUpdateTime || Date.now();
            }

            const localActive = existing.lastActive ? new Date(existing.lastActive).getTime() : 0;
            const cloudActive = s.lastActive ? new Date(s.lastActive).getTime() : 0;
            if (cloudActive > localActive) merged.lastActive = cloudActive;

            studentMap.set(s.id, merged);
          }
        });
      }

      let studentsList = Array.from(studentMap.values());

      // Always ensure master admin irons365 is present
      if (!studentsList.some(s => s.username === 'irons365')) {
        studentsList.unshift({
          id: 'admin_irons365',
          name: 'Sensei Diego',
          username: 'irons365',
          email: 'irons365@tkst.com.br',
          phone: '',
          role: 'admin',
          currentBelt: 'Faixa Preta',
          currentKyu: 0,
          targetBelt: 'Faixa Preta',
          dojo: 'TKST Central & Diretoria Geral',
          status: 'approved',
          approvedAt: '2026-01-01T00:00:00.000Z',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: 1,
          statusUpdatedAt: 1
        });
      }

      // 3. Merge deleted Quiz IDs
      let deletedQuizSet = new Set(inMemoryData.deletedQuizIds || []);
      if (Array.isArray(incoming.deletedQuizIds)) {
        incoming.deletedQuizIds.forEach(id => deletedQuizSet.add(id));
      }
      const allDeletedQuizzes = Array.from(deletedQuizSet);

      // 4. Merge deleted Quiz Submissions
      let deletedSubSet = new Set(inMemoryData.deletedQuizSubIds || []);
      if (Array.isArray(incoming.deletedQuizSubIds)) {
        incoming.deletedQuizSubIds.forEach(id => deletedSubSet.add(id));
      }
      const allDeletedSubs = Array.from(deletedSubSet);

      // 5. Merge deleted Dojos (tombstones ALWAYS win)
      let deletedDojoSet = new Set(inMemoryData.deletedDojos || []);
      deletedDojoSet.add('tkst matriz - central');
      if (Array.isArray(incoming.deletedDojos)) {
        incoming.deletedDojos.forEach(d => {
          if (d) deletedDojoSet.add(d.toLowerCase().trim());
        });
      }
      const allDeletedDojos = Array.from(deletedDojoSet);

      let dojosList = Array.isArray(incoming.dojos) ? incoming.dojos : (inMemoryData.dojos || []);
      dojosList = dojosList.filter(d => typeof d === 'string' && d.trim().length > 0 && !deletedDojoSet.has(d.toLowerCase().trim()) && d.toLowerCase().trim() !== 'tkst matriz - central');

      // Merge custom_quiz_bank: preserva questões já em memória e adiciona as novas
      const existingQuizBank = inMemoryData.custom_quiz_bank || readQuizBankFromTmp() || [];
      let customQuizBank;
      if (Array.isArray(incoming.custom_quiz_bank) && incoming.custom_quiz_bank.length > 0) {
        const quizMap = new Map();
        existingQuizBank.forEach(q => { if (q && q.id) quizMap.set(q.id, q); });
        incoming.custom_quiz_bank.forEach(q => { if (q && q.id) quizMap.set(q.id, q); });
        customQuizBank = Array.from(quizMap.values()).filter(q => !deletedQuizSet.has(q.id));
      } else {
        customQuizBank = existingQuizBank.filter(q => !deletedQuizSet.has(q.id));
      }

      let quizSubmissionsList = Array.isArray(incoming.quiz_submissions) ? incoming.quiz_submissions : (inMemoryData.quiz_submissions || []);
      quizSubmissionsList = quizSubmissionsList.filter(s => !deletedSubSet.has(s.id));

      inMemoryData = {
        dojos: dojosList,
        students: studentsList,
        custom_videos: incoming.custom_videos ? { ...inMemoryData.custom_videos, ...incoming.custom_videos } : inMemoryData.custom_videos,
        progress: incoming.progress ? { ...inMemoryData.progress, ...incoming.progress } : inMemoryData.progress,
        quiz_submissions: quizSubmissionsList,
        custom_quiz_bank: customQuizBank,
        custom_glossary: incoming.custom_glossary || inMemoryData.custom_glossary || {},
        deletedStudentIds: allDeleted,
        deletedQuizIds: allDeletedQuizzes,
        deletedQuizSubIds: allDeletedSubs,
        deletedGlossaryTerms: incoming.deletedGlossaryTerms || inMemoryData.deletedGlossaryTerms || [],
        deletedDojos: allDeletedDojos,
        lastSync: new Date().toISOString()
      };

      // Persiste estado completo e quiz bank no /tmp para sobreviver ao próximo cold-start
      writeFullStateToTmp(inMemoryData);
      if (customQuizBank.length > 0) writeQuizBankToTmp(customQuizBank);

      return res.status(200).json({
        success: true,
        data: inMemoryData
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: err.message
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
