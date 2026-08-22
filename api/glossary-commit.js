// api/glossary-commit.js
// Endpoint server-side para commit automático do dicionário japonês no GitHub.
// O GITHUB_TOKEN fica seguro como variável de ambiente na Vercel — jamais exposto ao browser.

const https = require('https');
const fs = require('fs');
const path = require('path');

const REPO = process.env.GITHUB_REPO || 'albinokira-crypto/tkst-alunos';
const FILE_PATH = 'assets/js/data-glossary.js';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const MARKER_START = '// ==TKST_CUSTOM_GLOSSARY_START==';
const MARKER_END = '// ==TKST_CUSTOM_GLOSSARY_END==';
const TMP_FILE = path.join('/tmp', 'tkst_glossary.json');

function githubRequest(method, path, token, body) {
  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : null;
    const dataBuffer = dataString ? Buffer.from(dataString, 'utf8') : null;

    const options = {
      hostname: 'api.github.com',
      path,
      method,
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'TKST-Alunos-GlossaryCommit/1.0',
        'Content-Type': 'application/json; charset=utf-8',
        ...(dataBuffer ? { 'Content-Length': dataBuffer.length } : {})
      }
    };

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
async function githubRequestWithRetry(method, path, token, body, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await githubRequest(method, path, token, body);
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

// Injeta o bloco do glossário customizado no conteúdo do arquivo data-glossary.js
function injectCustomGlossaryBlock(currentContent, customGlossary, deletedTerms = []) {
  const deletedSet = new Set(Array.isArray(deletedTerms) ? deletedTerms : []);
  const categories = ['bases', 'defesas', 'socosGolpes', 'chutes', 'comandosEContagem'];
  const cleanGlossary = {};

  categories.forEach(cat => {
    if (customGlossary && Array.isArray(customGlossary[cat])) {
      cleanGlossary[cat] = customGlossary[cat].filter(t => t && t.japanese && !deletedSet.has(t.japanese.toLowerCase().trim()));
    }
  });

  const glossaryCode = `${MARKER_START}\nwindow.TKST_CUSTOM_GLOSSARY = ${JSON.stringify(cleanGlossary, null, 2)};\n${MARKER_END}`;

  // Caso 1: Marcadores já existem — substituição cirúrgica
  if (currentContent.includes(MARKER_START) && currentContent.includes(MARKER_END)) {
    const startIdx = currentContent.indexOf(MARKER_START);
    const endIdx = currentContent.indexOf(MARKER_END) + MARKER_END.length;

    const before = currentContent.slice(0, startIdx);
    const after = currentContent.slice(endIdx);

    return before + glossaryCode + after;
  }

  // Caso 2: Marcadores não existem — insere antes do fechamento do IIFE de inicialização
  const pattern = /\/\/ Initialize Custom Glossary/;
  const match = pattern.exec(currentContent);
  if (match) {
    const insertAt = match.index;
    return currentContent.slice(0, insertAt) + glossaryCode + '\n\n' + currentContent.slice(insertAt);
  }

  // Caso 3: Insere no final do arquivo
  return currentContent + '\n\n' + glossaryCode + '\n';
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.GITHUB_TOKEN;

  try {
    let body = req.body;
    if (typeof body === 'string') body = JSON.parse(body);

    const incomingGlossary = body.customGlossary || body.glossary || body.data || {};
    const deletedTerms = Array.isArray(body.deletedGlossaryTerms) ? body.deletedGlossaryTerms : [];

    // Atualiza cache em /tmp
    try {
      fs.writeFileSync(TMP_FILE, JSON.stringify({
        glossary: incomingGlossary,
        deletedGlossaryTerms: deletedTerms,
        savedAt: new Date().toISOString()
      }), 'utf8');
    } catch (e) {}

    if (!token) {
      return res.status(200).json({
        success: false,
        reason: 'GITHUB_TOKEN não configurado. Alterações salvas na memória do servidor e no dispositivo.'
      });
    }

    // 1. Busca o arquivo atual e seu SHA
    const apiPath = `/repos/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`;
    const getResult = await githubRequestWithRetry('GET', apiPath, token, null);

    if (getResult.status !== 200) {
      return res.status(200).json({
        success: false,
        reason: `GitHub GET falhou: ${getResult.status}`,
        detail: getResult.data
      });
    }

    const sha = getResult.data.sha;
    const currentContent = Buffer.from(getResult.data.content.replace(/\n/g, ''), 'base64').toString('utf8');

    // 2. Injeta o bloco do glossário customizado no arquivo
    const updatedContent = injectCustomGlossaryBlock(currentContent, incomingGlossary, deletedTerms);

    if (!updatedContent) {
      return res.status(200).json({
        success: false,
        reason: 'Não foi possível localizar o ponto de injeção em data-glossary.js.'
      });
    }

    if (updatedContent === currentContent) {
      return res.status(200).json({
        success: true,
        message: 'Dicionário já estava atualizado no GitHub.'
      });
    }

    // 3. Commit via GitHub API
    const encodedContent = Buffer.from(updatedContent, 'utf8').toString('base64');
    const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    const putResult = await githubRequestWithRetry('PUT', `/repos/${REPO}/contents/${FILE_PATH}`, token, {
      message: `feat(glossary): dicionário japonês atualizado pelo Sensei em ${now}`,
      content: encodedContent,
      sha,
      branch: BRANCH
    });

    if (putResult.status === 200 || putResult.status === 201) {
      return res.status(200).json({
        success: true,
        commitUrl: putResult.data.commit?.html_url || null,
        message: 'Dicionário salvo com sucesso na nuvem permanente do GitHub!'
      });
    } else {
      return res.status(200).json({
        success: false,
        reason: `GitHub PUT falhou: ${putResult.status}`,
        detail: putResult.data
      });
    }
  } catch (err) {
    console.error('glossary-commit error:', err);
    return res.status(200).json({ success: false, reason: err.message });
  }
};
