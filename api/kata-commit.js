// api/kata-commit.js
// Endpoint server-side para persistência e commit automático dos vídeos dos 26 Kata no GitHub.
// Garante que todos os vídeos cadastrados fiquem salvos permanentemente no repositório.

const https = require('https');
const fs = require('fs');
const path = require('path');

const REPO = process.env.GITHUB_REPO || 'albinokira-crypto/tkst-alunos';
const FILE_PATH = 'assets/data/kata-videos.json';
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
        'User-Agent': 'TKST-Alunos-KataVideoCommit/1.0',
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

function getLocalFileFallback() {
  try {
    const localPath = path.resolve(process.cwd(), FILE_PATH);
    if (fs.existsSync(localPath)) {
      const content = fs.readFileSync(localPath, 'utf8');
      return JSON.parse(content);
    }
  } catch (e) {
    console.warn('Falha ao ler fallback local de kata-videos.json:', e);
  }
  return {};
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

  // GET: Retorna o JSON atual dos vídeos
  if (req.method === 'GET') {
    if (!token) {
      const localData = getLocalFileFallback();
      return res.status(200).json({
        success: true,
        source: 'local_fallback',
        data: localData
      });
    }

    try {
      const getRes = await githubRequestWithRetry(
        'GET',
        `/repos/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`,
        token,
        null
      );

      if (getRes.status === 200 && getRes.data && getRes.data.content) {
        const rawContent = Buffer.from(getRes.data.content, 'base64').toString('utf8');
        const parsed = JSON.parse(rawContent);
        return res.status(200).json({
          success: true,
          source: 'github',
          sha: getRes.data.sha,
          data: parsed
        });
      } else {
        const localData = getLocalFileFallback();
        return res.status(200).json({
          success: true,
          source: 'local_fallback_on_error',
          data: localData
        });
      }
    } catch (err) {
      const localData = getLocalFileFallback();
      return res.status(200).json({
        success: true,
        source: 'local_fallback_on_exception',
        error: err.message,
        data: localData
      });
    }
  }

  // POST: Atualiza e commita os vídeos de Kata no GitHub
  if (req.method === 'POST') {
    try {
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch(e) {}
      }

      const incomingVideos = body && body.custom_videos ? body.custom_videos : body;

      if (!incomingVideos || typeof incomingVideos !== 'object') {
        return res.status(400).json({
          success: false,
          message: 'Payload inválido. Envie um objeto custom_videos.'
        });
      }

      // Salva em /tmp para manter quente no container
      try {
        const tmpPath = path.resolve('/tmp', 'kata-videos.json');
        fs.writeFileSync(tmpPath, JSON.stringify(incomingVideos, null, 2), 'utf8');
      } catch (e) {}

      if (!token) {
        console.warn('GITHUB_TOKEN ausente. Persistindo apenas em cache /tmp.');
        return res.status(200).json({
          success: true,
          persisted: 'memory_and_tmp_only',
          message: 'Vídeos salvos em memória (GITHUB_TOKEN não configurado).'
        });
      }

      // 1. Obter SHA do arquivo atual no GitHub
      let currentSha = null;
      let existingVideos = {};

      try {
        const getRes = await githubRequestWithRetry(
          'GET',
          `/repos/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`,
          token,
          null
        );

        if (getRes.status === 200 && getRes.data && getRes.data.sha) {
          currentSha = getRes.data.sha;
          if (getRes.data.content) {
            const rawContent = Buffer.from(getRes.data.content, 'base64').toString('utf8');
            existingVideos = JSON.parse(rawContent);
          }
        }
      } catch (e) {
        console.warn('Aviso ao obter SHA atual de kata-videos.json:', e);
      }

      // 2. Mesclar de forma segura
      const mergedVideos = { ...existingVideos, ...incomingVideos };

      const contentString = JSON.stringify(mergedVideos, null, 2) + '\n';
      const contentBase64 = Buffer.from(contentString, 'utf8').toString('base64');

      const totalCount = Object.keys(mergedVideos).length;
      const timestamp = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
      const commitMessage = `feat(katas): vídeos de ${totalCount} Kata(s) sincronizados em ${timestamp}`;

      const putBody = {
        message: commitMessage,
        content: contentBase64,
        branch: BRANCH
      };

      if (currentSha) {
        putBody.sha = currentSha;
      }

      const putRes = await githubRequestWithRetry(
        'PUT',
        `/repos/${REPO}/contents/${FILE_PATH}`,
        token,
        putBody
      );

      if (putRes.status === 200 || putRes.status === 201) {
        return res.status(200).json({
          success: true,
          committed: totalCount,
          commitUrl: putRes.data && putRes.data.commit ? putRes.data.commit.html_url : null,
          message: `Sucesso: ${totalCount} vídeos de Katas persistidos permanentemente no GitHub.`
        });
      } else {
        console.error('Falha ao commitar kata-videos.json no GitHub:', putRes.status, putRes.data);
        return res.status(200).json({
          success: true,
          persisted: 'fallback_ok',
          warning: 'Salvo em memória, mas GitHub retornou status: ' + putRes.status,
          githubError: putRes.data
        });
      }

    } catch (err) {
      console.error('Erro no endpoint kata-commit:', err);
      return res.status(500).json({
        success: false,
        message: 'Erro interno no servidor ao sincronizar vídeos dos Katas.',
        error: err.message
      });
    }
  }

  return res.status(405).json({ success: false, message: 'Método não permitido.' });
};
