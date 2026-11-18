#!/usr/bin/env bash
# Espera GET <url>/version responder a versão do release. A revisão nova pode estar fria (10 a 12 s para
# subir) e a troca de tráfego leva alguns segundos, então uma resposta diferente ainda não é falha.
#
# Uso: esperar-versao.sh <url> <versão> [tentativas, padrão 12, a cada 10 s]
set -uo pipefail

url=$1
versao=$2
tentativas=${3:-12}

for ((i = 1; i <= tentativas; i++)); do
  resposta=$(curl -sS --max-time 20 "$url/version" | jq -r '.version' 2>/dev/null)
  echo "Tentativa $i: $url/version respondeu '${resposta}', esperada '$versao'"
  if [[ "$resposta" == "$versao" ]]; then
    exit 0
  fi
  ((i < tentativas)) && sleep 10
done

echo "::error::$url não respondeu a versão $versao depois de $tentativas tentativas"
exit 1
