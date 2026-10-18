// functions/api/submission-commit.js
// Cloudflare Pages Function para persistência e consulta do histórico de simulados
// Protegido por Token de Sessão HMAC-SHA256

import { getCorsHeaders, verifyAuth } from './_auth.js';

const REPO = 'albinokira-crypto/tkst-alunos';
const FILE_PATH = 'assets/data/submissions.json';
const BRANCH = 'main';

function toBase64Utf8(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

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

export async function onRequestGet(context) {
  const { request, env } = context;
  const headers = getCorsHeaders(env, request);
  const token = (env && (env.GITHUB_TOKEN || env.GH_TOKEN)) || '';

  // 1. Tentar via GitHub API
  if (token) {
    try {
      const ghRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'TKST-Cloudflare-Submission/1.0'
        }
      });
      if (ghRes.ok) {
        const ghData = await ghRes.json();
        if (ghData && ghData.content) {
          const raw = fromBase64Utf8(ghData.content);
          return new Response(JSON.stringify({
            success: true,
            source: 'github',
            sha: ghData.sha,
            data: JSON.parse(raw)
          }), { status: 200, headers });
        }
      }
    } catch (e) {
      console.warn('Erro ao consultar GitHub API para submissions:', e);
    }
  }

  // 2. Tentar via Cloudflare Pages static assets
  if (env && env.ASSETS) {
    try {
      const assetRes = await env.ASSETS.fetch(new URL('/assets/data/submissions.json', request.url));
      if (assetRes.ok) {
        const data = await assetRes.json();
        return new Response(JSON.stringify({
          success: true,
          source: 'cloudflare_assets',
          data
        }), { status: 200, headers });
      }
    } catch (e) {}
  }

  // 3. Fallback: Raw GitHub
  try {
    const rawRes = await fetch(`https://raw.githubusercontent.com/${REPO}/${BRANCH}/${FILE_PATH}`);
    if (rawRes.ok) {
      const data = await rawRes.json();
      return new Response(JSON.stringify({
        success: true,
        source: 'raw_github',
        data
      }), { status: 200, headers });
    }
  } catch (e) {}

  return new Response(JSON.stringify({
    success: true,
    source: 'empty',
    data: []
  }), { status: 200, headers });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = getCorsHeaders(env, request);

  // Verificação de autenticação: usuário logado (aluno ou admin)
  const auth = await verifyAuth(request, env);
  if (!auth.authenticated) {
    return new Response(JSON.stringify({
      success: false,
      error: auth.error
    }), { status: 401, headers });
  }

  const token = (env && (env.GITHUB_TOKEN || env.GH_TOKEN)) || '';

  try {
    const body = await request.json().catch(() => ({}));
    const incomingSubmissions = Array.isArray(body.submissions) ? body.submissions : (Array.isArray(body) ? body : (body.submission ? [body.submission] : []));

    // Se não for admin, garante que o aluno só envie simulados dele mesmo
    const userRole = (auth.user.role || '').toLowerCase();
    if (userRole !== 'admin') {
      const userId = (auth.user.sub || '').toLowerCase();
      const userNick = (auth.user.username || '').toLowerCase();
      const unauthorized = incomingSubmissions.some(s => {
        if (!s) return false;
        const sId = (s.studentId || '').toLowerCase();
        const sNick = (s.studentUsername || '').toLowerCase();
        if (sId && sId !== userId && sId !== userNick) return true;
        if (sNick && sNick !== userNick && sNick !== userId) return true;
        return false;
      });
      if (unauthorized) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Acesso negado: você só pode submeter simulados da sua própria conta.'
        }), { status: 403, headers });
      }
    }

    if (!token) {
      return new Response(JSON.stringify({
        success: true,
        persisted: false,
        source: 'no_token_client_storage',
        message: 'Submissão gravada no cliente.'
      }), { status: 200, headers });
    }

    let currentSha = null;
    let existingSubmissions = [];

    const getRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'TKST-Cloudflare-Submission/1.0'
      }
    });

    if (getRes.ok) {
      const currentFile = await getRes.json();
      currentSha = currentFile.sha;
      try {
        const raw = fromBase64Utf8(currentFile.content);
        const parsed = JSON.parse(raw);
        existingSubmissions = Array.isArray(parsed) ? parsed : (parsed.submissions || parsed.quiz_submissions || []);
      } catch (e) {}
    }

    const subMap = new Map();
    existingSubmissions.forEach(s => {
      const id = s.id || (s.timestamp ? `${s.username}_${s.timestamp}` : null);
      if (id) subMap.set(id, s);
    });

    incomingSubmissions.forEach(s => {
      if (!s) return;
      const id = s.id || (s.timestamp ? `${s.username}_${s.timestamp}` : `sub_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`);
      subMap.set(id, { ...s, id });
    });

    const finalSubmissions = Array.from(subMap.values());
    const newContentStr = JSON.stringify(finalSubmissions, null, 2);
    const newBase64 = toBase64Utf8(newContentStr);

    const putRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'TKST-Cloudflare-Submission/1.0'
      },
      body: JSON.stringify({
        message: `feat(quiz): sincronizar envio de simulados [Cloudflare auto-commit]`,
        content: newBase64,
        sha: currentSha || undefined,
        branch: BRANCH
      })
    });

    if (putRes.ok || putRes.status === 201) {
      return new Response(JSON.stringify({
        success: true,
        persisted: true,
        count: finalSubmissions.length,
        message: 'Histórico de simulados salvo com sucesso no GitHub!'
      }), { status: 200, headers });
    } else {
      return new Response(JSON.stringify({
        success: false,
        persisted: false,
        error: 'Falha ao salvar no repositório GitHub.'
      }), { status: 502, headers });
    }

  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Erro interno ao processar submissão: ' + err.message
    }), { status: 500, headers });
  }
}
