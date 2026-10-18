// functions/api/sync.js
// Cloudflare Pages Function para sincronização geral (dojos, status de alunos, quiz bank, etc.)
// Protegido por Token de Sessão HMAC-SHA256

import { getCorsHeaders, verifyAuth, sanitizeStudent } from './_auth.js';

const DEFAULT_DOJOS = [
  'TKST Santo Aleixo',
  'QG TKST ( Capela )',
  'TKST Rio do Ouro'
];

let inMemoryState = {
  dojos: DEFAULT_DOJOS,
  custom_quiz_bank: []
};

export async function onRequestOptions(context) {
  const { request, env } = context;
  return new Response(null, { status: 200, headers: getCorsHeaders(env, request) });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const headers = getCorsHeaders(env, request);

  return new Response(JSON.stringify({
    success: true,
    timestamp: Date.now(),
    data: inMemoryState,
    dojos: inMemoryState.dojos || DEFAULT_DOJOS,
    status: 'online'
  }), { status: 200, headers });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = getCorsHeaders(env, request);

  // Verificação de autenticação: usuário autenticado
  const auth = await verifyAuth(request, env);
  if (!auth.authenticated) {
    return new Response(JSON.stringify({
      success: false,
      error: auth.error
    }), { status: 401, headers });
  }

  try {
    const body = await request.json().catch(() => ({}));
    if (body && typeof body === 'object') {
      const sanitizedBody = { ...body };
      if (Array.isArray(sanitizedBody.students)) {
        sanitizedBody.students = sanitizedBody.students.map(sanitizeStudent).filter(Boolean);
      }
      inMemoryState = { ...inMemoryState, ...sanitizedBody, timestamp: Date.now() };
    }
    return new Response(JSON.stringify({
      success: true,
      timestamp: Date.now(),
      received: true,
      message: 'Dados sincronizados com sucesso.'
    }), { status: 200, headers });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers
    });
  }
}
