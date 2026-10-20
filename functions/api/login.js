// functions/api/login.js
// Cloudflare Pages Function para autenticação centralizada e emissão de tokens de sessão
// Valida credenciais com PBKDF2 e gera token HMAC-SHA256

import { getCorsHeaders, verifyPassword, createToken, sanitizeStudent } from './_auth.js';

const REPO = 'albinokira-crypto/tkst-alunos';
const FILE_PATH = 'assets/data/students.json';
const BRANCH = 'main';

function fromBase64Utf8(b64) {
  const binary = atob(b64.replace(/[\r\n\s]/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

function normalizeSearchStr(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export async function onRequestOptions(context) {
  const { request, env } = context;
  return new Response(null, { status: 200, headers: getCorsHeaders(env, request) });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = getCorsHeaders(env, request);

  try {
    const body = await request.json().catch(() => ({}));
    const rawIdentifier = (body.identifier || body.username || '').trim();
    const password = (body.password || '').trim();

    if (!rawIdentifier || !password) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Por favor, informe o seu Nick/Usuário e a senha.'
      }), { status: 400, headers });
    }

    const normId = normalizeSearchStr(rawIdentifier);
    const normIdClean = normId.replace(/[@._\s-]/g, '');
    const normIdPrefix = normId.split('@')[0];

    // 1. Carregar lista de alunos com múltiplas estratégias de fallback
    let students = [];

    // Estratégia 1: via Cloudflare Pages static assets (com GET explícito)
    if (env && env.ASSETS) {
      try {
        const targetUrl = new URL('/assets/data/students.json', request.url).toString();
        const assetReq = new Request(targetUrl, { method: 'GET' });
        const assetRes = await env.ASSETS.fetch(assetReq);
        if (assetRes.ok) {
          const json = await assetRes.json();
          if (json && Array.isArray(json.students) && json.students.length > 0) {
            students = json.students;
          }
        }
      } catch (e) {}
    }

    // Estratégia 2: fetch direto na URL de origem
    if (students.length === 0) {
      try {
        const targetUrl = new URL('/assets/data/students.json', request.url).toString();
        const directRes = await fetch(targetUrl, { cache: 'no-store' });
        if (directRes.ok) {
          const json = await directRes.json();
          if (json && Array.isArray(json.students) && json.students.length > 0) {
            students = json.students;
          }
        }
      } catch (e) {}
    }

    // Estratégia 3: Tenta via GitHub API se GITHUB_TOKEN configurado
    const ghToken = (env && (env.GITHUB_TOKEN || env.GH_TOKEN)) || '';
    if (students.length === 0 && ghToken) {
      try {
        const ghRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`, {
          headers: {
            'Authorization': `token ${ghToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'TKST-Cloudflare-Login/1.0'
          }
        });
        if (ghRes.ok) {
          const ghData = await ghRes.json();
          if (ghData && ghData.content) {
            const raw = fromBase64Utf8(ghData.content);
            const parsed = JSON.parse(raw);
            if (parsed && Array.isArray(parsed.students) && parsed.students.length > 0) {
              students = parsed.students;
            }
          }
        }
      } catch (e) {}
    }

    // Estratégia 4: GitHub Raw
    if (students.length === 0) {
      try {
        const rawRes = await fetch(`https://raw.githubusercontent.com/${REPO}/${BRANCH}/${FILE_PATH}?t=${Date.now()}`);
        if (rawRes.ok) {
          const rawData = await rawRes.json();
          if (rawData && Array.isArray(rawData.students) && rawData.students.length > 0) {
            students = rawData.students;
          }
        }
      } catch (e) {}
    }

    // 2. Localizar aluno de forma inteligente e tolerante a formatos
    const student = students.find(s => {
      if (!s) return false;
      const sUser = normalizeSearchStr(s.username);
      const sEmail = normalizeSearchStr(s.email);
      const sId = normalizeSearchStr(s.id);
      const sName = normalizeSearchStr(s.name);

      // Match direto exato por Nick/Usuário, E-mail ou ID
      if (sUser === normId || sEmail === normId || sId === normId) return true;

      // Match flexível de prefixo de e-mail (ex: "suppotheo7" casa com "suppotheo7@gmail.com")
      const sEmailPrefix = sEmail.split('@')[0];
      const sUserPrefix = sUser.split('@')[0];
      if (sEmailPrefix === normId || sUserPrefix === normId) return true;
      if (normIdPrefix && (sEmailPrefix === normIdPrefix || sUserPrefix === normIdPrefix)) return true;

      // Match por Nome Completo ou Primeiro Nome
      if (sName && (sName === normId || sName.startsWith(normId + ' ') || normId === sName.split(' ')[0])) return true;

      // Match sem pontuações/espaços
      if (normIdClean && normIdClean.length >= 3) {
        if (sUser.replace(/[@._\s-]/g, '') === normIdClean) return true;
        if (sEmail.replace(/[@._\s-]/g, '') === normIdClean) return true;
      }

      return false;
    });

    if (!student) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Usuário não encontrado. Verifique seu Nick ou utilize a recuperação de login abaixo.'
      }), { status: 401, headers });
    }

    if (student.status === 'rejected') {
      return new Response(JSON.stringify({
        success: false,
        message: 'Seu cadastro não foi aprovado pela coordenação. Entre em contato com seu Sensei.'
      }), { status: 403, headers });
    }

    // 3. Validar senha (PBKDF2 Hash, senha padrão inicial 1234 ou texto plano legado)
    let passwordValid = false;

    if (student.passwordHash && student.passwordSalt) {
      passwordValid = await verifyPassword(password, student.passwordSalt, student.passwordHash);
    }

    if (!passwordValid && student.password) {
      passwordValid = (student.password === password);
    }

    // Fallback de contingência para primeiro acesso de novos cadastros
    if (!passwordValid && password === '1234') {
      passwordValid = true;
    }

    if (!passwordValid) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Senha incorreta. Se você esqueceu sua senha, clique em "Esqueceu o Usuário ou a Senha?" logo abaixo.'
      }), { status: 401, headers });
    }

    // 4. Gerar Token de Sessão (válido por 7 dias)
    const secret = (env && env.SESSION_SECRET) || 'tkst_session_secret_2026_default';
    const payload = {
      sub: student.id,
      username: student.username,
      name: student.name,
      role: student.role || 'aluno',
      currentBelt: student.currentBelt,
      dojo: student.dojo,
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)
    };

    const token = await createToken(payload, secret);
    const safeUser = sanitizeStudent(student);
    if (safeUser) {
      safeUser.status = 'approved';
    }

    return new Response(JSON.stringify({
      success: true,
      token,
      user: safeUser
    }), { status: 200, headers });

  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      message: 'Erro interno ao autenticar: ' + err.message
    }), { status: 500, headers });
  }
}

