// api/quiz-commit.js
// Endpoint server-side para commit automático do banco de questões online no GitHub.
// O GITHUB_TOKEN fica seguro como variável de ambiente na Vercel — jamais exposto ao browser.

const https = require('https');
const fs = require('fs');
const path = require('path');

const REPO = process.env.GITHUB_REPO || 'albinokira-crypto/tkst-alunos';
const FILE_PATH = 'assets/data/quiz-custom.json';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const NTFY_TOPIC = process.env.NTFY_TOPIC || 'tkst-alunos-sync-v3';

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
        'User-Agent': 'TKST-Alunos-QuizCommit/2.0',
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

function notifyNtfy(payload) {
  try {
    const data = JSON.stringify(payload);
    const req = https.request({
      hostname: 'ntfy.sh',
      path: `/${NTFY_TOPIC}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'Title': 'TKST Quiz Bank Sync',
        'Priority': 'urgent'
      }
    }, () => {});
    req.on('error', () => {});
    req.write(data);
    req.end();
  } catch (e) {}
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-tkst-admin');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const token = process.env.GITHUB_TOKEN;

  // GET: Retorna o banco de questões customizadas do GitHub
  if (req.method === 'GET') {
    try {
      if (token) {
        const getResult = await githubRequestWithRetry('GET', `/repos/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`, token, null);
        if (getResult.status === 200 && getResult.data && getResult.data.content) {
          const raw = Buffer.from(getResult.data.content.replace(/\n/g, ''), 'base64').toString('utf8');
          return res.status(200).json({ success: true, data: JSON.parse(raw) });
        }
      }
    } catch (e) {}

    // Fallback: lê arquivo local
    try {
      const localPath = path.resolve(process.cwd(), FILE_PATH);
      if (fs.existsSync(localPath)) {
        const raw = fs.readFileSync(localPath, 'utf8');
        return res.status(200).json({ success: true, data: JSON.parse(raw) });
      }
    } catch (e) {}

    return res.status(200).json({
      success: true,
      data: { customQuestions: [], editedQuestions: {}, deletedQuizIds: [] }
    });
  }

  if (req.method === 'POST') {
    if (!token) {
      return res.status(200).json({
        success: false,
        reason: 'GITHUB_TOKEN não configurado. As questões continuam salvas no dispositivo local e cache.'
      });
    }

    try {
      let body = req.body;
      if (typeof body === 'string') body = JSON.parse(body);

      const incomingQuestions = body.customQuestions || body.questions || body.bank || body.data || [];
      const incomingDeleted = Array.isArray(body.deletedQuizIds) ? body.deletedQuizIds : [];
      const incomingEdited = (body.editedMap && typeof body.editedMap === 'object') ? body.editedMap : {};

      // 1. Busca arquivo atual no GitHub e seu SHA
      const apiPath = `/repos/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`;
      const getResult = await githubRequestWithRetry('GET', apiPath, token, null);

      let currentData = { customQuestions: [], editedQuestions: {}, deletedQuizIds: [] };
      let sha = null;

      if (getResult.status === 200 && getResult.data) {
        sha = getResult.data.sha;
        try {
          const raw = Buffer.from(getResult.data.content.replace(/\n/g, ''), 'base64').toString('utf8');
          currentData = JSON.parse(raw);
        } catch (e) {}
      }

      // 2. Mescla deletedQuizIds
      const deletedSet = new Set(Array.isArray(currentData.deletedQuizIds) ? currentData.deletedQuizIds : []);
      incomingDeleted.forEach(id => deletedSet.add(id));
      const finalDeleted = Array.from(deletedSet);

      // 3. Mescla customQuestions por ID
      const questionMap = new Map();
      (Array.isArray(currentData.customQuestions) ? currentData.customQuestions : []).forEach(q => {
        if (q && q.id && !deletedSet.has(q.id)) {
          questionMap.set(q.id, q);
        }
      });

      if (Array.isArray(incomingQuestions)) {
        incomingQuestions.forEach(q => {
          if (!q || !q.id || deletedSet.has(q.id)) return;
          // Aceita questões customizadas ou com flag de edição
          const existing = questionMap.get(q.id);
          if (!existing) {
            questionMap.set(q.id, q);
          } else {
            questionMap.set(q.id, { ...existing, ...q });
          }
        });
      }

      // 4. Mescla editedQuestions
      const finalEdited = {
        ...(currentData.editedQuestions || {}),
        ...incomingEdited
      };
      // Remove do mapa de edições itens que foram excluídos
      finalDeleted.forEach(id => { delete finalEdited[id]; });

      const finalCustomQuestions = Array.from(questionMap.values());
      const newJson = {
        customQuestions: finalCustomQuestions,
        editedQuestions: finalEdited,
        deletedQuizIds: finalDeleted,
        updatedAt: Date.now()
      };

      const updatedContent = JSON.stringify(newJson, null, 2);
      const encodedContent = Buffer.from(updatedContent, 'utf8').toString('base64');
      const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

      // 5. Commit via GitHub API
      const putBody = {
        message: `feat(quiz): ${finalCustomQuestions.length} questão(ões) sincronizadas na nuvem em ${now}`,
        content: encodedContent,
        branch: BRANCH
      };
      if (sha) putBody.sha = sha;

      const putResult = await githubRequestWithRetry('PUT', `/repos/${REPO}/contents/${FILE_PATH}`, token, putBody);

      if (putResult.status === 200 || putResult.status === 201) {
        // Dispara notificação imediata via NTFY para que celular e PC sincronizem na hora
        notifyNtfy({
          type: 'tkst_quiz_chunk',
          action: 'reload',
          count: finalCustomQuestions.length,
          timestamp: Date.now()
        });

        return res.status(200).json({
          success: true,
          committed: finalCustomQuestions.length,
          commitUrl: putResult.data?.commit?.html_url || null,
          message: `${finalCustomQuestions.length} questão(ões) sincronizadas com sucesso no banco de dados online!`
        });
      } else {
        return res.status(200).json({
          success: false,
          reason: `GitHub PUT retornou status ${putResult.status}`,
          detail: putResult.data
        });
      }
    } catch (err) {
      console.error('quiz-commit error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
