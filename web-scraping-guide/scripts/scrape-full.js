const { chromium } = require('playwright-core');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  
  try {
    await page.goto(process.argv[2] || 'https://example.com', {
      waitUntil: 'networkidle',
      timeout: 120000
    });
    await page.waitForTimeout(5000);
    
    // Extract TOC and click each item
    const tocItems = await page.evaluate(() => {
      const items = [];
      document.querySelectorAll('.catalogue__list-item a').forEach((link, idx) => {
        items.push({ index: idx, text: link.innerText.trim() });
      });
      return items;
    });
    
    const allContent = [];
    
    for (let i = 0; i < Math.min(tocItems.length, 20); i++) {
      try {
        await page.click(`.catalogue__list-item:nth-child(${i+1}) a`);
        await page.waitForTimeout(2000);
        
        const content = await page.evaluate(() => {
          const results = [];
          document.querySelectorAll('.ace-line, .text-block').forEach(el => {
            const text = el.innerText.trim();
            if (text && text.length > 3) results.push(text);
          });
          return results;
        });
        
        allContent.push(`\n===== ${tocItems[i].text} =====\n`);
        allContent.push(...content);
      } catch (e) {}
    }
    
    // Scroll for lazy-loaded content
    const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
    for (let pos = 0; pos < scrollHeight; pos += 800) {
      await page.evaluate((y) => window.scrollTo(0, y), pos);
      await page.waitForTimeout(1000);
    }
    
    fs.writeFileSync('extracted-content.txt', allContent.join('\n\n'));
    console.log('Extracted', allContent.length, 'text blocks');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
