# 🕸️ 网页抓取成功经验总结

## 适用场景
- 飞书文档等需要 JavaScript 渲染的动态网页
- 单页应用 (SPA) 如 React/Vue 构建的网站
- 内容懒加载的网页
- 需要登录但公开目录可见的文档

---

## 🔧 工具链组合

### 核心工具
| 工具 | 用途 | 安装 |
|------|------|------|
| `playwright-core` | 浏览器自动化 | `npm install playwright-core` |
| Chromium | 浏览器引擎 | `npx playwright install chromium` |
| Node.js | 脚本执行 | 内置 |

### 备选方案
- **Jina AI Reader** (`https://r.jina.ai/http://URL`) - 简单网页快速提取
- **直接 HTTP** - 静态 HTML 页面

---

## 📋 标准抓取流程

### 阶段一：快速试探（30秒）
```javascript
// 方法1: Jina AI Reader（最简单）
https://r.jina.ai/http://目标网址

// 方法2: 直接请求
Invoke-WebRequest -Uri "目标网址"
```

**判断标准：**
- ✅ 如果能看到完整文本 → 完成
- ❌ 如果看到乱码/JS代码/加载中 → 进入阶段二

---

### 阶段二：浏览器自动化（2-5分钟）

#### 步骤1: 安装依赖
```bash
npm init -y
npm install playwright-core
npx playwright install chromium
```

#### 步骤2: 关键技巧 - 点击目录 + 滚动加载
对于飞书文档等 SPA，需要：
1. 获取目录列表
2. 点击每个目录项触发内容加载
3. 滚动页面加载懒加载内容
4. 收集所有文本块

```javascript
// 示例：点击目录项加载内容
const tocItems = await page.evaluate(() => {
  const items = [];
  document.querySelectorAll('.catalogue__list-item a').forEach(link => {
    items.push({ text: link.innerText.trim(), href: link.href });
  });
  return items;
});

// 点击每个目录项
for (const item of tocItems) {
  await page.click(`text=${item.text}`);
  await page.waitForTimeout(2000);
  // 提取内容...
}
```

---

### 阶段三：数据解析

#### 技巧1: 提取嵌入JSON
```powershell
Select-String -Path "page-source.html" -Pattern 'window\.(\w+)=(\{.+?\});' -AllMatches
```

#### 技巧2: 飞书文档特定选择器
| 选择器 | 说明 |
|--------|------|
| `.ace-line` | 飞书段落文本 |
| `.heading-content` | 标题 |
| `.catalogue__list-item a` | 目录项 |
| `[data-block-type="text"]` | 文本块 |

---

## 🎯 飞书文档专项攻略（成功经验）

### 成功抓取的关键步骤

```javascript
const { chromium } = require('playwright-core');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // 1. 访问页面
  await page.goto('https://xxx.feishu.cn/wiki/xxx', {
    waitUntil: 'networkidle',
    timeout: 120000
  });
  await page.waitForTimeout(5000);
  
  // 2. 获取目录项并点击（关键！触发内容加载）
  const tocItems = await page.evaluate(() => {
    const items = [];
    document.querySelectorAll('.catalogue__list-item a').forEach((link, idx) => {
      items.push({ index: idx, text: link.innerText.trim() });
    });
    return items;
  });
  
  const allContent = [];
  
  // 3. 点击每个目录项加载内容
  for (let i = 0; i < tocItems.length; i++) {
    try {
      await page.click(`.catalogue__list-item:nth-child(${i+1}) a`);
      await page.waitForTimeout(2000);
      
      // 4. 提取当前内容
      const content = await page.evaluate(() => {
        const results = [];
        document.querySelectorAll('.ace-line').forEach(el => {
          const text = el.innerText.trim();
          if (text) results.push(text);
        });
        return results;
      });
      
      allContent.push(...content);
    } catch (e) {}
  }
  
  // 5. 滚动收集（处理懒加载）
  const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
  for (let pos = 0; pos < scrollHeight; pos += 800) {
    await page.evaluate((y) => window.scrollTo(0, y), pos);
    await page.waitForTimeout(1000);
    // 收集新加载的内容...
  }
  
  fs.writeFileSync('output.txt', allContent.join('\n\n'));
  await browser.close();
})();
```

### 关键点总结
1. **必须点击目录项** - 飞书文档内容是点击后动态加载的
2. **必须模拟滚动** - 长文档使用懒加载
3. **内容在 `.ace-line` 中** - 飞书段落的特定选择器
4. **目录结构在 `window.catalogRecordInfo` 中** - JSON 数据

---

## 💡 常见问题排查

| 问题 | 原因 | 解决 |
|------|------|------|
| 只有标题没有正文 | 内容懒加载/需点击触发 | 点击目录项 + 滚动 |
| 内容乱码 | 编码问题 | 使用 UTF-8 读取 |
| HTML 很空 | JS 动态渲染 | 用 Playwright 等浏览器 |
| 被反爬拦截 | 缺少 User-Agent | 设置真实浏览器 UA |

---

## 🚀 快速决策树

```
需要抓取网页？
├── 是静态页面？
│   └── 用 curl / Invoke-WebRequest
└── 是动态渲染（飞书/Notion等）？
    ├── 有公开 API？
    │   └── 直接调 API
    └── 需要浏览器渲染？
        └── 用 Playwright + Chromium
            ├── 有目录结构？
            │   └── 点击目录项触发加载
            ├── 内容需要滚动加载？
            │   └── 模拟滚动 + DOM 提取
            └── 内容在 HTML 嵌入 JSON？
                └── 解析 JSON 数据
```

---

## 📁 配套文件

- `scrape-basic.js` - 基础抓取模板
- `scrape-deep.js` - 深度抓取模板（含滚动）
- `scrape-full.js` - 飞书文档完整抓取（点击目录+滚动）
- `extract-json.ps1` - JSON 提取脚本

---

*创建时间: 2026-03-10*
*更新: 成功抓取飞书文档完整内容*
*适用版本: OpenClaw + Playwright-Core*
