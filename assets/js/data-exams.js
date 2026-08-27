/**
 * TKST Alunos - Gerador Oficial de Provas Escritas e Gabaritos em PDF/Impressão (2026)
 * Suporte completo: 6º Kyu (Amarela) até 3º Dan (Sandan)
 * - Título no formato: "Avaliação teórica \n Faixa XXXX (XKyu) para Faixa XXXX (XKyu)"
 * - Sem questões de contagem de números em japonês
 * - Seleção aleatória de 10 questões por exame
 * - Alternativas uma embaixo da outra (1 por linha)
 * - Ilustrações com respostas à frente (lado a lado)
 * - Segunda folha automática com o Gabarito Oficial do Sensei
 * - Sem Cartão-Resposta e Sem Assinaturas
 */

window.TKST_OFFICIAL_EXAMS = {
  6: {
    kyu: 6,
    targetBelt: "Faixa Amarela (6º Kyu)",
    fromBelt: "Faixa Branca",
    toBelt: "Faixa Amarela",
    fromBeltWithKyu: "Faixa Branca (7º Kyu)",
    toBeltWithKyu: "Faixa Amarela (6º Kyu)",
    title: "Avaliação teórica",
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
        title: "O que significa a palavra KARATÊ-DO?",
        type: "lines",
        linesCount: 1,
        expectedAnswer: "Kara = Vazio / Te = Mão / Dō = Caminho ('Caminho das Mãos Vazias')."
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
    fromBeltWithKyu: "Faixa Amarela (6º Kyu)",
    toBeltWithKyu: "Faixa Vermelha (5º Kyu)",
    title: "Avaliação teórica",
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
        title: "Qual a diferença entre um ataque Jodan e Chudan?",
        type: "lines",
        linesCount: 1,
        expectedAnswer: "Jodan é ataque no nível alto (rosto/cabeça); Chudan é ataque no nível médio (peito/tronco)."
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
    fromBeltWithKyu: "Faixa Vermelha (5º Kyu)",
    toBeltWithKyu: "Faixa Laranja (4º Kyu)",
    title: "Avaliação teórica",
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
        title: "O que é Kime (極め) no Karatê?",
        type: "lines",
        linesCount: 1,
        expectedAnswer: "Foco, contração muscular e concentração de energia máxima no instante do impacto."
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
    fromBeltWithKyu: "Faixa Laranja (4º Kyu)",
    toBeltWithKyu: "Faixa Verde (3º Kyu)",
    title: "Avaliação teórica",
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
    fromBeltWithKyu: "Faixa Verde (3º Kyu)",
    toBeltWithKyu: "Faixa Roxa (2º Kyu)",
    title: "Avaliação teórica",
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
    fromBeltWithKyu: "Faixa Roxa (2º Kyu)",
    toBeltWithKyu: "Faixa Marrom (1º Kyu)",
    title: "Avaliação teórica",
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
    fromBeltWithKyu: "Faixa Marrom (1º Kyu)",
    toBeltWithKyu: "Faixa Preta (1º Dan - Shodan)",
    title: "Avaliação teórica",
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
    fromBeltWithKyu: "Faixa Preta (1º Dan - Shodan)",
    toBeltWithKyu: "Faixa Preta (2º Dan - Nidan)",
    title: "Avaliação teórica",
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
    fromBeltWithKyu: "Faixa Preta (2º Dan - Nidan)",
    toBeltWithKyu: "Faixa Preta (3º Dan - Sandan)",
    title: "Avaliação teórica",
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

  // Filtra e elimina questões de contagem de números
  isCountingQuestion: function(q) {
    if (!q) return false;
    if (q.type === 'count_grid_2col') return true;
    const text = (q.question || q.title || '').toLowerCase();
    if (text.includes('contagem')) return true;
    if (text.includes('conte de')) return true;
    if (text.includes('contar de')) return true;
    if (/cont(e|ar|agem)\s+(de\s+)?\d+\s*a\s*\d+/i.test(text)) return true;
    if (/n[úu]meros de \d+ a \d+/i.test(text)) return true;
    return false;
  },

  // Extrai assinatura conceitual da resposta para evitar repetições na mesma prova
  getAnswerSignature: function(ans) {
    if (!ans) return '';
    let str = String(ans).toLowerCase().trim();
    str = str.replace(/\(.*?\)/g, '').trim();
    str = str.replace(/[.,\/#!$%\^&\*;:{}=\-_`~]/g, ' ').replace(/\s+/g, ' ').trim();

    const mainKeywords = [
      'heian shodan', 'heian nidan', 'heian sandan', 'heian yondan', 'heian godan', 'tekki shodan', 'bassai dai', 'kanku dai', 'jion', 'empi', 'sochin',
      'zenkutsu', 'kokutsu', 'kiba dachi', 'fudo dachi', 'sanchin', 'hangetsu', 'kosa dachi', 'heisoku', 'musubi',
      'nukite', 'uraken', 'tetsui', 'empi uchi', 'hiji', 'shuto uke', 'gedan barai', 'age uke', 'soto uke', 'uchi uke', 'morote uke', 'kakiwake', 'juji uke', 'osae uke', 'kosa uke', 'manji uke',
      'mae geri', 'mawashi geri', 'yoko geri', 'ushiro geri', 'mikazuki', 'hiza geri', 'ura mawashi',
      'oi tsuki', 'gyaku tsuki', 'kizami', 'sanbon tsuki', 'ren zuki', 'uraken uchi', 'teisho', 'haito',
      'dojo kun', 'gichin funakoshi', 'kiai', 'kime', 'zanshin', 'bunkai', 'embusen', 'kara te'
    ];

    for (const kw of mainKeywords) {
      if (str.includes(kw)) {
        return kw;
      }
    }

    const words = str.split(' ').filter(w => w.length > 2);
    return words.slice(0, 3).join(' ');
  },

  // Mapeia o Exame Selecionado para a graduação correspondente no Banco de Questões
  getQuizBankKyuForExam: function(examKey) {
    const map = {
      '6': 7,  // Exame Branca para Amarela -> Questões do 7º Kyu (Heian Shodan)
      '5': 6,  // Exame Amarela para Vermelha -> Questões do 6º Kyu (Heian Nidan)
      '4': 5,  // Exame Vermelha para Laranja -> Questões do 5º Kyu (Heian Sandan)
      '3': 4,  // Exame Laranja para Verde -> Questões do 4º Kyu
      '2': 3,  // Exame Verde para Roxa -> Questões do 3º Kyu (Heian Yondan)
      '1': 2,  // Exame Roxa para Marrom -> Questões do 2º Kyu (Heian Godan / Tekki Shodan)
      '0': 1,  // Exame Marrom para Shodan -> Questões do 1º Kyu (Bassai Dai / Tekki Shodan)
      '-1': 0, // Exame Shodan para Nidan -> Questões do 0 (Shodan / WKF / Funakoshi)
      '-2': -1 // Exame Nidan para Sandan -> Questões do -1 (Katas Superiores)
    };
    return map[String(examKey)] !== undefined ? map[String(examKey)] : parseInt(examKey);
  },

  // Obtém 10 questões aleatórias da faixa a partir do banco de questões (excluindo contagem e respostas repetidas)
  getRandomQuizQuestionsForKyu: function(kyu, count = 10) {
    const all = window.TKST_AUTH ? window.TKST_AUTH.getCustomQuizBank() : (window.TKST_DEFAULT_QUIZ_BANK || []);
    const bankKyu = this.getQuizBankKyuForExam(kyu);

    // Filtra questões da graduação correta e remove questões de contagem
    let pool = all.filter(q => {
      if (this.isCountingQuestion(q)) return false;
      return q.kyuNumber === bankKyu;
    });

    if (pool.length === 0) {
      pool = all.filter(q => !this.isCountingQuestion(q));
    }

    // Embaralhamento seguro (Fisher-Yates)
    const shuffled = [...pool];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const selected = [];
    const seenSignatures = new Set();

    // Seleciona questões evitando respostas corretas com o mesmo conceito/texto
    for (const q of shuffled) {
      const correctText = (q.options && q.options[q.correctIndex] != null)
        ? q.options[q.correctIndex]
        : (q.id || '');
      const sig = this.getAnswerSignature(correctText);

      if (!seenSignatures.has(sig)) {
        seenSignatures.add(sig);
        const qClone = JSON.parse(JSON.stringify(q));

        // Embaralha as alternativas para balancear as letras (A, B, C, D)
        if (qClone.options && qClone.options.length > 1) {
          const correctStr = qClone.options[qClone.correctIndex || 0];
          for (let i = qClone.options.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [qClone.options[i], qClone.options[j]] = [qClone.options[j], qClone.options[i]];
          }
          qClone.correctIndex = qClone.options.indexOf(correctStr);
        }

        selected.push(qClone);
      }

      if (selected.length >= count) break;
    }

    // Se o banco for pequeno e não atingiu 10 conceitos únicos, completa com as restantes sem repetir a mesma questão
    if (selected.length < count) {
      const selectedIds = new Set(selected.map(s => s.id));
      for (const q of shuffled) {
        if (!selectedIds.has(q.id)) {
          selectedIds.add(q.id);
          const qClone = JSON.parse(JSON.stringify(q));
          if (qClone.options && qClone.options.length > 1) {
            const correctStr = qClone.options[qClone.correctIndex || 0];
            for (let i = qClone.options.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [qClone.options[i], qClone.options[j]] = [qClone.options[j], qClone.options[i]];
            }
            qClone.correctIndex = qClone.options.indexOf(correctStr);
          }
          selected.push(qClone);
        }
        if (selected.length >= count) break;
      }
    }

    return selected.slice(0, count);
  },

  // Gera HTML da Folha 1 (Prova de Múltipla Escolha)
  buildQuizExamSheetHtml: function(kyu, questions, options = {}) {
    const exam = this.getExamData(kyu);
    const dateStr = options.date || "_____/_____/2026";

    const questionsListHtml = questions.map((q, idx) => {
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
          <div class="exam-vertical-q-item">
            <div class="exam-q-title-row">
              <strong>${qNum}.</strong> ${q.question}
            </div>
            <div class="exam-q-side-row">
              <div class="exam-q-img-wrap">
                <img src="${q.image}" alt="Ilustração Técnica" class="exam-side-img">
              </div>
              <div class="exam-mcq-options-col" style="flex: 1;">
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
          <div class="exam-mcq-options-col">
            ${optionsHtml}
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="exam-sheet-a4 single-page-a4 exam-sheet-page1">
        <!-- HEADER OFICIAL COM LOGO CENTRALIZADA E TÍTULO SOLICITADO -->
        <div class="exam-clean-header">
          <img src="assets/images/logo-header-tkst.png" alt="TRADICIONAL KARATE-DO SHOTOKAN TSUYOI" class="exam-main-header-logo">
          <div class="exam-clean-title">Avaliação teórica</div>
          <div class="exam-clean-subtitle">${exam.fromBeltWithKyu} para ${exam.toBeltWithKyu}</div>
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

        <!-- 10 QUESTÕES EM FLUXO VERTICAL COM ALTERNATIVAS UMA EMBAIXO DA OUTRA -->
        <div class="exam-vertical-questions-flow">
          ${questionsListHtml}
        </div>
      </div>
    `;
  },

  // Gera HTML da Folha 2 (Gabarito Oficial do Sensei correspondente às 10 questões geradas)
  buildQuizAnswerKeySheetHtml: function(kyu, questions) {
    const exam = this.getExamData(kyu);

    const summaryPillsHtml = questions.map((q, idx) => {
      const letter = String.fromCharCode(65 + (q.correctIndex || 0));
      return `
        <div class="exam-key-pill">
          <span class="exam-key-pill-num">Q${idx + 1}:</span>
          <span class="exam-key-pill-val">${letter}</span>
        </div>
      `;
    }).join('');

    const itemsHtml = questions.map((q, idx) => {
      const letter = String.fromCharCode(65 + (q.correctIndex || 0));
      const correctText = (q.options && q.options[q.correctIndex]) || (q.options && q.options[0]) || '';
      return `
        <div class="exam-key-card">
          <div class="exam-key-card-header">
            <span class="exam-key-q-num">Questão ${idx + 1}</span>
            <span class="exam-key-correct-badge">Gabarito: [ ${letter} ]</span>
          </div>
          <div style="font-size: 8pt; color: #334155; margin-bottom: 2px;"><strong>Pergunta:</strong> ${q.question}</div>
          <div class="exam-key-answer-box"><strong>Resposta Correta:</strong> (${letter}) ${correctText}</div>
          ${q.explanation ? `<div class="exam-key-expl-box">${q.explanation}</div>` : ''}
        </div>
      `;
    }).join('');

    return `
      <div class="exam-sheet-a4 single-page-a4 exam-sheet-page2">
        <!-- HEADER DO GABARITO -->
        <div class="exam-clean-header" style="border-bottom: 2px solid #059669; padding-bottom: 4px;">
          <img src="assets/images/logo-header-tkst.png" alt="TKST" class="exam-main-header-logo">
          <div class="exam-clean-title" style="color: #059669;">GABARITO OFICIAL — AVALIAÇÃO TEÓRICA</div>
          <div class="exam-clean-subtitle" style="color: #065F46;">${exam.fromBeltWithKyu} para ${exam.toBeltWithKyu}</div>
        </div>

        <div style="background: #F0FDF4; border: 1px solid #86EFAC; padding: 4px 8px; border-radius: 4px; margin-bottom: 6px; font-size: 7.8pt; color: #166534; display: flex; justify-content: space-between; align-items: center;">
          <span><strong>Critério:</strong> Cada questão correta vale 1,0 ponto (Total: 10,0 pontos).</span>
          <span style="font-weight: 800; color: #065F46;">FOLHA DO SENSEI</span>
        </div>

        <!-- RESUMO RÁPIDO DO GABARITO (PÍLULAS) -->
        <div class="exam-key-summary-grid">
          ${summaryPillsHtml}
        </div>

        <!-- DETALHAMENTO DE CADA QUESTÃO -->
        <div style="margin-top: 6px; display: flex; flex-direction: column; gap: 4px;">
          ${itemsHtml}
        </div>
      </div>
    `;
  },

  // Gera a Prova Completa de 2 Folhas (Folha 1: Prova Sorteada + Folha 2: Gabarito Oficial)
  buildQuizExamWithKeyHtml: function(kyu, questions = null, options = {}) {
    const activeQuestions = questions || this.getRandomQuizQuestionsForKyu(kyu, 10);
    const page1Html = this.buildQuizExamSheetHtml(kyu, activeQuestions, options);
    const page2Html = this.buildQuizAnswerKeySheetHtml(kyu, activeQuestions);

    return `
      <div class="exam-print-bundle">
        <div class="exam-page-break-wrapper">
          ${page1Html}
        </div>
        <div class="exam-page-break-wrapper">
          ${page2Html}
        </div>
      </div>
    `;
  },

  // Renderiza uma lista de questões dissertativas (sem contagem)
  renderDissertativeQuestions: function(questions) {
    return questions.filter(q => !this.isCountingQuestion(q)).map(q => {
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

  // Gera HTML da Prova Oficial Dissertativa Vertical com Gabarito na Folha 2
  buildOfficialExamHtml: function(kyu, options = {}) {
    const exam = this.getExamData(kyu);
    const dateStr = options.date || "_____/_____/2026";
    const rawQuestions = exam.questions || [...(exam.leftQuestions || []), ...(exam.rightQuestions || [])];
    const questions = rawQuestions.filter(q => !this.isCountingQuestion(q));
    const questionsHtml = this.renderDissertativeQuestions(questions);

    const page1Html = `
      <div class="exam-sheet-a4 single-page-a4 exam-sheet-page1">
        <!-- HEADER OFICIAL COM LOGO CENTRALIZADA E TÍTULO SOLICITADO -->
        <div class="exam-clean-header">
          <img src="assets/images/logo-header-tkst.png" alt="TRADICIONAL KARATE-DO SHOTOKAN TSUYOI" class="exam-main-header-logo">
          <div class="exam-clean-title">Avaliação teórica</div>
          <div class="exam-clean-subtitle">${exam.fromBeltWithKyu} para ${exam.toBeltWithKyu}</div>
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

    // Gabarito Dissertativo Folha 2
    const itemsHtml = questions.map(q => {
      let expectedHtml = '';
      if (q.type === 'image_fields') {
        expectedHtml = q.fields.map(f => `<span><strong>${f.label}</strong> ${f.expected}</span>`).join(' | ');
      } else {
        expectedHtml = `<span>${(q.expectedAnswer || '').replace(/\n/g, ' ')}</span>`;
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

    const page2Html = `
      <div class="exam-sheet-a4 single-page-a4 exam-sheet-page2">
        <div class="exam-clean-header" style="border-bottom: 2px solid #059669; padding-bottom: 4px;">
          <img src="assets/images/logo-header-tkst.png" alt="TKST" class="exam-main-header-logo">
          <div class="exam-clean-title" style="color: #059669;">FOLHA DE CORREÇÃO DO SENSEI (GABARITO OFICIAL)</div>
          <div class="exam-clean-subtitle" style="color: #065F46;">${exam.fromBeltWithKyu} para ${exam.toBeltWithKyu}</div>
        </div>

        <div style="background: #F0FDF4; border: 1px solid #86EFAC; padding: 4px 8px; border-radius: 4px; margin-bottom: 8px; font-size: 8pt; color: #166534;">
          <strong>Critério:</strong> Cada questão possui valor de 1,0 ponto (Total = 10,0 pontos). Pontuar integralmente respostas com grafia aproximada ou terminologia técnica correta.
        </div>

        <div style="margin-top: 4px; display: flex; flex-direction: column; gap: 4px;">
          ${itemsHtml}
        </div>
      </div>
    `;

    return `
      <div class="exam-print-bundle">
        <div class="exam-page-break-wrapper">
          ${page1Html}
        </div>
        <div class="exam-page-break-wrapper">
          ${page2Html}
        </div>
      </div>
    `;
  },

  // Gera o Gabarito Mestre Geral Unificado de TODAS as Faixas
  buildMasterAnswerKeyHtml: function() {
    const kyuKeys = [6, 5, 4, 3, 2, 1, 0, -1, -2];

    const sectionsHtml = kyuKeys.map(kyu => {
      const exam = this.getExamData(kyu);
      const rawQuestions = exam.questions || [...(exam.leftQuestions || []), ...(exam.rightQuestions || [])];
      const questions = rawQuestions.filter(q => !this.isCountingQuestion(q));

      const rowsHtml = questions.map(q => {
        let resp = q.expectedAnswer || '';
        if (q.type === 'image_fields') {
          resp = q.fields.map(f => `${f.label} ${f.expected}`).join(' | ');
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
            <span>🥋 Avaliação teórica — ${exam.fromBeltWithKyu} para ${exam.toBeltWithKyu}</span>
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
  buildAllExamsHtml: function(format = 'quiz', options = {}) {
    const kyuKeys = [6, 5, 4, 3, 2, 1, 0, -1, -2];
    return kyuKeys.map(kyu => {
      const content = format === 'official'
        ? this.buildOfficialExamHtml(kyu, options)
        : this.buildQuizExamWithKeyHtml(kyu, null, options);
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
        min-height: 270mm;
        box-sizing: border-box;
      }
      .exam-page-break-wrapper {
        page-break-after: always;
        page-break-inside: avoid;
      }
      .exam-page-break-wrapper:last-child {
        page-break-after: auto;
      }

      /* HEADER LIMPO COM LOGO CENTRALIZADA E TÍTULO EM 2 LINHAS */
      .exam-clean-header {
        text-align: center;
        margin-bottom: 4px;
        padding-bottom: 2px;
      }
      .exam-main-header-logo {
        height: 58px !important;
        max-height: 62px !important;
        width: auto !important;
        max-width: 250px !important;
        object-fit: contain !important;
        display: block !important;
        margin: 0 auto 2px auto !important;
        background: transparent !important;
      }
      .exam-clean-title {
        font-size: 10pt;
        font-weight: 900;
        letter-spacing: 0.3px;
        color: #0F172A;
        line-height: 1.15;
      }
      .exam-clean-subtitle {
        font-size: 8.8pt;
        font-weight: 800;
        color: #B45309;
        line-height: 1.2;
        margin-top: 1px;
      }

      /* QUADRO DE ALUNO */
      .exam-print-student-box {
        border: 1.2px solid #0F172A;
        border-radius: 4px;
        padding: 3px 8px;
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
        font-size: 6.8pt;
        color: #334155;
        border-top: 1px dashed #CBD5E1;
        border-bottom: 1px dashed #CBD5E1;
        padding: 2px 0;
        margin-bottom: 5px;
        line-height: 1.15;
      }

      /* FLUXO VERTICAL DE QUESTÕES */
      .exam-vertical-questions-flow {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }

      .exam-vertical-q-item {
        page-break-inside: avoid;
        border-bottom: 1px dashed #E2E8F0;
        padding-bottom: 3.5px;
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

      /* MÚLTIPLA ESCOLHA: ALTERNATIVAS UMA EMBAIXO DA OUTRA */
      .exam-mcq-options-col {
        display: flex;
        flex-direction: column;
        gap: 1.5px;
        margin-top: 2px;
      }
      .exam-mcq-option {
        display: flex;
        align-items: baseline;
        gap: 6px;
        font-size: 7.8pt;
        line-height: 1.25;
        white-space: normal;
      }
      .exam-mcq-checkbox {
        font-weight: 800;
        color: #0F172A;
        flex-shrink: 0;
        font-family: monospace, sans-serif;
      }
      .exam-mcq-opt-text {
        color: #1E293B;
      }

      /* ILUSTRAÇÃO LADO A LADO: IMAGEM À ESQUERDA, RESPOSTAS À FRENTE */
      .exam-q-side-row {
        display: flex;
        align-items: center;
        gap: 14px;
        margin-top: 2px;
      }
      .exam-q-img-wrap {
        border: 1px solid #CBD5E1;
        border-radius: 4px;
        padding: 2px;
        background: #FFF;
        flex-shrink: 0;
      }
      .exam-side-img {
        height: 52px !important;
        max-height: 56px !important;
        width: auto !important;
        max-width: 90px !important;
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

      /* GABARITOS */
      .exam-key-card {
        page-break-inside: avoid;
        border: 1px solid #E2E8F0;
        border-left: 3px solid #10B981;
        border-radius: 4px;
        padding: 3.5px 6px;
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
        margin-bottom: 6px;
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
            .exam-print-bundle {
              width: 100%;
              max-width: 190mm;
              display: flex;
              flex-direction: column;
              gap: 20px;
            }
            .exam-sheet-a4 {
              box-shadow: 0 8px 30px rgba(0,0,0,0.5);
              padding: 20px 24px;
              border-radius: 6px;
              background: #FFF;
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
            .exam-print-bundle {
              display: block !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="no-print-bar">
          <div>
            <strong style="font-size: 0.95rem;">📄 ${title}</strong>
            <div style="font-size: 0.75rem; color: #94A3B8;">Folha 1: Prova • Folha 2: Gabarito Oficial</div>
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
