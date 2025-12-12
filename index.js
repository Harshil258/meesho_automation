require('dotenv').config();
const puppeteer = require('puppeteer-extra');
// const StealthPlugin = require('puppeteer-extra-plugin-stealth'); // Disabled due to stack overflow
const fs = require('fs');
const path = require('path');

// puppeteer.use(StealthPlugin());

// Create date-based download folder
const now = new Date();
const dateFolder = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
const DOWNLOAD_PATH = path.resolve(__dirname, 'downloads', dateFolder);
const COOKIES_PATH = path.resolve(__dirname, 'cookies.json');

// Ensure download directory exists and is empty of previous downloads
if (!fs.existsSync(DOWNLOAD_PATH)) {
    fs.mkdirSync(DOWNLOAD_PATH, { recursive: true });
    console.log(`Created download folder: ${dateFolder}`);
} else {
    // Clean up existing files in today's folder to avoid false positives
    const files = fs.readdirSync(DOWNLOAD_PATH);
    for (const file of files) {
        if (file.endsWith('.pdf')) {
            fs.unlinkSync(path.join(DOWNLOAD_PATH, file));
        }
    }
}

const randomDelay = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * Check for and download label from "Ready to Ship Labels" dialog
 * Returns true if dialog was found and download initiated, false otherwise
 * @param {Page} page - Puppeteer page object
 * @param {Browser} browser - Puppeteer browser object (optional, for closing after download)
 */
async function checkAndDownloadLabelDialog(page, browser = null) {
    try {
        // Check if the dialog with "Ready to Ship Labels" or "Labels generated successfully" exists
        // OR check if there's a bottom action bar with "Orders Selected"
        const dialogExists = await page.evaluate(() => {
            const bodyText = document.body.innerText;
            return bodyText.includes('Ready to Ship Labels') ||
                bodyText.includes('Labels generated successfully') ||
                bodyText.includes('Orders Selected');
        });

        if (!dialogExists) {
            return false;
        }

        console.log('✓ Detected label download prompt!');

        // Save screenshot and HTML for debugging
        const timestamp = Date.now();
        await page.screenshot({ path: path.join(DOWNLOAD_PATH, `dialog_detected_${timestamp}.png`) });
        const dialogHtml = await page.content();
        fs.writeFileSync(path.join(DOWNLOAD_PATH, `dialog_detected_${timestamp}.html`), dialogHtml);
        console.log('📸 Saved debug screenshot and HTML');

        // Wait a bit for UI to fully render
        await new Promise(r => setTimeout(r, 1500));

        // Try multiple strategies to find the download button
        console.log('🔍 Searching for Label download button...');

        // Strategy 1: Look for "Label" button in bottom action bar (most common)
        let downloadBtn = await page.evaluateHandle(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            // Find a button with "Label" text that is NOT disabled
            // and is likely in the action bar (has MuiButton-contained class)
            return buttons.find(b => {
                const text = b.innerText.trim().toLowerCase();
                const isLabelBtn = text === 'label';
                const isContainedBtn = b.className.includes('MuiButton-contained');
                return isLabelBtn && isContainedBtn && !b.disabled;
            });
        });

        // Strategy 2: Look for button with "Label" text anywhere on page
        if (!downloadBtn.asElement()) {
            console.log('⚠️  Strategy 1 failed, trying generic label button search...');
            downloadBtn = await page.evaluateHandle(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                return buttons.find(b => {
                    const text = b.innerText.trim().toLowerCase();
                    return text === 'label' && !b.disabled;
                });
            });
        }

        // Strategy 3: Look inside dialog for button
        if (!downloadBtn.asElement()) {
            console.log('⚠️  Strategy 2 failed, trying dialog-based detection...');
            downloadBtn = await page.evaluateHandle(() => {
                const dialogs = document.querySelectorAll('div[role="dialog"]');
                for (const dialog of dialogs) {
                    const buttons = Array.from(dialog.querySelectorAll('button'));
                    const labelBtn = buttons.find(b => {
                        const text = b.innerText.trim().toLowerCase();
                        return text === 'label' || text === 'download';
                    });
                    if (labelBtn) return labelBtn;
                }
                return null;
            });
        }

        // Strategy 4: Look for button with download icon
        if (!downloadBtn.asElement()) {
            console.log('⚠️  Strategy 3 failed, trying icon-based detection...');
            downloadBtn = await page.evaluateHandle(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                return buttons.find(b => {
                    const hasDownloadIcon = b.querySelector('svg path[d*="M9.25 3"]'); // Download icon path
                    const text = b.innerText.trim().toLowerCase();
                    return hasDownloadIcon && (text === 'label' || text === 'download');
                });
            });
        }

        if (downloadBtn.asElement()) {
            console.log('✓ Found Label download button, clicking...');
            await downloadBtn.click();
            console.log('✓ Clicked Label download button.');

            // Wait for PDF download
            console.log('Waiting for PDF file download...');
            let downloadSuccess = false;
            for (let i = 0; i < 30; i++) {
                const files = fs.readdirSync(DOWNLOAD_PATH);
                const pdfFile = files.find(f => f.endsWith('.pdf'));
                if (pdfFile) {
                    console.log(`✅ SUCCESS! Downloaded label file: ${pdfFile}`);
                    console.log(`📁 Saved to: ${DOWNLOAD_PATH}`);
                    downloadSuccess = true;

                    // Close browser and exit after successful download
                    if (browser) {
                        console.log('🎉 Download complete! Closing browser and exiting...');
                        await browser.close();
                        process.exit(0);
                    }
                    return true;
                }
                await new Promise(r => setTimeout(r, 1000));
            }

            if (!downloadSuccess) {
                console.warn('⚠️  Download button clicked but PDF file not detected within 30 seconds.');
            }
            return downloadSuccess;
        } else {
            console.error('❌ All button detection strategies failed!');
            console.log('💡 Check the debug screenshot and HTML files for troubleshooting');
            return false;
        }
    } catch (error) {
        console.error('Error in checkAndDownloadLabelDialog:', error.message);
        return false;
    }
}

