/**
 * 网页抓取 - 基础模板
 * 适用: 需要 JavaScript 渲染的简单页面
 */
const { chromium } = require('playwright-core');
const fs = require('fs');

// 配置
const URL = process.argv[2] || 'https://example.com';
const OUTPUT_FILE = process.argv[3] || 'scraped-content.txt';

(async () => {
  console.log(`🚀 开始抓取: ${URL}`);
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  
  try {
    // 访问页面
    await page.goto(URL, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    
    // 等待渲染
    await page.waitForTimeout(5000);
    
    // 提取所有文本
    const content = await page.evaluate(() => {
      // 尝试多种常见选择器
      const selectors = [
        'article', 'main', '.content', '.article',
        '[data-block-type="text"]', '.ace-line',
        '.post-content', '.entry-content'
      ];
      
      for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (el && el.innerText.length > 100) {
          return {
            selector: selector,
            text: el.innerText
          };
        }
      }
      
      // 兜底：返回 body 文本
      return {
        selector: 'body',
        text: document.body.innerText.substring(0, 50000)
      };
    });
    
    // 保存
    fs.writeFileSync(OUTPUT_FILE, content.text);
    console.log(`✅ 内容已保存到: ${OUTPUT_FILE}`);
    console.log(`📊 使用选择器: ${content.selector}`);
    console.log(`📝 内容长度: ${content.text.length} 字符`);
    
    // 预览
    console.log('\n===== 预览 (前 1000 字符) =====\n');
    console.log(content.text.substring(0, 1000));
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await browser.close();
  }
})();
