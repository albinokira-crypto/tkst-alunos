// functions/api/quiz-bank.js
// Cloudflare Pages Function para consulta e persistência do Banco de Questões do Simulado

const REPO = 'albinokira-crypto/tkst-alunos';
const FILE_PATH = 'assets/js/data-quiz.js';
const BRANCH = 'main';
const MARKER_START = '// ==TKST_CUSTOM_QUESTIONS_START==';
const MARKER_END = '// ==TKST_CUSTOM_QUESTIONS_END==';

import { getCorsHeaders, verifyAuth } from './_auth.js';

let inMemoryQuizBank = null;

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

function extractQuestionsFromScript(scriptText) {
  if (!scriptText) return [];
  const startIdx = scriptText.indexOf(MARKER_START);
  const endIdx = scriptText.indexOf(MARKER_END);
  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) return [];

  const block = scriptText.slice(startIdx + MARKER_START.length, endIdx).trim();
  if (!block) return [];

  try {
    const cleanBlock = '[' + block.replace(/,\s*$/, '') + ']';
    const parsed = JSON.parse(cleanBlock);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

export async function onRequestOptions(context) {
  const { request, env } = context;
  return new Response(null, { status: 200, headers: getCorsHeaders(env, request) });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const headers = getCorsHeaders(env, request);
  const token = (env && (env.GITHUB_TOKEN || env.GH_TOKEN)) || '';

  if (inMemoryQuizBank && Array.isArray(inMemoryQuizBank) && inMemoryQuizBank.length > 0) {
    return new Response(JSON.stringify({
      success: true,
      source: 'memory_cache',
      count: inMemoryQuizBank.length,
      data: inMemoryQuizBank,
      editedMap: inMemoryEditedMap || {}
    }), { status: 200, headers });
  }

  // 1. Tentar via GitHub API
  if (token) {
    try {
      const ghRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'TKST-Cloudflare-QuizBank/1.0'
        }
      });
      if (ghRes.ok) {
        const ghData = await ghRes.json();
        if (ghData && ghData.content) {
          const raw = fromBase64Utf8(ghData.content);
          const questions = extractQuestionsFromScript(raw);
          if (questions.length > 0) {
            return new Response(JSON.stringify({
              success: true,
              source: 'github',
              count: questions.length,
              data: questions
            }), { status: 200, headers });
          }
        }
      }
    } catch (e) {
      console.warn('Erro ao consultar GitHub API para quiz-bank:', e);
    }
  }

  // 2. Tentar via Cloudflare Pages static assets
  if (env && env.ASSETS) {
    try {
      const assetRes = await env.ASSETS.fetch(new URL('/assets/js/data-quiz.js', request.url));
      if (assetRes.ok) {
        const raw = await assetRes.text();
        const questions = extractQuestionsFromScript(raw);
        if (questions.length > 0) {
          return new Response(JSON.stringify({
            success: true,
            source: 'cloudflare_assets',
            count: questions.length,
            data: questions
          }), { status: 200, headers });
        }
      }
    } catch (e) {}
  }

  // 3. Fallback: Raw GitHub
  try {
    const rawRes = await fetch(`https://raw.githubusercontent.com/${REPO}/${BRANCH}/${FILE_PATH}`);
    if (rawRes.ok) {
      const raw = await rawRes.text();
      const questions = extractQuestionsFromScript(raw);
      return new Response(JSON.stringify({
        success: true,
        source: 'raw_github',
        count: questions.length,
        data: questions
      }), { status: 200, headers });
    }
  } catch (e) {}

  return new Response(JSON.stringify({
    success: true,
    source: 'empty',
    count: 0,
    data: []
  }), { status: 200, headers });
}

let inMemoryEditedMap = {};

export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = getCorsHeaders(env, request);

  // Verificação de autenticação resiliente: permite mesma origem do app
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
    if (!Array.isArray(incoming)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Payload inválido: esperado array de questões.'
      }), { status: 400, headers });
    }

    if (incoming.length > 0) {
      inMemoryQuizBank = incoming;
    }

    if (body.editedMap && typeof body.editedMap === 'object') {
      inMemoryEditedMap = { ...inMemoryEditedMap, ...body.editedMap };
    }

    if (!token) {
      return new Response(JSON.stringify({
        success: true,
        persisted: false,
        source: 'no_token_client_storage',
        count: incoming.length,
        editedCount: Object.keys(inMemoryEditedMap).length,
        message: 'Questões salvas no cliente. Para autocommit configure GITHUB_TOKEN.'
      }), { status: 200, headers });
    }

    // 1. Obter arquivo atual do GitHub
    let currentSha = null;
    let fileContent = '';

    const getRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'TKST-Cloudflare-QuizBank/1.0'
      }
    });

    if (getRes.ok) {
      const currentFile = await getRes.json();
      currentSha = currentFile.sha;
      fileContent = fromBase64Utf8(currentFile.content);
    } else {
      return new Response(JSON.stringify({
        success: false,
        error: 'Não foi possível ler assets/js/data-quiz.js no GitHub.'
      }), { status: 502, headers });
    }

    const startIdx = fileContent.indexOf(MARKER_START);
    const endIdx = fileContent.indexOf(MARKER_END);
    if (startIdx === -1 || endIdx === -1) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Marcadores de custom questions não encontrados no repositório.'
      }), { status: 500, headers });
    }

    // 2. Extrair questões existentes e mesclar
    const existing = extractQuestionsFromScript(fileContent);
    const bankMap = new Map();
    existing.forEach(q => { if (q && q.id) bankMap.set(q.id, q); });
    incoming.forEach(q => {
      if (q && q.id) {
        const prev = bankMap.get(q.id);
        bankMap.set(q.id, { ...(prev || {}), ...q, image: q.image || (prev && prev.image) || '' });
      }
    });

    const deletedIds = new Set(Array.isArray(body.deletedQuizIds) ? body.deletedQuizIds : []);
    const merged = Array.from(bankMap.values()).filter(q => !deletedIds.has(q.id));

    // Formatar bloco de questões
    const serializedLines = merged.map(q => '  ' + JSON.stringify(q)).join(',\n');
    const newFileContent = fileContent.slice(0, startIdx + MARKER_START.length) +
      '\n' + serializedLines + '\n  ' +
      fileContent.slice(endIdx);

    const newBase64 = toBase64Utf8(newFileContent);

    // 3. Commit no GitHub
    const putRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'TKST-Cloudflare-QuizBank/1.0'
      },
      body: JSON.stringify({
        message: `feat(quiz): atualizar banco de questões customizadas [Cloudflare auto-commit]`,
        content: newBase64,
        sha: currentSha,
        branch: BRANCH
      })
    });

    if (putRes.ok || putRes.status === 201) {
      return new Response(JSON.stringify({
        success: true,
        persisted: true,
        count: merged.length,
        message: 'Banco de questões salvo com sucesso no GitHub!'
      }), { status: 200, headers });
    } else {
      const err = await putRes.json().catch(() => ({}));
      return new Response(JSON.stringify({
        success: false,
        error: err.message || 'Falha ao commitar quiz bank no GitHub'
      }), { status: 502, headers });
    }
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers
    });
  }
}
