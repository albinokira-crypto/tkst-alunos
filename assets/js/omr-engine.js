/**
 * TKST Alunos - Motor de Correção de Provas OMR (Optical Mark Recognition)
 * Pré-processamento com rotação automática (0/90/180/270), enquadramento de perspectiva,
 * contraste adaptativo, leitura de bolhas e validação multi-modal com Gemini Vision.
 */

(function() {
  'use strict';

  // O Cartão Oficial de Respostas da TKST mede 90mm de largura x ~42mm de altura (formato horizontal / landscape)
  const OMR_CARD_WIDTH = 500;
  const OMR_CARD_HEIGHT = 240;

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
  async function detectAndCorrectOrientation(sourceCanvas, mode = 'card') {
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

    // 2. Se for modo folha inteira A4 (que é retrato, h > w) e a foto estiver deitada em paisagem (w > 1.25 * h)
    if (mode === 'sheet' && sourceCanvas.width > sourceCanvas.height * 1.25) {
      return { canvas: rotateCanvas(sourceCanvas, 270), angle: 270, qrData: null };
    }

    return { canvas: sourceCanvas, angle: 0, qrData: null };
  }

  // Converte imagem em escala de cinza e aplica contraste adaptativo calibrado para caneta e lápis (grafite)
  function applyAdaptiveContrast(ctx, width, height) {
    const imgData = ctx.getImageData(0, 0, width, height);
    const d = imgData.data;
    const totalPixels = width * height;

    // 1. Calcula histograma de cinza e preserva mapa de luminância original
    let sumLuminance = 0;
    const grayData = new Uint8Array(totalPixels);
    for (let i = 0, p = 0; i < d.length; i += 4, p++) {
      const gray = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
      grayData[p] = gray;
      sumLuminance += gray;
    }
    const meanLuminance = sumLuminance / totalPixels;

    // 2. Limiar adaptativo calibrado:
    // Lápis (grafite) reflete luz da câmera e tem cinza entre 110 e 195 em fundo branco (220-255).
    // Usamos limiar dinâmico expandido para capturar traços de grafite.
    const thresholdPencil = Math.max(80, Math.min(212, meanLuminance * 0.90));
    const thresholdPen = Math.max(65, Math.min(185, meanLuminance * 0.80));

    const binaryData = new Uint8Array(totalPixels);
    for (let p = 0; p < totalPixels; p++) {
      const g = grayData[p];
      const isDark = g < thresholdPencil ? 1 : 0;
      binaryData[p] = isDark;
      const val = isDark ? 0 : 255;
      const idx = p * 4;
      d[idx] = val;
      d[idx + 1] = val;
      d[idx + 2] = val;
    }

    ctx.putImageData(imgData, 0, 0);
    return { binaryData, grayData, thresholdPencil, thresholdPen, meanLuminance };
  }

  // Localiza e extrai o Cartão de Respostas (OMR Card) com correção de enquadramento
  function cropOmrCard(canvas, mode = 'card') {
    const w = canvas.width;
    const h = canvas.height;

    let cardX = 0;
    let cardY = 0;
    let cardW = w;
    let cardH = h;

    if (mode === 'sheet') {
      // Modo Folha A4 Inteira Retrato:
      // O Cartão de Respostas fica no cabeçalho superior direito da folha
      cardX = Math.round(w * 0.44);
      cardY = Math.round(h * 0.02);
      cardW = Math.round(w * 0.54);
      cardH = Math.round(h * 0.25);
    } else {
      // Modo Cartão (Padrão e Recomendado):
      // A câmera do celular já foi enquadrada pelo usuário diretamente sobre o Cartão de Respostas
      if (h > w * 1.15) {
        // Celular segurado em pé (vertical/retrato): o cartão horizontal ocupa a faixa central
        cardX = Math.round(w * 0.04);
        cardW = Math.round(w * 0.92);
        cardY = Math.round(h * 0.22);
        cardH = Math.round(h * 0.56);
      } else {
        // Foto horizontal / já recortada: margem de 4% para descartar bordas de mesa
        cardX = Math.round(w * 0.04);
        cardY = Math.round(h * 0.04);
        cardW = Math.round(w * 0.92);
        cardH = Math.round(h * 0.92);
      }
    }

    const cardCanvas = createCanvas(OMR_CARD_WIDTH, OMR_CARD_HEIGHT);
    const cardCtx = cardCanvas.getContext('2d');

    cardCtx.imageSmoothingEnabled = true;
    cardCtx.imageSmoothingQuality = 'high';
    cardCtx.drawImage(canvas, cardX, cardY, cardW, cardH, 0, 0, OMR_CARD_WIDTH, OMR_CARD_HEIGHT);

    return {
      cardCanvas,
      bounds: { x: cardX, y: cardY, width: cardW, height: cardH }
    };
  }

  // Lê a grade de 10 questões no cartão OMR normalizado (500x240)
  function readBubbleGrid(cardCanvas) {
    const ctx = cardCanvas.getContext('2d');
    const w = cardCanvas.width;
    const h = cardCanvas.height;

    // Aplica binarização adaptativa e mapa de cinza preservado
    const { binaryData, grayData, meanLuminance } = applyAdaptiveContrast(ctx, w, h);

    // Mapeamento exato da grade do Cartão Oficial TKST:
    // 2 colunas: Coluna 1 (Q01 a Q05 na esquerda) e Coluna 2 (Q06 a Q10 na direita)
    // 5 linhas por coluna
    // Posições percentuais normalizadas baseadas no CSS .exam-header-omr-card
    const col1Options = {
      'A': 0.155,
      'B': 0.240,
      'C': 0.325,
      'D': 0.410
    };

    const col2Options = {
      'A': 0.645,
      'B': 0.730,
      'C': 0.815,
      'D': 0.900
    };

    const rowStartY = 0.28 * h; // Pula o cabeçalho "CARTÃO DE RESPOSTAS / NOTA"
    const rowHeight = 0.138 * h; // 5 linhas distribuídas até ~96% da altura

    const questions = [];

    for (let i = 1; i <= 10; i++) {
      const isCol2 = i > 5;
      const rowIndex = isCol2 ? i - 6 : i - 1;
      const optMap = isCol2 ? col2Options : col1Options;
      const y = rowStartY + (rowIndex + 0.5) * rowHeight;

      const fillRatios = {};
      const darknessScores = {};
      const sampleBoxes = {};
      const sampleRadius = Math.round(w * 0.034); // ~17px de raio em 500px

      ['A', 'B', 'C', 'D'].forEach(opt => {
        const optCenterX = optMap[opt] * w;
        const optCenterY = y;

        let darkPixels = 0;
        let sumLuminance = 0;
        let totalSampled = 0;

        for (let dy = -sampleRadius; dy <= sampleRadius; dy++) {
          for (let dx = -sampleRadius; dx <= sampleRadius; dx++) {
            if (dx * dx + dy * dy <= sampleRadius * sampleRadius) {
              const px = Math.round(optCenterX + dx);
              const py = Math.round(optCenterY + dy);
              if (px >= 0 && px < w && py >= 0 && py < h) {
                const idx = py * w + px;
                if (binaryData[idx] === 1) darkPixels++;
                if (grayData) sumLuminance += grayData[idx];
                totalSampled++;
              }
            }
          }
        }

        const ratio = totalSampled > 0 ? darkPixels / totalSampled : 0;
        const avgGray = totalSampled > 0 ? (sumLuminance / totalSampled) : meanLuminance;
        // Mede o escurecimento relativo do quadradinho em relação ao papel de fundo (grafite do lápis)
        const darkness = Math.max(0, meanLuminance - avgGray);

        fillRatios[opt] = ratio;
        darknessScores[opt] = darkness;
        sampleBoxes[opt] = {
          x: optCenterX - sampleRadius,
          y: optCenterY - sampleRadius,
          size: sampleRadius * 2,
          ratio,
          darkness
        };
      });

      // Pontuação combinada ponderada (binário + profundidade do grafite)
      const combinedScores = {};
      ['A', 'B', 'C', 'D'].forEach(opt => {
        combinedScores[opt] = (fillRatios[opt] * 0.65) + ((darknessScores[opt] / 100) * 0.35);
      });

      // Ordena opções pela pontuação combinada decrescente
      const sorted = Object.entries(combinedScores).sort((a, b) => b[1] - a[1]);
      const [topOpt, topCombined] = sorted[0];
      const [secondOpt, secondCombined] = sorted[1];
      const topRatio = fillRatios[topOpt];
      const secondRatio = fillRatios[secondOpt];
      const topDarkness = darknessScores[topOpt];
      const secondDarkness = darknessScores[secondOpt];

      let detectedAnswer = null;
      let confidence = 0.5;
      let doubt = false;
      let notes = '';

      // Regras de Decisão OMR com suporte total a CANETA e LÁPIS (GRAFITE):
      // 1. Marcação Clara e Nítida (Caneta escura ou lápis bem preenchido)
      if ((topRatio >= 0.22 && topRatio >= secondRatio * 1.45) || (topDarkness >= 28 && topDarkness >= secondDarkness * 1.50)) {
        detectedAnswer = topOpt;
        confidence = Math.min(0.99, 0.82 + (topRatio - secondRatio) * 0.4);
        doubt = false;
        notes = 'Marcação nítida';
      }
      // 2. Marcação a Lápis (Grafite mais claro, traços médios ou sombreamento)
      else if ((topRatio >= 0.14 || topDarkness >= 18) && (topCombined >= secondCombined * 1.30)) {
        detectedAnswer = topOpt;
        confidence = Math.min(0.96, 0.78 + (topDarkness / 120));
        doubt = false;
        notes = `Marcação a lápis detectada em [${topOpt}]`;
      }
      // 3. Questão em Branco (sem marcação evidente em nenhuma alternativa)
      else if (topRatio < 0.10 && topDarkness < 12) {
        detectedAnswer = null;
        confidence = 0.94;
        doubt = false;
        notes = 'Questão em branco (sem preenchimento)';
      }
      // 4. Possível Rasura ou Dupla Marcação
      else if ((topRatio >= 0.18 && secondRatio >= 0.14) || (topDarkness >= 22 && secondDarkness >= 18)) {
        detectedAnswer = topOpt;
        confidence = 0.48;
        doubt = true;
        notes = `Possível rasura entre [${topOpt}] e [${secondOpt}]`;
      }
      // 5. Marcação Leve / Toque de Lápis
      else if (topRatio >= 0.10 || topDarkness >= 12) {
        detectedAnswer = topOpt;
        confidence = 0.65;
        doubt = true;
        notes = `Marcação leve em [${topOpt}] (${Math.round(topRatio * 100)}%)`;
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
        darknessScores,
        sampleBoxes
      });
    }

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
        ctx.lineWidth = isSelected ? 2.5 : 1;

        if (isSelected) {
          if (q.doubt) {
            ctx.strokeStyle = '#F59E0B'; // Amarelo/Laranja: Dúvida ou Rasura
            ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
          } else {
            ctx.strokeStyle = '#10B981'; // Verde: Alta confiança
            ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
          }
        } else {
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
          ctx.fillStyle = 'rgba(148, 163, 184, 0.08)';
        }

        ctx.beginPath();
        ctx.rect(box.x, box.y, box.size, box.size);
        ctx.fill();
        ctx.stroke();

        if (isSelected) {
          ctx.fillStyle = q.doubt ? '#D97706' : '#059669';
          ctx.font = 'bold 12px sans-serif';
          ctx.fillText(opt, box.x + 3, box.y - 3);
        }
      });
    });
  }

  // Chamada de validação multi-modal com Gemini Vision via API do backend
  async function verifyWithGeminiVision(croppedCardDataUrl, contextInfo = {}) {
    try {
      const headers = { 'Content-Type': 'application/json' };
      const token = localStorage.getItem('tkst_session_token');
      if (token) {
        headers['Authorization'] = 'Bearer ' + token;
      }

      const res = await fetch('/api/exam-correct', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          imageBase64: croppedCardDataUrl,
          mimeType: 'image/jpeg',
          examCode: contextInfo.examCode || '',
          kyu: contextInfo.kyu || null,
          expectedKey: contextInfo.expectedKey || null
        })
      });

      if (!res.ok) {
        return { success: false, geminiAvailable: false, error: 'Serviço Gemini Vision indisponível temporariamente.' };
      }

      const json = await res.json();
      return json;
    } catch(err) {
      return { success: false, geminiAvailable: false, error: err.message };
    }
  }

  // =========================================================================
  // PIPELINE PRINCIPAL DO MOTOR OMR TKST
  // =========================================================================
  async function scanExamImage(imageSource, options = {}) {
    const opts = {
      forceAi: false,
      autoRotate: true,
      mode: 'card', // 'card' (apenas cartão) ou 'sheet' (folha inteira A4)
      examCode: '',
      expectedKey: null,
      kyu: null,
      ...options
    };

    // 1. Carrega imagem
    const img = await loadImage(imageSource);
    let origW = img.naturalWidth || img.width;
    let origH = img.naturalHeight || img.height;
    const maxDim = 2048;
    let scale = 1;
    if (origW > maxDim || origH > maxDim) {
      scale = Math.min(maxDim / origW, maxDim / origH);
    }
    const finalW = Math.max(1, Math.round(origW * scale));
    const finalH = Math.max(1, Math.round(origH * scale));
    let workCanvas = createCanvas(finalW, finalH);
    const workCtx = workCanvas.getContext('2d');
    workCtx.imageSmoothingEnabled = true;
    workCtx.imageSmoothingQuality = 'high';
    workCtx.drawImage(img, 0, 0, finalW, finalH);

    // 2. Pré-processamento: Rotação Correta (0/90/180/270)
    let orientationInfo = { angle: 0, qrData: null };
    if (opts.autoRotate) {
      orientationInfo = await detectAndCorrectOrientation(workCanvas, opts.mode);
      workCanvas = orientationInfo.canvas;
    }

    // Extrai código do exame do QR se detectado
    let detectedExamCode = opts.examCode;
    if (!detectedExamCode && orientationInfo.qrData) {
      const match = orientationInfo.qrData.match(/TKST-([A-Z0-9]{4,6})/i);
      if (match) detectedExamCode = match[1];
    }

    // 3. Recorte e enquadramento do Cartão OMR conforme o modo escolhido
    const { cardCanvas, bounds } = cropOmrCard(workCanvas, opts.mode);

    // 4. Leitura nativa das bolhas via processamento de imagem
    const omrResult = readBubbleGrid(cardCanvas);

    // 5. Validação Multi-Modal com Gemini Vision (se solicitado ou em caso de dúvida/rasura)
    const hasDoubt = omrResult.questions.some(q => q.doubt === true);
    const lowConfidence = omrResult.overallConfidence < 0.82;

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
        geminiResult.questions.forEach(gq => {
          const lq = omrResult.questions.find(q => q.num === gq.num);
          if (lq) {
            if (lq.doubt || gq.confidence >= lq.confidence) {
              lq.answer = gq.answer;
              lq.confidence = gq.confidence;
              lq.doubt = gq.doubt;
              lq.notes = (gq.notes ? gq.notes + ' ' : '') + '(Validado via Gemini Vision)';
            }
          }
        });

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
      geminiAvailable: geminiResult ? Boolean(geminiResult.geminiAvailable !== false) : true,
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
