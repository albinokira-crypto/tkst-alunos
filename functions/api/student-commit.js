// functions/api/student-commit.js
// Cloudflare Pages Function para persistência e consulta da base de alunos
// Protegido por Token de Sessão HMAC-SHA256 (role: admin)

import { getCorsHeaders, verifyAuth, sanitizeStudent } from './_auth.js';

const REPO = 'albinokira-crypto/tkst-alunos';
const FILE_PATH = 'assets/data/students.json';
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

function sanitizeStudentData(data) {
  if (!data || typeof data !== 'object') return { students: [], deletedStudentIds: [] };
  const students = Array.isArray(data.students) ? data.students.map(sanitizeStudent).filter(Boolean) : [];
  return {
    ...data,
    students
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
          'User-Agent': 'TKST-Cloudflare-StudentCommit/1.0'
        }
      });
      if (ghRes.ok) {
        const ghData = await ghRes.json();
        if (ghData && ghData.content) {
          const raw = fromBase64Utf8(ghData.content);
          const parsed = JSON.parse(raw);
          return new Response(JSON.stringify({
            success: true,
            source: 'github',
            sha: ghData.sha,
            data: sanitizeStudentData(parsed)
          }), { status: 200, headers });
        }
      }
    } catch (e) {
      console.warn('Erro ao consultar GitHub API para students:', e);
    }
  }

  // 2. Tentar via Cloudflare Pages static assets
  if (env && env.ASSETS) {
    try {
      const assetRes = await env.ASSETS.fetch(new URL('/assets/data/students.json', request.url));
      if (assetRes.ok) {
        const data = await assetRes.json();
        return new Response(JSON.stringify({
          success: true,
          source: 'cloudflare_assets',
          data: sanitizeStudentData(data)
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
        data: sanitizeStudentData(data)
      }), { status: 200, headers });
    }
  } catch (e) {}

  return new Response(JSON.stringify({
    success: true,
    source: 'empty',
    data: { students: [], deletedStudentIds: [] }
  }), { status: 200, headers });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = getCorsHeaders(env, request);

  // Verificação de autenticação: apenas admin pode gerenciar alunos no servidor
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
    const incomingStudents = Array.isArray(body.students) ? body.students : (body.student ? [body.student] : []);
    const incomingDeleted = Array.isArray(body.deletedStudentIds) ? body.deletedStudentIds : [];

    if (!token) {
      return new Response(JSON.stringify({
        success: true,
        persisted: false,
        source: 'no_token_client_storage',
        message: 'Alunos recebidos no cliente. Para autocommit configure GITHUB_TOKEN.'
      }), { status: 200, headers });
    }

    // 1. Obter arquivo atual do GitHub
    let currentSha = null;
    let currentData = { students: [], deletedStudentIds: [] };

    const getRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'TKST-Cloudflare-StudentCommit/1.0'
      }
    });

    if (getRes.ok) {
      const currentFile = await getRes.json();
      currentSha = currentFile.sha;
      try {
        currentData = JSON.parse(fromBase64Utf8(currentFile.content));
      } catch (e) {}
    }

    // 2. Mesclar deleted IDs
    const deletedSet = new Set(currentData.deletedStudentIds || []);
    incomingDeleted.forEach(id => deletedSet.add(id));

    // 3. Mesclar alunos (preservando hashes e nunca salvando senha em texto plano)
    const studentMap = new Map();
    (currentData.students || []).forEach(s => {
      if (s && s.id && !deletedSet.has(s.id)) {
        studentMap.set(s.id, s);
      }
    });

    incomingStudents.forEach(s => {
      if (!s || !s.id || deletedSet.has(s.id)) return;
      const studentObj = { ...s };
      delete studentObj.password;
      delete studentObj.phone;

      if (studentObj.status === 'pending') {
        studentObj.status = 'approved';
        studentObj.approvedAt = studentObj.approvedAt || new Date().toISOString();
      }

      const existing = studentMap.get(s.id);
      if (!existing) {
        studentMap.set(s.id, studentObj);
      } else {
        studentMap.set(s.id, {
          ...existing,
          ...studentObj,
          passwordHash: existing.passwordHash || studentObj.passwordHash,
          passwordSalt: existing.passwordSalt || studentObj.passwordSalt
        });
      }
    });

    const finalPayload = {
      students: Array.from(studentMap.values()),
      deletedStudentIds: Array.from(deletedSet),
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
        'User-Agent': 'TKST-Cloudflare-StudentCommit/1.0'
      },
      body: JSON.stringify({
        message: `chore(sync): atualizar base de alunos (${incomingStudents.length} alterados) [skip ci]`,
        content: newBase64,
        sha: currentSha,
        branch: BRANCH
      })
    });

    if (putRes.ok) {
      const putData = await putRes.json();
      return new Response(JSON.stringify({
        success: true,
        persisted: true,
        source: 'github',
        commitSha: putData.commit && putData.commit.sha,
        updatedCount: incomingStudents.length
      }), { status: 200, headers });
    } else {
      const errText = await putRes.text();
      return new Response(JSON.stringify({
        success: false,
        persisted: false,
        error: 'Falha ao salvar no GitHub: ' + errText
      }), { status: 502, headers });
    }

  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Erro interno ao processar alunos: ' + err.message
    }), { status: 500, headers });
  }
}
