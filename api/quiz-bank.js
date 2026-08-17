// api/quiz-bank.js
// Endpoint dedicado e persistente para o Banco de Questões do Simulado TKST.
// Separado do api/sync.js para evitar que o quiz bank seja sobrescrito por outras sincronizações.
//
// Estratégia de leitura (ordem de prioridade):
//   1. moduleCache (RAM — mais rápido, válido enquanto a instância viver)
//   2. /tmp/tkst_quiz_bank.json (disco temporário — sobrevive um pouco mais)
//   3. GitHub API (fonte permanente — fallback após cold-start)

const fs = require('fs');
const path = require('path');
const https = require('https');

const TMP_FILE = path.join('/tmp', 'tkst_quiz_bank.json');
const REPO = process.env.GITHUB_REPO || 'albinokira-crypto/tkst-alunos';
const FILE_PATH = 'assets/js/data-quiz.js';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const MARKER_START = '// ==TKST_CUSTOM_QUESTIONS_START==';
const MARKER_END = '// ==TKST_CUSTOM_QUESTIONS_END==';

// Módulo-level cache: sobrevive entre requisições na mesma instância Vercel
let moduleCache = null;

function readFromTmp() {
  try {
    if (fs.existsSync(TMP_FILE)) {
      const raw = fs.readFileSync(TMP_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return null;
}

function writeToTmp(bank) {
  try {
    fs.writeFileSync(TMP_FILE, JSON.stringify(bank), 'utf8');
  } catch (e) {}
}

function readBank() {
  if (moduleCache) return moduleCache;
  const tmp = readFromTmp();
  if (tmp) {
    moduleCache = tmp;
    return moduleCache;
  }
  return null;
}

function writeBank(bank) {
  moduleCache = bank;
  writeToTmp(bank);
}

// Busca questões customizadas diretamente do arquivo data-quiz.js no GitHub
// Extrai o bloco entre os marcadores TKST_CUSTOM_QUESTIONS_START e END
function fetchCustomQuestionsFromGitHub(token) {
  return new Promise((resolve) => {
    const apiPath = `/repos/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`;
    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'TKST-Alunos-QuizBank/1.0'
    };
    if (token) headers['Authorization'] = `token ${token}`;

    const options = {
      hostname: 'api.github.com',
      path: apiPath,
      method: 'GET',
      headers
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (res.statusCode !== 200 || !data.content) return resolve([]);

          const fileContent = Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf8');
          const startIdx = fileContent.indexOf(MARKER_START);
          const endIdx = fileContent.indexOf(MARKER_END);

          if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) return resolve([]);

          const block = fileContent.slice(startIdx + MARKER_START.length, endIdx).trim();
          if (!block) return resolve([]);

          // Bloco contém linhas JSON separadas por vírgulas — parseia como array
          const cleanBlock = '[' + block.replace(/,\s*$/, '') + ']';
          const questions = JSON.parse(cleanBlock);
          resolve(Array.isArray(questions) ? questions : []);
        } catch (e) {
          resolve([]);
        }
      });
    });

    req.on('error', () => resolve([]));
    req.end();
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET — retorna o banco de questões persistido
  if (req.method === 'GET') {
    let bank = readBank();

    // Fallback: se memória/tmp estão vazios, busca no GitHub (fonte permanente)
    if (!bank || bank.length === 0) {
      const token = process.env.GITHUB_TOKEN;
      const githubQuestions = await fetchCustomQuestionsFromGitHub(token);
      if (githubQuestions.length > 0) {
        bank = githubQuestions;
        writeBank(bank); // Aquece o cache para próximas requisições
      }
    }

    if (!bank || bank.length === 0) {
      return res.status(200).json({ success: true, data: [], empty: true });
    }
    return res.status(200).json({ success: true, data: bank, count: bank.length });
  }

  // POST — salva/atualiza o banco de questões
  if (req.method === 'POST') {
    try {
      let body = req.body;
      if (typeof body === 'string') body = JSON.parse(body);

      const incoming = body.bank || body.data || body;
      if (!Array.isArray(incoming)) {
        return res.status(400).json({ success: false, error: 'Payload inválido: esperado array de questões.' });
      }

      // Merge: mantém o que já existe e adiciona/atualiza com o que chegou
      const existing = readBank() || [];
      const bankMap = new Map();
      existing.forEach(q => { if (q && q.id) bankMap.set(q.id, q); });
      incoming.forEach(q => { if (q && q.id) bankMap.set(q.id, q); });

      // Aplicar tombstones (questões deletadas)
      const deletedIds = new Set(Array.isArray(body.deletedQuizIds) ? body.deletedQuizIds : []);
      const merged = Array.from(bankMap.values()).filter(q => !deletedIds.has(q.id));

      writeBank(merged);

      return res.status(200).json({
        success: true,
        data: merged,
        count: merged.length,
        savedAt: new Date().toISOString()
      });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
