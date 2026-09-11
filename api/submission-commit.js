// api/submission-commit.js
// Endpoint server-side para persistência e commit automático dos simulados realizados pelos alunos no GitHub.
// Garante que todas as provas feitas em qualquer celular ou computador fiquem salvas permanentemente no repositório.

const https = require('https');
const fs = require('fs');
const path = require('path');

const REPO = process.env.GITHUB_REPO || 'albinokira-crypto/tkst-alunos';
const FILE_PATH = 'assets/data/submissions.json';
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
        'User-Agent': 'TKST-Alunos-SubmissionCommit/1.0',
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

  // GET: Retorna os simulados salvos no GitHub
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

    return res.status(200).json({ success: true, data: { quiz_submissions: [], deletedQuizSubIds: [] } });
  }

  // POST: Adiciona novos simulados / exclui simulados e commita no GitHub
  if (req.method === 'POST') {
    try {
      let body = req.body;
      if (typeof body === 'string') body = JSON.parse(body);

      const incomingSubs = Array.isArray(body.quiz_submissions) ? body.quiz_submissions : (body.submission ? [body.submission] : []);
      const incomingDeleted = Array.isArray(body.deletedQuizSubIds) ? body.deletedQuizSubIds : [];

      function sanitizeSubmission(s) {
        if (!s) return null;
        return {
          id: s.id,
          studentId: s.studentId,
          studentName: s.studentName,
          studentUsername: s.studentUsername,
          studentBelt: s.studentBelt,
          studentKyu: s.studentKyu !== undefined ? s.studentKyu : 7,
          beltLevel: s.beltLevel || 'Geral',
          beltKyu: s.beltKyu !== undefined ? s.beltKyu : 7,
          score: typeof s.score === 'number' ? s.score : 0,
          total: typeof s.total === 'number' ? s.total : 10,
          percentage: typeof s.percentage === 'number' ? s.percentage : Math.round(((s.score || 0) / (s.total || 10)) * 100),
          passed: s.passed !== undefined ? !!s.passed : ((s.score || 0) / (s.total || 10) >= 0.7),
          perfect: s.perfect !== undefined ? !!s.perfect : ((s.score || 0) === (s.total || 10)),
          date: s.date || new Date().toISOString()
        };
      }

      function deduplicateQuizSubmissions(list) {
        if (!Array.isArray(list)) return [];
        const sorted = [...list].filter(Boolean).sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime());
        const kept = [];
        for (const item of sorted) {
          const itemTime = new Date(item.date || 0).getTime();
          const itemStudentId = (item.studentId || '').toString().trim().toLowerCase();
          const itemStudentUser = (item.studentUsername || '').toString().trim().toLowerCase();
          const itemBelt = (item.beltLevel || item.beltKyu || '').toString().trim();
          const itemScore = Number(item.score);
          const itemTotal = Number(item.total);

          let matchIdx = -1;
          for (let i = 0; i < kept.length; i++) {
            const k = kept[i];
            const kTime = new Date(k.date || 0).getTime();
            const kStudentId = (k.studentId || '').toString().trim().toLowerCase();
            const kStudentUser = (k.studentUsername || '').toString().trim().toLowerCase();
            const kBelt = (k.beltLevel || k.beltKyu || '').toString().trim();
            const sameStd = (itemStudentId && (itemStudentId === kStudentId || itemStudentId === kStudentUser)) ||
                            (itemStudentUser && (itemStudentUser === kStudentId || itemStudentUser === kStudentUser));
            if (sameStd && kBelt === itemBelt && Number(k.score) === itemScore && Number(k.total) === itemTotal && Math.abs(itemTime - kTime) <= 60000) {
              matchIdx = i;
              break;
            }
          }
          if (matchIdx === -1) {
            kept.push(item);
          } else {
            const existing = kept[matchIdx];
            const itemHasDetails = Array.isArray(item.details) && item.details.length > 0;
            const existingHasDetails = Array.isArray(existing.details) && existing.details.length > 0;
            const itemIsOrig = !item.id?.startsWith('quiz_rec_') && !item.id?.startsWith('quiz_std_');
            const existingIsOrig = !existing.id?.startsWith('quiz_rec_') && !existing.id?.startsWith('quiz_std_');
            if ((!existingHasDetails && itemHasDetails) || (!existingIsOrig && itemIsOrig)) {
              kept[matchIdx] = item;
            }
          }
        }
        return kept.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      }

      if (!token) {
        try {
          const localPath = path.resolve(process.cwd(), FILE_PATH);
          let currentData = { quiz_submissions: [], deletedQuizSubIds: [] };
          if (fs.existsSync(localPath)) {
            currentData = JSON.parse(fs.readFileSync(localPath, 'utf8'));
          }
          const delSet = new Set([...(currentData.deletedQuizSubIds || []), ...incomingDeleted]);
          const subMap = new Map();
          (currentData.quiz_submissions || []).forEach(s => {
            const clean = sanitizeSubmission(s);
            if (clean && clean.id && !delSet.has(clean.id)) subMap.set(clean.id, clean);
          });
          incomingSubs.forEach(s => {
            const clean = sanitizeSubmission(s);
            if (clean && clean.id && !delSet.has(clean.id)) subMap.set(clean.id, { ...(subMap.get(clean.id) || {}), ...clean });
          });
          const finalSubs = deduplicateQuizSubmissions(Array.from(subMap.values())).slice(0, 500);
          const newJson = { quiz_submissions: finalSubs, deletedQuizSubIds: Array.from(delSet), updatedAt: Date.now() };
          try { fs.writeFileSync(localPath, JSON.stringify(newJson, null, 2), 'utf8'); } catch(e) {}
          return res.status(200).json({ success: true, committed: finalSubs.length, data: newJson });
        } catch(e) {}
        return res.status(200).json({
          success: true,
          data: { quiz_submissions: incomingSubs.map(sanitizeSubmission).filter(Boolean), deletedQuizSubIds: incomingDeleted }
        });
      }

      // 1. Busca o arquivo atual e seu SHA no GitHub
      const apiPath = `/repos/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`;
      const getResult = await githubRequestWithRetry('GET', apiPath, token, null);

      let currentData = { quiz_submissions: [], deletedQuizSubIds: [] };
      let sha = null;

      if (getResult.status === 200 && getResult.data) {
        sha = getResult.data.sha;
        try {
          const raw = Buffer.from(getResult.data.content.replace(/\n/g, ''), 'base64').toString('utf8');
          currentData = JSON.parse(raw);
        } catch (e) {}
      }

      // 2. Mescla deleted IDs
      const deletedSet = new Set(currentData.deletedQuizSubIds || []);
      incomingDeleted.forEach(id => deletedSet.add(id));
      const finalDeleted = Array.from(deletedSet);

      // 3. Mescla simulados por ID preservando todos os envios
      (currentData.quiz_submissions || []).forEach(s => {
        const clean = sanitizeSubmission(s);
        if (clean && clean.id && !deletedSet.has(clean.id)) {
          subMap.set(clean.id, clean);
        }
      });

      incomingSubs.forEach(s => {
        const clean = sanitizeSubmission(s);
        if (!clean || !clean.id || deletedSet.has(clean.id)) return;
        const existing = subMap.get(clean.id);
        if (!existing) {
          subMap.set(clean.id, clean);
        } else {
          subMap.set(clean.id, { ...existing, ...clean });
        }
      });

      const finalSubs = deduplicateQuizSubmissions(Array.from(subMap.values())).slice(0, 500);

      const newJson = {
        quiz_submissions: finalSubs,
        deletedQuizSubIds: finalDeleted,
        updatedAt: Date.now()
      };

      const updatedContent = JSON.stringify(newJson, null, 2);
      const encodedContent = Buffer.from(updatedContent, 'utf8').toString('base64');
      const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

      // 4. Commit via GitHub API
      const putBody = {
        message: `feat(quiz-submissions): ${finalSubs.length} simulado(s) sincronizados em ${now}`,
        content: encodedContent,
        branch: BRANCH
      };
      if (sha) putBody.sha = sha;

      const putResult = await githubRequestWithRetry('PUT', `/repos/${REPO}/contents/${FILE_PATH}`, token, putBody);

      if (putResult.status === 200 || putResult.status === 201) {
        return res.status(200).json({
          success: true,
          committed: finalSubs.length,
          data: newJson,
          commitUrl: putResult.data?.commit?.html_url || null,
          message: 'Simulados commitados com sucesso no GitHub.'
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
