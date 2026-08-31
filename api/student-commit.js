// api/student-commit.js
// Endpoint server-side para commit automático e persistência permanente da base de alunos no GitHub.
// O GITHUB_TOKEN fica seguro como variável de ambiente na Vercel — jamais exposto ao browser.

const https = require('https');
const fs = require('fs');
const path = require('path');

const REPO = process.env.GITHUB_REPO || 'albinokira-crypto/tkst-alunos';
const FILE_PATH = 'assets/data/students.json';
const BRANCH = process.env.GITHUB_BRANCH || 'main';

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
        'User-Agent': 'TKST-Alunos-StudentCommit/1.0',
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

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const token = process.env.GITHUB_TOKEN;

  // GET: Retorna os alunos salvos no GitHub
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
    } catch (e) {}

    // Fallback: lê arquivo local empacotado
    try {
      const localPath = path.resolve(process.cwd(), FILE_PATH);
      if (fs.existsSync(localPath)) {
        const parsed = JSON.parse(fs.readFileSync(localPath, 'utf8'));
        return res.status(200).json({ success: true, data: parsed });
      }
    } catch (e) {}

    return res.status(200).json({ success: true, data: { students: [], deletedStudentIds: [] } });
  }

  // POST: Adiciona/atualiza alunos e commita no GitHub
  if (req.method === 'POST') {
    try {
      let body = req.body;
      if (typeof body === 'string') body = JSON.parse(body);

      const incomingStudents = Array.isArray(body.students) ? body.students : (body.student ? [body.student] : []);
      const incomingDeleted = Array.isArray(body.deletedStudentIds) ? body.deletedStudentIds : [];

      if (!token) {
        return res.status(200).json({
          success: false,
          reason: 'GITHUB_TOKEN não configurado nas variáveis de ambiente da Vercel.'
        });
      }

      // 1. Busca o arquivo atual e seu SHA
      const apiPath = `/repos/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`;
      const getResult = await githubRequestWithRetry('GET', apiPath, token, null);

      let currentData = { students: [], deletedStudentIds: [] };
      let sha = null;

      if (getResult.status === 200 && getResult.data) {
        sha = getResult.data.sha;
        try {
          const raw = Buffer.from(getResult.data.content.replace(/\n/g, ''), 'base64').toString('utf8');
          currentData = JSON.parse(raw);
        } catch (e) {}
      }

      // 2. Mescla deleted IDs
      const deletedSet = new Set(currentData.deletedStudentIds || []);
      incomingDeleted.forEach(id => deletedSet.add(id));
      const finalDeleted = Array.from(deletedSet);

      // 3. Mescla alunos de forma inteligente (preserva cadastros pendentes e status recentes)
      const studentMap = new Map();
      (currentData.students || []).forEach(s => {
        if (s && s.id && !deletedSet.has(s.id)) {
          studentMap.set(s.id, s);
        }
      });

      incomingStudents.forEach(s => {
        if (!s || !s.id || deletedSet.has(s.id)) return;
        const studentObj = { ...s };
        if (studentObj.status === 'pending') {
          studentObj.status = 'approved';
          studentObj.approvedAt = studentObj.approvedAt || new Date().toISOString();
        }
        const existing = studentMap.get(s.id);
        if (!existing) {
          studentMap.set(s.id, studentObj);
        } else {
          const merged = { ...existing, ...studentObj };
          const exStatusTime = existing.statusUpdatedAt || 0;
          const inStatusTime = studentObj.statusUpdatedAt || 0;
          if (exStatusTime > inStatusTime && existing.status !== 'pending') {
            merged.status = existing.status;
            merged.statusUpdatedAt = exStatusTime;
          } else {
            merged.status = studentObj.status || 'approved';
          }
          studentMap.set(s.id, merged);
        }
      });

      // Garante que o Master Admin irons365 sempre exista
      if (!Array.from(studentMap.values()).some(s => s.username === 'irons365')) {
        studentMap.set('admin_irons365', {
          id: 'admin_irons365',
          username: 'irons365',
          email: 'irons365@tkst.com.br',
          name: 'Sensei Diego',
          role: 'admin',
          currentBelt: 'Faixa Preta',
          targetBelt: 'Faixa Preta',
          currentKyu: 0,
          dojo: 'TKST Central & Diretoria Geral',
          status: 'approved',
          approvedAt: '2026-01-01T00:00:00.000Z',
          createdAt: '2026-01-01T00:00:00.000Z',
          phone: '',
          updatedAt: 1
        });
      }

      const finalStudents = Array.from(studentMap.values());
      const newJson = {
        students: finalStudents,
        deletedStudentIds: finalDeleted,
        updatedAt: Date.now()
      };

      const updatedContent = JSON.stringify(newJson, null, 2);
      const encodedContent = Buffer.from(updatedContent, 'utf8').toString('base64');
      const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

      // 4. Commit via GitHub API
      const putBody = {
        message: `feat(students): ${finalStudents.length} aluno(s) sincronizados em ${now}`,
        content: encodedContent,
        branch: BRANCH
      };
      if (sha) putBody.sha = sha;

      const putResult = await githubRequestWithRetry('PUT', `/repos/${REPO}/contents/${FILE_PATH}`, token, putBody);

      if (putResult.status === 200 || putResult.status === 201) {
        return res.status(200).json({
          success: true,
          committed: finalStudents.length,
          commitUrl: putResult.data?.commit?.html_url || null,
          message: 'Base de alunos commitada com sucesso no GitHub.'
        });
      } else {
        return res.status(200).json({
          success: false,
          reason: `GitHub PUT retornou status ${putResult.status}`,
          detail: putResult.data
        });
      }
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: err.message
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
