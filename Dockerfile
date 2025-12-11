FROM ghcr.io/puppeteer/puppeteer:latest

WORKDIR /home/pptruser/app

# Copy package files
COPY --chown=pptruser:pptruser package*.json ./

# Install dependencies (skip chromium download as it's in the base image)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
RUN npm ci --only=production

# Copy app files
COPY --chown=pptruser:pptruser . .

# Create downloads directory
RUN mkdir -p /home/pptruser/app/downloads && \
    chown -R pptruser:pptruser /home/pptruser/app/downloads

# Set Puppeteer to use the Chrome from the base image
# The puppeteer Docker image has Chrome at this path
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

USER pptruser

# Expose port for the web server
EXPOSE 3000

CMD ["node", "server.js"]
