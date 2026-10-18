// functions/api/_auth.js
// Utilitários de segurança para Cloudflare Pages Functions (Web Crypto API)
// PBKDF2 (SHA-256, 100k iterações) e Tokens de Sessão HMAC-SHA256

export function getCorsHeaders(env = {}, request = null) {
  const allowed = (env && env.ALLOWED_ORIGIN) ? env.ALLOWED_ORIGIN.trim() : '*';
  let origin = '*';
  if (allowed !== '*') {
    const reqOrigin = request ? request.headers.get('Origin') : '';
    if (reqOrigin && (allowed.split(',').map(s => s.trim()).includes(reqOrigin))) {
      origin = reqOrigin;
    } else {
      origin = allowed.split(',')[0].trim();
    }
  }

  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN'
  };
}

function base64UrlEncode(bytes) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function generateSalt() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function hashPassword(password, saltHex) {
  if (!password || !saltHex) throw new Error('Password and saltHex are required');
  const enc = new TextEncoder();
  const passKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const cleanSalt = saltHex.trim();
  const saltBytes = new Uint8Array(cleanSalt.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 100000,
      hash: 'SHA-256'
    },
    passKey,
    256
  );

  return Array.from(new Uint8Array(derivedBits))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifyPassword(password, saltHex, expectedHash) {
  if (!password || !saltHex || !expectedHash) return false;
  try {
    const computed = await hashPassword(password, saltHex);
    if (computed.length !== expectedHash.length) return false;
    let diff = 0;
    for (let i = 0; i < computed.length; i++) {
      diff |= computed.charCodeAt(i) ^ expectedHash.charCodeAt(i);
    }
    return diff === 0;
  } catch (e) {
    return false;
  }
}

export async function createToken(payload, secret) {
  const enc = new TextEncoder();
  const keyMaterial = secret || 'tkst_session_secret_2026_default';
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(keyMaterial),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const header = { alg: 'HS256', typ: 'JWT' };
  const headerB64 = base64UrlEncode(enc.encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(enc.encode(JSON.stringify(payload)));
  const dataToSign = `${headerB64}.${payloadB64}`;

  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(dataToSign));
  const sigB64 = base64UrlEncode(new Uint8Array(sig));

  return `${dataToSign}.${sigB64}`;
}

export async function verifyToken(token, secret) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const [headerB64, payloadB64, sigB64] = parts;
    const enc = new TextEncoder();
    const keyMaterial = secret || 'tkst_session_secret_2026_default';
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      enc.encode(keyMaterial),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const dataToVerify = `${headerB64}.${payloadB64}`;
    const sigBytes = base64UrlDecode(sigB64);

    const isValid = await crypto.subtle.verify('HMAC', cryptoKey, sigBytes, enc.encode(dataToVerify));
    if (!isValid) return null;

    const payloadBytes = base64UrlDecode(payloadB64);
    const payload = JSON.parse(new TextDecoder().decode(payloadBytes));

    if (payload.exp && (payload.exp * 1000) < Date.now()) {
      return null; // Expired
    }

    return payload;
  } catch (err) {
    return null;
  }
}

export async function verifyAuth(request, env, requiredRole = null) {
  const authHeader = request.headers.get('Authorization') || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return { authenticated: false, error: 'Token de autenticação ausente ou malformatado.' };
  }

  const token = match[1].trim();
  const secret = (env && env.SESSION_SECRET) || 'tkst_session_secret_2026_default';
  const user = await verifyToken(token, secret);

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

export function sanitizeStudent(student) {
  if (!student || typeof student !== 'object') return null;
  const { password, passwordHash, passwordSalt, phone, ...safe } = student;
  return safe;
}
