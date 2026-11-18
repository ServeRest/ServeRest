#!/usr/bin/env bash
# Confere que a instância da URL guarda só a semente: em /usuarios, /produtos e /carrinhos, a quantidade e
# os _id dos arquivos de src/data. Roda depois do E2E na revisão nova, antes da promoção: um cadastro que a
# limpeza da suíte não apagou, ou um registro da semente que um teste apagou, iria para a produção nesta
# mesma instância.
#
# A semente sai dos arquivos do NeDB, no formato de persistência dele: uma linha por documento, a última
# linha de um _id vale, $$deleted apaga o documento e as linhas de índice não têm _id.
#
# Uso, na raiz do repositório: conferir-semente.sh <url>
set -uo pipefail

url=$1
falhou=0

for recurso in usuarios produtos carrinhos; do
  esperados=$(jq -sc '[.[] | select(has("_id"))] | group_by(._id) | map(last | select(."$$deleted" != true) | ._id) | sort' \
    "src/data/$recurso.db") || { echo "::error::Não foi possível ler src/data/$recurso.db"; exit 1; }

  # Logo depois do E2E o limite de requisições por IP pode responder 429 por alguns segundos.
  resposta=''
  for tentativa in 1 2 3; do
    resposta=$(curl --fail --silent --show-error --max-time 20 "$url/$recurso") && break
    resposta=''
    ((tentativa < 3)) && sleep 10
  done

  encontrados=$(jq -c --arg recurso "$recurso" '[.[$recurso][]._id] | sort' <<<"$resposta" 2>/dev/null)
  quantidade=$(jq -r '.quantidade' <<<"$resposta" 2>/dev/null)
  esperada=$(jq length <<<"$esperados")
  echo "$recurso: quantidade ${quantidade:-?}, esperada $esperada"

  if [[ -z "$encontrados" ]]; then
    echo "::error::$url/$recurso não respondeu uma lista de $recurso"
    falhou=1
  elif [[ "$encontrados" != "$esperados" || "$quantidade" != "$esperada" ]]; then
    diferenca=$(jq -nc --argjson e "$encontrados" --argjson s "$esperados" '{sobrando: ($e - $s), faltando: ($s - $e)}')
    echo "::error::$recurso difere da semente: quantidade $quantidade, esperada $esperada, _id $diferenca"
    falhou=1
  fi
done

if ((falhou)); then
  echo "::error::A instância em $url não guarda só a semente"
  exit 1
fi
echo "A instância em $url guarda só a semente"
