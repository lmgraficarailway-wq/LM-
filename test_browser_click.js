const { chromium } = require('playwright');
const assert = require('assert');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    // Log console messages
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

    try {
        await page.goto('http://localhost:3000');
        await page.waitForTimeout(1000);
        
        await page.screenshot({ path: 'test_step1.png' });
        
        // Mock login
        await page.evaluate(() => {
            localStorage.setItem('user', JSON.stringify({
                id: 1, name: 'T.i', role: 'admin'
            }));
            localStorage.setItem('token', 'mock_token');
        });
        
        // Reload to apply login
        await page.goto('http://localhost:3000');
        await page.waitForTimeout(2000);
        await page.screenshot({ path: 'test_step2.png' });
        
        // Wait for board to load
        await page.waitForSelector('.kanban-container', { timeout: 5000 });
        await page.screenshot({ path: 'test_step3.png' });
        
    } catch (err) {
        console.error('TEST ERROR:', err);
    } finally {
        await browser.close();
    }
})();
