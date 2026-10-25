import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests/ui',timeout:35000,workers:1,retries:0,use:{baseURL:'http://127.0.0.1:8765',viewport:{width:412,height:915},deviceScaleFactor:1},webServer:{command:'node scripts/serve.mjs',port:8765,reuseExistingServer:false},reporter:[['list'],['html',{open:'never'}]],outputDir:'test-results'});
