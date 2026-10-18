// api/exam-correct.js
// Endpoint Node.js para Correção de Provas com Gemini Vision (Multi-modal)
// Compatível com server.js local e ambiente legado Vercel

const https = require('https');
const { getCorsHeaders, verifyAuth } = require('./_auth.js');

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
    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GEMINI_KEY || process.env.GOOGLE_API_KEY || '';

    if (!geminiApiKey) {
      return res.status(200).json({
        success: false,
        geminiAvailable: false,
        message: 'Chave GEMINI_API_KEY não configurada no servidor. O OMR nativo local será utilizado.'
      });
    }

    const prompt = `Você é o avaliador oficial e inspetor técnico de exames teóricos de Karatê Shotokan (TKST).
Analise com extrema precisão a imagem do Cartão de Respostas da Prova Teórica.
O cartão possui exatamente 10 questões numeradas de 1 a 10.
Cada questão possui 4 opções em formato de quadradinhos ou bolhas: [A], [B], [C], [D].

INSTRUÇÕES RIGOROSAS:
1. Para cada questão de 1 a 10, determine qual opção (A, B, C ou D) o aluno preencheu/marcou com caneta ou lápis.
2. Se a questão estiver sem nenhuma marcação visível (em branco), defina answer como null, doubt como false e confidence em 0.95.
3. Se houver rasura evidente (ex: uma opção riscada com X e outra preenchida, ou tentativa de apagar), marque answer com a opção que representa a intenção final do aluno, mas defina doubt como true e reduza a confidence (ex: 0.45 a 0.60).
4. Se houver dúvida real entre duas marcações fortes e não for possível decidir, marque answer com a mais escura, doubt como true e confidence baixa.
5. Se a marcação estiver limpa e clara, defina doubt como false e confidence alta (0.90 a 1.00).

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

    const geminiPayload = JSON.stringify({
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
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(geminiPayload)
      }
    };

    const apiReq = https.request(options, (apiRes) => {
      let data = '';
      apiRes.on('data', chunk => data += chunk);
      apiRes.on('end', () => {
        try {
          if (apiRes.statusCode !== 200) {
            return res.status(502).json({
              success: false,
              geminiAvailable: true,
              error: `Erro ao consultar Gemini (${apiRes.statusCode}): ${data.slice(0, 150)}`
            });
          }

          const geminiData = JSON.parse(data);
          const candidateText = geminiData.candidates[0].content.parts[0].text;
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

          return res.status(200).json({
            success: true,
            geminiAvailable: true,
            provider: 'gemini-1.5-flash',
            examCode: parsedResult.examCode || examCode,
            overallConfidence: typeof parsedResult.overallConfidence === 'number' ? parsedResult.overallConfidence : 0.92,
            questions,
            timestamp: Date.now()
          });
        } catch(err) {
          return res.status(502).json({ success: false, error: 'Falha ao processar resposta do Gemini Vision: ' + err.message });
        }
      });
    });

    apiReq.on('error', (err) => {
      return res.status(502).json({ success: false, error: 'Erro de conexão com Gemini API: ' + err.message });
    });

    apiReq.write(geminiPayload);
    apiReq.end();

  } catch(err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
