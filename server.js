const express = require('express');
const { exec } = require('child_process');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
    res.json({
        status: 'running',
        message: 'Meesho Label Downloader API',
        endpoints: {
            trigger: 'POST /trigger',
            health: 'GET /health'
        }
    });
});

app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Trigger endpoint to run the automation
app.post('/trigger', async (req, res) => {
    const authKey = req.headers['x-api-key'] || req.query.key;
    const expectedKey = process.env.API_KEY || 'your-secret-key-here';

    // Simple authentication
    if (authKey !== expectedKey) {
        return res.status(401).json({ error: 'Unauthorized. Provide valid API key.' });
    }

    res.json({
        status: 'started',
        message: 'Automation script triggered. Check logs for progress.',
        timestamp: new Date().toISOString()
    });

    // Run the automation script in background
    console.log('📥 Automation triggered via API');
    exec('node index.js', { cwd: __dirname }, (error, stdout, stderr) => {
        if (error) {
            console.error(`❌ Automation error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`⚠️  Stderr: ${stderr}`);
        }
        console.log(`✅ Automation output:\n${stdout}`);
    });
});

app.listen(PORT, () => {
    console.log(`🚀 API server running on port ${PORT}`);
    console.log(`📍 Trigger URL: http://localhost:${PORT}/trigger`);
    console.log(`🔑 Set API_KEY environment variable for authentication`);
});
