# How to Trigger the Script on Render

## 🎯 Quick Start

The automation is now set up as a **web service with an API** that you can trigger on-demand!

---

## 📡 Step 1: Deploy to Render

1. **Push the latest code** to GitHub (already done)
2. **Go to your Render dashboard**
3. The service should auto-deploy with the new changes
4. **Wait for deployment to complete**

---

## 🔑 Step 2: Get Your API Key

After deployment:

1. Go to your service in Render dashboard
2. Click **Environment** tab
3. Find the `API_KEY` variable - Render auto-generated a secure key
4. **Copy this key** - you'll need it to trigger the automation

---

## 🚀 Step 3: Trigger the Automation

### Option A: Using cURL (Terminal)

```bash
curl -X POST https://your-service-name.onrender.com/trigger \
  -H "x-api-key: YOUR_API_KEY_HERE"
```

### Option B: Using Browser

Simply visit this URL (replace with your details):
```
https://your-service-name.onrender.com/trigger?key=YOUR_API_KEY_HERE
```

**Note:** This will just open in browser and trigger it. You can bookmark this URL for easy access!

### Option C: Using Postman/Insomnia

- **Method:** POST
- **URL:** `https://your-service-name.onrender.com/trigger`
- **Headers:** 
  - `x-api-key: YOUR_API_KEY_HERE`

### Option D: Using JavaScript/Fetch

```javascript
fetch('https://your-service-name.onrender.com/trigger', {
  method: 'POST',
  headers: {
    'x-api-key': 'YOUR_API_KEY_HERE'
  }
})
.then(r => r.json())
.then(data => console.log(data));
```

---

## 📋 Response

When you trigger the automation, you'll get:

```json
{
  "status": "started",
  "message": "Automation script triggered. Check logs for progress.",
  "timestamp": "2025-12-11T17:30:00.000Z"
}
```

---

## 📊 Check Logs

To see if the automation worked:

1. Go to Render dashboard
2. Click on your service
3. Click **Logs** tab
4. Look for:
   ```
   📥 Automation triggered via API
   ✅ SUCCESS! Downloaded label file: ...
   ```

---

## 🔗 Service Endpoints

### Health Check
```bash
GET https://your-service-name.onrender.com/health
```

Returns:
```json
{
  "status": "healthy",
  "timestamp": "2025-12-11T17:30:00.000Z"
}
```

### Trigger Automation
```bash
POST https://your-service-name.onrender.com/trigger
Header: x-api-key: YOUR_KEY
```

---

## ⚙️ Automation Using Webhooks

You can integrate this with:

- **IFTTT** - trigger via webhook when you press a button
- **Zapier** - trigger on schedule or event
- **iOS Shortcuts** - create a shortcut to trigger with one tap
- **Cron-job.org** - schedule to run daily at specific time

### Example: Daily Schedule with Cron-job.org

1. Go to [cron-job.org](https://cron-job.org)
2. Create free account
3. Create new cron job:
   - **URL:** `https://your-service.onrender.com/trigger?key=YOUR_KEY`
   - **Schedule:** Every day at 9 AM
   - **Method:** POST
4. Save and activate

---

## 🔐 Security Tips

1. **Never share your API_KEY** publicly
2. You can regenerate the key anytime in Render dashboard
3. The key is auto-generated and secure by default

---

## ⚠️ Important Notes

### File Downloads
- Files are downloaded **inside the Docker container**
- They're saved to `/home/pptruser/app/downloads/`
- Files are **lost when container restarts**
- **Limitation:** You can't easily retrieve downloaded files from Render

### Solutions:
1. **Upload to cloud storage** (modify `index.js` to upload to S3/Dropbox/Google Drive after download)
2. **Send via email** (attach PDF and email to yourself)
3. **Use a webhook** (send the file to another service)
4. **Run locally instead** - Much simpler! Just run `node index.js` on your Mac

---

## 🎨 iOS Shortcut Example

Create an iOS Shortcut to trigger with one tap:

1. Open Shortcuts app
2. Create new shortcut
3. Add action: **Get Contents of URL**
   - URL: `https://your-service.onrender.com/trigger?key=YOUR_KEY`
   - Method: POST
4. Add action: **Show Notification**
   - Title: "Meesho Labels"
   - Body: "Download started!"
5. Name it "Download Labels" and add to home screen

Now you can trigger it with one tap! 📱

---

## 💡 Recommendation

For the **easiest experience**, I still recommend running locally:

```bash
cd /Volumes/ALLPROJECTS/AUTOMATIONS/meesholabaldownload/newmeesholabeldownloadautomation
node index.js
```

This way:
- ✅ Files save directly to your Mac
- ✅ You can watch the browser
- ✅ Immediate access to PDFs
- ✅ No API setup needed

But the API approach is useful for:
- 📱 Triggering from mobile
- ⏰ Scheduled automation
- 🔗 Integration with other services
