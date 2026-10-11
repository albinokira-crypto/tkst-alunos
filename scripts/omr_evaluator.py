#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TKST - Sistema de Leitura e Correção Automática de Cartões de Resposta (OMR)
Utiliza a biblioteca oficial Google GenAI (`google-genai`) com o modelo 'gemini-2.5-flash'
para visão computacional multimodal de alta precisão.

Requisitos de instalação:
    pip install google-genai pillow

Uso via linha de comando:
    python scripts/omr_evaluator.py --imagem caminho/da/folha.jpg
    python scripts/omr_evaluator.py --imagem caminho/da/folha.jpg --gabarito "D,C,C,B,C,C,D,D,B,B"
"""

import os
import sys
import json
import re
import argparse
from typing import Dict, Any, Optional, Tuple, Union
from pathlib import Path

# Tentativa de importação das bibliotecas principais
try:
    from PIL import Image
except ImportError:
    print("❌ Erro: A biblioteca 'Pillow' não está instalada. Execute: pip install pillow")
    sys.exit(1)

try:
    from google import genai
    from google.genai import types
except ImportError:
    print("❌ Erro: A biblioteca oficial 'google-genai' não está instalada. Execute: pip install google-genai")
    sys.exit(1)


# ==============================================================================
# 1. GERENCIAMENTO DE CONFIGURAÇÕES E CHAVE DE API
# ==============================================================================
def carregar_chave_api(api_key_param: Optional[str] = None) -> str:
    """
    Obtém a chave de API do Gemini em ordem de prioridade:
    1. Parâmetro explícito fornecido na chamada da função / CLI.
    2. Variável de ambiente `GEMINI_API_KEY`.
    3. Arquivo `.env` ou `.env.local` na raiz do projeto (se existir).
    
    [PONTO FLEXÍVEL]: Se o projeto possuir um gerenciador de configurações próprio
    (como dynaconf, pydantic-settings ou client global), importe-o aqui.
    """
    if api_key_param and api_key_param.strip():
        return api_key_param.strip()

    # 1. Variável de ambiente do sistema
    env_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if env_key:
        return env_key

    # 2. Busca em arquivos de configuração locais (.env / .env.local)
    diretorios_busca = [Path.cwd(), Path.cwd().parent, Path(__file__).resolve().parent.parent]
    arquivos_env = [".env.local", ".env"]

    for d in diretorios_busca:
        for f_name in arquivos_env:
            env_file = d / f_name
            if env_file.is_file():
                try:
                    with open(env_file, "r", encoding="utf-8") as f:
                        for line in f:
                            line = line.strip()
                            if line.startswith("GEMINI_API_KEY="):
                                key = line.split("=", 1)[1].strip().strip('"').strip("'")
                                if key:
                                    return key
                except Exception:
                    pass

    return ""


def obter_cliente_gemini(api_key: Optional[str] = None) -> genai.Client:
    """
    Inicializa e retorna uma instância do cliente oficial `google-genai`.
    """
    chave = carregar_chave_api(api_key)
    if not chave:
        raise ValueError(
            "Chave de API do Gemini não configurada! "
            "Defina a variável de ambiente GEMINI_API_KEY, adicione-a ao arquivo .env "
            "ou passe o parâmetro --api-key."
        )
    return genai.Client(api_key=chave)


# ==============================================================================
# 2. PROMPT DE RECONHECIMENTO VISUAL MULTIMODAL
# ==============================================================================
PROMPT_LEITURA_CARTAO_OMR = """
Você é um especialista em visão computacional de alta precisão e correção de gabaritos escolares e de artes marciais (OMR).
Sua tarefa é analisar a imagem do Cartão de Respostas oficial e do cabeçalho da prova para extrair os dados estruturados.

ESTRUTURA DO CARTÃO DE RESPOSTAS:
- Questões de 01 a 10 dispostas em colunas:
  * Coluna 1: Questões 01 a 05 com opções [A], [B], [C], [D]
  * Coluna 2: Questões 06 a 10 com opções [A], [B], [C], [D]

CRITÉRIOS DE LEITURA E IDENTIFICAÇÃO VISUAL:
1. MARCAÇÕES VÁLIDAS:
   - Os alunos preenchem a lápis ou caneta.
   - Considere preenchimentos totais, preenchimentos parciais, 'X' sobre a letra ou rabiscos densos no quadradinho como a resposta escolhida pelo aluno.
   - Retorne unicamente a letra maiúscula correspondente ("A", "B", "C" ou "D").
