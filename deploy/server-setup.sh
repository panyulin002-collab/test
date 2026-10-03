#!/usr/bin/env bash
# 服务器一次性初始化：Node 24 + nginx + pm2
#
# 适用于全新的 Ubuntu 22.04 / 24.04（CentOS 7 因为 glibc 太旧，装不了新版 Node）。
# 用法（在服务器上以 root 执行）：
#   bash server-setup.sh
#
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/blog-app}"
NODE_MAJOR="${NODE_MAJOR:-24}"

echo "[1/5] 安装基础软件..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl ca-certificates gnupg nginx

echo "[2/5] 安装 Node.js ${NODE_MAJOR}.x ..."
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | cut -c2- | cut -d. -f1)" != "$NODE_MAJOR" ]; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
fi
node -v
npm -v

echo "[3/5] 安装 pm2 ..."
npm install -g pm2

echo "[4/5] 准备应用目录 ${APP_DIR} ..."
mkdir -p "${APP_DIR}/data/uploads"

echo "[5/5] 配置 nginx（反代到 127.0.0.1:3000）..."
cat > /etc/nginx/sites-available/blog <<'NGINX'
server {
    listen 80;
    server_name _;

    # 上传视频需要的体积上限，和项目里的 MAX_VIDEO_MB 保持一致
    client_max_body_size 320m;

    # 用户上传的图片视频由 Node 直接返回，这里加长缓存
    location /uploads/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        expires 30d;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/blog /etc/nginx/sites-enabled/blog
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable --now nginx
systemctl reload nginx

echo
echo "服务器准备完成。接下来在本地执行："
echo "  powershell -ExecutionPolicy Bypass -File deploy.ps1"
echo
echo "如果服务器开了防火墙，记得放行 80 端口："
echo "  ufw allow 80/tcp        # 或在云控制台的安全组里放行"
