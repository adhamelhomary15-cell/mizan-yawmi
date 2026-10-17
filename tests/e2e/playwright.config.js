// Dev-only end-to-end tests (feature 013): the built index.html in real browsers at phone size, Chromium and WebKit
// (the engine of Safari on iPhone). Never shipped with the app. Run tools/build.py first, then `npm test` here.
const {defineConfig} = require('@playwright/test');

const PORT = 4173;
module.exports = defineConfig({
  testDir: '.',
  timeout: 30000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:' + PORT + '/',
    viewport: {width: 375, height: 812},
    timezoneId: 'Africa/Cairo',
    serviceWorkers: 'allow',
    screenshot: 'only-on-failure'
  },
  projects: [
    {name: 'chromium', use: {browserName: 'chromium'}},
    {name: 'webkit', use: {browserName: 'webkit'}}
  ],
  webServer: {
    command: (process.env.PYTHON || 'python3') + ' serve.py ' + PORT + ' ../..',
    url: 'http://127.0.0.1:' + PORT + '/index.html',
    reuseExistingServer: !process.env.CI
  }
});
