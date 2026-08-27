/**
 * TKST Alunos - Gerador Oficial de Provas Escritas e Gabaritos em PDF/Impressão (2026)
 * Suporte completo a todas as graduações: 6º Kyu (Amarela) até 3º Dan (Sandan)
 * Modelos Oficiais Dissertativos (com imagens, contagem e Dojo Kun) + Modelos Múltipla Escolha
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
        title: "Qual o Kata que você deve aprender e apresentar na sua Faixa?",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "Heian Shodan (Paz e Tranquilidade Nível 1)."
      },
      {
        num: 2,
        title: "Qual o nome em japonês das 3 alturas de ataque e defesa?",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "Jodan (Alto / Rosto), Chudan (Médio / Tronco/Plexo) e Gedan (Baixo / Abaixo da cintura)."
      },
      {
        num: 3,
        title: "Descreva o Golpe e a Base da imagem abaixo:",
        type: "image_fields",
        image: "assets/images/exames/branca_img1.png",
        fallbackImage: "assets/images/tecnicas/oi-tsuki.svg",
        fields: [
          { label: "Ataque / Golpe:", expected: "Oi Tsuki Chudan (Soco direto em avanço)" },
          { label: "Base:", expected: "Zenkutsu Dachi (Base frontal de avanço - 70% peso na frente)" }
        ]
      },
      {
        num: 4,
        title: "Qual o nome do Chute da imagem abaixo?",
        type: "image_lines",
        image: "assets/images/exames/branca_img2.png",
        fallbackImage: "assets/images/tecnicas/mae-geri.svg",
        linesCount: 2,
        expectedAnswer: "Mae Geri Chudan / Mae Geri Kekomi (Chute frontal com a bola do pé - Koshi)."
      },
      {
        num: 5,
        title: "Qual o nome da Defesa da imagem abaixo?",
        type: "image_lines",
        image: "assets/images/exames/branca_img3.png",
        fallbackImage: "assets/images/tecnicas/jodan-age-uke.svg",
        linesCount: 2,
        expectedAnswer: "Jodan Age Uke (Defesa alta ascendente) ou Gedan Barai (Defesa baixa)."
      },
      {
        num: 6,
        title: "Cite 1 princípio do Dojô Kun:",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "Hitotsu! Jinkaku kansei ni tsutomuru koto! (Esforçar-se para a formação do caráter) — ou qualquer um dos outros 4 princípios oficiais."
      },
      {
        num: 7,
        title: "Qual o nome do 8º movimento do Kata Heian Shodan (onde se desfere o 1º Kiai)?",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "Jodan Age Uke com KIAI! (Terceiro avanço de defesa alta no corredor central)."
      },
      {
        num: 8,
        title: "Conte de 1 a 10 em Japonês:",
        type: "count_grid",
        range: "1 a 10",
        items: [
          { num: "1", expected: "Ichi" },
          { num: "2", expected: "Ni" },
          { num: "3", expected: "San" },
          { num: "4", expected: "Shi / Yon" },
          { num: "5", expected: "Go" },
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
        linesCount: 4,
        expectedAnswer: "Resposta pessoal e reflexiva do aluno avaliando sua dedicação, respeito aos colegas e motivação com a arte marcial."
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
        title: "Qual o Kata que você deve aprender e apresentar na sua Faixa?",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "Heian Nidan (Paz e Tranquilidade Nível 2)."
      },
      {
        num: 2,
        title: "Qual o nome em japonês do lado esquerdo e direito?",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "Hidari (Esquerdo) e Migi (Direito)."
      },
      {
        num: 3,
        title: "Descreva a Técnica e a Base da imagem abaixo:",
        type: "image_fields",
        image: "assets/images/exames/amarela_img1.png",
        fallbackImage: "assets/images/tecnicas/kokutsu-dachi.svg",
        fields: [
          { label: "Defesa / Técnica:", expected: "Kokutsu Dachi Shuto Uke (Defesa com a faca da mão)" },
          { label: "Base:", expected: "Kokutsu Dachi (Base recuada - 70% peso atrás, 30% na frente)" }
        ]
      },
      {
        num: 4,
        title: "Qual o nome do Chute da imagem abaixo?",
        type: "image_lines",
        image: "assets/images/exames/amarela_img2.png",
        fallbackImage: "assets/images/tecnicas/mawashi-geri.svg",
        linesCount: 2,
        expectedAnswer: "Mawashi Geri Chudan/Jodan (Chute circular com o peito do pé/Haisoku ou Koshi)."
      },
      {
        num: 5,
        title: "Qual o nome da Defesa da imagem abaixo?",
        type: "image_lines",
        image: "assets/images/exames/amarela_img3.png",
        fallbackImage: "assets/images/tecnicas/zenkutsu-dachi.svg",
        linesCount: 2,
        expectedAnswer: "Soto Uke Chudan (Defesa média de fora para dentro) ou Uchi Uke (De dentro para fora)."
      },
      {
        num: 6,
        title: "Cite 2 princípios do Dojô Kun:",
        type: "lines",
        linesCount: 3,
        expectedAnswer: "1) Hitotsu! Jinkaku kansei ni tsutomuru koto (Esforçar-se para a formação do caráter)\n2) Hitotsu! Makoto no michi o mamoru koto (Fidelidade para com o verdadeiro caminho da razão)"
      },
      {
        num: 7,
        title: "Qual o nome do 4º movimento do Kata Heian Nidan?",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "Uraken Uchi (Golpe com as costas do punho) / Tetsui Uchi com giro."
      },
      {
        num: 8,
        title: "Conte de 11 a 20 em Japonês:",
        type: "count_grid",
        range: "11 a 20",
        items: [
          { num: "11", expected: "Ju-Ichi" },
          { num: "12", expected: "Ju-Ni" },
          { num: "13", expected: "Ju-San" },
          { num: "14", expected: "Ju-Shi / Ju-Yon" },
          { num: "15", expected: "Ju-Go" },
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
        linesCount: 4,
        expectedAnswer: "Resposta pessoal e reflexiva do aluno avaliando seus objetivos, disciplina e evolução no Dojô."
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
        title: "Qual o Kata que você deve aprender e apresentar na sua Faixa?",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "Heian Sandan (Paz e Tranquilidade Nível 3)."
      },
      {
        num: 2,
        title: "Cite 2 Defesas em Japonês:",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "Ex: Age Uke (Defesa alta), Gedan Barai (Defesa baixa), Soto Uke, Uchi Uke, Shuto Uke ou Morote Uke."
      },
      {
        num: 3,
        title: "Descreva o Golpe e a Base da imagem abaixo:",
        type: "image_fields",
        image: "assets/images/exames/vermelha_img1.png",
        fallbackImage: "assets/images/tecnicas/kiba-dachi.svg",
        fields: [
          { label: "Defesa / Golpe:", expected: "Morote Uke Chudan / Empi Uchi (Cotovelada)" },
          { label: "Base:", expected: "Kiba Dachi (Base do cavaleiro - 50% / 50% de peso paralelo)" }
        ]
      },
      {
        num: 4,
        title: "Qual o nome do Chute da imagem abaixo?",
        type: "image_lines",
        image: "assets/images/exames/vermelha_img2.png",
        fallbackImage: "assets/images/tecnicas/yoko-geri.svg",
        linesCount: 2,
        expectedAnswer: "Yoko Geri Kekomi / Yoko Geri Keage (Chute lateral com a faca do pé - Sokuto)."
      },
      {
        num: 5,
        title: "Qual o nome do Ataque da imagem abaixo?",
        type: "image_lines",
        image: "assets/images/exames/vermelha_img3.png",
        fallbackImage: "assets/images/tecnicas/gyaku-tsuki.png",
        linesCount: 2,
        expectedAnswer: "Gyaku Tsuki Chudan (Soco contrário à perna que está na frente em Zenkutsu Dachi)."
      },
      {
        num: 6,
        title: "Cite 3 princípios do Dojô Kun:",
        type: "lines",
        linesCount: 3,
        expectedAnswer: "1) Formação do caráter (Jinkaku kansei ni tsutomuru koto)\n2) Fidelidade ao verdadeiro caminho da razão (Makoto no michi o mamoru koto)\n3) Criar o espírito de esforço e perseverança (Doryoku no seishin o yashinau koto)"
      },
      {
        num: 7,
        title: "Qual o nome do 6º movimento do Kata Heian Sandan?",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "Chudan Morote Uke em base Kiba Dachi ou Chudan Uchi Uke com contra-golpe."
      },
      {
        num: 8,
        title: "Conte de 21 a 30 em Japonês:",
        type: "count_grid",
        range: "21 a 30",
        items: [
          { num: "21", expected: "Ni-Ju-Ichi" },
          { num: "22", expected: "Ni-Ju-Ni" },
          { num: "23", expected: "Ni-Ju-San" },
          { num: "24", expected: "Ni-Ju-Shi / Ni-Ju-Yon" },
          { num: "25", expected: "Ni-Ju-Go" },
          { num: "26", expected: "Ni-Ju-Roku" },
          { num: "27", expected: "Ni-Ju-Shichi / Ni-Ju-Nana" },
          { num: "28", expected: "Ni-Ju-Hachi" },
          { num: "29", expected: "Ni-Ju-Ku / Ni-Ju-Kyu" },
          { num: "30", expected: "San-Ju" }
        ]
      },
      {
        num: 9,
        title: "Qual a importância do Karatê para você?",
        type: "essay",
        linesCount: 4,
        expectedAnswer: "Resposta pessoal do aluno destacando o autocontrole, respeito, autoconfiança e foco pessoal."
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
        title: "Qual o Kata oficial exigido no exame de Faixa Laranja para Faixa Verde?",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "Heian Yondan (Paz e Tranquilidade Nível 4)."
      },
      {
        num: 2,
        title: "Cite 3 Bases fundamentais em Japonês e a distribuição percentual de peso de cada uma:",
        type: "lines",
        linesCount: 3,
        expectedAnswer: "1) Zenkutsu Dachi: 70% frente, 30% trás\n2) Kokutsu Dachi: 70% trás, 30% frente\n3) Kiba Dachi: 50% / 50% paralelo com joelhos abertos"
      },
      {
        num: 3,
        title: "Descreva a técnica dos dois primeiros movimentos do Kata Heian Yondan:",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "Haiwan Morote Jodan Uke / Morote Kakiwake Uke executado lentamente em base Kokutsu Dachi."
      },
      {
        num: 4,
        title: "Qual a diferença técnica e mecânica entre Yoko Geri Kekomi e Yoko Geri Keage?",
        type: "lines",
        linesCount: 3,
        expectedAnswer: "Kekomi: chute lateral penetrante/empurrado com o calcanhar/Sokuto. Keage: chute lateral ascendente rápido e chicoteado com a faca do pé."
      },
      {
        num: 5,
        title: "O que é Kihon Ippon Kumite e qual o objetivo do seu treino?",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "Combate pré-determinado de 1 passo em postura de combate (Jiyu no Kamae), visando precisão, distância (Ma-ai), esquiva e contra-ataque decisivo com Kiai."
      },
      {
        num: 6,
        title: "Cite 4 princípios do Dojô Kun:",
        type: "lines",
        linesCount: 4,
        expectedAnswer: "1) Formação do caráter\n2) Fidelidade ao verdadeiro caminho da razão\n3) Criar o espírito de esforço e perseverança\n4) Respeito acima de tudo (Reigi o omonzuru koto)"
      },
      {
        num: 7,
        title: "Descreva a sequência do golpe de joelhada (Hiza Geri) no Kata Heian Yondan:",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "Puxada com as duas mãos na cabeça do oponente (Morote Tsukami) trazendo-o contra a joelhada explosiva (Hiza Geri)."
      },
      {
        num: 8,
        title: "Traduza os seguintes termos de movimentação: Mae, Sagate, Mawate e Yame:",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "Mae = Avançar para frente; Sagate = Recuar para trás; Mawate = Girar/Virar; Yame = Parar/Retornar à posição inicial."
      },
      {
        num: 9,
        title: "Como a disciplina e concentração do Karatê auxiliam nos seus estudos, trabalho e vida pessoal?",
        type: "essay",
        linesCount: 4,
        expectedAnswer: "Dissertação reflexiva do aluno relacionando perseverança, pontualidade, resiliência e foco no cotidiano."
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
        title: "Qual o Kata oficial exigido no exame de Faixa Verde para Faixa Roxa (2º Kyu)?",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "Heian Godan (Paz e Tranquilidade Nível 5)."
      },
      {
        num: 2,
        title: "O que significam os conceitos fundamentais: Kiai, Kime e Zanshin?",
        type: "lines",
        linesCount: 3,
        expectedAnswer: "Kiai: união da energia física e espiritual através do grito.\nKime: foco e contração máxima instantânea no ponto de impacto.\nZanshin: estado de alerta e prontidão contínua após a finalização da técnica."
      },
      {
        num: 3,
        title: "Descreva a execução do salto (Tobi) do Kata Heian Godan e sua recepção:",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "Salto giratório esquivando de rasteira ou ataque baixo, caindo em base cruzada (Kosa Dachi) com defesa dupla baixa em cruz (Gedan Juji Uke) e Kiai."
      },
      {
        num: 4,
        title: "Descreva os chutes Ushiro Geri e Mikazuki Geri:",
        type: "lines",
        linesCount: 3,
        expectedAnswer: "Ushiro Geri: chute reto para trás com o calcanhar, alinhando quadril e visão.\nMikazuki Geri: chute semicircular ascendente com a sola do pé (como no movimento contra a palma da mão no Heian Godan)."
      },
      {
        num: 5,
        title: "O que significa o termo Bunkai (分解) no estudo avançado dos Katas?",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "Bunkai é a desmontagem, estudo e aplicação prática real de cada movimento do Kata contra um ou mais oponentes."
      },
      {
        num: 6,
        title: "Escreva os 5 princípios completos do Dojô Kun:",
        type: "lines",
        linesCount: 5,
        expectedAnswer: "1) Hitotsu! Jinkaku kansei ni tsutomuru koto (Esforçar-se para a formação do caráter)\n2) Hitotsu! Makoto no michi o mamoru koto (Fidelidade para com o verdadeiro caminho da razão)\n3) Hitotsu! Doryoku no seishin o yashinau koto (Criar o espírito de esforço e perseverança)\n4) Hitotsu! Reigi o omonzuru koto (Respeito acima de tudo)\n5) Hitotsu! Kekki no yū o imashimuru koto (Conter o espírito de agressão e violência desmedida)"
      },
      {
        num: 7,
        title: "O que é Jiyu Ippon Kumite e como ele prepara o karateca para o combate livre?",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "Combate semi-livre de um único ataque anunciado, onde atacante e defensor se movimentam soltos em Kamae, trabalhando tempo de reação real, distância dinâmica e esquiva."
      },
      {
        num: 8,
        title: "Traduza os comandos tradicionais do Dojo: Mokuso, Sensei ni Rei, Senpai ni Rei e Otagai ni Rei:",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "Mokuso = Meditação/Fechamento dos olhos; Sensei ni Rei = Saudação ao Professor; Senpai ni Rei = Saudação aos Graduados; Otagai ni Rei = Saudação mútua entre todos."
      },
      {
        num: 9,
        title: "Como você aplica o quinto princípio do Dojô Kun ('Conter o espírito de agressão') fora do Dojô?",
        type: "essay",
        linesCount: 4,
        expectedAnswer: "Reflexão sobre inteligência emocional, paciência, prevenção de conflitos e uso das artes marciais exclusivamente para defesa e preservação da paz."
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
        title: "Quais os Katas oficiais exigidos no exame de Faixa Roxa para Marrom (1º Kyu)?",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "Tekki Shodan (Cavaleiro de Ferro Nível 1) e Bassai Dai (Romper a Fortaleza / Destruir as muralhas)."
      },
      {
        num: 2,
        title: "Descreva a particularidade do Embusen e da base do Kata Tekki Shodan:",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "O Embusen é totalmente linear lateral (linha reta horizontal) e 100% executado em base Kiba Dachi, simulando combate em espaços estreitos."
      },
      {
        num: 3,
        title: "Explique os 3 conceitos de timing e iniciativa em combate: Sen no Sen, Go no Sen e Sen Sen no Sen:",
        type: "lines",
        linesCount: 3,
        expectedAnswer: "Go no Sen: defesa e contra-ataque logo após o ataque do oponente.\nSen no Sen: contra-ataque no exato instante em que o adversário inicia o golpe (encontro).\nSen Sen no Sen: antecipação e ataque antes mesmo que o adversário inicie a ação física (domínio da intenção)."
      },
      {
        num: 4,
        title: "Quem foi o Mestre Gichin Funakoshi e qual a importância histórica do Shotokan?",
        type: "lines",
        linesCount: 3,
        expectedAnswer: "O Pai do Karatê Moderno. Trouxe o Karatê de Okinawa para as universidades do Japão, introduziu o sistema de faixas/Kyu-Dan, o Dojô Kun e transformou o Jutsu (arte de combate) em Dō (caminho de desenvolvimento filosófico)."
      },
      {
        num: 5,
        title: "O que significa o preceito 'Karate ni sente nashi' (空手に先手なし)?",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "'No Karatê não existe atitude ofensiva inicial'. O karateca nunca ataca primeiro sem provocação ou perigo iminente; o Karatê é essencialmente uma arte de legítima defesa e respeito à vida."
      },
      {
        num: 6,
        title: "Quais são os 4 Sentei Katas (Katas Fundamentais Superiores) do estilo Shotokan?",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "Bassai Dai, Kanku Dai, Jion e Empi."
      },
      {
        num: 7,
        title: "Descreva a postura Fudo Dachi (Sochin Dachi) e qual sua vantagem em combate:",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "Base enraizada e inabalável que combina a estabilidade frontal do Zenkutsu Dachi com a firmeza lateral do Kiba Dachi (peso 50/50 flexionado), ideal para bloqueios pesados e contra-ataques vigorosos."
      },
      {
        num: 8,
        title: "Escreva os 5 princípios do Dojô Kun e disserte sobre o significado do termo inicial 'Hitotsu':",
        type: "lines",
        linesCount: 4,
        expectedAnswer: "5 princípios + explicação: 'Hitotsu' significa 'Primeiro/Item 1', reforçando que todos os cinco preceitos têm o mesmo peso máximo, não havendo hierarquia secundária entre eles."
      },
      {
        num: 9,
        title: "O que a graduação de Faixa Marrom (1º Kyu) representa na sua jornada rumo à Faixa Preta?",
        type: "essay",
        linesCount: 4,
        expectedAnswer: "Dissertação do aluno avaliando maturidade técnica, responsabilidade de liderança perante os menos graduados (Kohai) e preparação física/mental para o Shodan."
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
        title: "Quais os 9 Katas exigidos no currículo oficial de avaliação para Faixa Preta (Shodan) da TKST?",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "5 Heian (Shodan, Nidan, Sandan, Yondan e Godan), Tekki Shodan, Bassai Dai, Kanku Dai e Jion (com domínio do Bunkai de cada um)."
      },
      {
        num: 2,
        title: "Explique o princípio supremo 'Ikken Hissatsu' (一拳必殺) e sua interpretação no Karatê-Dō moderno:",
        type: "lines",
        linesCount: 3,
        expectedAnswer: "'Determinar a vitória com um único golpe decisivo'. Não estimula a violência, mas sim a máxima concentração de intenção, precisão anatômica, biomecânica perfeita e compromisso com cada técnica executada."
      },
      {
        num: 3,
        title: "Descreva a importância biomecânica da rotação do quadril (Koshi no Kaiten) e do centro de gravidade (Hara / Tanden):",
        type: "lines",
        linesCount: 3,
        expectedAnswer: "O Tanden (dois dedos abaixo do umbigo) é o centro gerador de força. A rotação do quadril aliada à respiração e fixação da base transmite a força do solo através do corpo até o ponto de contato no impacto."
      },
      {
        num: 4,
        title: "Cite e explique 3 dos 20 preceitos do Mestre Funakoshi (Shōtōkan Nijūkun):",
        type: "lines",
        linesCount: 3,
        expectedAnswer: "Exemplos: 1) O Karatê começa e termina com respeito (Rei); 2) O Karatê não é apenas no Dojo, aplica-se a toda a vida; 3) O Karatê é como água fervente: se você não aquecê-la constantemente, ela esfria."
      },
      {
        num: 5,
        title: "Descreva a postura mental e técnica exigida durante o Jiyu Kumite de Exame de Faixa Preta:",
        type: "lines",
        linesCount: 3,
        expectedAnswer: "Postura ereta e vigilante (Zanshin), controle absoluto de impacto (Sun-dome / controle de contato), respeito irrepreensível ao parceiro, variedade técnica e explosão com Kiai limpo."
      },
      {
        num: 6,
        title: "Explique a diferença entre Karatê-Jutsu (arte técnica de combate) e Karatê-Dō (caminho de vida):",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "Jutsu foca puramente na eficácia marcial e destruição do inimigo. Dō foca no autodesenvolvimento, na formação do caráter, na ética, na fraternidade e no aperfeiçoamento humano contínuo."
      },
      {
        num: 7,
        title: "Quais os pontos vitais prioritários (Kyusho) em situações reais de defesa pessoal (Goshin Jutsu)?",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "Olhos, garganta/traqueia, têmpora, carótida, queixo, plexo solar, costelas flutuantes, genitais e articulações dos joelhos."
      },
      {
        num: 8,
        title: "Qual o papel e dever ético de um Shodan perante o Dojo, o Sensei e os alunos iniciantes?",
        type: "lines",
        linesCount: 3,
        expectedAnswer: "Ser exemplo vivo de humildade, pontualidade, disciplina e paciência. Apoiar o Sensei nas instruções, acolher os novatos sem arrogância e compreender que o Shodan é apenas o início do verdadeiro aprendizado."
      },
      {
        num: 9,
        title: "Redija uma dissertação sobre sua transformação pessoal através do Karatê e seu compromisso como Faixa Preta:",
        type: "essay",
        linesCount: 5,
        expectedAnswer: "Dissertação avaliativa do candidato expressando maturidade ética, fidelidade à linhagem TKST e visão de futuro nas artes marciais."
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
        title: "Quais Katas compõem o rol de avaliação para graduação de Nidan (2º Dan)?",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "Empi, Jitte, Hangetsu, Gankaku e Kanku Sho (com Bunkai avançado e aplicações de autodefesa)."
      },
      {
        num: 2,
        title: "Explique os princípios respiratórios Ibuki / Nogare e sua sincronização com o Kime:",
        type: "lines",
        linesCount: 3,
        expectedAnswer: "Ibuki: respiração sonora diafragmática curta de contração máxima. Nogare: respiração suave e oculta de restauração energética e calma mental."
      },
      {
        num: 3,
        title: "Descreva a metodologia de ensino (Shido) e pedagogia para transmissão de Kihon aos alunos infantis e adultos:",
        type: "lines",
        linesCount: 3,
        expectedAnswer: "Adequação de linguagem, correção postural sem desmotivar, ênfase na segurança articular, repetição consciente e reforço positivo dos valores do Dojô Kun."
      },
      {
        num: 4,
        title: "Disserte sobre as regras oficiais de arbitragem (Shiai Kumite e Shiai Kata) da WKF e CBK:",
        type: "lines",
        linesCount: 3,
        expectedAnswer: "Critérios de Ippon, Waza-ari e Yuko; controle de contato, penalidades (C1 / C2 - Jogai, Mubobi, etc.), critérios de pontuação técnica e atlética no Kata."
      },
      {
        num: 5,
        title: "Redija uma reflexão sobre a responsabilidade técnica e moral do 2º Dan na preservação da tradição do Shotokan:",
        type: "essay",
        linesCount: 5,
        expectedAnswer: "Dissertação do candidato a Nidan sobre lealdade marcial, aperfeiçoamento contínuo e liderança ética no Dojô."
      }
    ]
  },

  "-2": {
    kyu: -2,
    targetBelt: "Sandan (3º Dan - Sensei / Mestre Titular)",
    fromBelt: "Nidan (2º Dan)",
    toBelt: "Sandan (3º Dan)",
    title: "Exame Oficial para Sandan (3º Dan)",
    color: "#020617",
    headerColor: "#020617",
    kataName: "Katas Mestres Sandan",
    questions: [
      {
        num: 1,
        title: "Quais os Katas mestres avaliados no exame de Sandan (3º Dan)?",
        type: "lines",
        linesCount: 2,
        expectedAnswer: "Sochin, Nijushiho, Meikyo, Unsu e Gojushiho Dai/Sho (com domínio profundo de Bunkai e Oyo)."
      },
      {
        num: 2,
        title: "Explique a tríade marcial Shin - Gi - Tai (Mente/Espírito - Técnica - Corpo) e sua integração no Sandan:",
        type: "lines",
        linesCount: 3,
        expectedAnswer: "Shin: maturidade espiritual, calma e sabedoria. Gi: maestria técnica apurada e refinada. Tai: condicionamento físico, saúde e eficiência biomecânica harmonizada."
      },
      {
        num: 3,
        title: "Qual a responsabilidade de um Sensei Titular na gestão de um Dojô e na formação moral da comunidade?",
        type: "lines",
        linesCount: 3,
        expectedAnswer: "Ser guardião dos valores do Karatê-Dō, construir um ambiente seguro e inclusivo, formar cidadãos exemplares e manter a integridade da linhagem marcial."
      },
      {
        num: 4,
        title: "Redija um projeto ou dissertação sobre o papel educacional e social do Karatê Shotokan na sociedade contemporânea:",
        type: "essay",
        linesCount: 6,
        expectedAnswer: "Monografia/Dissertação do candidato a Sandan demonstrando visão profunda da arte marcial como instrumento de transformação social e humana."
      }
    ]
  }
};

window.TKST_EXAM_GENERATOR = {
  // Retorna os dados do exame
  getExamData: function(kyu) {
    return window.TKST_OFFICIAL_EXAMS[kyu] || window.TKST_OFFICIAL_EXAMS[6];
  },

  // Retorna questões do simulado para o formato múltipla escolha
  getQuizQuestionsForKyu: function(kyu) {
    const all = window.TKST_AUTH ? window.TKST_AUTH.getCustomQuizBank() : (window.TKST_DEFAULT_QUIZ_BANK || []);
    return all.filter(q => q.kyuNumber === parseInt(kyu));
  },

  // Gera HTML da prova oficial (Dissertativa / Padrão Word com imagens)
  buildOfficialExamHtml: function(kyu, options = {}) {
    const exam = this.getExamData(kyu);
    const dateStr = options.date || "_____/_____/2026";
    const dojoName = options.dojo || "TKST - Tradicional Karate-Do Shotokan Tsuyoi";
    const senseiName = options.sensei || "Sensei Diego Albino (Faixa Preta - 3º Dan)";

    let questionsHtml = exam.questions.map(q => {
      let bodyHtml = '';

      if (q.type === 'lines') {
        const lines = Array(q.linesCount || 2).fill('<div class="exam-print-line"></div>').join('');
        bodyHtml = `<div class="exam-print-lines-box"><strong>R.:</strong> ${lines}</div>`;
      } else if (q.type === 'essay') {
        const lines = Array(q.linesCount || 4).fill('<div class="exam-print-line"></div>').join('');
        bodyHtml = `<div class="exam-print-lines-box" style="margin-top: 4px;"><strong>R.:</strong> ${lines}</div>`;
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
              <img src="${imgSrc}" alt="Técnica Ilustrativa" class="exam-print-img" onerror="this.src='${q.fallbackImage}'">
            </div>
            <div class="exam-print-fields-col">
              ${fieldsHtml}
            </div>
          </div>
        `;
      } else if (q.type === 'image_lines') {
        const imgSrc = q.image || q.fallbackImage;
        const lines = Array(q.linesCount || 2).fill('<div class="exam-print-line"></div>').join('');

        bodyHtml = `
          <div class="exam-print-img-row">
            <div class="exam-print-img-wrapper">
              <img src="${imgSrc}" alt="Técnica Ilustrativa" class="exam-print-img" onerror="this.src='${q.fallbackImage}'">
            </div>
            <div class="exam-print-fields-col">
              <strong>R.:</strong>
              ${lines}
            </div>
          </div>
        `;
      } else if (q.type === 'count_grid') {
        const gridItems = q.items.map(it => `
          <div class="exam-print-count-item">
            <span class="exam-print-count-num">${it.num}-</span>
            <div class="exam-print-line" style="flex: 1;"></div>
          </div>
        `).join('');

        bodyHtml = `
          <div class="exam-print-count-grid">
            ${gridItems}
          </div>
        `;
      }

      return `
        <div class="exam-print-question-card">
          <div class="exam-print-q-header">
            <span class="exam-print-q-num">Questão ${q.num}.</span>
            <span class="exam-print-q-text">${q.title}</span>
          </div>
          ${bodyHtml}
        </div>
      `;
    }).join('');

    return `
      <div class="exam-sheet-a4">
        <!-- HEADER OFICIAL DA TKST -->
        <div class="exam-print-header">
          <img src="assets/images/logo-tkst-clean.png" alt="TKST Logo" class="exam-print-logo" onerror="this.src='assets/images/logo-tkst.png'">
          <div class="exam-print-header-center">
            <div class="exam-print-assoc">TRADICIONAL KARATE-DO SHOTOKAN TSUYOI (TKST)</div>
            <div class="exam-print-subtitle">AVALIAÇÃO TEÓRICA OFICIAL DE GRADUAÇÃO</div>
            <div class="exam-print-exam-title">${exam.title.toUpperCase()} — (${exam.targetBelt.toUpperCase()})</div>
          </div>
          <img src="assets/images/tigre.png" alt="Shotokan Tiger" class="exam-print-logo-tiger" onerror="this.style.display='none'">
        </div>

        <!-- QUADRO DE DADOS DO ALUNO E AVALIAÇÃO -->
        <div class="exam-print-student-box">
          <div class="exam-print-row">
            <div style="flex: 2.5;"><strong>Nome do Aluno(a):</strong> ________________________________________________________________</div>
            <div style="flex: 1;"><strong>Data:</strong> ${dateStr}</div>
          </div>
          <div class="exam-print-row" style="margin-top: 5px;">
            <div style="flex: 1.8;"><strong>Dojo / Unidade:</strong> ${dojoName}</div>
            <div style="flex: 1.2;"><strong>Sensei Examinador:</strong> ${senseiName}</div>
            <div style="flex: 0.8; text-align: right; background: #F1F5F9; border: 1px solid #CBD5E1; padding: 2px 8px; border-radius: 4px;">
              <strong>Nota:</strong> _____ / 10,0
            </div>
          </div>
        </div>

        <!-- CITAÇÃO FILOSÓFICA DO MESTRE FUNAKOSHI -->
        <div class="exam-print-quote">
          "O objetivo final do Karatê não está na vitória ou na derrota, mas na perfeição do caráter de seus participantes."
          <br><strong>— Gichin Funakoshi (Pai do Karatê-Dō Moderno)</strong>
        </div>

        <!-- CORPO DE QUESTÕES -->
        <div class="exam-print-questions-container">
          ${questionsHtml}
        </div>

        <!-- ASSINATURAS E RODAPÉ -->
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

  // Gera HTML da Prova em Múltipla Escolha (10 Questões do Simulado + Cartão Resposta)
  buildQuizExamHtml: function(kyu, options = {}) {
    const exam = this.getExamData(kyu);
    const questions = this.getQuizQuestionsForKyu(kyu);
    const dateStr = options.date || "_____/_____/2026";
    const dojoName = options.dojo || "TKST - Tradicional Karate-Do Shotokan Tsuyoi";
    const senseiName = options.sensei || "Sensei Diego Albino (Faixa Preta - 3º Dan)";

    if (questions.length === 0) {
      return `<div style="padding: 30px; text-align: center; color: red;">Nenhuma questão cadastrada para esta faixa no banco de dados.</div>`;
    }

    // Grid do Cartão-Resposta no cabeçalho
    const answerCardRows = questions.map((q, idx) => `
      <div class="exam-answer-card-item">
        <span class="exam-card-q-num">${idx + 1 < 10 ? '0' + (idx + 1) : (idx + 1)}</span>
        <span class="exam-card-bubble">(A)</span>
        <span class="exam-card-bubble">(B)</span>
        <span class="exam-card-bubble">(C)</span>
        <span class="exam-card-bubble">(D)</span>
      </div>
    `).join('');

    const questionsListHtml = questions.map((q, idx) => {
      const optionsHtml = (q.options || []).map((opt, optIdx) => {
        const letter = String.fromCharCode(65 + optIdx);
        return `
          <div class="exam-mcq-option">
            <div class="exam-mcq-checkbox">[ &nbsp; ] (${letter})</div>
            <div class="exam-mcq-opt-text">${opt}</div>
          </div>
        `;
      }).join('');

      return `
        <div class="exam-print-question-card mcq-card">
          <div class="exam-print-q-header">
            <span class="exam-print-q-num">Questão ${idx + 1}.</span>
            <span class="exam-print-q-text">${q.question}</span>
          </div>
          ${q.image ? `
            <div style="margin: 4px 0; text-align: center;">
              <img src="${q.image}" alt="Imagem" style="max-height: 75px; border: 1px solid #CCC; border-radius: 4px; padding: 2px;">
            </div>
          ` : ''}
          <div class="exam-mcq-grid">
            ${optionsHtml}
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="exam-sheet-a4">
        <!-- HEADER OFICIAL DA TKST -->
        <div class="exam-print-header">
          <img src="assets/images/logo-tkst-clean.png" alt="TKST Logo" class="exam-print-logo" onerror="this.src='assets/images/logo-tkst.png'">
          <div class="exam-print-header-center">
            <div class="exam-print-assoc">TRADICIONAL KARATE-DO SHOTOKAN TSUYOI (TKST)</div>
            <div class="exam-print-subtitle">SIMULADO & AVALIAÇÃO TEÓRICA (MÚLTIPLA ESCOLHA)</div>
            <div class="exam-print-exam-title">${exam.title.toUpperCase()} — (${exam.targetBelt.toUpperCase()})</div>
          </div>
          <img src="assets/images/tigre.png" alt="Shotokan Tiger" class="exam-print-logo-tiger" onerror="this.style.display='none'">
        </div>

        <!-- QUADRO DE DADOS DO ALUNO E AVALIAÇÃO -->
        <div class="exam-print-student-box">
          <div class="exam-print-row">
            <div style="flex: 2.5;"><strong>Nome do Aluno(a):</strong> ________________________________________________________________</div>
            <div style="flex: 1;"><strong>Data:</strong> ${dateStr}</div>
          </div>
          <div class="exam-print-row" style="margin-top: 5px;">
            <div style="flex: 1.8;"><strong>Dojo / Unidade:</strong> ${dojoName}</div>
            <div style="flex: 1.2;"><strong>Sensei Examinador:</strong> ${senseiName}</div>
            <div style="flex: 0.8; text-align: right; background: #F1F5F9; border: 1px solid #CBD5E1; padding: 2px 8px; border-radius: 4px;">
              <strong>Nota:</strong> _____ / 10,0
            </div>
          </div>
        </div>

        <!-- CARTÃO RESPOSTA (GABARITO DO ALUNO) -->
        <div class="exam-answer-card-wrapper">
          <div class="exam-answer-card-title">
            <i class="fas fa-pencil-alt"></i> CARTÃO-RESPOSTA OFICIAL (Preencha completamente a bolinha da alternativa correta):
          </div>
          <div class="exam-answer-card-grid">
            ${answerCardRows}
          </div>
        </div>

        <!-- QUESTÕES -->
        <div class="exam-print-questions-container">
          ${questionsListHtml}
        </div>

        <!-- ASSINATURAS E RODAPÉ -->
        <div class="exam-print-footer" style="margin-top: 15px;">
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
              <span class="exam-key-correct-badge">Alternativa Correta: [ ${letter} ]</span>
            </div>
            <div class="exam-key-q-text"><strong>Pergunta:</strong> ${q.question}</div>
            <div class="exam-key-answer-box"><strong>Resposta Correta:</strong> ${correctText}</div>
            ${q.explanation ? `<div class="exam-key-expl-box"><strong>Justificativa Técnica:</strong> ${q.explanation}</div>` : ''}
          </div>
        `;
      }).join('');

      return `
        <div class="exam-sheet-a4">
          <div class="exam-print-header" style="border-bottom: 3px solid #10B981;">
            <img src="assets/images/logo-tkst-clean.png" alt="TKST Logo" class="exam-print-logo" onerror="this.src='assets/images/logo-tkst.png'">
            <div class="exam-print-header-center">
              <div class="exam-print-assoc" style="color: #059669;">FOLHA MESTRA DE CORREÇÃO DO SENSEI</div>
              <div class="exam-print-subtitle">GABARITO OFICIAL (MÚLTIPLA ESCOLHA)</div>
              <div class="exam-print-exam-title">${exam.title.toUpperCase()} — (${exam.targetBelt.toUpperCase()})</div>
            </div>
            <div style="text-align: right; font-size: 0.8rem; font-weight: 700; color: #059669; border: 2px solid #059669; padding: 4px 8px; border-radius: 4px;">
              GABARITO<br>EXCLUSIVO SENSEI
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

          <div class="exam-print-questions-container" style="margin-top: 15px;">
            ${itemsHtml}
          </div>
        </div>
      `;
    }

    // Gabarito do Modelo Dissertativo Oficial
    const itemsHtml = exam.questions.map(q => {
      let expectedHtml = '';
      if (q.type === 'image_fields') {
        expectedHtml = q.fields.map(f => `<div>• <strong>${f.label}</strong> ${f.expected}</div>`).join('');
      } else if (q.type === 'count_grid') {
        expectedHtml = `<div class="exam-key-count-inline">${q.items.map(it => `<strong>${it.num}:</strong> ${it.expected}`).join(' | ')}</div>`;
      } else {
        expectedHtml = `<div>${q.expectedAnswer.replace(/\n/g, '<br>')}</div>`;
      }

      return `
        <div class="exam-key-card">
          <div class="exam-key-card-header">
            <span class="exam-key-q-num">Questão ${q.num}.</span>
            <span class="exam-key-q-title">${q.title}</span>
            <span class="badge" style="background: #E2E8F0; color: #334155; font-size: 0.72rem; font-weight: 700;">1,0 Ponto</span>
          </div>
          <div class="exam-key-answer-box" style="margin-top: 6px;">
            <strong style="color: #065F46; display: block; margin-bottom: 2px;">Resposta Oficial Esperada & Critério:</strong>
            ${expectedHtml}
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="exam-sheet-a4">
        <div class="exam-print-header" style="border-bottom: 3px solid #10B981;">
          <img src="assets/images/logo-tkst-clean.png" alt="TKST Logo" class="exam-print-logo" onerror="this.src='assets/images/logo-tkst.png'">
          <div class="exam-print-header-center">
            <div class="exam-print-assoc" style="color: #059669;">FOLHA MESTRA DE CORREÇÃO DO SENSEI</div>
            <div class="exam-print-subtitle">GABARITO OFICIAL & CRITÉRIOS DE AVALIAÇÃO</div>
            <div class="exam-print-exam-title">${exam.title.toUpperCase()} — (${exam.targetBelt.toUpperCase()})</div>
          </div>
          <div style="text-align: right; font-size: 0.8rem; font-weight: 700; color: #059669; border: 2px solid #059669; padding: 4px 8px; border-radius: 4px;">
            GABARITO<br>EXCLUSIVO SENSEI
          </div>
        </div>

        <div style="background: #F0FDF4; border: 1px solid #86EFAC; padding: 8px 12px; border-radius: 6px; margin-bottom: 12px; font-size: 0.84rem; color: #166534; display: flex; align-items: center; gap: 8px;">
          <i class="fas fa-info-circle" style="font-size: 1rem;"></i>
          <span><strong>Instrução ao Avaliador:</strong> Cada questão possui valor de 1,0 ponto (Total = 10,0 pontos). Respostas com grafia aproximada em japonês ou com terminologia correta devem ser pontuadas integralmente.</span>
        </div>

        <div class="exam-print-questions-container">
          ${itemsHtml}
        </div>
      </div>
    `;
  },

  // Gera o Gabarito Mestre Geral Unificado de TODAS as Faixas em um único documento
  buildMasterAnswerKeyHtml: function() {
    const kyuKeys = [6, 5, 4, 3, 2, 1, 0, -1, -2];

    const sectionsHtml = kyuKeys.map(kyu => {
      const exam = this.getExamData(kyu);
      const rowsHtml = exam.questions.map(q => {
        let resp = q.expectedAnswer;
        if (q.type === 'image_fields') {
          resp = q.fields.map(f => `${f.label} ${f.expected}`).join(' | ');
        } else if (q.type === 'count_grid') {
          resp = q.items.map(it => `${it.num}:${it.expected}`).join(' ');
        }
        return `
          <tr>
            <td style="font-weight: bold; width: 45px; text-align: center;">Q${q.num}</td>
            <td style="font-size: 0.8rem; width: 38%;"><strong>${q.title}</strong></td>
            <td style="font-size: 0.8rem; color: #065F46; font-weight: 600;">${resp}</td>
          </tr>
        `;
      }).join('');

      return `
        <div class="exam-master-key-belt-block" style="page-break-inside: avoid; margin-bottom: 24px;">
          <div style="background: ${exam.headerColor || '#1E293B'}; color: #FFF; padding: 6px 12px; font-weight: 800; font-size: 0.95rem; border-radius: 4px 4px 0 0; display: flex; justify-content: space-between; align-items: center;">
            <span>🥋 ${exam.title.toUpperCase()} (${exam.targetBelt})</span>
            <span style="font-size: 0.75rem; background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 3px;">Kata: ${exam.kataName}</span>
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
        <div class="exam-print-header" style="border-bottom: 3px solid #D97706;">
          <img src="assets/images/logo-tkst-clean.png" alt="TKST Logo" class="exam-print-logo" onerror="this.src='assets/images/logo-tkst.png'">
          <div class="exam-print-header-center">
            <div class="exam-print-assoc" style="color: #B45309;">TRADICIONAL KARATE-DO SHOTOKAN TSUYOI (TKST)</div>
            <div class="exam-print-subtitle">GABARITO GERAL UNIFICADO DE TODAS AS FAIXAS</div>
            <div class="exam-print-exam-title">FOLHA MESTRA DO SENSEI EXAMINADOR (6º KYU AO 3º DAN)</div>
          </div>
          <img src="assets/images/tigre.png" alt="Shotokan Tiger" class="exam-print-logo-tiger" onerror="this.style.display='none'">
        </div>

        <div style="margin-top: 15px;">
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

  // CSS de Alta Resolução Otimizado para Impressão e PDF A4
  getPrintStyles: function() {
    return `
      @page {
        size: A4 portrait;
        margin: 10mm 12mm 12mm 12mm;
      }
      * {
        box-sizing: border-box;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      body {
        margin: 0;
        padding: 0;
        font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
        color: #0F172A;
        background: #FFF;
        font-size: 10pt;
        line-height: 1.35;
      }
      .exam-sheet-a4 {
        width: 100%;
        max-width: 210mm;
        margin: 0 auto;
        padding: 4px;
        background: #FFF;
      }
      .exam-page-break-wrapper {
        page-break-after: always;
        page-break-inside: avoid;
        margin-bottom: 20px;
      }
      .exam-page-break-wrapper:last-child {
        page-break-after: auto;
      }

      /* HEADER */
      .exam-print-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 2.5px solid #0F172A;
        padding-bottom: 8px;
        margin-bottom: 8px;
        gap: 10px;
      }
      .exam-print-logo {
        height: 60px;
        width: auto;
        object-fit: contain;
      }
      .exam-print-logo-tiger {
        height: 52px;
        width: auto;
        object-fit: contain;
        opacity: 0.85;
      }
      .exam-print-header-center {
        flex: 1;
        text-align: center;
      }
      .exam-print-assoc {
        font-size: 11.5pt;
        font-weight: 900;
        letter-spacing: 0.5px;
        color: #0F172A;
      }
      .exam-print-subtitle {
        font-size: 8pt;
        font-weight: 700;
        letter-spacing: 1px;
        color: #64748B;
        text-transform: uppercase;
        margin: 1px 0;
      }
      .exam-print-exam-title {
        font-size: 11pt;
        font-weight: 900;
        color: #B45309;
        margin-top: 2px;
      }

      /* QUADRO DE ALUNO */
      .exam-print-student-box {
        border: 1.5px solid #0F172A;
        border-radius: 4px;
        padding: 6px 10px;
        margin-bottom: 6px;
        font-size: 9pt;
        background: #F8FAFC;
      }
      .exam-print-row {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      /* CITAÇÃO */
      .exam-print-quote {
        text-align: center;
        font-style: italic;
        font-size: 8pt;
        color: #334155;
        border-top: 1px dashed #94A3B8;
        border-bottom: 1px dashed #94A3B8;
        padding: 3px 0;
        margin-bottom: 10px;
      }

      /* QUESTÕES */
      .exam-print-questions-container {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .exam-print-question-card {
        page-break-inside: avoid;
        border-bottom: 1px dotted #CBD5E1;
        padding-bottom: 6px;
      }
      .exam-print-question-card:last-child {
        border-bottom: none;
      }
      .exam-print-q-header {
        font-size: 9.5pt;
        line-height: 1.3;
        margin-bottom: 4px;
      }
      .exam-print-q-num {
        font-weight: 900;
        color: #0F172A;
        margin-right: 4px;
      }
      .exam-print-q-text {
        font-weight: 700;
        color: #1E293B;
      }

      /* LINHAS DE RESPOSTA */
      .exam-print-lines-box {
        margin-top: 2px;
      }
      .exam-print-line {
        border-bottom: 1px solid #64748B;
        height: 20px;
        margin-top: 2px;
        width: 100%;
      }

      /* IMAGENS E CAMPOS */
      .exam-print-img-row {
        display: flex;
        align-items: center;
        gap: 14px;
        margin-top: 3px;
      }
      .exam-print-img-wrapper {
        border: 1px solid #CBD5E1;
        border-radius: 4px;
        padding: 4px;
        background: #FFF;
        flex-shrink: 0;
      }
      .exam-print-img {
        height: 65px;
        max-width: 115px;
        object-fit: contain;
        display: block;
      }
      .exam-print-fields-col {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .exam-print-field-row {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .exam-print-field-label {
        font-size: 8.5pt;
        font-weight: 700;
        color: #334155;
        white-space: nowrap;
      }

      /* GRID DE CONTAGEM */
      .exam-print-count-grid {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 6px 12px;
        margin-top: 4px;
      }
      .exam-print-count-item {
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .exam-print-count-num {
        font-size: 8.5pt;
        font-weight: 800;
        color: #0F172A;
        width: 24px;
      }

      /* MÚLTIPLA ESCOLHA */
      .exam-answer-card-wrapper {
        border: 1.5px solid #059669;
        border-radius: 4px;
        background: #F0FDF4;
        padding: 6px 10px;
        margin-bottom: 10px;
      }
      .exam-answer-card-title {
        font-size: 8.5pt;
        font-weight: 800;
        color: #065F46;
        margin-bottom: 4px;
      }
      .exam-answer-card-grid {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 4px 8px;
      }
      .exam-answer-card-item {
        display: flex;
        align-items: center;
        gap: 3px;
        font-size: 8pt;
        font-weight: 700;
      }
      .exam-card-q-num {
        width: 18px;
        color: #0F172A;
      }
      .exam-card-bubble {
        color: #475569;
      }
      .exam-mcq-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 4px 10px;
        margin-top: 4px;
      }
      .exam-mcq-option {
        display: flex;
        align-items: flex-start;
        gap: 6px;
        font-size: 8.5pt;
      }
      .exam-mcq-checkbox {
        font-weight: bold;
        color: #0F172A;
        flex-shrink: 0;
      }
      .exam-mcq-opt-text {
        color: #334155;
      }

      /* GABARITO SENSEI */
      .exam-key-card {
        page-break-inside: avoid;
        border: 1px solid #E2E8F0;
        border-left: 4px solid #10B981;
        border-radius: 4px;
        padding: 6px 8px;
        margin-bottom: 6px;
        background: #FAFAFA;
      }
      .exam-key-card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 9pt;
        margin-bottom: 3px;
      }
      .exam-key-q-num {
        font-weight: 900;
        color: #065F46;
      }
      .exam-key-q-title {
        font-weight: 700;
        flex: 1;
        margin: 0 8px;
      }
      .exam-key-correct-badge {
        background: #10B981;
        color: #FFF;
        font-weight: 800;
        font-size: 8pt;
        padding: 2px 6px;
        border-radius: 3px;
      }
      .exam-key-answer-box {
        font-size: 8.5pt;
        color: #1E293B;
      }
      .exam-key-expl-box {
        font-size: 8pt;
        color: #64748B;
        font-style: italic;
        margin-top: 2px;
      }
      .exam-key-summary-grid {
        display: grid;
        grid-template-columns: repeat(10, 1fr);
        gap: 4px;
        background: #F8FAFC;
        border: 1px solid #CBD5E1;
        padding: 6px;
        border-radius: 4px;
        margin-bottom: 10px;
      }
      .exam-key-pill {
        background: #FFF;
        border: 1px solid #10B981;
        border-radius: 3px;
        text-align: center;
        padding: 2px;
        font-size: 8pt;
      }
      .exam-key-pill-num {
        color: #64748B;
        font-size: 7pt;
      }
      .exam-key-pill-val {
        color: #065F46;
        font-weight: 900;
      }

      /* MASTER KEY TABLE */
      .exam-master-key-table {
        width: 100%;
        border-collapse: collapse;
        border: 1px solid #CBD5E1;
        font-size: 8pt;
      }
      .exam-master-key-table td {
        border: 1px solid #CBD5E1;
        padding: 4px 6px;
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
        margin-top: 14px;
        padding-top: 8px;
        page-break-inside: avoid;
      }
      .exam-print-sig-col {
        text-align: center;
        font-size: 8.5pt;
        color: #334155;
      }
      .exam-print-sig-line {
        border-top: 1px solid #0F172A;
        width: 210px;
        margin-bottom: 4px;
      }
    `;
  },

  // Função principal de Impressão / Abertura de Janela de Impressão PDF
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
              padding: 20px;
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            .exam-sheet-a4 {
              box-shadow: 0 8px 30px rgba(0,0,0,0.5);
              padding: 20px;
              border-radius: 4px;
              margin-bottom: 25px;
            }
            .no-print-bar {
              width: 100%;
              max-width: 210mm;
              background: #1E293B;
              border: 1px solid #334155;
              padding: 12px 18px;
              border-radius: 8px;
              margin-bottom: 16px;
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
              padding: 10px 20px;
              border-radius: 6px;
              cursor: pointer;
              font-size: 0.95rem;
              display: flex;
              align-items: center;
              gap: 8px;
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
            <strong style="font-size: 1.05rem;">📄 ${title}</strong>
            <div style="font-size: 0.8rem; color: #94A3B8;">Pronto para imprimir ou Salvar como PDF em folha A4</div>
          </div>
          <div style="display: flex; gap: 10px;">
            <button class="print-btn-action" onclick="window.print()">
              <i class="fas fa-print"></i> Imprimir / Salvar em PDF
            </button>
            <button class="print-btn-action" style="background: #334155; color: #FFF;" onclick="window.close()">
              <i class="fas fa-times"></i> Fechar
            </button>
          </div>
        </div>

        ${bodyContent}

        <script>
          // Aciona a caixa de impressão automaticamente após carregar as imagens
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
