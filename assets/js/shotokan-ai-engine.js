/**
 * TKST Alunos - Motor de Conhecimento e Estudo Técnico de Karatê Shotokan (Shotokan Knowledge Engine)
 * 
 * Este módulo reúne o conhecimento aprofundado do Karatê Shotokan tradicional (JKA / SKIF / WKF):
 * - Técnicas detalhadas por graduação (7º/6º Kyu até 3º Dan)
 * - Bases (Dachi Waza) e biomecânica (peso, quadril, estabilidade)
 * - Defesas (Uke Waza), Socos (Tsuki Waza) e Ataques de Mão (Uchi Waza)
 * - Chutes (Geri Waza) e armas de impacto corporal (Koshi, Sokuto, Kakato, etc.)
 * - Os 26 Katas oficiais do Shotokan (movimentos, kiais, criadores, bunkai e embusen)
 * - Kumite e Princípios de Combate (Gohon, Sanbon, Kihon Ippon, Jiyu Ippon, WKF)
 * - Filosofia, História e Ética Marcial (Gichin Funakoshi, Dojô Kun, Niju Kun)
 * - Terminologia Japonesa oficial e comandos de dojo
 * 
 * USO EXCLUSIVO: Painel Administrativo do Sensei / Instrutores para formulação e aprovação
 * de perguntas de simulados teóricos e exames de faixa.
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. BASE DE CONHECIMENTO ENCICLOPÉDICA DO KARATÊ SHOTOKAN
  // =========================================================================

  const SHOTOKAN_KNOWLEDGE = {
    // -----------------------------------------------------------------------
    // BASES E POSTURAS (DACHI WAZA)
    // -----------------------------------------------------------------------
    stances: [
      {
        name: "Zenkutsu Dachi",
        kanji: "前屈立ち",
        translation: "Base avançada frontal",
        weightDistribution: "70% na perna da frente, 30% na perna de trás",
        alignment: "Largura dos ombros, comprimento de dois passos normais. Joelho da frente flexionado alinhado aos dedos do pé; perna traseira estendida.",
        hipAction: "Transição entre Shomen (frontal) para ataques e Hanmi (semi-perfil a 45°) para defesas.",
        keyFocus: "Centro de gravidade baixo e firme impulso para a frente através do calcanhar de trás.",
        usage: "Kihon inicial, Heian Katas e base fundamental para golpes longos como Oi Tsuki e Gedan Barai."
      },
      {
        name: "Kokutsu Dachi",
        kanji: "後屈立ち",
        translation: "Base recuada posterior",
        weightDistribution: "70% na perna de trás, 30% na perna da frente",
        alignment: "Calcanhares rigorosamente alinhados na mesma linha longitudinal. Joelho traseiro empurrado para fora.",
        hipAction: "Quadril mantido em Hanmi (45° a 60°), absorvendo a força do oponente.",
        keyFocus: "Excelente para esquivas e recuos defensivos sem perder a capacidade de contra-ataque rápido.",
        usage: "Defesa clássica de Chudan Shuto Uke (Heian Shodan a Godan) e contra-ataques ágeis."
      },
      {
        name: "Kiba Dachi",
        kanji: "騎馬立ち",
        translation: "Base do cavaleiro / cavalo de ferro",
        weightDistribution: "50% em cada perna (distribuição simétrica e equilibrada)",
        alignment: "Pés rigorosamente paralelos voltados para a frente, separados por duas larguras de ombros. Joelhos flexionados pressionando para fora.",
        hipAction: "Quadril totalmente encaixado (Koshi o osameru), coluna vertical sem inclinar o tronco.",
        keyFocus: "Estabilidade lateral inabalável, fortalecimento dos adutores e geração de torque para golpes laterais.",
        usage: "Katas Tekki (Shodan, Nidan e Sandan), Heian Sandan, Yoko Geri, Empi e Uraken laterais."
      },
      {
        name: "Fudo Dachi (Sochin Dachi)",
        kanji: "不動立ち",
        translation: "Base imóvel / inabalável",
        weightDistribution: "50% na perna da frente, 50% na perna de trás",
        alignment: "Combinação entre Zenkutsu e Kiba Dachi; pés em diagonal aberta, ambos os joelhos flexionados e centro de gravidade profundamente enraizado.",
        hipAction: "Quadril enraizado e estável para resistir a impactos e contra-atacar em curta distância.",
        keyFocus: "Inabalabilidade tanto contra pressões frontais quanto laterais.",
        usage: "Kata Sochin, ataques pesados em curta distância (Gyaku Tsuki potente)."
      },
      {
        name: "Neko Ashi Dachi",
        kanji: "猫足立ち",
        translation: "Base da pata de gato",
        weightDistribution: "90% a 95% na perna de trás, 5% a 10% no pé da frente",
        alignment: "Perna de trás profundamente flexionada suportando o corpo; pé da frente tocando o chão apenas com o Koshi (bola do pé) com calcanhar elevado.",
        hipAction: "Quadril leve e recolhido, permitindo que a perna frontal chute instantaneamente sem transferência de peso prévia.",
        keyFocus: "Mobilidade e prontidão para chutes rápidos (Mae Geri, Mawashi Geri) e esquivas sutis.",
        usage: "Katas Meikyo, Unsu, Wankan e transições de combate corpo a corpo."
      },
      {
        name: "Sanchin Dachi",
        kanji: "三戦立ち",
        translation: "Base das três batalhas / ampulheta",
        weightDistribution: "50% em cada perna",
        alignment: "Pés na largura dos ombros com os dedos ligeiramente apontados para dentro (aduzidos); calcanhar frontal alinhado com a ponta do pé traseiro.",
        hipAction: "Tensão isométrica constante nos glúteos e assoalho pélvico (Tanden/Hara travado).",
        keyFocus: "Defesa compacta, enraizamento para combate em curtíssima distância e controle respiratório Ibuki.",
        usage: "Kata Nijushiho, Hangetsu e treinamento de calejamento e respiração."
      },
      {
        name: "Kosa Dachi",
        kanji: "交差立ち",
        translation: "Base cruzada",
        weightDistribution: "Maior parte na perna da frente plantada no chão",
        alignment: "Pernas entrecruzadas; o joelho traseiro aninhado atrás da articulação do joelho frontal com o calcanhar traseiro elevado.",
        hipAction: "Torção e compressão elástica para amortecer aterrissagens de saltos ou girar velozmente.",
        keyFocus: "Absorção de impacto de saltos e esquivas rápidas em espaços restritos.",
        usage: "Heian Yondan, Heian Godan, Kanku Dai, Bassai Dai (aterrissagens de saltos)."
      },
      {
        name: "Heiko Dachi",
        kanji: "平行立ち",
        translation: "Base com pés paralelos",
        weightDistribution: "50% em cada perna",
        alignment: "Pés voltados estritamente para a frente, paralelos e separados na largura dos ombros.",
        hipAction: "Postura neutra e relaxada, pronta para reação em qualquer direção.",
        keyFocus: "Transição e início de execução técnica.",
        usage: "Comando Yoi (preparação) em diversos katas como Bassai Dai."
      },
      {
        name: "Hachiji Dachi (Shizentai)",
        kanji: "八字立ち",
        translation: "Base natural (formato do kanji oito 八)",
        weightDistribution: "50% em cada perna",
        alignment: "Pés na largura dos ombros, apontados diagonalmente para fora (aproximadamente 45°).",
        hipAction: "Relaxamento equilibrado com prontidão marcial imediata.",
        keyFocus: "Posição natural de prontidão (Yoi fundamental do Shotokan).",
        usage: "Início e final de katas, comandos do Sensei no dojo."
      },
      {
        name: "Musubi Dachi",
        kanji: "結び立ち",
        translation: "Base de respeito e saudação",
        weightDistribution: "50% em cada perna",
        alignment: "Calcanhares rigorosamente unidos e pontas dos pés abertas em ângulo de cerca de 45°.",
        hipAction: "Coluna alinhada e mãos coladas nas laterais das coxas durante a reverência.",
        keyFocus: "Saudação marcial tradicional (Ritsurei).",
        usage: "Rei de início e término dos treinos e antes/depois de executar um Kata."
      },
      {
        name: "Heisoku Dachi",
        kanji: "閉足立ち",
        translation: "Base de pés fechados e unidos",
        weightDistribution: "50% em cada perna",
        alignment: "Bordas internas dos dois pés completamente unidas e paralelas do calcanhar aos dedos.",
        hipAction: "Postura concentrada e fechada.",
        keyFocus: "Concentração interna de energia antes de explodir para uma nova sequência.",
        usage: "Heian Nidan, Heian Sandan, Jion (preparações de golpes de punho e defesas)."
      },
      {
        name: "Hangetsu Dachi",
        kanji: "半月立ち",
        translation: "Base da meia-lua",
        weightDistribution: "50% em cada perna",
        alignment: "Intermediária entre Zenkutsu Dachi e Kiba Dachi, pés ligeiramente virados para dentro em deslocamento semicircular.",
        hipAction: "Contração vigorosa de coxas e glúteos em harmonia com respiração profunda.",
        keyFocus: "Avanço semicircular e pressão centrípeta.",
        usage: "Exclusiva e marcante no Kata Hangetsu."
      },
      {
        name: "Tsuru Dachi (Gankaku Dachi)",
        kanji: "鶴立ち",
        translation: "Base da garça (equilíbrio unipodal)",
        weightDistribution: "100% em uma única perna",
        alignment: "Apoio total sobre uma perna levemente flexionada; o outro pé encaixa o dorso atrás do joelho da perna de suporte.",
        hipAction: "Estabilidade do núcleo e equilíbrio milimétrico.",
        keyFocus: "Esquiva de varredura baixa e preparação para contra-ataque aéreo.",
        usage: "Kata Gankaku (golpes duplos Uraken e Yoko Geri simultâneos)."
      }
    ],

    // -----------------------------------------------------------------------
    // DEFESAS FUNDAMENTAIS E SUPERIORES (UKE WAZA)
    // -----------------------------------------------------------------------
    defenses: [
      {
        name: "Gedan Barai",
        kanji: "下段払い",
        translation: "Varredura ou bloqueio baixo",
        level: "Gedan (abaixo da linha da cintura)",
        contactArea: "Borda externa inferior do antebraço (Kote)",
        trajectory: "O punho defensor parte do lado oposto do pescoço (próximo à orelha contrária) e desce em trajetória diagonal descendente, estancando a um palmo do joelho frontal.",
        hipRotation: "Hanmi (quadril a 45 graus) para desviar a linha central de ataque.",
        hikite: "Puxada vigorosa do outro punho na linha da cintura com cotovelo fechado para trás.",
        bunkai: "Defesa contra chutes frontais (Mae Geri) ou liberação de pegada de punho com quebra de equilíbrio."
      },
      {
        name: "Jodan Age Uke",
        kanji: "上段揚げ受け",
        translation: "Defesa ascendente alta",
        level: "Jodan (cabeça / rosto)",
        contactArea: "Parte radial/externa do antebraço",
        trajectory: "O braço sobe em movimento espiralado à frente do corpo, finalizando inclinado a 45 graus, a um palmo de distância da testa.",
        hipRotation: "Hanmi (45°), retirando a cabeça da linha de tiro do golpe do adversário.",
        hikite: "O braço oposto puxa firmemente na cintura, gerando torque de subida.",
        bunkai: "Desvio ascendente de ataques no rosto (Oi Tsuki Jodan) e quebra de braço do adversário no movimento de subida."
      },
      {
        name: "Chudan Soto Uke",
        kanji: "中段外受け",
        translation: "Defesa média de fora para dentro",
        level: "Chudan (tronco / plexo solar)",
        contactArea: "Borda externa/cubital do antebraço",
        trajectory: "O punho defensor arma ao lado da orelha e descreve um arco semicircular de fora para dentro, parando na linha do ombro, com o cotovelo formando 90° e a um punho das costelas.",
        hipRotation: "Forte rotação de quadril retornando de Shomen para Hanmi no instante do impacto.",
        hikite: "Sincronizado na cintura para travar a postura no Kime.",
        bunkai: "Bloqueio ou desvio potente de golpes médios com impacto nos pontos vulneráveis do antebraço agressor."
      },
      {
        name: "Chudan Uchi Uke",
        kanji: "中段内受け",
        translation: "Defesa média de dentro para fora",
        level: "Chudan (tronco / tórax)",
        contactArea: "Borda radial externa do antebraço",
        trajectory: "O punho parte debaixo do quadril/costelas opostas e sobe em espiral de dentro para fora até a linha do ombro, com o dorso da mão voltado para o rosto.",
        hipRotation: "Quadril em Hanmi firme, expandindo a caixa torácica e abrindo a guarda do rival.",
        hikite: "Puxada direta para trás gerando abertura no flanco oposto.",
        bunkai: "Desvio de socos diretos por dentro, desequilibrando o oponente para aplicação de contra-ataque imediato."
      },
      {
        name: "Chudan Shuto Uke",
        kanji: "中段手刀受け",
        translation: "Defesa com a mão em espada (faca da mão)",
        level: "Chudan (tronco)",
        contactArea: "Borda externa da mão aberta (Shuto), dedos firmemente unidos com o polegar recolhido.",
        trajectory: "A mão que defende parte da orelha oposta com a ponta dos dedos para cima e corta diagonalmente para a frente; a mão do Hikite vai aberta no plexo solar (Suigetsu).",
        hipRotation: "Hanmi em base Kokutsu Dachi (70% do peso atrás).",
        hikite: "A mão de apoio posiciona-se espalmada horizontalmente sobre o plexo, pronta para golpear como Nukite ou bloquear.",
        bunkai: "Corte defensivo na articulação do braço inimigo seguido de agarre, torção ou perfuração com Nukite."
      },
      {
        name: "Morote Uke",
        kanji: "諸手受け",
        translation: "Defesa reforçada com as duas mãos",
        level: "Chudan",
        contactArea: "Antebraço principal defendendo em Uchi Uke, reforçado pelo punho de apoio apoiado no cotovelo.",
        trajectory: "Movimento conjunto onde o braço de trás fornece suporte mecânico direto ao braço defensor.",
        hipRotation: "Shomen ou Hanmi forte em Zenkutsu ou Kiba Dachi.",
        hikite: "Não há Hikite convencional; o segundo braço atua como apoio estrutural direto.",
        bunkai: "Bloqueio de ataques pesados e contundentes que sobrecarregariam uma defesa simples de um só braço."
      },
      {
        name: "Juji Uke",
        kanji: "十字受け",
        translation: "Defesa em cruz / em X",
        level: "Jodan (alta) ou Gedan (baixa)",
        contactArea: "Entrecruzamento dos dois antebraços (punhos fechados ou mãos abertas).",
        trajectory: "Os dois braços se cruzam na linha central do corpo formando um escudo geométrico firme.",
        hipRotation: "Geralmente executada em Zenkutsu Dachi ou Kosa Dachi com quadril frontal.",
        hikite: "Ambos os braços atuam conjuntamente na defesa.",
        bunkai: "Bloqueio de chutes descendentes, chutes frontais pesados ou controle de golpes verticais com armas."
      },
      {
        name: "Kakiwake Uke",
        kanji: "掻き分け受け",
        translation: "Defesa em cunha / separando os braços",
        level: "Chudan / Jodan",
        contactArea: "Ambos os antebraços abrindo lateralmente para fora.",
        trajectory: "Os punhos cruzam à frente do peito e se expandem lateralmente como uma cunha que se abre.",
        hipRotation: "Expansão torácica em Kiba Dachi ou Kokutsu Dachi.",
        hikite: "Ação simétrica simultânea de ambos os braços.",
        bunkai: "Liberação de agarres duplos de lapela ou abraços de urso pela frente, afastando os membros do agressor."
      },
      {
        name: "Manji Uke",
        kanji: "卍受け",
        translation: "Defesa dupla em vórtice (uma mão em Jodan Uchi Uke atrás e outra em Gedan Barai à frente)",
        level: "Duplo: Jodan atrás e Gedan à frente",
        contactArea: "Antebraço superior bloqueia ataque vindo por trás; antebraço inferior bloqueia ataque baixo à frente.",
        trajectory: "Giro coordenado de tronco e cabeça com as duas mãos em sentidos opostos.",
        hipRotation: "Alinhado à base (muitas vezes em Kokutsu Dachi ou Kosa Dachi).",
        hikite: "Não há; ação bifacial de combate a múltiplos oponentes.",
        bunkai: "Defesa simultânea contra dois agressores (um na frente e outro atrás) ou projeção de oponente por alavanca."
      },
      {
        name: "Haishu Uke",
        kanji: "背手受け",
        translation: "Defesa com as costas da mão aberta",
        level: "Chudan ou Jodan",
        contactArea: "Dorso da mão (Haishu).",
        trajectory: "Movimento circular suave que desvia o ataque em vez de bloquear com impacto rígido.",
        hipRotation: "Hanmi suave.",
        hikite: "Puxada firme na cintura.",
        bunkai: "Esquiva fluida de golpes retos, permitindo agarrar o pulso do agressor com os dedos imediatamente."
      },
      {
        name: "Teisho Uke",
        kanji: "底掌受け",
        translation: "Defesa com a base da palma da mão",
        level: "Gedan, Chudan ou Jodan",
        contactArea: "Calcanhar/base da palma da mão (Teisho).",
        trajectory: "Empurrão firme e circular da palma, desviando ataques frontais ou chutes baixos.",
        hipRotation: "Coordenação direta com o avanço ou recuo do quadril.",
        hikite: "Hikite firme ou mão pronta para contra-ataque rápido.",
        bunkai: "Desvio sutil de ataques e imediata aplicação de golpe com a mesma mão no queixo ou nariz do oponente."
      }
    ],

    // -----------------------------------------------------------------------
    // GOLPES DE PUNHO E MÃO (TSUKI & UCHI WAZA)
    // -----------------------------------------------------------------------
    strikes: [
      {
        name: "Oi Tsuki",
        kanji: "追い突き",
        translation: "Soco avançando com a perna e braço correspondentes",
        type: "Tsuki (penetração reta)",
        contactArea: "Seiken (os dois nós dos dedos indicador e médio)",
        mechanics: "O praticante avança um passo completo em Zenkutsu Dachi, desferindo o soco com o mesmo lado da perna que avança (ex: perna direita à frente, braço direito socando).",
        target: "Chudan (plexo solar) ou Jodan (queixo/nariz).",
        keyFocus: "Transmissão da energia do avanço de todo o peso corporal no instante exato do impacto."
      },
      {
        name: "Gyaku Tsuki",
        kanji: "逆突き",
        translation: "Soco invertido / cruzado com a perna oposta à frente",
        type: "Tsuki",
        contactArea: "Seiken",
        mechanics: "O soco é desferido com o braço contrário à perna da frente (ex: perna esquerda na frente em Zenkutsu Dachi, soco com a mão direita), com forte rotação do quadril.",
        target: "Chudan (fígado, plexo) ou Jodan.",
        keyFocus: "Torque explosivo de rotação pélvica a partir da perna traseira plantada no chão."
      },
      {
        name: "Kizami Tsuki",
        kanji: "刻み突き",
        translation: "Soco rápido de encontro com a mão da frente",
        type: "Tsuki",
        contactArea: "Seiken",
        mechanics: "Desferido com o punho da frente sem trocar de base, empurrando o quadril para a frente para antecipar o movimento do oponente.",
        target: "Jodan (rosto) para abrir espaço ou pontuar em Shiai Kumite.",
        keyFocus: "Velocidade máxima e timing de interceptação (Sen no Sen)."
      },
      {
        name: "Sanbon Tsuki",
        kanji: "三本突き",
        translation: "Sequência de três socos contínuos",
        type: "Tsuki combinados",
        contactArea: "Seiken",
        mechanics: "Avanço com 1º soco Oi Tsuki Jodan seguido de 2º Gyaku Tsuki Chudan e 3º Oi Tsuki Chudan na mesma base ou transição rápida.",
        target: "Jodan e Chudan sucessivos.",
        keyFocus: "Ritmo contínuo sem pausas entre os socos e estabilidade na base."
      },
      {
        name: "Uraken Uchi",
        kanji: "裏拳打ち",
        translation: "Golpe chicoteado com as costas do punho",
        type: "Uchi (impacto circular ou chicoteado)",
        contactArea: "Dorso dos nós dos dedos (Uraken)",
        mechanics: "Ação elástica rápida com o cotovelo servindo de eixo fixo, disparando e recolhendo o punho instantaneamente.",
        target: "Têmpora, nariz, queixo ou costelas.",
        keyFocus: "Efeito chicote (Snap) com recolhimento imediato."
      },
      {
        name: "Empi Uchi (Hiji Uchi)",
        kanji: "猿臂打ち",
        translation: "Golpe com o cotovelo (braço de macaco)",
        type: "Uchi de impacto curto",
        contactArea: "Articulação do cotovelo (Empi)",
        mechanics: "Golpe devastador em curta distância; pode ser Mae Empi (frontal subindo), Yoko Empi (lateral em Kiba Dachi), Mawashi Empi (circular) ou Ushiro Empi (para trás).",
        target: "Costelas, queixo ou plexo do oponente.",
        keyFocus: "Uso do quadril inteiro em curtíssima distância onde socos perderiam eficácia."
      },
      {
        name: "Shuto Uchi",
        kanji: "手刀打ち",
        translation: "Golpe cortante com a faca da mão aberta",
        type: "Uchi",
        contactArea: "Borda externa da mão (Shuto)",
        mechanics: "Trajetória semicircular atingindo partes macias com concentração de foco.",
        target: "Pescoço (artéria carótida), clavícula ou têmpora.",
        keyFocus: "Rigidez dos dedos no instante final com polegar firmemente colado."
      },
      {
        name: "Haito Uchi",
        kanji: "背刀打ち",
        translation: "Golpe com o lado do polegar da mão (borda interna)",
        type: "Uchi circular",
        contactArea: "Borda radial da mão aberta entre a base do indicador e o polegar dobrado.",
        target: "Lateral do pescoço ou têmpora.",
        keyFocus: "Polegar rigorosamente dobrado para dentro para não quebrar na colisão."
      },
      {
        name: "Teisho Uchi",
        kanji: "底掌打ち",
        translation: "Golpe com o calcanhar da palma da mão",
        type: "Uchi / Tsuki",
        contactArea: "Base sólida da palma (Teisho)",
        target: "Nariz (de baixo para cima), queixo ou costelas flutuantes.",
        keyFocus: "Dedos fletidos com pulso hiperestendido para trás, transmitindo força esmagadora sem risco de lesão aos nós dos dedos."
      },
      {
        name: "Nukite (Shihon Nukite)",
        kanji: "貫手",
        translation: "Mão em lança (ataque perfurante com as pontas dos dedos)",
        type: "Ataque perfurante",
        contactArea: "Pontas dos quatro dedos esticados e firmemente comprimidos (com o dedo médio ligeiramente dobrado para nivelar com os outros).",
        target: "Garganta (traqueia) ou plexo solar.",
        keyFocus: "Alvos anatômicos macios onde a penetração é fatal."
      },
      {
        name: "Tettsui Uchi (Kentsui Uchi)",
        kanji: "鉄槌打ち",
        translation: "Golpe do punho martelo",
        type: "Uchi",
        contactArea: "Base carnuda inferior do punho cerrado (lado do dedo mínimo).",
        target: "Ponte do nariz, clavícula, costelas ou têmpora.",
        keyFocus: "Golpe contundente vertical ou circular em martelada pesada."
      }
    ],

    // -----------------------------------------------------------------------
    // CHUTES (GERI WAZA)
    // -----------------------------------------------------------------------
    kicks: [
      {
        name: "Mae Geri Keage",
        kanji: "前蹴り蹴上げ",
        translation: "Chute frontal chicoteado / ascendente",
        trajectory: "Elevação rápida do joelho ao peito seguido de extensão e recolhimento instantâneo da perna.",
        contactArea: "Koshi (bola do pé / base dos dedos flexionados para trás).",
        target: "Queixo, testículos ou abdômen.",
        keyFocus: "Velocidade elástica e retorno rápido à base sem permitir que o oponente segure a perna."
      },
      {
        name: "Mae Geri Kekomi",
        kanji: "前蹴り蹴込み",
        translation: "Chute frontal penetrante / empurrando",
        trajectory: "O joelho sobe e o quadril empurra a perna para a frente de forma retilínea e penetrante.",
        contactArea: "Kakato (calcanhar) ou Koshi.",
        target: "Abdômen, plexo solar ou bexiga.",
        keyFocus: "Força de empurrão mecânico que projeta o adversário para trás."
      },
      {
        name: "Mawashi Geri",
        kanji: "回し蹴り",
        translation: "Chute circular",
        trajectory: "O joelho sobe lateralmente, o pé de apoio gira de 90° a 180° no solo e a perna desfere um arco circular até o alvo.",
        contactArea: "Koshi (tradicional JKA) ou Haisoku (peito do pé em Shiai WKF).",
        target: "Chudan (costelas) ou Jodan (cabeça/têmpora).",
        keyFocus: "Giro completo do quadril da perna que chuta e firmeza da perna de apoio."
      },
      {
        name: "Yoko Geri Keage",
        kanji: "横蹴り蹴上げ",
        translation: "Chute lateral chicoteado / ascendente",
        trajectory: "Executado de lado (frequentemente em Kiba Dachi); a perna sobe lateralmente com ação de chicote articular.",
        contactArea: "Sokuto (faca externa do pé / borda lateral afiada com os dedos puxados para cima).",
        target: "Axila, queixo ou têmpora lateral do oponente.",
        keyFocus: "Uso estrito do Sokuto sem girar a ponta do pé para cima."
      },
      {
        name: "Yoko Geri Kekomi",
        kanji: "横蹴り蹴込み",
        translation: "Chute lateral penetrante",
        trajectory: "O joelho sobe junto ao peito virado de lado e o calcanhar é empurrado em linha reta contra o oponente com rotação total do quadril.",
        contactArea: "Sokuto (faca externa do pé) e calcanhar (Kakato).",
        target: "Costelas flutuantes, plexo ou joelho do adversário.",
        keyFocus: "Penetração profunda com todo o peso do quadril por trás da linha de impacto."
      },
      {
        name: "Ushiro Geri",
        kanji: "後ろ蹴り",
        translation: "Chute para trás / coice penetrante",
        trajectory: "Olhar por cima do ombro, recolhimento reto do joelho ao abdômen e projeção do calcanhar em linha reta para trás.",
        contactArea: "Kakato (calcanhar duro).",
        target: "Plexo solar ou abdômen de agressor que se aproxima por trás ou em rotação.",
        keyFocus: "Trajetória reta sem abrir a perna circularmente, mantendo os joelhos juntos na saída."
      },
      {
        name: "Mikazuki Geri",
        kanji: "三日月蹴り",
        translation: "Chute da lua crescente",
        trajectory: "Chute semicircular de fora para dentro com a perna estendida.",
        contactArea: "Teisoku (planta do pé / curva interna côncava).",
        target: "Rosto do oponente ou para desviar a arma ou braço do atacante.",
        keyFocus: "Frequentemente usado para desarmar ou bater na palma da própria mão (como em Heian Sandan e Heian Godan)."
      },
      {
        name: "Nidan Geri",
        kanji: "二段蹴り",
        translation: "Chute duplo aéreo saltando",
        trajectory: "Salto vertical com uma perna desferindo primeiro chute finta baixo e a outra finalizando alto no ar.",
        contactArea: "Koshi.",
        target: "Chudan primeiro e Jodan fatal no ar.",
        keyFocus: "Elevação, sincronia e aterrissagem equilibrada em base firme (Heian Godan, Kanku Dai)."
      },
      {
        name: "Hiza Geri",
        kanji: "膝蹴り",
        translation: "Golpe com o joelho",
        trajectory: "Puxada com as duas mãos na nuca ou ombro do oponente descendo-o enquanto o joelho sobe verticalmente.",
        contactArea: "Patela / ponta do joelho flexionada ao máximo.",
        target: "Rosto, plexo solar ou costelas em clinch.",
        keyFocus: "Devastação em curtíssima distância sem espaço para chutes longos."
      },
      {
        name: "Ura Mawashi Geri",
        kanji: "裏回し蹴り",
        translation: "Chute circular invertido (gancho com o calcanhar)",
        trajectory: "Finge chute frontal ou circular e no final flexiona e gira atingindo de trás para a frente a nuca ou rosto.",
        contactArea: "Kakato (calcanhar) ou planta do pé.",
        target: "Jodan (rosto / nuca do adversário em combate livre).",
        keyFocus: "Surpresa e extrema flexibilidade de quadril, pontuando com facilidade no Shiai Kumite (Ippon 3 pontos)."
      }
    ],

    // -----------------------------------------------------------------------
    // OS 26 KATAS OFICIAIS DO SHOTOKAN
    // -----------------------------------------------------------------------
    katas: [
      {
        name: "Heian Shodan",
        meaning: "Mente em Paz - 1º Nível",
        origin: "Criado pelo mestre Anko Itosu a partir dos katas clássicos de Okinawa para o ensino escolar.",
        movesCount: 21,
        kiaiSteps: [8, 16],
        graduation: "6º Kyu (Faixa Branca para Amarela)",
        mainStance: "Zenkutsu Dachi e Kokutsu Dachi",
        keyTechniques: "Gedan Barai, Oi Tsuki, Jodan Age Uke, Tetsui Uchi e Chudan Shuto Uke.",
        embusen: "Formato de I maiúsculo (工)."
      },
      {
        name: "Heian Nidan",
        meaning: "Mente em Paz - 2º Nível",
        origin: "Introduz a base Kokutsu Dachi com ênfase no Shuto Uke e os primeiros chutes do estilo.",
        movesCount: 26,
        kiaiSteps: [8, 26],
        graduation: "5º Kyu (Faixa Amarela para Vermelha)",
        mainStance: "Kokutsu Dachi e Zenkutsu Dachi",
        keyTechniques: "Haiwan Uke, Yoko Geri Keage com Uraken simultâneo, Chudan Shuto Uke, Gyaku Tsuki e Uchi Uke.",
        embusen: "Formato de I maiúsculo (工)."
      },
      {
        name: "Heian Sandan",
        meaning: "Mente em Paz - 3º Nível",
        origin: "Ensina transições rápidas para Kiba Dachi e liberação de agarres com cotoveladas.",
        movesCount: 20,
        kiaiSteps: [10, 20],
        graduation: "4º Kyu (Faixa Vermelha para Laranja)",
        mainStance: "Kokutsu Dachi e Kiba Dachi",
        keyTechniques: "Uchi Uke / Gedan Barai simultâneos, Fumikomi, Empi Uchi, Uraken e Mikazuki Geri.",
        embusen: "Formato de I maiúsculo (工)."
      },
      {
        name: "Heian Yondan",
        meaning: "Mente em Paz - 4º Nível",
        origin: "Kata extremamente dinâmico com movimentos graciosos e aplicações de quebra articular.",
        movesCount: 27,
        kiaiSteps: [13, 25],
        graduation: "3º Kyu (Faixa Laranja para Verde)",
        mainStance: "Kokutsu Dachi, Zenkutsu Dachi e Kosa Dachi",
        keyTechniques: "Morote Uke, Juji Uke, Mae Geri com Uraken, Hiza Geri e golpes duplos de cotovelo.",
        embusen: "Formato de I maiúsculo (工)."
      },
      {
        name: "Heian Godan",
        meaning: "Mente em Paz - 5º Nível",
        origin: "O mais avançado da série Heian; introduz o primeiro salto aéreo (Tobi Geri) do estilo.",
        movesCount: 23,
        kiaiSteps: [12, 19],
        graduation: "2º Kyu (Faixa Verde para Roxa)",
        mainStance: "Kokutsu Dachi, Zenkutsu Dachi e Kosa Dachi",
        keyTechniques: "Mizunagare Uke, Kagi Tsuki, Mikazuki Geri batendo na mão, Salto giratório e Manji Uke.",
        embusen: "Formato de I maiúsculo (工)."
      },
      {
        name: "Tekki Shodan",
        meaning: "Cavaleiro de Ferro - 1º Nível (antigo Naihanchi)",
        origin: "Kata linear executado integralmente sobre uma linha reta lateral sem avanços frontais.",
        movesCount: 29,
        kiaiSteps: [15, 29],
        graduation: "1º Kyu (Faixa Roxa para Marrom)",
        mainStance: "Kiba Dachi exclusiva do início ao fim",
        keyTechniques: "Kagi Tsuki, Nami Gaeshi (onda que retorna), Morote Uke e Gedan Barai lateral.",
        embusen: "Linha reta estritamente lateral (一)."
      },
      {
        name: "Bassai Dai",
        meaning: "Romper / Invadir a Fortaleza - Versão Maior",
        origin: "Kata clássico de Shuri-te com espírito de determinação vigorosa ao ser encurralado.",
        movesCount: 42,
        kiaiSteps: [19, 42],
        graduation: "1º Dan (Shodan - Faixa Preta)",
        mainStance: "Zenkutsu Dachi, Kokutsu Dachi e Kiba Dachi",
        keyTechniques: "Morote Tsukami Uke, Sukui Uke, Yama Tsuki (soco em U), Tate Shuto e Mikazuki Geri.",
        embusen: "Formato complexo em cruz."
      },
      {
        name: "Kanku Dai",
        meaning: "Olhar para o Céu - Versão Maior (antigo Kushanku)",
        origin: "O mais longo kata do Shotokan; dele foram derivados os princípios fundamentais de todos os Heian.",
        movesCount: 65,
        kiaiSteps: [15, 65],
        graduation: "1º Dan / 2º Dan",
        mainStance: "Zenkutsu Dachi, Kokutsu Dachi e Renoji Dachi",
        keyTechniques: "Abertura com as mãos formando um triângulo em direção ao sol, Yoko Geri duplo, Nidan Geri saltando.",
        embusen: "Formato em cruz expansiva."
      },
      {
        name: "Jion",
        meaning: "Graça e Amor do Templo Budista Jion",
        origin: "Kata tradicional do estilo Tomari-te; preserva a postura de abertura Ming clássica da China.",
        movesCount: 47,
        kiaiSteps: [17, 47],
        graduation: "1º Dan / 2º Dan",
        mainStance: "Zenkutsu Dachi e Kiba Dachi com movimentação pesada e sólida",
        keyTechniques: "Manji Uke, Kakiwake Uke, Teisho Uchi, Jodan Age Uke e Oi Tsuki contínuos.",
        embusen: "Formato em I maiúsculo."
      },
      {
        name: "Empi",
        meaning: "O Voo da Andorinha (antigo Wanshu)",
        origin: "Caracterizado por mudanças súbitas de altura: mergulhos baixos seguidos de saltos ascendentes.",
        movesCount: 37,
        kiaiSteps: [15, 36],
        graduation: "1º Dan / 2º Dan",
        mainStance: "Zenkutsu Dachi e Kiba Dachi com transições ágeis",
        keyTechniques: "Age Tsuki (soco de baixo para cima), agarrar a cabeça do oponente e salto pirueta final.",
        embusen: "Linha central dinâmica."
      },
      {
        name: "Hangetsu",
        meaning: "Meia Lua (antigo Seisan)",
        origin: "Origem em Naha-te com forte ênfase na respiração abdominal profunda e contração isométrica.",
        movesCount: 41,
        kiaiSteps: [11, 40],
        graduation: "2º Dan / 3º Dan",
        mainStance: "Hangetsu Dachi exclusiva com passos semicirculares",
        keyTechniques: "Uchi Uke lento com respiração Ibuki, Gyaku Tsuki penetrante e Chudan Ura Tsuki.",
        embusen: "Linha reta com avanços pesados."
      },
      {
        name: "Gankaku",
        meaning: "A Garça sobre a Rocha (antigo Chinto)",
        origin: "Destaca o equilíbrio inabalável sobre uma única perna e ataques vertiginosos de retorno.",
        movesCount: 42,
        kiaiSteps: [28, 42],
        graduation: "2º Dan / 3º Dan",
        mainStance: "Tsuru Dachi (Gankaku Dachi) e Kiba Dachi",
        keyTechniques: "Postura da garça em uma perna só, Yoko Geri e Uraken simultâneos em alta velocidade.",
        embusen: "Linha reta com giros de 180° e 360°."
      },
      {
        name: "Jitte",
        meaning: "Dez Mãos (defesa contra dez adversários ou defesa contra bastão Bo)",
        movesCount: 24,
        kiaiSteps: [13, 24],
        graduation: "2º Dan / 3º Dan",
        mainStance: "Kiba Dachi e Zenkutsu Dachi",
        keyTechniques: "Defesas com Teisho e técnicas especializadas para desarmar atacantes armados de bastão.",
        embusen: "Formato em T invertido."
      },
      {
        name: "Sochin",
        meaning: "Força Tranquila / Preservar a Paz",
        origin: "Kata representativo da estabilidade absoluta e força do centro de gravidade.",
        movesCount: 41,
        kiaiSteps: [30, 41],
        graduation: "2º Dan / 3º Dan",
        mainStance: "Fudo Dachi (Sochin Dachi) quase exclusiva",
        keyTechniques: "Manji Uke pesado, Tate Tsuki, Mae Geri e contra-ataques vigorosos de curta distância.",
        embusen: "Formato em I com expansão lateral."
      },
      {
        name: "Nijushiho",
        meaning: "24 Passos (antigo Niseishi)",
        movesCount: 34,
        kiaiSteps: [18, 33],
        graduation: "2º Dan / 3º Dan",
        mainStance: "Sanchin Dachi e Kokutsu Dachi",
        keyTechniques: "Movimentos sinuosos como ondas do mar, defesas duplas e socos perfurantes.",
        embusen: "Linha central com expansões laterais."
      },
      {
        name: "Tekki Nidan",
        meaning: "Cavaleiro de Ferro - 2º Nível",
        movesCount: 24,
        kiaiSteps: [16, 24],
        graduation: "2º Dan / 3º Dan",
        mainStance: "Kiba Dachi exclusiva",
        keyTechniques: "Uchi Uke com antebraço vertical, Kagi Tsuki e Nami Gaeshi avançado.",
        embusen: "Linha reta lateral (一)."
      },
      {
        name: "Tekki Sandan",
        meaning: "Cavaleiro de Ferro - 3º Nível",
        movesCount: 36,
        kiaiSteps: [16, 36],
        graduation: "3º Dan em diante",
        mainStance: "Kiba Dachi exclusiva",
        keyTechniques: "Uchi Uke rápido com transições elásticas de cotoveladas e socos em gancho.",
        embusen: "Linha reta lateral (一)."
      },
      {
        name: "Unsu",
        meaning: "Mãos nas Nuvens",
        origin: "Considerado um dos katas mais complexos e atléticos do Karatê mundial.",
        movesCount: 48,
        kiaiSteps: [36, 48],
        graduation: "3º Dan em diante (Kata de competição internacional)",
        mainStance: "Todas as bases do Shotokan, incluindo chão e saltos",
        keyTechniques: "Defesa de dedos contra chutes no chão, salto giratório de 360 graus com aterrissagem em Mawashi Uke.",
        embusen: "Cruz complexa multidirecional."
      }
    ],

    // -----------------------------------------------------------------------
    // KUMITE, DISTÂNCIA E REGRAS DE COMBATE (JKA E WKF)
    // -----------------------------------------------------------------------
    kumite: [
      {
        name: "Gohon Kumite",
        kanji: "五本組手",
        translation: "Combate básico combinado em cinco passos",
        scope: "Exigência de graduações iniciais (Faixa Branca e Amarela).",
        rules: "O atacante (Tori) avança cinco passos contínuos com a mesma técnica (Oi Tsuki Jodan, Chudan ou Mae Geri). O defensor (Uke) recua cinco passos bloqueando em Zenkutsu Dachi. No quinto passo, Uke aplica contra-ataque potente com Gyaku Tsuki Chudan acompanhado de forte Kiai.",
        principles: "Metsuke (olhar fixo), Ma-ai (distância exata) e Sun-dome (controle absoluto sem ferir o colega)."
      },
      {
        name: "Sanbon Kumite",
        kanji: "三本組手",
        translation: "Combate básico em três passos",
        scope: "Exigência para 5º e 4º Kyu (Vermelha e Laranja).",
        rules: "Três ataques consecutivos em alturas diferentes (1º Jodan, 2º Chudan e 3º Mae Geri Gedan). Uke recua defendendo com Age Uke, Soto Uke e Gedan Barai, finalizando no 3º passo com Gyaku Tsuki.",
        principles: "Transição rápida entre diferentes alturas de defesa mantendo a base Zenkutsu Dachi estável."
      },
      {
        name: "Kihon Ippon Kumite",
        kanji: "基本一本組手",
        translation: "Combate básico em um único passo",
        scope: "Exigência para 3º e 2º Kyu (Laranja e Verde).",
        rules: "Ataque anunciado previamente (ex: 'Jodan Oi Tsuki!'). Tori avança um único golpe decisivo a fundo. Uke esquiva, defende com Kime e contra-ataca instantaneamente com Kiai mortal.",
        principles: "Ikken Hissatsu (o conceito de um golpe definitivo) e Zanshin (vigilância total após a execução)."
      },
      {
        name: "Jiyu Ippon Kumite",
        kanji: "自由一本組手",
        translation: "Combate semi-livre em um passo",
        scope: "Exigência para 1º Kyu e Faixas Pretas (Marrom e Dan).",
        rules: "Ambos os praticantes em postura livre de combate (Kamae) em movimento dinâmico. Tori escolhe o momento da explosão após anunciar o golpe. Uke esquiva com Tai Sabaki, defende e contra-ataca.",
        principles: "Sen no Sen (antecipar o ataque do adversário no momento da intenção) e Deai (interceptação)."
      },
      {
        name: "Shiai Kumite (Regras de Competição WKF)",
        kanji: "試合組手",
        translation: "Combate de competição esportiva",
        scope: "Normas internacionais da World Karate Federation (WKF).",
        rules: "Pontuações oficiais: Yuko (1 ponto para Tsuki no tronco ou rosto), Waza-ari (2 pontos para Chudan Geri) e Ippon (3 pontos para Jodan Geri ou qualquer técnica sobre oponente derrubado).",
        penalties: "Penalidades: Chui (advertência) e Hansoku (desclassificação por contato excessivo, fuga da área ou conduta antidesportiva).",
        specialRule: "Senshu: Primeira vantagem de pontuação sem oposição obtida na luta, usada como critério de desempate."
      }
    ],

    // -----------------------------------------------------------------------
    // FILOSOFIA, HISTÓRIA E CÓDIGO DE ÉTICA MARCIAL (DOJÔ KUN E NIJU KUN)
    // -----------------------------------------------------------------------
    philosophy: {
      founder: {
        name: "Mestre Gichin Funakoshi (1868 - 1957)",
        title: "O Pai do Karatê Moderno",
        heritage: "Nascido em Shuri, Okinawa. Aluno dos mestres Anko Asato e Anko Itosu. Levou o Karatê de Okinawa para o Japão em 1922 através de demonstrações no Ministério da Educação em Tóquio.",
        quote: "Karate ni sente nashi (No Karatê não existe atitude ofensiva / o Karatê não dá o primeiro golpe)."
      },
      karateDoMeaning: {
        kara: "Vazio (sem armas nas mãos e mente desprovida de ego, rancor e vaidade)",
        te: "Mão",
        do: "O Caminho filosófico de aprimoramento moral e espiritual contínuo.",
        full: "O Caminho das Mãos Vazias: uma arte marcial para a vida inteira onde a vitória mais nobre é sobre as próprias fraquezas."
      },
      dojoKun: [
        {
          number: "1º Lema",
          japanese: "Hitotsu, jinkaku kansei ni tsutomuru koto",
          translation: "Primeiro: Esforçar-se para a formação do caráter.",
          meaning: "A prática do Karatê busca antes de tudo a evolução moral, honestidade e integridade do ser humano."
        },
        {
          number: "2º Lema",
          japanese: "Hitotsu, makoto no michi o mamoru koto",
          translation: "Primeiro: Fidelidade para com o verdadeiro caminho da razão.",
          meaning: "Ser leal aos princípios justos, aos companheiros de treino, ao Sensei e à verdade."
        },
        {
          number: "3º Lema",
          japanese: "Hitotsu, doryoku no seishin o yashinau koto",
          translation: "Primeiro: Cultivar o espírito de esforço e perseverança.",
          meaning: "Dedicação incansável nos treinos e na vida, superando o cansaço e as adversidades com paciência."
        },
        {
          number: "4º Lema",
          japanese: "Hitotsu, reigi o omonnzuru koto",
          translation: "Primeiro: Respeito acima de tudo.",
          meaning: "Tratar a todos com cortesia sincera, valorizando os mais velhos, os colegas e o ambiente sagrado do dojo."
        },
        {
          number: "5º Lema",
          japanese: "Hitotsu, kekki no yu o imashimuru koto",
          translation: "Primeiro: Conter o espírito de agressão destrutiva.",
          meaning: "Dominar a raiva, a soberba e a violência. O verdadeiro karateca evita o conflito físico sempre que possível."
        }
      ],
      dojoKunNote: "Todos os 5 lemas do Dojô Kun começam com a palavra 'Hitotsu' (Primeiro / Item Um) porque nenhum princípio é inferior ao outro; todos possuem igual e suprema importância.",
      keyConcepts: [
        {
          term: "Zanshin (残心)",
          meaning: "Estado de alerta sereno e vigilância contínua que permanece mesmo após a conclusão de uma técnica ou combate."
        },
        {
          term: "Kime (決め)",
          meaning: "Foco e concentração explosiva de toda a energia corporal e mental no instante milimétrico do impacto."
        },
        {
          term: "Ma-ai (間合い)",
          meaning: "A distância espacial e temporal exata entre dois oponentes (fora de alcance, alcance mútuo ou corpo a corpo)."
        },
        {
          term: "Tai Sabaki (体捌き)",
          meaning: "Esquiva e deslocamento corporal tridimensional para sair da linha de ataque do oponente."
        },
        {
          term: "Hikite (引き手)",
          meaning: "A puxada enérgica do braço oposto em direção à cintura para gerar rotação elástica de quadril e torque."
        },
        {
          term: "Kiai (気合)",
          meaning: "Grito vigoroso e sonoro que unifica a energia espiritual (Ki), a respiração e a tensão muscular no momento do golpe."
        },
        {
          term: "Mokuso (黙想)",
          meaning: "Meditação silenciosa de olhos semicerrados em postura de Seiza para esvaziar a mente antes e depois do treino."
        },
        {
          term: "Seiza (正座)",
          meaning: "Postura formal ajoelhada tradicional sobre os calcanhares, mantendo a coluna ereta e as mãos espalmadas sobre as coxas."
        }
      ]
    },

    // -----------------------------------------------------------------------
    // ARMAS CORPORAIS E ANATOMIA MARCIAL (KYUSHO & ANATOMIA)
    // -----------------------------------------------------------------------
    anatomy: [
      { term: "Seiken", kanji: "正拳", meaning: "Parte frontal dos nós dos dedos indicador e médio da mão fechada." },
      { term: "Uraken", kanji: "裏拳", meaning: "Costas dos nós dos dedos da mão fechada (usado em chicotadas rápidas)." },
      { term: "Kentsui / Tettsui", kanji: "鉄槌", meaning: "A base carnuda da mão fechada ao lado do dedo mínimo (punho martelo)." },
      { term: "Shuto", kanji: "手刀", meaning: "A borda externa da mão aberta com os dedos firmemente unidos (mão de espada)." },
      { term: "Haito", kanji: "背刀", meaning: "A borda interna da mão aberta entre a base do indicador e o polegar dobrado." },
      { term: "Teisho", kanji: "底掌", meaning: "A base sólida da palma da mão." },
      { term: "Nukite", kanji: "貫手", meaning: "As pontas dos dedos estendidos em lança (Shihon Nukite)." },
      { term: "Empi / Hiji", kanji: "猿臂", meaning: "A ponta da articulação do cotovelo." },
      { term: "Koshi (Chusoku)", kanji: "虎趾", meaning: "A bola do pé / almofada carnuda abaixo dos dedos (usado no Mae Geri e Mawashi Geri)." },
      { term: "Sokuto", kanji: "足刀", meaning: "A borda cortante externa do pé com os dedos puxados para cima (faca do pé do Yoko Geri)." },
      { term: "Kakato", kanji: "踵", meaning: "O osso duro do calcanhar (usado no Ushiro Geri e Yoko Geri Kekomi)." },
      { term: "Haisoku", kanji: "背足", meaning: "O peito / dorso superior do pé." },
      { term: "Teisoku", kanji: "底足", meaning: "A planta / sola côncava interna do pé." },
      { term: "Tanden / Hara", kanji: "丹田", meaning: "O centro de gravidade e energia vital localizado cerca de três dedos abaixo do umbigo." }
    ]
  };

  // =========================================================================
  // 2. REGRAS TÉCNICAS E ESCOPO OFICIAL POR GRADUAÇÃO (KYUS E DANS)
  // =========================================================================

  const GRADUATION_PROFILES = {
    // 6º Kyu: Branca para Amarela
    6: {
      kyu: 6,
      name: "6º Kyu (Faixa Branca p/ Amarela)",
      beltTitle: "Faixa Branca 6º Kyu",
      targetBelt: "Faixa Amarela",
      allowedKatas: ["Heian Shodan"],
      kumiteType: "Gohon Kumite (5 passos)",
      focusThemes: ["bases", "defesas_iniciais", "socos_iniciais", "chutes_iniciais", "etiqueta", "kata_shodan"],
      description: "Fundamentos absolutos: bases Zenkutsu e Kokutsu, defesas Gedan Barai e Age Uke, socos Oi Tsuki, chute Mae Geri e Heian Shodan."
    },
    // 5º Kyu: Amarela para Vermelha
    5: {
      kyu: 5,
      name: "5º Kyu (Faixa Amarela p/ Vermelha)",
      beltTitle: "Faixa Amarela 5º Kyu",
      targetBelt: "Faixa Vermelha",
      allowedKatas: ["Heian Shodan", "Heian Nidan"],
      kumiteType: "Sanbon Kumite (3 passos) & Gohon Kumite",
      focusThemes: ["bases", "shuto_uke", "gyaku_tsuki", "yoko_geri", "sanbon_kumite", "kata_nidan"],
      description: "Aprofundamento de Kokutsu Dachi, Shuto Uke, Gyaku Tsuki, Yoko Geri Keage com Uraken e Kata Heian Nidan."
    },
    // 4º Kyu: Vermelha para Laranja
    4: {
      kyu: 4,
      name: "4º Kyu (Faixa Vermelha p/ Laranja)",
      beltTitle: "Faixa Vermelha 4º Kyu",
      targetBelt: "Faixa Laranja",
      allowedKatas: ["Heian Nidan", "Heian Sandan"],
      kumiteType: "Sanbon Kumite & Início de Kihon Ippon Kumite",
      focusThemes: ["kiba_dachi", "empi_uchi", "uraken", "fumikomi", "kata_sandan", "kumite_intermediario"],
      description: "Domínio de Kiba Dachi, cotoveladas (Empi), pisões (Fumikomi), socos em gancho e Heian Sandan."
    },
    // 3º Kyu: Laranja para Verde
    3: {
      kyu: 3,
      name: "3º Kyu (Faixa Laranja p/ Verde)",
      beltTitle: "Faixa Laranja 3º Kyu",
      targetBelt: "Faixa Verde",
      allowedKatas: ["Heian Sandan", "Heian Yondan"],
      kumiteType: "Kihon Ippon Kumite (1 passo)",
      focusThemes: ["morote_uke", "juji_uke", "kosa_dachi", "hiza_geri", "kata_yondan", "kihon_ippon"],
      description: "Defesas duplas (Morote Uke, Juji Uke), Kosa Dachi, joelhadas, Mae Geri com Uraken simultâneo e Heian Yondan."
    },
    // 2º Kyu: Verde para Roxa
    2: {
      kyu: 2,
      name: "2º Kyu (Faixa Verde p/ Roxa)",
      beltTitle: "Faixa Verde 2º Kyu",
      targetBelt: "Faixa Roxa",
      allowedKatas: ["Heian Yondan", "Heian Godan"],
      kumiteType: "Kihon Ippon Kumite & Jiyu Ippon Kumite",
      focusThemes: ["manji_uke", "salto_aereo", "mikazuki_geri", "kata_godan", "tai_sabaki", "dojo_kun"],
      description: "Manji Uke, salto aéreo acrobático de Heian Godan, Mikazuki Geri, controle de Zanshin e código Dojô Kun."
    },
    // 1º Kyu: Roxa para Marrom
    1: {
      kyu: 1,
      name: "1º Kyu (Faixa Roxa p/ Marrom)",
      beltTitle: "Faixa Roxa 1º Kyu",
      targetBelt: "Faixa Marrom",
      allowedKatas: ["Heian Godan", "Tekki Shodan"],
      kumiteType: "Jiyu Ippon Kumite (semilivre)",
      focusThemes: ["tekki_shodan", "kiba_dachi_linear", "nami_gaeshi", "jiyu_ippon", "bunkai", "niju_kun"],
      description: "Kata Tekki Shodan em Kiba Dachi com Nami Gaeshi lateral, combate Jiyu Ippon, aplicações de Bunkai e Niju Kun."
    },
    // 0: Shodan (1º Dan - Faixa Preta)
    0: {
      kyu: 0,
      name: "1º Dan (Shodan - Faixa Preta)",
      beltTitle: "Faixa Marrom p/ Preta (1º Dan)",
      targetBelt: "Faixa Preta 1º Dan (Shodan)",
      allowedKatas: ["Bassai Dai", "Kanku Dai", "Jion", "Empi", "Tekki Shodan"],
      kumiteType: "Jiyu Kumite (luta livre) & Shiai Kumite WKF",
      focusThemes: ["sentei_katas", "bassai_dai", "kanku_dai", "shiai_wkf", "filosofia_profunda", "anatomia_kyusho"],
      description: "Katas Sentei do Shotokan (Bassai Dai, Kanku Dai, Jion, Empi), luta livre com Zanshin inabalável, arbitragem e história de Funakoshi."
    },
    // -1: Nidan (2º Dan)
    "-1": {
      kyu: -1,
      name: "2º Dan (Nidan - Faixa Preta)",
      beltTitle: "Faixa Preta 1º Dan p/ 2º Dan",
      targetBelt: "Faixa Preta 2º Dan (Nidan)",
      allowedKatas: ["Hangetsu", "Gankaku", "Jitte", "Sochin", "Bassai Dai"],
      kumiteType: "Jiyu Kumite avançado & Análise Tática",
      focusThemes: ["katas_superiores", "hangetsu_respiracao", "gankaku_equilibrio", "sochin_fudo", "arbitragem_wkf"],
      description: "Katas superiores avançados (Hangetsu com respiração Ibuki, Gankaku com equilíbrio em Tsuru Dachi, Sochin), tática e pedagogia marcial."
    },
    // -2: Sandan (3º Dan)
    "-2": {
      kyu: -2,
      name: "3º Dan (Sandan - Faixa Preta)",
      beltTitle: "Faixa Preta 2º Dan p/ 3º Dan",
      targetBelt: "Faixa Preta 3º Dan (Sandan)",
      allowedKatas: ["Nijushiho", "Chinte", "Meikyo", "Unsu", "Tekki Nidan", "Tekki Sandan"],
      kumiteType: "Maestria em Kumite & Defesa Pessoal",
      focusThemes: ["mestria_katas", "unsu", "nijushiho", "filosofia_zen", "biomecanica_avancada"],
      description: "Mestria técnica em katas complexos (Unsu, Nijushiho, Meikyo), transmissão do Do marcial e refinamento biomecânico máximo."
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
  // 3. GERADOR DE QUESTÕES ESPECIALISTA DO KARATÊ SHOTOKAN
  // =========================================================================

  function generateQuestionPoolForGraduation(kyuNumber) {
    const kyuKey = (parseInt(kyuNumber) === 7) ? 6 : parseInt(kyuNumber);
    const profile = GRADUATION_PROFILES[kyuKey] || GRADUATION_PROFILES[6];
    const pool = [];

    // -----------------------------------------------------------------------
    // A) QUESTÕES SOBRE BASES (DACHI WAZA)
    // -----------------------------------------------------------------------
    SHOTOKAN_KNOWLEDGE.stances.forEach(st => {
      // Pergunta de distribuição de peso
      pool.push({
        topic: "Bases (Dachi Waza)",
        category: "bases",
        question: `No Karatê Shotokan, qual é a distribuição percentual de peso corporal recomendada na base '${st.name}'?`,
        correctAnswer: st.weightDistribution,
        distractors: [
          "50% em cada perna com os pés abertos a 90 graus",
          "90% na perna da frente e 10% na perna traseira",
          "60% na perna traseira com o calcanhar frontal tocando todo o solo",
          "100% apoiado em uma única perna em equilíbrio",
          "80% na perna da frente e 20% na de trás com joelho esticado"
        ]
      });

      // Pergunta de tradução / significado
      pool.push({
        topic: "Bases (Dachi Waza)",
        category: "bases",
        question: `Qual é o significado e a característica principal da base tradicional '${st.name}' (${st.kanji})?`,
        correctAnswer: `${st.translation} - ${st.keyFocus}`,
        distractors: [
          "Base de saudação cerimonial com calcanhares unidos a 45°",
          "Base de relaxamento natural em formato do kanji oito",
          "Base de combate livre exclusivamente com o peso na ponta dos pés",
          "Base de transição com pés entrecruzados para amortecer quedas"
        ]
      });
    });

    // -----------------------------------------------------------------------
    // B) QUESTÕES SOBRE DEFESAS (UKE WAZA)
    // -----------------------------------------------------------------------
    SHOTOKAN_KNOWLEDGE.defenses.forEach(def => {
      pool.push({
        topic: "Defesas (Uke Waza)",
        category: "defesas",
        question: `Em relação à técnica defensiva '${def.name}' (${def.kanji}), qual é a sua área de contato anatômica e nível de bloqueio?`,
        correctAnswer: `Nível ${def.level}, utilizando como ponto de contato: ${def.contactArea}.`,
        distractors: [
          "Nível Jodan, utilizando a palma aberta em empurrão descendente.",
          "Nível Gedan, utilizando as pontas dos dedos em corte penetrante.",
          "Nível Chudan, utilizando exclusivamente a parte carnuda do calcanhar.",
          "Nível Jodan, utilizando o cotovelo apontado verticalmente para o teto."
        ]
      });

      pool.push({
        topic: "Mecânica de Defesa",
        category: "defesas",
        question: `Qual é o movimento biomecânico e trajetória correta para a execução da defesa '${def.name}'?`,
        correctAnswer: def.trajectory,
        distractors: [
          "O braço sobe em linha reta vertical rente ao corpo sem girar o punho.",
          "O punho parte da cintura e golpeia de baixo para cima como um gancho.",
          "A mão desce com as costas abertas num movimento circular até os quadris.",
          "Ambos os braços se cruzam na altura do joelho sem movimentar o quadril."
        ]
      });
    });

    // -----------------------------------------------------------------------
    // C) QUESTÕES SOBRE GOLPES DE PUNHO E MÃO (TSUKI & UCHI WAZA)
    // -----------------------------------------------------------------------
    SHOTOKAN_KNOWLEDGE.strikes.forEach(stk => {
      pool.push({
        topic: "Golpes de Mão e Punho",
        category: "socos",
        question: `Qual a diferença técnica e mecânica do golpe '${stk.name}' (${stk.kanji}) no Karatê Shotokan?`,
        correctAnswer: `${stk.translation}. Característica: ${stk.mechanics}`,
        distractors: [
          "Ataque desferido exclusivamente com o dorso do pé em arco circular.",
          "Bloqueio com os antebraços cruzados para neutralizar chutes no peito.",
          "Chute penetrante executado com o calcanhar em linha reta para trás.",
          "Projeção corporal com agarre duplo na lapela e rasteira simultânea."
        ]
      });

      pool.push({
        topic: "Superfície de Contato e Foco",
        category: "socos",
        question: `Qual é a superfície anatômica correta de impacto (arma corporal) utilizada na técnica '${stk.name}'?`,
        correctAnswer: stk.contactArea,
        distractors: [
          "Apenas o osso do calcanhar rígido (Kakato)",
          "A bola do pé com os dedos flexionados para trás (Koshi)",
          "A ponta do cotovelo dobrado em ângulo de 45 graus (Empi)",
          "A faca externa lateral do pé (Sokuto)"
        ]
      });
    });

    // -----------------------------------------------------------------------
    // D) QUESTÕES SOBRE CHUTES (GERI WAZA)
    // -----------------------------------------------------------------------
    SHOTOKAN_KNOWLEDGE.kicks.forEach(k => {
      pool.push({
        topic: "Chutes (Geri Waza)",
        category: "chutes",
        question: `No chute '${k.name}' (${k.kanji}), qual é a arma corporal de impacto correta e a sua trajetória de execução?`,
        correctAnswer: `Arma de contato: ${k.contactArea}. Trajetória: ${k.trajectory}`,
        distractors: [
          "Arma de contato: Nós dos dedos indicador e médio da mão (Seiken).",
          "Arma de contato: Ponta das costelas com giro de quadril lateral.",
          "Arma de contato: Borda da palma da mão aberta em corte descendente.",
          "Arma de contato: Parte superior do ombro com impacto corporal direto."
        ]
      });
    });

    // -----------------------------------------------------------------------
    // E) QUESTÕES SOBRE KATAS OFICIAIS DO SHOTOKAN
    // -----------------------------------------------------------------------
    SHOTOKAN_KNOWLEDGE.katas.forEach(kata => {
      pool.push({
        topic: `Kata: ${kata.name}`,
        category: "katas",
        question: `Em relação ao Kata oficial do Shotokan '${kata.name}', quantos movimentos (Kyo) ele possui e em quais passos ocorrem os Kiais?`,
        correctAnswer: `Possui ${kata.movesCount} movimentos, com Kiais nos passos ${kata.kiaiSteps.join(' e ')}.`,
        distractors: [
          `Possui ${kata.movesCount + 4} movimentos, com Kiai único no primeiro passo de abertura.`,
          `Possui ${Math.max(15, kata.movesCount - 5)} movimentos, sem nenhum Kiai obrigatório.`,
          `Possui 50 movimentos exatos, com Kiais executados a cada 10 passos contínuos.`,
          `Possui 30 movimentos, com Kiai apenas ao retornar à postura de Yoi final.`
        ]
      });

      pool.push({
        topic: `Significado do Kata: ${kata.name}`,
        category: "katas",
        question: `Qual é o significado filosófico e a característica histórica do Kata '${kata.name}'?`,
        correctAnswer: `Significado: '${kata.meaning}'. Característica: ${kata.origin || kata.keyTechniques}`,
        distractors: [
          "Significado: 'Dança das Mãos no Vento' - Kata exclusivo para competições infantis.",
          "Significado: 'Espada Invisível' - Kata originário do estilo de luta com bastão longo de Okinawa.",
          "Significado: 'Salto do Dragão' - Kata criado por mestres chineses praticado em base de garça exclusiva.",
          "Significado: 'Cinco Passos' - Kata simples sem aplicação marcial focado em alongamento."
        ]
      });
    });

    // -----------------------------------------------------------------------
    // F) QUESTÕES SOBRE KUMITE E PRINCÍPIOS DE COMBATE
    // -----------------------------------------------------------------------
    SHOTOKAN_KNOWLEDGE.kumite.forEach(kum => {
      pool.push({
        topic: "Kumite e Luta",
        category: "kumite",
        question: `Em relação à modalidade de combate '${kum.name}' (${kum.kanji}), como funciona a sua estrutura de execução?`,
        correctAnswer: `${kum.rules} ${kum.principles ? 'Princípios: ' + kum.principles : ''}`,
        distractors: [
          "Luta no solo com imobilização e finalização por estrangulamento obrigatório.",
          "Combate esportivo livre onde chutes no chão valem pontuação de 5 pontos.",
          "Combate onde o defensor apenas esquiva sem nunca poder desferir contra-ataques.",
          "Apenas socos são permitidos, sendo proibido o uso de defesas ou chutes."
        ]
      });
    });

    // -----------------------------------------------------------------------
    // G) QUESTÕES DE FILOSOFIA, HISTÓRIA E DOJÔ KUN
    // -----------------------------------------------------------------------
    SHOTOKAN_KNOWLEDGE.philosophy.dojoKun.forEach(dk => {
      pool.push({
        topic: "Dojô Kun (Lemas do Dojô)",
        category: "filosofia",
        question: `No código ético do Dojô Kun do Karatê Shotokan, qual é o princípio enunciado por: '${dk.japanese}'?`,
        correctAnswer: `${dk.translation} (${dk.meaning})`,
        distractors: [
          "Treinar para vencer todos os campeonatos e conquistar medalhas a qualquer custo.",
          "Atacar primeiro antes que o adversário consiga tomar a iniciativa no combate.",
          "Desenvolver força física superior para subjugar os mais fracos no treinamento.",
          "Desafiar praticantes de outras artes marciais para testar a eficácia do estilo."
        ]
      });
    });

    pool.push({
      topic: "Filosofia do Dojô Kun",
      category: "filosofia",
      question: "Por que todos os 5 lemas do Dojô Kun do Mestre Gichin Funakoshi começam com o termo japonês 'Hitotsu' (一つ - Primeiro)?",
      correctAnswer: "Porque nenhum princípio é considerado secundário ou inferior; todos os cinco lemas têm a mesma importância suprema e peso moral.",
      distractors: [
        "Porque os lemas foram numerados por ordem de dificuldade técnica de graduação.",
        "Porque apenas o primeiro lema é obrigatório, sendo os outros quatro opcionais.",
        "Porque era a regra gramatical antiga do dialeto regional de Okinawa para listas.",
        "Para indicar que apenas faixas-pretas 1º Dan (Shodan) devem seguir o código."
      ]
    });

    pool.push({
      topic: "História do Karatê",
      category: "filosofia",
      question: "Quem é considerado o 'Pai do Karatê Moderno' e fundador do estilo Shotokan?",
      correctAnswer: "Mestre Gichin Funakoshi (1868-1957), que introduziu o Karatê de Okinawa no Japão continental e criou o Dojô Kun.",
      distractors: [
        "Mestre Jigoro Kano, que fundou o Karatê a partir das técnicas tradicionais de Aikido.",
        "Mestre Bruce Lee, que unificou as técnicas de Okinawa e as levou para o Ocidente.",
        "Mestre Masutatsu Oyama, que criou as formas Kata do estilo Heian em Tóquio.",
        "Mestre Kenwa Mabuni, que estabeleceu as primeiras regras de pontuação esportiva WKF."
      ]
    });

    pool.push({
      topic: "Conceito Marcial: Karate-Do",
      category: "filosofia",
      question: "Qual é a tradução literal e o significado filosófico da palavra 'Karate-Do' (空手道)?",
      correctAnswer: "Kara (Vazio), Te (Mão), Do (Caminho). Significa 'O Caminho das Mãos Vazias' - uma disciplina de autoaperfeiçoamento moral sem armas.",
      distractors: [
        "Kara (Guerreiro), Te (Punho), Do (Arte). Significa 'A Arte dos Punhos de Aço'.",
        "Kara (Rápido), Te (Chute), Do (Combate). Significa 'O Combate dos Chutes Velozes'.",
        "Kara (Livre), Te (Defesa), Do (Espírito). Significa 'A Defesa Espiritual Absoluta'.",
        "Kara (Japão), Te (Luta), Do (Vitória). Significa 'O Caminho Japonês da Vitória'."
      ]
    });

    pool.push({
      topic: "Conceitos Essenciais: Zanshin e Kime",
      category: "filosofia",
      question: "No Karatê Shotokan, o que significam os conceitos marciais fundamentais 'Zanshin' e 'Kime'?",
      correctAnswer: "Zanshin é o estado contínuo de vigilância e alerta sereno pós-técnica; Kime é o foco explosivo de energia no instante do impacto.",
      distractors: [
        "Zanshin é o grito de guerra no início da luta; Kime é a saudação formal ajoelhada em Seiza.",
        "Zanshin é a esquiva em salto; Kime é a puxada do braço que recolhe na cintura (Hikite).",
        "Zanshin é a pontuação máxima de 3 pontos em competição; Kime é a advertência por falta.",
        "Zanshin é a respiração rápida pelo nariz; Kime é o alongamento dos tendões posteriores."
      ]
    });

    // -----------------------------------------------------------------------
    // H) QUESTÕES DE TERMINOLOGIA E ARMAS CORPORAIS
    // -----------------------------------------------------------------------
    SHOTOKAN_KNOWLEDGE.anatomy.forEach(anat => {
      pool.push({
        topic: "Terminologia Marcial Japonesa",
        category: "terminologia",
        question: `No vocabulário tradicional do Karatê Shotokan, o que significa o termo anatômico '${anat.term}' (${anat.kanji})?`,
        correctAnswer: anat.meaning,
        distractors: [
          "O grito de explosão respiratória executado no momento da técnica decisiva.",
          "A linha imaginária de deslocamento e direção de um Kata tradicional.",
          "A vestimenta tradicional branca composta por casaco, calça e faixa.",
          "O comando formal do Sensei para encerrar imediatamente o treinamento."
        ]
      });
    });

    // -----------------------------------------------------------------------
    // I) QUESTÕES DE REGRAS DE COMPETIÇÃO WKF
    // -----------------------------------------------------------------------
    pool.push({
      topic: "Arbitragem e Competição WKF",
      category: "kumite",
      question: "Nas regras oficiais de Shiai Kumite da WKF (World Karate Federation), como são pontuados os golpes?",
      correctAnswer: "Yuko (1 ponto) para Tsuki no tronco/rosto; Waza-ari (2 pontos) para Chudan Geri; Ippon (3 pontos) para Jodan Geri ou golpe em oponente derrubado.",
      distractors: [
        "Yuko (2 pontos) para qualquer soco; Waza-ari (4 pontos) para chutes; Ippon (6 pontos) para projeção.",
        "Yuko (1 ponto) para bloqueios bem sucedidos; Waza-ari (2 pontos) para chutes; Ippon (5 pontos) por nocaute.",
        "Todos os golpes valem 1 ponto igualmente, vencendo quem atingir 10 pontos primeiro.",
        "Ippon (1 ponto) para socos; Waza-ari (2 pontos) para chutes no peito; Yuko (3 pontos) para chutes na cabeça."
      ]
    });

    pool.push({
      topic: "Arbitragem e Competição WKF",
      category: "kumite",
      question: "No Shiai Kumite oficial (WKF), o que é a vantagem denominada 'Senshu'?",
      correctAnswer: "É a vantagem obtida pelo competidor que marca o primeiro ponto da luta sem oposição prévia, servindo como critério de desempate ao final do tempo.",
      distractors: [
        "É a permissão concedida pelo árbitro para o atleta pedir atendimento médico no tatame.",
        "É a penalidade aplicada quando o competidor sai dos limites do Shiai-jo pela segunda vez.",
        "É a vitória antecipada por atingir uma diferença de 8 pontos em relação ao adversário.",
        "É a escolha livre do competidor de começar a luta como Tori ou como Uke."
      ]
    });

    // -----------------------------------------------------------------------
    // REFINAMENTO DO POOL COM BASE NO PERFIL DA GRADUAÇÃO SELECIONADA
    // -----------------------------------------------------------------------
    // Filtrar questões apropriadas para o perfil ou enfatizar o nível da faixa
    return pool.map(item => {
      // Ajustar o texto das opções incorretas para garantir que haja 3 distratores plausíveis
      const filteredDistractors = (item.distractors || []).filter(d => normalizeKey(d) !== normalizeKey(item.correctAnswer));
      const shuffledDistractors = shuffle(filteredDistractors).slice(0, 3);
      while (shuffledDistractors.length < 3) {
        shuffledDistractors.push(`Alternativa complementar de técnica Shotokan ${shuffledDistractors.length + 1}`);
      }

      // Montar 4 alternativas e calcular correctIndex
      const allOptions = [item.correctAnswer, ...shuffledDistractors];
      const shuffledOptions = shuffle(allOptions);
      const correctIndex = shuffledOptions.findIndex(opt => normalizeKey(opt) === normalizeKey(item.correctAnswer));

      return {
        topic: item.topic,
        category: item.category,
        kyuNumber: kyuKey,
        beltName: profile.beltTitle,
        question: item.question,
        correctAnswer: item.correctAnswer,
        wrongAnswers: shuffledDistractors,
        options: shuffledOptions,
        correctIndex: correctIndex >= 0 ? correctIndex : 0
      };
    });
  }

  // =========================================================================
  // 4. ALGORITMO PÚBLICO DE FORMULAÇÃO DE QUESTÕES (USO EXCLUSIVO DO ADMIN)
  // =========================================================================

  const SHOTOKAN_ENGINE = {
    // Obter dados do conhecimento Shotokan
    getKnowledge: () => SHOTOKAN_KNOWLEDGE,

    // Obter perfis de graduação
    getGraduationProfiles: () => GRADUATION_PROFILES,

    /**
     * Formula um conjunto de questões estudadas tecnicamente para a graduação.
     * 
     * @param {number|string} kyu Graduação (6 ao 1 Kyu, 0, -1, -2 Dans)
     * @param {object} options Opções de formulação:
     *   - count: quantidade de perguntas desejadas (padrão 5)
     *   - category: filtro opcional ("todos", "bases", "defesas", "socos", "chutes", "katas", "kumite", "filosofia", "terminologia")
     *   - avoidExisting: se true, evita perguntas já cadastradas no banco do app
     * @returns {Array} Lista de questões formuladas com gabarito e alternativas
     */
    formulateQuestions: function (kyu, options = {}) {
      const count = Math.max(1, Math.min(25, parseInt(options.count) || 5));
      const categoryFilter = options.category || 'todos';
      const avoidExisting = options.avoidExisting !== false;

      // 1. Obter conjunto existente para anti-duplicação
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
        } catch (e) {
          console.warn('Nota ao ler banco de questões para verificação anti-duplicidade:', e);
        }
      }

      // 2. Gerar pool de questões enriquecidas da graduação
      const rawPool = generateQuestionPoolForGraduation(kyu);

      // 3. Filtrar por categoria se requisitado
      let filteredPool = rawPool;
      if (categoryFilter && categoryFilter !== 'todos') {
        filteredPool = rawPool.filter(item => item.category === categoryFilter);
        if (filteredPool.length === 0) filteredPool = rawPool; // fallback de segurança
      }

      // 4. Filtrar questões que já existem no banco para garantir originalidade
      let uniqueCandidates = filteredPool.filter(item => !existingKeySet.has(normalizeKey(item.question)));
      if (uniqueCandidates.length < count) {
        // Se todas já tiverem sido geradas, usa as do pool com embaralhamento
        uniqueCandidates = filteredPool;
      }

      // 5. Embaralhar e selecionar a quantidade desejada
      const selected = shuffle(uniqueCandidates).slice(0, count);

      // 6. Formatar no padrão oficial de questão do TKST Alunos
      const now = Date.now();
      return selected.map((item, idx) => {
        const id = `q_shotokan_${item.kyuNumber}_${now}_${idx + 1}`;
        return {
          id: id,
          kyuNumber: item.kyuNumber,
          beltName: item.beltName,
          topic: item.topic,
          category: item.category,
          question: item.question,
          options: item.options,
          correctIndex: item.correctIndex,
          correctAnswer: item.correctAnswer,
          wrongAnswers: item.wrongAnswers,
          source: "Estudo Especialista de Karatê Shotokan (JKA/WKF)"
        };
      });
    }
  };

  // Exportar globalmente para o ambiente do aplicativo
  window.TKST_SHOTOKAN_ENGINE = SHOTOKAN_ENGINE;

})();
