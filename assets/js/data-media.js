/**
 * TKST Alunos - Catálogo Oficial de Mídias & Estrutura de Álbuns
 * Álbuns principais:
 * 1. Exame de faixa (com suporte completo a subálbuns de exames específicos)
 * 2. Competições (fotos e vídeos de campeonatos e pódios)
 * 3. Vídeos Didáticos (aulas em vídeo de Katas e técnicas)
 *
 * NOTA: As fotos e vídeos adicionados pelo Sensei e alunos são hospedados diretamente
 * no Cloudinary via uploadToCloudinary no app.js, sem acumular peso local no app.
 */

window.TKST_ALBUMS = [
  {
    id: 'exames',
    title: 'Exame de Faixa',
    icon: 'fas fa-graduation-cap',
    badge: 'Graduações',
    description: 'Registros fotográficos e vídeos separados por cada exame de graduação.',
    cover: 'assets/images/logo-tkst-alunos.png',
    hasSubAlbums: true
  },
  {
    id: 'competicoes',
    title: 'Competições',
    icon: 'fas fa-trophy',
    badge: 'Campeonatos',
    description: 'Torneios, pódios e conquistas dos atletas e instrutores da TKST.',
    cover: 'assets/images/tigre.png',
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

// Mídias oficiais base (apenas vídeos didáticos reais; fotos de exame e campeonatos vêm 100% do Cloudinary)
window.TKST_DEFAULT_MEDIA = [
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
