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

  // 1. Verificação de autenticação resiliente (permite uso didático no app do Sensei/Alunos)
  const authHeader = request.headers.get('Authorization') || '';
  if (authHeader && authHeader !== 'Bearer' && authHeader !== 'Bearer null' && authHeader !== 'Bearer undefined') {
    const auth = await verifyAuth(request, env);
    if (!auth.authenticated && auth.error && auth.error.includes('Acesso negado')) {
      return new Response(JSON.stringify({
        success: false,
        error: auth.error
      }), { status: 403, headers });
    }
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
    const prompt = `Você é o avaliador oficial e especialista em leitura óptica e visão computacional de exames teóricos de Karatê Shotokan (TKST).
Analise com extrema precisão a imagem fornecida da Prova Teórica / Cartão de Respostas.

IMPORTANTE SOBRE A IMAGEM:
- A foto pode conter o "CARTÃO DE RESPOSTAS" aproximado OU a folha inteira A4 (com cabeçalho, dados do aluno e o cartão no canto superior direito).
- Pode haver sombras, iluminação irregular, ligeira inclinação ou foto tirada na vertical ou horizontal.
- O Cartão de Respostas oficial possui 10 questões numeradas de 1 a 10 (ou 01 a 10).
- Cada questão possui 4 opções em formato de bolhas ou quadradinhos: [A], [B], [C] e [D].

INSTRUÇÕES RIGOROSAS:
1. ATENÇÃO MÁXIMA PARA MARCAÇÕES A LÁPIS (GRAFITE): Muitos alunos respondem usando lápis comum, que gera grafite cinza claro ou médio, traços diagonais, X ou preenchimento parcial. Você DEVE identificar com precisão as alternativas preenchidas a lápis, mesmo com grafite claro ou reflexos de luz. Se houver qualquer marcação intencional de lápis ou caneta em uma alternativa, considere-a marcada.
2. Para cada questão de 1 a 10, determine qual opção (A, B, C ou D) o aluno marcou.
3. Se a questão estiver sem nenhuma marcação visível (em branco), defina "answer": null, "doubt": false e "confidence": 0.95.
4. Se houver rasura evidente (ex: uma opção riscada e outra preenchida, ou tentativa de apagar com borracha), defina "answer" com a opção que representa a intenção final do aluno, "doubt": true e "confidence": 0.50.
5. Se houver dúvida real entre duas marcações fortes e não for possível decidir, defina "answer" com a mais escura, "doubt": true e "confidence": 0.45.
6. Se a marcação estiver limpa e clara, defina "doubt": false e "confidence": 0.95.
7. Se for visível o Código da Prova (código alfanumérico como "AB12C" ou "TKST-XXXXX") no cabeçalho ou etiqueta, extraia-o no campo "examCode".
8. Se for visível o nome do aluno ou matrícula no cabeçalho da prova, extraia-o no campo "studentName".

Retorne EXCLUSIVAMENTE um objeto JSON válido, sem texto explicativo e sem formatação markdown:
{
  "examCode": "${examCode || ''}",
  "studentName": "",
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

    const candidateModels = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.0-flash'];
    let geminiRes = null;
    let successfulModel = '';
    let lastError = '';

    for (const model of candidateModels) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;
        const resp = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(geminiPayload)
        });

        if (resp.status === 200) {
          geminiRes = resp;
          successfulModel = model;
          break;
        } else if (resp.status === 404) {
          lastError = `Modelo ${model} não disponível (404)`;
          continue;
        } else {
          const txt = await resp.text().catch(() => '');
          lastError = `Status ${resp.status}: ${txt.slice(0, 150)}`;
        }
      } catch(err) {
        lastError = err.message;
      }
    }

    if (!geminiRes) {
      return new Response(JSON.stringify({
        success: false,
        geminiAvailable: true,
        error: `Não foi possível comunicar com o Gemini Vision (${lastError})`
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

    const detectedExamCode = (parsedResult.examCode && parsedResult.examCode.trim()) || examCode;
    const studentName = parsedResult.studentName || '';

    return new Response(JSON.stringify({
      success: true,
      geminiAvailable: true,
      provider: successfulModel,
      examCode: detectedExamCode,
      studentName: studentName,
      overallConfidence: typeof parsedResult.overallConfidence === 'number' ? parsedResult.overallConfidence : 0.95,
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
