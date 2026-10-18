// functions/api/glossary.js
// Cloudflare Pages Function para o Dicionário Japonês de Karatê TKST

const REPO = 'albinokira-crypto/tkst-alunos';
const FILE_PATH = 'assets/data/glossary-custom.json';
const BRANCH = 'main';

import { getCorsHeaders, verifyAuth } from './_auth.js';

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
          'User-Agent': 'TKST-Cloudflare-Glossary/1.0'
        }
      });
      if (ghRes.ok) {
        const ghData = await ghRes.json();
        if (ghData && ghData.content) {
          const raw = fromBase64Utf8(ghData.content);
          const parsed = JSON.parse(raw);
          const glossaryData = (parsed && (parsed.custom_glossary || parsed.glossary)) || parsed || {};
          return new Response(JSON.stringify({
            success: true,
            source: 'github',
            sha: ghData.sha,
            data: glossaryData,
            custom_glossary: glossaryData,
            deletedGlossaryTerms: (parsed && parsed.deletedGlossaryTerms) || [],
            count: Object.keys(glossaryData).length
          }), { status: 200, headers });
        }
      }
    } catch (e) {
      console.warn('Erro ao consultar GitHub API para glossary:', e);
    }
  }

  // 2. Tentar via static assets do Cloudflare Pages
  if (env && env.ASSETS) {
    try {
      const assetRes = await env.ASSETS.fetch(new URL('/assets/data/glossary-custom.json', request.url));
      if (assetRes.ok) {
        const parsed = await assetRes.json();
        const glossaryData = (parsed && (parsed.custom_glossary || parsed.glossary)) || parsed || {};
        return new Response(JSON.stringify({
          success: true,
          source: 'cloudflare_assets',
          data: glossaryData,
          custom_glossary: glossaryData,
          deletedGlossaryTerms: (parsed && parsed.deletedGlossaryTerms) || [],
          count: Object.keys(glossaryData).length
        }), { status: 200, headers });
      }
    } catch (e) {}
  }

  // 3. Fallback: Raw GitHub
  try {
    const rawRes = await fetch(`https://raw.githubusercontent.com/${REPO}/${BRANCH}/${FILE_PATH}`);
    if (rawRes.ok) {
      const parsed = await rawRes.json();
      const glossaryData = (parsed && (parsed.custom_glossary || parsed.glossary)) || parsed || {};
      return new Response(JSON.stringify({
        success: true,
        source: 'raw_github',
        data: glossaryData,
        custom_glossary: glossaryData,
        deletedGlossaryTerms: (parsed && parsed.deletedGlossaryTerms) || [],
        count: Object.keys(glossaryData).length
      }), { status: 200, headers });
    }
  } catch (e) {}

  return new Response(JSON.stringify({
    success: true,
    source: 'fallback_empty',
    data: {},
    custom_glossary: {},
    deletedGlossaryTerms: [],
    count: 0
  }), { status: 200, headers });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = getCorsHeaders(env, request);

  // Verificação de autenticação: apenas admin pode alterar o glossário
  const auth = await verifyAuth(request, env, 'admin');
  if (!auth.authenticated) {
    return new Response(JSON.stringify({
      success: false,
      error: auth.error
    }), { status: 401, headers });
  }

  const token = (env && (env.GITHUB_TOKEN || env.GH_TOKEN)) || '';

  try {
    const body = await request.json().catch(() => ({}));
    const incomingData = body.custom_glossary || body.terms || body.data || body;
    const incomingDeleted = Array.isArray(body.deletedGlossaryTerms) ? body.deletedGlossaryTerms : [];

    if (!incomingData || typeof incomingData !== 'object') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Payload inválido.'
      }), { status: 400, headers });
    }

    if (!token) {
      return new Response(JSON.stringify({
        success: true,
        persisted: false,
        source: 'no_token_client_storage',
        count: Object.keys(incomingData).length,
        message: 'Termos recebidos com sucesso no cliente.'
      }), { status: 200, headers });
    }

    // Obter arquivo atual do GitHub
    let currentSha = null;
    let existingData = { custom_glossary: {}, deletedGlossaryTerms: [] };

    const getRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'TKST-Cloudflare-Glossary/1.0'
      }
    });

    if (getRes.ok) {
      const currentFile = await getRes.json();
      currentSha = currentFile.sha;
      try {
        existingData = JSON.parse(fromBase64Utf8(currentFile.content));
      } catch (e) {}
    }

    // Mesclar termos
    const baseGlossary = (existingData && (existingData.custom_glossary || existingData.glossary)) || {};
    const mergedGlossary = { ...baseGlossary, ...incomingData };

    // Remover termos deletados
    const deletedSet = new Set([
      ...((existingData && existingData.deletedGlossaryTerms) || []),
      ...incomingDeleted
    ]);
    deletedSet.forEach(term => {
      delete mergedGlossary[term];
      delete mergedGlossary[term.toLowerCase()];
    });

    const finalPayload = {
      custom_glossary: mergedGlossary,
      deletedGlossaryTerms: Array.from(deletedSet),
      updatedAt: new Date().toISOString()
    };

    const newContentStr = JSON.stringify(finalPayload, null, 2);
    const newBase64 = toBase64Utf8(newContentStr);

    const putRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'TKST-Cloudflare-Glossary/1.0'
      },
      body: JSON.stringify({
        message: `feat(glossary): atualizar dicionário japonês [Cloudflare auto-commit]`,
        content: newBase64,
        sha: currentSha || undefined,
        branch: BRANCH
      })
    });

    if (putRes.ok || putRes.status === 201) {
      return new Response(JSON.stringify({
        success: true,
        persisted: true,
        count: Object.keys(mergedGlossary).length,
        message: 'Dicionário japonês salvo com sucesso no GitHub!'
      }), { status: 200, headers: corsHeaders });
    } else {
      const err = await putRes.json().catch(() => ({}));
      return new Response(JSON.stringify({
        success: false,
        error: err.message || 'Falha ao commitar dicionário no GitHub'
      }), { status: 502, headers: corsHeaders });
    }
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
