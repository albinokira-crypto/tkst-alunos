// api/quiz-commit.js
// Endpoint server-side para commit automático do banco de questões no GitHub.
// O GITHUB_TOKEN fica seguro como variável de ambiente na Vercel — jamais exposto ao browser.

const https = require('https');

const REPO = process.env.GITHUB_REPO || 'albinokira-crypto/tkst-alunos';
const FILE_PATH = 'assets/js/data-quiz.js';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const MARKER_START = '// ==TKST_CUSTOM_QUESTIONS_START==';
const MARKER_END = '// ==TKST_CUSTOM_QUESTIONS_END==';

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
        'User-Agent': 'TKST-Alunos-AutoCommit/1.0',
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
      // Se deu erro 500/502/503/504, aguarda e tenta novamente
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

// Injeta o bloco de questões customizadas no conteúdo do arquivo
function injectCustomBlock(currentContent, customQuestions) {
  const questionsJson = customQuestions.map(q => '  ' + JSON.stringify(q)).join(',\n');

  // Caso 1: Marcadores já existem — substituição cirúrgica
  if (currentContent.includes(MARKER_START) && currentContent.includes(MARKER_END)) {
    const startIdx = currentContent.indexOf(MARKER_START);
    const endIdx = currentContent.indexOf(MARKER_END) + MARKER_END.length;

    const before = currentContent.slice(0, startIdx);
    const after = currentContent.slice(endIdx);

    const newBlock = customQuestions.length > 0
      ? `${MARKER_START}\n${questionsJson},\n  ${MARKER_END}`
      : `${MARKER_START}\n  ${MARKER_END}`;

    return before + newBlock + after;
  }

  // Caso 2: Marcadores não existem — procura o fechamento do array principal
  const patterns = [
    /\n\];\s*\n\/\/ Initialize/,
    /\n\];\s*\r?\n\/\/ Initialize/,
    /\n\];\s*\n\n\/\/ Initialize/
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(currentContent);
    if (match) {
      const insertAt = match.index;
      const customBlock = customQuestions.length > 0
        ? `\n  // Questões customizadas pelo Sensei (auto-salvo)\n  ${MARKER_START}\n${questionsJson},\n  ${MARKER_END}`
        : `\n  // Questões customizadas pelo Sensei (auto-salvo)\n  ${MARKER_START}\n  ${MARKER_END}`;

      return currentContent.slice(0, insertAt) + customBlock + currentContent.slice(insertAt);
    }
  }

  console.error('quiz-commit: não encontrou ponto de injeção no arquivo. Nenhuma alteração feita.');
  return null;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.GITHUB_TOKEN;

  // Diagnóstico
  if (req.body && (req.body.debug === true || (typeof req.body === 'string' && req.body.includes('"debug":true')))) {
    const envKeys = Object.keys(process.env).filter(k =>
      !k.startsWith('PATH') && !k.startsWith('npm_') && !k.startsWith('NODE') &&
      !k.startsWith('HOME') && !k.startsWith('USER') && !k.startsWith('PWD')
    );
    return res.status(200).json({
      tokenConfigured: !!token,
      tokenLength: token ? token.length : 0,
      tokenPrefix: token ? token.slice(0, 6) + '...' : null,
      visibleEnvKeys: envKeys,
      repo: REPO,
      branch: BRANCH
    });
  }

  if (!token) {
    return res.status(200).json({ success: false, reason: 'GITHUB_TOKEN não configurado. Questões salvas localmente.' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') body = JSON.parse(body);

    const incomingQuestions = body.customQuestions || body.questions || body.bank || body;
    if (!Array.isArray(incomingQuestions)) {
      return res.status(200).json({ success: false, reason: 'Nenhuma questão para commitar.' });
    }

    // Filtra apenas questões que são customizadas ou foram editadas pelo Sensei
    // Isso mantém o commit leve, rápido e sem risco de 503
    const customOnly = incomingQuestions.filter(q => q && (q._edited || (q.id && q.id.startsWith('q_custom_'))));

    // 1. Busca o arquivo atual e seu SHA
    const apiPath = `/repos/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`;
    const getResult = await githubRequestWithRetry('GET', apiPath, token, null);

    if (getResult.status !== 200) {
      return res.status(200).json({ success: false, reason: `GitHub GET falhou: ${getResult.status}`, detail: getResult.data });
    }

    const sha = getResult.data.sha;
    const currentContent = Buffer.from(getResult.data.content.replace(/\n/g, ''), 'base64').toString('utf8');

    // 2. Injeta as questões customizadas/editadas no arquivo
    const updatedContent = injectCustomBlock(currentContent, customOnly);

    if (!updatedContent) {
      return res.status(200).json({ success: false, reason: 'Não foi possível localizar o ponto de injeção no data-quiz.js.' });
    }

    // Se o conteúdo não mudou, não faz commit desnecessário
    if (updatedContent === currentContent) {
      return res.status(200).json({ success: true, committed: customOnly.length, message: 'Arquivo já estava atualizado.' });
    }

    // 3. Commit via GitHub API com retries automáticos
    const encodedContent = Buffer.from(updatedContent, 'utf8').toString('base64');
    const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    const putResult = await githubRequestWithRetry('PUT', `/repos/${REPO}/contents/${FILE_PATH}`, token, {
      message: `feat(quiz): ${customOnly.length} questão(ões) atualizada(s) pelo Sensei em ${now}`,
      content: encodedContent,
      sha,
      branch: BRANCH
    });

    if (putResult.status === 200 || putResult.status === 201) {
      return res.status(200).json({
        success: true,
        committed: customOnly.length,
        commitUrl: putResult.data.commit?.html_url || null,
        message: `${customOnly.length} questão(ões) salva(s) com sucesso na nuvem permanente!`
      });
    } else {
      return res.status(200).json({ success: false, reason: `GitHub PUT falhou: ${putResult.status}`, detail: putResult.data });
    }

  } catch (err) {
    console.error('quiz-commit error:', err);
    return res.status(200).json({ success: false, reason: err.message });
  }
};
