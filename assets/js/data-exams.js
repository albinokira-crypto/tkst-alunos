/**
 * TKST Alunos - Gerador Oficial de Provas Escritas e Gabaritos em PDF/Impressão (2026)
 * Suporte completo: 6º Kyu (Amarela) até 3º Dan (Sandan)
 * Diagramação Vertical A4 Completa (1 Coluna Vertical, Imagens Lado a Lado, Sem Cartão-Resposta, Sem Assinaturas)
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
    questions: [
      {
        num: 1,
        title: "Qual o Kata que você deve aprender na sua Faixa?",
        type: "lines",
        linesCount: 1,
        expectedAnswer: "Heian Shodan (Paz e Tranquilidade Nível 1)."
      },
      {
        num: 2,
        title: "Qual o nome em japonês das 3 alturas (Alto, Médio e Baixo)?",
        type: "lines",
        linesCount: 1,
        expectedAnswer: "Jodan (Alto), Chudan (Médio) e Gedan (Baixo)."
      },
      {
        num: 3,
        title: "Descreva o Golpe e a Base da imagem ao lado:",
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
        title: "Qual o nome do Chute da imagem ao lado?",
        type: "image_lines",
        image: "assets/images/exames/branca_img2.png",
        fallbackImage: "assets/images/tecnicas/mae-geri.svg",
        linesCount: 1,
        expectedAnswer: "Mae Geri Chudan / Mae Geri Kekomi (Chute frontal)."
      },
      {
        num: 5,
        title: "Qual o nome da Defesa da imagem ao lado?",
        type: "image_lines",
        image: "assets/images/exames/branca_img3.png",
        fallbackImage: "assets/images/tecnicas/jodan-age-uke.svg",
        linesCount: 1,
        expectedAnswer: "Jodan Age Uke (Defesa alta) ou Gedan Barai."
      },
      {
        num: 6,
        title: "Cite 1 Dojô Kun:",
        type: "lines",
        linesCount: 1,
        expectedAnswer: "Hitotsu! Jinkaku kansei ni tsutomuru koto! (Esforçar-se para a formação do caráter)."
      },
      {
        num: 7,
        title: "Qual o nome do 8º movimento do Kata Heian Shodan?",
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
        linesCount: 2,
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
    questions: [
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
        title: "Descreva a Técnica e a Base da imagem ao lado:",
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
        title: "Qual o nome do Chute da imagem ao lado?",
        type: "image_lines",
        image: "assets/images/exames/amarela_img2.png",
        fallbackImage: "assets/images/tecnicas/mawashi-geri.svg",
        linesCount: 1,
        expectedAnswer: "Mawashi Geri Chudan/Jodan (Chute circular)."
      },
      {
        num: 5,
        title: "Qual o nome da Defesa da imagem ao lado?",
        type: "image_lines",
        image: "assets/images/exames/amarela_img3.png",
        fallbackImage: "assets/images/tecnicas/zenkutsu-dachi.svg",
        linesCount: 1,
        expectedAnswer: "Soto Uke Chudan (De fora para dentro) ou Uchi Uke."
      },
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
        linesCount: 2,
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
    questions: [
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
        title: "Descreva o Golpe e a Base da imagem ao lado:",
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
        title: "Qual o nome do Chute da imagem ao lado?",
        type: "image_lines",
        image: "assets/images/exames/vermelha_img2.png",
        fallbackImage: "assets/images/tecnicas/yoko-geri.svg",
        linesCount: 1,
        expectedAnswer: "Yoko Geri Kekomi / Yoko Geri Keage (Chute lateral)."
      },
      {
        num: 5,
        title: "Qual o nome do Ataque da imagem ao lado?",
        type: "image_lines",
        image: "assets/images/exames/vermelha_img3.png",
        fallbackImage: "assets/images/tecnicas/gyaku-tsuki.png",
        linesCount: 1,
        expectedAnswer: "Gyaku Tsuki Chudan (Soco contrário à perna da frente)."
      },
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
        linesCount: 2,
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
    questions: [
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
        linesCount: 1,
        expectedAnswer: "Combate pré-determinado de 1 passo em Kamae visando tempo, distância e foco."
      },
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
        linesCount: 1,
        expectedAnswer: "Mae = Avançar; Sagate = Recuar; Mawate = Girar; Yame = Parar."
      },
      {
        num: 9,
        title: "Como a disciplina do Karatê ajuda nos seus estudos ou trabalho?",
        type: "essay",
        linesCount: 2,
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
    questions: [
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
        linesCount: 1,
        expectedAnswer: "Desmontagem, estudo e aplicação prática de combate de cada movimento do Kata."
      },
      {
        num: 6,
        title: "Escreva os 5 princípios do Dojô Kun:",
        type: "lines",
        linesCount: 2,
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
        linesCount: 1,
        expectedAnswer: "Mokuso = Meditação; Sensei ni Rei = Saudação ao Professor; Otagai = Saudação mútua."
      },
      {
        num: 9,
        title: "Como você aplica 'Conter o espírito de agressão' no seu dia a dia?",
        type: "essay",
        linesCount: 2,
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
    questions: [
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
        title: "Quem foi Mestre Funakoshi e sua contribuição para o Karatê?",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "Pai do Karatê Moderno, introduziu o Shotokan no Japão e uniu o Budo com a educação."
      },
      {
        num: 5,
        title: "O que significa o princípio 'Karate ni sente nashi'?",
        type: "lines",
        linesCount: 1,
        expectedAnswer: "'No Karatê não existe atitude ofensiva inicial' — arte essencialmente de legítima defesa."
      },
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
        linesCount: 1,
        expectedAnswer: "Base enraizada e inabalável unindo firmeza de Zenkutsu e Kiba Dachi (peso 50/50)."
      },
      {
        num: 8,
        title: "Escreva o Dojô Kun e o significado do termo 'Hitotsu':",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "5 princípios + 'Hitotsu' = Item 1 (todos os preceitos têm a mesma prioridade máxima)."
      },
      {
        num: 9,
        title: "O que a Faixa Marrom representa na sua jornada ao Shodan?",
        type: "essay",
        linesCount: 2,
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
    questions: [
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
        title: "Importância do Koshi no Kaiten e do Tanden na geração de potência:",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "O Tanden gera potência transferida pela rotação do quadril e respiração até o impacto."
      },
      {
        num: 4,
        title: "Cite 2 preceitos do Shōtōkan Nijūkun de Gichin Funakoshi:",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "1) O Karatê começa e termina com respeito; 2) O Karatê é como água fervente."
      },
      {
        num: 5,
        title: "Conduta mental e técnica exigida no Jiyu Kumite de Shodan:",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "Zanshin impecável, Sun-dome (controle de impacto), respeito e explosão técnica."
      },
      {
        num: 6,
        title: "Qual a diferença filosófica entre Karatê-Jutsu e Karatê-Dō?",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "Jutsu foca na eficácia destrutiva marcial; Dō foca no desenvolvimento moral e humano."
      },
      {
        num: 7,
        title: "Pontos vitais (Kyusho) prioritários em situação de legítima defesa:",
        type: "lines",
        linesCount: 1,
        expectedAnswer: "Olhos, garganta, plexo solar, costelas flutuantes, virilha e têmpora."
      },
      {
        num: 8,
        title: "Qual o dever ético e pedagógico de um novo Faixa Preta perante o Dojô?",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "Humildade, liderança exemplar, auxílio ao Sensei e apoio aos alunos iniciantes."
      },
      {
        num: 9,
        title: "Dissertação: Sua trajetória até a Faixa Preta e seu compromisso com a TKST:",
        type: "essay",
        linesCount: 3,
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
    questions: [
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
        title: "Metodologia pedagógica para ensino e correção de Kihon para turmas de base:",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "Correção postural segura, progressão pedagógica e reforço dos valores do Budo."
      },
      {
        num: 4,
        title: "Regras de arbitragem WKF/CBK (Ippon, Waza-ari, Penalidades C1/C2):",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "Critérios de pontuação técnica, controle de contato e penalidades C1/C2."
      },
      {
        num: 5,
        title: "Dissertação: A responsabilidade do 2º Dan na preservação técnica do Shotokan:",
        type: "essay",
        linesCount: 3,
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
    questions: [
      {
        num: 1,
        title: "Katas mestres avaliados no Sandan:",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "Sochin, Nijushiho, Meikyo, Unsu e Gojushiho Dai/Sho."
      },
      {
        num: 2,
        title: "A tríade marcial Shin - Gi - Tai no nível de Sandan:",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "Shin: mente serena; Gi: técnica perfeita; Tai: corpo eficiente e saudável."
      },
      {
        num: 3,
        title: "Responsabilidade de um Sensei Titular na gestão técnica e humana do Dojô:",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "Guardião dos valores do Budo, inclusão, segurança e desenvolvimento social."
      },
      {
        num: 4,
        title: "Dissertação: O papel do Karatê Shotokan como agente de transformação social:",
        type: "essay",
        linesCount: 4,
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

  // Renderiza uma lista de questões dissertativas verticais com imagens lado a lado
  renderDissertativeQuestions: function(questions) {
    return questions.map(q => {
      let bodyHtml = '';

      if (q.type === 'lines') {
        const lines = Array(q.linesCount || 1).fill('<div class="exam-print-line"></div>').join('');
        bodyHtml = `<div class="exam-print-lines-box"><span class="exam-r-prefix">R.:</span> ${lines}</div>`;
      } else if (q.type === 'essay') {
        const lines = Array(q.linesCount || 2).fill('<div class="exam-print-line"></div>').join('');
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
          <div class="exam-q-side-row">
            <div class="exam-q-img-wrap">
              <img src="${imgSrc}" alt="Técnica" class="exam-side-img" onerror="this.src='${q.fallbackImage}'">
            </div>
            <div class="exam-q-fields-wrap">
              ${fieldsHtml}
            </div>
          </div>
        `;
      } else if (q.type === 'image_lines') {
        const imgSrc = q.image || q.fallbackImage;
        const lines = Array(q.linesCount || 1).fill('<div class="exam-print-line"></div>').join('');

        bodyHtml = `
          <div class="exam-q-side-row">
            <div class="exam-q-img-wrap">
              <img src="${imgSrc}" alt="Técnica" class="exam-side-img" onerror="this.src='${q.fallbackImage}'">
            </div>
            <div class="exam-q-fields-wrap">
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
        <div class="exam-vertical-q-item">
          <div class="exam-q-title-row">
            <strong>${q.num}.</strong> ${q.title}
          </div>
          ${bodyHtml}
        </div>
      `;
    }).join('');
  },

  // Gera HTML da Prova Oficial Dissertativa Vertical (1 Coluna A4 Completa)
  buildOfficialExamHtml: function(kyu, options = {}) {
    const exam = this.getExamData(kyu);
    const dateStr = options.date || "_____/_____/2026";
    const questions = exam.questions || [...(exam.leftQuestions || []), ...(exam.rightQuestions || [])];
    const questionsHtml = this.renderDissertativeQuestions(questions);

    return `
      <div class="exam-sheet-a4 single-page-a4">
        <!-- HEADER OFICIAL COM LOGO CENTRALIZADA E SEM FUNDO -->
        <div class="exam-clean-header">
          <img src="assets/images/logo-header-tkst.png" alt="TRADICIONAL KARATE-DO SHOTOKAN TSUYOI" class="exam-main-header-logo">
          <div class="exam-clean-title">${exam.title.toUpperCase()} (${exam.targetBelt.toUpperCase()})</div>
        </div>

        <!-- QUADRO DE DADOS DO ALUNO -->
        <div class="exam-print-student-box">
          <div class="exam-print-row">
            <div style="flex: 2.3;"><strong>Aluno(a):</strong> __________________________________________________</div>
            <div style="flex: 0.9;"><strong>Data:</strong> ${dateStr}</div>
            <div style="flex: 0.7; text-align: right;"><strong>Nota:</strong> _____ / 10,0</div>
          </div>
        </div>

        <!-- CITAÇÃO DO MESTRE FUNAKOSHI -->
        <div class="exam-print-quote">
          "O objetivo final do Karatê não está na vitória ou na derrota, mas na perfeição do caráter de seus participantes." — Gichin Funakoshi
        </div>

        <!-- QUESTÕES VERTICAIS (UMA EMBAIXO DA OUTRA) -->
        <div class="exam-vertical-questions-flow">
          ${questionsHtml}
        </div>
      </div>
    `;
  },

  // Gera HTML da Prova Múltipla Escolha Vertical (1 Coluna A4 Completa com Imagens Lado a Lado)
  buildQuizExamHtml: function(kyu, options = {}) {
    const exam = this.getExamData(kyu);
    const questions = this.getQuizQuestionsForKyu(kyu);
    const dateStr = options.date || "_____/_____/2026";

    if (questions.length === 0) {
      return `<div style="padding: 20px; text-align: center; color: red;">Nenhuma questão cadastrada para esta faixa no banco de dados.</div>`;
    }

    const questionsListHtml = questions.slice(0, 10).map((q, idx) => {
      const qNum = idx + 1;
      const optionsHtml = (q.options || []).map((opt, optIdx) => {
        const letter = String.fromCharCode(65 + optIdx);
        return `
          <div class="exam-mcq-option">
            <span class="exam-mcq-checkbox">[ &nbsp; ] (${letter})</span>
            <span class="exam-mcq-opt-text">${opt}</span>
          </div>
        `;
      }).join('');

      if (q.image) {
        return `
          <div class="exam-vertical-q-item with-image-layout">
            <div class="exam-q-title-row">
              <strong>${qNum}.</strong> ${q.question}
            </div>
            <div class="exam-q-side-row">
              <div class="exam-q-img-wrap">
                <img src="${q.image}" alt="Ilustração Técnica" class="exam-side-img">
              </div>
              <div class="exam-q-options-grid-2col" style="flex: 1;">
                ${optionsHtml}
              </div>
            </div>
          </div>
        `;
      }

      return `
        <div class="exam-vertical-q-item">
          <div class="exam-q-title-row">
            <strong>${qNum}.</strong> ${q.question}
          </div>
          <div class="exam-q-options-grid-2col">
            ${optionsHtml}
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="exam-sheet-a4 single-page-a4">
        <!-- HEADER OFICIAL COM LOGO CENTRALIZADA E SEM FUNDO -->
        <div class="exam-clean-header">
          <img src="assets/images/logo-header-tkst.png" alt="TRADICIONAL KARATE-DO SHOTOKAN TSUYOI" class="exam-main-header-logo">
          <div class="exam-clean-title">AVALIAÇÃO TEÓRICA / SIMULADO — ${exam.targetBelt.toUpperCase()}</div>
        </div>

        <!-- QUADRO DE DADOS DO ALUNO -->
        <div class="exam-print-student-box">
          <div class="exam-print-row">
            <div style="flex: 2.3;"><strong>Aluno(a):</strong> __________________________________________________</div>
            <div style="flex: 0.9;"><strong>Data:</strong> ${dateStr}</div>
            <div style="flex: 0.7; text-align: right;"><strong>Nota:</strong> _____ / 10,0</div>
          </div>
        </div>

        <!-- CITAÇÃO DO MESTRE FUNAKOSHI -->
        <div class="exam-print-quote">
          "O objetivo final do Karatê não está na vitória ou na derrota, mas na perfeição do caráter de seus participantes." — Gichin Funakoshi
        </div>

        <!-- 10 QUESTÕES UMA EMBAIXO DA OUTRA PREENCHENDO TODA A FOLHA A4 -->
        <div class="exam-vertical-questions-flow">
          ${questionsListHtml}
        </div>
      </div>
    `;
  },

  // Gera Gabarito Oficial do Sensei
  buildAnswerKeyHtml: function(kyu, format = 'official') {
    const exam = this.getExamData(kyu);

    if (format === 'quiz') {
      const questions = this.getQuizQuestionsForKyu(kyu);
      const itemsHtml = questions.slice(0, 10).map((q, idx) => {
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
          <div class="exam-clean-header" style="border-bottom: 2px solid #059669; padding-bottom: 6px;">
            <img src="assets/images/logo-header-tkst.png" alt="TKST" class="exam-main-header-logo">
            <div class="exam-clean-title" style="color: #059669;">GABARITO OFICIAL DO SENSEI (MÚLTIPLA ESCOLHA) — ${exam.targetBelt.toUpperCase()}</div>
          </div>

          <div class="exam-key-summary-grid">
            ${questions.slice(0, 10).map((q, idx) => {
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

    // Gabarito Dissertativo
    const questions = exam.questions || [...(exam.leftQuestions || []), ...(exam.rightQuestions || [])];
    const itemsHtml = questions.map(q => {
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
        <div class="exam-key-card">
          <div class="exam-key-card-header">
            <span class="exam-key-q-num">Q${q.num}.</span>
            <span class="exam-key-q-title">${q.title}</span>
            <span style="font-size: 7.5pt; font-weight: 800; color: #059669;">1,0 pt</span>
          </div>
          <div class="exam-key-answer-box">
            <strong>Resposta Esperada:</strong> ${expectedHtml}
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="exam-sheet-a4 single-page-a4">
        <div class="exam-clean-header" style="border-bottom: 2px solid #059669; padding-bottom: 6px;">
          <img src="assets/images/logo-header-tkst.png" alt="TKST" class="exam-main-header-logo">
          <div class="exam-clean-title" style="color: #059669;">FOLHA DE CORREÇÃO DO SENSEI (GABARITO OFICIAL) — ${exam.targetBelt.toUpperCase()}</div>
        </div>

        <div style="background: #F0FDF4; border: 1px solid #86EFAC; padding: 4px 8px; border-radius: 4px; margin-bottom: 8px; font-size: 8pt; color: #166534;">
          <strong>Critério:</strong> Cada questão possui valor de 1,0 ponto (Total = 10,0 pontos). Pontuar integralmente respostas com grafia aproximada ou terminologia técnica correta.
        </div>

        <div style="margin-top: 4px;">
          ${itemsHtml}
        </div>
      </div>
    `;
  },

  // Gera o Gabarito Mestre Geral Unificado de TODAS as Faixas
  buildMasterAnswerKeyHtml: function() {
    const kyuKeys = [6, 5, 4, 3, 2, 1, 0, -1, -2];

    const sectionsHtml = kyuKeys.map(kyu => {
      const exam = this.getExamData(kyu);
      const questions = exam.questions || [...(exam.leftQuestions || []), ...(exam.rightQuestions || [])];

      const rowsHtml = questions.map(q => {
        let resp = q.expectedAnswer || '';
        if (q.type === 'image_fields') {
          resp = q.fields.map(f => `${f.label} ${f.expected}`).join(' | ');
        } else if (q.type === 'count_grid_2col') {
          resp = q.col1.map(it => `${it.num}:${it.expected}`).join(' ') + ' ' + q.col2.map(it => `${it.num}:${it.expected}`).join(' ');
        }
        return `
          <tr>
            <td style="font-weight: 900; width: 32px; text-align: center; padding: 3px 5px; font-size: 7.5pt;">Q${q.num}</td>
            <td style="font-size: 7.5pt; width: 38%; padding: 3px 5px;"><strong>${q.title}</strong></td>
            <td style="font-size: 7.5pt; color: #065F46; font-weight: 600; padding: 3px 5px;">${resp}</td>
          </tr>
        `;
      }).join('');

      return `
        <div style="page-break-inside: avoid; margin-bottom: 12px; border: 1px solid #CBD5E1; border-radius: 4px; overflow: hidden;">
          <div style="background: ${exam.headerColor || '#1E293B'}; color: #FFF; padding: 4px 10px; font-weight: 800; font-size: 8.5pt; display: flex; justify-content: space-between; align-items: center;">
            <span>🥋 ${exam.title.toUpperCase()} (${exam.targetBelt})</span>
            <span style="font-size: 7.5pt; background: rgba(255,255,255,0.2); padding: 1px 6px; border-radius: 3px;">Kata: ${exam.kataName}</span>
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
        <div class="exam-clean-header" style="border-bottom: 2px solid #D97706; padding-bottom: 6px; margin-bottom: 8px;">
          <img src="assets/images/logo-header-tkst.png" alt="TKST" class="exam-main-header-logo">
          <div class="exam-clean-title" style="color: #B45309;">GABARITO MESTRE GERAL — TODAS AS FAIXAS (6º KYU AO 3º DAN)</div>
        </div>

        <div style="margin-top: 8px;">
          ${sectionsHtml}
        </div>
      </div>
    `;
  },

  // Gera o Caderno Completo com Todas as Provas em Sequência
  buildAllExamsHtml: function(format = 'official', options = {}) {
    const kyuKeys = [6, 5, 4, 3, 2, 1, 0, -1, -2];
    return kyuKeys.map(kyu => {
      const content = format === 'quiz' 
        ? this.buildQuizExamHtml(kyu, options) 
        : this.buildOfficialExamHtml(kyu, options);
      return `<div class="exam-page-break-wrapper">${content}</div>`;
    }).join('');
  },

  // CSS de Impressão Direta A4
  getPrintStyles: function() {
    return `
      @page {
        size: A4 portrait;
        margin: 8mm 12mm 8mm 12mm;
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
        font-size: 8.5pt;
        line-height: 1.3;
      }
      .exam-sheet-a4 {
        width: 100%;
        max-width: 190mm;
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

      /* HEADER LIMPO COM LOGO DO USUÁRIO CENTRALIZADA */
      .exam-clean-header {
        text-align: center;
        margin-bottom: 5px;
        padding-bottom: 2px;
      }
      .exam-main-header-logo {
        height: 60px !important;
        max-height: 65px !important;
        width: auto !important;
        max-width: 250px !important;
        object-fit: contain !important;
        display: block !important;
        margin: 0 auto 3px auto !important;
      }
      .exam-clean-title {
        font-size: 9.5pt;
        font-weight: 900;
        letter-spacing: 0.3px;
        color: #0F172A;
        line-height: 1.15;
      }

      /* QUADRO DE ALUNO */
      .exam-print-student-box {
        border: 1.2px solid #0F172A;
        border-radius: 4px;
        padding: 4px 8px;
        margin-bottom: 4px;
        font-size: 8pt;
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
        font-size: 7pt;
        color: #334155;
        border-top: 1px dashed #CBD5E1;
        border-bottom: 1px dashed #CBD5E1;
        padding: 2px 0;
        margin-bottom: 6px;
        line-height: 1.2;
      }

      /* FLUXO VERTICAL DE QUESTÕES (UMA EMBAIXO DA OUTRA) */
      .exam-vertical-questions-flow {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .exam-vertical-q-item {
        page-break-inside: avoid;
        border-bottom: 1px dashed #E2E8F0;
        padding-bottom: 4.5px;
      }
      .exam-vertical-q-item:last-child {
        border-bottom: none;
      }

      .exam-q-title-row {
        font-size: 8.5pt;
        line-height: 1.25;
        font-weight: 700;
        color: #0F172A;
        margin-bottom: 2px;
      }

      /* MÚLTIPLA ESCOLHA EM GRID 2 COLUNAS */
      .exam-q-options-grid-2col {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 2px 12px;
        margin-top: 1px;
      }
      .exam-mcq-option {
        display: flex;
        align-items: flex-start;
        gap: 4px;
        font-size: 7.8pt;
        line-height: 1.2;
      }
      .exam-mcq-checkbox {
        font-weight: 800;
        color: #0F172A;
        flex-shrink: 0;
      }
      .exam-mcq-opt-text {
        color: #1E293B;
      }

      /* IMAGEM LADO A LADO COM ALTERNATIVAS / CAMPOS */
      .exam-q-side-row {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-top: 2px;
      }
      .exam-q-img-wrap {
        border: 1px solid #CBD5E1;
        border-radius: 3px;
        padding: 2px;
        background: #FFF;
        flex-shrink: 0;
      }
      .exam-side-img {
        height: 46px !important;
        max-height: 50px !important;
        width: auto !important;
        max-width: 80px !important;
        object-fit: contain !important;
        display: block !important;
      }
      .exam-q-fields-wrap {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 3px;
      }

      /* LINHAS DE RESPOSTA DISSERTATIVA */
      .exam-print-lines-box {
        display: flex;
        flex-direction: column;
        gap: 2px;
        margin-top: 2px;
      }
      .exam-r-prefix {
        font-weight: 900;
        font-size: 8pt;
        margin-right: 2px;
        flex-shrink: 0;
      }
      .exam-print-line {
        border-bottom: 1px solid #475569;
        height: 14px;
        width: 100%;
      }
      .exam-print-field-row {
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .exam-print-field-label {
        font-size: 7.5pt;
        font-weight: 800;
        color: #1E293B;
        white-space: nowrap;
      }

      /* CONTAGEM EM 2 SUBCOLUNAS */
      .exam-print-count-2cols {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin-top: 2px;
      }
      .exam-print-count-subcol {
        display: flex;
        flex-direction: column;
        gap: 1.5px;
      }
      .exam-print-count-item {
        display: flex;
        align-items: center;
        gap: 3px;
      }
      .exam-print-count-num {
        font-size: 7.5pt;
        font-weight: 800;
        color: #0F172A;
        width: 20px;
      }

      /* GABARITOS */
      .exam-key-card {
        page-break-inside: avoid;
        border: 1px solid #E2E8F0;
        border-left: 3px solid #10B981;
        border-radius: 4px;
        padding: 4px 6px;
        margin-bottom: 4px;
        background: #FAFAFA;
      }
      .exam-key-card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 8pt;
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
        font-size: 7pt;
        padding: 1px 5px;
        border-radius: 2px;
      }
      .exam-key-answer-box {
        font-size: 7.8pt;
        color: #1E293B;
        margin-top: 1px;
      }
      .exam-key-expl-box {
        font-size: 7.2pt;
        color: #64748B;
        font-style: italic;
      }
      .exam-key-summary-grid {
        display: grid;
        grid-template-columns: repeat(10, 1fr);
        gap: 3px;
        background: #F8FAFC;
        border: 1px solid #CBD5E1;
        padding: 4px;
        border-radius: 4px;
        margin-bottom: 8px;
      }
      .exam-key-pill {
        background: #FFF;
        border: 1px solid #10B981;
        border-radius: 3px;
        text-align: center;
        padding: 2px 1px;
      }
      .exam-key-pill-num {
        color: #64748B;
        font-size: 6.5pt;
      }
      .exam-key-pill-val {
        color: #065F46;
        font-weight: 900;
        font-size: 7.5pt;
      }

      .exam-master-key-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 7.5pt;
      }
      .exam-master-key-table td {
        border: 1px solid #CBD5E1;
        padding: 3px 5px;
        vertical-align: top;
      }
      .exam-master-key-table tr:nth-child(even) {
        background: #F8FAFC;
      }
    `;
  },

  // Impressão / Abertura de Janela de Impressão PDF
  printHtml: function(title, bodyContent) {
    const printWindow = window.open('', '_blank', 'width=950,height=850');
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
              padding: 20px 24px;
              border-radius: 6px;
              margin-bottom: 20px;
            }
            .no-print-bar {
              width: 100%;
              max-width: 190mm;
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
            <div style="font-size: 0.75rem; color: #94A3B8;">Folha A4 Completa (Vertical)</div>
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
