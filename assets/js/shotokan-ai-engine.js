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
      // DEFESAS (UKE WAZA) - RESPOSTAS CURTAS
      // ---------------------------------------------------------------------
      {
        topic: "Defesas (Uke Waza)",
        category: "defesas",
        minKyu: 6,
        question: "Qual defesa bloqueia ataques na altura da cabeça e rosto (Jodan)?",
        correctAnswer: "Age Uke",
        distractors: ["Gedan Barai", "Soto Uke", "Uchi Uke"]
      },
      {
        topic: "Defesas (Uke Waza)",
        category: "defesas",
        minKyu: 6,
        question: "Qual defesa faz a varredura baixa contra golpes na cintura ou pernas?",
        correctAnswer: "Gedan Barai",
        distractors: ["Age Uke", "Shuto Uke", "Soto Uke"]
      },
      {
        topic: "Defesas (Uke Waza)",
        category: "defesas",
        minKyu: 5,
        question: "Qual defesa é feita de fora para dentro na altura do tronco (Chudan)?",
        correctAnswer: "Soto Uke",
        distractors: ["Uchi Uke", "Age Uke", "Gedan Barai"]
      },
      {
        topic: "Defesas (Uke Waza)",
        category: "defesas",
        minKyu: 5,
        question: "Qual defesa é feita de dentro para fora na altura do tronco (Chudan)?",
        correctAnswer: "Uchi Uke",
        distractors: ["Soto Uke", "Age Uke", "Gedan Barai"]
      },
      {
        topic: "Defesas (Uke Waza)",
        category: "defesas",
        minKyu: 5,
        question: "Qual defesa clássica é executada com a mão aberta em faca da mão?",
        correctAnswer: "Shuto Uke",
        distractors: ["Age Uke", "Gedan Barai", "Oi Tsuki"]
      },
      {
        topic: "Defesas (Uke Waza)",
        category: "defesas",
        minKyu: 3,
        question: "Qual defesa reforçada utiliza as duas mãos no mesmo lado?",
        correctAnswer: "Morote Uke",
        distractors: ["Age Uke", "Gedan Barai", "Soto Uke"]
      },
      {
        topic: "Defesas (Uke Waza)",
        category: "defesas",
        minKyu: 3,
        question: "Qual defesa é feita cruzando os dois antebraços em X?",
        correctAnswer: "Juji Uke",
        distractors: ["Morote Uke", "Age Uke", "Manji Uke"]
      },
      {
        topic: "Defesas (Uke Waza)",
        category: "defesas",
        minKyu: 2,
        question: "Qual defesa bloqueia em cima atrás e embaixo na frente simultaneamente?",
        correctAnswer: "Manji Uke",
        distractors: ["Juji Uke", "Morote Uke", "Shuto Uke"]
      },
      {
        topic: "Defesas (Uke Waza)",
        category: "defesas",
        minKyu: 4,
        question: "Qual defesa abre os dois braços lateralmente em forma de cunha?",
        correctAnswer: "Kakiwake Uke",
        distractors: ["Juji Uke", "Gedan Barai", "Age Uke"]
      },
      {
        topic: "Defesas (Uke Waza)",
        category: "defesas",
        minKyu: 4,
        question: "Qual defesa utiliza a base da palma da mão aberta?",
        correctAnswer: "Teisho Uke",
        distractors: ["Shuto Uke", "Age Uke", "Gedan Barai"]
      },

      // ---------------------------------------------------------------------
      // SOCOS E GOLPES DE MÃO (TSUKI & UCHI WAZA) - RESPOSTAS CURTAS
      // ---------------------------------------------------------------------
      {
        topic: "Socos (Tsuki Waza)",
        category: "socos",
        minKyu: 6,
        question: "Qual soco é desferido avançando com a perna e o braço do mesmo lado?",
        correctAnswer: "Oi Tsuki",
        distractors: ["Gyaku Tsuki", "Kizami Tsuki", "Uraken Uchi"]
      },
      {
        topic: "Socos (Tsuki Waza)",
        category: "socos",
        minKyu: 5,
        question: "Qual soco é desferido com o braço contrário à perna da frente?",
        correctAnswer: "Gyaku Tsuki",
        distractors: ["Oi Tsuki", "Kizami Tsuki", "Empi Uchi"]
      },
      {
        topic: "Socos (Tsuki Waza)",
        category: "socos",
        minKyu: 4,
        question: "Qual soco rápido de encontro é desferido com a mão da frente?",
        correctAnswer: "Kizami Tsuki",
        distractors: ["Oi Tsuki", "Gyaku Tsuki", "Uraken Uchi"]
      },
      {
        topic: "Golpes de Punho (Uchi)",
        category: "socos",
        minKyu: 5,
        question: "Qual golpe chicoteado é desferido com as costas do punho?",
        correctAnswer: "Uraken Uchi",
        distractors: ["Oi Tsuki", "Gyaku Tsuki", "Empi Uchi"]
      },
      {
        topic: "Golpes de Cotovelo",
        category: "socos",
        minKyu: 4,
        question: "Como se chama o golpe de cotovelada no Karatê?",
        correctAnswer: "Empi Uchi (Hiji Uchi)",
        distractors: ["Uraken Uchi", "Oi Tsuki", "Mae Geri"]
      },
      {
        topic: "Golpes de Mão Aberta",
        category: "socos",
        minKyu: 5,
        question: "Qual golpe cortante é desferido com a faca da mão aberta?",
        correctAnswer: "Shuto Uchi",
        distractors: ["Oi Tsuki", "Nukite", "Teisho"]
      },
      {
        topic: "Golpes Especiais",
        category: "socos",
        minKyu: 4,
        question: "Qual golpe perfura com as pontas dos dedos em forma de lança?",
        correctAnswer: "Nukite",
        distractors: ["Shuto Uchi", "Uraken", "Teisho"]
      },
      {
        topic: "Golpes Especiais",
        category: "socos",
        minKyu: 4,
        question: "Qual golpe atinge com a base carnuda do punho cerrado (martelo)?",
        correctAnswer: "Tettsui Uchi (Kentsui)",
        distractors: ["Oi Tsuki", "Uraken", "Shuto Uchi"]
      },
      {
        topic: "Golpes Especiais",
        category: "socos",
        minKyu: 3,
        question: "Qual golpe atinge com o calcanhar da palma da mão aberta?",
        correctAnswer: "Teisho Uchi",
        distractors: ["Nukite", "Seiken", "Empi Uchi"]
      },

      // ---------------------------------------------------------------------
      // CHUTES (GERI WAZA) - RESPOSTAS CURTAS
      // ---------------------------------------------------------------------
      {
        topic: "Chutes (Geri Waza)",
        category: "chutes",
        minKyu: 6,
        question: "Como se chama o chute frontal no Karatê Shotokan?",
        correctAnswer: "Mae Geri",
        distractors: ["Mawashi Geri", "Yoko Geri", "Ushiro Geri"]
      },
      {
        topic: "Chutes (Geri Waza)",
        category: "chutes",
        minKyu: 5,
        question: "Como se chama o chute circular no Karatê Shotokan?",
        correctAnswer: "Mawashi Geri",
        distractors: ["Mae Geri", "Yoko Geri", "Ushiro Geri"]
      },
      {
        topic: "Chutes (Geri Waza)",
        category: "chutes",
        minKyu: 5,
        question: "Como se chama o chute lateral no Karatê Shotokan?",
        correctAnswer: "Yoko Geri",
        distractors: ["Mae Geri", "Mawashi Geri", "Ushiro Geri"]
      },
      {
        topic: "Chutes (Geri Waza)",
        category: "chutes",
        minKyu: 4,
        question: "Como se chama o chute desferido reto para trás com o calcanhar?",
        correctAnswer: "Ushiro Geri",
        distractors: ["Mae Geri", "Mawashi Geri", "Yoko Geri"]
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
      // KATAS DO SHOTOKAN - RESPOSTAS CURTAS
      // ---------------------------------------------------------------------
      {
        topic: "Kata Heian Shodan",
        category: "katas",
        minKyu: 6,
        question: "Quantos movimentos tem o Kata Heian Shodan?",
        correctAnswer: "21 movimentos",
        distractors: ["26 movimentos", "20 movimentos", "27 movimentos"]
      },
      {
        topic: "Kata Heian Shodan",
        category: "katas",
        minKyu: 6,
        question: "Em quais movimentos ocorrem os Kiais no Heian Shodan?",
        correctAnswer: "Passos 8 e 16",
        distractors: ["Passos 10 e 20", "Passos 8 e 26", "Passos 12 e 19"]
      },
      {
        topic: "Kata Heian Nidan",
        category: "katas",
        minKyu: 5,
        question: "Quantos movimentos tem o Kata Heian Nidan?",
        correctAnswer: "26 movimentos",
        distractors: ["21 movimentos", "20 movimentos", "27 movimentos"]
      },
      {
        topic: "Kata Heian Nidan",
        category: "katas",
        minKyu: 5,
        question: "Em quais movimentos ocorrem os Kiais no Heian Nidan?",
        correctAnswer: "Passos 8 e 26",
        distractors: ["Passos 8 e 16", "Passos 10 e 20", "Passos 13 e 25"]
      },
      {
        topic: "Kata Heian Sandan",
        category: "katas",
        minKyu: 4,
        question: "Quantos movimentos tem o Kata Heian Sandan?",
        correctAnswer: "20 movimentos",
        distractors: ["21 movimentos", "26 movimentos", "27 movimentos"]
      },
      {
        topic: "Kata Heian Sandan",
        category: "katas",
        minKyu: 4,
        question: "Em quais movimentos ocorrem os Kiais no Heian Sandan?",
        correctAnswer: "Passos 10 e 20",
        distractors: ["Passos 8 e 16", "Passos 8 e 26", "Passos 12 e 19"]
      },
      {
        topic: "Kata Heian Yondan",
        category: "katas",
        minKyu: 3,
        question: "Quantos movimentos tem o Kata Heian Yondan?",
        correctAnswer: "27 movimentos",
        distractors: ["26 movimentos", "21 movimentos", "23 movimentos"]
      },
      {
        topic: "Kata Heian Yondan",
        category: "katas",
        minKyu: 3,
        question: "Em quais movimentos ocorrem os Kiais no Heian Yondan?",
        correctAnswer: "Passos 13 e 25",
        distractors: ["Passos 8 e 16", "Passos 10 e 20", "Passos 12 e 19"]
      },
      {
        topic: "Kata Heian Godan",
        category: "katas",
        minKyu: 2,
        question: "Quantos movimentos tem o Kata Heian Godan?",
        correctAnswer: "23 movimentos",
        distractors: ["21 movimentos", "27 movimentos", "29 movimentos"]
      },
      {
        topic: "Kata Heian Godan",
        category: "katas",
        minKyu: 2,
        question: "Em quais movimentos ocorrem os Kiais no Heian Godan?",
        correctAnswer: "Passos 12 e 19",
        distractors: ["Passos 8 e 16", "Passos 10 e 20", "Passos 13 e 25"]
      },
      {
        topic: "Kata Tekki Shodan",
        category: "katas",
        minKyu: 1,
        question: "Quantos movimentos tem o Kata Tekki Shodan?",
        correctAnswer: "29 movimentos",
        distractors: ["21 movimentos", "26 movimentos", "42 movimentos"]
      },
      {
        topic: "Kata Tekki Shodan",
        category: "katas",
        minKyu: 1,
        question: "Qual base é mantida do início ao fim no Kata Tekki Shodan?",
        correctAnswer: "Kiba Dachi",
        distractors: ["Zenkutsu Dachi", "Kokutsu Dachi", "Neko Ashi Dachi"]
      },
      {
        topic: "Kata Bassai Dai",
        category: "katas",
        minKyu: 0,
        question: "Quantos movimentos tem o Kata Bassai Dai?",
        correctAnswer: "42 movimentos",
        distractors: ["65 movimentos", "29 movimentos", "37 movimentos"]
      },
      {
        topic: "Kata Bassai Dai",
        category: "katas",
        minKyu: 0,
        question: "Qual é a tradução do nome do Kata Bassai Dai?",
        correctAnswer: "Romper a Fortaleza",
        distractors: ["Mente em Paz", "Olhar o Céu", "Cavaleiro de Ferro"]
      },
      {
        topic: "Kata Kanku Dai",
        category: "katas",
        minKyu: 0,
        question: "Qual é o significado do nome do Kata Kanku Dai?",
        correctAnswer: "Olhar para o Céu",
        distractors: ["Romper a Fortaleza", "Mente em Paz", "Voo da Andorinha"]
      },
      {
        topic: "Kata Kanku Dai",
        category: "katas",
        minKyu: 0,
        question: "Quantos movimentos tem o Kata Kanku Dai?",
        correctAnswer: "65 movimentos",
        distractors: ["42 movimentos", "47 movimentos", "37 movimentos"]
      },
      {
        topic: "Kata Heian",
        category: "katas",
        minKyu: 6,
        question: "Qual é o significado da palavra 'Heian' dos primeiros 5 katas?",
        correctAnswer: "Mente em Paz",
        distractors: ["Cavaleiro de Ferro", "Olhar o Céu", "Romper a Fortaleza"]
      },
      {
        topic: "Kata Empi",
        category: "katas",
        minKyu: 0,
        question: "Qual é a tradução do nome do Kata Empi?",
        correctAnswer: "Voo da Andorinha",
        distractors: ["Olhar o Céu", "Mãos nas Nuvens", "Meia Lua"]
      },

      // ---------------------------------------------------------------------
      // KUMITE E REGRAS DE COMBATE (WKF / JKA) - RESPOSTAS CURTAS
      // ---------------------------------------------------------------------
      {
        topic: "Kumite Básico",
        category: "kumite",
        minKyu: 6,
        question: "Quantos passos tem o combate combinado Gohon Kumite?",
        correctAnswer: "5 passos",
        distractors: ["3 passos", "1 passo", "Luta livre"]
      },
      {
        topic: "Kumite Básico",
        category: "kumite",
        minKyu: 5,
        question: "Quantos passos tem o combate combinado Sanbon Kumite?",
        correctAnswer: "3 passos",
        distractors: ["5 passos", "1 passo", "Luta livre"]
      },
      {
        topic: "Kumite Básico",
        category: "kumite",
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
  // 3. MOTOR PÚBLICO DE FORMULAÇÃO DE QUESTÕES COM RESPOSTAS CURTAS
  // =========================================================================

  const SHOTOKAN_ENGINE = {
    getGraduationProfiles: () => GRADUATION_PROFILES,

    /**
     * Formula questões com respostas curtas e objetivas para o simulado.
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

      // 1. Obter banco de perguntas curtas
      const allShortQuestions = getShortQuestionsDatabase();

      // 2. Coletar IDs / textos já existentes para não duplicar
      const existingKeySet = new Set();
      if (avoidExisting) {
        try {
          const bank = (window.TKST_AUTH && typeof window.TKST_AUTH.getCustomQuizBank === 'function')
            ? window.TKST_AUTH.getCustomQuizBank()
            : (window.TKST_QUIZ_BANK || window.TKST_DEFAULT_QUIZ_BANK || []);
          if (Array.isArray(bank)) {
            bank.forEach(q => {
              if (q && q.question) existingKeySet.add(normalizeKey(q.question));
            });
          }
        } catch (e) {}
      }

      // 3. Filtrar pelo nível de Kyu compatível (a questão deve ser acessível para o nível)
      // Se for Kyu 6, usa minKyu === 6; para faixas mais avançadas, aceita questões da própria faixa e revisões das anteriores
      let candidates = allShortQuestions.filter(q => {
        if (targetKyu >= 0) {
          // Kyus 6 a 0: aceita questões com minKyu maior ou igual ao Kyu alvo (lembrando que 6 é branca e 1 é marrom)
          return q.minKyu >= targetKyu;
        } else {
          // Dans (-1 e -2): aceita todas as questões do acervo
          return true;
        }
      });

      // 4. Filtrar por categoria temática se solicitado
      if (categoryFilter && categoryFilter !== 'todos') {
        const byCat = candidates.filter(q => q.category === categoryFilter);
        if (byCat.length > 0) {
          candidates = byCat;
        }
      }

      // 5. Filtrar não-duplicadas
      let uniqueCandidates = candidates.filter(q => !existingKeySet.has(normalizeKey(q.question)));
      if (uniqueCandidates.length < count) {
        uniqueCandidates = candidates;
      }

      // 6. Embaralhar e selecionar
      const selected = shuffle(uniqueCandidates).slice(0, count);

      // 7. Montar as 4 alternativas curtas e calcular correctIndex
      const now = Date.now();
      return selected.map((item, idx) => {
        // Distratores garantidos curtos (máximo 3)
        const distractors = shuffle(item.distractors.slice(0, 3));
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
          topic: item.topic,
          category: item.category,
          question: item.question,
          options: allOpts,
          correctIndex: correctIndex >= 0 ? correctIndex : 0,
          correctAnswer: item.correctAnswer,
          wrongAnswers: distractors,
          source: "Simulado Shotokan - Respostas Curtas e Objetivas"
        };
      });
    }
  };

  // Exportar globalmente
  window.TKST_SHOTOKAN_ENGINE = SHOTOKAN_ENGINE;

})();
