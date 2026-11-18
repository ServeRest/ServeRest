#!/usr/bin/env bash
# Confere que a instância da URL guarda só a semente, sem alteração: em /usuarios, /produtos e /carrinhos,
# os mesmos documentos dos arquivos de src/data, campo a campo. Roda depois do E2E na revisão nova, antes da
# promoção: um cadastro que a limpeza da suíte não apagou, um registro da semente que um teste apagou, ou um
# que um teste alterou (a senha de fulano@qa.com, o estoque de um produto depois de uma compra) iria para a
# produção nesta mesma instância.
#
# A semente sai dos arquivos do NeDB, no formato de persistência dele: uma linha por documento, a última
# linha de um _id vale, $$deleted apaga o documento e as linhas de índice não têm _id. O campo interno
# alteradoEm (src/utils/ordemDeAlteracao.js) nunca sai no GET, então não entra na comparação.
#
# Uso, na raiz do repositório: conferir-semente.sh <url>
set -uo pipefail

url=$1
falhou=0

for recurso in usuarios produtos carrinhos; do
  esperados=$(jq -sc '[.[] | select(has("_id"))] | group_by(._id) | map(last | select(."$$deleted" != true) | del(.alteradoEm))' \
    "src/data/$recurso.db") || { echo "::error::Não foi possível ler src/data/$recurso.db"; exit 1; }

  # Logo depois do E2E o limite de requisições por IP pode responder 429 por alguns segundos.
  resposta=''
  for tentativa in 1 2 3; do
    resposta=$(curl --fail --silent --show-error --max-time 20 "$url/$recurso") && break
    resposta=''
    ((tentativa < 3)) && sleep 10
  done

  encontrados=$(jq -c --arg recurso "$recurso" '.[$recurso] | sort_by(._id)' <<<"$resposta" 2>/dev/null)
  quantidade=$(jq -r '.quantidade' <<<"$resposta" 2>/dev/null)
  esperada=$(jq length <<<"$esperados")
  echo "$recurso: quantidade ${quantidade:-?}, esperada $esperada"

  if [[ -z "$encontrados" || "$encontrados" == null ]]; then
    echo "::error::$url/$recurso não respondeu uma lista de $recurso"
    falhou=1
    continue
  fi
  # A comparação do jq não depende da ordem das chaves. Só o nome dos campos alterados vai para o log.
  diferenca=$(jq -nc --argjson e "$encontrados" --argjson s "$esperados" '
    ($e | map({(._id): .}) | add // {}) as $E | ($s | map({(._id): .}) | add // {}) as $S |
    {
      sobrando: ($E | keys - ($S | keys)),
      faltando: ($S | keys - ($E | keys)),
      alterados: [$S | keys[] | select($E[.] != null and $E[.] != $S[.]) as $id |
        {_id: $id, campos: ([$E[$id], $S[$id]] | map(keys) | add | unique | map(select($E[$id][.] != $S[$id][.])))}]
    }')
  if [[ "$quantidade" != "$esperada" || "$diferenca" != '{"sobrando":[],"faltando":[],"alterados":[]}' ]]; then
    echo "::error::$recurso difere da semente: quantidade $quantidade, esperada $esperada, $diferenca"
    falhou=1
  fi
done

if ((falhou)); then
  echo "::error::A instância em $url não guarda só a semente"
  exit 1
fi
echo "A instância em $url guarda só a semente, sem alteração"
