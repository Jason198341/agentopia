import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  headless: true,
});

const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });

// 로그인 페이지로 리다이렉트 될 것이므로 직접 확인
await page.goto('http://localhost:3000/counseling', { waitUntil: 'networkidle2', timeout: 15000 });
await page.screenshot({ path: '/c/Users/USER/agentopia/ss-counseling-list.png', fullPage: true });
console.log('screenshot saved: ss-counseling-list.png');
console.log('current URL:', page.url());

await browser.close();
