// functions/api/exam-correct.js
// Cloudflare Pages Function para Correção de Provas com Gemini Vision (Multi-modal)
// Runtime: Cloudflare Workers (fetch nativo, sem módulos Node.js)

import { getCorsHeaders, verifyAuth } from './_auth.js';

export async function onRequestOptions(context) {
  const { request, env } = context;
  return new Response(null, { status: 200, headers: getCorsHeaders(env, request) });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const headers = getCorsHeaders(env, request);

  // 1. Verificação de autenticação (Sensei ou Aluno autenticado)
  const auth = await verifyAuth(request, env);
  if (!auth.authenticated) {
    return new Response(JSON.stringify({
      success: false,
      error: auth.error || 'Autenticação necessária para correção de provas.'
    }), { status: 401, headers });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const imageBase64 = body.imageBase64 || body.image || '';
    const mimeType = body.mimeType || 'image/jpeg';
    const examCode = body.examCode || '';
    const kyu = body.kyu || body.beltLevel || null;
    const expectedKey = body.expectedKey || null; // ex: ["A","B","C","D","A","B","C","D","A","B"]

    if (!imageBase64 || typeof imageBase64 !== 'string' || imageBase64.length < 50) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Imagem da prova inválida ou ausente (esperado base64).'
      }), { status: 400, headers });
    }

    // Limpa prefixo data:image/...;base64, se presente
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');

    const geminiApiKey = (env && (env.GEMINI_API_KEY || env.GEMINI_KEY || env.GOOGLE_API_KEY)) || '';

    if (!geminiApiKey) {
      return new Response(JSON.stringify({
        success: false,
        geminiAvailable: false,
        message: 'Chave GEMINI_API_KEY não configurada no Cloudflare. O OMR nativo local do cliente será utilizado como motor primário.'
      }), { status: 200, headers });
    }

    // 2. Monta o Prompt Estruturado para o Gemini Vision com Temperature 0
    const prompt = `Você é o avaliador oficial e inspetor técnico de exames teóricos de Karatê Shotokan (TKST).
Analise com extrema precisão a imagem do Cartão de Respostas da Prova Teórica.
O cartão possui exatamente 10 questões numeradas de 1 a 10 (ou 01 a 10).
Cada questão possui 4 opções em formato de quadradinhos ou bolhas: [A], [B], [C], [D].

INSTRUÇÕES RIGOROSAS:
1. Para cada questão de 1 a 10, determine qual opção (A, B, C ou D) o aluno preencheu/marcou com caneta ou lápis.
2. Se a questão estiver sem nenhuma marcação visível (em branco), defina answer como null, doubt como false e confidence em 0.95.
3. Se houver rasura evidente (ex: uma opção riscada com X e outra preenchida, ou tentativa de apagar), marque answer com a opção que representa a intenção final do aluno, mas defina doubt como true e reduza a confidence (ex: 0.45 a 0.60).
4. Se houver dúvida real entre duas marcações fortes e não for possível decidir, marque answer com a mais escura, doubt como true e confidence baixa.
5. Se a marcação estiver limpa e clara, defina doubt como false e confidence alta (0.90 a 1.00).
6. Localize também o código da prova se estiver visível no cabeçalho (ex: 5 caracteres como "AB12C").

Retorne a resposta estritamente no formato JSON abaixo, sem formatação markdown e sem texto antes ou depois:
{
  "examCode": "${examCode || ''}",
  "overallConfidence": 0.95,
  "questions": [
    { "num": 1, "answer": "A", "confidence": 0.98, "doubt": false, "notes": "" },
    { "num": 2, "answer": "B", "confidence": 0.95, "doubt": false, "notes": "" },
    { "num": 3, "answer": "C", "confidence": 0.90, "doubt": false, "notes": "" },
    { "num": 4, "answer": "D", "confidence": 0.92, "doubt": false, "notes": "" },
    { "num": 5, "answer": "A", "confidence": 0.88, "doubt": false, "notes": "" },
    { "num": 6, "answer": "B", "confidence": 0.94, "doubt": false, "notes": "" },
    { "num": 7, "answer": "C", "confidence": 0.91, "doubt": false, "notes": "" },
    { "num": 8, "answer": "D", "confidence": 0.89, "doubt": false, "notes": "" },
    { "num": 9, "answer": "A", "confidence": 0.96, "doubt": false, "notes": "" },
    { "num": 10, "answer": "B", "confidence": 0.95, "doubt": false, "notes": "" }
  ]
}`;

    // 3. Chamada à API do Gemini Vision (Model: gemini-1.5-flash com fallback)
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;

    const geminiPayload = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: mimeType.includes('png') ? 'image/png' : 'image/jpeg',
                data: cleanBase64
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0,
        response_mime_type: 'application/json'
      }
    };

    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(geminiPayload)
    });

    if (!geminiRes.ok) {
      const errorText = await geminiRes.text().catch(() => '');
      return new Response(JSON.stringify({
        success: false,
        geminiAvailable: true,
        error: `Erro ao consultar Gemini Vision API (${geminiRes.status}): ${errorText.slice(0, 200)}`
      }), { status: 502, headers });
    }

    const geminiData = await geminiRes.json();
    let candidateText = '';
    try {
      candidateText = geminiData.candidates[0].content.parts[0].text;
    } catch(e) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Resposta vazia ou inválida retornada pelo Gemini Vision.'
      }), { status: 502, headers });
    }

    // Remove eventuais blocos markdown ```json ... ``` se o modelo incluir
    const cleanJsonText = candidateText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    let parsedResult = null;
    try {
      parsedResult = JSON.parse(cleanJsonText);
    } catch(err) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Falha ao decodificar JSON retornado pelo Gemini Vision.',
        raw: cleanJsonText
      }), { status: 502, headers });
    }

    // 4. Normalização e validação das 10 questões
    const questions = [];
    for (let i = 1; i <= 10; i++) {
      const found = Array.isArray(parsedResult.questions)
        ? parsedResult.questions.find(q => Number(q.num || q.questionNumber) === i)
        : null;

      let ans = found && found.answer ? String(found.answer).toUpperCase().trim() : null;
      if (!['A', 'B', 'C', 'D'].includes(ans)) ans = null;

      const conf = found && typeof found.confidence === 'number' ? Math.max(0, Math.min(1, found.confidence)) : 0.85;
      const doubt = found ? Boolean(found.doubt) : false;
      const notes = found && found.notes ? String(found.notes) : '';

      questions.push({
        num: i,
        answer: ans,
        confidence: conf,
        doubt: doubt,
        notes: notes
      });
    }

    return new Response(JSON.stringify({
      success: true,
      geminiAvailable: true,
      provider: 'gemini-1.5-flash',
      examCode: parsedResult.examCode || examCode,
      overallConfidence: typeof parsedResult.overallConfidence === 'number' ? parsedResult.overallConfidence : 0.92,
      questions,
      timestamp: Date.now()
    }), { status: 200, headers });

  } catch(err) {
    return new Response(JSON.stringify({
      success: false,
      error: err.message || 'Erro interno no processamento de correção de prova.'
    }), { status: 500, headers });
  }
}
