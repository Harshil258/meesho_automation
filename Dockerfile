FROM ghcr.io/puppeteer/puppeteer:latest

USER root

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Create a directory for downloads
RUN mkdir -p /app/downloads
RUN chmod 777 /app/downloads

CMD ["node", "index.js"]
