const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://localhost:3001/impact?period=FY&scopeType=National', { waitUntil: 'networkidle2' });
  
  // wait for map to render
  await page.waitForSelector('.uganda-map-layer', { timeout: 10000 });
  
  // hover over kampala or any path
  await page.hover('.uganda-map-layer path:nth-child(5)');
  await new Promise(r => setTimeout(r, 1000));
  
  await page.screenshot({ path: '/tmp/hover_card_screenshot.png' });
  await browser.close();
  console.log('Screenshot saved to /tmp/hover_card_screenshot.png');
})();
