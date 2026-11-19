#!/usr/bin/env bash
# Depois de um rollback de produção, devolve a tag production do Pact Broker à versão que voltou a servir o
# tráfego. A versão do provider no broker é o commit (test/contract: providerVersion é o git rev-parse HEAD), e
# o commit de cada revisão sai da imagem dela: o deploy usa gcr.io/<projeto>/<imagem>:<commit>.
#
# Primeiro a tag volta para a anterior (se ela já a tem, o PUT não muda nada), depois sai da revertida: o broker
# considera a versão mais nova com a tag, então só tirar a tag da revertida já devolveria a anterior, mas assim
# nenhum instante fica sem versão com a tag. A versão anterior precisa existir no broker: a tag não cria versão.
# Uma tag que a revertida não tem (a promoção falhou antes de marcá-la) responde 404 e conta como já tirada.
#
# Entrada (ambiente): PACT_BROKER_BASE_URL, PACT_BROKER_TOKEN, REGIAO, REVISAO_REVERTIDA, REVISAO_ANTERIOR e,
# opcionais, PACTICIPANT e TAG. O gcloud já autenticado e com o projeto do serviço configurado.
set -euo pipefail

: "${PACT_BROKER_BASE_URL:?}" "${PACT_BROKER_TOKEN:?}" "${REGIAO:?}" "${REVISAO_REVERTIDA:?}" "${REVISAO_ANTERIOR:?}"
PACTICIPANT=${PACTICIPANT:-ServeRest - API Rest}
TAG=${TAG:-production}

commit_da_revisao () {
  local imagem
  imagem=$(gcloud run revisions describe "$1" --region "$REGIAO" --format 'value(spec.containers[0].image)')
  if [[ "$imagem" =~ :([0-9a-f]{40})$ ]]; then
    echo "${BASH_REMATCH[1]}"
    return 0
  fi
  echo "::error::A imagem '$imagem' da revisão $1 não termina num commit de 40 caracteres" >&2
  return 1
}

uri () {
  jq -rn --arg valor "$1" '$valor | @uri'
}

broker () {
  curl --fail --silent --show-error --max-time 30 --retry 2 --retry-delay 5 \
    -H "Authorization: Bearer $PACT_BROKER_TOKEN" "$@"
}

REVERTIDA=$(commit_da_revisao "$REVISAO_REVERTIDA")
ANTERIOR=$(commit_da_revisao "$REVISAO_ANTERIOR")
echo "Revertida: $REVISAO_REVERTIDA, commit $REVERTIDA. Anterior: $REVISAO_ANTERIOR, commit $ANTERIOR"
if [[ "$REVERTIDA" == "$ANTERIOR" ]]; then
  echo "As duas revisões são do mesmo commit: a tag $TAG fica onde está"
  exit 0
fi

VERSOES="$PACT_BROKER_BASE_URL/pacticipants/$(uri "$PACTICIPANT")/versions"

broker -o /dev/null "$VERSOES/$ANTERIOR"
broker -o /dev/null -X PUT -H 'Content-Type: application/json' -d '{}' "$VERSOES/$ANTERIOR/tags/$(uri "$TAG")"
echo "Tag $TAG na versão $ANTERIOR"

corpo=$(mktemp)
codigo=$(curl --silent --show-error --max-time 30 --retry 2 --retry-delay 5 -o "$corpo" -w '%{http_code}' \
  -X DELETE -H "Authorization: Bearer $PACT_BROKER_TOKEN" "$VERSOES/$REVERTIDA/tags/$(uri "$TAG")")
case "$codigo" in
  2??) echo "Tag $TAG tirada da versão $REVERTIDA" ;;
  404) echo "A versão $REVERTIDA não tinha a tag $TAG" ;;
  *)
    echo "::error::O broker respondeu $codigo ao tirar a tag $TAG da versão $REVERTIDA"
    cat "$corpo"
    echo
    exit 1
    ;;
esac
