# Porchlit in one container: the house, the server and the AI door. The database runs beside it (compose.yaml).
FROM node:24-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# The houses' models, the outfits' fit and the page; then only what the server needs.
RUN npm run build && npm prune --omit=dev
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
CMD ["sh", "scripts/docker-start.sh"]
