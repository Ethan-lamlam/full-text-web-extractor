/**
 * 网页抓取 - 深度模板（含滚动加载）
 * 适用: 飞书文档、懒加载页面、长文档
 */
const { chromium } = require('playwright-core');
const fs = require('fs');

// 配置
const URL = process.argv[2] || 'https://example.com';
const OUTPUT_HTML = 'page-source.html';
const OUTPUT_TEXT = 'page-content.txt';

(async () => {
  console.log(`🚀 开始深度抓取: ${URL}`);
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  });
  
  try {
    // 1. 访问页面
    console.log('📥 加载页面...');
    await page.goto(URL, {
      waitUntil: 'networkidle',
      timeout: 120000
    });
    
    // 2. 滚动加载（关键步骤）
    console.log('📜 滚动加载内容...');
    const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    
    console.log(`   页面高度: ${scrollHeight}px, 视口: ${viewportHeight}px`);
    
    for (let pos = 0; pos < scrollHeight; pos += viewportHeight / 2) {
      await page.evaluate((y) => window.scrollTo(0, y), pos);
      await page.waitForTimeout(800);
      process.stdout.write('.');
    }
    console.log('');
    
    // 3. 保存完整 HTML
    const html = await page.content();
    fs.writeFileSync(OUTPUT_HTML, html);
    console.log(`💾 HTML 已保存: ${OUTPUT_HTML}`);
    
    // 4. 提取文本内容
    console.log('📝 提取文本内容...');
    const content = await page.evaluate(() => {
      const results = [];
      
      // 标题
      document.querySelectorAll('h1, h2, h3, h4, .heading-content').forEach(h => {
        const text = h.innerText.trim();
        if (text) results.push(`【标题】${text}`);
      });
      
      // 段落（飞书用 .ace-line）
      document.querySelectorAll('.ace-line, .text-block, [data-block-type="text"], p').forEach(p => {
        const text = p.innerText.trim();
        if (text && text.length > 5) results.push(text);
      });
      
      // 列表项
      document.querySelectorAll('.bullet-list .list-content, li').forEach(li => {
        const text = li.innerText.trim();
        if (text && text.length > 5) results.push(`• ${text}`);
      });
      
      return results;
    });
    
    // 5. 保存文本
    fs.writeFileSync(OUTPUT_TEXT, content.join('\n\n'));
    console.log(`💾 文本已保存: ${OUTPUT_TEXT}`);
    console.log(`📊 提取到 ${content.length} 个文本块`);
    
    // 6. 尝试提取嵌入 JSON（飞书专用）
    const jsonData = await page.evaluate(() => {
      if (window.catalogRecordInfo) return window.catalogRecordInfo;
      return null;
    });
    
    if (jsonData) {
      fs.writeFileSync('page-data.json', JSON.stringify(jsonData, null, 2));
      console.log('💾 发现嵌入 JSON 数据，已保存: page-data.json');
    }
    
    // 7. 预览
    console.log('\n===== 内容预览 (前 20 条) =====\n');
    content.slice(0, 20).forEach((text, i) => {
      const preview = text.substring(0, 100);
      console.log(`${i + 1}. ${preview}${text.length > 100 ? '...' : ''}`);
    });
    
    console.log('\n✅ 抓取完成！');
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
    await page.screenshot({ path: 'error-screenshot.png' });
    console.log('📸 错误截图已保存: error-screenshot.png');
  } finally {
    await browser.close();
  }
})();
