// functions/api/glossary-commit.js
// Cloudflare Pages Function para commit do dicionário japonês
import { onRequestPost as glossaryPost, onRequestOptions as glossaryOptions } from './glossary.js';

export async function onRequestOptions() {
  return glossaryOptions();
}

export async function onRequestPost(context) {
  return glossaryPost(context);
}
