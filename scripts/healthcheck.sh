#!/bin/bash
# Host-level uptime healthcheck for lolospala.com — runs OUTSIDE Docker on
# the host's own crontab, so it keeps working even if the backend/frontend
# containers crash or the whole compose stack is down. Alerts via a direct
# SMTP send (curl's built-in SMTP client) using the same Gmail credentials
# already configured in SystemSettings (admin Settings > Email) — looked
# up fresh from the DB each run, never hardcoded in this file.
#
# Install (as root):
#   crontab -e
#   */5 * * * * /root/ecommerce-timor-leste/scripts/healthcheck.sh >> /var/log/lolospala-healthcheck.log 2>&1
#
# This is a defense-in-depth backstop, not a replacement for a real
# external uptime monitor (UptimeRobot, healthchecks.io, etc.) — those run
# from outside this VPS entirely, so they also catch the VPS itself being
# unreachable (network outage, host down), which this script cannot.

set -uo pipefail

SITE_URL="https://lolospala.com/"
API_URL="https://api.lolospala.com/api/v1/settings/public"
STATE_FILE="/root/.lolospala-healthcheck-state"
COMPOSE_DIR="/root/ecommerce-timor-leste"
ALERT_TO="lolospala24@gmail.com"

check() {
  curl -fsS -o /dev/null -m 15 "$1"
}

is_up=true
check "$SITE_URL" || is_up=false
check "$API_URL" || is_up=false

prev_state="up"
[ -f "$STATE_FILE" ] && prev_state=$(cat "$STATE_FILE")

send_alert() {
  local subject="$1"
  local body="$2"

  local mysql_root_pass
  mysql_root_pass=$(grep -E '^MYSQL_ROOT_PASSWORD=' "$COMPOSE_DIR/.env" | cut -d= -f2-)

  local smtp_row
  smtp_row=$(docker exec ecommerce-mysql mysql -u root -p"$mysql_root_pass" -N -e \
    "SELECT smtpHost, smtpPort, smtpUser, smtpPassword, fromEmail FROM ecommerce_timor.system_settings LIMIT 1;" 2>/dev/null)

  local smtp_host smtp_port smtp_user smtp_pass from_email
  IFS=$'\t' read -r smtp_host smtp_port smtp_user smtp_pass from_email <<< "$smtp_row"

  if [ -z "${smtp_host:-}" ]; then
    echo "$(date -u +%FT%TZ) ALERT SEND FAILED (no SMTP config in DB): $subject"
    return
  fi

  curl -sS --url "smtp://${smtp_host}:${smtp_port}" \
    --mail-from "$from_email" \
    --mail-rcpt "$ALERT_TO" \
    --user "${smtp_user}:${smtp_pass}" \
    --ssl-reqd \
    -T <(printf 'From: %s\r\nTo: %s\r\nSubject: %s\r\n\r\n%s\r\n' "$from_email" "$ALERT_TO" "$subject" "$body") \
    > /dev/null 2>&1
  if [ $? -ne 0 ]; then
    echo "$(date -u +%FT%TZ) ALERT SEND FAILED: $subject"
  fi
}

if [ "$is_up" = false ] && [ "$prev_state" = "up" ]; then
  echo "$(date -u +%FT%TZ) DOWN — sending alert"
  send_alert "lolospala.com is DOWN" "Healthcheck failed at $(date -u). Check the server (ssh root@72.61.151.58) and docker ps."
  echo "down" > "$STATE_FILE"
elif [ "$is_up" = true ] && [ "$prev_state" = "down" ]; then
  echo "$(date -u +%FT%TZ) RECOVERED — sending alert"
  send_alert "lolospala.com is back up" "Healthcheck recovered at $(date -u)."
  echo "up" > "$STATE_FILE"
elif [ "$is_up" = true ]; then
  echo "$(date -u +%FT%TZ) OK"
else
  echo "$(date -u +%FT%TZ) still down"
fi
