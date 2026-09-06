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
  {
    id: 'media_01',
    title: 'Exame de Faixa 2026 - Dojô Central',
    album: 'exames',
    category: 'exames',
    subAlbum: 'Exame de Faixa 2026 - Dojô Central',
    type: 'image',
    url: 'assets/images/exames/branca_img4.jpeg',
    thumbUrl: 'assets/images/exames/branca_img4.jpeg',
    date: '2026-03-01',
    author: 'Sensei Diego',
    dojo: 'TKST Matriz',
    description: 'Registro oficial do exame de graduação de faixas coloridas na TKST.'
  },
  {
    id: 'media_03',
    title: 'Cerimônia de Graduação & Entrega de Faixas',
    album: 'exames',
    category: 'exames',
    subAlbum: 'Exame de Faixa 2026 - Dojô Central',
    type: 'image',
    url: 'assets/images/exames/amarela_img4.jpeg',
    thumbUrl: 'assets/images/exames/amarela_img4.jpeg',
    date: '2026-02-15',
    author: 'Sensei Diego',
    dojo: 'TKST Matriz',
    description: 'Momento solene da entrega de faixas e certificados aos alunos aprovados.'
  },
  {
    id: 'media_02',
    title: 'Avaliação de Kihon e Postura',
    album: 'exames',
    category: 'exames',
    subAlbum: 'Exame de Graduação Dezembro 2025',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1555597673-b21d5c935865?w=1000&auto=format&fit=crop&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1555597673-b21d5c935865?w=500&auto=format&fit=crop&q=70',
    date: '2025-12-18',
    author: 'Sensei Diego',
    dojo: 'TKST Central',
    description: 'Aperfeiçoamento de postura, kime e foco durante banca examinadora.'
  },
  {
    id: 'media_05',
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
    id: 'media_04',
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
    id: 'media_06',
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
  {
    id: 'media_07',
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
    id: 'media_08',
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
