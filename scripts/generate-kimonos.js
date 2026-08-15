const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, '..', 'assets', 'images', 'faixas');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const belts = [
  { id: 'branca', name: 'Faixa Branca', color1: '#FFFFFF', color2: '#E2E8F0', color3: '#CBD5E1', border: '#94A3B8' },
  { id: 'amarela', name: 'Faixa Amarela', color1: '#FCD34D', color2: '#F59E0B', color3: '#D97706', border: '#B45309' },
  { id: 'vermelha', name: 'Faixa Vermelha', color1: '#F87171', color2: '#DC2626', color3: '#991B1B', border: '#7F1D1D' },
  { id: 'laranja', name: 'Faixa Laranja', color1: '#FB923C', color2: '#EA580C', color3: '#C2410C', border: '#9A3412' },
  { id: 'verde', name: 'Faixa Verde', color1: '#34D399', color2: '#059669', color3: '#065F46', border: '#064E3B' },
  { id: 'roxa', name: 'Faixa Roxa', color1: '#A78BFA', color2: '#7C3AED', color3: '#5B21B6', border: '#4C1D95' },
  { id: 'marrom', name: 'Faixa Marrom', color1: '#A16207', color2: '#78350F', color3: '#451A03', border: '#381602' },
  { id: 'preta', name: 'Faixa Preta', color1: '#27272A', color2: '#18181B', color3: '#09090B', border: '#000000' }
];

