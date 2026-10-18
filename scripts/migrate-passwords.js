// scripts/migrate-passwords.js
// Migração de senhas e dados sensíveis em assets/data/students.json
// Converte senhas em texto plano para PBKDF2-SHA256 (100.000 iterações + salt de 16 bytes)
// Remove senhas e telefones em texto plano do arquivo estático público.

const fs = require('fs');
const path = require('path');
const { hashPassword, generateSalt } = require('../api/_auth');

const studentsFile = path.resolve(__dirname, '..', 'assets', 'data', 'students.json');

if (!fs.existsSync(studentsFile)) {
  console.error(`Arquivo não encontrado: ${studentsFile}`);
  process.exit(1);
}

try {
  const raw = fs.readFileSync(studentsFile, 'utf8');
  const data = JSON.parse(raw);

  if (!Array.isArray(data.students)) {
    console.error('students.json não contém o array "students"');
    process.exit(1);
  }

  let migratedCount = 0;
  let phoneCleanedCount = 0;

  data.students = data.students.map(student => {
    if (!student || typeof student !== 'object') return student;
    const s = { ...student };

    // Se já tiver password em texto plano, migra para hash + salt
    if (s.password) {
      const salt = s.passwordSalt || generateSalt();
      const hash = hashPassword(s.password, salt);
      s.passwordSalt = salt;
      s.passwordHash = hash;
      delete s.password;
      migratedCount++;
    }

    // Remove telefone em texto plano para conformidade com privacidade
    if (s.phone) {
      delete s.phone;
      phoneCleanedCount++;
    }

    return s;
  });

  data.updatedAt = Date.now();

  fs.writeFileSync(studentsFile, JSON.stringify(data, null, 2), 'utf8');
  console.log(`✅ Migração concluída com sucesso!`);
  console.log(`   - Senhas migradas para PBKDF2: ${migratedCount}`);
  console.log(`   - Telefones removidos do JSON público: ${phoneCleanedCount}`);
  console.log(`   - Total de alunos: ${data.students.length}`);
} catch (err) {
  console.error('Erro na migração:', err);
  process.exit(1);
}
