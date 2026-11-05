import { createServer } from 'vite';
import { chromium } from 'playwright-core';
import path from 'node:path';
const S=process.argv[2];
const server = await createServer({ configFile: path.resolve('vite.config.ts'), root: path.resolve('dev'), server: { port: 0, hmr: false, watch: null }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ channel: 'chrome' });
const base = server.resolvedUrls.local[0].replace(/\/$/, '');
const errs=[];
const shots=[['a',1600,900,'siege=castle&terrain=grass&machine=catapult3&a=spearman:40,bowman:30,griffin:12&b=bowman:10,griffin:5,swordsman:5,wolf:6,spearman:9&towers=bowman:22,bowman:8,bowman:6'],['p',390,844,'siege=castle&terrain=snow&a=spearman:10&b=wolf:6&towers=bowman:22'],['l',844,390,'siege=citadel&terrain=dirt&a=spearman:10&b=wolf:6&towers=bowman:22']];
for(const [n,w,h,q] of shots){
  const page = await browser.newPage({ viewport:{width:w,height:h}, deviceScaleFactor:2 });
  page.on('pageerror',e=>errs.push(n+': '+e.message));
  page.on('response',r=>{if(r.status()>=400)errs.push(n+': '+r.status()+' '+r.url())});
  await page.goto(`${base}/battle.html?${q}`);
  await page.waitForFunction(()=>window.__ready===true,null,{timeout:60000});
  await page.waitForTimeout(800);
  await page.screenshot({path:`${S}/k-${n}.png`});
  if(n==='a'){
    await page.evaluate(()=>{const w=__game.scene.getScene('Battle').view.walls; const f=w.full; w.show({parts:{...f,keep:0}});});
    await page.waitForTimeout(400);
    await page.screenshot({path:`${S}/k-down.png`});
    await page.evaluate(()=>{const w=__game.scene.getScene('Battle').view.walls; w.show({parts:w.full});});
    await page.mouse.click(1234,840);
    await page.waitForTimeout(22000);
    await page.screenshot({path:`${S}/k-mid.png`});
  }
  await page.close();
}
console.log('errors',errs);
await browser.close(); server.close(); process.exit(0);
