// api/exam-commit.js
// Endpoint server-side para persistência e commit automático no GitHub das provas geradas e nominais dos alunos.
// Garante que todas as provas geradas e impressas no PC sejam reconhecidas por smartphones e outros dispositivos,
// sem necessidade de reimpressão.

const https = require('https');
const fs = require('fs');
const path = require('path');

const REPO = process.env.GITHUB_REPO || 'albinokira-crypto/tkst-alunos';
const FILE_PATH = 'assets/data/generated-exams.json';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const NTFY_TOPIC = process.env.NTFY_TOPIC || 'tkst_karate_sync_v3_live';
const TMP_EXAMS_FILE = path.join('/tmp', 'tkst_generated_exams.json');

function notifyNtfy(data) {
  try {
    const postData = typeof data === 'string' ? data : JSON.stringify(data);
    const options = {
      hostname: 'ntfy.sh',
      path: '/' + encodeURIComponent(NTFY_TOPIC),
      method: 'POST',
      headers: {
        'Title': 'TKST_EXAM_COMMITTED',
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    const req = https.request(options, () => {});
    req.on('error', () => {});
    req.write(postData);
    req.end();
  } catch (e) {}
}

function githubRequest(method, reqPath, token, body) {
  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : null;
    const dataBuffer = dataString ? Buffer.from(dataString, 'utf8') : null;

    const options = {
      hostname: 'api.github.com',
      path: reqPath,
      method,
      headers: {
        'Authorization': token ? `token ${token}` : undefined,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'TKST-Alunos-ExamCommit/1.0',
        'Content-Type': 'application/json; charset=utf-8',
        ...(dataBuffer ? { 'Content-Length': dataBuffer.length } : {})
      }
    };

    if (!token) delete options.headers['Authorization'];

    const req = https.request(options, (res) => {
      let responseText = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { responseText += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(responseText) });
        } catch {
          resolve({ status: res.statusCode, data: responseText });
        }
      });
    });

    req.on('error', reject);
    if (dataBuffer) {
      req.end(dataBuffer);
    } else {
      req.end();
    }
  });
}

async function githubRequestWithRetry(method, reqPath, token, body, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await githubRequest(method, reqPath, token, body);
      if (res.status === 200 || res.status === 201 || (attempt === retries && res.status < 500)) {
        return res;
      }
      if (res.status >= 500 && attempt < retries) {
        await new Promise(r => setTimeout(r, attempt * 1000));
        continue;
      }
      return res;
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, attempt * 1000));
    }
  }
}

