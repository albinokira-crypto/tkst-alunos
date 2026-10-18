// tests/omr/omr-simulator.js
// Simulador de Grade OMR e Avaliador de Precisão para Testes Automatizados

function createEmptyGrid(width, height) {
  const size = width * height;
  return new Uint8Array(size); // 0 = branco, 1 = escuro (preenchido)
}

function fillRect(buffer, width, height, rx, ry, rw, rh, fillDensity = 1.0) {
  for (let y = Math.round(ry); y < Math.round(ry + rh); y++) {
    for (let x = Math.round(rx); x < Math.round(rx + rw); x++) {
      if (x >= 0 && x < width && y >= 0 && y < height) {
        if (Math.random() <= fillDensity) {
          buffer[y * width + x] = 1;
        }
      }
    }
  }
}

// Gera cartão OMR sintetizado com respostas conhecidas
function generateSyntheticCard(answers, options = {}) {
  const w = 340;
  const h = 460;
  const buffer = createEmptyGrid(w, h);

  const col1X = 0.08 * w;
  const col2X = 0.54 * w;
  const colWidth = 0.38 * w;
  const rowStartY = 0.24 * h;
  const rowHeight = 0.14 * h;
  const optWidth = colWidth / 4;

  const weakMarks = options.weakMarks || [];
  const erasures = options.erasures || {};

  answers.forEach((ans, idx) => {
    const qNum = idx + 1;
    const isCol2 = qNum > 5;
    const rowIndex = isCol2 ? qNum - 6 : qNum - 1;
    const colX = isCol2 ? col2X : col1X;
    const y = rowStartY + rowIndex * rowHeight;

    const optIndex = ['A', 'B', 'C', 'D'].indexOf(ans);
    if (optIndex !== -1) {
      const optCenterX = colX + (optIndex + 0.5) * optWidth;
      const optCenterY = y + rowHeight * 0.5;
      const radius = optWidth * 0.26;

      const density = weakMarks.includes(qNum) ? 0.38 : 0.85;
      fillRect(buffer, w, h, optCenterX - radius, optCenterY - radius, radius * 2, radius * 2, density);
    }

    // Se houver rasura nesta questão (marcação cancelada)
    if (erasures[qNum]) {
      const erasedOptIdx = ['A', 'B', 'C', 'D'].indexOf(erasures[qNum]);
      if (erasedOptIdx !== -1) {
        const eraseCenterX = colX + (erasedOptIdx + 0.5) * optWidth;
        const eraseCenterY = y + rowHeight * 0.5;
        const radius = optWidth * 0.26;
        // Rasura tem preenchimento parcial ou riscado
        fillRect(buffer, w, h, eraseCenterX - radius, eraseCenterY - radius, radius * 2, radius * 2, 0.40);
      }
    }
  });

  return { buffer, width: w, height: h };
}

// Avaliador de grade OMR Headless (mesmo algoritmo do cliente)
function evaluateGrid(buffer, w, h) {
  const col1X = 0.08 * w;
  const col2X = 0.54 * w;
  const colWidth = 0.38 * w;
  const rowStartY = 0.24 * h;
  const rowHeight = 0.14 * h;
  const optWidth = colWidth / 4;
  const options = ['A', 'B', 'C', 'D'];

  const results = [];

  for (let i = 1; i <= 10; i++) {
    const isCol2 = i > 5;
    const rowIndex = isCol2 ? i - 6 : i - 1;
    const colX = isCol2 ? col2X : col1X;
    const y = rowStartY + rowIndex * rowHeight;

    const fillRatios = {};

    options.forEach((opt, optIdx) => {
      const optCenterX = colX + (optIdx + 0.5) * optWidth;
      const optCenterY = y + rowHeight * 0.5;
      const sampleRadius = Math.round(optWidth * 0.26);

      let darkPixels = 0;
      let totalSampled = 0;

      for (let dy = -sampleRadius; dy <= sampleRadius; dy++) {
        for (let dx = -sampleRadius; dx <= sampleRadius; dx++) {
          if (dx * dx + dy * dy <= sampleRadius * sampleRadius) {
            const px = Math.round(optCenterX + dx);
            const py = Math.round(optCenterY + dy);
            if (px >= 0 && px < w && py >= 0 && py < h) {
              if (buffer[py * w + px] === 1) darkPixels++;
              totalSampled++;
            }
          }
        }
      }

      fillRatios[opt] = totalSampled > 0 ? darkPixels / totalSampled : 0;
    });

    const sorted = Object.entries(fillRatios).sort((a, b) => b[1] - a[1]);
    const [topOpt, topRatio] = sorted[0];
    const [secondOpt, secondRatio] = sorted[1];

    let detectedAnswer = null;
    let confidence = 0.5;
    let doubt = false;

    if (topRatio >= 0.28 && topRatio >= secondRatio * 1.65) {
      detectedAnswer = topOpt;
      confidence = Math.min(0.99, 0.75 + (topRatio - secondRatio) * 0.6);
      doubt = false;
    } else if (topRatio < 0.18) {
      detectedAnswer = null;
      confidence = 0.92;
      doubt = false;
    } else if (topRatio >= 0.24 && secondRatio >= 0.20) {
      detectedAnswer = topOpt;
      confidence = 0.45;
      doubt = true;
    } else if (topRatio >= 0.18 && topRatio < 0.28) {
      detectedAnswer = topOpt;
      confidence = 0.62;
      doubt = true;
    } else {
      detectedAnswer = topOpt;
      confidence = 0.55;
      doubt = true;
    }

    results.push({
      num: i,
      answer: detectedAnswer,
      confidence,
      doubt,
      fillRatios
    });
  }

  return results;
}

module.exports = {
  generateSyntheticCard,
  evaluateGrid
};
