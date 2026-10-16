/**
 * TKST Alunos - Banco de Questões do Simulado
 * Persistência Segura com Cofre Permanente e Proteção Anti-Reset
 */

window.TKST_DEFAULT_QUIZ_BANK = [];
window.TKST_QUIZ_BANK = [];
window.TKST_QUIZ = [];

// ==TKST_CUSTOM_QUESTIONS_START==
// ==TKST_CUSTOM_QUESTIONS_END==

// Carregamento resiliente com proteção permanente: NUNCA apaga questões do usuário
(function() {
  try {
    // 1. Lê do armazenamento principal
    let customBank = [];
    try {
      customBank = JSON.parse(localStorage.getItem('tkst_custom_quiz_bank')) || [];
    } catch(e) { customBank = []; }

    // 2. Se estiver vazio, tenta recuperar do Cofre Permanente (Permanent Vault)
    if (!Array.isArray(customBank) || customBank.length === 0) {
      try {
        const vault = JSON.parse(localStorage.getItem('tkst_quiz_vault_permanent')) || [];
        if (Array.isArray(vault) && vault.length > 0) {
          customBank = vault;
          localStorage.setItem('tkst_custom_quiz_bank', JSON.stringify(vault));
        } else {
          // Tenta histórico de snapshots
          const history = JSON.parse(localStorage.getItem('tkst_quiz_backup_history') || '[]');
          if (Array.isArray(history) && history.length > 0 && Array.isArray(history[0].bank) && history[0].bank.length > 0) {
            customBank = history[0].bank;
            localStorage.setItem('tkst_custom_quiz_bank', JSON.stringify(customBank));
            localStorage.setItem('tkst_quiz_vault_permanent', JSON.stringify(customBank));
          }
        }
      } catch(e) {}
    } else {
      // Garante que o cofre permanente está sincronizado com as questões atuais
      try {
        localStorage.setItem('tkst_quiz_vault_permanent', JSON.stringify(customBank));
      } catch(e) {}
    }

    // 3. Define carimbo unificado com proteção definitiva
    localStorage.setItem('tkst_quiz_official_stamp', 'tkst_quiz_stamp_v261_protected');

    window.TKST_QUIZ_BANK = customBank;
    window.TKST_QUIZ = customBank;
  } catch(e) {
    window.TKST_QUIZ_BANK = [];
    window.TKST_QUIZ = [];
  }
})();
