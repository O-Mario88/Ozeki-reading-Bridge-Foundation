const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1200 });
  await page.goto('http://localhost:3001/impact?period=FY&scopeType=National', { waitUntil: 'networkidle2' });
  
  await new Promise(r => setTimeout(r, 4000));
  
  await page.evaluate(() => window.scrollBy(0, 800));
  await new Promise(r => setTimeout(r, 1000));
  
  await page.hover('.impact-map-district-shape');
  await new Promise(r => setTimeout(r, 1000));
  
  const styles = await page.evaluate(() => {
    const el = document.querySelector('.impact-map-floating-card');
    if (!el) return null;
    const computed = window.getComputedStyle(el);
    return {
      backgroundColor: computed.backgroundColor,
      backgroundImage: computed.backgroundImage,
      color: computed.color,
      zIndex: computed.zIndex,
      opacity: computed.opacity,
    };
  });
  
  console.log(JSON.stringify(styles, null, 2));
  
  await browser.close();
})();
