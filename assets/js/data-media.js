/**
 * TKST Alunos - Catálogo Oficial de Mídias & Estrutura de Álbuns
 * Álbuns principais:
 * 1. Exame de faixa (com suporte completo a subálbuns de exames específicos)
 * 2. Competições (fotos e vídeos de campeonatos e pódios)
 * 3. Vídeos Didáticos (aulas em vídeo de Katas e técnicas)
 */

window.TKST_ALBUMS = [
  {
    id: 'exames',
    title: 'Exame de Faixa',
    icon: 'fas fa-graduation-cap',
    badge: 'Graduações',
    description: 'Registros fotográficos e vídeos separados por cada exame de graduação.',
    cover: 'assets/images/exames/branca_img4.jpeg',
    hasSubAlbums: true
  },
  {
    id: 'competicoes',
    title: 'Competições',
    icon: 'fas fa-trophy',
    badge: 'Campeonatos',
    description: 'Torneios, pódios e conquistas dos atletas e instrutores da TKST.',
    cover: 'assets/images/exames/vermelha_img4.jpeg',
    hasSubAlbums: false
  },
  {
    id: 'didaticos',
    title: 'Vídeos Didáticos',
    icon: 'fas fa-video',
    badge: 'Estudo Técnico',
    description: 'Vídeos didáticos para estudo de Katas, Kihon, Bunkai e aplicações práticas.',
    cover: 'https://img.youtube.com/vi/FqS_tPZ-3kM/hqdefault.jpg',
    hasSubAlbums: false
  }
];

