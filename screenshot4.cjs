const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1200 });
  await page.goto('http://localhost:3001/impact?period=FY&scopeType=National', { waitUntil: 'networkidle2' });
  
  await new Promise(r => setTimeout(r, 4000));
  
  // scroll down to map
  await page.evaluate(() => {
    window.scrollBy(0, 800);
  });
  
  await new Promise(r => setTimeout(r, 1000));
  
  try {
    // get a handle to the first valid path and hover it
    const el = await page.$('.impact-map-district-shape');
    if (el) {
      await el.hover();
      console.log('Hovered an element successfully!');
      await new Promise(r => setTimeout(r, 1000));
    } else {
      console.log('No elements found with .impact-map-district-shape.');
    }
  } catch (e) {
    console.log('Could not hover', e);
  }
  
  await page.screenshot({ path: '/tmp/hover_card_screenshot4.png' });
  await browser.close();
  console.log('Screenshot saved to /tmp/hover_card_screenshot4.png');
})();
