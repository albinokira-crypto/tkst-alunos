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

export async function onRequestOptions(context) {
  const { request, env } = context;
  return new Response(null, { status: 200, headers: getCorsHeaders(env, request) });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = getCorsHeaders(env, request);

  try {
    const body = await request.json().catch(() => ({}));
    const identifier = (body.identifier || body.username || '').trim().toLowerCase();
    const password = (body.password || '').trim();

    if (!identifier || !password) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Por favor, informe o Nick/Usuário e a senha.'
      }), { status: 400, headers });
    }

    // 1. Carregar lista de alunos
    let students = [];

    // Tenta via Cloudflare Pages static assets
    if (env && env.ASSETS) {
      try {
        const assetRes = await env.ASSETS.fetch(new URL('/assets/data/students.json', request.url));
        if (assetRes.ok) {
          const json = await assetRes.json();
          if (json && Array.isArray(json.students)) {
            students = json.students;
          }
        }
      } catch (e) {}
    }

    // Tenta via GitHub API se não encontrou em assets
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
            if (parsed && Array.isArray(parsed.students)) {
              students = parsed.students;
            }
          }
        }
      } catch (e) {}
    }

    // Fallback: GitHub Raw
    if (students.length === 0) {
      try {
        const rawRes = await fetch(`https://raw.githubusercontent.com/${REPO}/${BRANCH}/${FILE_PATH}`);
        if (rawRes.ok) {
          const rawData = await rawRes.json();
          if (rawData && Array.isArray(rawData.students)) {
            students = rawData.students;
          }
        }
      } catch (e) {}
    }

    // 2. Localizar aluno
    const student = students.find(s => 
      s && (
        (s.username && s.username.toLowerCase() === identifier) ||
        (s.email && s.email.toLowerCase() === identifier) ||
        (s.id && s.id.toLowerCase() === identifier)
      )
    );

    if (!student) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Usuário ou senha incorretos.'
      }), { status: 401, headers });
    }

    if (student.status === 'rejected') {
      return new Response(JSON.stringify({
        success: false,
        message: 'Seu cadastro não foi aprovado pela coordenação. Entre em contato com seu Sensei.'
      }), { status: 403, headers });
    }

    // 3. Validar senha
    let passwordValid = false;

    if (student.passwordHash && student.passwordSalt) {
      passwordValid = await verifyPassword(password, student.passwordSalt, student.passwordHash);
    } else if (student.password) {
      // Fallback legado temporário enquanto o registro não estiver migrado
      passwordValid = (student.password === password);
    }

    if (!passwordValid) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Usuário ou senha incorretos.'
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
