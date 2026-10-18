// functions/api/kata-commit.js
// Cloudflare Pages Function para persistência dos vídeos dos 26 Kata no repositório GitHub

const REPO = 'albinokira-crypto/tkst-alunos';
const FILE_PATH = 'assets/data/kata-videos.json';
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

  if (token) {
    try {
      const ghRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'TKST-Cloudflare-Kata/1.0'
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
      console.warn('Erro ao consultar GitHub API para kata-videos:', e);
    }
  }

  // Fallback 1: Static assets do próprio Pages build
  if (env && env.ASSETS) {
    try {
      const assetRes = await env.ASSETS.fetch(new URL('/assets/data/kata-videos.json', request.url));
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

  // Fallback 2: Raw GitHub
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

  return new Response(JSON.stringify({ success: true, source: 'fallback_empty', data: {} }), {
    status: 200,
    headers
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = getCorsHeaders(env, request);

  // Verificação de autenticação: apenas admin pode alterar vídeos dos Kata
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
    const incomingVideos = (body && body.custom_videos) ? body.custom_videos : body;

    if (!incomingVideos || typeof incomingVideos !== 'object') {
      return new Response(JSON.stringify({
        success: false,
        message: 'Payload inválido. Envie um objeto custom_videos.'
      }), { status: 400, headers });
    }

    if (!token) {
      return new Response(JSON.stringify({
        success: true,
        persisted: false,
        source: 'no_token_client_storage',
        message: 'Vídeos recebidos. Configure GITHUB_TOKEN na Cloudflare para commit automático.'
      }), { status: 200, headers: corsHeaders });
    }

    // 1. Obter SHA atual do arquivo
    let currentSha = null;
    let existingVideos = {};
    const getRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'TKST-Cloudflare-Kata/1.0'
      }
    });

    if (getRes.ok) {
      const currentFile = await getRes.json();
      currentSha = currentFile.sha;
      try {
        existingVideos = JSON.parse(fromBase64Utf8(currentFile.content));
      } catch (e) {}
    }

    // 2. Mesclar vídeos
    const mergedVideos = { ...existingVideos, ...incomingVideos };
    const newContentStr = JSON.stringify(mergedVideos, null, 2);
    const newBase64 = toBase64Utf8(newContentStr);

    // 3. Commit no GitHub
    const putRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'TKST-Cloudflare-Kata/1.0'
      },
      body: JSON.stringify({
        message: `fix(katas): atualizar links de vídeos oficiais [Cloudflare auto-commit]`,
        content: newBase64,
        sha: currentSha || undefined,
        branch: BRANCH
      })
    });

    if (putRes.ok || putRes.status === 201) {
      const commitData = await putRes.json();
      return new Response(JSON.stringify({
        success: true,
        persisted: true,
        sha: commitData.content ? commitData.content.sha : null,
        message: 'Vídeos de Kata salvos com sucesso no GitHub!'
      }), { status: 200, headers: corsHeaders });
    } else {
      const errData = await putRes.json().catch(() => ({}));
      return new Response(JSON.stringify({
        success: false,
        error: errData.message || 'Falha ao commitar vídeos no GitHub'
      }), { status: 502, headers: corsHeaders });
    }
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
