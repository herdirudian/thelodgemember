#!/usr/bin/env bash
set -euo pipefail

log() { printf "[certbot-setup] %s\n" "$*"; }

log "Ensuring Certbot is installed"
if ! command -v certbot >/dev/null 2>&1; then
  if command -v apt-get >/dev/null 2>&1; then
    sudo apt-get update -y
    sudo apt-get install -y certbot || true
    # Optional nginx plugin (not mandatory if using webroot/manual)
    sudo apt-get install -y python3-certbot-nginx || true
  elif command -v snap >/dev/null 2>&1; then
    sudo snap install certbot --classic || true
  else
    log "Neither apt-get nor snap found; please install certbot manually"
    exit 1
  fi
fi

log "Ensuring certbot systemd timer is enabled and running"
if systemctl list-timers --all | grep -q certbot; then
  log "certbot.timer already scheduled"
else
  sudo systemctl enable --now certbot.timer || {
    log "Failed to enable certbot.timer via systemd; checking cron fallback"
    if [ -f /etc/cron.d/certbot ]; then
      log "cron job for certbot exists at /etc/cron.d/certbot"
    else
      log "No systemd timer or cron found; please verify Certbot installation"
      exit 1
    fi
  }
fi

log "Current certbot timer status"
sudo systemctl status certbot.timer --no-pager || true
systemctl list-timers --all | awk '/certbot/ {print}' || true

log "Installing deploy hook to reload nginx after renewal"
sudo mkdir -p /etc/letsencrypt/renewal-hooks/deploy
sudo tee /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh > /dev/null << 'HOOK'
#!/usr/bin/env bash
set -euo pipefail
if command -v systemctl >/dev/null 2>&1; then
  systemctl reload nginx || true
else
  service nginx reload || true
fi
HOOK
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh

log "Testing renewal with --dry-run"
sudo certbot renew --dry-run || {
  log "Dry-run renewal failed. Please check nginx/webroot accessibility and certbot configuration."
  exit 1
}

log "Listing current certificates"
sudo certbot certificates || true

log "Done. Certbot auto-renew is set. Nginx will reload on renewal."

