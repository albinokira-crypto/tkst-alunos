// functions/api/quiz-commit.js
// Cloudflare Pages Function para commit do banco de questões
import { onRequestPost as quizPost, onRequestOptions as quizOptions } from './quiz-bank.js';

export async function onRequestOptions() {
  return quizOptions();
}

export async function onRequestPost(context) {
  return quizPost(context);
}
