const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

    try {
        await page.goto('http://localhost:3000');
        
        // Wait for username input
        await page.waitForSelector('input[name="username"]', { timeout: 5000 });
        
        // Fill login form
        await page.fill('input[name="username"]', 'ti');
        await page.fill('input[name="password"]', '123'); // or whatever the local pass is
        await page.click('button[type="submit"]');
        
        // Wait for kanban to load
        await page.waitForSelector('.kanban-container', { timeout: 5000 });
        console.log('Logged in successfully!');
        
        // Find Em Balcão cards
        const cards = await page.$$('#col-em_balcao .card');
        if (cards.length === 0) {
            console.log('No cards in Em Balcão to test. Exiting.');
            process.exit(0);
        }
        
        const cardId = await cards[0].getAttribute('data-order-id');
        console.log(`Clicking card ID: ${cardId}`);
        await cards[0].click();
        
        // Wait for modal
        await page.waitForSelector('#detail-modal.open', { timeout: 2000 });
        console.log('Modal opened.');
        
        // Click Finalizar Pedido
        console.log('Clicking Finalizar Pedido...');
        await page.click('#conclude-form button[type="submit"]');
        
        // Check for loading state
        await page.waitForTimeout(1000);
        const btnText = await page.textContent('#conclude-form button[type="submit"]');
        console.log('Button text after click:', btnText);
        
        // Check if modal closes
        const isModalOpen = await page.isVisible('#detail-modal.open');
        console.log('Is modal open after 1s?:', isModalOpen);
        
        await page.waitForTimeout(2000);
        
    } catch (err) {
        console.error('TEST ERROR:', err);
    } finally {
        await browser.close();
    }
})();
