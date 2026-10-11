FROM node:24-alpine
WORKDIR /app
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev --ignore-scripts
COPY server ./server
COPY js/platform/prayer-api.js ./js/platform/prayer-api.js
COPY js/domain/prayer-timer.js ./js/domain/prayer-timer.js
COPY js/shared/format.js ./js/shared/format.js
COPY package.json ./package.json
RUN mkdir -p /data && chown node:node /data
ENV DB_PATH=/data/notifications.sqlite PORT=8787
USER node
WORKDIR /app/server
EXPOSE 8787
CMD ["node", "index.js"]
