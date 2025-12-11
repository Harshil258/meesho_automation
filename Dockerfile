FROM ghcr.io/puppeteer/puppeteer:latest

WORKDIR /home/pptruser/app

# Copy package files
COPY --chown=pptruser:pptruser package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy app files
COPY --chown=pptruser:pptruser . .

# Create downloads directory
RUN mkdir -p /home/pptruser/app/downloads && \
    chown -R pptruser:pptruser /home/pptruser/app/downloads

# Set Puppeteer to use the installed Chrome
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

USER pptruser

CMD ["node", "index.js"]

