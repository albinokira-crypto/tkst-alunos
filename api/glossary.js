// api/glossary.js
// Endpoint dedicado e persistente para o Dicionário Japonês de Karatê TKST.
// Separado do api/sync.js para evitar que os termos sejam sobrescritos por outras sincronizações.

const fs = require('fs');
const path = require('path');
const https = require('https');

const TMP_FILE = path.join('/tmp', 'tkst_glossary.json');
const REPO = process.env.GITHUB_REPO || 'albinokira-crypto/tkst-alunos';
const FILE_PATH = 'assets/js/data-glossary.js';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const MARKER_START = '// ==TKST_CUSTOM_GLOSSARY_START==';
const MARKER_END = '// ==TKST_CUSTOM_GLOSSARY_END==';

let moduleCache = null;

function readFromTmp() {
  try {
    if (fs.existsSync(TMP_FILE)) {
      const raw = fs.readFileSync(TMP_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch (e) {}
  return null;
}

function writeToTmp(data) {
  try {
    fs.writeFileSync(TMP_FILE, JSON.stringify(data), 'utf8');
  } catch (e) {}
}

function readGlossary() {
  if (moduleCache) return moduleCache;
  const tmp = readFromTmp();
  if (tmp) {
    moduleCache = tmp;
    return moduleCache;
  }
  return null;
}

function writeGlossary(data) {
  moduleCache = data;
  writeToTmp(data);
}

// Busca termos customizados diretamente de data-glossary.js no GitHub
function fetchCustomGlossaryFromGitHub(token) {
  return new Promise((resolve) => {
    const apiPath = `/repos/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`;
    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'TKST-Alunos-Glossary/1.0'
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
          if (res.statusCode !== 200 || !data.content) return resolve(null);

          const fileContent = Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf8');
          const startIdx = fileContent.indexOf(MARKER_START);
          const endIdx = fileContent.indexOf(MARKER_END);

          if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) return resolve(null);

          const block = fileContent.slice(startIdx + MARKER_START.length, endIdx).trim();
          if (!block) return resolve(null);

          // Procura por window.TKST_CUSTOM_GLOSSARY = { ... };
          const jsonMatch = block.match(/window\.TKST_CUSTOM_GLOSSARY\s*=\s*(\{[\s\S]*?\});?/);
          if (jsonMatch && jsonMatch[1]) {
            const parsed = JSON.parse(jsonMatch[1]);
            return resolve(parsed);
          }
          resolve(null);
        } catch (e) {
          resolve(null);
        }
      });
    });

    req.on('error', () => resolve(null));
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

  // GET — retorna o dicionário persistido
  if (req.method === 'GET') {
    let saved = readGlossary();

    // Fallback: se cache/tmp vazio, busca no GitHub
    if (!saved || !saved.glossary || Object.keys(saved.glossary).length === 0) {
      const token = process.env.GITHUB_TOKEN;
      const ghGlossary = await fetchCustomGlossaryFromGitHub(token);
      if (ghGlossary && typeof ghGlossary === 'object') {
        saved = {
          glossary: ghGlossary,
          deletedGlossaryTerms: []
        };
        writeGlossary(saved);
      }
    }

    if (!saved || !saved.glossary) {
      return res.status(200).json({ success: true, data: {}, deletedGlossaryTerms: [], empty: true });
    }

    return res.status(200).json({
      success: true,
      data: saved.glossary,
      deletedGlossaryTerms: saved.deletedGlossaryTerms || []
    });
  }

  // POST — salva/atualiza o dicionário
  if (req.method === 'POST') {
    try {
      let body = req.body;
      if (typeof body === 'string') body = JSON.parse(body);

      const incomingGlossary = body.glossary || body.customGlossary || body.data || {};
      const incomingDeleted = Array.isArray(body.deletedGlossaryTerms) ? body.deletedGlossaryTerms : [];

      const existingData = readGlossary() || { glossary: {}, deletedGlossaryTerms: [] };
      const existingGlossary = existingData.glossary || {};
      const existingDeleted = existingData.deletedGlossaryTerms || [];

      // Unifica deleted terms
      const deletedSet = new Set([...existingDeleted, ...incomingDeleted]);
      const finalDeleted = Array.from(deletedSet);

      const categories = ['bases', 'defesas', 'socosGolpes', 'chutes', 'comandosEContagem'];
      const mergedGlossary = {};

      categories.forEach(cat => {
        const termMap = new Map();

        // 1. Termos existentes
        (existingGlossary[cat] || []).forEach(t => {
          if (t && t.japanese) termMap.set(t.japanese.toLowerCase().trim(), t);
        });

        // 2. Termos recebidos
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

      const stateToSave = {
        glossary: mergedGlossary,
        deletedGlossaryTerms: finalDeleted,
        savedAt: new Date().toISOString()
      };

      writeGlossary(stateToSave);

      return res.status(200).json({
        success: true,
        data: mergedGlossary,
        deletedGlossaryTerms: finalDeleted,
        savedAt: stateToSave.savedAt
      });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
