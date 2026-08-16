// Serverless Real-Time Sync API for TKST Karate Portal
let inMemoryData = {
  dojos: [
    'TKST Matriz - Central',
    'TKST Santo Aleixo',
    'QG TKST ( Capela )',
    'TKST Rio do Ouro'
  ],
  students: [
    {
      id: 'admin_diego_001',
      name: 'Diego',
      username: 'irons365',
      phone: '(21) 97607-7598',
      role: 'admin',
      currentBelt: 'Faixa Preta (Sensei Master)',
      currentKyu: 0,
      targetBelt: 'Faixa Preta',
      dojo: 'TKST Central & Diretoria Geral',
      status: 'approved',
      approvedAt: '2026-01-01T00:00:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z'
    }
  ],
  custom_videos: {},
  progress: {},
  quiz_submissions: [],
  custom_quiz_bank: null,
  custom_glossary: null,
  deletedStudentIds: [],
  deletedQuizIds: [],
  deletedQuizSubIds: [],
  deletedGlossaryTerms: [],
  deletedDojos: [],
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

      // Merge deleted IDs
      let deletedSet = new Set(inMemoryData.deletedStudentIds || []);
      if (Array.isArray(incoming.deletedStudentIds)) {
        incoming.deletedStudentIds.forEach(id => deletedSet.add(id));
      }
      const allDeleted = Array.from(deletedSet);

      // Merge students (filter out deleted ones)
      let studentsList = Array.isArray(incoming.students) ? incoming.students : (inMemoryData.students || []);
      studentsList = studentsList.filter(s => !deletedSet.has(s.id));

      // Always ensure master admin irons365 is present
      if (!studentsList.some(s => s.username === 'irons365')) {
        studentsList.unshift({
          id: 'admin_diego_001',
          name: 'Diego',
          username: 'irons365',
          phone: '(21) 97607-7598',
          role: 'admin',
          currentBelt: 'Faixa Preta (Sensei Master)',
          currentKyu: 0,
          targetBelt: 'Faixa Preta',
          dojo: 'TKST Central & Diretoria Geral',
          status: 'approved',
          approvedAt: '2026-01-01T00:00:00.000Z',
          createdAt: '2026-01-01T00:00:00.000Z'
        });
      }

      // Merge deleted Quiz IDs
      let deletedQuizSet = new Set(inMemoryData.deletedQuizIds || []);
      if (Array.isArray(incoming.deletedQuizIds)) {
        incoming.deletedQuizIds.forEach(id => deletedQuizSet.add(id));
      }
      const allDeletedQuizzes = Array.from(deletedQuizSet);

      // Merge deleted Quiz Submissions (Simulados excluídos)
      let deletedSubSet = new Set(inMemoryData.deletedQuizSubIds || []);
      if (Array.isArray(incoming.deletedQuizSubIds)) {
        incoming.deletedQuizSubIds.forEach(id => deletedSubSet.add(id));
      }
      const allDeletedSubs = Array.from(deletedSubSet);

      // Merge deleted Dojos
      let deletedDojoSet = new Set(inMemoryData.deletedDojos || []);
      if (Array.isArray(incoming.deletedDojos)) {
        incoming.deletedDojos.forEach(d => {
          if (d) deletedDojoSet.add(d.toLowerCase().trim());
        });
      }

      // If incoming has explicit dojos, un-tombstone them so they can be added!
      if (Array.isArray(incoming.dojos)) {
        incoming.dojos.forEach(d => {
          if (d) deletedDojoSet.delete(d.toLowerCase().trim());
        });
      }
      const allDeletedDojos = Array.from(deletedDojoSet);

      let dojosList = Array.isArray(incoming.dojos) ? incoming.dojos : (inMemoryData.dojos || []);
      dojosList = dojosList.filter(d => typeof d === 'string' && d.trim().length > 0 && !deletedDojoSet.has(d.toLowerCase().trim()));

      let quizBankMap = new Map();
      if (Array.isArray(inMemoryData.custom_quiz_bank)) {
        inMemoryData.custom_quiz_bank.forEach(q => quizBankMap.set(q.id, q));
      }
      if (Array.isArray(incoming.custom_quiz_bank)) {
        incoming.custom_quiz_bank.forEach(q => quizBankMap.set(q.id, q));
      }
      let customQuizBank = Array.from(quizBankMap.values()).filter(q => !deletedQuizSet.has(q.id));

      let quizSubmissionsList = Array.isArray(incoming.quiz_submissions) ? incoming.quiz_submissions : (inMemoryData.quiz_submissions || []);
      if (Array.isArray(quizSubmissionsList)) {
        quizSubmissionsList = quizSubmissionsList.filter(s => !deletedSubSet.has(s.id));
      }

      inMemoryData = {
        dojos: dojosList,
        students: studentsList,
        custom_videos: incoming.custom_videos ? { ...inMemoryData.custom_videos, ...incoming.custom_videos } : inMemoryData.custom_videos,
        progress: incoming.progress ? { ...inMemoryData.progress, ...incoming.progress } : inMemoryData.progress,
        quiz_submissions: quizSubmissionsList,
        custom_quiz_bank: customQuizBank,
        custom_glossary: incoming.custom_glossary || inMemoryData.custom_glossary || null,
        deletedStudentIds: allDeleted,
        deletedQuizIds: allDeletedQuizzes,
        deletedQuizSubIds: allDeletedSubs,
        deletedGlossaryTerms: incoming.deletedGlossaryTerms || inMemoryData.deletedGlossaryTerms || [],
        deletedDojos: allDeletedDojos,
        lastSync: new Date().toISOString()
      };

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