async function saveCookies(page) {
    const cookies = await page.cookies();
    fs.writeFileSync(COOKIES_PATH, JSON.stringify(cookies, null, 2));
    console.log('Cookies saved.');
}

async function loadCookies(page) {
    if (fs.existsSync(COOKIES_PATH)) {
        const cookiesString = fs.readFileSync(COOKIES_PATH);
        const cookies = JSON.parse(cookiesString);
        await page.setCookie(...cookies);
        console.log('Cookies loaded.');
        return true;
    }
    return false;
}

(async () => {
    console.log('Starting Meesho Label Downloader...');

    const browser = await puppeteer.launch({
        headless: true, // Always headless on server
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-software-rasterizer',
            '--window-size=1280,800'
        ],
        defaultViewport: null
    });

    console.log('Browser launch config:', {
        executablePath: puppeteer.executablePath(),
        defaultArgs: puppeteer.defaultArgs()
    });


    const page = await browser.newPage();

    // Set User Agent to avoid bot detection (and fix loading issues)
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

    // Set download behavior - store client for reuse
    let client = await page.target().createCDPSession();
    await client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: DOWNLOAD_PATH,
    });

    try {
        // Load cookies if available
        const cookiesLoaded = await loadCookies(page);

        // Navigate to Home first to check login status
        console.log('Navigating to Home to check session...');
        await page.goto('https://supplier.meesho.com/panel/v3/new/root/home', { waitUntil: 'networkidle2', timeout: 60000 });
        await new Promise(r => setTimeout(r, randomDelay(2000, 4000)));

        // Check if session is valid
        let isSessionValid = false;
        if (cookiesLoaded) {
            console.log('Checking session validity...');
            try {
                // Check for "Orders" or "Home" text or specific dashboard element
                await page.waitForFunction(() => {
                    const bodyText = document.body.innerText;
                    return bodyText.includes('Orders') || bodyText.includes('Home') || bodyText.includes('Welcome');
                }, { timeout: 10000 });

                // Also check internal state if possible
                const isAuthenticated = await page.evaluate(() => {
                    return window.__SUPPLY_DATA__?.registrationStatus?.isAuthenticated !== false;
                });

                if (isAuthenticated) {
                    console.log('Session is valid.');
                    isSessionValid = true;
                } else {
                    console.warn('Session invalid (isAuthenticated: false).');
                }
            } catch (e) {
                console.warn('Session check failed (timeout or error).');
            }
        }

        if (!isSessionValid) {
            console.log('Session expired, invalid, or not found. Clearing cookies and logging in...');

            // Clear cookies - reuse existing client
            await client.send('Network.clearBrowserCookies');
            if (fs.existsSync(COOKIES_PATH)) {
                fs.unlinkSync(COOKIES_PATH);
            }

            // Navigate to Login
            await page.goto('https://supplier.meesho.com/panel/v3/new/root/login', { waitUntil: 'networkidle2', timeout: 60000 });

            // Login Flow
            const emailSelectors = [
                'input[name="emailOrPhone"]',
                'input[type="email"]',
                'input[type="tel"]',
                'input[id*="email"]',
                'input[placeholder*="mail"]',
                'input[placeholder*="Phone"]'
            ];

            let emailInput = null;
            console.log('Waiting for email input field...');

            try {
                // Wait for any of the potential selectors
                const foundSelector = await page.waitForFunction((selectors) => {
                    for (const s of selectors) {
                        if (document.querySelector(s)) return s;
                    }
                    return false;
                }, { timeout: 30000 }, emailSelectors);

                const selector = await foundSelector.jsonValue();
                console.log(`✓ Found email input using selector: ${selector}`);
                emailInput = await page.$(selector);

                if (emailInput) {
                    await emailInput.type(process.env.MEESHO_EMAIL, { delay: randomDelay(50, 150) });
                }
            } catch (e) {
                console.error('❌ Could not find email input field within timeout.');
                console.log('Current URL:', page.url());

                // Debug: Dump HTML to logs
                const html = await page.content();
                console.log('--- PAGE HTML START ---');
                console.log(html.substring(0, 5000)); // Log first 5000 chars
                console.log('... (truncated) ...');
                console.log('--- PAGE HTML END ---');

                await page.screenshot({ path: path.join(DOWNLOAD_PATH, 'login_input_missing.png') });
                throw new Error(`Login failed: Email input not found. ${e.message}`);
            }

            await new Promise(r => setTimeout(r, randomDelay(500, 1000)));
            await new Promise(r => setTimeout(r, randomDelay(500, 1000)));

            await page.type(passwordSelector, process.env.MEESHO_PASSWORD, { delay: randomDelay(50, 150) });
            await new Promise(r => setTimeout(r, randomDelay(500, 1000)));

            console.log(`Password length: ${process.env.MEESHO_PASSWORD ? process.env.MEESHO_PASSWORD.length : 0}`);

            // Click Login Button
            const loginButton = await page.evaluateHandle(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                return buttons.find(b => b.innerText.includes('Log in') || b.innerText.includes('Login'));
            });

            if (loginButton.asElement()) {
                console.log('Found login button, clicking...');
                await loginButton.click();
            } else {
                console.log('Login button not found, trying Enter key...');
                await page.keyboard.press('Enter');
            }

            await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 });
            console.log('Login submitted.');

            // Verify Login
            await new Promise(r => setTimeout(r, 5000));
            if (page.url().includes('login')) {
                console.error('Still on login page. Login failed.');
                await page.screenshot({ path: path.join(DOWNLOAD_PATH, 'login_failed.png') });
                throw new Error('Login failed - stayed on login page');
            }

            // Save cookies after successful login
            await saveCookies(page);
        } else {
            console.log('Already logged in and session is valid!');
        }

        // Wait for loading spinner to disappear
        try {
            await page.waitForSelector('.loading-container-wrapper', { hidden: true, timeout: 30000 });
            console.log('Loading spinner disappeared.');
        } catch (e) {
            console.log('Loading spinner did not disappear or was not found (page might be loaded).');
        }

        // Wait for sidebar or dashboard content
        console.log('Waiting for dashboard content...');
        try {
            await page.waitForFunction(() => {
                const bodyText = document.body.innerText;
                return bodyText.includes('Orders') || bodyText.includes('Home');
            }, { timeout: 30000 });
            console.log('Dashboard content detected.');
        } catch (e) {
            console.warn('Timeout waiting for "Orders" or "Home" text.');
        }

        console.log('Current URL:', page.url());

        // Debug: Save Home Page HTML
        await page.screenshot({ path: path.join(DOWNLOAD_PATH, 'home_page_debug.png') });
        const homeHtml = await page.content();
        fs.writeFileSync(path.join(DOWNLOAD_PATH, 'home_page_debug.html'), homeHtml);
        console.log('Saved home page debug info.');

        // Navigate to Orders via Sidebar
        console.log('Navigating to Orders via Sidebar...');

        // Try to find "Orders" in sidebar
        const ordersMenuItem = await page.evaluateHandle(() => {
            const elements = Array.from(document.querySelectorAll('p, span, div, a'));
            // Look for "Orders" text specifically
            return elements.find(el => el.innerText.trim() === 'Orders');
        });

        if (ordersMenuItem.asElement()) {
            await ordersMenuItem.click();
            console.log('Clicked "Orders" in sidebar.');
            // Wait for navigation or content change
            await new Promise(r => setTimeout(r, randomDelay(3000, 5000)));

            // Check for label dialog after navigation
            await checkAndDownloadLabelDialog(page, browser);
        } else {
            console.warn('Could not find "Orders" menu item. Attempting direct navigation fallback...');
            // Fallback: construct URL dynamically if possible, or use the one we know works for this user
            // The previous URL was .../orders/pending. Let's try to go there directly if sidebar fails.
            // But we need the supplier ID. It's in the current URL.
            const currentUrl = page.url();
            const supplierIdMatch = currentUrl.match(/\/fulfillment\/([^\/]+)\//) || currentUrl.match(/\/growth\/([^\/]+)\//);
            if (supplierIdMatch && supplierIdMatch[1]) {
                const supplierId = supplierIdMatch[1];
                const ordersUrl = `https://supplier.meesho.com/panel/v3/new/fulfillment/${supplierId}/orders/ready-to-ship`;
                console.log(`Navigating directly to: ${ordersUrl}`);
                await page.goto(ordersUrl, { waitUntil: 'domcontentloaded' });
            } else {
                throw new Error('Could not determine Supplier ID for direct navigation.');
            }
        }

        // Handle "Ready to Ship" tab
        console.log('Looking for "Ready to Ship" tab...');
        // Navigate to Ready to Ship
        console.log('Looking for "Ready to Ship" tab...');
        await new Promise(r => setTimeout(r, randomDelay(2000, 3000)));

        // Wait for tabs to be present
        try {
            await page.waitForSelector('button[role="tab"]', { timeout: 10000 });
            console.log('Tabs loaded.');
        } catch (e) {
            console.warn('Tabs not found.');
        }

        // Find and click "Ready to Ship" tab
        const readyToShipTab = await page.evaluateHandle(() => {
            const buttons = Array.from(document.querySelectorAll('button[role="tab"]'));
            return buttons.find(btn => btn.innerText.includes('Ready to Ship'));
        });

        if (readyToShipTab.asElement()) {
            console.log('Found "Ready to Ship" tab, clicking...');
            await readyToShipTab.click();
            await new Promise(r => setTimeout(r, randomDelay(2000, 4000)));
            console.log('Navigated to Ready to Ship.');

            // Check for label dialog after clicking Ready to Ship
            await checkAndDownloadLabelDialog(page, browser);
        } else {
            console.log('"Ready to Ship" tab not found. Checking if we are already there...');
            if (!page.url().includes('ready-to-ship')) {
                console.warn('Might not be on Ready to Ship page. Current URL: ' + page.url());
                await page.screenshot({ path: path.join(DOWNLOAD_PATH, 'nav_error.png') });
                const html = await page.content();
                fs.writeFileSync(path.join(DOWNLOAD_PATH, 'nav_error.html'), html);
            }
        }

        // Filter Logic
        console.log('Applying filters...');
        await new Promise(r => setTimeout(r, randomDelay(1000, 2000)));

        // Find "Label downloaded" dropdown
        const dropdown = await page.evaluateHandle(() => {
            const elements = Array.from(document.querySelectorAll('div, span, p'));
            return elements.find(el => el.innerText.trim() === 'Label downloaded');
        });

        if (dropdown.asElement()) {
            await dropdown.click();
            console.log('Clicked "Label downloaded" dropdown.');
            await new Promise(r => setTimeout(r, randomDelay(1000, 2000)));

            const filterOptionText = process.env.LABEL_DOWNLOADED_FILTER || 'No';
            const filterOption = await page.evaluateHandle((text) => {
                const elements = Array.from(document.querySelectorAll('li, div, span')); // Dropdown items are often li or div
                return elements.find(el => el.innerText.trim() === text);
            }, filterOptionText);

            if (filterOption.asElement()) {
                await filterOption.click();
                console.log(`Selected option: "${filterOptionText}"`);
                await new Promise(r => setTimeout(r, randomDelay(500, 1000)));

                // Click the Apply button
                const applyButton = await page.evaluateHandle(() => {
                    const buttons = Array.from(document.querySelectorAll('button'));
                    return buttons.find(btn => btn.innerText.trim() === 'Apply');
                });

                if (applyButton.asElement()) {
                    await applyButton.click();
                    console.log('Clicked "Apply" button to confirm filter.');
                    await new Promise(r => setTimeout(r, randomDelay(3000, 5000)));

                    // Check for label dialog after applying filter
                    await checkAndDownloadLabelDialog(page, browser);
                } else {
                    console.warn('Apply button not found in filter dropdown.');
                }
            } else {
                console.warn(`Option "${filterOptionText}" not found.`);
            }
        } else {
            console.warn('"Label downloaded" dropdown not found.');
        }

        // Select All
        console.log('Selecting all orders...');
        // Try multiple strategies for checkbox
        const checkbox = await page.evaluateHandle(() => {
            // Strategy 1: Header checkbox
            const headerCheckbox = document.querySelector('thead input[type="checkbox"]');
            if (headerCheckbox) return headerCheckbox;

            // Strategy 2: First checkbox in main area (risky but fallback)
            const firstCheckbox = document.querySelector('input[type="checkbox"]');
            return firstCheckbox;
        });

        if (checkbox.asElement()) {
            await checkbox.click();
            console.log('Clicked Select All checkbox.');
            await new Promise(r => setTimeout(r, randomDelay(1000, 2000)));

            // Check for label dialog after selecting orders
            await checkAndDownloadLabelDialog(page, browser);
        } else {
            console.warn('Select All checkbox not found.');
            await page.screenshot({ path: path.join(DOWNLOAD_PATH, 'no_checkbox.png') });
        }

        // Download Button
        console.log('Triggering download...');
        const downloadBtn = await page.evaluateHandle(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            // Look for button with "Label" text that is NOT the dropdown filter
            return buttons.find(b => b.innerText.trim() === 'Label' && !b.disabled);
        });

        if (downloadBtn.asElement()) {
            await downloadBtn.click();
            console.log('Clicked main Label button.');

            // Wait for modal response (success or temporary issue)
            console.log('Waiting for modal response...');
            let modalResult = null;
            try {
                modalResult = await page.waitForFunction(() => {
                    const bodyText = document.body.innerText;
                    if (bodyText.includes('Temporary issue with Label Generation')) {
                        return 'temporary_issue';
                    }
                    if (bodyText.includes('Labels generated successfully') || bodyText.includes('Label generated successfully') || bodyText.includes('Ready to Ship Labels')) {
                        return 'success';
                    }
                    return null;
                }, { timeout: 60000 });

                const result = await modalResult.jsonValue();

                if (result === 'temporary_issue') {
                    console.log('⚠️  Temporary issue with Label Generation detected.');
                    console.log('Meesho will retry automatically. No labels available to download at this time.');
                    await page.screenshot({ path: path.join(DOWNLOAD_PATH, 'temporary_issue.png') });
                    console.log('Browser closed.');
                    await browser.close();
                    return;
                }

                console.log('Labels generated successfully.');
                await new Promise(r => setTimeout(r, 1000)); // Brief wait for dialog to fully render

                // Use the helper function to download the label
                const downloadSuccess = await checkAndDownloadLabelDialog(page, browser);

                if (!downloadSuccess) {
                    console.warn('⚠️  Label dialog detected but download failed. Trying fallback method...');
                    // Fallback to original method
                    const modalDownloadBtn = await page.evaluateHandle(() => {
                        const dialogs = document.querySelectorAll('div[role="dialog"]');
                        const lastDialog = dialogs[dialogs.length - 1];
                        if (!lastDialog) return null;

                        const buttons = Array.from(lastDialog.querySelectorAll('button'));
                        return buttons.find(b => b.innerText.trim() === 'Label' || b.innerText.trim() === 'Download');
                    });

                    if (modalDownloadBtn.asElement()) {
                        await modalDownloadBtn.click();
                        console.log('Clicked download button in modal (fallback).');

                        // Wait for PDF
                        console.log('Waiting for PDF file download...');
                        for (let i = 0; i < 60; i++) {
                            const files = fs.readdirSync(DOWNLOAD_PATH);
                            const pdfFile = files.find(f => f.endsWith('.pdf'));
                            if (pdfFile) {
                                console.log(`✅ SUCCESS! Downloaded label file: ${pdfFile}`);
                                console.log(`📁 Saved to: ${DOWNLOAD_PATH}`);
                                break;
                            }
                            await new Promise(r => setTimeout(r, 1000));
                        }
                    } else {
                        console.error('Download button in modal not found.');
                        await page.screenshot({ path: path.join(DOWNLOAD_PATH, 'error_modal_btn.png') });
                    }
                }

            } catch (e) {
                console.error('Timeout waiting for label generation:', e.message);
                await page.screenshot({ path: path.join(DOWNLOAD_PATH, 'error_generation_timeout.png') });
                // Still try to check for dialog as a last resort
                await checkAndDownloadLabelDialog(page, browser);
            }

        } else {
            console.error('Main "Label" button not found.');
            await page.screenshot({ path: path.join(DOWNLOAD_PATH, 'error_no_label_btn.png') });
        }

    } catch (error) {
        console.error('An error occurred:', error);
        await page.screenshot({ path: path.join(DOWNLOAD_PATH, 'fatal_error.png') });
    } finally {
        console.log('Browser closed.');
        await browser.close();
    }
})();
