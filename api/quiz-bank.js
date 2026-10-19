// api/quiz-bank.js
// Endpoint dedicado e persistente para o Banco de Questões do Simulado TKST.
// Combina a base oficial de questões com as customizações e edições salvas no GitHub (assets/data/quiz-custom.json).

const fs = require('fs');
const path = require('path');
const https = require('https');

const TMP_FILE = path.join('/tmp', 'tkst_quiz_bank.json');
const TMP_CUSTOM_FILE = path.join('/tmp', 'tkst_quiz_custom.json');
const REPO = process.env.GITHUB_REPO || 'albinokira-crypto/tkst-alunos';
const CUSTOM_FILE_PATH = 'assets/data/quiz-custom.json';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const NTFY_TOPIC = process.env.NTFY_TOPIC || 'tkst-alunos-sync-v3';

// Módulo-level cache
let moduleBaseQuestions = null;
let moduleCustomData = null;
let lastFetchTime = 0;

function readBaseQuestions() {
  if (moduleBaseQuestions && moduleBaseQuestions.length > 0) return moduleBaseQuestions;
  try {
    const localJson = path.join(__dirname, '..', 'assets', 'data', 'quiz-questions.json');
    if (fs.existsSync(localJson)) {
      const parsed = JSON.parse(fs.readFileSync(localJson, 'utf8'));
      if (Array.isArray(parsed) && parsed.length > 0) {
        moduleBaseQuestions = parsed;
        return moduleBaseQuestions;
      }
    }
  } catch (e) {}
  return [];
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
        'User-Agent': 'TKST-Alunos-QuizBank/2.0',
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

function fetchRawGitHubJson(filePath) {
  return new Promise((resolve) => {
    const url = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${filePath}?_=${Date.now()}`;
    https.get(url, (res) => {
      if (res.statusCode !== 200) return resolve(null);
      let text = '';
      res.on('data', chunk => text += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(text));
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

async function getCustomDataFromCloud(token) {
  const now = Date.now();
  if (moduleCustomData && (now - lastFetchTime < 15000)) {
    return moduleCustomData;
  }

  // 1. Tenta GitHub API com token
  if (token) {
    try {
      const getRes = await githubRequest('GET', `/repos/${REPO}/contents/${CUSTOM_FILE_PATH}?ref=${BRANCH}`, token, null);
      if (getRes.status === 200 && getRes.data && getRes.data.content) {
        const raw = Buffer.from(getRes.data.content.replace(/\n/g, ''), 'base64').toString('utf8');
        moduleCustomData = JSON.parse(raw);
        lastFetchTime = now;
        return moduleCustomData;
      }
    } catch (e) {}
  }

  // 2. Fallback: Raw GitHub sem auth
  try {
    const rawData = await fetchRawGitHubJson(CUSTOM_FILE_PATH);
    if (rawData && typeof rawData === 'object') {
      moduleCustomData = rawData;
      lastFetchTime = now;
      return moduleCustomData;
    }
  } catch (e) {}

  // 3. Fallback: /tmp
  try {
    if (fs.existsSync(TMP_CUSTOM_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(TMP_CUSTOM_FILE, 'utf8'));
      if (parsed && typeof parsed === 'object') {
        moduleCustomData = parsed;
        return moduleCustomData;
      }
    }
  } catch (e) {}

  // 4. Fallback: arquivo local
  try {
    const localFile = path.resolve(process.cwd(), CUSTOM_FILE_PATH);
    if (fs.existsSync(localFile)) {
      const parsed = JSON.parse(fs.readFileSync(localFile, 'utf8'));
      if (parsed && typeof parsed === 'object') {
        moduleCustomData = parsed;
        return moduleCustomData;
      }
    }
  } catch (e) {}

  return { customQuestions: [], editedQuestions: {}, deletedQuizIds: [] };
}

function mergeAllQuestions(baseQuestions, customData) {
  const deletedSet = new Set(Array.isArray(customData.deletedQuizIds) ? customData.deletedQuizIds : []);
  const editedMap = (customData.editedQuestions && typeof customData.editedQuestions === 'object') ? customData.editedQuestions : {};
  const bankMap = new Map();

  // 1. Base oficial
  (baseQuestions || []).forEach(q => {
    if (q && q.id && !deletedSet.has(q.id)) {
      bankMap.set(q.id, { ...q });
    }
  });

  // 2. Customizadas
  (Array.isArray(customData.customQuestions) ? customData.customQuestions : []).forEach(q => {
    if (q && q.id && !deletedSet.has(q.id)) {
      const existing = bankMap.get(q.id);
      bankMap.set(q.id, existing ? { ...existing, ...q } : q);
    }
  });

  // 3. Edições sobrescrevem com prioridade
  Object.keys(editedMap).forEach(qId => {
    if (deletedSet.has(qId)) return;
    const eq = editedMap[qId];
    if (eq && eq.id && eq.question) {
      const existing = bankMap.get(qId);
      bankMap.set(qId, existing ? { ...existing, ...eq, _edited: true } : { ...eq, _edited: true });
    }
  });

  return Array.from(bankMap.values());
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
        'Title': 'TKST Quiz Sync',
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

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const token = process.env.GITHUB_TOKEN;

  // GET: Retorna o banco completo e mesclado com as atualizações mais recentes
  if (req.method === 'GET') {
    try {
      const base = readBaseQuestions();
      const customData = await getCustomDataFromCloud(token);
      const merged = mergeAllQuestions(base, customData);

      return res.status(200).json({
        success: true,
        data: merged,
        count: merged.length,
        customQuestions: customData.customQuestions || [],
        editedMap: customData.editedQuestions || {},
        deletedQuizIds: customData.deletedQuizIds || [],
        source: 'cloud_merged'
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // POST: Salva / atualiza questões, commita no GitHub e avisa todos os dispositivos via NTFY
  if (req.method === 'POST') {
    try {
      let body = req.body;
      if (typeof body === 'string') body = JSON.parse(body);

      const incoming = body.bank || body.data || body.customQuestions || body.questions || [];
      const incomingDeleted = Array.isArray(body.deletedQuizIds) ? body.deletedQuizIds : [];
      const incomingEdited = (body.editedMap && typeof body.editedMap === 'object') ? body.editedMap : {};

      // Obtém customData atual
      let customData = await getCustomDataFromCloud(token);
      const deletedSet = new Set(Array.isArray(customData.deletedQuizIds) ? customData.deletedQuizIds : []);
      incomingDeleted.forEach(id => deletedSet.add(id));
      const finalDeleted = Array.from(deletedSet);

      const customMap = new Map();
      (Array.isArray(customData.customQuestions) ? customData.customQuestions : []).forEach(q => {
        if (q && q.id && !deletedSet.has(q.id)) customMap.set(q.id, q);
      });

      if (Array.isArray(incoming)) {
        incoming.forEach(q => {
          if (!q || !q.id || deletedSet.has(q.id)) return;
          // Aceita questões criadas ou com flag
          if (q._custom || q._edited || String(q.id).startsWith('q_custom_') || String(q.id).startsWith('q_shotokan_') || String(q.id).startsWith('q_short_')) {
            customMap.set(q.id, q);
          }
        });
      }

      const finalEdited = {
        ...(customData.editedQuestions || {}),
        ...incomingEdited
      };
      finalDeleted.forEach(id => { delete finalEdited[id]; });

      const finalCustomQuestions = Array.from(customMap.values());
      const updatedCustomData = {
        customQuestions: finalCustomQuestions,
        editedQuestions: finalEdited,
        deletedQuizIds: finalDeleted,
        updatedAt: Date.now()
      };

      // Atualiza cache em memória e em /tmp
      moduleCustomData = updatedCustomData;
      lastFetchTime = Date.now();
      try {
        fs.writeFileSync(TMP_CUSTOM_FILE, JSON.stringify(updatedCustomData), 'utf8');
      } catch (e) {}

      // Se token estiver disponível, commita no GitHub
      if (token) {
        try {
          const apiPath = `/repos/${REPO}/contents/${CUSTOM_FILE_PATH}?ref=${BRANCH}`;
          const getRes = await githubRequest('GET', apiPath, token, null);
          let sha = null;
          if (getRes.status === 200 && getRes.data) {
            sha = getRes.data.sha;
          }

          const encoded = Buffer.from(JSON.stringify(updatedCustomData, null, 2), 'utf8').toString('base64');
          const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
          const putBody = {
            message: `feat(quiz): sincronização de ${finalCustomQuestions.length} questões em ${now}`,
            content: encoded,
            branch: BRANCH
          };
          if (sha) putBody.sha = sha;

          await githubRequest('PUT', `/repos/${REPO}/contents/${CUSTOM_FILE_PATH}`, token, putBody);
        } catch (gitErr) {
          console.warn('Quiz bank GitHub commit notice:', gitErr.message);
        }
      }

      // Notifica em tempo real via NTFY
      notifyNtfy({
        type: 'tkst_quiz_chunk',
        action: 'reload',
        count: finalCustomQuestions.length,
        timestamp: Date.now()
      });

      const base = readBaseQuestions();
      const merged = mergeAllQuestions(base, updatedCustomData);

      return res.status(200).json({
        success: true,
        data: merged,
        count: merged.length,
        customCount: finalCustomQuestions.length,
        message: 'Banco de questões salvo e sincronizado online com sucesso!'
      });
    } catch (err) {
      console.error('quiz-bank POST error:', err);
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
