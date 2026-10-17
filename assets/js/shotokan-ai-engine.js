/**
 * TKST Alunos - Motor de Conhecimento e Estudo Técnico de Karatê Shotokan (Shotokan Knowledge Engine)
 * 
 * PADRÃO DE SIMULADO CRONOMETRADO:
 * - Perguntas diretas e objetivas
 * - Respostas CURTAS (1 a 5 palavras)
 * - Alternativas rápidas de ler pelo aluno no celular ou computador
 * - Sem descrições longas, sem parágrafos técnicos ou explicações prolixas
 * 
 * USO EXCLUSIVO: Painel Administrativo do Sensei / Instrutores para formulação e aprovação
 * de perguntas de simulados teóricos e exames de faixa.
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. PERFIS DE GRADUAÇÃO (6º KYU AO 3º DAN)
  // =========================================================================

  const GRADUATION_PROFILES = {
    6: {
      kyu: 6,
      name: "6º Kyu (Faixa Branca p/ Amarela)",
      beltTitle: "Faixa Branca 6º Kyu",
      targetBelt: "Faixa Amarela"
    },
    5: {
      kyu: 5,
      name: "5º Kyu (Faixa Amarela p/ Vermelha)",
      beltTitle: "Faixa Amarela 5º Kyu",
      targetBelt: "Faixa Vermelha"
    },
    4: {
      kyu: 4,
      name: "4º Kyu (Faixa Vermelha p/ Laranja)",
      beltTitle: "Faixa Vermelha 4º Kyu",
      targetBelt: "Faixa Laranja"
    },
    3: {
      kyu: 3,
      name: "3º Kyu (Faixa Laranja p/ Verde)",
      beltTitle: "Faixa Laranja 3º Kyu",
      targetBelt: "Faixa Verde"
    },
    2: {
      kyu: 2,
      name: "2º Kyu (Faixa Verde p/ Roxa)",
      beltTitle: "Faixa Verde 2º Kyu",
      targetBelt: "Faixa Roxa"
    },
    1: {
      kyu: 1,
      name: "1º Kyu (Faixa Roxa p/ Marrom)",
      beltTitle: "Faixa Roxa 1º Kyu",
      targetBelt: "Faixa Marrom"
    },
    0: {
      kyu: 0,
      name: "1º Dan (Shodan - Faixa Preta)",
      beltTitle: "Faixa Marrom p/ Preta (1º Dan)",
      targetBelt: "Faixa Preta 1º Dan (Shodan)"
    },
    "-1": {
      kyu: -1,
      name: "2º Dan (Nidan - Faixa Preta)",
      beltTitle: "Faixa Preta 1º Dan p/ 2º Dan",
      targetBelt: "Faixa Preta 2º Dan (Nidan)"
    },
    "-2": {
      kyu: -2,
      name: "3º Dan (Sandan - Faixa Preta)",
      beltTitle: "Faixa Preta 2º Dan p/ 3º Dan",
      targetBelt: "Faixa Preta 3º Dan (Sandan)"
    }
  };

  // Normalizador de chave para verificar duplicidade
  function normalizeKey(str) {
    if (!str) return '';
    return String(str)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/gi, '')
      .trim();
  }

  // Extrai assinaturas normalizadas de uma resposta para identificar repetições mesmo com imagens ou variações de texto
  function getAnswerSignatures(str) {
    if (!str) return [];
    const clean = String(str)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

    const rawAlphanum = clean.replace(/[^a-z0-9]/gi, '');
    if (!rawAlphanum) return [];

    const sigs = new Set();
    sigs.add(rawAlphanum);

    // 1. Remove prefixos e sufixos de altura (jodan, chudan, gedan)
    // Ex: "Jodan Age Uke" -> "ageuke", "Age Uke" -> "ageuke" (colisão perfeita)
    const noHeight = clean
      .replace(/\b(jodan|chudan|gedan)\b/gi, '')
      .replace(/[^a-z0-9]/gi, '')
      .trim();
    if (noHeight && noHeight.length >= 3) {
      sigs.add(noHeight);
    }

    // 2. Extrai termos fora e dentro de parênteses
    // Ex: "Fudo Dachi (Sochin Dachi)" -> "fudodachi" e "sochindachi"
    const parenMatch = clean.match(/^([^(]+)\(([^)]+)\)/);
    if (parenMatch) {
      const p1 = parenMatch[1].replace(/[^a-z0-9]/gi, '').trim();
      const p2 = parenMatch[2].replace(/[^a-z0-9]/gi, '').trim();
      if (p1 && p1.length >= 3) sigs.add(p1);
      if (p2 && p2.length >= 3) sigs.add(p2);
    }

    // 3. Normalização de porcentagens numéricas
    const nums = clean.replace(/[^0-9]/g, '');
    if (nums && nums.length >= 2) {
      sigs.add(`pct_${nums}`);
    }

    return Array.from(sigs);
  }

  // Extrai chave conceitual semântica para impedir perguntas que perguntem a mesma coisa com frases diferentes
  function getQuestionConceptKey(qText, ansText) {
    if (!qText && !ansText) return '';
    const qClean = String(qText || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    
    const aClean = String(ansText || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    // 1. Identificar o Kata em questão
    let kata = '';
    if (qClean.includes('heian shodan') || aClean.includes('heian shodan')) kata = 'heianshodan';
    else if (qClean.includes('heian nidan') || aClean.includes('heian nidan')) kata = 'heiannidan';
    else if (qClean.includes('heian sandan') || aClean.includes('heian sandan')) kata = 'heiansandan';
    else if (qClean.includes('heian yondan') || aClean.includes('heian yondan')) kata = 'heianyondan';
    else if (qClean.includes('heian godan') || aClean.includes('heian godan')) kata = 'heiangodan';
    else if (qClean.includes('tekki shodan') || aClean.includes('tekki shodan')) kata = 'tekkishodan';
    else if (qClean.includes('bassai dai') || aClean.includes('bassaidai')) kata = 'bassaidai';
    else if (qClean.includes('kanku dai') || aClean.includes('kankudai')) kata = 'kankudai';
    else if (qClean.includes('empi')) kata = 'empi';
    else if (qClean.includes('jion')) kata = 'jion';
    else if (qClean.includes('hangetsu')) kata = 'hangetsu';
    else if (qClean.includes('gankaku')) kata = 'gankaku';
    else if (qClean.includes('sochin')) kata = 'sochin';
    else if (qClean.includes('heian')) kata = 'heian';

    // 2. Se for sobre um Kata, determinar o conceito específico
    if (kata) {
      if (qClean.includes('movimento') || qClean.includes('passo') || aClean.includes('movimento')) {
        if (qClean.includes('quantos') || qClean.includes('total') || qClean.includes('numero') || qClean.includes('compoem') || qClean.includes('tem o kata') || (aClean.includes('movimento') && /\d+/.test(aClean))) {
          return `kata_moves_${kata}`;
        }
      }
      if (qClean.includes('kiai') || qClean.includes('kiais') || aClean.includes('passos 8') || aClean.includes('passos 10') || aClean.includes('passos 12') || aClean.includes('passos 13') || aClean.includes('passos 15') || aClean.includes('passos 19')) {
        return `kata_kiai_${kata}`;
      }
      if (qClean.includes('significado') || qClean.includes('traducao') || qClean.includes('quer dizer') || qClean.includes('palavra') || aClean.includes('mente em paz') || aClean.includes('romper a fortaleza') || aClean.includes('olhar para o ceu') || aClean.includes('cavaleiro de ferro') || aClean.includes('voo da andorinha')) {
        return `kata_meaning_${kata}`;
      }
      if (qClean.includes('primeiro movimento') || qClean.includes('abre e finaliza') || qClean.includes('movimento inicial') || qClean.includes('abertura') || qClean.includes('defesa inicial') || qClean.includes('inicia o kata') || qClean.includes('se inicia')) {
        return `kata_opening_${kata}`;
      }
      if (qClean.includes('finaliza') || qClean.includes('ultimo movimento') || qClean.includes('movimento final') || qClean.includes('encerra')) {
        return `kata_final_${kata}`;
      }
      if (qClean.includes('embusen') || qClean.includes('tracado') || qClean.includes('formato')) {
        return `kata_embusen_${kata}`;
      }
      if (qClean.includes('criador') || qClean.includes('mestre') || qClean.includes('itotsu') || qClean.includes('itosu') || qClean.includes('funakoshi')) {
        return `kata_master_${kata}`;
      }
      if (qClean.includes('base') || qClean.includes('postura')) {
        return `kata_stance_${kata}_${aClean.replace(/[^a-z0-9]/g, '')}`;
      }
    }

    // 3. Kata ou kumite oficial exigido para o exame de determinada faixa / Kyu
    const kyuMatch = qClean.match(/([1-7])(?:º|o)?\s*kyu/);
    if (kyuMatch && (qClean.includes('kata oficial') || qClean.includes('qual e o kata') || qClean.includes('qual kata'))) {
      return `exam_kata_kyu${kyuMatch[1]}`;
    }
    if (kyuMatch && (qClean.includes('kumite') || qClean.includes('combate'))) {
      return `exam_kumite_kyu${kyuMatch[1]}`;
    }

    // 4. Conceitos de Bases (distribuição de peso / postura)
    const stances = ['zenkutsu dachi', 'kokutsu dachi', 'kiba dachi', 'fudo dachi', 'neko ashi dachi', 'sanchin dachi', 'kosa dachi', 'hangetsu dachi', 'tsuruashi dachi', 'heisoku dachi', 'musubi dachi', 'hachiji dachi', 'heiko dachi'];
    for (const st of stances) {
      if (qClean.includes(st) || aClean.includes(st)) {
        const stKey = st.replace(/\s+/g, '');
        if (qClean.includes('distribuicao de peso') || qClean.includes('peso') || aClean.includes('%')) {
          return `stance_weight_${stKey}`;
        }
        if (qClean.includes('qual e a base') || qClean.includes('qual base') || qClean.includes('nome da base')) {
          return `stance_identity_${stKey}`;
        }
      }
    }

    // 5. Conceitos de Kumite (passos / definição)
    if (qClean.includes('gohon kumite') || aClean.includes('gohon kumite')) {
      if (qClean.includes('quantos passos') || aClean.includes('5 passos')) return 'kumite_steps_gohon';
      return 'kumite_gohon';
    }
    if (qClean.includes('sanbon kumite') || aClean.includes('sanbon kumite')) {
      if (qClean.includes('quantos passos') || aClean.includes('3 passos')) return 'kumite_steps_sanbon';
      return 'kumite_sanbon';
    }
    if (qClean.includes('kihon ippon') || aClean.includes('kihon ippon')) {
      if (qClean.includes('quantos passos') || aClean.includes('1 passo')) return 'kumite_steps_kihonippon';
      return 'kumite_kihonippon';
    }
    if (qClean.includes('jiyu ippon') || aClean.includes('jiyu ippon')) return 'kumite_jiyuippon';
    if (qClean.includes('jiyu kumite') || aClean.includes('jiyu kumite')) return 'kumite_jiyukumite';

    // 6. Resposta limpa como conceito de colisão (ex: "Jodan Age Uke", "Awase Tsuki")
    const ansKey = aClean.replace(/[^a-z0-9]/g, '');
    if (ansKey && ansKey.length >= 4) {
      return `ans_${ansKey}`;
    }

    return '';
  }

  // Embaralhar array (Fisher-Yates)
  function shuffle(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  // =========================================================================
  // 2. BANCO DE QUESTÕES FORMULADAS COM RESPOSTAS CURTAS E DIRETAS
  // =========================================================================

  function getShortQuestionsDatabase() {
    return [
      // ---------------------------------------------------------------------
      // BASES (DACHI WAZA) - RESPOSTAS CURTAS
      // ---------------------------------------------------------------------
      {
        topic: "Bases (Dachi Waza)",
        category: "bases",
        minKyu: 6,
        question: "Qual é a distribuição de peso na base Zenkutsu Dachi?",
        correctAnswer: "70% na frente e 30% atrás",
        distractors: ["50% em cada perna", "70% atrás e 30% na frente", "90% atrás e 10% na frente"]
      },
      {
        topic: "Bases (Dachi Waza)",
        category: "bases",
        minKyu: 6,
        question: "Qual é a base avançada frontal do Karatê Shotokan?",
        correctAnswer: "Zenkutsu Dachi",
        distractors: ["Kokutsu Dachi", "Kiba Dachi", "Neko Ashi Dachi"]
      },
      {
        topic: "Bases (Dachi Waza)",
        category: "bases",
        minKyu: 5,
        question: "Qual é a distribuição de peso na base Kokutsu Dachi?",
        correctAnswer: "70% atrás e 30% na frente",
        distractors: ["70% na frente e 30% atrás", "50% em cada perna", "90% atrás e 10% na frente"]
      },
      {
        topic: "Bases (Dachi Waza)",
        category: "bases",
        minKyu: 5,
        question: "Qual é a base recuada posterior com maior peso na perna de trás?",
        correctAnswer: "Kokutsu Dachi",
        distractors: ["Zenkutsu Dachi", "Kiba Dachi", "Heisoku Dachi"]
      },
      {
        topic: "Bases (Dachi Waza)",
        category: "bases",
        minKyu: 4,
        question: "Qual é a distribuição de peso na base do cavalo (Kiba Dachi)?",
        correctAnswer: "50% em cada perna",
        distractors: ["70% na frente e 30% atrás", "70% atrás e 30% na frente", "90% na perna de trás"]
      },
      {
        topic: "Bases (Dachi Waza)",
        category: "bases",
        minKyu: 4,
        question: "Qual base mantém os pés paralelos e o peso dividido igualmente?",
        correctAnswer: "Kiba Dachi",
        distractors: ["Zenkutsu Dachi", "Kokutsu Dachi", "Neko Ashi Dachi"]
      },
      {
        topic: "Bases (Dachi Waza)",
        category: "bases",
        minKyu: 3,
        question: "Qual é o nome da base com as pernas entrecruzadas?",
        correctAnswer: "Kosa Dachi",
        distractors: ["Kiba Dachi", "Zenkutsu Dachi", "Kokutsu Dachi"]
      },
      {
        topic: "Bases (Dachi Waza)",
        category: "bases",
        minKyu: 2,
        question: "Qual é a base da pata de gato, com 90% do peso na perna de trás?",
        correctAnswer: "Neko Ashi Dachi",
        distractors: ["Zenkutsu Dachi", "Kiba Dachi", "Sanchin Dachi"]
      },
      {
        topic: "Bases (Dachi Waza)",
        category: "bases",
        minKyu: 0,
        question: "Qual é a base inabalável característica do Kata Sochin?",
        correctAnswer: "Fudo Dachi (Sochin Dachi)",
        distractors: ["Kokutsu Dachi", "Kiba Dachi", "Zenkutsu Dachi"]
      },
      {
        topic: "Bases (Dachi Waza)",
        category: "bases",
        minKyu: -1,
        question: "Qual é a base da meia-lua característica do Kata Hangetsu?",
        correctAnswer: "Hangetsu Dachi",
        distractors: ["Zenkutsu Dachi", "Kiba Dachi", "Kokutsu Dachi"]
      },
      {
        topic: "Bases (Dachi Waza)",
        category: "bases",
        minKyu: -1,
        question: "Qual é a base da garça, em equilíbrio sobre uma perna só?",
        correctAnswer: "Tsuru Dachi (Gankaku Dachi)",
        distractors: ["Kosa Dachi", "Kiba Dachi", "Kokutsu Dachi"]
      },
      {
        topic: "Bases (Dachi Waza)",
        category: "bases",
        minKyu: 6,
        question: "Qual é a base com pés fechados e totalmente unidos?",
        correctAnswer: "Heisoku Dachi",
        distractors: ["Musubi Dachi", "Heiko Dachi", "Kiba Dachi"]
      },
      {
        topic: "Bases (Dachi Waza)",
        category: "bases",
        minKyu: 6,
        question: "Qual é a base de saudação formal, com calcanhares juntos e pontas abertas?",
        correctAnswer: "Musubi Dachi",
        distractors: ["Heisoku Dachi", "Zenkutsu Dachi", "Kiba Dachi"]
      },
      {
        topic: "Bases (Dachi Waza)",
        category: "bases",
        minKyu: 6,
        question: "Qual é a base natural (Shizentai) com pés na largura dos ombros?",
        correctAnswer: "Hachiji Dachi",
        distractors: ["Kiba Dachi", "Kokutsu Dachi", "Kosa Dachi"]
      },

      // ---------------------------------------------------------------------
      // DEFESAS (UKE WAZA) - COM ALTURA (JODAN / CHUDAN / GEDAN)
      // ---------------------------------------------------------------------
      {
        topic: "Defesas (Uke Waza)",
        category: "defesas",
        minKyu: 6,
        question: "Qual defesa Jodan protege contra ataques na altura do rosto?",
        correctAnswer: "Jodan Age Uke",
        distractors: ["Gedan Barai", "Chudan Soto Uke", "Chudan Uchi Uke"]
      },
      {
        topic: "Defesas (Uke Waza)",
        category: "defesas",
        minKyu: 6,
        question: "Qual defesa Gedan faz a varredura baixa contra golpes na cintura ou pernas?",
        correctAnswer: "Gedan Barai",
        distractors: ["Jodan Age Uke", "Chudan Shuto Uke", "Chudan Soto Uke"]
      },
      {
        topic: "Defesas (Uke Waza)",
        category: "defesas",
        minKyu: 5,
        question: "Qual defesa Chudan de fora para dentro bloqueia na altura do peito?",
        correctAnswer: "Chudan Soto Uke",
        distractors: ["Chudan Uchi Uke", "Jodan Age Uke", "Gedan Barai"]
      },
      {
        topic: "Defesas (Uke Waza)",
        category: "defesas",
        minKyu: 5,
        question: "Qual defesa Chudan de dentro para fora bloqueia na altura do peito?",
        correctAnswer: "Chudan Uchi Uke",
        distractors: ["Chudan Soto Uke", "Jodan Age Uke", "Gedan Barai"]
      },
      {
        topic: "Defesas (Uke Waza)",
        category: "defesas",
        minKyu: 5,
        question: "Qual defesa Chudan com a mão aberta em faca protege a altura do peito?",
        correctAnswer: "Chudan Shuto Uke",
        distractors: ["Jodan Age Uke", "Gedan Barai", "Chudan Oi Tsuki"]
      },
      {
        topic: "Defesas (Uke Waza)",
        category: "defesas",
        minKyu: 3,
        question: "Qual defesa Chudan reforçada com as duas mãos protege a altura do peito?",
        correctAnswer: "Chudan Morote Uke",
        distractors: ["Jodan Age Uke", "Gedan Barai", "Chudan Soto Uke"]
      },
      {
        topic: "Defesas (Uke Waza)",
        category: "defesas",
        minKyu: 3,
        question: "Qual defesa Jodan cruzando os antebraços em X bloqueia ataques no rosto?",
        correctAnswer: "Jodan Juji Uke",
        distractors: ["Chudan Morote Uke", "Jodan Age Uke", "Manji Uke"]
      },
      {
        topic: "Defesas (Uke Waza)",
        category: "defesas",
        minKyu: 2,
        question: "Qual defesa mista bloqueia em cima atrás (Jodan) e embaixo na frente (Gedan)?",
        correctAnswer: "Manji Uke",
        distractors: ["Jodan Juji Uke", "Chudan Morote Uke", "Chudan Shuto Uke"]
      },
      {
        topic: "Defesas (Uke Waza)",
        category: "defesas",
        minKyu: 4,
        question: "Qual defesa Chudan abrindo os braços em cunha afasta ataques no peito?",
        correctAnswer: "Chudan Kakiwake Uke",
        distractors: ["Jodan Juji Uke", "Gedan Barai", "Jodan Age Uke"]
      },
      {
        topic: "Defesas (Uke Waza)",
        category: "defesas",
        minKyu: 4,
        question: "Qual defesa Chudan com a base da palma da mão bloqueia na altura do peito?",
        correctAnswer: "Chudan Teisho Uke",
        distractors: ["Chudan Shuto Uke", "Jodan Age Uke", "Gedan Barai"]
      },
      {
        topic: "Defesas (Uke Waza)",
        category: "defesas",
        minKyu: 3,
        question: "Qual defesa Jodan com a base da palma da mão bloqueia ataques no rosto?",
        correctAnswer: "Jodan Teisho Uke",
        distractors: ["Chudan Teisho Uke", "Jodan Age Uke", "Gedan Barai"]
      },

      // ---------------------------------------------------------------------
      // SOCOS E GOLPES DE MÃO (TSUKI & UCHI) COM ALTURA (JODAN / CHUDAN)
      // ---------------------------------------------------------------------
      {
        topic: "Socos (Tsuki Waza)",
        category: "socos",
        minKyu: 6,
        question: "Qual soco Chudan avança com o mesmo braço e perna na altura do peito?",
        correctAnswer: "Chudan Oi Tsuki",
        distractors: ["Chudan Gyaku Tsuki", "Chudan Kizami Tsuki", "Jodan Uraken Uchi"]
      },
      {
        topic: "Socos (Tsuki Waza)",
        category: "socos",
        minKyu: 6,
        question: "Qual soco Jodan avança com o mesmo braço e perna na altura do rosto?",
        correctAnswer: "Jodan Oi Tsuki",
        distractors: ["Chudan Oi Tsuki", "Chudan Gyaku Tsuki", "Jodan Age Uke"]
      },
      {
        topic: "Socos (Tsuki Waza)",
        category: "socos",
        minKyu: 5,
        question: "Qual soco Chudan invertido é desferido com o braço contrário no peito?",
        correctAnswer: "Chudan Gyaku Tsuki",
        distractors: ["Chudan Oi Tsuki", "Chudan Kizami Tsuki", "Jodan Age Uke"]
      },
      {
        topic: "Socos (Tsuki Waza)",
        category: "socos",
        minKyu: 5,
        question: "Qual soco Jodan invertido é desferido com o braço contrário no rosto?",
        correctAnswer: "Jodan Gyaku Tsuki",
        distractors: ["Chudan Gyaku Tsuki", "Chudan Oi Tsuki", "Jodan Oi Tsuki"]
      },
      {
        topic: "Socos (Tsuki Waza)",
        category: "socos",
        minKyu: 4,
        question: "Qual soco Jodan rápido de encontro é desferido com a mão da frente no rosto?",
        correctAnswer: "Jodan Kizami Tsuki",
        distractors: ["Chudan Oi Tsuki", "Chudan Gyaku Tsuki", "Jodan Uraken Uchi"]
      },
      {
        topic: "Socos (Tsuki Waza)",
        category: "socos",
        minKyu: 4,
        question: "Qual soco Chudan rápido de encontro é desferido com a mão da frente no peito?",
        correctAnswer: "Chudan Kizami Tsuki",
        distractors: ["Jodan Kizami Tsuki", "Chudan Oi Tsuki", "Jodan Age Uke"]
      },
      {
        topic: "Golpes de Punho (Uchi)",
        category: "socos",
        minKyu: 5,
        question: "Qual golpe Jodan chicoteado com as costas do punho atinge a altura do rosto?",
        correctAnswer: "Jodan Uraken Uchi",
        distractors: ["Chudan Oi Tsuki", "Chudan Gyaku Tsuki", "Chudan Empi Uchi"]
      },
      {
        topic: "Golpes de Cotovelo",
        category: "socos",
        minKyu: 4,
        question: "Como se chama o golpe Chudan de cotovelada na altura do peito?",
        correctAnswer: "Chudan Empi Uchi",
        distractors: ["Jodan Uraken Uchi", "Chudan Oi Tsuki", "Chudan Mae Geri"]
      },
      {
        topic: "Golpes de Mão Aberta",
        category: "socos",
        minKyu: 5,
        question: "Qual golpe Jodan cortante com a faca da mão atinge o pescoço ou rosto?",
        correctAnswer: "Jodan Shuto Uchi",
        distractors: ["Chudan Oi Tsuki", "Chudan Nukite", "Chudan Teisho Uchi"]
      },
      {
        topic: "Golpes Especiais",
        category: "socos",
        minKyu: 4,
        question: "Qual golpe Chudan perfurante com as pontas dos dedos atinge a altura do peito?",
        correctAnswer: "Chudan Nukite",
        distractors: ["Jodan Shuto Uchi", "Jodan Uraken Uchi", "Chudan Teisho Uchi"]
      },
      {
        topic: "Golpes Especiais",
        category: "socos",
        minKyu: 4,
        question: "Qual golpe Jodan com o punho martelo atinge a altura da cabeça ou rosto?",
        correctAnswer: "Jodan Tettsui Uchi",
        distractors: ["Chudan Oi Tsuki", "Jodan Uraken Uchi", "Jodan Shuto Uchi"]
      },
      {
        topic: "Golpes Especiais",
        category: "socos",
        minKyu: 3,
        question: "Qual golpe Jodan com a base da palma da mão atinge a altura do rosto?",
        correctAnswer: "Jodan Teisho Uchi",
        distractors: ["Chudan Nukite", "Chudan Seiken", "Chudan Empi Uchi"]
      },
      {
        topic: "Socos Especiais",
        category: "socos",
        minKyu: 2,
        question: "Qual soco duplo em forma de U atinge o rosto (Jodan) e o tronco (Chudan) juntos?",
        correctAnswer: "Yama Tsuki",
        distractors: ["Chudan Oi Tsuki", "Chudan Gyaku Tsuki", "Jodan Kizami Tsuki"]
      },

      // ---------------------------------------------------------------------
      // CHUTES (GERI WAZA) - COM ALTURA (JODAN / CHUDAN)
      // ---------------------------------------------------------------------
      {
        topic: "Chutes (Geri Waza)",
        category: "chutes",
        minKyu: 6,
        question: "Como se chama o chute Chudan frontal na altura do peito ou abdômen?",
        correctAnswer: "Chudan Mae Geri",
        distractors: ["Jodan Mawashi Geri", "Chudan Yoko Geri", "Chudan Ushiro Geri"]
      },
      {
        topic: "Chutes (Geri Waza)",
        category: "chutes",
        minKyu: 5,
        question: "Como se chama o chute Jodan circular na altura da cabeça e rosto?",
        correctAnswer: "Jodan Mawashi Geri",
        distractors: ["Chudan Mawashi Geri", "Chudan Mae Geri", "Chudan Yoko Geri"]
      },
      {
        topic: "Chutes (Geri Waza)",
        category: "chutes",
        minKyu: 5,
        question: "Como se chama o chute Chudan circular na altura das costelas e peito?",
        correctAnswer: "Chudan Mawashi Geri",
        distractors: ["Jodan Mawashi Geri", "Chudan Mae Geri", "Chudan Ushiro Geri"]
      },
      {
        topic: "Chutes (Geri Waza)",
        category: "chutes",
        minKyu: 5,
        question: "Como se chama o chute Chudan lateral na altura do peito ou tronco?",
        correctAnswer: "Chudan Yoko Geri",
        distractors: ["Chudan Mae Geri", "Chudan Mawashi Geri", "Chudan Ushiro Geri"]
      },
      {
        topic: "Chutes (Geri Waza)",
        category: "chutes",
        minKyu: 4,
        question: "Como se chama o chute Chudan desferido reto para trás com o calcanhar no tronco?",
        correctAnswer: "Chudan Ushiro Geri",
        distractors: ["Chudan Mae Geri", "Chudan Mawashi Geri", "Chudan Yoko Geri"]
      },
      {
        topic: "Chutes (Geri Waza)",
        category: "chutes",
        minKyu: 3,
        question: "Qual chute em crescente bate de fora para dentro com a sola do pé?",
        correctAnswer: "Mikazuki Geri",
        distractors: ["Mae Geri", "Ushiro Geri", "Yoko Geri"]
      },
      {
        topic: "Chutes (Geri Waza)",
        category: "chutes",
        minKyu: 3,
        question: "Como se chama o golpe de joelhada no Karatê?",
        correctAnswer: "Hiza Geri",
        distractors: ["Mae Geri", "Mawashi Geri", "Nidan Geri"]
      },
      {
        topic: "Chutes (Geri Waza)",
        category: "chutes",
        minKyu: 2,
        question: "Como se chama o chute duplo saltando no ar?",
        correctAnswer: "Nidan Geri",
        distractors: ["Mae Geri", "Hiza Geri", "Yoko Geri"]
      },
      {
        topic: "Armas de Impacto (Pés)",
        category: "chutes",
        minKyu: 5,
        question: "Qual parte do pé atinge o alvo no chute frontal Mae Geri?",
        correctAnswer: "Koshi (Bola do pé)",
        distractors: ["Sokuto (Faca do pé)", "Calcanhar", "Canela"]
      },
      {
        topic: "Armas de Impacto (Pés)",
        category: "chutes",
        minKyu: 5,
        question: "Qual parte do pé atinge o alvo no chute lateral Yoko Geri?",
        correctAnswer: "Sokuto (Faca do pé)",
        distractors: ["Koshi (Bola do pé)", "Joelho", "Peito do pé"]
      },
      {
        topic: "Armas de Impacto (Pés)",
        category: "chutes",
        minKyu: 4,
        question: "Qual parte do pé atinge o alvo no chute Ushiro Geri para trás?",
        correctAnswer: "Kakato (Calcanhar)",
        distractors: ["Koshi (Bola do pé)", "Pontas dos dedos", "Canela"]
      },

      // ---------------------------------------------------------------------
      // KATAS DO SHOTOKAN - CONCEITOS E HISTÓRIA (RESPOSTAS CURTAS)
      // ---------------------------------------------------------------------
      {
        topic: "Fundamentos de Kata",
        category: "katas",
        minKyu: 6,
        question: "Qual é a tradução literal da palavra japonesa 'Kata'?",
        correctAnswer: "Forma ou modelo",
        distractors: ["Luta livre", "Chute e soco", "Graduação marcial"]
      },
      {
        topic: "Fundamentos de Kata",
        category: "katas",
        minKyu: 6,
        question: "O que significa o termo marcial 'Bunkai' associado aos Katas?",
        correctAnswer: "Aplicação prática das técnicas",
        distractors: ["Aquecimento prévio", "Saudação ao mestre", "Sequência rápida"]
      },
      {
        topic: "Fundamentos de Kata",
        category: "katas",
        minKyu: 6,
        question: "O que define a palavra 'Embusen' no estudo dos Katas?",
        correctAnswer: "Linha de atuação no solo",
        distractors: ["Grito com energia", "Base do cavalo", "Roupa de treino"]
      },
      {
        topic: "História do Karatê",
        category: "katas",
        minKyu: 6,
        question: "Qual grande mestre é reverenciado como o fundador do Karatê Shotokan moderno?",
        correctAnswer: "Mestre Gichin Funakoshi",
        distractors: ["Mestre Mas Oyama", "Mestre Morihei Ueshiba", "Mestre Jigoro Kano"]
      },
      {
        topic: "História dos Katas",
        category: "katas",
        minKyu: 6,
        question: "Qual mestre de Okinawa sintetizou os 5 Katas Heian para o ensino escolar?",
        correctAnswer: "Mestre Anko Itosu",
        distractors: ["Mestre Hironori Otsuka", "Mestre Kenwa Mabuni", "Mestre Choki Motobu"]
      },
      {
        topic: "Estrutura dos Katas",
        category: "katas",
        minKyu: 6,
        question: "Quantos Katas compõem a série introdutória Heian no Shotokan?",
        correctAnswer: "5 Katas",
        distractors: ["3 Katas", "7 Katas", "10 Katas"]
      },
      {
        topic: "Currículo Shotokan",
        category: "katas",
        minKyu: 0,
        question: "Quantos Katas oficiais compõem a lista completa tradicional da JKA Shotokan?",
        correctAnswer: "26 Katas",
        distractors: ["15 Katas", "32 Katas", "50 Katas"]
      },
      {
        topic: "Kata Kanku Dai",
        category: "katas",
        minKyu: 0,
        question: "Qual é o Kata mais longo do Karatê Shotokan tradicional, com 65 movimentos?",
        correctAnswer: "Kanku Dai",
        distractors: ["Bassai Dai", "Gojushiho Dai", "Nijushiho"]
      },
      {
        topic: "Kata Jion",
        category: "katas",
        minKyu: 0,
        question: "Qual é a tradução/origem espiritual do nome do Kata clássico Jion?",
        correctAnswer: "Amor e Gratidão (Templo Jion)",
        distractors: ["Romper a Fortaleza", "Voo da Andorinha", "Olhar o Céu"]
      },
      {
        topic: "Kata Hangetsu",
        category: "katas",
        minKyu: -1,
        question: "Qual é a tradução do nome do Kata Hangetsu, focado na respiração e base circular?",
        correctAnswer: "Meia Lua",
        distractors: ["Sol Nascente", "Estrela Brilhante", "Voo Noturno"]
      },
      {
        topic: "Kata Gankaku",
        category: "katas",
        minKyu: -1,
        question: "Qual é a tradução do nome do Kata Gankaku, marcado pelo equilíbrio em uma perna?",
        correctAnswer: "Garça na Rocha",
        distractors: ["Tigre na Selva", "Dragão Voador", "Águia Dourada"]
      },

      // ---------------------------------------------------------------------
      // KUMITE E REGRAS DE COMBATE (WKF / JKA) - RESPOSTAS CURTAS (COM GRADUAÇÃO EXATA)
      // ---------------------------------------------------------------------
      {
        topic: "Kumite Básico",
        category: "kumite",
        exactKyu: 6,
        minKyu: 6,
        question: "Quantos passos tem o combate combinado Gohon Kumite?",
        correctAnswer: "5 passos",
        distractors: ["3 passos", "1 passo", "Luta livre"]
      },
      {
        topic: "Kumite Básico",
        category: "kumite",
        exactKyu: 5,
        minKyu: 5,
        question: "Quantos passos tem o combate combinado Sanbon Kumite?",
        correctAnswer: "3 passos",
        distractors: ["5 passos", "1 passo", "Luta livre"]
      },
      {
        topic: "Kumite Básico",
        category: "kumite",
        exactKyu: 3,
        minKyu: 3,
        question: "Quantos passos tem o combate básico Kihon Ippon Kumite?",
        correctAnswer: "1 passo",
        distractors: ["3 passos", "5 passos", "Luta livre"]
      },
      {
        topic: "Arbitragem WKF",
        category: "kumite",
        minKyu: 4,
        question: "Nas regras oficiais da WKF, quantos pontos vale um Yuko?",
        correctAnswer: "1 ponto",
        distractors: ["2 pontos", "3 pontos", "4 pontos"]
      },
      {
        topic: "Arbitragem WKF",
        category: "kumite",
        minKyu: 4,
        question: "Nas regras oficiais da WKF, quantos pontos vale um Waza-ari?",
        correctAnswer: "2 pontos",
        distractors: ["1 ponto", "3 pontos", "4 pontos"]
      },
      {
        topic: "Arbitragem WKF",
        category: "kumite",
        minKyu: 4,
        question: "Nas regras oficiais da WKF, quantos pontos vale um Ippon?",
        correctAnswer: "3 pontos",
        distractors: ["1 ponto", "2 pontos", "5 pontos"]
      },
      {
        topic: "Arbitragem WKF",
        category: "kumite",
        minKyu: 2,
        question: "Em luta de competição (WKF), o que é o 'Senshu'?",
        correctAnswer: "Vantagem do 1º ponto marcado",
        distractors: ["Penalidade por falta", "Parada médica", "Empate oficial"]
      },
      {
        topic: "Arbitragem WKF",
        category: "kumite",
        minKyu: 1,
        question: "Qual termo da arbitragem significa desclassificação na luta?",
        correctAnswer: "Hansoku",
        distractors: ["Chui", "Senshu", "Yuko"]
      },
      {
        topic: "Arbitragem WKF",
        category: "kumite",
        minKyu: 1,
        question: "Qual termo da arbitragem significa advertência por falta?",
        correctAnswer: "Chui",
        distractors: ["Hansoku", "Yuko", "Ippon"]
      },

      // ---------------------------------------------------------------------
      // FILOSOFIA, HISTÓRIA E DOJÔ KUN - RESPOSTAS CURTAS
      // ---------------------------------------------------------------------
      {
        topic: "História do Karatê",
        category: "filosofia",
        minKyu: 6,
        question: "Quem é o fundador histórico do estilo Shotokan?",
        correctAnswer: "Mestre Gichin Funakoshi",
        distractors: ["Jigoro Kano", "Bruce Lee", "Masutatsu Oyama"]
      },
      {
        topic: "Filosofia Marcial",
        category: "filosofia",
        minKyu: 6,
        question: "Qual é a tradução da palavra 'Karate-Do'?",
        correctAnswer: "Caminho das Mãos Vazias",
        distractors: ["Arte dos Punhos Fortes", "Caminho da Luta Armada", "Luta dos Pés Velozes"]
      },
      {
        topic: "Dojô Kun",
        category: "filosofia",
        minKyu: 6,
        question: "Qual palavra japonesa inicia todos os 5 lemas do Dojô Kun?",
        correctAnswer: "Hitotsu (Primeiro)",
        distractors: ["Sensei (Professor)", "Dojo (Local)", "Kiai (Espírito)"]
      },
      {
        topic: "Dojô Kun",
        category: "filosofia",
        minKyu: 6,
        question: "Qual é o primeiro lema do Dojô Kun?",
        correctAnswer: "Formação do caráter",
        distractors: ["Fidelidade", "Esforço diário", "Conter a agressão"]
      },
      {
        topic: "Dojô Kun",
        category: "filosofia",
        minKyu: 5,
        question: "Qual lema do Dojô Kun orienta a lealdade e sinceridade?",
        correctAnswer: "Fidelidade com a verdade",
        distractors: ["Formação do caráter", "Conter a agressão", "Esforço e perseverança"]
      },
      {
        topic: "Dojô Kun",
        category: "filosofia",
        minKyu: 5,
        question: "Qual lema do Dojô Kun orienta a dedicação e perseverança?",
        correctAnswer: "Cultivar o espírito de esforço",
        distractors: ["Fidelidade", "Formação do caráter", "Conter a agressão"]
      },
      {
        topic: "Dojô Kun",
        category: "filosofia",
        minKyu: 6,
        question: "Qual lema do Dojô Kun trata do respeito a todos?",
        correctAnswer: "Respeito acima de tudo",
        distractors: ["Conter a agressão", "Formação do caráter", "Fidelidade"]
      },
      {
        topic: "Dojô Kun",
        category: "filosofia",
        minKyu: 5,
        question: "Qual lema do Dojô Kun orienta a não agir com violência?",
        correctAnswer: "Conter o espírito de agressão",
        distractors: ["Formação do caráter", "Respeito acima de tudo", "Fidelidade"]
      },
      {
        topic: "Conceitos Marciais",
        category: "filosofia",
        minKyu: 4,
        question: "O que é 'Zanshin' após a execução de um golpe?",
        correctAnswer: "Estado de alerta e atenção",
        distractors: ["Grito de ataque", "Relaxamento total", "Saudação final"]
      },
      {
        topic: "Conceitos Marciais",
        category: "filosofia",
        minKyu: 4,
        question: "O que é 'Kime' no instante do impacto do golpe?",
        correctAnswer: "Foco e explosão de energia",
        distractors: ["Esquiva rápida", "Relaxamento do braço", "Respiração lenta"]
      },
      {
        topic: "Conceitos Marciais",
        category: "filosofia",
        minKyu: 5,
        question: "O que é 'Hikite' durante um soco ou defesa?",
        correctAnswer: "Puxada do braço na cintura",
        distractors: ["Chute para trás", "Giro do corpo", "Olhar fixo"]
      },
      {
        topic: "Conceitos Marciais",
        category: "filosofia",
        minKyu: 6,
        question: "O que é 'Kiai' no momento da técnica?",
        correctAnswer: "Grito de união da energia",
        distractors: ["Silêncio no dojo", "Respiração nasal", "Saudação ao mestre"]
      },
      {
        topic: "Etiqueta do Dojô",
        category: "filosofia",
        minKyu: 6,
        question: "O que é 'Mokuso' no início e no final do treino?",
        correctAnswer: "Meditação silenciosa",
        distractors: ["Alongamento de pernas", "Combate livre", "Corrida no tatame"]
      },
      {
        topic: "Etiqueta do Dojô",
        category: "filosofia",
        minKyu: 6,
        question: "Como se chama a postura formal ajoelhada sobre os calcanhares?",
        correctAnswer: "Seiza",
        distractors: ["Kiba Dachi", "Mokuso", "Zenkutsu"]
      },
      {
        topic: "Comandos do Dojô",
        category: "filosofia",
        minKyu: 6,
        question: "Qual comando do Sensei determina o início imediato de um exercício?",
        correctAnswer: "Hajime!",
        distractors: ["Yame!", "Mokuso!", "Rei!"]
      },
      {
        topic: "Comandos do Dojô",
        category: "filosofia",
        minKyu: 6,
        question: "Qual comando do Sensei determina a parada imediata da ação?",
        correctAnswer: "Yame!",
        distractors: ["Hajime!", "Kamaete!", "Yoi!"]
      },
      {
        topic: "Comandos do Dojô",
        category: "filosofia",
        minKyu: 6,
        question: "Qual comando solicita a saudação de respeito ao professor?",
        correctAnswer: "Sensei ni Rei!",
        distractors: ["Otagai ni Rei!", "Shomen ni Rei!", "Mokuso!"]
      },
      {
        topic: "Comandos do Dojô",
        category: "filosofia",
        minKyu: 6,
        question: "Qual comando solicita a saudação mútua entre os colegas de treino?",
        correctAnswer: "Otagai ni Rei!",
        distractors: ["Sensei ni Rei!", "Yame!", "Hajime!"]
      },

      // ---------------------------------------------------------------------
      // TERMINOLOGIA E NÍVEIS CORPORAIS - RESPOSTAS CURTAS
      // ---------------------------------------------------------------------
      {
        topic: "Níveis de Ataque e Defesa",
        category: "terminologia",
        minKyu: 6,
        question: "Qual altura corporal corresponde ao nível 'Jodan'?",
        correctAnswer: "Cabeça e rosto (Alto)",
        distractors: ["Tronco e abdômen (Médio)", "Abaixo da cintura (Baixo)", "Costas"]
      },
      {
        topic: "Níveis de Ataque e Defesa",
        category: "terminologia",
        minKyu: 6,
        question: "Qual altura corporal corresponde ao nível 'Chudan'?",
        correctAnswer: "Tronco e abdômen (Médio)",
        distractors: ["Cabeça e rosto (Alto)", "Abaixo da cintura (Baixo)", "Pescoço"]
      },
      {
        topic: "Níveis de Ataque e Defesa",
        category: "terminologia",
        minKyu: 6,
        question: "Qual altura corporal corresponde ao nível 'Gedan'?",
        correctAnswer: "Abaixo da cintura (Baixo)",
        distractors: ["Cabeça e rosto (Alto)", "Tronco e peito (Médio)", "Ombros"]
      },
      {
        topic: "Níveis de Ataque e Defesa",
        category: "terminologia",
        minKyu: 6,
        question: "No Karatê, como se chama a altura de socos e defesas no rosto?",
        correctAnswer: "Jodan",
        distractors: ["Chudan", "Gedan", "Koshi"]
      },
      {
        topic: "Níveis de Ataque e Defesa",
        category: "terminologia",
        minKyu: 6,
        question: "No Karatê, como se chama a altura de socos e defesas no peito?",
        correctAnswer: "Chudan",
        distractors: ["Jodan", "Gedan", "Hikite"]
      },
      {
        topic: "Níveis de Ataque e Defesa",
        category: "terminologia",
        minKyu: 6,
        question: "No Karatê, como se chama a altura de defesas e golpes abaixo da cintura?",
        correctAnswer: "Gedan",
        distractors: ["Jodan", "Chudan", "Kime"]
      },
      {
        topic: "Armas Corporais",
        category: "terminologia",
        minKyu: 6,
        question: "O que é 'Seiken' no Karatê?",
        correctAnswer: "Dois primeiros nós do punho",
        distractors: ["Costas da mão", "Faca do pé", "Ponta do cotovelo"]
      },
      {
        topic: "Armas Corporais",
        category: "terminologia",
        minKyu: 5,
        question: "O que é 'Sokuto' no Karatê?",
        correctAnswer: "Faca externa do pé",
        distractors: ["Bola do pé", "Calcanhar", "Peito do pé"]
      },
      {
        topic: "Armas Corporais",
        category: "terminologia",
        minKyu: 5,
        question: "O que é 'Koshi' (Chusoku) no pé?",
        correctAnswer: "Bola do pé / almofada frontal",
        distractors: ["Calcanhar", "Faca externa do pé", "Tornozelo"]
      },
      {
        topic: "Armas Corporais",
        category: "terminologia",
        minKyu: 4,
        question: "O que é 'Empi' no Karatê?",
        correctAnswer: "Cotovelo",
        distractors: ["Joelho", "Punho fechado", "Ombro"]
      },
      {
        topic: "Armas Corporais",
        category: "terminologia",
        minKyu: 4,
        question: "O que é 'Kakato' no pé?",
        correctAnswer: "Calcanhar",
        distractors: ["Bola do pé", "Faca do pé", "Dedos do pé"]
      }
    ];
  }

  // =========================================================================
  // 2.5 BANCO E GERADOR DINÂMICO A PARTIR DO PLANO DE ESTUDOS OFICIAL TKST
  // =========================================================================

  function getCurriculumQuestionsForKyu(targetKyu, profile) {
    const kyuNum = (targetKyu === 7) ? 6 : Number(targetKyu);
    const questions = [];

    // Tenta obter o currículo oficial configurado no app (incluindo personalizações salvas pelo Sensei)
    let allCurriculums = [];
    try {
      if (window.TKST_AUTH && typeof window.TKST_AUTH.getCustomCurriculum === 'function') {
        allCurriculums = window.TKST_AUTH.getCustomCurriculum() || [];
      } else if (Array.isArray(window.TKST_CURRICULUM)) {
        allCurriculums = window.TKST_CURRICULUM;
      } else if (Array.isArray(window.TKST_DEFAULT_CURRICULUM)) {
        allCurriculums = window.TKST_DEFAULT_CURRICULUM;
      }
    } catch (e) {
      allCurriculums = [];
    }

    const beltCurr = allCurriculums.find(c => Number(c.kyuNumber) === kyuNum)
      || allCurriculums.find(c => c.id === `kyu-${kyuNum}`)
      || null;

    const beltName = beltCurr ? (beltCurr.beltName || profile.beltTitle) : profile.beltTitle;

    // 1. Acervo curado estrito por graduação do Plano de Estudos Oficial TKST
    // Garante que Katas, Kumite e requisitos pertençam EXATAMENTE à graduação selecionada
    const CURATED_CURRICULUM_QUESTIONS = {
      6: [
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 6,
          question: "Qual é o Kata oficial exigido no plano de estudos para o exame de Faixa Amarela (6º Kyu)?",
          correctAnswer: "Heian Shodan",
          distractors: ["Heian Nidan", "Heian Sandan", "Tekki Shodan"]
        },
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 6,
          question: "Quantos movimentos oficiais compõem o Kata Heian Shodan?",
          correctAnswer: "21 movimentos",
          distractors: ["26 movimentos", "20 movimentos", "27 movimentos"]
        },
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 6,
          question: "Em quais movimentos ocorrem os Kiais no Kata Heian Shodan?",
          correctAnswer: "Passos 8 e 16",
          distractors: ["Passos 10 e 20", "Passos 8 e 26", "Passos 12 e 19"]
        },
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 6,
          question: "Qual defesa baixa com antebraço abre e finaliza o Heian Shodan?",
          correctAnswer: "Gedan Barai",
          distractors: ["Jodan Age Uke", "Chudan Soto Uke", "Chudan Shuto Uke"]
        },
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 6,
          question: "Em qual base é executado o primeiro movimento (Gedan Barai à esquerda) do Heian Shodan?",
          correctAnswer: "Zenkutsu Dachi",
          distractors: ["Kokutsu Dachi", "Kiba Dachi", "Heiko Dachi"]
        },
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 6,
          question: "Qual defesa ascendente é executada três vezes em avanço com Kiai no Heian Shodan?",
          correctAnswer: "Jodan Age Uke",
          distractors: ["Gedan Barai", "Chudan Uchi Uke", "Chudan Shuto Uke"]
        },
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 6,
          question: "Qual ataque com soco direto é desferido nos passos 8 e 16 com Kiai no Heian Shodan?",
          correctAnswer: "Chudan Oi Tsuki",
          distractors: ["Chudan Gyaku Tsuki", "Jodan Oi Tsuki", "Chudan Nukite"]
        },
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 6,
          question: "Qual defesa com a faca da mão encerra a sequência final do Heian Shodan?",
          correctAnswer: "Chudan Shuto Uke",
          distractors: ["Gedan Barai", "Jodan Age Uke", "Chudan Soto Uke"]
        },
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 6,
          question: "Em qual base são executadas as quatro defesas Shuto Uke no final do Heian Shodan?",
          correctAnswer: "Kokutsu Dachi",
          distractors: ["Zenkutsu Dachi", "Kiba Dachi", "Neko Ashi Dachi"]
        },
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 6,
          question: "Qual é o significado da palavra 'Heian' dos primeiros 5 katas?",
          correctAnswer: "Mente em Paz",
          distractors: ["Cavaleiro de Ferro", "Olhar o Céu", "Romper a Fortaleza"]
        },
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 6,
          question: "Qual é o formato do traçado no solo (Embusen) desenhado durante o Heian Shodan?",
          correctAnswer: "Formato em H (ou I maiúsculo)",
          distractors: ["Linha reta horizontal", "Círculo fechado", "Triângulo equilátero"]
        },
        {
          topic: "Plano de Estudos • Kumite",
          category: "kumite",
          exactKyu: 6,
          question: "Qual modalidade de combate combinado de 5 passos é exigida no exame de Faixa Amarela (6º Kyu)?",
          correctAnswer: "Gohon Kumite",
          distractors: ["Sanbon Kumite", "Kihon Ippon Kumite", "Jiyu Kumite"]
        },
        {
          topic: "Plano de Estudos • Kumite",
          category: "kumite",
          exactKyu: 6,
          question: "Quantos passos tem o combate Gohon Kumite cobrado no exame de 6º Kyu?",
          correctAnswer: "5 passos",
          distractors: ["3 passos", "1 passo", "Luta livre"]
        },
        {
          topic: "Plano de Estudos • Kihon",
          category: "bases",
          exactKyu: 6,
          question: "Qual é a base frontal de avanço mais cobrada no Kihon de Faixa Amarela (6º Kyu)?",
          correctAnswer: "Zenkutsu Dachi",
          distractors: ["Kokutsu Dachi", "Kiba Dachi", "Neko Ashi Dachi"]
        },
        {
          topic: "Plano de Estudos • Kihon",
          category: "defesas",
          exactKyu: 6,
          question: "No Kihon do 6º Kyu, qual defesa com faca da mão é executada na base Kokutsu Dachi?",
          correctAnswer: "Chudan Shuto Uke",
          distractors: ["Gedan Barai", "Jodan Age Uke", "Chudan Uchi Uke"]
        },
        {
          topic: "Plano de Estudos • Kihon",
          category: "terminologia",
          exactKyu: 6,
          question: "No Kihon Go Kai do plano de estudos, quantas vezes cada técnica deve ser repetida?",
          correctAnswer: "5 vezes",
          distractors: ["3 vezes", "10 vezes", "1 vez"]
        }
      ],

      5: [
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 5,
          question: "Qual é o Kata oficial exigido no plano de estudos para o exame de Faixa Vermelha (5º Kyu)?",
          correctAnswer: "Heian Nidan",
          distractors: ["Heian Shodan", "Heian Sandan", "Heian Yondan"]
        },
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 5,
          question: "Quantos movimentos oficiais compõem o Kata Heian Nidan?",
          correctAnswer: "26 movimentos",
          distractors: ["21 movimentos", "20 movimentos", "27 movimentos"]
        },
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 5,
          question: "Em quais movimentos ocorrem os Kiais no Kata Heian Nidan?",
          correctAnswer: "Passos 8 e 26",
          distractors: ["Passos 8 e 16", "Passos 10 e 20", "Passos 13 e 25"]
        },
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 5,
          question: "Qual golpe perfurante com as pontas dos dedos aparece no Kata Heian Nidan?",
          correctAnswer: "Chudan Nukite",
          distractors: ["Chudan Gyaku Tsuki", "Jodan Uraken Uchi", "Chudan Empi Uchi"]
        },
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 5,
          question: "Qual postura e defesa dupla abre o primeiro movimento do Kata Heian Nidan?",
          correctAnswer: "Haiwan Morote Jodan Uke",
          distractors: ["Gedan Barai", "Chudan Soto Uke", "Jodan Age Uke"]
        },
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 5,
          question: "Ao contrário do Heian Shodan, em qual base o Heian Nidan se inicia logo no primeiro passo?",
          correctAnswer: "Kokutsu Dachi",
          distractors: ["Zenkutsu Dachi", "Kiba Dachi", "Neko Ashi Dachi"]
        },
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 5,
          question: "Qual chute lateral com estalo é desferido junto com Uraken Uchi no Heian Nidan?",
          correctAnswer: "Yoko Geri Keage",
          distractors: ["Mae Geri", "Mawashi Geri", "Ushiro Geri"]
        },
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 5,
          question: "No ataque Chudan Nukite do passo 8, como fica posicionada a mão esquerda de apoio?",
          correctAnswer: "Espalmada sob o cotovelo direito (Osae Uke)",
          distractors: ["Fechada na cintura", "Aberta na frente do rosto", "Apoiada no joelho"]
        },
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 5,
          question: "Quais defesas em Kokutsu Dachi são executadas nos passos 9 a 12 logo após o 1º Kiai?",
          correctAnswer: "Chudan Shuto Uke",
          distractors: ["Gedan Barai", "Jodan Age Uke", "Chudan Soto Uke"]
        },
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 5,
          question: "Qual combinação de chute frontal e soco invertido antecede o Morote Uke no Heian Nidan?",
          correctAnswer: "Mae Geri e Gyaku Tsuki",
          distractors: ["Yoko Geri e Oi Tsuki", "Mawashi Geri e Empi", "Mae Geri e Uraken"]
        },
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 5,
          question: "Qual defesa reforçada com antebraço em Zenkutsu Dachi antecede o giro de 180 graus no Heian Nidan?",
          correctAnswer: "Morote Uke",
          distractors: ["Gedan Barai", "Juji Uke", "Shuto Uke"]
        },
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 5,
          question: "Qual soco finaliza o Heian Nidan no passo 26 acompanhado de Kiai?",
          correctAnswer: "Gyaku Tsuki em Zenkutsu Dachi",
          distractors: ["Oi Tsuki em Kokutsu", "Uraken Uchi", "Chudan Nukite"]
        },
        {
          topic: "Plano de Estudos • Kumite",
          category: "kumite",
          exactKyu: 5,
          question: "Qual combate combinado de 3 passos é exigido no exame de Faixa Vermelha (5º Kyu)?",
          correctAnswer: "Sanbon Kumite",
          distractors: ["Gohon Kumite", "Kihon Ippon Kumite", "Jiyu Kumite"]
        },
        {
          topic: "Plano de Estudos • Kumite",
          category: "kumite",
          exactKyu: 5,
          question: "Quantos passos tem o combate combinado Sanbon Kumite do 5º Kyu?",
          correctAnswer: "3 passos",
          distractors: ["5 passos", "1 passo", "Luta livre"]
        },
        {
          topic: "Plano de Estudos • Kihon",
          category: "chutes",
          exactKyu: 5,
          question: "Qual chute lateral com estalo rápido (Keage) é executado na base Kiba Dachi no 5º Kyu?",
          correctAnswer: "Yoko Geri Keage",
          distractors: ["Yoko Geri Kekomi", "Mae Geri", "Mawashi Geri"]
        },
        {
          topic: "Plano de Estudos • Kihon",
          category: "chutes",
          exactKyu: 5,
          question: "Qual chute penetrante linear lateral (Kekomi) é cobrado na base Kiba Dachi no 5º Kyu?",
          correctAnswer: "Yoko Geri Kekomi",
          distractors: ["Yoko Geri Keage", "Mae Geri", "Mika Tsuki Geri"]
        }
      ],

      4: [
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 4,
          question: "Qual é o Kata oficial exigido no plano de estudos para o exame de Faixa Laranja (4º Kyu)?",
          correctAnswer: "Heian Sandan",
          distractors: ["Heian Nidan", "Heian Yondan", "Heian Godan"]
        },
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 4,
          question: "Quantos movimentos oficiais compõem o Kata Heian Sandan?",
          correctAnswer: "20 movimentos",
          distractors: ["21 movimentos", "26 movimentos", "27 movimentos"]
        },
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 4,
          question: "Em quais movimentos ocorrem os Kiais no Kata Heian Sandan?",
          correctAnswer: "Passos 10 e 20",
          distractors: ["Passos 8 e 16", "Passos 8 e 26", "Passos 13 e 25"]
        },
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 4,
          question: "Qual base lateral do cavaleiro com peso 50%/50% é destacada no Heian Sandan?",
          correctAnswer: "Kiba Dachi",
          distractors: ["Zenkutsu Dachi", "Kokutsu Dachi", "Neko Ashi Dachi"]
        },
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 4,
          question: "Qual defesa com o antebraço de dentro para fora inicia o Kata Heian Sandan?",
          correctAnswer: "Chudan Uchi Uke",
          distractors: ["Gedan Barai", "Jodan Age Uke", "Chudan Soto Uke"]
        },
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 4,
          question: "Após o primeiro Uchi Uke no Heian Sandan, quais defesas duplas simultâneas são executadas?",
          correctAnswer: "Jodan Uchi Uke e Gedan Barai",
          distractors: ["Gedan Barai e Age Uke", "Morote Uke e Shuto Uke", "Duplo Gedan Barai"]
        },
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 4,
          question: "Qual ataque direto em avanço em Zenkutsu Dachi marca o primeiro Kiai do Heian Sandan?",
          correctAnswer: "Chudan Oi Tsuki (passo 10)",
          distractors: ["Gyaku Tsuki", "Chudan Nukite", "Uraken Uchi"]
        },
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 4,
          question: "Após o primeiro Kiai, em qual base o carateca gira colocando os punhos na cintura (Koshi Gamae)?",
          correctAnswer: "Kiba Dachi",
          distractors: ["Zenkutsu Dachi", "Kokutsu Dachi", "Heisoku Dachi"]
        },
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 4,
          question: "Qual golpe com o cotovelo de encontro à palma da mão é executado em Kiba Dachi no Heian Sandan?",
          correctAnswer: "Mae Empi Uchi",
          distractors: ["Yoko Empi", "Ushiro Empi", "Mawashi Empi"]
        },
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 4,
          question: "Qual golpe com o dorso do punho é lançado sobre o ombro antes de avançar no Heian Sandan?",
          correctAnswer: "Uraken Uchi",
          distractors: ["Tettsui Uchi", "Shuto Uchi", "Nukite"]
        },
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 4,
          question: "Qual pisada penetrante com o calcanhar antecede o golpe de cotovelo no Heian Sandan?",
          correctAnswer: "Fumikomi",
          distractors: ["Mae Geri", "Yoko Geri", "Nami Gaeshi"]
        },
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 4,
          question: "Qual golpe encerra o Heian Sandan com o segundo Kiai em Kiba Dachi?",
          correctAnswer: "Chudan Tsuki para trás sobre o ombro",
          distractors: ["Gedan Barai", "Shuto Uke", "Mae Geri"]
        },
        {
          topic: "Plano de Estudos • Kumite",
          category: "kumite",
          exactKyu: 4,
          question: "Quais formas avançadas de Sanbon Kumite são exigidas no exame de Faixa Laranja (4º Kyu)?",
          correctAnswer: "3ª, 4ª e 5ª Forma",
          distractors: ["1ª e 2ª Forma", "Apenas Gohon", "Jiyu Kumite"]
        },
        {
          topic: "Plano de Estudos • Kihon",
          category: "chutes",
          exactKyu: 4,
          question: "Qual chute circular na altura da cabeça e rosto (Jodan) é cobrado no exame de 4º Kyu?",
          correctAnswer: "Jodan Mawashi Geri",
          distractors: ["Chudan Mae Geri", "Gedan Barai", "Chudan Yoko Geri"]
        }
      ],

      3: [
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 3,
          question: "Qual é o Kata oficial exigido no plano de estudos para o exame de Faixa Verde (3º Kyu)?",
          correctAnswer: "Heian Yondan",
          distractors: ["Heian Shodan", "Heian Nidan", "Heian Sandan"]
        },
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 3,
          question: "Quantos movimentos oficiais compõem o Kata Heian Yondan exigido na Faixa Verde?",
          correctAnswer: "27 movimentos",
          distractors: ["21 movimentos", "26 movimentos", "20 movimentos"]
        },
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 3,
          question: "Em quais movimentos ocorrem os Kiais no Kata Heian Yondan do exame de Faixa Verde?",
          correctAnswer: "Passos 13 e 25",
          distractors: ["Passos 8 e 16", "Passos 8 e 26", "Passos 10 e 20"]
        },
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 3,
          question: "Quais defesas duplas reforçadas com os dois braços se destacam no Kata Heian Yondan?",
          correctAnswer: "Morote Uke e Kosa Uke",
          distractors: ["Gedan Barai e Age Uke", "Shuto Uke e Empi", "Uchi Uke e Soto Uke"]
        },
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 3,
          question: "Qual combinação de chutes é desferida logo após o Morote Uke no Heian Yondan?",
          correctAnswer: "Mae Geri e Yoko Geri",
          distractors: ["Mawashi Geri e Ushiro", "Tobi Geri e Kekomi", "Dois Mae Geri"]
        },
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 3,
          question: "Como é o ritmo e o movimento inicial de abertura do Kata Heian Yondan?",
          correctAnswer: "Lento e potente em Haiwan Morote Uke",
          distractors: ["Rápido com Kiai", "Salto duplo no ar", "Corrida lateral"]
        },
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 3,
          question: "Qual defesa cruzada baixa com antebraços (Juji Uke) aparece no Heian Yondan?",
          correctAnswer: "Gedan Kosa Uke (Juji Uke)",
          distractors: ["Jodan Age Uke", "Chudan Shuto Uke", "Morote Soto Uke"]
        },
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 3,
          question: "Qual golpe atinge a palma da mão no passo 13 marcando o primeiro Kiai do Heian Yondan?",
          correctAnswer: "Mae Empi Uchi em Kiba Dachi",
          distractors: ["Chudan Oi Tsuki", "Gyaku Tsuki", "Uraken Uchi"]
        },
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 3,
          question: "Qual golpe com o joelho segurando a cabeça do oponente antecede o último Kiai no Heian Yondan?",
          correctAnswer: "Hiza Geri",
          distractors: ["Mae Geri", "Mawashi Geri", "Fumikomi"]
        },
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 3,
          question: "Qual técnica encerra o Heian Yondan com Kiai no passo 25?",
          correctAnswer: "Chudan Shuto Uke duplo em avanço",
          distractors: ["Gedan Barai", "Gyaku Tsuki", "Age Uke"]
        },
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 3,
          question: "Qual golpe penetrante com a ponta dos dedos é desferido em avanço no Heian Yondan?",
          correctAnswer: "Chudan Nukite",
          distractors: ["Oi Tsuki", "Empi Uchi", "Teisho Uchi"]
        },
        {
          topic: "Plano de Estudos • Kumite",
          category: "kumite",
          exactKyu: 3,
          question: "Qual modalidade de combate combinado de 1 passo é exigida no exame de Faixa Verde (3º Kyu)?",
          correctAnswer: "Kihon Ippon Kumite",
          distractors: ["Gohon Kumite", "Sanbon Kumite", "Shiai Kumite"]
        },
        {
          topic: "Plano de Estudos • Kumite",
          category: "kumite",
          exactKyu: 3,
          question: "Quantos passos de ataque e defesa são desferidos no combate Kihon Ippon Kumite?",
          correctAnswer: "1 passo",
          distractors: ["5 passos", "3 passos", "Luta livre contínua"]
        },
        {
          topic: "Plano de Estudos • Kihon",
          category: "socos",
          exactKyu: 3,
          question: "No Kihon da Faixa Verde (3º Kyu), qual soco duplo simultâneo e paralelo é exigido?",
          correctAnswer: "Awase Tsuki",
          distractors: ["Chudan Oi Tsuki", "Chudan Gyaku Tsuki", "Yama Tsuki"]
        },
        {
          topic: "Plano de Estudos • Kihon",
          category: "socos",
          exactKyu: 3,
          question: "Qual golpe com a base da palma da mão na altura do rosto (Jodan) é cobrado na Faixa Verde?",
          correctAnswer: "Jodan Teisho Uchi",
          distractors: ["Chudan Teisho Uchi", "Jodan Shuto Uchi", "Jodan Uraken Uchi"]
        },
        {
          topic: "Plano de Estudos • Kihon",
          category: "socos",
          exactKyu: 3,
          question: "Qual golpe com a base da palma da mão na altura do peito (Chudan) é cobrado na Faixa Verde?",
          correctAnswer: "Chudan Teisho Uchi",
          distractors: ["Jodan Teisho Uchi", "Chudan Nukite", "Chudan Empi Uchi"]
        },
        {
          topic: "Plano de Estudos • Kihon",
          category: "socos",
          exactKyu: 3,
          question: "Qual soco com o punho na vertical é exigido no Kihon da Faixa Verde (3º Kyu)?",
          correctAnswer: "Tate Tsuki",
          distractors: ["Chudan Oi Tsuki", "Chudan Gyaku Tsuki", "Ura Tsuki"]
        },
        {
          topic: "Plano de Estudos • Kihon",
          category: "chutes",
          exactKyu: 3,
          question: "Qual chute frontal saltando no ar é exigido no Kihon da Faixa Verde (3º Kyu)?",
          correctAnswer: "Mae Tobi Geri",
          distractors: ["Ushiro Geri", "Mawashi Geri", "Yoko Geri"]
        },
        {
          topic: "Plano de Estudos • Kihon",
          category: "chutes",
          exactKyu: 3,
          question: "Qual chute para trás atingindo com o calcanhar é cobrado no exame de Faixa Verde (3º Kyu)?",
          correctAnswer: "Ushiro Geri",
          distractors: ["Mae Geri", "Mawashi Geri", "Mika Tsuki Geri"]
        }
      ],

      2: [
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 2,
          question: "Qual é o 5º Heian Kata oficial exigido no exame de Faixa Roxa (2º Kyu)?",
          correctAnswer: "Heian Godan",
          distractors: ["Heian Yondan", "Heian Sandan", "Tekki Shodan"]
        },
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 2,
          question: "Quantos movimentos oficiais compõem o Kata Heian Godan cobrado no 2º Kyu?",
          correctAnswer: "23 movimentos",
          distractors: ["27 movimentos", "21 movimentos", "29 movimentos"]
        },
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 2,
          question: "Em quais movimentos ocorrem os Kiais no Kata Heian Godan?",
          correctAnswer: "Passos 12 e 19",
          distractors: ["Passos 8 e 16", "Passos 10 e 20", "Passos 13 e 25"]
        },
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 2,
          question: "Qual Kata em base Kiba Dachi começa a ser exigido a partir do exame de 2º Kyu (Faixa Roxa)?",
          correctAnswer: "Tekki Shodan",
          distractors: ["Bassai Dai", "Kanku Dai", "Empi"]
        },
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 2,
          question: "Quantos movimentos oficiais compõem o Kata Tekki Shodan?",
          correctAnswer: "29 movimentos",
          distractors: ["21 movimentos", "26 movimentos", "42 movimentos"]
        },
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 2,
          question: "Em quais movimentos ocorrem os Kiais no Kata Tekki Shodan?",
          correctAnswer: "Passos 15 e 29",
          distractors: ["Passos 10 e 20", "Passos 12 e 19", "Passos 8 e 26"]
        },
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 2,
          question: "Qual movimento aéreo com pernas cruzadas marca o segundo Kiai no Heian Godan?",
          correctAnswer: "Salto com Kosa Dachi e Juji Uke (passo 19)",
          distractors: ["Salto com Mae Geri", "Salto com Mawashi", "Apenas giro no chão"]
        },
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 2,
          question: "Qual defesa em meia-lua com a sola do pé protegendo a virilha caracteriza o Tekki Shodan?",
          correctAnswer: "Nami Gaeshi (onda que retorna)",
          distractors: ["Fumikomi", "Mae Geri", "Ashibarai"]
        },
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 2,
          question: "Qual defesa média em Kokutsu Dachi abre o primeiro movimento do Heian Godan?",
          correctAnswer: "Chudan Uchi Uke",
          distractors: ["Gedan Barai", "Jodan Age Uke", "Chudan Soto Uke"]
        },
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 2,
          question: "Qual é o significado tradicional do nome do Kata Tekki?",
          correctAnswer: "Cavaleiro de Ferro",
          distractors: ["Mente em Paz", "Olhar o Céu", "Romper a Fortaleza"]
        },
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 2,
          question: "Qual soco em gancho seguido de postura de fluxo de água (Mizu Nagare) aparece no Heian Godan?",
          correctAnswer: "Kagi Tsuki",
          distractors: ["Oi Tsuki", "Gyaku Tsuki", "Yama Tsuki"]
        },
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 2,
          question: "Após aterrissar do salto no passo 19 do Heian Godan, qual defesa cruzada alta protege a cabeça?",
          correctAnswer: "Jodan Juji Uke (Kosa Uke)",
          distractors: ["Gedan Barai", "Morote Uke", "Shuto Uke"]
        },
        {
          topic: "Plano de Estudos • Kumite",
          category: "kumite",
          exactKyu: 2,
          question: "Qual modalidade de combate semi-livre em distância de luta é cobrada no 2º Kyu?",
          correctAnswer: "Jiyu Ippon Kumite",
          distractors: ["Gohon Kumite", "Sanbon Kumite", "Kihon Ippon Kumite"]
        },
        {
          topic: "Plano de Estudos • Kumite",
          category: "kumite",
          exactKyu: 2,
          question: "Contra quantos oponentes é avaliado o combate livre no exame de 2º Kyu (Faixa Roxa)?",
          correctAnswer: "Contra 1 e 2 oponentes",
          distractors: ["Apenas 1 oponente", "Contra 5 oponentes", "Não há combate"]
        },
        {
          topic: "Plano de Estudos • Defesa Pessoal",
          category: "terminologia",
          exactKyu: 2,
          question: "Qual exigência prática de Defesa Pessoal é cobrada no exame de 2º Kyu (Faixa Roxa)?",
          correctAnswer: "Queda e imobilização",
          distractors: ["Apenas esquiva", "Sem contato físico", "Desarme armado"]
        }
      ],

      1: [
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 1,
          question: "Qual Kata superior de 42 movimentos ('Romper a Fortaleza') é exigido no exame de 1º Kyu?",
          correctAnswer: "Bassai Dai",
          distractors: ["Kanku Dai", "Tekki Shodan", "Empi"]
        },
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 1,
          question: "Quantos movimentos oficiais compõem o Kata Bassai Dai cobrado no exame de 1º Kyu?",
          correctAnswer: "42 movimentos",
          distractors: ["29 movimentos", "65 movimentos", "23 movimentos"]
        },
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 1,
          question: "Em quais movimentos ocorrem os Kiais no Kata Bassai Dai?",
          correctAnswer: "Passos 19 e 42",
          distractors: ["Passos 15 e 29", "Passos 10 e 20", "Passos 13 e 25"]
        },
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 1,
          question: "Qual é o significado tradicional da tradução do Kata Bassai Dai?",
          correctAnswer: "Romper a Fortaleza (ou Penetrar a Fortaleza)",
          distractors: ["Mente em Paz", "Olhar o Céu", "Cavaleiro de Ferro"]
        },
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 1,
          question: "Qual Kata executado 100% na base Kiba Dachi é cobrado com aplicação prática (Bunkai) no 1º Kyu?",
          correctAnswer: "Tekki Shodan",
          distractors: ["Heian Godan", "Bassai Dai", "Jion"]
        },
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 1,
          question: "Qual é a posição das mãos no início (Yoi) do Kata Bassai Dai?",
          correctAnswer: "Mão direita em punho envolvida pela mão esquerda aberta",
          distractors: ["Punhos fechados na cintura", "Mãos cruzadas na frente", "Palmas voltadas para baixo"]
        },
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 1,
          question: "Qual é o primeiro movimento de avanço do Bassai Dai logo após a saudação?",
          correctAnswer: "Salto frontal penetrante em Kosa Dachi com Morote Uke",
          distractors: ["Passo atrás em Kokutsu", "Gedan Barai à esquerda", "Chute Mae Geri"]
        },
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 1,
          question: "Qual defesa dupla em formato de 'Montanha' (Yama Uke) é executada em Kiba Dachi no Bassai Dai?",
          correctAnswer: "Yama Uke (defesa em U)",
          distractors: ["Morote Uke", "Juji Uke", "Shuto Uke"]
        },
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 1,
          question: "Qual defesa circular em colher com o antebraço quebrando a pegada do adversário aparece no Bassai Dai?",
          correctAnswer: "Sukui Uke",
          distractors: ["Gedan Barai", "Age Uke", "Soto Uke"]
        },
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 1,
          question: "Qual técnica executada no passo 42 encerra o Kata Bassai Dai com Kiai?",
          correctAnswer: "Chudan Shuto Uke em Kokutsu Dachi",
          distractors: ["Chudan Oi Tsuki", "Gyaku Tsuki", "Gedan Barai"]
        },
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 1,
          question: "Na linhagem do Karatê Shotokan, o que significam os sufixos 'Dai' e 'Sho' dos Katas?",
          correctAnswer: "Dai significa Maior/Grande e Sho significa Menor/Pequeno",
          distractors: ["Dai significa Rápido e Sho Lento", "Dai significa Forte e Sho Fraco", "Dai Infantil e Sho Adulto"]
        },
        {
          topic: "Plano de Estudos • Kumite",
          category: "kumite",
          exactKyu: 1,
          question: "Quais modalidades de combate avançado são exigidas no exame de Faixa Marrom (1º Kyu)?",
          correctAnswer: "Jiyu Ippon e Jiyu Kumite",
          distractors: ["Apenas Gohon Kumite", "Apenas Sanbon Kumite", "Apenas formas combinadas"]
        },
        {
          topic: "Plano de Estudos • Kihon",
          category: "terminologia",
          exactKyu: 1,
          question: "Como é estruturado o exame de Kihon Go Kai para a Faixa Marrom (1º Kyu)?",
          correctAnswer: "5 em Execução e 5 em Aplicação",
          distractors: ["10 técnicas estáticas", "Apenas chutes", "Apenas socos"]
        }
      ],

      0: [
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 0,
          question: "Qual Kata superior de 65 movimentos significa 'Olhar para o Céu' no exame de Faixa Preta?",
          correctAnswer: "Kanku Dai",
          distractors: ["Bassai Dai", "Empi", "Jion"]
        },
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 0,
          question: "Quantos movimentos compõem o Kata mestre Kanku Dai?",
          correctAnswer: "65 movimentos",
          distractors: ["42 movimentos", "29 movimentos", "37 movimentos"]
        },
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: 0,
          question: "Qual Kata dinâmico significa 'Voo da Andorinha' e tem 37 movimentos?",
          correctAnswer: "Empi",
          distractors: ["Bassai Dai", "Kanku Dai", "Hangetsu"]
        },
        {
          topic: "Plano de Estudos • Kumite",
          category: "kumite",
          exactKyu: 0,
          question: "Qual modalidade de combate livre oficial sem passos marcados é exigida no exame de Faixa Preta?",
          correctAnswer: "Jiyu Kumite",
          distractors: ["Gohon Kumite", "Sanbon Kumite", "Kihon Ippon"]
        },
        {
          topic: "Plano de Estudos • Filosofia",
          category: "filosofia",
          exactKyu: 0,
          question: "Qual é a tradução literal do termo 'Shodan' da faixa preta de 1º Dan?",
          correctAnswer: "Primeiro degrau inicial",
          distractors: ["Mestre supremo final", "Fim de todo estudo", "Graduação máxima"]
        },
        {
          topic: "Plano de Estudos • Filosofia",
          category: "filosofia",
          exactKyu: 0,
          question: "O que representa a tríade marcial Shin-Gi-Tai no exame de faixa preta?",
          correctAnswer: "Mente, Técnica e Corpo",
          distractors: ["Soco, Chute e Defesa", "Faixa, Kimono e Tatame", "Árbitro, Atleta e Técnico"]
        }
      ],

      "-1": [
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: -1,
          question: "Quais Katas superiores compõem o aprofundamento oficial do 2º Dan (Nidan)?",
          correctAnswer: "Jitte, Gankaku e Sochin",
          distractors: ["Heian Shodan e Nidan", "Tekki Shodan", "Bassai Dai"]
        },
        {
          topic: "Plano de Estudos • Bases",
          category: "bases",
          exactKyu: -1,
          question: "Qual é a postura em uma só perna (Garça na Rocha) destacada no Kata Gankaku?",
          correctAnswer: "Tsuruashi Dachi",
          distractors: ["Kiba Dachi", "Zenkutsu Dachi", "Heiko Dachi"]
        },
        {
          topic: "Plano de Estudos • Bases",
          category: "bases",
          exactKyu: -1,
          question: "Qual base inabalável com raízes fortes é característica marcante do Kata Sochin?",
          correctAnswer: "Fudo Dachi (Sochin Dachi)",
          distractors: ["Kokutsu Dachi", "Neko Ashi Dachi", "Kosa Dachi"]
        }
      ],

      "-2": [
        {
          topic: "Plano de Estudos • Kata",
          category: "katas",
          exactKyu: -2,
          question: "Quais Katas de alto grau são estudados no nível Sandan (3º Dan)?",
          correctAnswer: "Nijushiho, Meikyo e Unsu",
          distractors: ["Heian Shodan e Nidan", "Tekki Shodan", "Bassai Dai"]
        },
        {
          topic: "Plano de Estudos • Filosofia",
          category: "filosofia",
          exactKyu: -2,
          question: "O que significa o conceito ancestral marcial 'Shuhari'?",
          correctAnswer: "Obedecer, Romper e Transcender",
          distractors: ["Começar, Parar e Desistir", "Ataque, Defesa e Contra-ataque", "Infantil e Adulto"]
        }
      ]
    };

    const curated = CURATED_CURRICULUM_QUESTIONS[kyuNum] || [];
    curated.forEach(item => {
      questions.push({
        ...item,
        source: "Plano de Estudos Oficial TKST"
      });
    });

    // 2. Se houver técnicas cadastradas no curriculum do app (beltCurr.kihon), gera perguntas dinâmicas adicionais
    if (beltCurr && Array.isArray(beltCurr.kihon) && beltCurr.kihon.length > 0) {
      const ALL_STANCES = ["Zenkutsu Dachi", "Kokutsu Dachi", "Kiba Dachi", "Fudo Dachi", "Neko Ashi Dachi"];
      
      beltCurr.kihon.forEach(k => {
        if (!k || !k.technique) return;
        if (k.stance) {
          const distractors = shuffle(ALL_STANCES.filter(s => normalizeKey(s) !== normalizeKey(k.stance))).slice(0, 3);
          questions.push({
            topic: "Plano de Estudos • Kihon",
            category: "bases",
            exactKyu: kyuNum,
            question: `No Kihon oficial de ${beltName}, em qual base é executada a técnica '${k.technique}'?`,
            correctAnswer: k.stance,
            distractors: distractors,
            source: "Plano de Estudos Oficial TKST"
          });
        }
      });
    }

    return questions;
  }

  // =========================================================================
  // 3. MOTOR PÚBLICO DE FORMULAÇÃO DE QUESTÕES COM RESPOSTAS CURTAS
  // =========================================================================

  const SHOTOKAN_ENGINE = {
    getGraduationProfiles: () => GRADUATION_PROFILES,

    /**
     * Formula questões com respostas curtas e objetivas para o simulado,
     * integrando o Plano de Estudos Oficial TKST com o Estudo Shotokan,
     * com isolamento rigoroso por graduação (sem vazar katas de faixas distintas).
     * 
     * @param {number|string} kyu Graduação alvo (6 ao 1 Kyu, 0, -1, -2 Dans)
     * @param {object} options Opções:
     *   - count: quantidade de perguntas desejadas (padrão 5)
     *   - category: filtro opcional ("todos", "bases", "defesas", "socos", "chutes", "katas", "kumite", "filosofia", "terminologia")
     *   - avoidExisting: evita perguntas já existentes no banco do app
     * @returns {Array} Lista de questões formuladas com alternativas curtas e diretas
     */
    formulateQuestions: function (kyu, options = {}) {
      const targetKyu = (parseInt(kyu, 10) === 7) ? 6 : parseInt(kyu, 10);
      const count = Math.max(1, Math.min(25, parseInt(options.count, 10) || 5));
      const categoryFilter = options.category || 'todos';
      const avoidExisting = options.avoidExisting !== false;
      const profile = GRADUATION_PROFILES[targetKyu] || GRADUATION_PROFILES[6];

      // 1. Obter perguntas específicas do Plano de Estudos Oficial da TKST da graduação
      const curriculumQuestions = getCurriculumQuestionsForKyu(targetKyu, profile);

      // 2. Obter acervo de perguntas curtas e objetivas do Shotokan
      const allShortQuestions = getShortQuestionsDatabase();

      // 3. Pesquisa prévia na graduação selecionada (Kyu) no banco do app para nunca repetir respostas nem conceitos
      const existingQuestionKeys = new Set();
      const existingConceptKeys = new Set();
      const existingAnswerSigsInGraduation = new Set();

      if (avoidExisting) {
        try {
          const bank = (window.TKST_AUTH && typeof window.TKST_AUTH.getCustomQuizBank === 'function')
            ? window.TKST_AUTH.getCustomQuizBank()
            : (window.TKST_QUIZ_BANK || window.TKST_DEFAULT_QUIZ_BANK || []);

          if (Array.isArray(bank)) {
            bank.forEach(q => {
              if (!q) return;

              // Identificar se a questão existente pertence a esta graduação
              const qKyu = Number(q.kyuNumber !== undefined ? q.kyuNumber : (q.kyu !== undefined ? q.kyu : 6));
              const isTargetGraduation = (targetKyu === 6) ? (qKyu === 6 || qKyu === 7) : (qKyu === targetKyu);

              // Evitar duplicar enunciado idêntico
              if (q.question) {
                existingQuestionKeys.add(normalizeKey(q.question));
              }

              // Extrair resposta correta da questão existente
              let ans = '';
              if (typeof q.correctAnswer === 'string' && q.correctAnswer.trim()) {
                ans = q.correctAnswer.trim();
              } else if (Array.isArray(q.options) && typeof q.correctIndex === 'number' && q.options[q.correctIndex]) {
                ans = String(q.options[q.correctIndex]).trim();
              } else if (Array.isArray(q.options) && q.options.length > 0) {
                ans = String(q.options[0]).trim();
              }

              // Registrar chave conceitual semântica (evita variações de fraseamento da mesma pergunta)
              if (isTargetGraduation || q.category === 'katas') {
                const concept = getQuestionConceptKey(q.question, ans);
                if (concept) existingConceptKeys.add(concept);
              }

              if (isTargetGraduation && ans) {
                const sigs = getAnswerSignatures(ans);
                sigs.forEach(sig => existingAnswerSigsInGraduation.add(sig));
              }
            });
          }
        } catch (e) {
          console.warn('[ShotokanEngine] Erro na pesquisa prévia da graduação:', e);
        }
      }

      // Se opções passarem perguntas ou respostas a excluir (ex: troca de card único no modal sem repetir os outros cards)
      if (Array.isArray(options.excludeQuestions)) {
        options.excludeQuestions.forEach(qText => {
          if (qText) {
            existingQuestionKeys.add(normalizeKey(qText));
            const concept = getQuestionConceptKey(qText, '');
            if (concept) existingConceptKeys.add(concept);
          }
        });
      }

      if (Array.isArray(options.excludeAnswers)) {
        options.excludeAnswers.forEach(ans => {
          if (ans) {
            const sigs = getAnswerSignatures(ans);
            sigs.forEach(sig => existingAnswerSigsInGraduation.add(sig));
            const concept = getQuestionConceptKey('', ans);
            if (concept) existingConceptKeys.add(concept);
          }
        });
      }

      // 4. Filtrar pelo nível de Kyu rigorosamente compatível (com Plano de Estudos e Estudo Shotokan)
      const combinedPool = [...curriculumQuestions, ...allShortQuestions];

      let candidates = combinedPool.filter(q => {
        // REGRA DE GRADUAÇÃO ABSOLUTA:
        // Se a questão possui exactKyu (todos os Katas, Kumites e itens do Plano de Estudos),
        // ela DEVE bater com targetKyu! Isso impede que Katas de faixas distintas se misturem.
        if (q.exactKyu !== undefined) {
          return q.exactKyu === targetKyu;
        }
        // Se for categoria Katas ou Kumite sem exactKyu, nunca deixa vazar
        if (q.category === 'katas' || q.category === 'kumite') {
          return false;
        }
        // Técnicas gerais (socos, defesas, chutes, bases, filosofia, terminologia):
        if (targetKyu >= 0) {
          return q.minKyu >= targetKyu;
        }
        return true;
      });

      // 5. Filtrar por categoria temática se solicitado
      if (categoryFilter && categoryFilter !== 'todos') {
        const byCat = candidates.filter(q => q.category === categoryFilter);
        if (byCat.length > 0) {
          candidates = byCat;
        }
      }

      // 6. Função de teste de colisão de resposta
      function answerCollidesWith(answerStr, sigSet) {
        if (!answerStr) return false;
        const candidateSigs = getAnswerSignatures(answerStr);
        for (const sig of candidateSigs) {
          if (sigSet.has(sig)) return true;
        }
        return false;
      }

      // 7. Filtrar candidatos estritamente inéditos na graduação (nem pergunta, nem conceito, nem resposta repetida)
      let uniqueCandidates = candidates.filter(item => {
        if (existingQuestionKeys.has(normalizeKey(item.question))) return false;
        const concept = getQuestionConceptKey(item.question, item.correctAnswer);
        if (concept && existingConceptKeys.has(concept)) return false;
        if (answerCollidesWith(item.correctAnswer, existingAnswerSigsInGraduation)) return false;
        return true;
      });

      // Se houver menos candidatos novos do que o requisitado e o filtro de categoria foi muito estreito,
      // busca nas demais categorias da mesma faixa que não tenham conceito ou resposta repetida
      if (uniqueCandidates.length < count && categoryFilter !== 'todos') {
        const fallbackCandidates = combinedPool.filter(item => {
          if (item.exactKyu !== undefined && item.exactKyu !== targetKyu) return false;
          if ((item.category === 'katas' || item.category === 'kumite') && item.exactKyu !== targetKyu) return false;
          const kyuOk = (targetKyu >= 0) ? ((item.minKyu !== undefined ? item.minKyu >= targetKyu : true)) : true;
          if (!kyuOk) return false;
          if (existingQuestionKeys.has(normalizeKey(item.question))) return false;
          const concept = getQuestionConceptKey(item.question, item.correctAnswer);
          if (concept && existingConceptKeys.has(concept)) return false;
          if (answerCollidesWith(item.correctAnswer, existingAnswerSigsInGraduation)) return false;
          return true;
        });
        if (fallbackCandidates.length > uniqueCandidates.length) {
          uniqueCandidates = fallbackCandidates;
        }
      }

      // Se ainda for menor que count, usa apenas candidatos rigorosamente sem pergunta nem conceito duplicado
      if (uniqueCandidates.length === 0) {
        uniqueCandidates = candidates.filter(item => {
          if (existingQuestionKeys.has(normalizeKey(item.question))) return false;
          const concept = getQuestionConceptKey(item.question, item.correctAnswer);
          if (concept && existingConceptKeys.has(concept)) return false;
          return true;
        });
      }

      // 8. Embaralhar e selecionar com garantia de respostas e conceitos 100% únicos no lote gerado
      const shuffledPool = shuffle(uniqueCandidates);
      const selected = [];
      const batchSigs = new Set(existingAnswerSigsInGraduation);
      const batchConcepts = new Set(existingConceptKeys);
      const batchQuestions = new Set(existingQuestionKeys);

      for (const item of shuffledPool) {
        if (selected.length >= count) break;
        const itemKey = normalizeKey(item.question);
        const itemConcept = getQuestionConceptKey(item.question, item.correctAnswer);

        if (batchQuestions.has(itemKey)) continue;
        if (itemConcept && batchConcepts.has(itemConcept)) continue;
        if (answerCollidesWith(item.correctAnswer, batchSigs)) continue;

        selected.push(item);
        batchQuestions.add(itemKey);
        if (itemConcept) batchConcepts.add(itemConcept);
        const itemSigs = getAnswerSignatures(item.correctAnswer);
        itemSigs.forEach(sig => batchSigs.add(sig));
      }

      // Se faltar algum item para fechar a quantidade e o filtro de categoria era específico,
      // busca outras perguntas inéditas de outras categorias da mesma graduação sem repetir
      if (selected.length < count) {
        const remainingPool = shuffle(combinedPool.filter(item => {
          if (item.exactKyu !== undefined && item.exactKyu !== targetKyu) return false;
          if ((item.category === 'katas' || item.category === 'kumite') && item.exactKyu !== targetKyu) return false;
          const kyuOk = (targetKyu >= 0) ? ((item.minKyu !== undefined ? item.minKyu >= targetKyu : true)) : true;
          if (!kyuOk) return false;
          const itemKey = normalizeKey(item.question);
          if (batchQuestions.has(itemKey)) return false;
          const itemConcept = getQuestionConceptKey(item.question, item.correctAnswer);
          if (itemConcept && batchConcepts.has(itemConcept)) return false;
          if (answerCollidesWith(item.correctAnswer, batchSigs)) return false;
          return true;
        }));

        for (const item of remainingPool) {
          if (selected.length >= count) break;
          selected.push(item);
          batchQuestions.add(normalizeKey(item.question));
          const itemConcept = getQuestionConceptKey(item.question, item.correctAnswer);
          if (itemConcept) batchConcepts.add(itemConcept);
          const itemSigs = getAnswerSignatures(item.correctAnswer);
          itemSigs.forEach(sig => batchSigs.add(sig));
        }
      }

      // 9. Montar as 4 alternativas curtas e calcular correctIndex
      const now = Date.now();
      return selected.map((item, idx) => {
        // Distratores garantidos curtos (máximo 3)
        const distractors = shuffle((item.distractors || []).slice(0, 3));
        while (distractors.length < 3) {
          distractors.push(`Opção ${distractors.length + 1}`);
        }

        // Embaralhar as 4 alternativas
        const allOpts = shuffle([item.correctAnswer, ...distractors]);
        const correctIndex = allOpts.findIndex(opt => normalizeKey(opt) === normalizeKey(item.correctAnswer));

        const id = `q_short_${targetKyu}_${now}_${idx + 1}_${Math.random().toString(36).substring(2, 5)}`;

        return {
          id: id,
          kyuNumber: targetKyu,
          kyu: targetKyu,
          beltName: profile.beltTitle,
          topic: item.topic || "Plano de Estudos TKST",
          category: item.category || "estudo",
          question: item.question,
          options: allOpts,
          correctIndex: correctIndex >= 0 ? correctIndex : 0,
          correctAnswer: item.correctAnswer,
          wrongAnswers: distractors,
          source: item.source || "Plano de Estudos TKST & Estudo Shotokan"
        };
      });
    }
  };

  // Exportar globalmente
  window.TKST_SHOTOKAN_ENGINE = SHOTOKAN_ENGINE;

})();
