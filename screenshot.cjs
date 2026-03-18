const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://localhost:3001/impact?period=FY&scopeType=National', { waitUntil: 'networkidle2' });
  
  await new Promise(r => setTimeout(r, 5000)); // Just wait 5 seconds for render
  
  // Try hovering over an svg path
  try {
    await page.hover('svg path:nth-child(5)');
    await new Promise(r => setTimeout(r, 1000));
  } catch (e) {
    console.log('Could not hover over path', e);
  }
  
  await page.screenshot({ path: '/tmp/hover_card_screenshot2.png' });
  await browser.close();
  console.log('Screenshot saved to /tmp/hover_card_screenshot2.png');
})();
