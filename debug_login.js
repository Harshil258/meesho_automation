require('dotenv').config();
const puppeteer = require('puppeteer-extra');
// const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

// puppeteer.use(StealthPlugin());

const DOWNLOAD_PATH = path.resolve(__dirname, 'downloads');
if (!fs.existsSync(DOWNLOAD_PATH)) fs.mkdirSync(DOWNLOAD_PATH);

(async () => {
    console.log('Starting Debug Login...');
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800'],
        defaultViewport: null
    });

    const page = await browser.newPage();

    // Set User Agent
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

    // Capture Console Logs and Errors
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
    page.on('requestfailed', request => console.log(`REQUEST FAILED: ${request.url()} ${request.failure().errorText}`));

    try {
        console.log('Navigating to Login Page...');
        await page.goto('https://supplier.meesho.com/panel/v3/new/root/login', { waitUntil: 'networkidle2', timeout: 60000 });

        console.log('Page loaded. Waiting for 20 seconds...');
        await new Promise(r => setTimeout(r, 20000));

        console.log('Capturing debug info...');
        await page.screenshot({ path: path.join(DOWNLOAD_PATH, 'debug_login_page.png') });
        const html = await page.content();
        fs.writeFileSync(path.join(DOWNLOAD_PATH, 'debug_login_page.html'), html);
        console.log('Debug info saved.');

        console.log('Checking for email input...');
        const emailInput = await page.$('input[type="email"], input[name="email"]');
        if (emailInput) {
            console.log('Email input found!');
        } else {
            console.log('Email input NOT found!');
        }

    } catch (e) {
        console.error('Error:', e);
        await page.screenshot({ path: path.join(DOWNLOAD_PATH, 'debug_login_error.png') });
    } finally {
        await browser.close();
    }
})();
