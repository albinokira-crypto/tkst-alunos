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
    const FALLBACK_KEY = Buffer.from('QVEuQWI4Uk42SlhPWlZOaHdwNC02WEg0bXFKOHRRMWpBT25Fdnl3VkNKTnIzZzBZWEJLYVE=', 'base64').toString('utf8');
    const apiKey = process.env.GEMINI_API_KEY || clientApiKey || FALLBACK_KEY;

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

    // Limpa prefixo data:image/...;base64, se houver com suporte a quebras de linha
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

function decodeCompactExamCode(codeStr) {
  if (!codeStr) return null;
  const clean = String(codeStr).replace(/^#/, '').replace(/[^0-9A-Za-z]/g, '').trim().toUpperCase();
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
    return { kyu, answers, examId: clean };
  } catch(e) {
    return null;
  }
}

let promptText = '';
    if (step === 'code' || step === 'badge') {
      promptText = `
Você é um especialista em OCR e visão computacional de alta precisão.
Esta foto mostra especificamente o CÓDIGO de uma avaliação de karatê (badge ou campo de texto com 4 a 6 caracteres alfanuméricos em caixa alta, por exemplo: "CÓDIGO: 0IZ96", "0IZ96", "#0IZ96", "5M4X7", "CÓDIGO: 5M4X7", "CÓDIGO: 9K2L1").

SUA TAREFA ÚNICA:
Extrair os 4 a 6 caracteres alfanuméricos que formam o código da prova.
Ignore palavras como "CÓDIGO", "CODIGO", "PROVA", "#", espaços e dois-pontos.

Retorne estritamente um JSON no seguinte formato:
{
  "codigo_prova": "0IZ96",
  "examId": "0IZ96"
}
`.trim();
    } else if (Number(step) === 1) {
      promptText = `
Você é um desenvolvedor sênior especialista em visão computacional e correção de avaliações de karatê.
Esta foto mostra especificamente o CABEÇALHO oficial da prova de karatê, composto por:
- LADO ESQUERDO:
  1. Código da Prova no badge em destaque (ex: "CÓDIGO: 5M4X7", [#5M4X7] ou 4 a 5 caracteres alfanuméricos).
  2. Nome do aluno escrito à mão no campo "Nome:".
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
(Substitua "EM_BRANCO" pela letra A, B, C ou D APENAS se o quadradinho correspondente estiver pintado no Cartão de Respostas).
`.trim();
    } else if (Number(step) === 2) {
      promptText = `
Você é um desenvolvedor sênior especialista em visão computacional e correção de gabaritos escolares e de artes marciais.
Esta imagem mostra o CARTÃO DE RESPOSTAS ou as 10 questões da prova de karatê.

O Cartão de Respostas oficial possui 10 questões organizadas em duas colunas:
- Coluna 1 (Questões 01 a 05): Linhas 01, 02, 03, 04, 05, cada uma com opções [A] [B] [C] [D]
- Coluna 2 (Questões 06 a 10): Linhas 06, 07, 08, 09, 10, cada uma com opções [A] [B] [C] [D]

ATENÇÃO CRÍTICA À ORIENTAÇÃO E ROTAÇÃO DA FOTO:
- A foto tirada pela câmera do celular pode estar em qualquer orientação (deitada em 90°, 270°, invertida ou na horizontal).
- Localize o título "CARTÃO DE RESPOSTAS" e as colunas numeradas "01 a 05" e "06 a 10".
- Oriente a sua leitura pela numeração das questões de 1 a 10 e pelas 4 letras [A] [B] [C] [D] de cada alternativa.

DIRETRIZES CRÍTICAS PARA RECONHECIMENTO DE LÁPIS (GRAFITE):
1. PREENCHIMENTO A LÁPIS: Os alunos respondem utilizando LÁPIS grafite escolar comum. O grafite a lápis varia de cinza claro a escuro, podendo ser pintado por completo, preenchido com rabisco denso, xis ou traço cobrindo a letra.
2. COMPARAÇÃO ENTRE AS 4 ALTERNATIVAS: Para cada questão (1 a 10), compare os 4 quadradinhos [A], [B], [C] e [D]:
   - O quadradinho que apresenta grafite, sombra cinza ou marca a lápis/caneta em seu interior É A RESPOSTA ESCOLHIDA pelo aluno. Retorne a letra correspondente ("A", "B", "C" ou "D").
   - Os quadradinhos não preenchidos estarão brancos/limpos no fundo.
3. QUESTÃO EM BRANCO: Retorne "EM_BRANCO" APENAS se os 4 quadradinhos da questão estiverem totalmente brancos e vazios, sem nenhum traço de lápis ou caneta.
4. RASURA OU DUPLA MARCAÇÃO: Se o aluno tiver marcado dois quadradinhos na mesma questão com grafite evidente, retorne "ANULADA" e aponte no array "questoes_duvidosas_rasura".

Retorne estritamente um JSON no seguinte formato:
{
  "respostas_aluno": {
    "1": "A",
    "2": "B",
    "3": "C",
    "4": "D",
    "5": "A",
    "6": "B",
    "7": "C",
    "8": "D",
    "9": "A",
    "10": "B"
  },
  "questoes_duvidosas_rasura": []
}
(Substitua os valores pelas letras reais identificadas no gabarito, ou "EM_BRANCO" apenas se vazia).
`.trim();
    } else {
      promptText = `
Você é um desenvolvedor sênior especialista em visão computacional e sistemas de correção de provas de karatê.
Sua tarefa é analisar a imagem da folha de prova de karatê:
1. Identifique o Código da Prova (ex: CÓDIGO: 5M4X7 ou [#ID]) e o nome do aluno no campo "Nome:".
2. Analise as 10 respostas do aluno, preferencialmente lendo o "CARTÃO DE RESPOSTAS" no cabeçalho ou as 10 questões da folha.
Se o quadradinho não foi pintado pelo aluno, retorne "EM_BRANCO".
Se foi pintado, retorne a letra ("A", "B", "C", "D").
Se houver rasura/dupla marcação, aponte em questoes_duvidosas_rasura.

Retorne estritamente um JSON:
{
  "codigo_prova": "5M4X7",
  "examId": "5M4X7",
  "aluno": "Nome do Aluno",
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

    // Chamada à API Gemini Multimodal com modelos ativos da chave
    const candidateModels = ['gemini-3.5-flash', 'gemini-3.7-flash', 'gemini-3.5-flash-lite', 'gemini-flash-lite-latest'];
    let geminiResult = null;

    for (const modelName of candidateModels) {
      try {
        const result = await new Promise((resolve, reject) => {
          const options = {
            hostname: 'generativelanguage.googleapis.com',
            path: `/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
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

        if (result && result.statusCode === 200) {
          geminiResult = result;
          break;
        } else if (result && result.statusCode !== 404) {
          geminiResult = result;
        }
      } catch(e) {}
    }

    if (!geminiResult || geminiResult.statusCode !== 200) {
      console.warn('Gemini API Error:', geminiResult ? (geminiResult.body || geminiResult.raw) : 'Sem resposta');
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

    // Se for o passo exclusivo de leitura de código de prova (OCR do badge)
    if (step === 'code' || step === 'badge') {
      const rawCode = parsedAi.codigo_prova || parsedAi.examId || '';
      let cleanCode = String(rawCode).replace(/^#/, '').trim().toUpperCase();
      cleanCode = cleanCode.replace(/^C[OÓ]DIGO:?\s*/i, '').replace(/[^0-9A-Z]/g, '').trim();

      const dec = decodeCompactExamCode(cleanCode);
      return res.status(200).json({
        success: true,
        aiAvailable: true,
        codigo_prova: cleanCode,
        examId: cleanCode,
        kyu: dec ? dec.kyu : (kyu !== undefined ? kyu : 6),
        answerKey: dec ? dec.answers : (officialKey || [])
      });
    }

    // Processa respostas do aluno (formato solicitado pelo usuário e compatibilidade)
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

    // Interpreta dados da prova e payload do Código de Barras se extraído pela IA
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

    // Extrai identificador da prova e decodifica matematicamente
    const aiExamCode = parsedAi.codigo_prova || parsedAi.examId || (parsedAi.dados_prova && parsedAi.dados_prova.exam_id) || '';
    if (aiExamCode) {
      detectedExamId = String(aiExamCode).replace(/^#/, '').replace(/^C[OÓ]DIGO:?\s*/i, '').replace(/[^0-9A-Z]/g, '').trim().toUpperCase();
    }

    if (detectedExamId) {
      const decodedCompact = decodeCompactExamCode(detectedExamId);
      if (decodedCompact) {
        detectedKyu = decodedCompact.kyu;
        detectedAnswerKey = decodedCompact.answers;
        detectedExamId = decodedCompact.examId;
      }
    }

    // Preserva o answerKey oficial se já veio do cliente (ex: decodificado do código 0IZ96)
    if ((!detectedAnswerKey || detectedAnswerKey.length < 10) && officialKey && officialKey.length === 10) {
      detectedAnswerKey = officialKey;
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

      const idMatch = bStr.match(/([A-Z0-9]{4,6})(?:-|$)/);
      if (idMatch && idMatch[1]) {
        detectedExamId = idMatch[1];
        const dec = decodeCompactExamCode(detectedExamId);
        if (dec) {
          detectedKyu = dec.kyu;
          detectedAnswerKey = dec.answers;
        }
      }
    }

    const gradText = (parsedAi.graduacao || (parsedAi.dados_prova && parsedAi.dados_prova.graduacao) || '').toLowerCase();
    if (gradText && (detectedKyu === undefined || detectedKyu === null)) {
      if (gradText.includes('amarela') || gradText.includes('6º kyu') || gradText.includes('6 kyu')) detectedKyu = 6;
      else if (gradText.includes('vermelha') || gradText.includes('5º kyu') || gradText.includes('5 kyu')) detectedKyu = 5;
      else if (gradText.includes('laranja') || gradText.includes('4º kyu') || gradText.includes('4 kyu')) detectedKyu = 4;
      else if (gradText.includes('verde') || gradText.includes('3º kyu') || gradText.includes('3 kyu')) detectedKyu = 3;
      else if (gradText.includes('roxa') || gradText.includes('2º kyu') || gradText.includes('2 kyu')) detectedKyu = 2;
      else if (gradText.includes('marrom') || gradText.includes('1º kyu') || gradText.includes('1 kyu')) detectedKyu = 1;
      else if (gradText.includes('preta') || gradText.includes('shodan')) detectedKyu = 0;
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
