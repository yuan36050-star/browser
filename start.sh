#!/bin/sh
 
# 把临时目录重定向到可写路径
mkdir -p /data/tmp
export TMPDIR=/data/tmp

# 公网门锁（2026-09-21 66 加）：配了 VNC_PASS 就启用 nginx Basic Auth——
# noVNC 能真人接管鼠标键盘、/mcp 能驱动带登录态的浏览器，公网上不能裸奔。
# 不配 VNC_PASS 则保持原样（纯内网用无所谓，挂公网前必须配）。
if [ -n "$VNC_PASS" ]; then
  printf "%s:%s\n" "${VNC_USER:-shushu}" "$(openssl passwd -apr1 "$VNC_PASS")" > /etc/nginx/.htpasswd
  sed -i 's/#AUTH_BASIC //' /etc/nginx/sites-enabled/default
  echo "[start] nginx Basic Auth ON (user=${VNC_USER:-shushu})"
fi

# CORS（2026-09-25 加）：配了 CORS_ORIGIN（如 https://yuan36050-star.github.io）就允许该来源的网页直连 /mcp，
# 给 Cove 前端的连接器用。只放行这一个来源；不配则维持原样（浏览器网页连不上 /mcp）。
if [ -n "$CORS_ORIGIN" ]; then
  sed -i "s|#CORS ||; s|__CORS_ORIGIN__|${CORS_ORIGIN%/}|g" /etc/nginx/sites-enabled/default
  echo "[start] CORS ON for /mcp (origin=${CORS_ORIGIN%/})"
fi
 
# 启动虚拟显示器
Xvfb :99 -screen 0 1280x900x24 &
export DISPLAY=:99
sleep 3
 
# 启动 VNC 服务
x11vnc -display :99 -nopw -forever -shared -rfbport 5900 &
sleep 2
 
# 启动 noVNC
websockify --web=/usr/share/novnc 6080 localhost:5900 &
sleep 1
 
# 启动 nginx
nginx &
 
# 启动 MCP 服务
PORT=8081 python main.py
