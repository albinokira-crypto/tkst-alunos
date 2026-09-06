/**
 * TKST Alunos - Catálogo Oficial de Mídias (Fotos & Vídeos)
 * Opção 1: Links externos otimizados via CDN / URLs diretas com zero consumo de espaço no repositório / Vercel.
 */

window.TKST_DEFAULT_MEDIA = [
  {
    id: 'media_01',
    title: 'Exame de Faixa 2026 - Dojô Central',
    category: 'exames',
    type: 'image',
    url: 'assets/images/exames/branca_img4.jpeg',
    thumbUrl: 'assets/images/exames/branca_img4.jpeg',
    date: '2026-03-01',
    author: 'Sensei Diego',
    dojo: 'TKST Matriz',
    description: 'Registro oficial do exame de graduação de faixas coloridas na TKST.'
  },
  {
    id: 'media_02',
    title: 'Treino Especial de Kihon & Bunkai',
    category: 'treinos',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1555597673-b21d5c935865?w=1000&auto=format&fit=crop&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1555597673-b21d5c935865?w=500&auto=format&fit=crop&q=70',
    date: '2026-02-20',
    author: 'TKST Central',
    dojo: 'TKST Central',
    description: 'Aperfeiçoamento de postura, kime e foco nos treinamentos da equipe.'
  },
  {
    id: 'media_03',
    title: 'Cerimônia de Graduação & Entrega de Faixas',
    category: 'exames',
    type: 'image',
    url: 'assets/images/exames/amarela_img4.jpeg',
    thumbUrl: 'assets/images/exames/amarela_img4.jpeg',
    date: '2026-02-15',
    author: 'Sensei Diego',
    dojo: 'TKST Matriz',
    description: 'Momento solene da entrega de faixas e certificados aos alunos aprovados.'
  },
  {
    id: 'media_04',
    title: 'Treinamento de Kumite & Esquivas',
    category: 'treinos',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1000&auto=format&fit=crop&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=500&auto=format&fit=crop&q=70',
    date: '2026-02-10',
    author: 'Instrutores TKST',
    dojo: 'TKST Polo Sul',
    description: 'Prática de Gohon Kumite e Kihon Ippon Kumite com distância correta (Maai).'
  },
  {
    id: 'media_05',
    title: 'Campeonato Regional - Pódio & Conquistas',
    category: 'campeonatos',
    type: 'image',
    url: 'assets/images/exames/vermelha_img4.jpeg',
    thumbUrl: 'assets/images/exames/vermelha_img4.jpeg',
    date: '2026-01-28',
    author: 'Equipe TKST',
    dojo: 'TKST Geral',
    description: 'Participação dos atletas da Associação TKST no torneio de Karatê-Dô Shotokan.'
  },
  {
    id: 'media_06',
    title: 'Seminário de Aperfeiçoamento Técnico',
    category: 'treinos',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=1000&auto=format&fit=crop&q=80',
    thumbUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=500&auto=format&fit=crop&q=70',
    date: '2026-01-20',
    author: 'Sensei Diego',
    dojo: 'TKST Matriz',
    description: 'Seminário imersivo com estudo dos 20 Preceitos do Niju Kun e aplicação marcial.'
  },
  {
    id: 'media_07',
    title: 'Vídeo Didático: Heian Shodan Completo',
    category: 'didaticos',
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
    category: 'didaticos',
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
  { id: 'all', label: 'Todas as Mídias', icon: 'fas fa-border-all' },
  { id: 'exames', label: 'Exames de Faixa', icon: 'fas fa-graduation-cap' },
  { id: 'treinos', label: 'Treinos & Seminários', icon: 'fas fa-fist-raised' },
  { id: 'campeonatos', label: 'Campeonatos', icon: 'fas fa-trophy' },
  { id: 'didaticos', label: 'Vídeos Didáticos', icon: 'fas fa-video' }
];
