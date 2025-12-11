# Meesho Label Downloader - Deployment Guide

## ⚠️ Important Notice

**This automation is designed to run on-demand, not continuously.** Running it on cloud platforms like Render.com will execute the script once when deployed, then exit. 

### Recommended Usage

**Run locally on your Mac** for best results:
```bash
node index.js
```

---

## Option 1: Local Execution (Recommended)

### Prerequisites
- Node.js 18+ installed
- macOS, Windows, or Linux

### Setup
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure `.env` file:
   ```bash
   MEESHO_EMAIL=your_email@example.com
   MEESHO_PASSWORD=your_password
   LABEL_DOWNLOADED_FILTER=Yes
   ```
4. Run the script:
   ```bash
   npm start
   ```

### Features
- 🖥️ **Visual browser** (headless=false) - watch it work
- 📥 **Automatic label download** - saves to `downloads/YYYY-MM-DD/`
- 🛑 **Exits after first download** - no duplicate downloads
- 🔐 **Session persistence** - saves cookies for faster subsequent runs

---

## Option 2: Docker Deployment

### Build and Run Locally
```bash
# Build the image
docker build -t meesho-automation .

# Run the container
docker run --rm \
  -e MEESHO_EMAIL="your_email" \
  -e MEESHO_PASSWORD="your_password" \
  -e LABEL_DOWNLOADED_FILTER="Yes" \
  meesho-automation
```

### Docker Compose (Optional)
Create `docker-compose.yml`:
```yaml
version: '3'
services:
  meesho:
    build: .
    environment:
      - MEESHO_EMAIL=your_email
      - MEESHO_PASSWORD=your_password
      - LABEL_DOWNLOADED_FILTER=Yes
```

Run with:
```bash
docker-compose up
```

---

## Option 3: Render.com Deployment

### ⚠️ Limitations
- Runs **once** per deployment, then exits
- Cannot download files to your local machine (files stay in container)
- Not ideal for on-demand automation
- Free tier has limited runtime

### If You Still Want to Deploy:

1. **Push code to GitHub**
2. **Create new Worker on Render.com**
3. **Configure settings:**
   - Runtime: Docker
   - Dockerfile Path: `./Dockerfile`
4. **Add environment variables:**
   - `MEESHO_EMAIL`
   - `MEESHO_PASSWORD`
   - `LABEL_DOWNLOADED_FILTER`
5. **Deploy**

The script will run once and exit. To run again, manually trigger a new deployment.

### Alternative: Cron Job Service
For scheduled automation, consider:
- **Railway.app** with cron
- **EasyCron** with webhook
- **GitHub Actions** (scheduled workflows)
- **Your own VPS** with crontab

---

## Troubleshooting

### Error: "Could not find Chrome"
✅ **Fixed** - The updated Dockerfile includes Chrome from the official Puppeteer image.

### Error: "ENOENT: no such file or directory, stat '/opt/render/.cache/puppeteer'"
✅ **Fixed** - Now using `PUPPETEER_EXECUTABLE_PATH` environment variable.

### Downloads not appearing locally when deployed to Render
❌ **This is expected** - Cloud deployments download files to the container, not your local machine. **Solution**: Run the script locally.

### Script exits immediately after download
✅ **This is intentional** - The script is designed to download once and exit to prevent duplicate downloads.

---

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MEESHO_EMAIL` | ✅ Yes | - | Your Meesho supplier email |
| `MEESHO_PASSWORD` | ✅ Yes | - | Your Meesho supplier password |
| `LABEL_DOWNLOADED_FILTER` | No | `No` | Filter: `Yes` or `No` |
| `PUPPETEER_EXECUTABLE_PATH` | No | Auto | Chrome executable (set by Docker) |

### Downloads Location
- **Local**: `./downloads/YYYY-MM-DD/Sub_Order_Labels_*.pdf`
- **Docker**: `/home/pptruser/app/downloads/YYYY-MM-DD/Sub_Order_Labels_*.pdf`

---

## How It Works

1. **Login** - Uses saved cookies or logs in fresh
2. **Navigate** - Goes to "Ready to Ship" orders
3. **Detect** - Monitors for label download opportunities
4. **Apply Filter** - Selects Yes/No and clicks Apply
5. **Select Orders** - Clicks "Select All" checkbox
6. **Download** - Finds and clicks Label button
7. **Exit** - Closes browser and exits after first download ✅

---

## Support

For issues or questions, check the logs:
- Local: Console output
- Docker: `docker logs <container_id>`
- Render: Build logs in Render dashboard
