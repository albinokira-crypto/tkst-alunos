/**
 * TKST Alunos - Gerador Oficial de Provas Escritas e Gabaritos em PDF/Impressão (2026)
 * Suporte completo: 6º Kyu (Amarela) até 3º Dan (Sandan)
 * Diagramação Ultra-Compacta em 2 Colunas (Encaixe Perfeito em 1 Única Página A4)
 */

window.TKST_OFFICIAL_EXAMS = {
  6: {
    kyu: 6,
    targetBelt: "Faixa Amarela (6º Kyu)",
    fromBelt: "Faixa Branca",
    toBelt: "Faixa Amarela",
    title: "Prova de Branca para Amarela",
    color: "#F5BE00",
    headerColor: "#D97706",
    kataName: "Heian Shodan",
    leftQuestions: [
      {
        num: 1,
        title: "Qual o Kata que você deve aprender na sua Faixa?",
        type: "lines",
        linesCount: 1,
        expectedAnswer: "Heian Shodan (Paz e Tranquilidade Nível 1)."
      },
      {
        num: 2,
        title: "Qual o nome em japonês das 3 alturas?",
        type: "lines",
        linesCount: 1,
        expectedAnswer: "Jodan (Alto), Chudan (Médio) e Gedan (Baixo)."
      },
      {
        num: 3,
        title: "Descreva o Golpe e a Base da imagem abaixo:",
        type: "image_fields",
        image: "assets/images/exames/branca_img1.png",
        fallbackImage: "assets/images/tecnicas/oi-tsuki.svg",
        fields: [
          { label: "Ataque:", expected: "Oi Tsuki Chudan (Soco direto)" },
          { label: "Base:", expected: "Zenkutsu Dachi (Base frontal)" }
        ]
      },
      {
        num: 4,
        title: "Qual o nome do Chute da imagem abaixo?",
        type: "image_lines",
        image: "assets/images/exames/branca_img2.png",
        fallbackImage: "assets/images/tecnicas/mae-geri.svg",
        linesCount: 1,
        expectedAnswer: "Mae Geri Chudan / Mae Geri Kekomi (Chute frontal)."
      },
      {
        num: 5,
        title: "Qual o nome da Defesa da imagem abaixo?",
        type: "image_lines",
        image: "assets/images/exames/branca_img3.png",
        fallbackImage: "assets/images/tecnicas/jodan-age-uke.svg",
        linesCount: 1,
        expectedAnswer: "Jodan Age Uke (Defesa alta) ou Gedan Barai."
      }
    ],
    rightQuestions: [
      {
        num: 6,
        title: "Cite 1 Dojô Kun:",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "Hitotsu! Jinkaku kansei ni tsutomuru koto! (Esforçar-se para a formação do caráter)."
      },
      {
        num: 7,
        title: "Qual o nome do 8º movimento do Heian Shodan?",
        type: "lines",
        linesCount: 1,
        expectedAnswer: "Jodan Age Uke com KIAI! (3º avanço de defesa alta)."
      },
      {
        num: 8,
        title: "Conte de 1 a 10 em Japonês:",
        type: "count_grid_2col",
        col1: [
          { num: "1", expected: "Ichi" },
          { num: "2", expected: "Ni" },
          { num: "3", expected: "San" },
          { num: "4", expected: "Shi / Yon" },
          { num: "5", expected: "Go" }
        ],
        col2: [
          { num: "6", expected: "Roku" },
          { num: "7", expected: "Shichi / Nana" },
          { num: "8", expected: "Hachi" },
          { num: "9", expected: "Ku / Kyu" },
          { num: "10", expected: "Ju" }
        ]
      },
      {
        num: 9,
        title: "O que você mais gosta no Karatê?",
        type: "essay",
        linesCount: 3,
        expectedAnswer: "Resposta reflexiva do aluno avaliando dedicação, respeito e motivação com a arte marcial."
      }
    ]
  },

  5: {
    kyu: 5,
    targetBelt: "Faixa Vermelha (5º Kyu)",
    fromBelt: "Faixa Amarela",
    toBelt: "Faixa Vermelha",
    title: "Prova de Amarela para Vermelha",
    color: "#E63946",
    headerColor: "#DC2626",
    kataName: "Heian Nidan",
    leftQuestions: [
      {
        num: 1,
        title: "Qual o Kata que você deve aprender na sua Faixa?",
        type: "lines",
        linesCount: 1,
        expectedAnswer: "Heian Nidan (Paz e Tranquilidade Nível 2)."
      },
      {
        num: 2,
        title: "Qual o nome em japonês do lado esquerdo e direito?",
        type: "lines",
        linesCount: 1,
        expectedAnswer: "Hidari (Esquerdo) e Migi (Direito)."
      },
      {
        num: 3,
        title: "Descreva a Técnica e a Base da imagem abaixo:",
        type: "image_fields",
        image: "assets/images/exames/amarela_img1.png",
        fallbackImage: "assets/images/tecnicas/kokutsu-dachi.svg",
        fields: [
          { label: "Defesa:", expected: "Shuto Uke Chudan (Faca da mão)" },
          { label: "Base:", expected: "Kokutsu Dachi (70% peso atrás)" }
        ]
      },
      {
        num: 4,
        title: "Qual o nome do Chute da imagem abaixo?",
        type: "image_lines",
        image: "assets/images/exames/amarela_img2.png",
        fallbackImage: "assets/images/tecnicas/mawashi-geri.svg",
        linesCount: 1,
        expectedAnswer: "Mawashi Geri Chudan/Jodan (Chute circular)."
      },
      {
        num: 5,
        title: "Qual o nome da Defesa da imagem abaixo?",
        type: "image_lines",
        image: "assets/images/exames/amarela_img3.png",
        fallbackImage: "assets/images/tecnicas/zenkutsu-dachi.svg",
        linesCount: 1,
        expectedAnswer: "Soto Uke Chudan (De fora para dentro) ou Uchi Uke."
      }
    ],
    rightQuestions: [
      {
        num: 6,
        title: "Cite 2 Dojô Kun:",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "1) Formação do caráter\n2) Fidelidade para com o verdadeiro caminho da razão."
      },
      {
        num: 7,
        title: "Qual o nome do 4º movimento do Heian Nidan?",
        type: "lines",
        linesCount: 1,
        expectedAnswer: "Uraken Uchi (Costas do punho) / Tetsui Uchi com giro."
      },
      {
        num: 8,
        title: "Conte de 11 a 20 em Japonês:",
        type: "count_grid_2col",
        col1: [
          { num: "11", expected: "Ju-Ichi" },
          { num: "12", expected: "Ju-Ni" },
          { num: "13", expected: "Ju-San" },
          { num: "14", expected: "Ju-Shi / Ju-Yon" },
          { num: "15", expected: "Ju-Go" }
        ],
        col2: [
          { num: "16", expected: "Ju-Roku" },
          { num: "17", expected: "Ju-Shichi / Ju-Nana" },
          { num: "18", expected: "Ju-Hachi" },
          { num: "19", expected: "Ju-Ku / Ju-Kyu" },
          { num: "20", expected: "Ni-Ju" }
        ]
      },
      {
        num: 9,
        title: "Por que você começou a fazer Karatê?",
        type: "essay",
        linesCount: 3,
        expectedAnswer: "Resposta reflexiva do aluno avaliando seus objetivos e disciplina."
      }
    ]
  },

  4: {
    kyu: 4,
    targetBelt: "Faixa Laranja (4º Kyu)",
    fromBelt: "Faixa Vermelha",
    toBelt: "Faixa Laranja",
    title: "Prova de Vermelha para Laranja",
    color: "#FF7700",
    headerColor: "#EA580C",
    kataName: "Heian Sandan",
    leftQuestions: [
      {
        num: 1,
        title: "Qual o Kata que você deve aprender na sua Faixa?",
        type: "lines",
        linesCount: 1,
        expectedAnswer: "Heian Sandan (Paz e Tranquilidade Nível 3)."
      },
      {
        num: 2,
        title: "Cite 2 Defesas em Japonês:",
        type: "lines",
        linesCount: 1,
        expectedAnswer: "Age Uke, Gedan Barai, Soto Uke, Uchi Uke ou Shuto Uke."
      },
      {
        num: 3,
        title: "Descreva o Golpe e a Base da imagem abaixo:",
        type: "image_fields",
        image: "assets/images/exames/vermelha_img1.png",
        fallbackImage: "assets/images/tecnicas/kiba-dachi.svg",
        fields: [
          { label: "Defesa / Golpe:", expected: "Morote Uke Chudan / Empi Uchi" },
          { label: "Base:", expected: "Kiba Dachi (Base do cavaleiro 50/50)" }
        ]
      },
      {
        num: 4,
        title: "Qual o nome do Chute da imagem abaixo?",
        type: "image_lines",
        image: "assets/images/exames/vermelha_img2.png",
        fallbackImage: "assets/images/tecnicas/yoko-geri.svg",
        linesCount: 1,
        expectedAnswer: "Yoko Geri Kekomi / Yoko Geri Keage (Chute lateral)."
      },
      {
        num: 5,
        title: "Qual o nome do Ataque da imagem abaixo?",
        type: "image_lines",
        image: "assets/images/exames/vermelha_img3.png",
        fallbackImage: "assets/images/tecnicas/gyaku-tsuki.png",
        linesCount: 1,
        expectedAnswer: "Gyaku Tsuki Chudan (Soco contrário à perna da frente)."
      }
    ],
    rightQuestions: [
      {
        num: 6,
        title: "Cite 3 Dojô Kun:",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "1) Formação do caráter\n2) Fidelidade ao caminho da razão\n3) Espírito de esforço e perseverança."
      },
      {
        num: 7,
        title: "Qual o nome do 6º movimento do Heian Sandan?",
        type: "lines",
        linesCount: 1,
        expectedAnswer: "Chudan Morote Uke em base Kiba Dachi."
      },
      {
        num: 8,
        title: "Conte de 21 a 30 em Japonês:",
        type: "count_grid_2col",
        col1: [
          { num: "21", expected: "Ni-Ju-Ichi" },
          { num: "22", expected: "Ni-Ju-Ni" },
          { num: "23", expected: "Ni-Ju-San" },
          { num: "24", expected: "Ni-Ju-Shi" },
          { num: "25", expected: "Ni-Ju-Go" }
        ],
        col2: [
          { num: "26", expected: "Ni-Ju-Roku" },
          { num: "27", expected: "Ni-Ju-Shichi" },
          { num: "28", expected: "Ni-Ju-Hachi" },
          { num: "29", expected: "Ni-Ju-Ku" },
          { num: "30", expected: "San-Ju" }
        ]
      },
      {
        num: 9,
        title: "Qual a importância do Karatê para você?",
        type: "essay",
        linesCount: 3,
        expectedAnswer: "Resposta reflexiva do aluno avaliando autocontrole e autoconfiança."
      }
    ]
  },

  3: {
    kyu: 3,
    targetBelt: "Faixa Verde (3º Kyu)",
    fromBelt: "Faixa Laranja",
    toBelt: "Faixa Verde",
    title: "Prova de Laranja para Verde",
    color: "#10B981",
    headerColor: "#059669",
    kataName: "Heian Yondan",
    leftQuestions: [
      {
        num: 1,
        title: "Qual o Kata oficial exigido na sua Faixa?",
        type: "lines",
        linesCount: 1,
        expectedAnswer: "Heian Yondan (Paz e Tranquilidade Nível 4)."
      },
      {
        num: 2,
        title: "Cite 3 Bases fundamentais e sua distribuição de peso:",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "Zenkutsu (70% frente), Kokutsu (70% trás) e Kiba Dachi (50/50)."
      },
      {
        num: 3,
        title: "Descreva os 2 primeiros movimentos do Heian Yondan:",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "Haiwan Morote Jodan Uke / Morote Kakiwake Uke em Kokutsu Dachi."
      },
      {
        num: 4,
        title: "Diferença entre Yoko Geri Kekomi e Keage:",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "Kekomi: penetrante com calcanhar/Sokuto; Keage: ascendente rápido chicoteado."
      },
      {
        num: 5,
        title: "O que é Kihon Ippon Kumite?",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "Combate pré-determinado de 1 passo em Kamae visando tempo, distância e foco."
      }
    ],
    rightQuestions: [
      {
        num: 6,
        title: "Cite 4 Dojô Kun:",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "1) Caráter; 2) Fidelidade; 3) Esforço/Perseverança; 4) Respeito acima de tudo."
      },
      {
        num: 7,
        title: "Descreva o golpe de joelhada no Heian Yondan:",
        type: "lines",
        linesCount: 1,
        expectedAnswer: "Morote Tsukami puxando o oponente contra o Hiza Geri com Kiai."
      },
      {
        num: 8,
        title: "Traduza: Mae, Sagate, Mawate e Yame:",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "Mae = Avançar; Sagate = Recuar; Mawate = Girar; Yame = Parar."
      },
      {
        num: 9,
        title: "Como a disciplina do Karatê ajuda nos seus estudos/trabalho?",
        type: "essay",
        linesCount: 3,
        expectedAnswer: "Dissertação reflexiva sobre foco, postura e determinação."
      }
    ]
  },

  2: {
    kyu: 2,
    targetBelt: "Faixa Roxa (2º Kyu)",
    fromBelt: "Faixa Verde",
    toBelt: "Faixa Roxa",
    title: "Prova de Verde para Roxa",
    color: "#8B5CF6",
    headerColor: "#7C3AED",
    kataName: "Heian Godan",
    leftQuestions: [
      {
        num: 1,
        title: "Qual o Kata oficial exigido na sua Faixa?",
        type: "lines",
        linesCount: 1,
        expectedAnswer: "Heian Godan (Paz e Tranquilidade Nível 5)."
      },
      {
        num: 2,
        title: "O que significam Kiai, Kime e Zanshin?",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "Kiai: união da energia; Kime: foco/contração máxima; Zanshin: alerta contínuo."
      },
      {
        num: 3,
        title: "Descreva a execução do salto (Tobi) do Heian Godan:",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "Salto giratório caindo em Kosa Dachi com Gedan Juji Uke e Kiai."
      },
      {
        num: 4,
        title: "Descreva os chutes Ushiro Geri e Mikazuki Geri:",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "Ushiro: chute reto para trás; Mikazuki: chute semicircular com sola do pé."
      },
      {
        num: 5,
        title: "O que significa o termo Bunkai (分解)?",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "Desmontagem, estudo e aplicação prática de combate de cada movimento do Kata."
      }
    ],
    rightQuestions: [
      {
        num: 6,
        title: "Escreva os 5 princípios do Dojô Kun:",
        type: "lines",
        linesCount: 3,
        expectedAnswer: "1) Caráter; 2) Fidelidade; 3) Esforço; 4) Respeito; 5) Conter o espírito de agressão."
      },
      {
        num: 7,
        title: "O que é Jiyu Ippon Kumite?",
        type: "lines",
        linesCount: 1,
        expectedAnswer: "Combate semi-livre de 1 ataque anunciado com movimentação solta em Kamae."
      },
      {
        num: 8,
        title: "Traduza: Mokuso, Sensei ni Rei e Otagai ni Rei:",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "Mokuso = Meditação; Sensei ni Rei = Saudação ao Professor; Otagai = Saudação mútua."
      },
      {
        num: 9,
        title: "Como você aplica 'Conter o espírito de agressão' no dia a dia?",
        type: "essay",
        linesCount: 3,
        expectedAnswer: "Reflexão sobre inteligência emocional, paciência e prevenção de conflitos."
      }
    ]
  },

  1: {
    kyu: 1,
    targetBelt: "Faixa Marrom (1º Kyu)",
    fromBelt: "Faixa Roxa",
    toBelt: "Faixa Marrom",
    title: "Prova de Roxa para Marrom",
    color: "#78350F",
    headerColor: "#78350F",
    kataName: "Tekki Shodan & Bassai Dai",
    leftQuestions: [
      {
        num: 1,
        title: "Quais os Katas oficiais exigidos no 1º Kyu?",
        type: "lines",
        linesCount: 1,
        expectedAnswer: "Tekki Shodan e Bassai Dai."
      },
      {
        num: 2,
        title: "Descreva a particularidade do Embusen do Tekki Shodan:",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "Embusen linear horizontal em base Kiba Dachi simulando luta em espaço estreito."
      },
      {
        num: 3,
        title: "Explique Sen no Sen, Go no Sen e Sen Sen no Sen:",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "Go: contra-ataque pós-bloqueio; Sen: no encontro do ataque; Sen Sen: antecipação na intenção."
      },
      {
        num: 4,
        title: "Quem foi Mestre Funakoshi e sua contribuição?",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "Pai do Karatê Moderno, introduziu o Shotokan no Japão e uniu o Budo com a educação."
      },
      {
        num: 5,
        title: "O que significa 'Karate ni sente nashi'?",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "'No Karatê não existe atitude ofensiva inicial' — arte essencialmente de legítima defesa."
      }
    ],
    rightQuestions: [
      {
        num: 6,
        title: "Quais os 4 Sentei Katas do Shotokan?",
        type: "lines",
        linesCount: 1,
        expectedAnswer: "Bassai Dai, Kanku Dai, Jion e Empi."
      },
      {
        num: 7,
        title: "Descreva a base Fudo Dachi (Sochin Dachi):",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "Base enraizada e inabalável unindo firmeza de Zenkutsu e Kiba Dachi (peso 50/50)."
      },
      {
        num: 8,
        title: "Escreva o Dojô Kun e o significado do termo 'Hitotsu':",
        type: "lines",
        linesCount: 3,
        expectedAnswer: "5 princípios + 'Hitotsu' = Item 1 (todos os preceitos têm a mesma prioridade máxima)."
      },
      {
        num: 9,
        title: "O que a Faixa Marrom representa na sua jornada ao Shodan?",
        type: "essay",
        linesCount: 3,
        expectedAnswer: "Dissertação sobre responsabilidade, liderança e maturidade técnica."
      }
    ]
  },

  0: {
    kyu: 0,
    targetBelt: "Shodan (1º Dan - Faixa Preta)",
    fromBelt: "Faixa Marrom (1º Kyu)",
    toBelt: "Faixa Preta (Shodan)",
    title: "Exame Oficial para Shodan (1º Dan)",
    color: "#18181B",
    headerColor: "#0F172A",
    kataName: "9 Katas Avaliados",
    leftQuestions: [
      {
        num: 1,
        title: "Quais os 9 Katas avaliados no exame de Shodan?",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "5 Heian (Shodan a Godan), Tekki Shodan, Bassai Dai, Kanku Dai e Jion com Bunkai."
      },
      {
        num: 2,
        title: "Explique o princípio 'Ikken Hissatsu' (一拳必殺):",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "'Determinar a vitória com um único golpe' — expressa máxima precisão, foco e kime absoluto."
      },
      {
        num: 3,
        title: "Importância do Koshi no Kaiten e do Tanden:",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "O Tanden gera potência transferida pela rotação do quadril e respiração até o impacto."
      },
      {
        num: 4,
        title: "Cite 2 preceitos do Shōtōkan Nijūkun:",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "1) O Karatê começa e termina com respeito; 2) O Karatê é como água fervente."
      },
      {
        num: 5,
        title: "Conduta mental exigida no Jiyu Kumite de Shodan:",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "Zanshin impecável, Sun-dome (controle de impacto), respeito e explosão técnica."
      }
    ],
    rightQuestions: [
      {
        num: 6,
        title: "Diferença entre Karatê-Jutsu e Karatê-Dō:",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "Jutsu foca na eficácia destrutiva marcial; Dō foca no desenvolvimento moral e humano."
      },
      {
        num: 7,
        title: "Pontos vitais (Kyusho) prioritários em legítima defesa:",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "Olhos, garganta, plexo solar, costelas flutuantes, virilha e têmpora."
      },
      {
        num: 8,
        title: "Dever ético de um novo Faixa Preta perante o Dojô:",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "Humildade, liderança exemplar, auxílio ao Sensei e apoio aos alunos iniciantes."
      },
      {
        num: 9,
        title: "Dissertação: Sua trajetória até a Faixa Preta e compromisso:",
        type: "essay",
        linesCount: 4,
        expectedAnswer: "Dissertação reflexiva sobre superação, lealdade à TKST e maturidade marcial."
      }
    ]
  },

  "-1": {
    kyu: -1,
    targetBelt: "Nidan (2º Dan - Faixa Preta)",
    fromBelt: "Shodan (1º Dan)",
    toBelt: "Nidan (2º Dan)",
    title: "Exame Oficial para Nidan (2º Dan)",
    color: "#1E293B",
    headerColor: "#0F172A",
    kataName: "Katas Superiores Nidan",
    leftQuestions: [
      {
        num: 1,
        title: "Katas avaliados na graduação de Nidan:",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "Empi, Jitte, Hangetsu, Gankaku e Kanku Sho com Bunkai."
      },
      {
        num: 2,
        title: "Princípios respiratórios Ibuki e Nogare:",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "Ibuki: respiração diafragmática forte de Kime; Nogare: respiração suave restauradora."
      },
      {
        num: 3,
        title: "Metodologia pedagógica para ensino de Kihon:",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "Correção postural segura, progressão pedagógica e reforço dos valores do Budo."
      }
    ],
    rightQuestions: [
      {
        num: 4,
        title: "Regras de arbitragem WKF/CBK (Ippon, Waza-ari, Penalidades):",
        type: "lines",
        linesCount: 3,
        expectedAnswer: "Critérios de pontuação técnica, controle de contato e penalidades C1/C2."
      },
      {
        num: 5,
        title: "Dissertação: A responsabilidade do 2º Dan na preservação do Shotokan:",
        type: "essay",
        linesCount: 4,
        expectedAnswer: "Monografia sobre liderança ética e aperfeiçoamento contínuo."
      }
    ]
  },

  "-2": {
    kyu: -2,
    targetBelt: "Sandan (3º Dan - Sensei / Mestre)",
    fromBelt: "Nidan (2º Dan)",
    toBelt: "Sandan (3º Dan)",
    title: "Exame Oficial para Sandan (3º Dan)",
    color: "#020617",
    headerColor: "#020617",
    kataName: "Katas Mestres Sandan",
    leftQuestions: [
      {
        num: 1,
        title: "Katas mestres avaliados no Sandan:",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "Sochin, Nijushiho, Meikyo, Unsu e Gojushiho Dai/Sho."
      },
      {
        num: 2,
        title: "A tríade marcial Shin - Gi - Tai no Sandan:",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "Shin: mente serena; Gi: técnica perfeita; Tai: corpo eficiente e saudável."
      }
    ],
    rightQuestions: [
      {
        num: 3,
        title: "Responsabilidade de um Sensei Titular na gestão do Dojô:",
        type: "lines",
        linesCount: 3,
        expectedAnswer: "Guardião dos valores do Budo, inclusão, segurança e desenvolvimento social."
      },
      {
        num: 4,
        title: "Dissertação: O papel do Karatê Shotokan na sociedade contemporânea:",
        type: "essay",
        linesCount: 5,
        expectedAnswer: "Dissertação sobre o Karatê como agente de transformação social e humana."
      }
    ]
  }
};

