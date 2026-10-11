/**
 * TKST Alunos - Vector Code 128 Barcode & Fallback Generator (Zero Dependencies, Offline Pure SVG)
 * Gera Códigos de Barras padrão Code 128 (Subconjunto B) de altíssima precisão e contraste em SVG.
 * Atende às especificações de impressão em Folha Única A4 (Cabeçalho Superior Direito)
 * e decodificação rápida via visão computacional do app.
 */

(function() {
  'use strict';

  // Tabela padrão internacional ISO/IEC 15417 para Code 128 (107 padrões de larguras)
  var CODE128_PATTERNS = [
    "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
    "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
    "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
    "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
    "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
    "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
    "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
    "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
    "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
    "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
    "114131", "311141", "411131", "211412", "211214", "211232", "2331112"
  ];

  var BarcodeEngine = {
    /**
     * Gera um SVG puro vetorial do Código de Barras Code 128 com texto legível humano
     * @param {string} text - Texto a ser codificado (ex: "TKST-FAIXA-AMARELA-06KYU-FRWV")
     * @param {object} [opts] - Opções de renderização
     * @returns {string} Código SVG
     */
    createBarcodeSvg: function(text, opts) {
      opts = opts || {};
      var cleanText = String(text || '').trim();
      if (!cleanText) cleanText = "TKST-EXAM";

      // Sanitiza para caracteres ASCII válidos do Code 128 B (32 a 126)
      var safeText = '';
      for (var k = 0; k < cleanText.length; k++) {
        var code = cleanText.charCodeAt(k);
        safeText += (code >= 32 && code <= 126) ? cleanText.charAt(k) : '-';
      }

      var codes = [104]; // Start B
      var checksum = 104;

      for (var i = 0; i < safeText.length; i++) {
        var val = safeText.charCodeAt(i) - 32;
        codes.push(val);
        checksum += (i + 1) * val;
      }

      codes.push(checksum % 103);
      codes.push(106); // Stop

      var quietZone = 10;
      var barsSvg = '';
      var currentModule = quietZone;

      for (var c = 0; c < codes.length; c++) {
        var pattern = CODE128_PATTERNS[codes[c]];
        if (!pattern) continue;
        for (var p = 0; p < pattern.length; p++) {
          var w = parseInt(pattern.charAt(p), 10);
          var isBar = (p % 2 === 0);
          if (isBar) {
            barsSvg += '<rect x="' + currentModule + '" y="2" width="' + w + '" height="26" fill="#000000"/>';
          }
          currentModule += w;
        }
      }

      var totalWidth = currentModule + quietZone;
      var totalHeight = 38;

      var showText = opts.showText !== false;
      var textSvg = showText
        ? '<text x="' + (totalWidth / 2).toFixed(1) + '" y="35" text-anchor="middle" font-family="Consolas, monospace, sans-serif" font-weight="900" font-size="6.8" fill="#0F172A" letter-spacing="0.5">' + safeText + '</text>'
        : '';

      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + totalWidth + ' ' + totalHeight + '" style="width: 100%; height: 100%; display: block;" shape-rendering="crispEdges">' +
             '<rect width="100%" height="100%" fill="#FFFFFF"/>' +
             barsSvg +
             textSvg +
             '</svg>';
    },

    /**
     * Codifica o identificador único oficial da prova para o Código de Barras
     * @param {number} kyu 
     * @param {string} examId 
     * @param {Array<string>} [answerLetters]
     * @returns {string} Ex: "TKST-FAIXA-AMARELA-06KYU-FRWV"
     */
    encodeExamText: function(kyu, examId, answerLetters) {
      var kyuNum = Number(kyu);
      var kyuPad = Math.abs(kyuNum) < 10 ? ('0' + Math.abs(kyuNum)) : String(Math.abs(kyuNum));
      var beltSlug = "AMARELA";
      if (kyuNum === 6) beltSlug = "AMARELA";
      else if (kyuNum === 5) beltSlug = "VERMELHA";
      else if (kyuNum === 4) beltSlug = "LARANJA";
      else if (kyuNum === 3) beltSlug = "VERDE";
      else if (kyuNum === 2) beltSlug = "ROXA";
      else if (kyuNum === 1) beltSlug = "MARROM";
      else if (kyuNum === 0) beltSlug = "PRETA-1DAN";
      else if (kyuNum === -1) beltSlug = "PRETA-2DAN";
      else if (kyuNum === -2) beltSlug = "PRETA-3DAN";

      var cleanId = (examId || 'EXAM').toUpperCase().replace(/[^A-Z0-9]/g, '');

      var compactAns = (answerLetters || []).map(function(s) {
        return (typeof s === 'string') ? s.trim().toUpperCase() : '';
      }).filter(Boolean).join('');

      if (compactAns.length === 10) {
        return 'TKST-' + beltSlug + '-' + kyuPad + 'KYU-' + cleanId + '-' + compactAns;
      }
      return 'TKST-' + beltSlug + '-' + kyuPad + 'KYU-' + cleanId;
    },

    /**
     * Decodifica o código de barras lido por BarcodeDetector ou digitado
     * @param {string} rawString 
     * @returns {object|null} { kyu, examId, answers: [...] }
     */
    decodeBarcodePayload: function(rawString) {
      if (!rawString || typeof rawString !== 'string') return null;
      var str = rawString.trim().toUpperCase();

      // Suporta prefixo TKST- ou TKST:
      var kyu = 6;
      var examId = 'EXAM';
      var answers = [];

      // Mapeamento de faixa por nome contido no código de barras
      if (str.includes('AMARELA') || str.includes('06KYU') || str.includes('6KYU')) kyu = 6;
      else if (str.includes('VERMELHA') || str.includes('05KYU') || str.includes('5KYU')) kyu = 5;
      else if (str.includes('LARANJA') || str.includes('04KYU') || str.includes('4KYU')) kyu = 4;
      else if (str.includes('VERDE') || str.includes('03KYU') || str.includes('3KYU')) kyu = 3;
      else if (str.includes('ROXA') || str.includes('02KYU') || str.includes('2KYU')) kyu = 2;
      else if (str.includes('MARROM') || str.includes('01KYU') || str.includes('1KYU')) kyu = 1;
      else if (str.includes('PRETA') || str.includes('SHODAN') || str.includes('00KYU')) kyu = 0;

      // Extrai ID da prova (ex: 0IZ96 ou FRWV)
      var idMatch = str.match(/(?:KYU-|TKST:.*?:|TKST-)([A-Z0-9]{4,6})(?:-|$|:)/i);
      if (idMatch && idMatch[1]) {
        examId = idMatch[1].toUpperCase();
      } else {
        var anyId = str.match(/[A-Z0-9]{4,6}/g);
        if (anyId && anyId.length > 0) {
          // Filtra palavras-chave conhecidas
          var filtered = anyId.filter(function(w) {
            return !['TKST', 'KYU', 'DAN', 'PROVA', 'EXAM'].includes(w);
          });
          if (filtered.length > 0) examId = filtered[filtered.length - 1];
          else examId = anyId[anyId.length - 1];
        }
      }

      // Procura gabarito de 10 letras no final (ex: -ABCDABCDAB)
      var ansMatch = str.match(/([ABCD]{10})(?:$|[^ABCD])/i);
      if (ansMatch && ansMatch[1]) {
        answers = ansMatch[1].toUpperCase().split('');
      }

      // Se não encontrou as 10 letras diretamente na string, busca no banco local de provas geradas
      if (answers.length < 10) {
        try {
          var store = JSON.parse(localStorage.getItem('tkst_generated_exams') || '{}');
          if (store[examId] && Array.isArray(store[examId].answers) && store[examId].answers.length === 10) {
            answers = store[examId].answers.slice();
            if (store[examId].kyu !== undefined) kyu = store[examId].kyu;
          }
        } catch(e) {}
      }

      return {
        kyu: kyu,
        examId: examId,
        answers: answers.length === 10 ? answers : null,
        rawCode: str
      };
    },

    // Métodos de compatibilidade total com TKST_QR
    createSvg: function(text, size, margin) {
      return this.createBarcodeSvg(text);
    },
    encodeExamPayload: function(kyu, examId, answerLetters) {
      return this.encodeExamText(kyu, examId, answerLetters);
    },
    decodeExamPayload: function(rawString) {
      return this.decodeBarcodePayload(rawString);
    }
  };

  window.TKST_BARCODE = BarcodeEngine;
  window.TKST_QR = BarcodeEngine; // Alias para compatibilidade total
})();
