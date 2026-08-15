// Serverless Real-Time Sync API for TKST Karate Portal
let inMemoryData = {
  dojos: [
    'TKST Matriz - Central',
    'TKST Jardim Catarina',
    'TKST Alcântara',
    'TKST Niterói',
    'TKST Maricá',
    'TKST São Gonçalo',
    'TKST Itaboraí',
    'TKST Rio do Ouro',
    'TKST Jardim Esmeralda'
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
      dojo: 'TKST Matriz - Central',
      status: 'approved',
      approvedAt: '2026-01-01T00:00:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z'
    }
  ],
  custom_videos: {},
  progress: {},
  quiz_submissions: [],
  deletedStudentIds: [],
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
          dojo: 'TKST Matriz - Central',
          status: 'approved',
          approvedAt: '2026-01-01T00:00:00.000Z',
          createdAt: '2026-01-01T00:00:00.000Z'
        });
      }

      inMemoryData = {
        dojos: Array.isArray(incoming.dojos) && incoming.dojos.length > 0 ? incoming.dojos : inMemoryData.dojos,
        students: studentsList,
        custom_videos: incoming.custom_videos ? { ...inMemoryData.custom_videos, ...incoming.custom_videos } : inMemoryData.custom_videos,
        progress: incoming.progress ? { ...inMemoryData.progress, ...incoming.progress } : inMemoryData.progress,
        quiz_submissions: Array.isArray(incoming.quiz_submissions) ? incoming.quiz_submissions : (inMemoryData.quiz_submissions || []),
        deletedStudentIds: allDeleted,
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
