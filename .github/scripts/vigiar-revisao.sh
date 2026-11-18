#!/usr/bin/env bash
# Vigia a revisão promovida e decide se ela fica. Só sinal forte reverte, somado desde a promoção: uma linha
# de OOM, 5 ou mais respostas 5xx, ou 2 sondas seguidas sem a versão do release. Reinício de container,
# memória e latência não revertem: o app reinicia várias vezes ao dia saindo do ocioso, e os monitores do
# Datadog já avisam desses sinais. Sem conseguir ler os logs, o veredito é inconclusivo: abre issue, mas
# não reverte uma revisão que pode estar saudável.
#
# Cada ciclo confere primeiro se a revisão ainda serve 100% do tráfego. Se não serve, um deploy mais novo ou
# uma mudança à mão já trocou a revisão: a vigia para com o veredito substituida e não faz mais nada.
#
# Cada ciclo lê desde a promoção até agora. Um ciclo cuja leitura falha é coberto pelo seguinte, e só a
# leitura do último ciclo decide entre saudavel e inconclusivo.
#
# Entrada (ambiente): PROJETO (dos logs), SERVICO, REGIAO, REVISAO, PROMOVIDO_EM (RFC 3339 em UTC),
# URL_PUBLICA, VERSAO, MINUTOS (padrão 60) e INTERVALO_S (padrão 300). O gcloud já autenticado e com o
# projeto do serviço configurado.
# Saída no GITHUB_OUTPUT: veredito (saudavel, reverter, inconclusivo ou substituida) e motivo. Sai com 0
# sempre que roda a vigia: quem chama decide pelo veredito, para que uma falha qualquer do job nunca vire
# rollback. Só sai com 1, sem veredito, quando MINUTOS não é um inteiro de 1 a 60.
set -uo pipefail

MINUTOS=${MINUTOS:-60}
INTERVALO_S=${INTERVALO_S:-300}
# Os logs de requisição chegam cerca de 40 s depois da requisição: o último ciclo espera por eles.
ATRASO_DOS_LOGS_S=90
LIMITE_5XX=5
SONDAS_PARA_REVERTER=2

base="resource.type=\"cloud_run_revision\" resource.labels.service_name=\"$SERVICO\""
base="$base resource.labels.revision_name=\"$REVISAO\" timestamp>=\"$PROMOVIDO_EM\""
filtro_oom="$base textPayload:\"Memory limit of\""
filtro_5xx="$base log_name=\"projects/$PROJETO/logs/run.googleapis.com%2Frequests\" httpRequest.status>=500"

# Conta as entradas do filtro, até o limite: para decidir basta saber se o limite foi atingido.
contar () {
  local saida
  saida=$(gcloud logging read "$1" --project "$PROJETO" --limit "$2" --format 'value(timestamp)') || return 1
  printf '%s' "$saida" | grep -c . || true
}

# A revisão com 100% do tráfego, ou vazio se não há uma só.
revisao_servindo () {
  gcloud run services describe "$SERVICO" --region "$REGIAO" --format=json |
    jq -r '[.status.traffic[] | select(.percent == 100) | .revisionName] | if length == 1 then .[0] else "" end'
}

# A janela vem de um input manual: um valor fora de 1 a 60 deixaria a vigia sem fim ou além do
# timeout de 75 min do job. Falha antes do laço, sem veredito.
if ! [[ "$MINUTOS" =~ ^[0-9]+$ ]] || ((10#$MINUTOS < 1 || 10#$MINUTOS > 60)); then
  echo "::error::minutos deve ser um inteiro de 1 a 60, recebido '$MINUTOS'"
  exit 1
fi
MINUTOS=$((10#$MINUTOS))

inicio=$(date -u -d "$PROMOVIDO_EM" +%s)
fim=$((inicio + MINUTOS * 60 + ATRASO_DOS_LOGS_S))
sondas_seguidas_falhas=0
ciclo=0
veredito=''
motivo=''

echo "Vigia da revisão $REVISAO do serviço $SERVICO por $MINUTOS min desde $PROMOVIDO_EM, ciclo de $INTERVALO_S s"

while true; do
  agora=$(date -u +%s)
  espera=$((fim - agora < INTERVALO_S ? fim - agora : INTERVALO_S))
  if ((espera > 0)); then
    sleep "$espera"
  fi
  ciclo=$((ciclo + 1))
  minuto=$((($(date -u +%s) - inicio) / 60))

  if ! servindo=$(revisao_servindo); then
    servindo='?'
  elif [[ "$servindo" != "$REVISAO" ]]; then
    veredito=substituida
    motivo="a revisão com 100% do tráfego agora é '${servindo}', não $REVISAO"
    echo "Ciclo $ciclo, minuto $minuto: $motivo"
    break
  fi

  leitura_ok=true
  if [[ "$servindo" == '?' ]]; then
    leitura_ok=false
  fi
  if ! oom=$(contar "$filtro_oom" 1) || ! respostas_5xx=$(contar "$filtro_5xx" "$LIMITE_5XX"); then
    leitura_ok=false
    oom='?'
    respostas_5xx='?'
  fi

  versao_publica=$(curl -sS --max-time 20 "$URL_PUBLICA/version" | jq -r '.version' 2>/dev/null)
  if [[ "$versao_publica" == "$VERSAO" ]]; then
    sondas_seguidas_falhas=0
  else
    sondas_seguidas_falhas=$((sondas_seguidas_falhas + 1))
  fi

  echo "Ciclo $ciclo, minuto $minuto: 100% em $servindo | OOM $oom | 5xx $respostas_5xx | leitura $leitura_ok |" \
    "sonda '$versao_publica' (falhas seguidas: $sondas_seguidas_falhas)"

  if [[ "$oom" =~ ^[0-9]+$ ]] && ((oom >= 1)); then
    veredito=reverter
    motivo="linha de OOM (Memory limit of) na revisão $REVISAO"
  elif [[ "$respostas_5xx" =~ ^[0-9]+$ ]] && ((respostas_5xx >= LIMITE_5XX)); then
    veredito=reverter
    motivo="$respostas_5xx ou mais respostas 5xx na revisão $REVISAO"
  elif ((sondas_seguidas_falhas >= SONDAS_PARA_REVERTER)); then
    veredito=reverter
    motivo="$sondas_seguidas_falhas sondas seguidas de $URL_PUBLICA/version sem a versão $VERSAO"
  fi
  [[ -n "$veredito" ]] && break
  (($(date -u +%s) >= fim)) && break
done

if [[ -z "$veredito" ]]; then
  if [[ "$leitura_ok" == true ]]; then
    veredito=saudavel
    motivo="nenhum sinal forte em $MINUTOS min"
  else
    veredito=inconclusivo
    motivo='a última leitura do Cloud Run ou dos logs falhou; a revisão nova continua com o tráfego'
  fi
fi

echo "Veredito: $veredito ($motivo)"
{
  echo "veredito=$veredito"
  echo "motivo=$motivo"
} >>"${GITHUB_OUTPUT:-/dev/null}"
echo "Vigia: **$veredito**, $motivo" >>"${GITHUB_STEP_SUMMARY:-/dev/null}"
