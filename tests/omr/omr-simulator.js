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

// Gera cartão OMR sintetizado com respostas conhecidas (500x240 formato oficial TKST)
function generateSyntheticCard(answers, options = {}) {
  const w = 500;
  const h = 240;
  const buffer = createEmptyGrid(w, h);

  const col1Options = { 'A': 0.155, 'B': 0.240, 'C': 0.325, 'D': 0.410 };
  const col2Options = { 'A': 0.645, 'B': 0.730, 'C': 0.815, 'D': 0.900 };

  const rowStartY = 0.28 * h;
  const rowHeight = 0.138 * h;
  const radius = Math.round(w * 0.034);

  const weakMarks = options.weakMarks || [];
  const erasures = options.erasures || {};

  answers.forEach((ans, idx) => {
    const qNum = idx + 1;
    const isCol2 = qNum > 5;
    const rowIndex = isCol2 ? qNum - 6 : qNum - 1;
    const optMap = isCol2 ? col2Options : col1Options;
    const y = rowStartY + (rowIndex + 0.5) * rowHeight;

    if (ans && optMap[ans]) {
      const optCenterX = optMap[ans] * w;
      const density = weakMarks.includes(qNum) ? 0.38 : 0.85;
      fillRect(buffer, w, h, optCenterX - radius, y - radius, radius * 2, radius * 2, density);
    }

    if (erasures[qNum] && optMap[erasures[qNum]]) {
      const eraseCenterX = optMap[erasures[qNum]] * w;
      fillRect(buffer, w, h, eraseCenterX - radius, y - radius, radius * 2, radius * 2, 0.40);
    }
  });

  return { buffer, width: w, height: h };
}

// Avaliador de grade OMR Headless (mesmo algoritmo do cliente)
function evaluateGrid(buffer, w, h) {
  const col1Options = { 'A': 0.155, 'B': 0.240, 'C': 0.325, 'D': 0.410 };
  const col2Options = { 'A': 0.645, 'B': 0.730, 'C': 0.815, 'D': 0.900 };
  const rowStartY = 0.28 * h;
  const rowHeight = 0.138 * h;
  const sampleRadius = Math.round(w * 0.034);

  const results = [];

  for (let i = 1; i <= 10; i++) {
    const isCol2 = i > 5;
    const rowIndex = isCol2 ? i - 6 : i - 1;
    const optMap = isCol2 ? col2Options : col1Options;
    const y = rowStartY + (rowIndex + 0.5) * rowHeight;

    const fillRatios = {};

    ['A', 'B', 'C', 'D'].forEach(opt => {
      const optCenterX = optMap[opt] * w;
      let darkPixels = 0;
      let totalSampled = 0;

      for (let dy = -sampleRadius; dy <= sampleRadius; dy++) {
        for (let dx = -sampleRadius; dx <= sampleRadius; dx++) {
          if (dx * dx + dy * dy <= sampleRadius * sampleRadius) {
            const px = Math.round(optCenterX + dx);
            const py = Math.round(y + dy);
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

    if (topRatio >= 0.28 && topRatio >= secondRatio * 1.60) {
      detectedAnswer = topOpt;
      confidence = Math.min(0.99, 0.78 + (topRatio - secondRatio) * 0.5);
      doubt = false;
    } else if (topRatio < 0.17) {
      detectedAnswer = null;
      confidence = 0.92;
      doubt = false;
    } else if (topRatio >= 0.22 && secondRatio >= 0.18) {
      detectedAnswer = topOpt;
      confidence = 0.45;
      doubt = true;
    } else if (topRatio >= 0.17 && topRatio < 0.28) {
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
