// api/_auth.js
// Utilitários de segurança para o ambiente Node.js / Vercel legada / server.js local
// PBKDF2 (SHA-256, 100k iterações) e Tokens de Sessão HMAC-SHA256

const crypto = require('crypto');

function getCorsHeaders(allowedOrigin = '*') {
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN'
  };
}

function base64UrlEncode(buffer) {
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64');
}

function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
}

function hashPassword(password, saltHex) {
  if (!password || !saltHex) throw new Error('Password and saltHex are required');
  const saltBuf = Buffer.from(saltHex, 'hex');
  return crypto.pbkdf2Sync(password, saltBuf, 100000, 32, 'sha256').toString('hex');
}

function verifyPassword(password, saltHex, expectedHash) {
  if (!password || !saltHex || !expectedHash) return false;
  try {
    const computed = hashPassword(password, saltHex);
    const computedBuf = Buffer.from(computed, 'hex');
    const expectedBuf = Buffer.from(expectedHash, 'hex');
    if (computedBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(computedBuf, expectedBuf);
  } catch (e) {
    return false;
  }
}

function createToken(payload, secret = null) {
  const keyMaterial = secret || process.env.SESSION_SECRET || 'tkst_session_secret_2026_default';
  const header = { alg: 'HS256', typ: 'JWT' };
  const headerB64 = base64UrlEncode(Buffer.from(JSON.stringify(header), 'utf8'));
  const payloadB64 = base64UrlEncode(Buffer.from(JSON.stringify(payload), 'utf8'));
  const dataToSign = `${headerB64}.${payloadB64}`;

  const sig = crypto.createHmac('sha256', keyMaterial).update(dataToSign).digest();
  const sigB64 = base64UrlEncode(sig);

  return `${dataToSign}.${sigB64}`;
}

function verifyToken(token, secret = null) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const [headerB64, payloadB64, sigB64] = parts;
    const keyMaterial = secret || process.env.SESSION_SECRET || 'tkst_session_secret_2026_default';
    const dataToVerify = `${headerB64}.${payloadB64}`;

    const expectedSig = crypto.createHmac('sha256', keyMaterial).update(dataToVerify).digest();
    const providedSig = base64UrlDecode(sigB64);

    if (expectedSig.length !== providedSig.length || !crypto.timingSafeEqual(expectedSig, providedSig)) {
      return null;
    }

    const payload = JSON.parse(base64UrlDecode(payloadB64).toString('utf8'));
    if (payload.exp && (payload.exp * 1000) < Date.now()) {
      return null;
    }

    return payload;
  } catch (err) {
    return null;
  }
}

function verifyAuth(req, requiredRole = null, secret = null) {
  const authHeader = (req.headers && (req.headers.authorization || req.headers.Authorization)) || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return { authenticated: false, error: 'Token de autenticação ausente ou malformatado.' };
  }

  const token = match[1].trim();
  const user = verifyToken(token, secret);

  if (!user) {
    return { authenticated: false, error: 'Sessão expirada ou token inválido. Faça login novamente.' };
  }

  if (requiredRole) {
    const userRole = (user.role || '').toLowerCase();
    const reqRole = requiredRole.toLowerCase();
    if (userRole !== 'admin' && userRole !== reqRole) {
      return { authenticated: false, error: 'Acesso negado: permissão insuficiente.' };
    }
  }

  return { authenticated: true, user };
}

function sanitizeStudent(student) {
  if (!student || typeof student !== 'object') return null;
  const { password, passwordHash, passwordSalt, phone, ...safe } = student;
  return safe;
}

module.exports = {
  getCorsHeaders,
  generateSalt,
  hashPassword,
  verifyPassword,
  createToken,
  verifyToken,
  verifyAuth,
  sanitizeStudent
};
