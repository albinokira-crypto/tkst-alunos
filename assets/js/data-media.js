/**
 * TKST Alunos - Catálogo de Mídias e Álbuns
 * Galeria esvaziada a pedido do Sensei - pronta para cadastro manual de novos álbuns e envio ao Cloudinary.
 */

window.TKST_ALBUMS = [];
window.TKST_DEFAULT_MEDIA = [];
window.TKST_MEDIA_CATEGORIES = [];

// Força limpeza de álbuns antigos e mídias cacheadas para V-2.60
(function() {
  try {
    const MEDIA_EMPTY_STAMP = 'tkst_media_empty_v260';
    const current = localStorage.getItem('tkst_media_empty_stamp');
    if (current !== MEDIA_EMPTY_STAMP) {
      localStorage.setItem('tkst_media_empty_stamp', MEDIA_EMPTY_STAMP);
      localStorage.setItem('tkst_custom_media', JSON.stringify([]));
      localStorage.setItem('tkst_custom_albums', JSON.stringify([]));
      localStorage.setItem('tkst_custom_subalbums', JSON.stringify([]));
      localStorage.removeItem('tkst_deleted_media');
      localStorage.removeItem('tkst_deleted_album_ids');
      localStorage.removeItem('tkst_deleted_subalbums');
    }
  } catch(e) {}
})();
