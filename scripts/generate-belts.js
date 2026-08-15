const fs = require('fs');
const path = require('path');

const belts = [
  { name: 'faixa-branca', mainColor: '#F8FAFC', darkColor: '#CBD5E1', stitchColor: '#94A3B8', tipColor: '#F8FAFC', stripes: 0 },
  { name: 'faixa-amarela', mainColor: '#F5BE00', darkColor: '#C69500', stitchColor: '#8C6800', tipColor: '#F5BE00', stripes: 0 },
  { name: 'faixa-vermelha', mainColor: '#E63946', darkColor: '#B51A2B', stitchColor: '#7A0E1A', tipColor: '#E63946', stripes: 0 },
  { name: 'faixa-laranja', mainColor: '#F77F00', darkColor: '#C45700', stitchColor: '#873B00', tipColor: '#F77F00', stripes: 0 },
  { name: 'faixa-verde', mainColor: '#10B981', darkColor: '#059669', stitchColor: '#046A4A', tipColor: '#10B981', stripes: 0 },
  { name: 'faixa-roxa', mainColor: '#8B5CF6', darkColor: '#6D28D9', stitchColor: '#4C1D95', tipColor: '#8B5CF6', stripes: 0 },
  { name: 'faixa-marrom', mainColor: '#8B4513', darkColor: '#5C2D0C', stitchColor: '#3B1C08', tipColor: '#8B4513', stripes: 0 },
  { name: 'faixa-preta', mainColor: '#1E293B', darkColor: '#0F172A', stitchColor: '#0A0E17', tipColor: '#DC2626', stripes: 2, goldText: true }
];

function generateBeltSvg(belt) {
  const isBlack = belt.name === 'faixa-preta';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="100%" height="100%">
  <defs>
    <linearGradient id="gradMain_${belt.name}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${belt.mainColor}" />
      <stop offset="100%" stop-color="${belt.darkColor}" />
    </linearGradient>
    <linearGradient id="gradKnot_${belt.name}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${belt.mainColor}" />
      <stop offset="50%" stop-color="${belt.darkColor}" />
      <stop offset="100%" stop-color="${belt.stitchColor}" />
    </linearGradient>
    <filter id="dropShadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#000" flood-opacity="0.65" />
    </filter>
  </defs>

  <g filter="url(#dropShadow)">
    <!-- Back Loop of Belt -->
    <path d="M 35,95 C 35,50 205,50 205,95 C 205,108 185,115 120,115 C 55,115 35,108 35,95 Z" 
          fill="url(#gradMain_${belt.name})" stroke="${belt.stitchColor}" stroke-width="2.5" />
    
    <!-- Inner Loop Shadow/Folds -->
    <path d="M 50,92 C 75,70 165,70 190,92" 
          fill="none" stroke="${belt.stitchColor}" stroke-width="1.5" stroke-dasharray="4,3" opacity="0.6" />

    <!-- Left Hanging End -->
    <path d="M 105,120 L 75,215 L 105,222 L 122,125 Z" 
          fill="url(#gradMain_${belt.name})" stroke="${belt.stitchColor}" stroke-width="2.5" />
    <!-- Left End Stitching lines -->
    <line x1="84" y1="205" x2="110" y2="130" stroke="${belt.stitchColor}" stroke-width="1" opacity="0.5" />
    <line x1="94" y1="212" x2="118" y2="128" stroke="${belt.stitchColor}" stroke-width="1" opacity="0.5" />

    <!-- Right Hanging End (with Karate Patch / Stripes) -->
    <path d="M 118,125 L 140,222 L 170,215 L 135,120 Z" 
          fill="url(#gradMain_${belt.name})" stroke="${belt.stitchColor}" stroke-width="2.5" />
    <!-- Right End Stitching lines -->
    <line x1="145" y1="210" x2="128" y2="130" stroke="${belt.stitchColor}" stroke-width="1" opacity="0.5" />
    <line x1="155" y1="205" x2="134" y2="128" stroke="${belt.stitchColor}" stroke-width="1" opacity="0.5" />

    ${isBlack ? `
    <!-- Red Rank Tip on Black Belt -->
    <polygon points="144,206 140,222 170,215 166,199" fill="#DC2626" stroke="#7F1D1D" stroke-width="1" />
    <!-- Gold Dan Stripes -->
    <rect x="144" y="182" width="23" height="3.5" transform="rotate(-12 144 182)" fill="#F5BE00" />
    <rect x="142" y="190" width="23" height="3.5" transform="rotate(-12 142 190)" fill="#F5BE00" />
    <!-- Shotokan Kanji Gold Embroidery -->
    <text x="136" y="160" transform="rotate(-12 136 160)" fill="#F5BE00" font-size="8" font-family="serif" font-weight="bold">空手道</text>
    ` : ''}

    <!-- Center Knot (Koma-musubi) -->
    <path d="M 98,105 C 98,98 142,98 142,105 C 146,120 144,134 138,138 C 128,142 112,142 102,138 C 96,134 94,120 98,105 Z" 
          fill="url(#gradKnot_${belt.name})" stroke="${belt.stitchColor}" stroke-width="3" />
    
    <!-- Knot Cross Fold Detail -->
    <path d="M 102,108 C 112,118 128,124 138,134" 
          fill="none" stroke="${belt.mainColor}" stroke-width="2" opacity="0.7" />
    <path d="M 138,108 C 128,118 112,124 102,134" 
          fill="none" stroke="${belt.stitchColor}" stroke-width="2" opacity="0.6" />
  </g>
</svg>`;
}

const dir = path.join(__dirname, '..', 'assets', 'images', 'faixas');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

belts.forEach(b => {
  const svg = generateBeltSvg(b);
  const svgPath = path.join(dir, `${b.name}.svg`);
  fs.writeFileSync(svgPath, svg);
  console.log('Saved SVG:', svgPath);
});