2. SEM MARCAÇÃO OU EM BRANCO:
   - Se nenhum quadradinho daquela questão foi marcado pelo aluno, retorne "NULO".
3. RASURAS OU MARCAÇÃO DUPLA:
   - Se houver duas marcações fortes e concorrentes na mesma questão ou rasura evidente de modo que não seja possível discernir a intenção real, retorne "DUVIDA".
4. CÓDIGO DA PROVA (SE VISÍVEL):
   - Se houver um badge de identificação (ex: "CÓDIGO: 0IZ96", "0IZ96" ou código de barras), extraia o código alfanumérico no campo "codigo_prova". Caso não esteja visível na foto, retorne "".
5. NOME DO ALUNO (SE VISÍVEL):
   - Se o campo "Nome:" estiver visível e preenchido, extraia o nome. Caso contrário, retorne "".

FORMATO OBRIGATÓRIO DE RETORNO (ESTRITAMENTE JSON):
Retorne única e exclusivamente um JSON válido no seguinte formato exato, sem textos adicionais antes ou depois:
{
  "codigo_prova": "0IZ96",
  "nome_aluno": "Nome do Aluno",
  "respostas": {
    "01": "D",
    "02": "C",
    "03": "C",
    "04": "B",
    "05": "C",
    "06": "C",
    "07": "D",
    "08": "D",
    "09": "B",
    "10": "B"
  }
}
""".strip()


# ==============================================================================
# 3. EXTRAÇÃO DAS RESPOSTAS VIA API GEMINI-2.5-FLASH
# ==============================================================================
def ler_cartao_respostas(
    caminho_imagem: Union[str, Path],
    modelo: str = "gemini-2.5-flash",
    cliente: Optional[genai.Client] = None,
    api_key: Optional[str] = None
) -> Dict[str, Any]:
    """
    Carrega a imagem, envia para a API Gemini Vision com o modelo 'gemini-2.5-flash'
    e retorna o JSON estruturado com as respostas identificadas de 01 a 10.
    
    Args:
        caminho_imagem: Caminho do arquivo da imagem (.jpg, .png, etc.)
        modelo: Nome do modelo ('gemini-2.5-flash' por padrão, com fallback para 2.0-flash se necessário)
        cliente: Instância opcional de genai.Client
        api_key: Chave opcional de API caso não esteja nas variáveis de ambiente

    Returns:
        dict no formato:
        {
            "codigo_prova": str,
            "nome_aluno": str,
            "respostas": {
                "01": "D", ... "10": "B"
            }
        }
    """
    path_img = Path(caminho_imagem)
    if not path_img.is_file():
        raise FileNotFoundError(f"Arquivo de imagem não encontrado: {caminho_imagem}")

    if cliente is None:
        cliente = obter_cliente_gemini(api_key)

    # Carrega a imagem utilizando Pillow (PIL)
    try:
        imagem_pil = Image.open(path_img)
        # Converte para RGB caso esteja em RGBA ou Palette
        if imagem_pil.mode not in ("RGB", "L"):
            imagem_pil = imagem_pil.convert("RGB")
    except Exception as e:
        raise ValueError(f"Falha ao abrir a imagem com Pillow: {e}")

    # Configuração de geração estruturada (JSON)
    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        temperature=0.1,
    )

    # Tentativa de chamada com o modelo solicitado e fallback automático resiliente
    modelos_candidatos = [modelo]
    if modelo != "gemini-2.0-flash":
        modelos_candidatos.append("gemini-2.0-flash")
    if "gemini-1.5-flash" not in modelos_candidatos:
        modelos_candidatos.append("gemini-1.5-flash")

    ultimo_erro = None
    resultado_texto = None

    for mod in modelos_candidatos:
        try:
            resposta = cliente.models.generate_content(
                model=mod,
                contents=[imagem_pil, PROMPT_LEITURA_CARTAO_OMR],
                config=config,
            )
            if resposta and resposta.text:
                resultado_texto = resposta.text
                break
        except Exception as err:
            ultimo_erro = err
            continue

    if not resultado_texto:
        raise RuntimeError(f"Não foi possível obter resposta da API Gemini: {ultimo_erro}")

    # Parsing e sanitização do JSON retornado
    dados_parseados = _extrair_json(resultado_texto)

    # Normalização para garantir o contrato das chaves "01" a "10"
    respostas_normalizadas = {}
    respostas_brutas = dados_parseados.get("respostas", {})
    if not isinstance(respostas_brutas, dict):
        # Se a IA retornou as chaves diretamente na raiz:
        respostas_brutas = dados_parseados

    for i in range(1, 11):
        num_str_2d = f"{i:02d}"  # "01", "02", ...
        num_str_1d = str(i)      # "1", "2", ...

        valor = respostas_brutas.get(num_str_2d) or respostas_brutas.get(num_str_1d)
        if valor:
            valor_limpo = str(valor).strip().upper()
            if valor_limpo in ("A", "B", "C", "D"):
                respostas_normalizadas[num_str_2d] = valor_limpo
            elif valor_limpo in ("NULO", "EM_BRANCO", "BRANCO", "VAZIO", "NONE"):
                respostas_normalizadas[num_str_2d] = "NULO"
            elif valor_limpo in ("DUVIDA", "DÚVIDA", "ANULADA", "RASURA"):
                respostas_normalizadas[num_str_2d] = "DUVIDA"
            else:
                respostas_normalizadas[num_str_2d] = valor_limpo
        else:
            respostas_normalizadas[num_str_2d] = "NULO"

    return {
        "codigo_prova": str(dados_parseados.get("codigo_prova", "")).strip(),
        "nome_aluno": str(dados_parseados.get("nome_aluno", "")).strip(),
        "respostas": respostas_normalizadas
    }


def _extrair_json(texto: str) -> Dict[str, Any]:
    """Auxiliar para extrair JSON de markdown com blocos de código ```json ... ```."""
    texto_limpo = texto.strip()
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", texto_limpo)
    if match:
        texto_limpo = match.group(1).strip()
    try:
        return json.loads(texto_limpo)
    except json.JSONDecodeError:
        # Tenta encontrar primeiro '{' e último '}'
        start = texto_limpo.find("{")
        end = texto_limpo.rfind("}")
        if start != -1 and end != -1:
            return json.loads(texto_limpo[start:end+1])
        raise


# ==============================================================================
# 4. FUNÇÃO DE CORREÇÃO AUTOMÁTICA (COMPUTAR PONTOS)
# ==============================================================================
def corrigir_prova(
    respostas_aluno: Dict[str, str],
    gabarito_oficial: Union[Dict[str, str], list, Tuple[str, ...]],
    pontos_por_questao: float = 1.0
) -> Dict[str, Any]:
    """
    Compara as respostas extraídas do cartão com o gabarito oficial da prova,
    calcula a nota final e produz o resumo de acertos e erros.

    Args:
        respostas_aluno: Dicionário retornado pela API contendo {'01': 'D', '02': 'C', ...}
        gabarito_oficial: Dicionário {'01': 'D', ...} ou lista/tupla ['D', 'C', ...] com 10 letras
        pontos_por_questao: Peso de cada questão (padrão: 1.0 ponto para escala de 0 a 10)

    Returns:
        Dicionário com nota final, total de acertos, erros e detalhamento.
    """
    # Normaliza o gabarito oficial para formato {'01': 'D', ... '10': 'B'}
    gabarito_norm: Dict[str, str] = {}
    if isinstance(gabarito_oficial, (list, tuple)):
        for idx, letra in enumerate(gabarito_oficial, start=1):
            gabarito_norm[f"{idx:02d}"] = str(letra).strip().upper()
    elif isinstance(gabarito_oficial, dict):
        for k, v in gabarito_oficial.items():
            num = int(re.sub(r"\D", "", str(k)) or 0)
            if 1 <= num <= 10:
                gabarito_norm[f"{num:02d}"] = str(v).strip().upper()

    total_questoes = 10
    acertos = 0
    erros = 0
    nulos = 0
    duvidas = 0
    detalhamento = []

    for i in range(1, total_questoes + 1):
        num_str = f"{i:02d}"
        resp_aluno = respostas_aluno.get(num_str, "NULO").upper()
        resp_esperada = gabarito_norm.get(num_str, "-").upper()

        status = "ERRO"
        if resp_aluno == "NULO":
            nulos += 1
            status = "EM_BRANCO"
        elif resp_aluno == "DUVIDA":
            duvidas += 1
            status = "ANULADA_RASURA"
        elif resp_aluno == resp_esperada:
            acertos += 1
            status = "ACERTO"
        else:
            erros += 1

        detalhamento.append({
            "questao": num_str,
            "marcado": resp_aluno,
            "gabarito": resp_esperada,
            "status": status,
            "correto": (status == "ACERTO")
        })

    nota_final = round(acertos * pontos_por_questao, 2)
    percentual_acerto = round((acertos / total_questoes) * 100, 1)

    return {
        "nota_final": nota_final,
        "nota_maxima": round(total_questoes * pontos_por_questao, 2),
        "percentual_acerto": percentual_acerto,
        "total_acertos": acertos,
        "total_erros": erros,
        "total_nulos": nulos,
        "total_duvidas": duvidas,
        "aprovado": nota_final >= 6.0,
        "detalhamento": detalhamento
    }


def exibir_relatorio_correcao(dados_leitura: Dict[str, Any], resultado_correcao: Optional[Dict[str, Any]] = None):
    """Exibe no terminal um relatório visual limpo e legível da correção."""
    print("\n" + "=" * 65)
    print("🥋 TKST - RESULTADO DA LEITURA DE CARTÃO DE RESPOSTAS")
    print("=" * 65)

    codigo = dados_leitura.get("codigo_prova")
    aluno = dados_leitura.get("nome_aluno")
    if codigo:
        print(f"📌 Código da Prova : {codigo}")
    if aluno:
        print(f"👤 Aluno           : {aluno}")

    print("\n📋 Respostas Identificadas (JSON):")
    print(json.dumps(dados_leitura.get("respostas", {}), indent=2, ensure_ascii=False))

    if resultado_correcao:
        print("\n" + "-" * 65)
        print("🎯 CORREÇÃO AUTOMÁTICA E NOTA FINAL")
        print("-" * 65)
        print(f"⭐ Nota Final : {resultado_correcao['nota_final']} / {resultado_correcao['nota_maxima']} ({resultado_correcao['percentual_acerto']}%)")
        print(f"✅ Acertos    : {resultado_correcao['total_acertos']} de 10")
        print(f"❌ Erros      : {resultado_correcao['total_erros']}")
        if resultado_correcao['total_nulos'] > 0:
            print(f"⚪ Em Branco  : {resultado_correcao['total_nulos']}")
        if resultado_correcao['total_duvidas'] > 0:
            print(f"⚠️ Rasuras    : {resultado_correcao['total_duvidas']}")

        status_aprov = "🟢 APROVADO (>= 6,0)" if resultado_correcao['aprovado'] else "🔴 REPROVADO (< 6,0)"
        print(f"📊 Status     : {status_aprov}")

        print("\nDetalhamento Questão a Questão:")
        print(f"{'Q':<5} {'Marcado':<10} {'Gabarito':<10} {'Resultado':<15}")
        print("-" * 45)
        for d in resultado_correcao['detalhamento']:
            simbolo = "✅ ACERTO" if d['correto'] else ("⚪ BRANCO" if d['status'] == "EM_BRANCO" else "❌ ERRO")
            print(f"{d['questao']:<5} {d['marcado']:<10} {d['gabarito']:<10} {simbolo:<15}")

    print("=" * 65 + "\n")


# ==============================================================================
# 5. EXECUÇÃO VIA LINHA DE COMANDO (CLI)
# ==============================================================================
def main():
    parser = argparse.ArgumentParser(
        description="Leitura automática de cartões de resposta (OMR) com Google GenAI e Gemini Vision."
    )
    parser.add_argument(
        "--imagem", "-i",
        required=True,
        help="Caminho da imagem do cartão de respostas (.jpg, .png, etc.)"
    )
    parser.add_argument(
        "--gabarito", "-g",
        default=None,
        help="Gabarito oficial separado por vírgula (ex: D,C,C,B,C,C,D,D,B,B) ou JSON"
    )
    parser.add_argument(
        "--modelo", "-m",
        default="gemini-2.5-flash",
        help="Modelo do Gemini a utilizar (padrão: gemini-2.5-flash)"
    )
    parser.add_argument(
        "--api-key", "-k",
        default=None,
        help="Chave de API do Gemini (caso não esteja na variável GEMINI_API_KEY)"
    )

    args = parser.parse_args()

    try:
        print(f"🔍 Analisando imagem: {args.imagem} com modelo {args.modelo}...")
        leitura = ler_cartao_respostas(
            caminho_imagem=args.imagem,
            modelo=args.modelo,
            api_key=args.api_key
        )

        resultado_correcao = None
        if args.gabarito:
            gabarito_raw = args.gabarito.strip()
            if gabarito_raw.startswith("{"):
                gabarito_oficial = json.loads(gabarito_raw)
            else:
                gabarito_oficial = [letra.strip().upper() for letra in gabarito_raw.split(",") if letra.strip()]
            resultado_correcao = corrigir_prova(leitura["respostas"], gabarito_oficial)

        exibir_relatorio_correcao(leitura, resultado_correcao)

    except Exception as e:
        print(f"\n❌ Erro durante a execução: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
