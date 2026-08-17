// api/quiz-commit.js
// Endpoint server-side para commit automático do banco de questões no GitHub.
// O GITHUB_TOKEN fica seguro como variável de ambiente na Vercel — jamais exposto ao browser.

const https = require('https');

const REPO = process.env.GITHUB_REPO || 'albinokira-crypto/tkst-alunos';
const FILE_PATH = 'assets/js/data-quiz.js';
const BRANCH = process.env.GITHUB_BRANCH || 'main';

function githubRequest(method, path, token, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'api.github.com',
      path,
      method,
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'TKST-Alunos-AutoCommit/1.0',
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    // Sem token configurado — retorna silenciosamente (sem erro, não bloqueia o app)
    return res.status(200).json({ success: false, reason: 'GITHUB_TOKEN não configurado. Questões salvas localmente.' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') body = JSON.parse(body);

    const customQuestions = body.customQuestions;
    if (!Array.isArray(customQuestions) || customQuestions.length === 0) {
      return res.status(200).json({ success: false, reason: 'Nenhuma questão customizada para commitar.' });
    }

    // 1. Busca o arquivo atual e seu SHA
    const apiPath = `/repos/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`;
    const getResult = await githubRequest('GET', apiPath, token, null);

    if (getResult.status !== 200) {
      return res.status(200).json({ success: false, reason: `GitHub GET falhou: ${getResult.status}` });
    }

    const sha = getResult.data.sha;
    const currentContent = Buffer.from(getResult.data.content.replace(/\n/g, ''), 'base64').toString('utf8');

    // 2. Injeta as questões customizadas no arquivo
    const MARKER_START = '// ==TKST_CUSTOM_QUESTIONS_START==';
    const MARKER_END = '// ==TKST_CUSTOM_QUESTIONS_END==';
    const questionsJson = customQuestions.map(q => '  ' + JSON.stringify(q)).join(',\n');
    const customBlock = `${MARKER_START}\n${questionsJson},\n  ${MARKER_END}`;

    let updatedContent;
    if (currentContent.includes(MARKER_START)) {
      // Substitui o bloco existente
      const startIdx = currentContent.indexOf(MARKER_START);
      const endIdx = currentContent.indexOf(MARKER_END) + MARKER_END.length;
      updatedContent = currentContent.slice(0, startIdx) + customBlock + currentContent.slice(endIdx);
    } else {
      // Injeta antes do fechamento do array window.TKST_DEFAULT_QUIZ_BANK
      updatedContent = currentContent.replace(/\];\s*$/, `  // Questões customizadas pelo Sensei (auto-salvo)\n  ${customBlock}\n];`);
    }

    // 3. Commit via GitHub API
    const encodedContent = Buffer.from(updatedContent, 'utf8').toString('base64');
    const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    const putResult = await githubRequest('PUT', `/repos/${REPO}/contents/${FILE_PATH}`, token, {
      message: `feat(quiz): ${customQuestions.length} questão(ões) salva(s) pelo Sensei em ${now}`,
      content: encodedContent,
      sha,
      branch: BRANCH
    });

    if (putResult.status === 200 || putResult.status === 201) {
      return res.status(200).json({
        success: true,
        committed: customQuestions.length,
        commitUrl: putResult.data.commit?.html_url || null,
        message: `${customQuestions.length} questão(ões) commitada(s) com sucesso!`
      });
    } else {
      return res.status(200).json({ success: false, reason: `GitHub PUT falhou: ${putResult.status}`, detail: putResult.data });
    }

  } catch (err) {
    console.error('quiz-commit error:', err);
    return res.status(200).json({ success: false, reason: err.message });
  }
};
