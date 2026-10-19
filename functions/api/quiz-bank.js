// functions/api/quiz-bank.js
// Cloudflare Pages Function para consulta e persistência do Banco de Questões do Simulado
// Opera diretamente sobre o banco online permanente assets/data/quiz-custom.json

const REPO = 'albinokira-crypto/tkst-alunos';
const CUSTOM_FILE_PATH = 'assets/data/quiz-custom.json';
const BRANCH = 'main';

import { getCorsHeaders, verifyAuth } from './_auth.js';

let inMemoryCustomData = null;
let lastFetch = 0;

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
  const now = Date.now();

  // Cache em memória
  if (inMemoryCustomData && (now - lastFetch < 15000)) {
    return new Response(JSON.stringify({
      success: true,
      source: 'memory_cache',
      data: inMemoryCustomData.customQuestions || [],
      customQuestions: inMemoryCustomData.customQuestions || [],
      editedMap: inMemoryCustomData.editedQuestions || {},
      deletedQuizIds: inMemoryCustomData.deletedQuizIds || []
    }), { status: 200, headers });
  }

  // 1. Tentar via GitHub API
  if (token) {
    try {
      const ghRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${CUSTOM_FILE_PATH}?ref=${BRANCH}`, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'TKST-Cloudflare-QuizBank/2.0'
        }
      });
      if (ghRes.ok) {
        const ghData = await ghRes.json();
        if (ghData && ghData.content) {
          const raw = fromBase64Utf8(ghData.content);
          const parsed = JSON.parse(raw);
          inMemoryCustomData = parsed;
          lastFetch = now;
          return new Response(JSON.stringify({
            success: true,
            source: 'github',
            data: parsed.customQuestions || [],
            customQuestions: parsed.customQuestions || [],
            editedMap: parsed.editedQuestions || {},
            deletedQuizIds: parsed.deletedQuizIds || []
          }), { status: 200, headers });
        }
      }
    } catch (e) {
      console.warn('Erro ao consultar GitHub API para quiz-bank:', e);
    }
  }

  // 2. Tentar via Raw GitHub
  try {
    const rawRes = await fetch(`https://raw.githubusercontent.com/${REPO}/${BRANCH}/${CUSTOM_FILE_PATH}?_=${Date.now()}`);
    if (rawRes.ok) {
      const parsed = await rawRes.json();
      inMemoryCustomData = parsed;
      lastFetch = now;
      return new Response(JSON.stringify({
        success: true,
        source: 'raw_github',
        data: parsed.customQuestions || [],
        customQuestions: parsed.customQuestions || [],
        editedMap: parsed.editedQuestions || {},
        deletedQuizIds: parsed.deletedQuizIds || []
      }), { status: 200, headers });
    }
  } catch (e) {}

  return new Response(JSON.stringify({
    success: true,
    source: 'empty',
    data: [],
    customQuestions: [],
    editedMap: {},
    deletedQuizIds: []
  }), { status: 200, headers });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = getCorsHeaders(env, request);

  const authHeader = request.headers.get('Authorization') || '';
  if (authHeader && authHeader !== 'Bearer' && authHeader !== 'Bearer null' && authHeader !== 'Bearer undefined') {
    const auth = await verifyAuth(request, env, 'admin');
    if (!auth.authenticated && auth.error && auth.error.includes('Acesso negado')) {
      return new Response(JSON.stringify({
        success: false,
        error: auth.error
      }), { status: 403, headers });
    }
  }

  const token = (env && (env.GITHUB_TOKEN || env.GH_TOKEN)) || '';

  try {
    const body = await request.json().catch(() => ({}));
    const incoming = body.customQuestions || body.questions || body.bank || body.data || (Array.isArray(body) ? body : []);
    const incomingDeleted = Array.isArray(body.deletedQuizIds) ? body.deletedQuizIds : [];
    const incomingEdited = (body.editedMap && typeof body.editedMap === 'object') ? body.editedMap : {};

    // 1. Obter arquivo atual do GitHub
    let currentSha = null;
    let currentData = { customQuestions: [], editedQuestions: {}, deletedQuizIds: [] };

    if (token) {
      try {
        const getRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${CUSTOM_FILE_PATH}?ref=${BRANCH}`, {
          headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'TKST-Cloudflare-QuizBank/2.0'
          }
        });

        if (getRes.ok) {
          const currentFile = await getRes.json();
          currentSha = currentFile.sha;
          currentData = JSON.parse(fromBase64Utf8(currentFile.content));
        }
      } catch (e) {}
    }

    // 2. Mesclar
    const deletedSet = new Set(Array.isArray(currentData.deletedQuizIds) ? currentData.deletedQuizIds : []);
    incomingDeleted.forEach(id => deletedSet.add(id));
    const finalDeleted = Array.from(deletedSet);

    const qMap = new Map();
    (Array.isArray(currentData.customQuestions) ? currentData.customQuestions : []).forEach(q => {
      if (q && q.id && !deletedSet.has(q.id)) qMap.set(q.id, q);
    });

    if (Array.isArray(incoming)) {
      incoming.forEach(q => {
        if (!q || !q.id || deletedSet.has(q.id)) return;
        const prev = qMap.get(q.id);
        qMap.set(q.id, prev ? { ...prev, ...q } : q);
      });
    }

    const finalEdited = {
      ...(currentData.editedQuestions || {}),
      ...incomingEdited
    };
    finalDeleted.forEach(id => { delete finalEdited[id]; });

    const finalQuestions = Array.from(qMap.values());
    const updatedPayload = {
      customQuestions: finalQuestions,
      editedQuestions: finalEdited,
      deletedQuizIds: finalDeleted,
      updatedAt: Date.now()
    };

    inMemoryCustomData = updatedPayload;
    lastFetch = Date.now();

    // 3. Commit no GitHub se token configurado
    if (token) {
      const newBase64 = toBase64Utf8(JSON.stringify(updatedPayload, null, 2));
      const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

      const putBody = {
        message: `feat(quiz): atualizar ${finalQuestions.length} questões [Cloudflare auto-commit ${now}]`,
        content: newBase64,
        branch: BRANCH
      };
      if (currentSha) putBody.sha = currentSha;

      const putRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${CUSTOM_FILE_PATH}`, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'TKST-Cloudflare-QuizBank/2.0'
        },
        body: JSON.stringify(putBody)
      });

      if (putRes.ok || putRes.status === 201) {
        return new Response(JSON.stringify({
          success: true,
          persisted: true,
          count: finalQuestions.length,
          data: finalQuestions,
          message: 'Banco de questões salvo com sucesso no GitHub!'
        }), { status: 200, headers });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      persisted: false,
      count: finalQuestions.length,
      data: finalQuestions,
      message: 'Questões atualizadas em memória e no cliente.'
    }), { status: 200, headers });

  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers
    });
  }
}
