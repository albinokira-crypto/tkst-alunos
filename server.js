const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;
const VIDEO_DIR = 'D:\\Videos Kata SKO';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webmanifest': 'application/manifest+json'
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // 1. Handle API Endpoints
  if (pathname.startsWith('/api/')) {
    const apiName = pathname.replace('/api/', '').split('?')[0].replace(/\.js$/, '');
    const apiFile = path.join(PUBLIC_DIR, 'api', `${apiName}.js`);

    if (fs.existsSync(apiFile)) {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        if (body) {
          try {
            req.body = JSON.parse(body);
          } catch(e) {
            req.body = body;
          }
        }
        try {
          // Helper to support res.json and res.status in standard http
          if (!res.status) {
            res.status = function(code) {
              res.statusCode = code;
              return res;
            };
          }
          if (!res.json) {
            res.json = function(data) {
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify(data));
              return res;
            };
          }

          // Special local persistence for student-commit
          if (apiName === 'student-commit' && (req.method === 'POST' || req.method === 'PUT') && req.body) {
            try {
              const studentsPath = path.join(PUBLIC_DIR, 'assets', 'data', 'students.json');
              let currentData = { students: [], deletedStudentIds: [] };
              if (fs.existsSync(studentsPath)) {
                currentData = JSON.parse(fs.readFileSync(studentsPath, 'utf8'));
              }
              const incomingStudents = Array.isArray(req.body.students) ? req.body.students : (req.body.student ? [req.body.student] : []);
              const incomingDeleted = Array.isArray(req.body.deletedStudentIds) ? req.body.deletedStudentIds : [];
              
              const delSet = new Set([...(currentData.deletedStudentIds || []), ...incomingDeleted]);
              const sMap = new Map();
              (currentData.students || []).forEach(s => { if (s && s.id && !delSet.has(s.id)) sMap.set(s.id, s); });
              incomingStudents.forEach(s => { if (s && s.id && !delSet.has(s.id)) sMap.set(s.id, { ...(sMap.get(s.id) || {}), ...s }); });

              const finalStudents = Array.from(sMap.values());
              fs.writeFileSync(studentsPath, JSON.stringify({
                students: finalStudents,
                deletedStudentIds: Array.from(delSet),
                updatedAt: Date.now()
              }, null, 2), 'utf8');
            } catch(e) {
              console.error('Local student-commit save error:', e);
            }
          }

          // Special local persistence for submission-commit
          if (apiName === 'submission-commit' && (req.method === 'POST' || req.method === 'PUT') && req.body) {
            try {
              const subsPath = path.join(PUBLIC_DIR, 'assets', 'data', 'submissions.json');
              let currentData = { quiz_submissions: [], deletedQuizSubIds: [] };
              if (fs.existsSync(subsPath)) {
                currentData = JSON.parse(fs.readFileSync(subsPath, 'utf8'));
              }
              const incomingSubs = Array.isArray(req.body.quiz_submissions) ? req.body.quiz_submissions : (req.body.submission ? [req.body.submission] : []);
              const incomingDeleted = Array.isArray(req.body.deletedQuizSubIds) ? req.body.deletedQuizSubIds : [];
              
              const delSet = new Set([...(currentData.deletedQuizSubIds || []), ...incomingDeleted]);
              const subMap = new Map();
              (currentData.quiz_submissions || []).forEach(s => { if (s && s.id && !delSet.has(s.id)) subMap.set(s.id, s); });
              incomingSubs.forEach(s => { if (s && s.id && !delSet.has(s.id)) subMap.set(s.id, { ...(subMap.get(s.id) || {}), ...s }); });

              const finalSubs = Array.from(subMap.values()).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).slice(0, 500);
              fs.writeFileSync(subsPath, JSON.stringify({
                quiz_submissions: finalSubs,
                deletedQuizSubIds: Array.from(delSet),
                updatedAt: Date.now()
              }, null, 2), 'utf8');
            } catch(e) {
              console.error('Local submission-commit save error:', e);
            }
          }

          // Special local persistence for glossary-commit and glossary
          if ((apiName === 'glossary-commit' || apiName === 'glossary') && (req.method === 'POST' || req.method === 'PUT') && req.body) {
            try {
              const jsonPath = path.join(PUBLIC_DIR, 'assets', 'data', 'glossary-custom.json');
              const incomingGlossary = req.body.custom_glossary || req.body.customGlossary || req.body.glossary || req.body.data || {};
              const incomingDeleted = Array.isArray(req.body.deletedGlossaryTerms) ? req.body.deletedGlossaryTerms : [];
              
              let existing = { custom_glossary: {}, deletedGlossaryTerms: [] };
              if (fs.existsSync(jsonPath)) {
                try { existing = JSON.parse(fs.readFileSync(jsonPath, 'utf8')); } catch(e) {}
              }
              const existingGlossary = existing.custom_glossary || existing.glossary || {};
              const delSet = new Set([...(existing.deletedGlossaryTerms || []), ...incomingDeleted]);
              const cleanGlossary = {};
              
              ['bases', 'defesas', 'socosGolpes', 'chutes', 'comandosEContagem'].forEach(cat => {
                const termMap = new Map();
                (existingGlossary[cat] || []).forEach(t => {
                  if (t && t.japanese) termMap.set(t.japanese.toLowerCase().trim(), t);
                });
                (incomingGlossary[cat] || []).forEach(t => {
                  if (t && t.japanese) {
                    const key = t.japanese.toLowerCase().trim();
                    const ex = termMap.get(key);
                    if (!ex || !ex.updatedAt || (t.updatedAt && t.updatedAt >= ex.updatedAt) || t._edited) {
                      termMap.set(key, t);
                    }
                  }
                });
                cleanGlossary[cat] = Array.from(termMap.values()).filter(t => t && t.japanese && !delSet.has(t.japanese.toLowerCase().trim()));
              });

              const outData = {
                custom_glossary: cleanGlossary,
                deletedGlossaryTerms: Array.from(delSet),
                updatedAt: Date.now()
              };

              const dataDir = path.dirname(jsonPath);
              if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
              fs.writeFileSync(jsonPath, JSON.stringify(outData, null, 2), 'utf8');
            } catch(e) {
              console.error('Local glossary save error:', e);
            }
          }

          const handler = require(apiFile);
          await handler(req, res);
        } catch(err) {
          console.error('API Error:', err);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });
      return;
    }
  }

  // 2. Handle video streaming from D:\Videos Kata SKO
  if (pathname.startsWith('/videos/')) {
    const videoName = pathname.replace('/videos/', '');
    let videoPath = path.join(VIDEO_DIR, videoName);
    
    // Fallback to assets/videos if exists
    if (!fs.existsSync(videoPath)) {
      videoPath = path.join(PUBLIC_DIR, 'assets', 'videos', videoName);
    }

    if (fs.existsSync(videoPath)) {
      const stat = fs.statSync(videoPath);
      const fileSize = stat.size;
      const range = req.headers.range;

      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = (end - start) + 1;
        const fileStream = fs.createReadStream(videoPath, { start, end });

        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize,
          'Content-Type': 'video/mp4'
        });
        fileStream.pipe(res);
        return;
      } else {
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': 'video/mp4',
          'Accept-Ranges': 'bytes'
        });
        fs.createReadStream(videoPath).pipe(res);
        return;
      }
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Vídeo não encontrado.');
      return;
    }
  }

  // 3. Handle Static Files
  if (pathname === '/') {
    pathname = '/index.html';
  }

  const filePath = path.join(PUBLIC_DIR, pathname);

  // Security check: ensure path is within PUBLIC_DIR
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Acesso proibido.');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>404 - Página não encontrada</h1>');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });

    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`🥋 TKST Alunos rodando em: http://localhost:${PORT}`);
});