window.TKST_EXAM_GENERATOR = {
  getExamData: function(kyu) {
    return window.TKST_OFFICIAL_EXAMS[kyu] || window.TKST_OFFICIAL_EXAMS[6];
  },

  getQuizQuestionsForKyu: function(kyu) {
    const all = window.TKST_AUTH ? window.TKST_AUTH.getCustomQuizBank() : (window.TKST_DEFAULT_QUIZ_BANK || []);
    return all.filter(q => q.kyuNumber === parseInt(kyu));
  },

  // Renderiza uma lista de questões (dissertativas)
  renderQuestionsList: function(questions) {
    return questions.map(q => {
      let bodyHtml = '';

      if (q.type === 'lines') {
        const lines = Array(q.linesCount || 1).fill('<div class="exam-print-line"></div>').join('');
        bodyHtml = `<div class="exam-print-lines-box"><span class="exam-r-prefix">R.:</span> ${lines}</div>`;
      } else if (q.type === 'essay') {
        const lines = Array(q.linesCount || 3).fill('<div class="exam-print-line"></div>').join('');
        bodyHtml = `<div class="exam-print-lines-box"><span class="exam-r-prefix">R.:</span> ${lines}</div>`;
      } else if (q.type === 'image_fields') {
        const imgSrc = q.image || q.fallbackImage;
        const fieldsHtml = q.fields.map(f => `
          <div class="exam-print-field-row">
            <span class="exam-print-field-label">${f.label}</span>
            <div class="exam-print-line" style="flex: 1;"></div>
          </div>
        `).join('');

        bodyHtml = `
          <div class="exam-print-img-row">
            <div class="exam-print-img-wrapper">
              <img src="${imgSrc}" alt="Técnica" class="exam-print-img" style="height: 38px !important; max-height: 38px !important; width: auto !important; max-width: 65px !important; object-fit: contain !important; display: block !important;" onerror="this.src='${q.fallbackImage}'">
            </div>
            <div class="exam-print-fields-col">
              ${fieldsHtml}
            </div>
          </div>
        `;
      } else if (q.type === 'image_lines') {
        const imgSrc = q.image || q.fallbackImage;
        const lines = Array(q.linesCount || 1).fill('<div class="exam-print-line"></div>').join('');

        bodyHtml = `
          <div class="exam-print-img-row">
            <div class="exam-print-img-wrapper">
              <img src="${imgSrc}" alt="Técnica" class="exam-print-img" style="height: 38px !important; max-height: 38px !important; width: auto !important; max-width: 65px !important; object-fit: contain !important; display: block !important;" onerror="this.src='${q.fallbackImage}'">
            </div>
            <div class="exam-print-fields-col">
              <div class="exam-print-field-row">
                <span class="exam-print-field-label">R.:</span>
                ${lines}
              </div>
            </div>
          </div>
        `;
      } else if (q.type === 'count_grid_2col') {
        const col1Html = q.col1.map(it => `
          <div class="exam-print-count-item">
            <span class="exam-print-count-num">${it.num}-</span>
            <div class="exam-print-line" style="flex: 1;"></div>
          </div>
        `).join('');
        const col2Html = q.col2.map(it => `
          <div class="exam-print-count-item">
            <span class="exam-print-count-num">${it.num}-</span>
            <div class="exam-print-line" style="flex: 1;"></div>
          </div>
        `).join('');

        bodyHtml = `
          <div class="exam-print-count-2cols">
            <div class="exam-print-count-subcol">${col1Html}</div>
            <div class="exam-print-count-subcol">${col2Html}</div>
          </div>
        `;
      }

      return `
        <div class="exam-print-q-card">
          <div class="exam-print-q-header">
            <span class="exam-print-q-text"><strong>${q.num}.</strong> ${q.title}</span>
          </div>
          ${bodyHtml}
        </div>
      `;
    }).join('');
  },

  // Gera HTML da Prova Oficial em 2 Colunas Ultra-Compacta (1 Folha A4)
  buildOfficialExamHtml: function(kyu, options = {}) {
    const exam = this.getExamData(kyu);
    const dateStr = options.date || "_____/_____/2026";
    const dojoName = options.dojo || "TKST - Shotokan";
    const senseiName = options.sensei || "Sensei Diego Albino (3º Dan)";

    const leftQuestions = exam.leftQuestions || (exam.questions ? exam.questions.slice(0, 5) : []);
    const rightQuestions = exam.rightQuestions || (exam.questions ? exam.questions.slice(5) : []);

    const leftColHtml = this.renderQuestionsList(leftQuestions);
    const rightColHtml = this.renderQuestionsList(rightQuestions);

    return `
      <div class="exam-sheet-a4 single-page-a4">
        <!-- HEADER COMPACTO -->
        <div class="exam-print-header">
          <img src="assets/images/logo-tkst-clean.png" alt="TKST" class="exam-print-logo" style="height: 38px !important; max-height: 38px !important; width: auto !important; max-width: 48px !important; object-fit: contain !important; display: block !important;" onerror="this.src='assets/images/logo-tkst.png'">
          <div class="exam-print-header-center">
            <div class="exam-print-assoc">TRADICIONAL KARATE-DO SHOTOKAN TSUYOI (TKST)</div>
            <div class="exam-print-exam-title">${exam.title.toUpperCase()} (${exam.targetBelt.toUpperCase()})</div>
          </div>
          <img src="assets/images/tigre.png" alt="Tigre" class="exam-print-logo-tiger" style="height: 34px !important; max-height: 34px !important; width: auto !important; max-width: 42px !important; object-fit: contain !important; display: block !important;" onerror="this.style.display='none'">
        </div>

        <!-- QUADRO DE DADOS DO ALUNO -->
        <div class="exam-print-student-box">
          <div class="exam-print-row">
            <div style="flex: 2.2;"><strong>Aluno(a):</strong> __________________________________________________</div>
            <div style="flex: 0.9;"><strong>Data:</strong> ${dateStr}</div>
            <div style="flex: 0.7; text-align: right;"><strong>Nota:</strong> _____ / 10,0</div>
          </div>
        </div>

        <!-- CITAÇÃO DO MESTRE FUNAKOSHI -->
        <div class="exam-print-quote">
          "O objetivo final do Karatê não está na vitória ou na derrota, mas na perfeição do caráter de seus participantes." — Gichin Funakoshi
        </div>

        <!-- CORPO EM 2 COLUNAS COMPACTAS -->
        <div class="exam-2col-layout">
          <div class="exam-col-left">
            ${leftColHtml}
          </div>
          <div class="exam-col-right">
            ${rightColHtml}
          </div>
        </div>

        <!-- ASSINATURAS COMPACTAS NO RODAPÉ -->
        <div class="exam-print-footer">
          <div class="exam-print-sig-col">
            <div class="exam-print-sig-line"></div>
            <div>Assinatura do Aluno(a)</div>
          </div>
          <div class="exam-print-sig-col">
            <div class="exam-print-sig-line"></div>
            <div>Assinatura do Sensei Examinador</div>
          </div>
        </div>
      </div>
    `;
  },

  // Gera HTML da Prova em Múltipla Escolha em 2 Colunas (1 Folha A4)
  buildQuizExamHtml: function(kyu, options = {}) {
    const exam = this.getExamData(kyu);
    const questions = this.getQuizQuestionsForKyu(kyu);
    const dateStr = options.date || "_____/_____/2026";

    if (questions.length === 0) {
      return `<div style="padding: 20px; text-align: center; color: red;">Nenhuma questão cadastrada para esta faixa no banco de dados.</div>`;
    }

    const answerCardRows = questions.slice(0, 10).map((q, idx) => `
      <div class="exam-answer-card-item">
        <span class="exam-card-q-num">Q${idx + 1 < 10 ? '0' + (idx + 1) : (idx + 1)}:</span>
        <span class="exam-card-bubble">(A)</span>
        <span class="exam-card-bubble">(B)</span>
        <span class="exam-card-bubble">(C)</span>
        <span class="exam-card-bubble">(D)</span>
      </div>
    `).join('');

    const leftQuestions = questions.slice(0, 5);
    const rightQuestions = questions.slice(5, 10);

    const renderQuizCols = (list, offset) => list.map((q, idx) => {
      const qNum = offset + idx + 1;
      const optionsHtml = (q.options || []).map((opt, optIdx) => {
        const letter = String.fromCharCode(65 + optIdx);
        return `
          <div class="exam-mcq-option">
            <span class="exam-mcq-checkbox">[ &nbsp; ] (${letter})</span>
            <span class="exam-mcq-opt-text">${opt}</span>
          </div>
        `;
      }).join('');

      return `
        <div class="exam-print-q-card mcq-card">
          <div class="exam-print-q-header">
            <span class="exam-print-q-text"><strong>${qNum}.</strong> ${q.question}</span>
          </div>
          ${q.image ? `
            <div style="margin: 2px 0; text-align: center;">
              <img src="${q.image}" alt="Img" style="max-height: 48px; border: 1px solid #CCC; padding: 1px;">
            </div>
          ` : ''}
          <div class="exam-mcq-grid">
            ${optionsHtml}
          </div>
        </div>
      `;
    }).join('');

    const leftColHtml = renderQuizCols(leftQuestions, 0);
    const rightColHtml = renderQuizCols(rightQuestions, 5);

    return `
      <div class="exam-sheet-a4 single-page-a4">
        <!-- HEADER COMPACTO -->
        <div class="exam-print-header">
          <img src="assets/images/logo-tkst-clean.png" alt="TKST" class="exam-print-logo" style="height: 38px !important; max-height: 38px !important; width: auto !important; max-width: 48px !important; object-fit: contain !important; display: block !important;" onerror="this.src='assets/images/logo-tkst.png'">
          <div class="exam-print-header-center">
            <div class="exam-print-assoc">TRADICIONAL KARATE-DO SHOTOKAN TSUYOI (TKST)</div>
            <div class="exam-print-exam-title">AVALIAÇÃO TEÓRICA / SIMULADO — ${exam.targetBelt.toUpperCase()}</div>
          </div>
          <img src="assets/images/tigre.png" alt="Tigre" class="exam-print-logo-tiger" style="height: 34px !important; max-height: 34px !important; width: auto !important; max-width: 42px !important; object-fit: contain !important; display: block !important;" onerror="this.style.display='none'">
        </div>

        <!-- QUADRO DE DADOS DO ALUNO -->
        <div class="exam-print-student-box">
          <div class="exam-print-row">
            <div style="flex: 2.2;"><strong>Aluno(a):</strong> __________________________________________________</div>
            <div style="flex: 0.9;"><strong>Data:</strong> ${dateStr}</div>
            <div style="flex: 0.7; text-align: right;"><strong>Nota:</strong> _____ / 10,0</div>
          </div>
        </div>

        <!-- CARTÃO RESPOSTA COMPACTO -->
        <div class="exam-answer-card-wrapper">
          <div class="exam-answer-card-title">
            CARTÃO-RESPOSTA OFICIAL (Preencha completamente o círculo da alternativa correta):
          </div>
          <div class="exam-answer-card-grid">
            ${answerCardRows}
          </div>
        </div>

        <!-- 2 COLUNAS DE QUESTÕES -->
        <div class="exam-2col-layout">
          <div class="exam-col-left">
            ${leftColHtml}
          </div>
          <div class="exam-col-right">
            ${rightColHtml}
          </div>
        </div>

        <!-- ASSINATURAS -->
        <div class="exam-print-footer">
          <div class="exam-print-sig-col">
            <div class="exam-print-sig-line"></div>
            <div>Assinatura do Aluno(a)</div>
          </div>
          <div class="exam-print-sig-col">
            <div class="exam-print-sig-line"></div>
            <div>Assinatura do Sensei Examinador</div>
          </div>
        </div>
      </div>
    `;
  },

  // Gera Gabarito Oficial de Correção para uma Faixa Específica
  buildAnswerKeyHtml: function(kyu, format = 'official') {
    const exam = this.getExamData(kyu);

    if (format === 'quiz') {
      const questions = this.getQuizQuestionsForKyu(kyu);
      const itemsHtml = questions.map((q, idx) => {
        const letter = String.fromCharCode(65 + (q.correctIndex || 0));
        const correctText = (q.options && q.options[q.correctIndex]) || (q.options && q.options[0]) || '';
        return `
          <div class="exam-key-card">
            <div class="exam-key-card-header">
              <span class="exam-key-q-num">Questão ${idx + 1}</span>
              <span class="exam-key-correct-badge">Gabarito: [ ${letter} ]</span>
            </div>
            <div style="font-size: 8pt; color: #334155;"><strong>Pergunta:</strong> ${q.question}</div>
            <div class="exam-key-answer-box"><strong>Resposta Correta:</strong> ${correctText}</div>
            ${q.explanation ? `<div class="exam-key-expl-box">${q.explanation}</div>` : ''}
          </div>
        `;
      }).join('');

      return `
        <div class="exam-sheet-a4 single-page-a4">
          <div class="exam-print-header" style="border-bottom: 2px solid #059669;">
            <img src="assets/images/logo-tkst-clean.png" alt="TKST" class="exam-print-logo" style="height: 38px !important; max-height: 38px !important; width: auto !important; max-width: 48px !important; object-fit: contain !important; display: block !important;" onerror="this.src='assets/images/logo-tkst.png'">
            <div class="exam-print-header-center">
              <div class="exam-print-assoc" style="color: #059669;">GABARITO OFICIAL DO SENSEI (MÚLTIPLA ESCOLHA)</div>
              <div class="exam-print-exam-title">${exam.title.toUpperCase()} — (${exam.targetBelt.toUpperCase()})</div>
            </div>
            <div style="text-align: right; font-size: 7pt; font-weight: 800; color: #059669; border: 1.5px solid #059669; padding: 3px 6px; border-radius: 3px;">
              GABARITO SENSEI
            </div>
          </div>

          <div class="exam-key-summary-grid">
            ${questions.map((q, idx) => {
              const letter = String.fromCharCode(65 + (q.correctIndex || 0));
              return `
                <div class="exam-key-pill">
                  <span class="exam-key-pill-num">Q${idx + 1}:</span>
                  <span class="exam-key-pill-val">${letter}</span>
                </div>
              `;
            }).join('')}
          </div>

          <div style="margin-top: 8px;">
            ${itemsHtml}
          </div>
        </div>
      `;
    }

    // Gabarito do Modelo Dissertativo Oficial
    const allQuestions = [...(exam.leftQuestions || []), ...(exam.rightQuestions || [])];
    const itemsHtml = allQuestions.map(q => {
      let expectedHtml = '';
      if (q.type === 'image_fields') {
        expectedHtml = q.fields.map(f => `<span><strong>${f.label}</strong> ${f.expected}</span>`).join(' | ');
      } else if (q.type === 'count_grid_2col') {
        const c1 = q.col1.map(it => `${it.num}:${it.expected}`).join(' ');
        const c2 = q.col2.map(it => `${it.num}:${it.expected}`).join(' ');
        expectedHtml = `<span>${c1} | ${c2}</span>`;
      } else {
        expectedHtml = `<span>${q.expectedAnswer.replace(/\n/g, ' ')}</span>`;
      }

      return `
        <div class="exam-key-card" style="margin-bottom: 4px; padding: 4px 6px;">
          <div class="exam-key-card-header" style="margin-bottom: 1px;">
            <span class="exam-key-q-num">Q${q.num}.</span>
            <span class="exam-key-q-title" style="font-size: 8pt;">${q.title}</span>
            <span style="font-size: 7pt; font-weight: 700; color: #059669;">1,0 pt</span>
          </div>
          <div class="exam-key-answer-box" style="font-size: 7.5pt; color: #065F46;">
            <strong>Resposta Esperada:</strong> ${expectedHtml}
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="exam-sheet-a4 single-page-a4">
        <div class="exam-print-header" style="border-bottom: 2px solid #059669;">
          <img src="assets/images/logo-tkst-clean.png" alt="TKST" class="exam-print-logo" style="height: 38px !important; max-height: 38px !important; width: auto !important; max-width: 48px !important; object-fit: contain !important; display: block !important;" onerror="this.src='assets/images/logo-tkst.png'">
          <div class="exam-print-header-center">
            <div class="exam-print-assoc" style="color: #059669;">FOLHA DE CORREÇÃO DO SENSEI (GABARITO OFICIAL)</div>
            <div class="exam-print-exam-title">${exam.title.toUpperCase()} — (${exam.targetBelt.toUpperCase()})</div>
          </div>
          <div style="text-align: right; font-size: 7pt; font-weight: 800; color: #059669; border: 1.5px solid #059669; padding: 3px 6px; border-radius: 3px;">
            GABARITO SENSEI
          </div>
        </div>

        <div style="background: #F0FDF4; border: 1px solid #86EFAC; padding: 4px 8px; border-radius: 4px; margin-bottom: 6px; font-size: 7.5pt; color: #166534;">
          <strong>Critério:</strong> Cada questão possui valor de 1,0 ponto (Total = 10,0 pontos). Pontuar integralmente respostas com grafia aproximada ou terminologia técnica correta.
        </div>

        <div style="margin-top: 4px;">
          ${itemsHtml}
        </div>
      </div>
    `;
  },

  // Gera o Gabarito Mestre Geral Unificado de TODAS as Faixas em folha única/dupla compacta
  buildMasterAnswerKeyHtml: function() {
    const kyuKeys = [6, 5, 4, 3, 2, 1, 0, -1, -2];

    const sectionsHtml = kyuKeys.map(kyu => {
      const exam = this.getExamData(kyu);
      const allQuestions = [...(exam.leftQuestions || []), ...(exam.rightQuestions || [])];

      const rowsHtml = allQuestions.map(q => {
        let resp = q.expectedAnswer || '';
        if (q.type === 'image_fields') {
          resp = q.fields.map(f => `${f.label} ${f.expected}`).join(' | ');
        } else if (q.type === 'count_grid_2col') {
          resp = q.col1.map(it => `${it.num}:${it.expected}`).join(' ') + ' ' + q.col2.map(it => `${it.num}:${it.expected}`).join(' ');
        }
        return `
          <tr>
            <td style="font-weight: 900; width: 32px; text-align: center; padding: 2px 4px; font-size: 7pt;">Q${q.num}</td>
            <td style="font-size: 7pt; width: 38%; padding: 2px 4px;"><strong>${q.title}</strong></td>
            <td style="font-size: 7pt; color: #065F46; font-weight: 600; padding: 2px 4px;">${resp}</td>
          </tr>
        `;
      }).join('');

      return `
        <div style="page-break-inside: avoid; margin-bottom: 12px; border: 1px solid #CBD5E1; border-radius: 3px; overflow: hidden;">
          <div style="background: ${exam.headerColor || '#1E293B'}; color: #FFF; padding: 3px 8px; font-weight: 800; font-size: 8pt; display: flex; justify-content: space-between; align-items: center;">
            <span>🥋 ${exam.title.toUpperCase()} (${exam.targetBelt})</span>
            <span style="font-size: 7pt; background: rgba(255,255,255,0.2); padding: 1px 6px; border-radius: 2px;">Kata: ${exam.kataName}</span>
          </div>
          <table class="exam-master-key-table">
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      `;
    }).join('');

    return `
      <div class="exam-sheet-a4">
        <div class="exam-print-header" style="border-bottom: 2px solid #D97706; padding-bottom: 4px; margin-bottom: 6px;">
          <img src="assets/images/logo-tkst-clean.png" alt="TKST" class="exam-print-logo" style="height: 38px !important; max-height: 38px !important; width: auto !important; max-width: 48px !important; object-fit: contain !important; display: block !important;" onerror="this.src='assets/images/logo-tkst.png'">
          <div class="exam-print-header-center">
            <div class="exam-print-assoc" style="color: #B45309;">TRADICIONAL KARATE-DO SHOTOKAN TSUYOI (TKST)</div>
            <div class="exam-print-exam-title">GABARITO MESTRE GERAL — TODAS AS FAIXAS (6º KYU AO 3º DAN)</div>
          </div>
          <img src="assets/images/tigre.png" alt="Tigre" class="exam-print-logo-tiger" style="height: 34px !important; max-height: 34px !important; width: auto !important; max-width: 42px !important; object-fit: contain !important; display: block !important;" onerror="this.style.display='none'">
        </div>

        <div style="margin-top: 8px;">
          ${sectionsHtml}
        </div>
      </div>
    `;
  },

  // Gera o Caderno Completo com Todas as Provas em Sequência (1 página por prova)
  buildAllExamsHtml: function(format = 'official', options = {}) {
    const kyuKeys = [6, 5, 4, 3, 2, 1, 0, -1, -2];
    return kyuKeys.map(kyu => {
      const content = format === 'quiz' 
        ? this.buildQuizExamHtml(kyu, options) 
        : this.buildOfficialExamHtml(kyu, options);
      return `<div class="exam-page-break-wrapper">${content}</div>`;
    }).join('');
  },

  // CSS Ultra-Otimizado para 1 Página A4 Sem Desperdício de Espaço
  getPrintStyles: function() {
    return `
      @page {
        size: A4 portrait;
        margin: 6mm 8mm 6mm 8mm;
      }
      * {
        box-sizing: border-box;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      body {
        margin: 0;
        padding: 0;
        font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Arial, sans-serif;
        color: #0F172A;
        background: #FFF;
        font-size: 8pt;
        line-height: 1.25;
      }
      .exam-sheet-a4 {
        width: 100%;
        max-width: 200mm;
        margin: 0 auto;
        padding: 0;
        background: #FFF;
      }
      .single-page-a4 {
        height: auto;
        max-height: 284mm;
        overflow: hidden;
      }
      .exam-page-break-wrapper {
        page-break-after: always;
        page-break-inside: avoid;
      }
      .exam-page-break-wrapper:last-child {
        page-break-after: auto;
      }

      /* HEADER ULTRA COMPACTO */
      .exam-print-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 2px solid #0F172A;
        padding-bottom: 3px;
        margin-bottom: 3px;
        gap: 8px;
      }
      .exam-print-logo {
        height: 38px;
        width: auto;
        object-fit: contain;
      }
      .exam-print-logo-tiger {
        height: 34px;
        width: auto;
        object-fit: contain;
        opacity: 0.85;
      }
      .exam-print-header-center {
        flex: 1;
        text-align: center;
      }
      .exam-print-assoc {
        font-size: 9pt;
        font-weight: 900;
        letter-spacing: 0.3px;
        color: #0F172A;
        line-height: 1.1;
      }
      .exam-print-exam-title {
        font-size: 8.5pt;
        font-weight: 800;
        color: #B45309;
        line-height: 1.1;
        margin-top: 1px;
      }

      /* QUADRO DE ALUNO */
      .exam-print-student-box {
        border: 1.2px solid #0F172A;
        border-radius: 3px;
        padding: 3px 6px;
        margin-bottom: 3px;
        font-size: 7.5pt;
        background: #F8FAFC;
      }
      .exam-print-row {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      /* CITAÇÃO */
      .exam-print-quote {
        text-align: center;
        font-style: italic;
        font-size: 6.8pt;
        color: #334155;
        border-top: 1px dashed #94A3B8;
        border-bottom: 1px dashed #94A3B8;
        padding: 2px 0;
        margin-bottom: 4px;
        line-height: 1.15;
      }

      /* LAYOUT EM 2 COLUNAS */
      .exam-2col-layout {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      .exam-col-left, .exam-col-right {
        display: flex;
        flex-direction: column;
        gap: 3.5px;
      }

      /* CARD DE QUESTÃO */
      .exam-print-q-card {
        page-break-inside: avoid;
        border-bottom: 1px dotted #CBD5E1;
        padding-bottom: 2.5px;
      }
      .exam-print-q-card:last-child {
        border-bottom: none;
      }
      .exam-print-q-header {
        font-size: 7.5pt;
        line-height: 1.2;
        margin-bottom: 1.5px;
      }
      .exam-print-q-text {
        color: #0F172A;
      }
      .exam-r-prefix {
        font-weight: 900;
        font-size: 7.5pt;
        margin-right: 2px;
        flex-shrink: 0;
      }

      /* LINHAS DE RESPOSTA */
      .exam-print-lines-box {
        display: flex;
        flex-direction: column;
        gap: 1px;
      }
      .exam-print-line {
        border-bottom: 1px solid #475569;
        height: 13px;
        width: 100%;
      }

      /* IMAGENS E CAMPOS */
      .exam-print-img-row {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 1px;
      }
      .exam-print-img-wrapper {
        border: 1px solid #CBD5E1;
        border-radius: 2px;
        padding: 2px;
        background: #FFF;
        flex-shrink: 0;
      }
      .exam-print-img {
        height: 38px;
        max-width: 65px;
        object-fit: contain;
        display: block;
      }
      .exam-print-fields-col {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .exam-print-field-row {
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .exam-print-field-label {
        font-size: 7pt;
        font-weight: 800;
        color: #1E293B;
        white-space: nowrap;
      }

      /* GRID DE CONTAGEM EM 2 SUBCOLUNAS */
      .exam-print-count-2cols {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px;
        margin-top: 1px;
      }
      .exam-print-count-subcol {
        display: flex;
        flex-direction: column;
        gap: 1px;
      }
      .exam-print-count-item {
        display: flex;
        align-items: center;
        gap: 2px;
      }
      .exam-print-count-num {
        font-size: 7pt;
        font-weight: 800;
        color: #0F172A;
        width: 18px;
      }

      /* MÚLTIPLA ESCOLHA */
      .exam-answer-card-wrapper {
        border: 1px solid #059669;
        border-radius: 3px;
        background: #F0FDF4;
        padding: 3px 6px;
        margin-bottom: 4px;
      }
      .exam-answer-card-title {
        font-size: 7pt;
        font-weight: 800;
        color: #065F46;
        margin-bottom: 2px;
      }
      .exam-answer-card-grid {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 2px 6px;
      }
      .exam-answer-card-item {
        display: flex;
        align-items: center;
        gap: 2px;
        font-size: 6.8pt;
        font-weight: 700;
      }
      .exam-card-q-num {
        width: 20px;
        color: #0F172A;
      }
      .exam-card-bubble {
        color: #475569;
      }
      .exam-mcq-grid {
        display: flex;
        flex-direction: column;
        gap: 1px;
        margin-top: 1px;
      }
      .exam-mcq-option {
        display: flex;
        align-items: flex-start;
        gap: 4px;
        font-size: 7pt;
        line-height: 1.15;
      }
      .exam-mcq-checkbox {
        font-weight: bold;
        color: #0F172A;
        flex-shrink: 0;
        font-size: 6.8pt;
      }
      .exam-mcq-opt-text {
        color: #334155;
      }

      /* GABARITO SENSEI */
      .exam-key-card {
        page-break-inside: avoid;
        border: 1px solid #E2E8F0;
        border-left: 3px solid #10B981;
        border-radius: 3px;
        padding: 3px 5px;
        margin-bottom: 3px;
        background: #FAFAFA;
      }
      .exam-key-card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 7.5pt;
      }
      .exam-key-q-num {
        font-weight: 900;
        color: #065F46;
        margin-right: 4px;
      }
      .exam-key-correct-badge {
        background: #10B981;
        color: #FFF;
        font-weight: 800;
        font-size: 6.8pt;
        padding: 1px 4px;
        border-radius: 2px;
      }
      .exam-key-answer-box {
        font-size: 7.2pt;
        color: #1E293B;
      }
      .exam-key-expl-box {
        font-size: 6.8pt;
        color: #64748B;
        font-style: italic;
      }
      .exam-key-summary-grid {
        display: grid;
        grid-template-columns: repeat(10, 1fr);
        gap: 2px;
        background: #F8FAFC;
        border: 1px solid #CBD5E1;
        padding: 4px;
        border-radius: 3px;
        margin-bottom: 6px;
      }
      .exam-key-pill {
        background: #FFF;
        border: 1px solid #10B981;
        border-radius: 2px;
        text-align: center;
        padding: 1px;
      }
      .exam-key-pill-num {
        color: #64748B;
        font-size: 6pt;
      }
      .exam-key-pill-val {
        color: #065F46;
        font-weight: 900;
        font-size: 7pt;
      }

      /* MASTER KEY TABLE */
      .exam-master-key-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 6.8pt;
      }
      .exam-master-key-table td {
        border: 1px solid #CBD5E1;
        padding: 2px 4px;
        vertical-align: top;
      }
      .exam-master-key-table tr:nth-child(even) {
        background: #F8FAFC;
      }

      /* FOOTER & ASSINATURAS */
      .exam-print-footer {
        display: flex;
        justify-content: space-around;
        align-items: flex-end;
        margin-top: 4px;
        padding-top: 2px;
        page-break-inside: avoid;
      }
      .exam-print-sig-col {
        text-align: center;
        font-size: 7pt;
        color: #334155;
      }
      .exam-print-sig-line {
        border-top: 1px solid #0F172A;
        width: 180px;
        margin-bottom: 2px;
      }
    `;
  },

  // Impressão / Abertura de Janela de Impressão PDF
  printHtml: function(title, bodyContent) {
    const printWindow = window.open('', '_blank', 'width=950,height=800');
    if (!printWindow) {
      alert("Aviso: O navegador bloqueou a janela de impressão. Por favor, permita pop-ups para este site para gerar o PDF.");
      return;
    }

    const styles = this.getPrintStyles();

    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title} - TKST Karate</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        <style>
          ${styles}
          @media screen {
            body {
              background: #0F172A;
              padding: 15px;
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            .exam-sheet-a4 {
              box-shadow: 0 8px 30px rgba(0,0,0,0.5);
              padding: 15px;
              border-radius: 4px;
              margin-bottom: 20px;
            }
            .no-print-bar {
              width: 100%;
              max-width: 200mm;
              background: #1E293B;
              border: 1px solid #334155;
              padding: 10px 16px;
              border-radius: 6px;
              margin-bottom: 12px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              color: #FFF;
            }
            .print-btn-action {
              background: #F5BE00;
              color: #000;
              border: none;
              font-weight: 800;
              padding: 8px 16px;
              border-radius: 5px;
              cursor: pointer;
              font-size: 0.88rem;
              display: flex;
              align-items: center;
              gap: 6px;
            }
            .print-btn-action:hover {
              background: #FFD166;
            }
          }
          @media print {
            .no-print-bar {
              display: none !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="no-print-bar">
          <div>
            <strong style="font-size: 0.95rem;">📄 ${title}</strong>
            <div style="font-size: 0.75rem; color: #94A3B8;">Diagramação exata de 1 folha A4</div>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="print-btn-action" onclick="window.print()">
              <i class="fas fa-print"></i> Imprimir / Salvar PDF
            </button>
            <button class="print-btn-action" style="background: #334155; color: #FFF;" onclick="window.close()">
              <i class="fas fa-times"></i> Fechar
            </button>
          </div>
        </div>

        ${bodyContent}

        <script>
          window.addEventListener('load', function() {
            setTimeout(function() {
              window.print();
            }, 500);
          });
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }
};