window.TKST_DEFAULT_MEDIA = [
  // --- SUBÁLBUM: Exame de Faixa Branca ---
  {
    id: 'media_branca_01',
    title: 'Exame de Faixa Branca - Treino e Kihon',
    album: 'exames',
    category: 'exames',
    subAlbum: 'Exame de Faixa Branca',
    type: 'image',
    url: 'assets/images/exames/branca_img1.png',
    thumbUrl: 'assets/images/exames/branca_img1.png',
    date: '2026-03-01',
    author: 'Sensei Diego',
    dojo: 'TKST Central',
    description: 'Exercícios preparatórios e treinamento técnico de Kihon para o exame de Faixa Branca.'
  },
  {
    id: 'media_branca_02',
    title: 'Exame de Faixa Branca - Apresentação Técnica',
    album: 'exames',
    category: 'exames',
    subAlbum: 'Exame de Faixa Branca',
    type: 'image',
    url: 'assets/images/exames/branca_img2.png',
    thumbUrl: 'assets/images/exames/branca_img2.png',
    date: '2026-03-01',
    author: 'Sensei Diego',
    dojo: 'TKST Central',
    description: 'Execução das posturas e defesas fundamentais sob avaliação dos instrutores.'
  },
  {
    id: 'media_branca_03',
    title: 'Exame de Faixa Branca - Avaliação de Postura',
    album: 'exames',
    category: 'exames',
    subAlbum: 'Exame de Faixa Branca',
    type: 'image',
    url: 'assets/images/exames/branca_img3.png',
    thumbUrl: 'assets/images/exames/branca_img3.png',
    date: '2026-03-01',
    author: 'Sensei Diego',
    dojo: 'TKST Central',
    description: 'Aperfeiçoamento de Zenkutsu Dachi e alinhamento corporal durante a banca examinadora.'
  },
  {
    id: 'media_branca_04',
    title: 'Exame de Faixa Branca - Cerimônia Oficial',
    album: 'exames',
    category: 'exames',
    subAlbum: 'Exame de Faixa Branca',
    type: 'image',
    url: 'assets/images/exames/branca_img4.jpeg',
    thumbUrl: 'assets/images/exames/branca_img4.jpeg',
    date: '2026-03-01',
    author: 'Sensei Diego',
    dojo: 'TKST Matriz',
    description: 'Registro oficial solene da graduação dos novos karatecas da Associação TKST.'
  },
  {
    id: 'media_branca_05',
    title: 'Exame de Faixa Branca - Registro dos Aprovados',
    album: 'exames',
    category: 'exames',
    subAlbum: 'Exame de Faixa Branca',
    type: 'image',
    url: 'assets/images/exames/branca_img5.jpg',
    thumbUrl: 'assets/images/exames/branca_img5.jpg',
    date: '2026-03-01',
    author: 'Sensei Diego',
    dojo: 'TKST Matriz',
    description: 'Alunos celebrando a aprovação na primeira etapa de graduação marcial.'
  },

  // --- SUBÁLBUM: Exame de Faixa Amarela ---
  {
    id: 'media_amarela_01',
    title: 'Exame de Faixa Amarela - Kihon e Kime',
    album: 'exames',
    category: 'exames',
    subAlbum: 'Exame de Faixa Amarela',
    type: 'image',
    url: 'assets/images/exames/amarela_img1.png',
    thumbUrl: 'assets/images/exames/amarela_img1.png',
    date: '2026-02-15',
    author: 'Sensei Diego',
    dojo: 'TKST Central',
    description: 'Demonstração de força e velocidade nas técnicas de soco e chute de 6º Kyu.'
  },
  {
    id: 'media_amarela_02',
    title: 'Exame de Faixa Amarela - Aplicação de Kata',
    album: 'exames',
    category: 'exames',
    subAlbum: 'Exame de Faixa Amarela',
    type: 'image',
    url: 'assets/images/exames/amarela_img2.png',
    thumbUrl: 'assets/images/exames/amarela_img2.png',
    date: '2026-02-15',
    author: 'Sensei Diego',
    dojo: 'TKST Central',
    description: 'Execução do Heian Shodan com ritmo e postura tradicional Shotokan.'
  },
  {
    id: 'media_amarela_03',
    title: 'Exame de Faixa Amarela - Avaliação dos Alunos',
    album: 'exames',
    category: 'exames',
    subAlbum: 'Exame de Faixa Amarela',
    type: 'image',
    url: 'assets/images/exames/amarela_img3.png',
    thumbUrl: 'assets/images/exames/amarela_img3.png',
    date: '2026-02-15',
    author: 'Sensei Diego',
    dojo: 'TKST Central',
    description: 'Sensei orientando os candidatos à faixa amarela nos detalhes biomecânicos.'
  },
  {
    id: 'media_amarela_04',
    title: 'Exame de Faixa Amarela - Cerimônia de Graduação',
    album: 'exames',
    category: 'exames',
    subAlbum: 'Exame de Faixa Amarela',
    type: 'image',
    url: 'assets/images/exames/amarela_img4.jpeg',
    thumbUrl: 'assets/images/exames/amarela_img4.jpeg',
    date: '2026-02-15',
    author: 'Sensei Diego',
    dojo: 'TKST Matriz',
    description: 'Momento solene da entrega de faixas amarelas e certificados de graduação.'
  },
  {
    id: 'media_amarela_05',
    title: 'Exame de Faixa Amarela - Nova Graduação Conquistada',
    album: 'exames',
    category: 'exames',
    subAlbum: 'Exame de Faixa Amarela',
    type: 'image',
    url: 'assets/images/exames/amarela_img5.jpg',
    thumbUrl: 'assets/images/exames/amarela_img5.jpg',
    date: '2026-02-15',
    author: 'Sensei Diego',
    dojo: 'TKST Matriz',
    description: 'Alunos graduados com as novas faixas amarelas conquistadas com dedicação.'
  },

  // --- SUBÁLBUM: Exame de Faixa Vermelha ---
  {
    id: 'media_vermelha_01',
    title: 'Exame de Faixa Vermelha - Concentração e Foco',
    album: 'exames',
    category: 'exames',
    subAlbum: 'Exame de Faixa Vermelha',
    type: 'image',
    url: 'assets/images/exames/vermelha_img1.png',
    thumbUrl: 'assets/images/exames/vermelha_img1.png',
    date: '2026-01-28',
    author: 'Equipe TKST',
    dojo: 'TKST Matriz',
    description: 'Preparação mental e técnica dos atletas para a graduação de 5º Kyu.'
  },
  {
    id: 'media_vermelha_02',
    title: 'Exame de Faixa Vermelha - Demonstração de Técnicas',
    album: 'exames',
    category: 'exames',
    subAlbum: 'Exame de Faixa Vermelha',
    type: 'image',
    url: 'assets/images/exames/vermelha_img2.png',
    thumbUrl: 'assets/images/exames/vermelha_img2.png',
    date: '2026-01-28',
    author: 'Equipe TKST',
    dojo: 'TKST Matriz',
    description: 'Apresentação detalhada de Kihon intermediário com combinações de ataque e defesa.'
  },
  {
    id: 'media_vermelha_03',
    title: 'Exame de Faixa Vermelha - Kumite e Espírito Marcial',
    album: 'exames',
    category: 'exames',
    subAlbum: 'Exame de Faixa Vermelha',
    type: 'image',
    url: 'assets/images/exames/vermelha_img3.png',
    thumbUrl: 'assets/images/exames/vermelha_img3.png',
    date: '2026-01-28',
    author: 'Equipe TKST',
    dojo: 'TKST Matriz',
    description: 'Aplicação prática do Kihon Ippon Kumite com kime, foco e respeito ao oponente.'
  },
  {
    id: 'media_vermelha_04',
    title: 'Exame de Faixa Vermelha - Pódio e Graduação',
    album: 'exames',
    category: 'exames',
    subAlbum: 'Exame de Faixa Vermelha',
    type: 'image',
    url: 'assets/images/exames/vermelha_img4.jpeg',
    thumbUrl: 'assets/images/exames/vermelha_img4.jpeg',
    date: '2026-01-28',
    author: 'Equipe TKST',
    dojo: 'TKST Matriz',
    description: 'Cerimônia de graduação dos aprovados na Faixa Vermelha (5º Kyu).'
  },
  {
    id: 'media_vermelha_05',
    title: 'Exame de Faixa Vermelha - Cerimônia Oficial de Faixas',
    album: 'exames',
    category: 'exames',
    subAlbum: 'Exame de Faixa Vermelha',
    type: 'image',
    url: 'assets/images/exames/vermelha_img5.jpg',
    thumbUrl: 'assets/images/exames/vermelha_img5.jpg',
    date: '2026-01-28',
    author: 'Equipe TKST',
    dojo: 'TKST Matriz',
    description: 'Confraternização dos novos faixas vermelhas e instrutores da Associação TKST.'
  },

  // --- ÁLBUM: Competições ---
  {
    id: 'media_comp_01',
    title: 'Campeonato Regional - Pódio & Conquistas',
    album: 'competicoes',
    category: 'competicoes',
    subAlbum: 'Campeonato Regional 2026',
    type: 'image',
    url: 'assets/images/exames/vermelha_img4.jpeg',
    thumbUrl: 'assets/images/exames/vermelha_img4.jpeg',
    date: '2026-01-28',
    author: 'Equipe TKST',
    dojo: 'TKST Geral',
    description: 'Participação dos atletas da Associação TKST no torneio de Karatê-Dô Shotokan.'
  },
  {
    id: 'media_comp_02',
    title: 'Disputa de Kumite no Torneio Aberto',
    album: 'competicoes',
    category: 'competicoes',
    subAlbum: 'Torneio Aberto de Karatê',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1000&auto=format&fit=crop&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=500&auto=format&fit=crop&q=70',
    date: '2026-01-22',
    author: 'Instrutores TKST',
    dojo: 'TKST Polo Sul',
    description: 'Combate de atletas da TKST demonstrando técnica e respeito marcial.'
  },
  {
    id: 'media_comp_03',
    title: 'Delegação TKST - Cerimônia de Premiação',
    album: 'competicoes',
    category: 'competicoes',
    subAlbum: 'Campeonato Regional 2026',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=1000&auto=format&fit=crop&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=500&auto=format&fit=crop&q=70',
    date: '2026-01-20',
    author: 'Sensei Diego',
    dojo: 'TKST Matriz',
    description: 'Atletas e comissão técnica celebrando o excelente desempenho na competição.'
  },

  // --- ÁLBUM: Vídeos Didáticos ---
  {
    id: 'media_didatico_01',
    title: 'Vídeo Didático: Heian Shodan Completo',
    album: 'didaticos',
    category: 'didaticos',
    subAlbum: 'Katas Heian',
    type: 'video',
    url: 'https://www.youtube.com/watch?v=FqS_tPZ-3kM',
    thumbUrl: 'https://img.youtube.com/vi/FqS_tPZ-3kM/hqdefault.jpg',
    date: '2026-01-15',
    author: 'Sensei Diego',
    dojo: 'TKST Matriz',
    description: 'Execução técnica detalhada do primeiro Kata Heian para estudo e aperfeiçoamento dos alunos.'
  },
  {
    id: 'media_didatico_02',
    title: 'Vídeo Técnico: Bunkai & Defesas',
    album: 'didaticos',
    category: 'didaticos',
    subAlbum: 'Bunkai & Kihon',
    type: 'video',
    url: 'https://www.youtube.com/watch?v=Fj2F27tB74s',
    thumbUrl: 'https://img.youtube.com/vi/Fj2F27tB74s/hqdefault.jpg',
    date: '2026-01-10',
    author: 'Sensei Diego',
    dojo: 'TKST Matriz',
    description: 'Estudo prático das defesas Gedan Barai e Age Uke com explicações biomecânicas.'
  }
];

window.TKST_MEDIA_CATEGORIES = [
  { id: 'all', label: 'Todos os Álbuns', icon: 'fas fa-folder-open' },
  { id: 'exames', label: 'Exame de Faixa', icon: 'fas fa-graduation-cap' },
  { id: 'competicoes', label: 'Competições', icon: 'fas fa-trophy' },
  { id: 'didaticos', label: 'Vídeos Didáticos', icon: 'fas fa-video' }
];
