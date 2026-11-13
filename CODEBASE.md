# 🥋 CODEBASE.md - TKST Alunos (Portal Oficial de Estudos e Graduações)

> **Guia Arquitetural de Referência Rápida para o Agente e Desenvolvedores.**  
> Consulte este arquivo ANTES de realizar qualquer busca cega ou varredura de código.

---

## 📌 Visão Geral da Arquitetura

O **TKST Alunos** é uma plataforma PWA full-stack para praticantes e mestres da TKST (Karate-Do Shotokan), hospedada na **Vercel** com APIs Serverless Node.js e banco na nuvem.  
Opera de forma 100% autônoma na nuvem, compatível com smartphone, tablet e desktop, com cache offline via Service Worker (`sw.js`).

- **Stack:** HTML5, CSS3, JavaScript Vanilla (ES6+), Node.js Serverless Functions (`/api`), Vercel Edge Network.
- **Hospedagem & Deploy:** Vercel (`tkst-alunos.vercel.app` / automação via GitHub).
- **Repositório:** `https://github.com/albinokira-crypto/tkst-alunos.git` (branch `main`).
- **Deploy Obrigatório:** Sempre que houver qualquer modificação, executar de forma autônoma:  
  `git add . ; git commit -m "..." ; git pull --rebase origin main ; git push origin main`

---

## 📂 Mapa de Arquivos do Projeto

### 🌐 Frontend (Páginas HTML & Configurações)
| Arquivo | Responsabilidade |
| :--- | :--- |
| `index.html` | Interface unificada: Dashboard, Exame de Faixa, Katas, Kumite, Quiz, Dicionário e Painel do Sensei (~70 KB). |
| `sincronizar.html` | Centro de sincronização offline/nuvem, status de rede e diagnóstico de armazenamento. |
| `recuperar-questoes.html` | Ferramenta de recuperação e restauração de questões customizadas do quiz. |
| `sw.js` | Service Worker com estratégia Cache-First e Background Sync para funcionamento offline. |
| `vercel.json` | Configuração de rotas, headers de segurança e memória/timeout das Serverless Functions. |

---

### 🧩 Módulos JavaScript do Cliente (`assets/js/`)
| Arquivo | Responsabilidade |
| :--- | :--- |
| `app.js` | Controlador central da UI: navegação entre abas, renderização de faixas, treinos, timer e modais (~930 KB). |
| `auth.js` | Autenticação do aluno/sensei, persistência de token, validação de permissões e controle de perfil (~220 KB). |
| `data-curriculum.js` | Matriz curricular e requisitos de graduação da TKST (Kihon, Kata e Kumite do 6º Kyu ao Shodan). |
| `data-katas.js` | Enciclopédia dos 26 Katas Shotokan: passo a passo, contagens, pontos de kiai e vídeos. |
| `data-kumite.js` | Guia prático de combate: Sanbon Kumite (1-5), Kihon Ippon Kumite, Jiyu Ippon e It Ban / Ni Ban. |
| `data-glossary.js` | Dicionário de termos em japonês (técnicas, bases, comandos de dojo e anatomia). |
| `data-quiz.js` | Banco central de questões teóricas para o simulador de exame de faixa. |
| `omr-engine.js` | Motor de processamento de imagem e leitura óptica de gabaritos (OMR). |
| `shotokan-ai-engine.js` | Assistente inteligente integrado com respostas técnicas sobre tradição e regras Shotokan. |
| `qr-generator.js` / `jsqr.min.js` | Geração de credenciais em QR Code e leitura via câmera para check-in. |

---

### ⚡ Backend Serverless (`api/*.js`)
| Endpoint | Função |
| :--- | :--- |
| `api/_auth.js` | Middleware de validação de assinatura de token e autorização das requisições. |
| `api/login.js` | Autenticação segura de alunos e administradores/senseis. |
| `api/sync.js` | Sincronização bidirecional de dados entre o armazenamento local e a nuvem. |
| `api/quiz-bank.js` | Consulta e filtro de questões do simulador por graduação e categoria. |
| `api/quiz-commit.js` | Criação, edição e persistência de novas questões personalizadas no banco em nuvem. |
| `api/submission-commit.js` | Registro e salvamento das provas teóricas e simulados respondidos pelos alunos. |
| `api/exam-correct.js` | Motor backend de correção de gabaritos e cálculo automático de notas. |
| `api/student-commit.js` | Atualização de perfil cadastral, graduação e histórico de treinos do aluno. |
| `api/glossary.js` / `glossary-commit.js` | Consulta e atualização colaborativa de termos do glossário. |
| `api/kata-commit.js` | Atualização de metadados, links e descrições dos katas. |

---

## 🚀 Fluxo de Modificação Recomendado
1. **Alterações de Quiz:** `assets/js/data-quiz.js`, `api/quiz-bank.js` e `api/quiz-commit.js`.
2. **Alterações de Currículo/Katas:** `assets/js/data-curriculum.js` e `assets/js/data-katas.js`.
3. **Alterações de Visual/Layout:** `assets/css/` e `index.html`.
4. **Deploy Automático Obrigatório:** Enviar commit para `main` imediatamente após a alteração.
