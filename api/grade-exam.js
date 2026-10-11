// api/grade-exam.js
// Endpoint server-side para análise e correção automatizada da folha de prova via Gemini Multimodal Vision.
// Etapa 1: Identificação do Aluno e Leitura do QR Code / Graduação
// Etapa 2: Extração das Respostas Marcadas (1 a 10)

const https = require('https');

module.exports = async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido.' });
  }

  try {
    const { image, answerKey, kyu, examId, step, apiKey: clientApiKey } = req.body || {};

    if (!image) {
      return res.status(400).json({ success: false, error: 'Imagem da prova não fornecida.' });
    }

    const officialKey = Array.isArray(answerKey) ? answerKey : [];
    const apiKey = process.env.GEMINI_API_KEY || clientApiKey;

    // Se não houver chave Gemini configurada no ambiente ou no app, retorna modo interativo
    if (!apiKey) {
      return res.status(200).json({
        success: true,
        aiAvailable: false,
        message: 'Chave Gemini não configurada no servidor. Modo de conferência rápida ativado.',
        answerKey: officialKey,
        kyu: kyu,
        examId: examId,
        detectedAnswers: officialKey.map(() => null),
        ambiguousQuestions: []
      });
    }

    // Limpa prefixo data:image/...;base64, se houver
    let base64Data = image;
    let mimeType = 'image/jpeg';
    if (image.startsWith('data:')) {
      const match = image.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        base64Data = match[2];
      }
    }

    let promptText = '';
    if (Number(step) === 1) {
      promptText = `
Você é um desenvolvedor sênior especialista em visão computacional e leitura de cabeçalhos de provas de karatê.
Sua tarefa é analisar o topo/cabeçalho desta folha de prova:
1. Localize e decodifique o Código de Barras (padrão Code 128) ou o código da prova [#XXXX] impresso na folha (ex: [#FRWV]).
2. Identifique a graduação/faixa indicada (ex: "Faixa Branca para Faixa Amarela", "6º Kyu").
3. Extraia o nome do aluno escrito à mão no campo "Nome:".

Retorne estritamente um JSON no seguinte formato:
{
  "sucesso_leitura_codigo_barras": true,
  "codigo_barras_payload": "TKST-FAIXA-AMARELA-06KYU-FRWV",
  "examId": "FRWV",
  "kyu": 6,
  "aluno": "Nome do Aluno (ou string vazia se em branco)",
  "dados_prova": {
    "graduacao": "Faixa Branca (7º Kyu) para Faixa Amarela (6º Kyu)",
    "exam_id": "FRWV"
  }
}
`.trim();
    } else if (Number(step) === 2) {
      promptText = `
Você é um desenvolvedor sênior especialista em visão computacional e correção de gabaritos escolares e de artes marciais.
Esta imagem mostra especificamente o bloco das 10 questões de múltipla escolha de uma prova de karatê (questões 1 a 5 na coluna esquerda, 6 a 10 na coluna direita).
Nesta etapa, o foco é exclusivamente na leitura das respostas dos alunos:
- Números das questões (1 a 10)
- Letras das alternativas ((A), (B), (C), (D))
- Quadradinhos pintados a lápis ou caneta

REGRAS ESTRITAS DE PREENCHIMENTO:
1. REGRA ABSOLUTA PARA PROVAS EM BRANCO: Se o aluno NÃO pintou nenhum quadradinho em uma questão (quadradinhos brancos/vazios), retorne OBRIGATORIAMENTE "EM_BRANCO" para essa questão. NUNCA presuma ou invente letras para questões vazias!
2. SE O QUADRADINHO ESTIVER PINTADO: Retorne a letra correspondente ("A", "B", "C" ou "D") somente se houver preenchimento evidente a lápis ou caneta.
3. SE HOUVER RASURA OU MARCAÇÃO DUPLA: Retorne "ANULADA" e aponte no array "questoes_duvidosas_rasura".

Retorne estritamente um JSON no seguinte formato:
{
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
(Substitua "EM_BRANCO" pela letra A, B, C ou D APENAS quando o quadradinho estiver realmente preenchido pelo aluno).
`.trim();
    } else {
      promptText = `
Você é um desenvolvedor sênior especialista em visão computacional e sistemas de correção de provas de karatê.
Sua tarefa é analisar a imagem da folha de prova de karatê:
1. Identifique o Código de Barras ou código [#ID] e o nome do aluno.
2. Analise as 10 questões (1 a 5 na esquerda, 6 a 10 na direita).
Se o quadradinho não foi pintado pelo aluno, retorne "EM_BRANCO".
Se foi pintado, retorne a letra ("A", "B", "C", "D").
Se houver rasura/dupla marcação, aponte em questoes_duvidosas_rasura.

Retorne estritamente um JSON:
{
  "sucesso_leitura_codigo_barras": true,
  "codigo_barras_payload": "TKST-FAIXA-AMARELA-06KYU-FRWV",
  "aluno": "Nome do Aluno",
  "dados_prova": {
    "graduacao": "Faixa Branca (7º Kyu) para Faixa Amarela (6º Kyu)",
    "exam_id": "FRWV"
  },
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
    }

    const requestPayload = JSON.stringify({
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
    });

    // Chamada à API Gemini Multimodal (v1beta)
    const geminiResult = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'generativelanguage.googleapis.com',
        path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(requestPayload)
        }
      };

      const request = https.request(options, (response) => {
        let data = '';
        response.setEncoding('utf8');
        response.on('data', chunk => { data += chunk; });
        response.on('end', () => {
          try {
            resolve({ statusCode: response.statusCode, body: JSON.parse(data) });
          } catch(err) {
            resolve({ statusCode: response.statusCode, raw: data });
          }
        });
      });

      request.on('error', reject);
      request.setTimeout(18000, () => {
        request.destroy(new Error('Timeout ao conectar com Gemini API'));
      });
      request.write(requestPayload);
      request.end();
    });

    if (geminiResult.statusCode !== 200) {
      console.warn('Gemini API Error:', geminiResult.body || geminiResult.raw);
      return res.status(200).json({
        success: true,
        aiAvailable: false,
        message: 'Não foi possível processar visão computacional nesta foto. Modo de conferência rápida ativado.',
        answerKey: officialKey,
        kyu: kyu,
        examId: examId,
        detectedAnswers: officialKey.map(() => null),
        ambiguousQuestions: []
      });
    }

    let parsedAi = null;
    try {
      const candidateText = geminiResult.body?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      parsedAi = JSON.parse(candidateText.trim());
    } catch(parseErr) {
      console.warn('Erro ao interpretar resposta Gemini:', parseErr);
    }

    if (!parsedAi) {
      return res.status(200).json({
        success: true,
        aiAvailable: false,
        answerKey: officialKey,
        kyu: kyu,
        examId: examId,
        detectedAnswers: officialKey.map(() => null),
        ambiguousQuestions: []
      });
    }

    // Processa respostas do aluno (formato solicitado pelo usuário e compatibilidade)
    const detectedAnswers = [];
    const ambiguousQuestions = [];

    if (parsedAi.respostas_aluno && typeof parsedAi.respostas_aluno === 'object') {
      for (let i = 1; i <= 10; i++) {
        const val = parsedAi.respostas_aluno[String(i)] || parsedAi.respostas_aluno[i];
        const cleanVal = typeof val === 'string' ? val.trim().toUpperCase() : '';
        if (!val || cleanVal === 'EM_BRANCO' || cleanVal === 'BRANCO' || cleanVal === 'VAZIO' || cleanVal === 'VAZIA' || cleanVal === 'NULL') {
          detectedAnswers.push(null);
        } else if (cleanVal === 'ANULADA' || cleanVal === 'DUVIDOSA' || cleanVal === 'RASURA') {
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

    // Interpreta dados da prova e payload do Código de Barras se extraído pela IA
    let detectedKyu = kyu;
    let detectedExamId = examId;
    let detectedAnswerKey = officialKey;

    if (Array.isArray(parsedAi.questoes_duvidosas_rasura)) {
      parsedAi.questoes_duvidosas_rasura.forEach(q => {
        const num = Number(q);
        if (!isNaN(num) && num >= 1 && num <= 10 && !ambiguousQuestions.includes(num)) {
          ambiguousQuestions.push(num);
        }
      });
    }

    const barcodePayload = parsedAi.codigo_barras_payload || (parsedAi.dados_prova && parsedAi.dados_prova.codigo_barras_payload) || '';
    if (typeof barcodePayload === 'string' && barcodePayload.toUpperCase().includes('TKST')) {
      const bStr = barcodePayload.toUpperCase();
      if (bStr.includes('AMARELA') || bStr.includes('06KYU') || bStr.includes('6KYU')) detectedKyu = 6;
      else if (bStr.includes('VERMELHA') || bStr.includes('05KYU') || bStr.includes('5KYU')) detectedKyu = 5;
      else if (bStr.includes('LARANJA') || bStr.includes('04KYU') || bStr.includes('4KYU')) detectedKyu = 4;
      else if (bStr.includes('VERDE') || bStr.includes('03KYU') || bStr.includes('3KYU')) detectedKyu = 3;
      else if (bStr.includes('ROXA') || bStr.includes('02KYU') || bStr.includes('2KYU')) detectedKyu = 2;
      else if (bStr.includes('MARROM') || bStr.includes('01KYU') || bStr.includes('1KYU')) detectedKyu = 1;
      else if (bStr.includes('PRETA') || bStr.includes('SHODAN')) detectedKyu = 0;

      const idMatch = bStr.match(/([A-Z0-9]{4})(?:-|$)/);
      if (idMatch && idMatch[1]) detectedExamId = idMatch[1];
    }

    if (parsedAi.dados_prova) {
      if (parsedAi.dados_prova.exam_id) detectedExamId = parsedAi.dados_prova.exam_id;
      if (parsedAi.dados_prova.graduacao) {
        const gradText = parsedAi.dados_prova.graduacao.toLowerCase();
        if (gradText.includes('amarela') || gradText.includes('6º kyu') || gradText.includes('6 kyu')) detectedKyu = 6;
        else if (gradText.includes('vermelha') || gradText.includes('5º kyu') || gradText.includes('5 kyu')) detectedKyu = 5;
        else if (gradText.includes('laranja') || gradText.includes('4º kyu') || gradText.includes('4 kyu')) detectedKyu = 4;
        else if (gradText.includes('verde') || gradText.includes('3º kyu') || gradText.includes('3 kyu')) detectedKyu = 3;
        else if (gradText.includes('roxa') || gradText.includes('2º kyu') || gradText.includes('2 kyu')) detectedKyu = 2;
        else if (gradText.includes('marrom') || gradText.includes('1º kyu') || gradText.includes('1 kyu')) detectedKyu = 1;
        else if (gradText.includes('preta') || gradText.includes('shodan')) detectedKyu = 0;
      }
    }

    const studentName = parsedAi.aluno || parsedAi.studentName || null;

    return res.status(200).json({
      success: true,
      aiAvailable: true,
      sucesso_leitura_qr: parsedAi.sucesso_leitura_qr !== undefined ? Boolean(parsedAi.sucesso_leitura_qr) : false,
      aluno: studentName,
      studentName: studentName,
      dados_prova: parsedAi.dados_prova || null,
      respostas_aluno: parsedAi.respostas_aluno || null,
      detectedAnswers: detectedAnswers,
      ambiguousQuestions: ambiguousQuestions,
      answerKey: detectedAnswerKey,
      kyu: detectedKyu,
      examId: detectedExamId
    });

  } catch(error) {
    console.error('Erro geral em grade-exam:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno ao processar prova.'
    });
  }
};
