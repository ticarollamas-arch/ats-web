#!/usr/bin/env bash
# Instala o ATS Resume Optimizer em /opt/ats-web e sobe o serviço na porta 127.0.0.1:8095.
# Uso:  sudo ./install.sh
set -euo pipefail

if [[ $EUID -ne 0 ]]; then echo "Rode com sudo:  sudo ./install.sh"; exit 1; fi
SRC="$(cd "$(dirname "$0")" && pwd)"
DEST=/opt/ats-web

command -v python3 >/dev/null || { echo "python3 não encontrado (apt install python3 python3-venv)"; exit 1; }
python3 -c "import venv, ensurepip" 2>/dev/null || { echo "Instale: apt install python3-venv"; exit 1; }

echo "==> Copiando arquivos para $DEST"
mkdir -p "$DEST"
cp -r "$SRC/app" "$SRC/requirements.txt" "$DEST/"

echo "==> Criando ambiente virtual e instalando dependências"
python3 -m venv "$DEST/venv"
"$DEST/venv/bin/pip" install --quiet --upgrade pip
"$DEST/venv/bin/pip" install --quiet -r "$DEST/requirements.txt"
chown -R root:root "$DEST"

echo "==> Instalando serviço systemd"
cp "$SRC/deploy/ats-web.service" /etc/systemd/system/ats-web.service
systemctl daemon-reload
systemctl enable --now ats-web
sleep 2
curl -fsS http://127.0.0.1:8095/healthz && echo "  <- app respondendo"

echo "==> Snippet do nginx"
mkdir -p /etc/nginx/snippets
cp "$SRC/deploy/ats-location.conf" /etc/nginx/snippets/ats.conf

cat <<MSG

Pronto. Falta só ligar o nginx:

  1) No server { } do osachadinhosdashopee.com.br adicione a linha:
         include snippets/ats.conf;
     (se o domínio ainda não tem server, copie deploy/nginx-standalone.conf para /etc/nginx/conf.d/)
  2) sudo nginx -t && sudo systemctl reload nginx
  3) Teste:  curl -I http://127.0.0.1/ats/ -H 'Host: osachadinhosdashopee.com.br'

Cloudflare: veja o README (DNS proxied + SSL Full, ou Cloudflare Tunnel).
MSG
