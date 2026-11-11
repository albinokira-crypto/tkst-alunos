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

function normalizeSubmissionObject(parsed) {
  if (Array.isArray(parsed)) {
    return {
      kyu_ranking_reset_at: null,
      quiz_submissions: parsed,
      deletedQuizSubIds: []
    };
  }
  if (parsed && typeof parsed === 'object') {
    return {
      kyu_ranking_reset_at: parsed.kyu_ranking_reset_at || null,
      quiz_submissions: Array.isArray(parsed.quiz_submissions) ? parsed.quiz_submissions : (Array.isArray(parsed.submissions) ? parsed.submissions : []),
      deletedQuizSubIds: Array.isArray(parsed.deletedQuizSubIds) ? parsed.deletedQuizSubIds : []
    };
  }
  return {
    kyu_ranking_reset_at: null,
    quiz_submissions: [],
    deletedQuizSubIds: []
  };
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
            data: normalizeSubmissionObject(JSON.parse(raw))
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
          data: normalizeSubmissionObject(data)
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
        data: normalizeSubmissionObject(data)
      }), { status: 200, headers });
    }
  } catch (e) {}

  return new Response(JSON.stringify({
    success: true,
    source: 'empty',
    data: { kyu_ranking_reset_at: null, quiz_submissions: [], deletedQuizSubIds: [] }
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
    const rawIncoming = Array.isArray(body.quiz_submissions)
      ? body.quiz_submissions
      : (Array.isArray(body.submissions)
        ? body.submissions
        : (Array.isArray(body)
          ? body
          : (body.submission ? [body.submission] : [])));
    const incomingDeleted = Array.isArray(body.deletedQuizSubIds) ? body.deletedQuizSubIds : [];

    // Se não for admin, filtra para enviar apenas os simulados do próprio aluno logado
    const userRole = (auth.user.role || '').toLowerCase();
    let toProcessSubmissions = rawIncoming;

    if (userRole !== 'admin') {
      const userId = (auth.user.sub || auth.user.id || '').toLowerCase();
      const userNick = (auth.user.username || '').toLowerCase();
      toProcessSubmissions = rawIncoming.filter(s => {
        if (!s) return false;
        const sId = (s.studentId || '').toLowerCase();
        const sNick = (s.studentUsername || '').toLowerCase();
        const sUser = (s.username || '').toLowerCase();
        const sUId = (s.userId || '').toLowerCase();
        return (sId && (sId === userId || sId === userNick)) ||
               (sNick && (sNick === userNick || sNick === userId)) ||
               (sUser && (sUser === userNick || sUser === userId)) ||
               (sUId && (sUId === userId || sUId === userNick));
      });
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
    let existingDeleted = [];
    let kyuRankingResetAt = body.kyu_ranking_reset_at || null;

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
        const norm = normalizeSubmissionObject(parsed);
        existingSubmissions = norm.quiz_submissions;
        existingDeleted = norm.deletedQuizSubIds;
        if (norm.kyu_ranking_reset_at) {
          kyuRankingResetAt = norm.kyu_ranking_reset_at;
        }
      } catch (e) {}
    }

    const allDeleted = Array.from(new Set([...existingDeleted, ...incomingDeleted]));
    const delSet = new Set(allDeleted);

    const subMap = new Map();
    existingSubmissions.forEach(s => {
      if (!s) return;
      const id = s.id || (s.timestamp ? `${s.username}_${s.timestamp}` : null);
      if (id && !delSet.has(id)) subMap.set(id, s);
    });

    toProcessSubmissions.forEach(s => {
      if (!s) return;
      const id = s.id || (s.timestamp ? `${s.username}_${s.timestamp}` : `sub_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`);
      if (!delSet.has(id)) {
        subMap.set(id, { ...s, id });
      }
    });

    const finalSubmissions = Array.from(subMap.values()).slice(0, 500);
    const finalObject = {
      kyu_ranking_reset_at: kyuRankingResetAt,
      quiz_submissions: finalSubmissions,
      deletedQuizSubIds: allDeleted,
      updatedAt: new Date().toISOString()
    };

    const newContentStr = JSON.stringify(finalObject, null, 2);
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
