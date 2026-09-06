// api/glossary-commit.js
// Endpoint server-side para persistência e commit automático do dicionário japonês no GitHub.
// O GITHUB_TOKEN fica seguro como variável de ambiente na Vercel — jamais exposto ao browser.

const https = require('https');
const fs = require('fs');
const path = require('path');

const REPO = process.env.GITHUB_REPO || 'albinokira-crypto/tkst-alunos';
const FILE_PATH = 'assets/data/glossary-custom.json';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const TMP_FILE = path.join('/tmp', 'tkst_glossary.json');

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
        'User-Agent': 'TKST-Alunos-GlossaryCommit/2.0',
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

// Executa requisição ao GitHub com retries automáticos em caso de 503/timeout
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

function getLocalFileFallback() {
  try {
    const localPath = path.resolve(process.cwd(), FILE_PATH);
    if (fs.existsSync(localPath)) {
      const content = fs.readFileSync(localPath, 'utf8');
      return JSON.parse(content);
    }
  } catch (e) {}
  return null;
}

function saveLocalFallback(data) {
  try {
    const localPath = path.resolve(process.cwd(), FILE_PATH);
    const dir = path.dirname(localPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(localPath, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {}
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

  // GET: Retorna o glossário customizado
  if (req.method === 'GET') {
    if (!token) {
      const localData = getLocalFileFallback() || {};
      return res.status(200).json({
        success: true,
        source: 'local_fallback',
        data: localData.custom_glossary || localData.glossary || {},
        deletedGlossaryTerms: localData.deletedGlossaryTerms || []
      });
    }

    try {
      const getRes = await githubRequestWithRetry('GET', `/repos/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`, token, null);
      if (getRes.status === 200 && getRes.data && getRes.data.content) {
        const raw = Buffer.from(getRes.data.content, 'base64').toString('utf8');
        const parsed = JSON.parse(raw);
        return res.status(200).json({
          success: true,
          source: 'github',
          sha: getRes.data.sha,
          data: parsed.custom_glossary || parsed.glossary || {},
          deletedGlossaryTerms: parsed.deletedGlossaryTerms || []
        });
      } else {
        const localData = getLocalFileFallback() || {};
        return res.status(200).json({
          success: true,
          source: 'local_fallback_on_miss',
          data: localData.custom_glossary || localData.glossary || {},
          deletedGlossaryTerms: localData.deletedGlossaryTerms || []
        });
      }
    } catch (err) {
      const localData = getLocalFileFallback() || {};
      return res.status(200).json({
        success: true,
        source: 'local_fallback_on_error',
        data: localData.custom_glossary || localData.glossary || {},
        deletedGlossaryTerms: localData.deletedGlossaryTerms || []
      });
    }
  }

  // POST: Atualiza e commita o glossário no GitHub
  if (req.method === 'POST') {
    try {
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch(e) {}
      }

      const incomingGlossary = body.custom_glossary || body.customGlossary || body.glossary || body.data || {};
      const incomingDeleted = Array.isArray(body.deletedGlossaryTerms) ? body.deletedGlossaryTerms : [];

      // 1. Busca dados existentes para mesclagem não-destrutiva
      let existingData = getLocalFileFallback() || { custom_glossary: {}, deletedGlossaryTerms: [] };
      let sha = null;

      if (token) {
        try {
          const getRes = await githubRequestWithRetry('GET', `/repos/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`, token, null);
          if (getRes.status === 200 && getRes.data && getRes.data.content) {
            sha = getRes.data.sha;
            const currentContent = Buffer.from(getRes.data.content.replace(/\n/g, ''), 'base64').toString('utf8');
            existingData = JSON.parse(currentContent);
          }
        } catch (e) {}
      }

      const existingGlossary = existingData.custom_glossary || existingData.glossary || {};
      const existingDeleted = existingData.deletedGlossaryTerms || [];

      // Unifica deleted terms
      const deletedSet = new Set([...existingDeleted, ...incomingDeleted]);
      const finalDeleted = Array.from(deletedSet);

      const categories = ['bases', 'defesas', 'socosGolpes', 'chutes', 'comandosEContagem'];
      const mergedGlossary = {};

      categories.forEach(cat => {
        const termMap = new Map();

        // Preserva termos já existentes
        (existingGlossary[cat] || []).forEach(t => {
          if (t && t.japanese) termMap.set(t.japanese.toLowerCase().trim(), t);
        });

        // Adiciona/atualiza novos termos
        (incomingGlossary[cat] || []).forEach(t => {
          if (t && t.japanese) {
            const key = t.japanese.toLowerCase().trim();
            const existing = termMap.get(key);
            if (!existing || !existing.updatedAt || (t.updatedAt && t.updatedAt >= existing.updatedAt) || t._edited) {
              termMap.set(key, t);
            }
          }
        });

        mergedGlossary[cat] = Array.from(termMap.values()).filter(t => t && t.japanese && !deletedSet.has(t.japanese.toLowerCase().trim()));
      });

      const newJson = {
        custom_glossary: mergedGlossary,
        deletedGlossaryTerms: finalDeleted,
        updatedAt: Date.now()
      };

      // Salva localmente em assets/data/glossary-custom.json e /tmp
      saveLocalFallback(newJson);
      try {
        fs.writeFileSync(TMP_FILE, JSON.stringify(newJson), 'utf8');
      } catch (e) {}

      if (!token) {
        return res.status(200).json({
          success: true,
          data: mergedGlossary,
          deletedGlossaryTerms: finalDeleted,
          message: 'Alterações salvas localmente no dispositivo e servidor.'
        });
      }

      // 2. Commit no GitHub via Contents API
      const updatedContent = JSON.stringify(newJson, null, 2);
      const encodedContent = Buffer.from(updatedContent, 'utf8').toString('base64');
      const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

      const putBody = {
        message: `feat(glossary): dicionário japonês atualizado pelo Sensei em ${now}`,
        content: encodedContent,
        branch: BRANCH
      };
      if (sha) putBody.sha = sha;

      const putResult = await githubRequestWithRetry('PUT', `/repos/${REPO}/contents/${FILE_PATH}`, token, putBody);

      if (putResult.status === 200 || putResult.status === 201) {
        return res.status(200).json({
          success: true,
          data: mergedGlossary,
          deletedGlossaryTerms: finalDeleted,
          commitUrl: putResult.data.commit?.html_url || null,
          message: 'Dicionário salvo com sucesso na nuvem permanente do GitHub!'
        });
      } else {
        return res.status(200).json({
          success: true,
          data: mergedGlossary,
          deletedGlossaryTerms: finalDeleted,
          warning: `Salvo localmente. GitHub PUT status: ${putResult.status}`,
          detail: putResult.data
        });
      }
    } catch (err) {
      console.error('glossary-commit error:', err);
      return res.status(200).json({
        success: false,
        reason: err.message
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