function sanitizeExamRecord(rec) {
  if (!rec || typeof rec !== 'object') return null;
  const examId = String(rec.examId || rec.baseExamId || '').trim().toUpperCase();
  if (!examId) return null;
  const baseCode = examId.replace(/^#/, '').split('-')[0].replace(/[^0-9A-Z]/g, '').slice(0, 5);
  return {
    examId: examId,
    baseExamId: baseCode || examId,
    kyu: (rec.kyu !== undefined && rec.kyu !== null) ? Number(rec.kyu) : 6,
    answers: Array.isArray(rec.answers) ? rec.answers.slice(0, 10).map(a => String(a).toUpperCase()) : [],
    studentName: rec.studentName ? String(rec.studentName).trim() : '',
    studentAbbr: rec.studentAbbr ? String(rec.studentAbbr).trim() : (rec.studentName ? String(rec.studentName).trim() : ''),
    studentId: rec.studentId ? String(rec.studentId).trim() : '',
    dojoName: rec.dojoName ? String(rec.dojoName).trim() : 'TKST',
    date: rec.date ? String(rec.date).trim() : '13/12/2026',
    timestamp: typeof rec.timestamp === 'number' ? rec.timestamp : Date.now()
  };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const token = process.env.GITHUB_TOKEN;

  // GET: Retorna todas as provas geradas salvas no GitHub (ou fallback local)
  if (req.method === 'GET') {
    try {
      if (token) {
        const getResult = await githubRequestWithRetry('GET', `/repos/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`, token, null);
        if (getResult.status === 200 && getResult.data && getResult.data.content) {
          const content = Buffer.from(getResult.data.content.replace(/\n/g, ''), 'base64').toString('utf8');
          const parsed = JSON.parse(content);
          return res.status(200).json({ success: true, data: parsed });
        }
      }
    } catch (e) { }

    // Fallback: lê arquivo local empacotado ou tmp
    try {
      const localPath = path.resolve(process.cwd(), FILE_PATH);
      if (fs.existsSync(localPath)) {
        const parsed = JSON.parse(fs.readFileSync(localPath, 'utf8'));
        return res.status(200).json({ success: true, data: parsed });
      }
      if (fs.existsSync(TMP_EXAMS_FILE)) {
        const parsed = JSON.parse(fs.readFileSync(TMP_EXAMS_FILE, 'utf8'));
        return res.status(200).json({ success: true, data: parsed });
      }
    } catch (e) { }

    return res.status(200).json({ success: true, data: {} });
  }

  // POST: Mescla novas provas geradas e commita no GitHub
  if (req.method === 'POST') {
    try {
      let body = req.body;
      if (typeof body === 'string') body = JSON.parse(body);

      const incomingMap = body.exams || (body.exam ? { [body.exam.examId || body.exam.baseExamId]: body.exam } : (body.generated_exams || {}));
      if (!incomingMap || typeof incomingMap !== 'object') {
        return res.status(400).json({ success: false, error: 'Formato inválido. Envie { exams: { ... } } ou { exam: { ... } }' });
      }

      // 1. Carrega dados atuais do GitHub ou local
      let currentData = {};
      let sha = null;

      if (token) {
        try {
          const apiPath = `/repos/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`;
          const getResult = await githubRequestWithRetry('GET', apiPath, token, null);
          if (getResult.status === 200 && getResult.data) {
            sha = getResult.data.sha;
            if (getResult.data.content) {
              const raw = Buffer.from(getResult.data.content.replace(/\n/g, ''), 'base64').toString('utf8');
              currentData = JSON.parse(raw);
            }
          }
        } catch (e) { }
      }

      if (Object.keys(currentData).length === 0) {
        try {
          const localPath = path.resolve(process.cwd(), FILE_PATH);
          if (fs.existsSync(localPath)) {
            currentData = JSON.parse(fs.readFileSync(localPath, 'utf8'));
          } else if (fs.existsSync(TMP_EXAMS_FILE)) {
            currentData = JSON.parse(fs.readFileSync(TMP_EXAMS_FILE, 'utf8'));
          }
        } catch (e) { }
      }

      // 2. Mescla registros: preserva e enriquece com studentName
      let updatedCount = 0;
      Object.keys(incomingMap).forEach(key => {
        const rawItem = incomingMap[key];
        const clean = sanitizeExamRecord(rawItem);
        if (!clean) return;

        const baseKey = clean.baseExamId || clean.examId;
        const fullKey = clean.examId;

        // Verifica se já existe
        const existing = currentData[baseKey] || currentData[fullKey];
        if (!existing) {
          currentData[baseKey] = clean;
          if (fullKey && fullKey !== baseKey) currentData[fullKey] = clean;
          updatedCount++;
        } else {
          // Se o existente não tinha nome e o novo tem, ou o novo tem mais dados
          const existingName = existing.studentName || existing.studentAbbr;
          const newName = clean.studentName || clean.studentAbbr;
          if (!existingName && newName) {
            currentData[baseKey] = { ...existing, ...clean };
            if (fullKey && fullKey !== baseKey) currentData[fullKey] = currentData[baseKey];
            updatedCount++;
          } else {
            currentData[baseKey] = { ...existing, ...clean };
            if (fullKey && fullKey !== baseKey) currentData[fullKey] = currentData[baseKey];
          }
        }
      });

      // Grava em /tmp para sincronização local rápida
      try {
        fs.writeFileSync(TMP_EXAMS_FILE, JSON.stringify(currentData), 'utf8');
      } catch (e) { }

      // Se não tiver token do GitHub (dev local), salva em disco se possível
      if (!token) {
        try {
          const localPath = path.resolve(process.cwd(), FILE_PATH);
          fs.writeFileSync(localPath, JSON.stringify(currentData, null, 2), 'utf8');
        } catch (e) { }
        notifyNtfy({ type: 'exam_committed', count: Object.keys(currentData).length, timestamp: Date.now() });
        return res.status(200).json({ success: true, count: Object.keys(currentData).length, data: currentData });
      }

      // 3. Commit no repositório GitHub via API
      const updatedContent = JSON.stringify(currentData, null, 2);
      const encodedContent = Buffer.from(updatedContent, 'utf8').toString('base64');
      const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

      const putBody = {
        message: `feat(exams): persistência de ${Object.keys(currentData).length} provas geradas em ${now}`,
        content: encodedContent,
        branch: BRANCH
      };
      if (sha) putBody.sha = sha;

      const putResult = await githubRequestWithRetry('PUT', `/repos/${REPO}/contents/${FILE_PATH}`, token, putBody);

      if (putResult.status === 200 || putResult.status === 201) {
        notifyNtfy({ type: 'exam_committed', count: Object.keys(currentData).length, timestamp: Date.now() });
        return res.status(200).json({
          success: true,
          count: Object.keys(currentData).length,
          data: currentData,
          commitUrl: putResult.data?.commit?.html_url || null,
          message: 'Provas nominais commitadas com sucesso no GitHub.'
        });
      } else {
        return res.status(200).json({
          success: false,
          reason: `GitHub PUT retornou status ${putResult.status}`,
          detail: putResult.data,
          data: currentData
        });
      }
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: err.message
      });
    }
  }

  return res.status(405).json({ error: 'Método não permitido' });
};
