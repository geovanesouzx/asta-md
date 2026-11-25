#!/data/data/com.termux/files/usr/bin/sh
# ★彡 ASTA MD 彡★ — mantém o bot SEMPRE ligado (Termux / Linux)
#  - religa sozinho se o bot fechar ou travar
#  - nunca roda duas cópias ao mesmo tempo (duas cópias derrubam a sessão do WhatsApp)
#  - no Termux, segura o processador acordado (wake lock) para as figurinhas saírem rápidas

cd "$(dirname "$0")" || exit 1
BOT_DIR="$(pwd)"
LOCK="$BOT_DIR/dados/database/.asta-rodando.pid"
mkdir -p "$BOT_DIR/dados/database" "$BOT_DIR/dados/logs"

# já tem uma cópia rodando?
if [ -f "$LOCK" ]; then
  OLD_PID="$(cat "$LOCK" 2>/dev/null)"
  if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" 2>/dev/null; then
    echo "⚔️ O ASTA MD já está ligado (PID $OLD_PID). Não vou abrir outra cópia."
    exit 0
  fi
fi
echo $$ > "$LOCK"
trap 'rm -f "$LOCK"; exit 0' INT TERM
trap 'rm -f "$LOCK"' EXIT

# Termux: não deixa o Android "dormir" o processador
command -v termux-wake-lock >/dev/null 2>&1 && termux-wake-lock

while true; do
  # não deixa o log do Termux encher a memória do celular (guarda só o final)
  LOG="$BOT_DIR/dados/logs/termux.log"
  if [ -f "$LOG" ] && [ "$(wc -c < "$LOG")" -gt 5000000 ]; then
    tail -c 1000000 "$LOG" > "$LOG.tmp" && cat "$LOG.tmp" > "$LOG"; rm -f "$LOG.tmp"
  fi
  echo "🚀 [$(date '+%d/%m %H:%M:%S')] Ligando o ASTA MD..."
  npm start
  echo "♻️ [$(date '+%d/%m %H:%M:%S')] O ASTA MD fechou — religando em 5s (para parar de vez: asta-parar)"
  sleep 5
done
