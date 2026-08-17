// api/quiz-bank.js
// Endpoint dedicado e persistente para o Banco de Questões do Simulado TKST.
// Separado do api/sync.js para evitar que o quiz bank seja sobrescrito por outras sincronizações.

const fs = require('fs');
const path = require('path');

const TMP_FILE = path.join('/tmp', 'tkst_quiz_bank.json');

// Módulo-level cache: sobrevive entre requisições na mesma instância Vercel
let moduleCache = null;

function readBank() {
  if (moduleCache) return moduleCache;
  try {
    if (fs.existsSync(TMP_FILE)) {
      const raw = fs.readFileSync(TMP_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        moduleCache = parsed;
        return moduleCache;
      }
    }
  } catch (e) {}
  return null;
}

function writeBank(bank) {
  try {
    moduleCache = bank;
    fs.writeFileSync(TMP_FILE, JSON.stringify(bank), 'utf8');
  } catch (e) {}
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
    const bank = readBank();
    if (!bank) {
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
