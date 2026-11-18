#!/usr/bin/env bash
# Confere no log do mocha que a suíte rodou inteira: pelo menos <mínimo> testes passando e nenhum falhando.
# Uma suíte que roda poucos testes (um grep errado, uma pasta que some) também sai verde, e sem este piso
# ninguém veria.
#
# Uso: conferir-testes-e2e.sh <log> <mínimo>
set -uo pipefail

log=$1
minimo=$2

if ! [[ "$minimo" =~ ^[0-9]+$ ]]; then
  echo "::error::O mínimo de testes deve ser um inteiro, recebido '$minimo'"
  exit 1
fi

# O mocha colore o resumo: os códigos de cor saem antes de ler os números.
resumo=$(sed 's/\x1b\[[0-9;]*m//g' "$log")
passando=$(grep -Eo '[0-9]+ passing' <<<"$resumo" | tail -n 1 | cut -d ' ' -f 1)
falhando=$(grep -Eo '[0-9]+ failing' <<<"$resumo" | tail -n 1 | cut -d ' ' -f 1)
passando=${passando:-0}
falhando=${falhando:-0}

echo "Testes: $passando passando, $falhando falhando, mínimo de $minimo passando"
if ((falhando > 0)); then
  echo "::error::$falhando teste(s) falhando"
  exit 1
fi
if ((passando < minimo)); then
  echo "::error::Só $passando testes passaram, o mínimo é $minimo: a suíte não rodou inteira"
  exit 1
fi
