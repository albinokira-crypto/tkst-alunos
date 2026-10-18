// tests/omr/test-omr.js
// Executável de Testes Automatizados para o Pipeline OMR
// Garante taxa de acerto >95% em fixtures sintéticas e simuladas

const { generateSyntheticCard, evaluateGrid } = require('./omr-simulator.js');

function runOmrTestSuite() {
  console.log('🥋 Iniciando Testes Automatizados do Pipeline OMR TKST...\n');

  let totalQuestionsEvaluated = 0;
  let totalCorrect = 0;

  // FIXTURE 1: Gabarito Limpo Padrão (10 questões 100% preenchidas)
  const cleanAnswers = ['A', 'C', 'B', 'D', 'A', 'B', 'D', 'C', 'A', 'D'];
  const card1 = generateSyntheticCard(cleanAnswers);
  const result1 = evaluateGrid(card1.buffer, card1.width, card1.height);

  console.log('--- Teste 1: Gabarito Padrão Limpo ---');
  let cleanSuccess = 0;
  result1.forEach((res, idx) => {
    totalQuestionsEvaluated++;
    const expected = cleanAnswers[idx];
    if (res.answer === expected) {
      totalCorrect++;
      cleanSuccess++;
    }
  });
  console.log(`Resultado: ${cleanSuccess}/10 questões corretas (${cleanSuccess * 10}%)\n`);

  // FIXTURE 2: Testes Aleatórios Múltiplos (20 cartões x 10 questões = 200 questões)
  console.log('--- Teste 2: Bateria de 20 Provas com Respostas Aleatórias ---');
  const options = ['A', 'B', 'C', 'D'];
  let batchCorrect = 0;
  const numTrials = 20;

  for (let t = 0; t < numTrials; t++) {
    const trialAnswers = Array.from({ length: 10 }, () => options[Math.floor(Math.random() * 4)]);
    const card = generateSyntheticCard(trialAnswers);
    const evalRes = evaluateGrid(card.buffer, card.width, card.height);

    evalRes.forEach((res, idx) => {
      totalQuestionsEvaluated++;
      if (res.answer === trialAnswers[idx]) {
        totalCorrect++;
        batchCorrect++;
      }
    });
  }
  const batchTotal = numTrials * 10;
  const batchRate = ((batchCorrect / batchTotal) * 100).toFixed(1);
  console.log(`Resultado: ${batchCorrect}/${batchTotal} questões corretas (${batchRate}%)\n`);

  // FIXTURE 3: Gabarito com Marcas Fracas (lápis fraco)
  console.log('--- Teste 3: Gabarito com Marcas Fracas (Q3 e Q7 fracas) ---');
  const weakAnswers = ['B', 'B', 'D', 'A', 'C', 'D', 'A', 'C', 'B', 'A'];
  const card3 = generateSyntheticCard(weakAnswers, { weakMarks: [3, 7] });
  const result3 = evaluateGrid(card3.buffer, card3.width, card3.height);

  let weakCorrect = 0;
  result3.forEach((res, idx) => {
    totalQuestionsEvaluated++;
    if (res.answer === weakAnswers[idx]) {
      totalCorrect++;
      weakCorrect++;
    }
  });
  console.log(`Resultado: ${weakCorrect}/10 questões detectadas corretamente (${weakCorrect * 10}%)\n`);

  // FIXTURE 4: Gabarito com Rasuras (Q2 e Q8 rasuradas e corrigidas)
  console.log('--- Teste 4: Detecção de Rasuras (Q2 e Q8 com rasura) ---');
  const eraseAnswers = ['C', 'A', 'D', 'B', 'A', 'C', 'B', 'D', 'A', 'C'];
  const card4 = generateSyntheticCard(eraseAnswers, { erasures: { 2: 'B', 8: 'A' } });
  const result4 = evaluateGrid(card4.buffer, card4.width, card4.height);

  let eraseSuccess = 0;
  result4.forEach((res, idx) => {
    totalQuestionsEvaluated++;
    if (res.answer === eraseAnswers[idx]) {
      totalCorrect++;
      eraseSuccess++;
    }
  });
  console.log(`Resultado: ${eraseSuccess}/10 intenções detectadas corretamente (${eraseSuccess * 10}%)\n`);

  // RELATÓRIO FINAL
  const overallAccuracy = ((totalCorrect / totalQuestionsEvaluated) * 100).toFixed(2);
  console.log('==================================================');
  console.log(`📊 TOTAL DE QUESTÕES AVALIADAS: ${totalQuestionsEvaluated}`);
  console.log(`✅ TOTAL DE ACERTOS: ${totalCorrect}`);
  console.log(`🎯 TAXA DE ACERTO FINAL: ${overallAccuracy}%`);
  console.log('==================================================\n');

  if (parseFloat(overallAccuracy) >= 95.0) {
    console.log('🎉 SUCESSO: Taxa de acerto superior à meta de 95% estipulada pela Fase 2!');
    return true;
  } else {
    console.error('❌ FALHA: Taxa de acerto abaixo de 95%.');
    return false;
  }
}

if (require.main === module) {
  const passed = runOmrTestSuite();
  if (!passed) process.exit(1);
}

module.exports = { runOmrTestSuite };
