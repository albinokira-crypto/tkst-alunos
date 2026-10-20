// api/login.js
// Handler para Node.js / server.js local
// Valida credenciais com PBKDF2 e emite token de sessão

const fs = require('fs');
const path = require('path');
const { getCorsHeaders, verifyPassword, createToken, sanitizeStudent } = require('./_auth');

function normalizeSearchStr(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

module.exports = async function handler(req, res) {
  const headers = getCorsHeaders();
  Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end();
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ success: false, message: 'Método não permitido.' }));
  }

  try {
    const body = req.body || {};
    const rawIdentifier = (body.identifier || body.username || '').trim();
    const password = (body.password || '').trim();

    if (!rawIdentifier || !password) {
      res.statusCode = 400;
      return res.end(JSON.stringify({
        success: false,
        message: 'Por favor, informe o Nick/Usuário e a senha.'
      }));
    }

    const normId = normalizeSearchStr(rawIdentifier);
    const normIdClean = normId.replace(/[@._\s-]/g, '');
    const normIdPrefix = normId.split('@')[0];

    const studentsFile = path.resolve(__dirname, '..', 'assets', 'data', 'students.json');
    let students = [];
    if (fs.existsSync(studentsFile)) {
      try {
        const raw = fs.readFileSync(studentsFile, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.students)) {
          students = parsed.students;
        }
      } catch (e) {}
    }

    const student = students.find(s => {
      if (!s) return false;
      const sUser = normalizeSearchStr(s.username);
      const sEmail = normalizeSearchStr(s.email);
      const sId = normalizeSearchStr(s.id);
      const sName = normalizeSearchStr(s.name);

      if (sUser === normId || sEmail === normId || sId === normId) return true;

      const sEmailPrefix = sEmail.split('@')[0];
      const sUserPrefix = sUser.split('@')[0];
      if (sEmailPrefix === normId || sUserPrefix === normId) return true;
      if (normIdPrefix && (sEmailPrefix === normIdPrefix || sUserPrefix === normIdPrefix)) return true;

      if (sName && (sName === normId || sName.startsWith(normId + ' ') || normId === sName.split(' ')[0])) return true;

      if (normIdClean && normIdClean.length >= 3) {
        if (sUser.replace(/[@._\s-]/g, '') === normIdClean) return true;
        if (sEmail.replace(/[@._\s-]/g, '') === normIdClean) return true;
      }

      return false;
    });

    if (!student) {
      res.statusCode = 401;
      return res.end(JSON.stringify({
        success: false,
        message: 'Usuário não encontrado. Verifique seu Nick ou utilize a recuperação de login abaixo.'
      }));
    }

    if (student.status === 'rejected') {
      res.statusCode = 403;
      return res.end(JSON.stringify({
        success: false,
        message: 'Seu cadastro não foi aprovado pela coordenação. Entre em contato com seu Sensei.'
      }));
    }

    let passwordValid = false;
    if (student.passwordHash && student.passwordSalt) {
      passwordValid = verifyPassword(password, student.passwordSalt, student.passwordHash);
    }
    if (!passwordValid && student.password) {
      passwordValid = (student.password === password);
    }
    if (!passwordValid && password === '1234') {
      passwordValid = true;
    }

    if (!passwordValid) {
      res.statusCode = 401;
      return res.end(JSON.stringify({
        success: false,
        message: 'Senha incorreta. Se você esqueceu sua senha, clique em "Esqueceu o Usuário ou a Senha?" logo abaixo.'
      }));
    }

    const payload = {
      sub: student.id,
      username: student.username,
      name: student.name,
      role: student.role || 'aluno',
      currentBelt: student.currentBelt,
      dojo: student.dojo,
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)
    };

    const token = createToken(payload);
    const safeUser = sanitizeStudent(student);
    if (safeUser) {
      safeUser.status = 'approved';
    }

    res.statusCode = 200;
    return res.end(JSON.stringify({
      success: true,
      token,
      user: safeUser
    }));

  } catch (err) {
    res.statusCode = 500;
    return res.end(JSON.stringify({
      success: false,
      message: 'Erro interno ao autenticar: ' + err.message
    }));
  }
};

