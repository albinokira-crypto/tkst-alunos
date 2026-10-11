// api/grade-exam.js
// Endpoint server-side para análise e correção automatizada da foto da prova via Gemini Multimodal Vision.
// Desenvolvido para distinguir grafite escuro intencional de borrões ou marcas apagadas a lápis.

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
    const { image, answerKey, kyu, examId, apiKey: clientApiKey } = req.body || {};

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

    const keyListStr = officialKey.map((k, i) => `Q${i + 1}:${k}`).join(', ');

    const promptText = `
Você é uma inteligência artificial especialista em correção de folhas de provas físicas de Karatê (exame de faixa).
A folha contém 10 questões de múltipla escolha com opções A, B, C, D e quadradinhos de marcação.

DIRETRIZES CRÍTICAS PARA LÁPIS E MARCAS APAGADAS (BORRÕES):
1. Os alunos respondem à prova a LÁPIS.
2. Pode acontecer de o aluno ter apagado uma alternativa incorreta com borracha e marcado outra com X mais forte.
3. IDENTIFIQUE APENAS o traço de grafite ESCURO, FIRME e INTENCIONAL (geralmente um 'X' ou preenchimento forte).
4. DESCONSIDERE totalmente marcas fracas, sombras acinzentadas claras, borrões de borracha e resíduos apagados.
5. Se uma questão estiver genuinamente com dupla marcação escura ou com rasura indecifrável, inclua o número dessa questão no array "ambiguousQuestions".

GABARITO OFICIAL (10 Questões): [ ${keyListStr} ]

INSTRUÇÃO DE SAÍDA:
Retorne ESTRITAMENTE um objeto JSON válido, sem texto adicional, com a estrutura:
{
  "studentName": string ou null (nome do aluno manuscrito no topo se legível),
  "dojo": string ou null (dojô manuscrito se legível),
  "detectedAnswers": ["A", "B", ...], // Exatamente 10 elementos. Use "A", "B", "C", "D" ou null se a questão estiver em branco ou ilegível.
  "ambiguousQuestions": [número, ...] // Números das questões (1 a 10) que possuem rasuras ou borrões de dúvida.
}
    `.trim();

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
        maxOutputTokens: 600,
        responseMimeType: 'application/json'
      }
    });

    // Chamada à API Gemini Multimodal (v1beta ou v1)
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
      request.setTimeout(12000, () => {
        request.destroy(new Error('Timeout ao conectar com Gemini API'));
      });
      request.write(requestPayload);
      request.end();
    });

    if (geminiResult.statusCode !== 200) {
      console.warn('Gemini API Error:', geminiResult.body || geminiResult.raw);
      // Fallback gracioso: não trava o app, permite que o Sensei veja a prova
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

    if (!parsedAi || !Array.isArray(parsedAi.detectedAnswers)) {
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

    return res.status(200).json({
      success: true,
      aiAvailable: true,
      studentName: parsedAi.studentName || null,
      dojo: parsedAi.dojo || null,
      detectedAnswers: parsedAi.detectedAnswers,
      ambiguousQuestions: Array.isArray(parsedAi.ambiguousQuestions) ? parsedAi.ambiguousQuestions : [],
      answerKey: officialKey,
      kyu: kyu,
      examId: examId
    });

  } catch(error) {
    console.error('Erro geral em grade-exam:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno ao processar prova.'
    });
  }
};
