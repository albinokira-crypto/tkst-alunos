/**
 * TKST Alunos - Banco de Questões do Simulado
 * Banco esvaziado a pedido do Sensei - pronto para cadastro de novas questões.
 */

window.TKST_DEFAULT_QUIZ_BANK = [];
window.TKST_QUIZ_BANK = [];
window.TKST_QUIZ = [];

// Força limpeza e reset do banco local em todos os clientes para V-2.60
(function() {
  try {
    const QUIZ_STAMP = 'tkst_quiz_stamp_empty_v260';
    const currentStamp = localStorage.getItem('tkst_quiz_official_stamp');
    if (currentStamp !== QUIZ_STAMP) {
      localStorage.setItem('tkst_quiz_official_stamp', QUIZ_STAMP);
      localStorage.setItem('tkst_custom_quiz_bank', JSON.stringify([]));
      localStorage.removeItem('tkst_deleted_quiz_ids');
      window.TKST_QUIZ_BANK = [];
      window.TKST_QUIZ = [];
    } else {
      const customBank = JSON.parse(localStorage.getItem('tkst_custom_quiz_bank')) || [];
      window.TKST_QUIZ_BANK = customBank;
      window.TKST_QUIZ = customBank;
    }
  } catch(e) {
    window.TKST_QUIZ_BANK = [];
    window.TKST_QUIZ = [];
  }
})();
