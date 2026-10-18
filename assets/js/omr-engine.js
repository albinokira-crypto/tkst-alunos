/**
 * TKST Alunos - Motor de Correção de Provas OMR (Optical Mark Recognition)
 * Pré-processamento com rotação automática (0/90/180/270), enquadramento de perspectiva,
 * contraste adaptativo, leitura de bolhas e validação multi-modal com Gemini Vision.
 */

(function() {
  'use strict';

  const OMR_CARD_WIDTH = 340;
  const OMR_CARD_HEIGHT = 460;

  // Carrega imagem de arquivo, URL ou Base64 em HTMLImageElement
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(new Error('Falha ao carregar imagem para OMR: ' + err));
      if (typeof src === 'string') {
        img.src = src;
      } else if (src instanceof Blob || src instanceof File) {
        img.src = URL.createObjectURL(src);
      } else {
        reject(new Error('Formato de imagem não suportado.'));
      }
    });
  }

  // Cria um canvas auxiliar
  function createCanvas(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));
    return canvas;
  }

  // Rotaciona canvas em graus especificados (0, 90, 180, 270)
  function rotateCanvas(sourceCanvas, degrees) {
    const deg = ((degrees % 360) + 360) % 360;
    if (deg === 0) return sourceCanvas;

    const isPerpendicular = deg === 90 || deg === 270;
    const destCanvas = createCanvas(
      isPerpendicular ? sourceCanvas.height : sourceCanvas.width,
      isPerpendicular ? sourceCanvas.width : sourceCanvas.height
    );
    const ctx = destCanvas.getContext('2d');
    ctx.translate(destCanvas.width / 2, destCanvas.height / 2);
    ctx.rotate((deg * Math.PI) / 180);
    ctx.drawImage(sourceCanvas, -sourceCanvas.width / 2, -sourceCanvas.height / 2);
    return destCanvas;
  }

  // Detecção inteligente de orientação (0, 90, 180 ou 270 graus)
  async function detectAndCorrectOrientation(sourceCanvas) {
    // 1. Tenta decodificar QR Code com jsQR se disponível
    if (typeof window.jsQR === 'function') {
      const angles = [0, 90, 180, 270];
      for (const angle of angles) {
        const rotated = rotateCanvas(sourceCanvas, angle);
        const ctx = rotated.getContext('2d');
        const imgData = ctx.getImageData(0, 0, rotated.width, rotated.height);
        const code = window.jsQR(imgData.data, imgData.width, imgData.height, {
          inversionAttempts: 'dontInvert'
        });
        if (code && code.data) {
          return {
            canvas: rotated,
            angle,
            qrData: code.data,
            qrLocation: code.location
          };
        }
      }
    }

    // 2. Se a imagem for mais larga do que alta (paisagem) e o exame for retrato, rotaciona 90 graus
    if (sourceCanvas.width > sourceCanvas.height * 1.25) {
      return { canvas: rotateCanvas(sourceCanvas, 270), angle: 270, qrData: null };
    }

    return { canvas: sourceCanvas, angle: 0, qrData: null };
  }

  // Converte imagem em escala de cinza e aplica contraste adaptativo
  function applyAdaptiveContrast(ctx, width, height) {
    const imgData = ctx.getImageData(0, 0, width, height);
    const d = imgData.data;
    const totalPixels = width * height;

    // 1. Calcula histograma de cinza
    let sumLuminance = 0;
    for (let i = 0; i < d.length; i += 4) {
      const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      d[i] = gray;
      d[i + 1] = gray;
      d[i + 2] = gray;
      sumLuminance += gray;
    }
    const meanLuminance = sumLuminance / totalPixels;

    // 2. Limiar adaptativo dinâmico (Otsu simplificado com ponderação local)
    const threshold = Math.max(70, Math.min(180, meanLuminance * 0.82));

    const binaryData = new Uint8Array(totalPixels);
    for (let i = 0, p = 0; i < d.length; i += 4, p++) {
      const g = d[i];
      const isDark = g < threshold ? 1 : 0;
      binaryData[p] = isDark;
      const val = isDark ? 0 : 255;
      d[i] = val;
      d[i + 1] = val;
      d[i + 2] = val;
    }

    ctx.putImageData(imgData, 0, 0);
    return { binaryData, threshold, meanLuminance };
  }

  // Localiza e extrai o Cartão de Respostas (OMR Card) com correção de enquadramento
  function cropOmrCard(canvas) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    // Na diagramação oficial da TKST (Folha A4 Retrato):
    // O Cartão de Respostas fica no cabeçalho, no canto superior direito (ou superior se recortado)
    // Coordenadas relativas típicas do cabeçalho direito:
    // x: de 48% a 98% da largura, y: de 2% a 28% da altura
    let cardX = Math.round(w * 0.48);
    let cardY = Math.round(h * 0.02);
    let cardW = Math.round(w * 0.50);
    let cardH = Math.round(h * 0.26);

    // Se o usuário já enviou a foto cortada focando apenas no cartão:
    if (w < 900 && h < 900 && Math.abs(w / h - 0.74) < 0.4) {
      cardX = Math.round(w * 0.04);
      cardY = Math.round(h * 0.04);
      cardW = Math.round(w * 0.92);
      cardH = Math.round(h * 0.92);
    }

    const cardCanvas = createCanvas(OMR_CARD_WIDTH, OMR_CARD_HEIGHT);
    const cardCtx = cardCanvas.getContext('2d');

    // Desenha com interpolação suave
    cardCtx.imageSmoothingEnabled = true;
    cardCtx.imageSmoothingQuality = 'high';
    cardCtx.drawImage(canvas, cardX, cardY, cardW, cardH, 0, 0, OMR_CARD_WIDTH, OMR_CARD_HEIGHT);

    return {
      cardCanvas,
      bounds: { x: cardX, y: cardY, width: cardW, height: cardH }
    };
  }

  // Lê a grade de 10 questões no cartão OMR normalizado
  function readBubbleGrid(cardCanvas) {
    const ctx = cardCanvas.getContext('2d');
    const w = cardCanvas.width;
    const h = cardCanvas.height;

    // Aplica binarização adaptativa no cartão
    const { binaryData, threshold } = applyAdaptiveContrast(ctx, w, h);

    // Configuração da grade OMR (normalizada em 340x460):
    // Duas colunas: Coluna 1 (Q1 a Q5), Coluna 2 (Q6 a Q10)
    // 5 linhas em cada coluna
    // 4 opções por linha: A, B, C, D
    const col1X = 0.08 * w;
    const col2X = 0.54 * w;
    const colWidth = 0.38 * w;

    const rowStartY = 0.24 * h; // Pula o cabeçalho do cartão
    const rowHeight = 0.14 * h;

    const questions = [];

    for (let i = 1; i <= 10; i++) {
      const isCol2 = i > 5;
      const rowIndex = isCol2 ? i - 6 : i - 1;
      const colX = isCol2 ? col2X : col1X;
      const y = rowStartY + rowIndex * rowHeight;

      // 4 opções: A, B, C, D espaçadas horizontalmente
      const optWidth = colWidth / 4;
      const options = ['A', 'B', 'C', 'D'];
      const fillRatios = {};
      const sampleBoxes = {};

      options.forEach((opt, optIdx) => {
        const optCenterX = colX + (optIdx + 0.5) * optWidth;
        const optCenterY = y + rowHeight * 0.5;
        const sampleRadius = Math.round(optWidth * 0.26);

        // Amostra pixels no interior da bolha / quadradinho
        let darkPixels = 0;
        let totalSampled = 0;

        for (let dy = -sampleRadius; dy <= sampleRadius; dy++) {
          for (let dx = -sampleRadius; dx <= sampleRadius; dx++) {
            if (dx * dx + dy * dy <= sampleRadius * sampleRadius) {
              const px = Math.round(optCenterX + dx);
              const py = Math.round(optCenterY + dy);
              if (px >= 0 && px < w && py >= 0 && py < h) {
                const idx = py * w + px;
                if (binaryData[idx] === 1) darkPixels++;
                totalSampled++;
              }
            }
          }
        }

        const ratio = totalSampled > 0 ? darkPixels / totalSampled : 0;
        fillRatios[opt] = ratio;
        sampleBoxes[opt] = {
          x: optCenterX - sampleRadius,
          y: optCenterY - sampleRadius,
          size: sampleRadius * 2,
          ratio
        };
      });

      // Ordena opções pela densidade de preenchimento decrescente
      const sorted = Object.entries(fillRatios).sort((a, b) => b[1] - a[1]);
      const [topOpt, topRatio] = sorted[0];
      const [secondOpt, secondRatio] = sorted[1];

      let detectedAnswer = null;
      let confidence = 0.5;
      let doubt = false;
      let notes = '';

      // Regras de Decisão OMR:
      // 1. Marcação Clara e Limpa: preenchimento superior a 30% e pelo menos 1.7x superior à 2ª opção
      if (topRatio >= 0.28 && topRatio >= secondRatio * 1.65) {
        detectedAnswer = topOpt;
        confidence = Math.min(0.99, 0.75 + (topRatio - secondRatio) * 0.6);
        doubt = false;
        notes = 'Marcação limpa e nítida';
      }
      // 2. Questão em Branco: nenhuma alternativa com preenchimento significativo (< 18%)
      else if (topRatio < 0.18) {
        detectedAnswer = null;
        confidence = 0.92;
        doubt = false;
        notes = 'Questão em branco (sem preenchimento)';
      }
      // 3. Rasura ou Dupla Marcação: duas opções preenchidas com valor acima de 22%
      else if (topRatio >= 0.24 && secondRatio >= 0.20) {
        detectedAnswer = topOpt;
        confidence = 0.45;
        doubt = true;
        notes = `Possível rasura entre [${topOpt}] (${Math.round(topRatio * 100)}%) e [${secondOpt}] (${Math.round(secondRatio * 100)}%)`;
      }
      // 4. Marca Fraca ou Marcação Incompleta
      else if (topRatio >= 0.18 && topRatio < 0.28) {
        detectedAnswer = topOpt;
        confidence = 0.62;
        doubt = true;
        notes = `Marcação fraca em [${topOpt}] (${Math.round(topRatio * 100)}%)`;
      } else {
        detectedAnswer = topOpt;
        confidence = 0.55;
        doubt = true;
        notes = 'Contraste indeterminado';
      }

      questions.push({
        num: i,
        answer: detectedAnswer,
        confidence: Math.round(confidence * 100) / 100,
        doubt,
        notes,
        fillRatios,
        sampleBoxes
      });
    }

    // Calcula confiança geral
    const sumConf = questions.reduce((acc, q) => acc + q.confidence, 0);
    const overallConfidence = Math.round((sumConf / 10) * 100) / 100;

    return { questions, overallConfidence };
  }

  // Desenha visualização com caixas delimitadoras coloridas no canvas do cartão
  function drawDetectionOverlay(cardCanvas, questions) {
    const ctx = cardCanvas.getContext('2d');
    questions.forEach(q => {
      if (!q.sampleBoxes) return;
      Object.entries(q.sampleBoxes).forEach(([opt, box]) => {
        const isSelected = q.answer === opt;
        ctx.lineWidth = isSelected ? 3 : 1;

        if (isSelected) {
          if (q.doubt) {
            ctx.strokeStyle = '#F59E0B'; // Amarelo/Laranja: Dúvida ou Rasura
            ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
          } else {
            ctx.strokeStyle = '#10B981'; // Verde: Alta confiança
            ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
          }
        } else {
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
          ctx.fillStyle = 'rgba(148, 163, 184, 0.08)';
        }

        ctx.beginPath();
        ctx.rect(box.x, box.y, box.size, box.size);
        ctx.fill();
        ctx.stroke();

        // Letra identificadora
        if (isSelected) {
          ctx.fillStyle = q.doubt ? '#D97706' : '#059669';
          ctx.font = 'bold 11px sans-serif';
          ctx.fillText(opt, box.x + 2, box.y - 3);
        }
      });
    });
  }

  // Chamada de validação multi-modal com Gemini Vision via API do backend
  async function verifyWithGeminiVision(croppedCardDataUrl, contextInfo = {}) {
    try {
      const res = await fetch('/api/exam-correct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + (localStorage.getItem('tkst_session_token') || '')
        },
        body: JSON.stringify({
          imageBase64: croppedCardDataUrl,
          mimeType: 'image/jpeg',
          examCode: contextInfo.examCode || '',
          kyu: contextInfo.kyu || null,
          expectedKey: contextInfo.expectedKey || null
        })
      });

      if (!res.ok) {
        return { success: false, error: 'Serviço Gemini Vision indisponível temporariamente.' };
      }

      const json = await res.json();
      return json;
    } catch(err) {
      return { success: false, error: err.message };
    }
  }

  // =========================================================================
  // PIPELINE PRINCIPAL DO MOTOR OMR TKST
  // =========================================================================
  async function scanExamImage(imageSource, options = {}) {
    const opts = {
      forceAi: false,
      autoRotate: true,
      examCode: '',
      expectedKey: null,
      kyu: null,
      ...options
    };

    // 1. Carrega imagem
    const img = await loadImage(imageSource);
    let workCanvas = createCanvas(img.naturalWidth || img.width, img.naturalHeight || img.height);
    const workCtx = workCanvas.getContext('2d');
    workCtx.drawImage(img, 0, 0);

    // 2. Pré-processamento: Rotação Correta (0/90/180/270)
    let orientationInfo = { angle: 0, qrData: null };
    if (opts.autoRotate) {
      orientationInfo = await detectAndCorrectOrientation(workCanvas);
      workCanvas = orientationInfo.canvas;
    }

    // Extrai código do exame do QR se detectado
    let detectedExamCode = opts.examCode;
    if (!detectedExamCode && orientationInfo.qrData) {
      const match = orientationInfo.qrData.match(/TKST-([A-Z0-9]{4,6})/i);
      if (match) detectedExamCode = match[1];
    }

    // 3. Recorte e enquadramento do Cartão OMR
    const { cardCanvas, bounds } = cropOmrCard(workCanvas);

    // 4. Leitura nativa das bolhas via processamento de imagem
    const omrResult = readBubbleGrid(cardCanvas);

    // 5. Validação Multi-Modal com Gemini Vision:
    // Disparada automaticamente caso haja rasura/dúvida ou se solicitado pelo Sensei
    const hasDoubt = omrResult.questions.some(q => q.doubt === true);
    const lowConfidence = omrResult.overallConfidence < 0.85;

    let geminiResult = null;
    let usedAi = false;

    if (opts.forceAi || (hasDoubt && !opts.skipAi) || (lowConfidence && !opts.skipAi)) {
      const cardBase64 = cardCanvas.toDataURL('image/jpeg', 0.88);
      geminiResult = await verifyWithGeminiVision(cardBase64, {
        examCode: detectedExamCode,
        kyu: opts.kyu,
        expectedKey: opts.expectedKey
      });

      if (geminiResult && geminiResult.success && Array.isArray(geminiResult.questions)) {
        usedAi = true;
        // Mescla as predições do Gemini com a leitura OMR, resolvendo as rasuras
        geminiResult.questions.forEach(gq => {
          const lq = omrResult.questions.find(q => q.num === gq.num);
          if (lq) {
            // Se o Gemini tem alta confiança e resolveu uma dúvida ou rasura
            if (lq.doubt || gq.confidence >= lq.confidence) {
              lq.answer = gq.answer;
              lq.confidence = gq.confidence;
              lq.doubt = gq.doubt;
              lq.notes = (gq.notes ? gq.notes + ' ' : '') + '(Validado via Gemini Vision)';
            }
          }
        });

        // Recalcula confiança combinada
        const sum = omrResult.questions.reduce((acc, q) => acc + q.confidence, 0);
        omrResult.overallConfidence = Math.round((sum / 10) * 100) / 100;
        if (geminiResult.examCode && !detectedExamCode) {
          detectedExamCode = geminiResult.examCode;
        }
      }
    }

    // 6. Desenha overlay de auditoria sobre o cartão
    drawDetectionOverlay(cardCanvas, omrResult.questions);

    return {
      success: true,
      examCode: detectedExamCode,
      questions: omrResult.questions,
      overallConfidence: omrResult.overallConfidence,
      usedAi,
      geminiAvailable: geminiResult ? Boolean(geminiResult.geminiAvailable) : true,
      hasDoubt: omrResult.questions.some(q => q.doubt),
      croppedCardDataUrl: cardCanvas.toDataURL('image/jpeg', 0.90),
      rawImageDataUrl: workCanvas.toDataURL('image/jpeg', 0.82),
      cardBounds: bounds,
      rotationAngle: orientationInfo.angle,
      timestamp: Date.now()
    };
  }

  // Expõe o motor globalmente
  window.TKST_OMR_ENGINE = {
    scanExamImage,
    readBubbleGrid,
    applyAdaptiveContrast,
    rotateCanvas,
    detectAndCorrectOrientation,
    cropOmrCard,
    drawDetectionOverlay,
    verifyWithGeminiVision
  };

})();