belts.forEach(b => {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 180" width="160" height="180" fill="none">
  <defs>
    <!-- Gi Fabric Gradients -->
    <linearGradient id="giBody" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="60%" stop-color="#F8FAFC"/>
      <stop offset="100%" stop-color="#E2E8F0"/>
    </linearGradient>
    <linearGradient id="giSleeveL" x1="100%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#CBD5E1"/>
    </linearGradient>
    <linearGradient id="giSleeveR" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#CBD5E1"/>
    </linearGradient>
    <linearGradient id="giPants" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#E2E8F0"/>
      <stop offset="30%" stop-color="#F1F5F9"/>
      <stop offset="100%" stop-color="#CBD5E1"/>
    </linearGradient>
    <linearGradient id="giInnerShadow" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#0F172A" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#1E293B" stop-opacity="0.4"/>
    </linearGradient>

    <!-- Belt Gradients -->
    <linearGradient id="beltGrad_${b.id}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${b.color1}"/>
      <stop offset="45%" stop-color="${b.color2}"/>
      <stop offset="100%" stop-color="${b.color3}"/>
    </linearGradient>
    <linearGradient id="beltKnot_${b.id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${b.color1}"/>
      <stop offset="70%" stop-color="${b.color2}"/>
      <stop offset="100%" stop-color="${b.color3}"/>
    </linearGradient>

    <!-- Drop Shadow Filter -->
    <filter id="shadow_${b.id}" x="-10%" y="-10%" width="120%" height="130%">
      <feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="#000000" flood-opacity="0.45"/>
    </filter>
  </defs>

  <!-- ================= 1. KARATE PANTS (CALÇA DO QUIMONO) ================= -->
  <g filter="url(#shadow_${b.id})">
    <!-- Left Leg -->
    <path d="M 44 98 L 40 166 L 73 166 L 76 112 Z" fill="url(#giPants)" stroke="#94A3B8" stroke-width="1.2"/>
    <!-- Right Leg -->
    <path d="M 116 98 L 120 166 L 87 166 L 84 112 Z" fill="url(#giPants)" stroke="#94A3B8" stroke-width="1.2"/>
    <!-- Pants Hem Cuffs -->
    <line x1="40" y1="162" x2="73" y2="162" stroke="#94A3B8" stroke-width="0.8" stroke-dasharray="2,2"/>
    <line x1="87" y1="162" x2="120" y2="162" stroke="#94A3B8" stroke-width="0.8" stroke-dasharray="2,2"/>
    <!-- Vertical Creases -->
    <path d="M 56 106 L 56 162" stroke="#CBD5E1" stroke-width="1"/>
    <path d="M 104 106 L 104 162" stroke="#CBD5E1" stroke-width="1"/>
  </g>

  <!-- ================= 2. KARATEGI JACKET & SLEEVES (BLUSA E MANGAS) ================= -->
  <g filter="url(#shadow_${b.id})">
    <!-- Left Sleeve (Braço Esquerdo) -->
    <path d="M 48 18 L 14 42 L 26 72 L 46 56 Z" fill="url(#giSleeveL)" stroke="#94A3B8" stroke-width="1.2"/>
    <line x1="16" y1="46" x2="28" y2="70" stroke="#CBD5E1" stroke-width="1" stroke-dasharray="2,2"/>

    <!-- Right Sleeve (Braço Direito) -->
    <path d="M 112 18 L 146 42 L 134 72 L 114 56 Z" fill="url(#giSleeveR)" stroke="#94A3B8" stroke-width="1.2"/>
    <line x1="144" y1="46" x2="132" y2="70" stroke="#CBD5E1" stroke-width="1" stroke-dasharray="2,2"/>

    <!-- Main Jacket Body -->
    <path d="M 46 16 L 114 16 L 122 104 L 38 104 Z" fill="url(#giBody)" stroke="#94A3B8" stroke-width="1.2"/>

    <!-- Chest Inner V-Neck Shadow -->
    <polygon points="64,16 96,16 80,60" fill="url(#giInnerShadow)"/>

    <!-- Right Lapel (Underneath) -->
    <path d="M 96 16 L 52 82 L 44 82 L 78 20 Z" fill="#E2E8F0" stroke="#94A3B8" stroke-width="1"/>

    <!-- Left Lapel (Over right lapel - Traditional Hidari-mae) -->
    <path d="M 64 16 L 108 82 L 116 80 L 84 18 Z" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.2"/>

    <!-- Lapel Stitching Details -->
    <path d="M 68 17 L 110 80" stroke="#E2E8F0" stroke-width="1" stroke-dasharray="2,2"/>
    <path d="M 92 17 L 56 72" stroke="#94A3B8" stroke-width="1" stroke-dasharray="2,2" opacity="0.5"/>

    <!-- TKST Chest Kanji Badge (Left Breast) -->
    <g transform="translate(48, 44)">
      <circle cx="8" cy="8" r="7" fill="#B91C1C" opacity="0.9"/>
      <path d="M 5 8 L 11 8 M 8 4.5 L 8 11.5" stroke="#FDE047" stroke-width="1.4" stroke-linecap="round"/>
      <circle cx="8" cy="8" r="5.5" stroke="#FFFFFF" stroke-width="0.6" fill="none"/>
    </g>

    <!-- Lower Gi Jacket Skirt Creases -->
    <path d="M 46 86 L 42 104" stroke="#94A3B8" stroke-width="1"/>
    <path d="M 114 86 L 118 104" stroke="#94A3B8" stroke-width="1"/>
  </g>

  <!-- ================= 3. OBI / BELT & TRADITIONAL KNOT ================= -->
  <g filter="url(#shadow_${b.id})">
    <!-- Horizontal Waist Belt -->
    <path d="M 38 78 C 55 82, 105 82, 122 78 L 124 94 C 105 98, 55 98, 36 94 Z" 
          fill="url(#beltGrad_${b.id})" 
          stroke="${b.border}" 
          stroke-width="1.4"/>

    <!-- Belt Ribbing Texture Lines -->
    <path d="M 37 83 C 55 87, 105 87, 123 83" stroke="rgba(255,255,255,0.3)" stroke-width="0.7" fill="none"/>
    <path d="M 37 89 C 55 93, 105 93, 123 89" stroke="rgba(0,0,0,0.25)" stroke-width="0.7" fill="none"/>

    <!-- Left Hanging Belt End (Falling Down) -->
    <path d="M 72 90 Q 68 104 64 136 L 77 140 Q 82 110 80 90 Z" 
          fill="url(#beltGrad_${b.id})" 
          stroke="${b.border}" 
          stroke-width="1.4"/>
    <path d="M 70 98 L 72 136" stroke="rgba(255,255,255,0.25)" stroke-width="0.6"/>

    <!-- Right Hanging Belt End (Falling Down) -->
    <path d="M 80 90 Q 86 106 90 134 L 103 130 Q 95 104 88 90 Z" 
          fill="url(#beltGrad_${b.id})" 
          stroke="${b.border}" 
          stroke-width="1.4"/>
    <path d="M 88 98 L 96 130" stroke="rgba(255,255,255,0.25)" stroke-width="0.6"/>

    <!-- Central Traditional Knot (Koma-musubi) -->
    <ellipse cx="80" cy="90" rx="13" ry="8" fill="url(#beltKnot_${b.id})" stroke="${b.border}" stroke-width="1.6"/>
    <!-- Knot Cross-wrap Overlay -->
    <path d="M 72 85 Q 80 94 88 96" stroke="rgba(0,0,0,0.35)" stroke-width="1.3" fill="none"/>
    <path d="M 73 95 Q 80 88 87 84" stroke="rgba(255,255,255,0.4)" stroke-width="1" fill="none"/>
  </g>
</svg>`;

  const filePath = path.join(outputDir, `quimono-${b.id}.svg`);
  fs.writeFileSync(filePath, svg, 'utf8');
  console.log(`Generated Full Kimono: ${filePath}`);
});
