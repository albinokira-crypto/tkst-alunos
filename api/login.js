// api/login.js
// Handler para Node.js / server.js local
// Valida credenciais com PBKDF2 e emite token de sessão

const fs = require('fs');
const path = require('path');
const { getCorsHeaders, verifyPassword, createToken, sanitizeStudent } = require('./_auth');

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
    const identifier = (body.identifier || body.username || '').trim().toLowerCase();
    const password = (body.password || '').trim();

    if (!identifier || !password) {
      res.statusCode = 400;
      return res.end(JSON.stringify({
        success: false,
        message: 'Por favor, informe o Nick/Usuário e a senha.'
      }));
    }

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

    const student = students.find(s => 
      s && (
        (s.username && s.username.toLowerCase() === identifier) ||
        (s.email && s.email.toLowerCase() === identifier) ||
        (s.id && s.id.toLowerCase() === identifier)
      )
    );

    if (!student) {
      res.statusCode = 401;
      return res.end(JSON.stringify({
        success: false,
        message: 'Usuário ou senha incorretos.'
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
    } else if (student.password) {
      passwordValid = (student.password === password);
    }

    if (!passwordValid) {
      res.statusCode = 401;
      return res.end(JSON.stringify({
        success: false,
        message: 'Usuário ou senha incorretos.'
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
