import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'./browser-tests',testMatch:'*.spec.mjs',workers:1,retries:0,
 outputDir:'test-results/browser-artifacts',
 timeout:120000,expect:{timeout:15000},
 reporter:[['line'],['json',{outputFile:process.env.LOCAT_BROWSER_REPORT??'test-results/browser-results.json'}]],
 use:{browserName:'chromium',headless:true,serviceWorkers:'block'},
});
