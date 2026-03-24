import puppeteer from 'puppeteer';
import { spawn } from 'child_process';
import http from 'http';

// Helper to wait for the server
function waitForServer(url, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const interval = setInterval(() => {
      http.get(url, (res) => {
        if (res.statusCode === 200 || res.statusCode === 404 || res.statusCode === 308) {
          clearInterval(interval);
          resolve();
        }
      }).on('error', () => {
        if (Date.now() - start > timeoutMs) {
          clearInterval(interval);
          reject(new Error(`Server not ready at ${url} within ${timeoutMs}ms`));
        }
      });
    }, 1000);
  });
}

async function run() {
  console.log("Starting Next.js dev server...");
  const server = spawn('npm', ['run', 'dev'], { stdio: 'pipe' });
  
  try {
    await waitForServer('http://localhost:3000');
    console.log("Server is running. Launching Puppeteer...");

    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    // Bypass authentication by spoofing a session cookie or just letting the middleware handle it if we go to a public test page
    // Wait, let's inject a fake route or just evaluate JS on the homepage which exposes the offline libraries?
    // Actually, Next.js app router doesn't expose Modules globally. 
    // We should create a temporary test page in `src/app/test-offline/page.tsx` that exposes what we need to window!
    
  } catch (err) {
    console.error(err);
  } finally {
    server.kill();
  }
}

run();
