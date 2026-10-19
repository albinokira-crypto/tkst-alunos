// api/exam-correct.js
// Endpoint Node.js para Correção de Provas com Gemini Vision (Multi-modal)
// Compatível com server.js local e ambiente legado Vercel

const https = require('https');
const fs = require('fs');
const path = require('path');
const { getCorsHeaders, verifyAuth } = require('./_auth.js');

const CANDIDATE_MODELS = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.0-flash'];

function getGeminiApiKey() {
  let key = process.env.GEMINI_API_KEY || process.env.GEMINI_KEY || process.env.GOOGLE_API_KEY || '';
  if (!key) {
    try {
      const candidates = [
        path.join(__dirname, '..', '.env.local'),
        path.join(__dirname, '..', '.env'),
        path.join(process.cwd(), '.env.local'),
        path.join(process.cwd(), '.env')
      ];
      for (const p of candidates) {
        if (fs.existsSync(p)) {
          const content = fs.readFileSync(p, 'utf8');
          const m = content.match(/GEMINI_API_KEY\s*=\s*([^\r\n]+)/);
          if (m && m[1]) {
            key = m[1].trim().replace(/^["']|["']$/g, '');
            if (key) break;
          }
        }
      }
    } catch(e) {}
  }
  return key;
}

function callGeminiModel(modelName, apiKey, payload) {
  return new Promise((resolve, reject) => {
    const payloadStr = JSON.stringify(payload);
    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payloadStr)
      },
      timeout: 25000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          data
        });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout de comunicação com a API do Gemini Vision (25s)'));
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(payloadStr);
    req.end();
  });
}

module.exports = async (req, res) => {
  const origin = req.headers.origin || '*';
  const headers = getCorsHeaders(origin);

  Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // 1. Verificação de autenticação resiliente
  const authHeader = req.headers.authorization || '';
  if (authHeader && authHeader !== 'Bearer' && authHeader !== 'Bearer null' && authHeader !== 'Bearer undefined') {
    const auth = verifyAuth(req);
    if (!auth.authenticated && auth.error && auth.error.includes('Acesso negado')) {
      return res.status(403).json({ success: false, error: auth.error });
    }
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch(e) {}
    }

    const imageBase64 = body.imageBase64 || body.image || '';
    const mimeType = body.mimeType || 'image/jpeg';
    const examCode = body.examCode || '';

    if (!imageBase64 || typeof imageBase64 !== 'string' || imageBase64.length < 50) {
      return res.status(400).json({ success: false, error: 'Imagem da prova inválida ou ausente (esperado base64).' });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
    const geminiApiKey = getGeminiApiKey();

    if (!geminiApiKey) {
      return res.status(200).json({
        success: false,
        geminiAvailable: false,
        message: 'Chave GEMINI_API_KEY não configurada no servidor. O OMR nativo local será utilizado.'
      });
    }

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

    let geminiResponse = null;
    let successfulModel = '';
    let lastError = '';

    // Loop com fallback inteligente entre os modelos Gemini disponíveis
    for (const model of CANDIDATE_MODELS) {
      try {
        const result = await callGeminiModel(model, geminiApiKey, geminiPayload);
        if (result.statusCode === 200) {
          geminiResponse = result;
          successfulModel = model;
          break;
        } else if (result.statusCode === 404) {
          lastError = `Modelo ${model} não disponível (404)`;
          continue; // Tenta o próximo modelo
        } else {
          lastError = `Status ${result.statusCode}: ${result.data.slice(0, 150)}`;
        }
      } catch(err) {
        lastError = err.message;
      }
    }

    if (!geminiResponse) {
      return res.status(502).json({
        success: false,
        geminiAvailable: true,
        error: `Não foi possível comunicar com o Gemini Vision (${lastError})`
      });
    }

    const geminiData = JSON.parse(geminiResponse.data);
    const candidateText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleanJsonText = candidateText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    const parsedResult = JSON.parse(cleanJsonText);

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

    return res.status(200).json({
      success: true,
      geminiAvailable: true,
      provider: successfulModel,
      examCode: detectedExamCode,
      studentName: studentName,
      overallConfidence: typeof parsedResult.overallConfidence === 'number' ? parsedResult.overallConfidence : 0.95,
      questions,
      timestamp: Date.now()
    });

  } catch(err) {
    return res.status(500).json({ success: false, error: 'Erro no processamento Gemini Vision: ' + err.message });
  }
};
