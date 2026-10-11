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

    const promptText = `
Você é um sistema especializado em OCR e correção automatizada de provas acadêmicas e de artes marciais.

Sua tarefa é analisar a imagem fornecida da folha de prova em duas etapas estruturadas:

---

### ETAPA 1: Identificação do Aluno e Leitura do QR Code
1. Identifique e extraia o nome do aluno escrito à mão no campo "Aluno(a)".
2. Localize o QR Code no canto inferior direito da imagem.
3. Decodifique o conteúdo do QR Code para extrair as informações da prova (como o ID da prova, faixa/graduação e a chave de resposta do gabarito oficial). 
   * Nota: Se o QR code estiver parcialmente ilegível pela foto, utilize os textos do cabeçalho da prova (como "Faixa Branca para Faixa Amarela") como fallback para identificar a graduação.

---

### ETAPA 2: Extração das Respostas Marcadas
Analise as 10 questões de múltipla escolha dispostas na folha. Para cada questão de 1 a 10:
1. Verifique qual alternativa ((A), (B), (C) ou (D)) possui a caixa de seleção preenchida com um "X" ou assinalada de forma clara.
2. Se uma questão tiver mais de uma alternativa marcada ou estiver rasurada, defina o valor como "ANULADA".
3. Se a questão estiver em branco, defina como "EM_BRANCO".

---

### SAÍDA ESPERADA (Formato JSON)
Retorne estritamente um objeto JSON com a seguinte estrutura, sem explicações adicionais fora do bloco de código:

{
  "sucesso_leitura_qr": true,
  "aluno": "Nome do Aluno",
  "dados_prova": {
    "graduacao": "Faixa Branca (7º Kyu) para Faixa Amarela (6º Kyu)",
    "qr_code_payload": "conteudo_lido_do_qr_code"
  },
  "respostas_aluno": {
    "1": "B",
    "2": "A",
    "3": "C",
    "4": "C",
    "5": "C",
    "6": "A",
    "7": "C",
    "8": "A",
    "9": "B",
    "10": "D"
  }
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
        if (!val || val === 'EM_BRANCO') {
          detectedAnswers.push(null);
        } else if (val === 'ANULADA') {
          ambiguousQuestions.push(i);
          detectedAnswers.push(null);
        } else if (typeof val === 'string' && ['A', 'B', 'C', 'D'].includes(val.trim().toUpperCase())) {
          detectedAnswers.push(val.trim().toUpperCase());
        } else {
          detectedAnswers.push(null);
        }
      }
    } else if (Array.isArray(parsedAi.detectedAnswers)) {
      detectedAnswers.push(...parsedAi.detectedAnswers);
    } else {
      for (let i = 0; i < 10; i++) detectedAnswers.push(null);
    }

    // Interpreta dados da prova e payload do QR Code se extraído pela IA
    let detectedKyu = kyu;
    let detectedExamId = examId;
    let detectedAnswerKey = officialKey;

    if (parsedAi.dados_prova) {
      const payload = parsedAi.dados_prova.qr_code_payload || '';
      if (typeof payload === 'string' && payload.toUpperCase().includes('TKST:')) {
        const parts = payload.toUpperCase().split(':');
        if (parts.length >= 4) {
          detectedKyu = Number(parts[1]) || detectedKyu;
          detectedExamId = parts[2] || detectedExamId;
          const rawAns = parts[3];
          if (rawAns.length >= 10) {
            detectedAnswerKey = rawAns.split('').filter(c => ['A', 'B', 'C', 'D'].includes(c)).slice(0, 10);
          }
        }
      } else if (parsedAi.dados_prova.graduacao) {
        // Fallback: mapeia texto do cabeçalho da prova para Kyu
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
