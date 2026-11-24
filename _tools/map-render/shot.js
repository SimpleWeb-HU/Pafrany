const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const jobs = JSON.parse(process.argv[2]);
  for (const [name,w,h,z] of jobs) {
    const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: +(process.argv[3]||2) });
    p.on('console', m => { if (m.type()==='error') console.log('console', m.text().slice(0,150)); });
    await p.goto(`http://localhost:8765/render.html?${z}`);
    await p.waitForFunction(() => window.READY === true, null, { timeout: 90000 });
    await p.waitForTimeout(800);
    await p.screenshot({ path: name });
    console.log('ok', name);
    await p.close();
  }
  await b.close();
})();
