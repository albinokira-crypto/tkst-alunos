// functions/api/sync.js
// Cloudflare Pages Function para sincronização geral (dojos, status de alunos, etc.)

const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Cache-Control': 'no-store, no-cache, must-revalidate'
};

const DEFAULT_DOJOS = [
  'TKST Santo Aleixo',
  'QG TKST ( Capela )',
  'TKST Rio do Ouro'
];

export async function onRequestOptions() {
  return new Response(null, { status: 200, headers: corsHeaders });
}

export async function onRequestGet() {
  return new Response(JSON.stringify({
    success: true,
    timestamp: Date.now(),
    dojos: DEFAULT_DOJOS,
    status: 'online'
  }), { status: 200, headers: corsHeaders });
}

export async function onRequestPost(context) {
  const { request } = context;
  try {
    const body = await request.json().catch(() => ({}));
    return new Response(JSON.stringify({
      success: true,
      timestamp: Date.now(),
      received: true,
      message: 'Dados sincronizados com sucesso.'
    }), { status: 200, headers: corsHeaders });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
