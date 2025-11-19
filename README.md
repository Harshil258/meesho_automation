# Meesho Label Downloader Automation

This project automates the process of downloading shipping labels from the Meesho Supplier Panel using Puppeteer.

## Features
- Automated login to Meesho Supplier Panel
- Navigation to orders section
- Filtering by label download status
- Bulk label downloading
- Docker support for easy deployment
- Ready for Render deployment

## Setup
1. Clone the repository
2. Install dependencies with `npm install`
3. Configure environment variables:
   - `MEESHO_EMAIL`: Your Meesho supplier account email
   - `MEESHO_PASSWORD`: Your Meesho supplier account password
   - `LABEL_DOWNLOADED_FILTER`: Filter for label download status (default: "No")

## Usage
Run the automation with:
```bash
node index.js
```

Or using Docker:
```bash
docker build -t meesho-label-downloader .
docker run -v $(pwd)/downloads:/app/downloads meesho-label-downloader
```

## Deployment
This project includes a `render.yaml` file for easy deployment to Render.com