// functions/api/grade-exam.js
// Cloudflare Pages Function para correção automatizada de provas de karatê via Gemini Multimodal Vision

function decodeCompactExamCode(codeStr) {
  if (!codeStr) return null;
  const cleanRaw = String(codeStr).replace(/^#/, '').replace(/^C[OÓ]DIGO:?\s*/i, '').trim().toUpperCase();
  const parts = cleanRaw.split('-');
  const clean = parts[0].replace(/[^0-9A-Z]/g, '').slice(0, 5);
  const studentTag = parts.length > 1 ? parts.slice(1).join('-') : null;
  if (clean.length < 4) return null;
  try {
    const totalVal = parseInt(clean, 36);
    if (isNaN(totalVal) || totalVal < 0) return null;
    const kyuIdx = Math.floor(totalVal / 1048576);
    const ansVal = totalVal % 1048576;
    const kyuList = [6, 5, 4, 3, 2, 1, 0, -1, -2];
    const kyu = kyuList[kyuIdx] !== undefined ? kyuList[kyuIdx] : 6;
    const answers = [];
    for (let i = 0; i < 10; i++) {
      const val = (Math.floor(ansVal / Math.pow(4, i))) % 4;
      answers.push(['A', 'B', 'C', 'D'][val]);
    }
    return { kyu, answers, examId: clean, fullExamId: clean, studentTag: studentTag };
  } catch(e) {
    return null;
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };

  try {
    const body = await request.json().catch(() => ({}));
    const { image, answerKey, kyu, examId, step, apiKey: clientApiKey } = body;

    if (!image) {
      return new Response(JSON.stringify({ success: false, error: 'Imagem da prova não fornecida.' }), {
        status: 400,
        headers: corsHeaders
      });
    }

    const officialKey = Array.isArray(answerKey) ? answerKey : [];
    const FALLBACK_KEY = atob('QVEuQWI4Uk42SlhPWlZOaHdwNC02WEg0bXFKOHRRMWpBT25Fdnl3VkNKTnIzZzBZWEJLYVE=');
    const apiKey = (env && env.GEMINI_API_KEY) || clientApiKey || FALLBACK_KEY;

    let base64Data = image;
    let mimeType = 'image/jpeg';
    if (typeof image === 'string' && image.includes(';base64,')) {
      const parts = image.split(';base64,');
      if (parts[0].startsWith('data:')) {
        mimeType = parts[0].replace('data:', '').trim() || 'image/jpeg';
      }
      base64Data = parts[1].replace(/[\r\n\s]/g, '');
    } else if (typeof image === 'string') {
      base64Data = image.replace(/[\r\n\s]/g, '');
    }

    let promptText = '';
    if (step === 'code' || step === 'badge') {
      promptText = `
Você é um especialista em OCR e visão computacional de alta precisão.
Esta foto mostra o badge com o CÓDIGO de 5 caracteres alfanuméricos de uma avaliação de karatê (fundo preto e letras brancas no cabeçalho, por exemplo: "CÓDIGO: 0IZ96", "0IZ96", "#0IZ96", "5M4X7", "1M2OS").
Também pode conter próximo o campo "Nome:" com o nome do aluno impresso ou escrito.

SUA TAREFA:
1. Extrair os 5 caracteres alfanuméricos que formam o código da prova (ignore palavras como "CÓDIGO", "CODIGO", "PROVA", "#", espaços e dois-pontos).
2. Se visível na foto, extrair o Nome do Aluno no campo "Nome:".

Retorne estritamente um JSON no seguinte formato:
{
  "codigo_prova": "0IZ96",
  "examId": "0IZ96",
  "aluno": "Nome do Aluno (ou string vazia se não visível)"
}
`.trim();
    } else if (Number(step) === 1) {
      promptText = `
Você é um desenvolvedor sênior especialista em visão computacional e correção de avaliações de karatê.
Esta foto mostra especificamente o CABEÇALHO oficial da prova de karatê, composto por:
- LADO ESQUERDO:
  1. Código da Prova no badge em destaque com 5 caracteres alfanuméricos (ex: "CÓDIGO: 5M4X7", "0IZ96", "1M2OS").
  2. Nome do aluno impresso ou escrito à mão no campo "Nome:".
  3. Descrição da avaliação (ex: "Avaliação Teórica: Faixa Branca para Faixa Amarela").
- LADO DIREITO:
  4. "CARTÃO DE RESPOSTAS" oficial contendo as 10 questões (Q01 a Q05 na esquerda, Q06 a Q10 na direita) com quadradinhos [A] [B] [C] [D] pintados a lápis ou caneta pelo aluno.

REGRAS ESTRITAS DE PREENCHIMENTO:
1. REGRA ABSOLUTA PARA PROVAS EM BRANCO: Se o aluno NÃO pintou nenhum quadradinho em uma questão do Cartão de Respostas, retorne OBRIGATORIAMENTE "EM_BRANCO" para essa questão. NUNCA presuma ou invente letras para questões vazias!
2. SE O QUADRADINHO ESTIVER PINTADO: Retorne a letra correspondente ("A", "B", "C" ou "D") somente se houver preenchimento evidente a lápis ou caneta.
3. SE HOUVER RASURA OU MARCAÇÃO DUPLA: Retorne "ANULADA" e aponte no array "questoes_duvidosas_rasura".

Retorne estritamente um JSON no seguinte formato:
{
  "sucesso_leitura_cabecalho": true,
  "codigo_prova": "5M4X7",
  "examId": "5M4X7",
  "aluno": "Nome do Aluno (ou string vazia se em branco)",
  "graduacao": "Faixa Branca para Faixa Amarela",
  "respostas_aluno": {
    "1": "EM_BRANCO",
    "2": "EM_BRANCO",
    "3": "EM_BRANCO",
    "4": "EM_BRANCO",
    "5": "EM_BRANCO",
    "6": "EM_BRANCO",
    "7": "EM_BRANCO",
    "8": "EM_BRANCO",
    "9": "EM_BRANCO",
    "10": "EM_BRANCO"
  },
  "questoes_duvidosas_rasura": []
}
`.trim();
    } else {
      promptText = `
Você é um desenvolvedor sênior especialista em visão computacional e correção de gabaritos escolares e de artes marciais (OMR).
Esta imagem mostra o cabeçalho e o CARTÃO DE RESPOSTAS oficial da avaliação de karatê.

ATENÇÃO CRÍTICA À ORIENTAÇÃO E ROTAÇÃO DA FOTO:
- A foto tirada pelo celular pode estar em qualquer orientação (ex: deitada em 90°, 180°, 270°, na vertical ou horizontal).
- Gire mentalmente a imagem para ler o cabeçalho "CARTÃO DE RESPOSTAS Pinte [ ■ ]" e "NOTA: ___ / 10,0" na orientação correta de leitura humana.

ESTRUTURA DO CABEÇALHO E CARTÃO:
1. No cabeçalho (lado esquerdo ou superior):
   - Código da Prova de 5 caracteres (badge escuro, ex: "CÓDIGO: 1M2OS", "0IZ96");
   - Campo "Nome:" com o nome do aluno impresso ou escrito à mão.
2. No Cartão de Respostas (10 questões numeradas de 01 a 10 em duas colunas):
   - Coluna 1 (esquerda): Questões 01 a 05
   - Coluna 2 (direita): Questões 06 a 10
   - Em cada linha há 4 opções: [A] [B] [C] [D].

INSTRUÇÃO DE LEITURA:
- Identifique o Nome do Aluno no campo "Nome:".
- Identifique o Código da Prova de 5 caracteres no badge (ex: 1M2OS).
- Para cada questão de 1 a 10, verifique qual alternativa [A], [B], [C] ou [D] foi pintada/preenchida com lápis ou caneta.
- Se nenhuma marcação: "EM_BRANCO".
- Se rasura ou dupla marcação: "ANULADA" e aponte em questoes_duvidosas_rasura.

Retorne estritamente um JSON no seguinte formato:
{
  "codigo_prova": "1M2OS",
  "examId": "1M2OS",
  "aluno": "Nome do Aluno impresso ou manuscrito (ou string vazia se em branco)",
  "respostas_aluno": {
    "1": "B",
    "2": "A",
    "3": "B",
    "4": "B",
    "5": "A",
    "6": "A",
    "7": "D",
    "8": "C",
    "9": "B",
    "10": "D"
  },
  "questoes_duvidosas_rasura": []
}
`.trim();
    }

    const payload = {
      contents: [
        {
          parts: [
            { text: promptText },
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Data
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 1200,
        responseMimeType: 'application/json'
      }
    };

    const candidateModels = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash-8b'];
    let geminiData = null;

    for (const model of candidateModels) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          geminiData = await response.json();
          break;
        }
      } catch(err) {}
    }

    if (!geminiData) {
      return new Response(JSON.stringify({
        success: true,
        aiAvailable: false,
        message: 'Modo de conferência rápida ativado.',
        answerKey: officialKey,
        kyu: kyu,
        examId: examId,
        detectedAnswers: officialKey.map(() => null),
        ambiguousQuestions: []
      }), { status: 200, headers: corsHeaders });
    }

    let parsedAi = null;
    try {
      const candidateText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
      parsedAi = JSON.parse(candidateText.trim());
    } catch(parseErr) {}

    if (!parsedAi) {
      return new Response(JSON.stringify({
        success: true,
        aiAvailable: false,
        answerKey: officialKey,
        kyu: kyu,
        examId: examId,
        detectedAnswers: officialKey.map(() => null),
        ambiguousQuestions: []
      }), { status: 200, headers: corsHeaders });
    }

    if (step === 'code' || step === 'badge') {
      const rawCode = parsedAi.codigo_prova || parsedAi.examId || '';
      let cleanCode = String(rawCode).replace(/^#/, '').trim().toUpperCase();
      cleanCode = cleanCode.replace(/^C[OÓ]DIGO:?\s*/i, '').replace(/[^0-9A-Z-]/g, '').trim();

      const dec = decodeCompactExamCode(cleanCode);
      return new Response(JSON.stringify({
        success: true,
        aiAvailable: true,
        codigo_prova: cleanCode,
        examId: cleanCode,
        studentSlug: dec ? dec.studentTag : null,
        aluno: (dec && dec.studentTag) || parsedAi.aluno || null,
        studentName: (dec && dec.studentTag) || parsedAi.aluno || null,
        kyu: dec ? dec.kyu : (kyu !== undefined ? kyu : 6),
        answerKey: dec ? dec.answers : (officialKey || [])
      }), { status: 200, headers: corsHeaders });
    }

    const detectedAnswers = [];
    const ambiguousQuestions = [];
    const respostasMap = parsedAi.respostas_aluno || parsedAi.respostas || parsedAi;

    if (respostasMap && typeof respostasMap === 'object') {
      for (let i = 1; i <= 10; i++) {
        const key2d = String(i).padStart(2, '0');
        const key1d = String(i);
        const val = respostasMap[key2d] !== undefined ? respostasMap[key2d] : (respostasMap[key1d] !== undefined ? respostasMap[key1d] : respostasMap[i]);
        const cleanVal = typeof val === 'string' ? val.trim().toUpperCase() : '';
        if (!val || cleanVal === 'EM_BRANCO' || cleanVal === 'BRANCO' || cleanVal === 'VAZIO' || cleanVal === 'VAZIA' || cleanVal === 'NULL' || cleanVal === 'NULO') {
          detectedAnswers.push(null);
        } else if (cleanVal === 'ANULADA' || cleanVal === 'DUVIDOSA' || cleanVal === 'DUVIDA' || cleanVal === 'DÚVIDA' || cleanVal === 'RASURA') {
          ambiguousQuestions.push(i);
          detectedAnswers.push(null);
        } else if (['A', 'B', 'C', 'D'].includes(cleanVal)) {
          detectedAnswers.push(cleanVal);
        } else {
          detectedAnswers.push(null);
        }
      }
    } else if (Array.isArray(parsedAi.detectedAnswers)) {
      detectedAnswers.push(...parsedAi.detectedAnswers);
    } else {
      for (let i = 0; i < 10; i++) detectedAnswers.push(null);
    }

    let detectedKyu = kyu;
    let detectedExamId = examId;
    let detectedAnswerKey = (officialKey && officialKey.length === 10) ? officialKey : [];

    if (Array.isArray(parsedAi.questoes_duvidosas_rasura)) {
      parsedAi.questoes_duvidosas_rasura.forEach(q => {
        const num = Number(q);
        if (!isNaN(num) && num >= 1 && num <= 10 && !ambiguousQuestions.includes(num)) {
          ambiguousQuestions.push(num);
        }
      });
    }

    const aiExamCode = parsedAi.codigo_prova || parsedAi.examId || (parsedAi.dados_prova && parsedAi.dados_prova.exam_id) || '';
    if (aiExamCode) {
      detectedExamId = String(aiExamCode).replace(/^#/, '').replace(/^C[OÓ]DIGO:?\s*/i, '').replace(/[^0-9A-Z-]/g, '').trim().toUpperCase();
    }

    let decodedCompact = null;
    if (detectedExamId) {
      decodedCompact = decodeCompactExamCode(detectedExamId);
      if (decodedCompact) {
        detectedKyu = decodedCompact.kyu;
        detectedAnswerKey = decodedCompact.answers;
        detectedExamId = decodedCompact.fullExamId || decodedCompact.examId;
      }
    }

    if ((!detectedAnswerKey || detectedAnswerKey.length < 10) && officialKey && officialKey.length === 10) {
      detectedAnswerKey = officialKey;
    }

    const studentName = parsedAi.aluno || parsedAi.studentName || (decodedCompact && decodedCompact.studentTag) || null;

    return new Response(JSON.stringify({
      success: true,
      aiAvailable: true,
      aluno: studentName,
      studentName: studentName,
      respostas_aluno: parsedAi.respostas_aluno || null,
      detectedAnswers: detectedAnswers,
      ambiguousQuestions: ambiguousQuestions,
      answerKey: detectedAnswerKey,
      kyu: detectedKyu,
      examId: detectedExamId
    }), { status: 200, headers: corsHeaders });

  } catch(error) {
    return new Response(JSON.stringify({ success: false, error: 'Erro ao processar prova.' }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
