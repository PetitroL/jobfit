# JobFit —— Node + Python 双运行时镜像
# Python 只用于 PDF 解析（PyMuPDF），没装也只是降级到纯 Node 兜底
FROM node:20-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 python3-pip \
 && pip3 install --break-system-packages --no-cache-dir pymupdf==1.24.10 \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build && npm prune --omit=dev

ENV PORT=5192
EXPOSE 5192

CMD ["node", "server/index.js"]
