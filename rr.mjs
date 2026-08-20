import { chromium } from 'playwright'
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
const p = await b.newPage({ viewport: { width: 1200, height: 950 } })
const errs = []
p.on('console', m => { if (m.type()==='error' && !/TUNNEL|fonts\.googleapis/.test(m.text())) errs.push(m.text()) })
p.on('pageerror', e => errs.push('PAGEERROR ' + e.message))
for (const r of ['/', '/calendar', '/sports', '/sports/judo', '/la28', '/games', '/me', '/daily', '/t/Sai4702025WCh', '/junk']) {
  await p.goto('http://localhost:4180/#'+r, { waitUntil: 'networkidle' }); await p.waitForTimeout(220)
  const has = await p.evaluate(()=>document.body.innerText.trim().length > 40)
  if (!has) errs.push('EMPTY PAGE at '+r)
}
// in-app navigation still works (router v7)
await p.goto('http://localhost:4180/#/', { waitUntil: 'networkidle' }); await p.waitForTimeout(300)
await p.click('.card .title a'); await p.waitForTimeout(400)
console.log('card -> detail:', p.url().includes('/t/'))
await p.click('.linkbtn'); await p.waitForTimeout(400)
console.log('back button works:', p.url())
for (const g of ['more-medals','podium','flags-sports','draft','odd-one-out']) {
  await p.goto('http://localhost:4180/#/games/'+g, { waitUntil: 'networkidle' }); await p.waitForTimeout(280)
  for (const btn of await p.$$('button.btn.primary')) if (await btn.isEnabled()) { await btn.click(); break }
  await p.waitForTimeout(380)
  const ok = await p.evaluate(()=>!!document.querySelector('.qprompt, .palette, .poolcard, .catslots, .draftrow, .cards'))
  if (!ok) errs.push('game did not start: '+g)
}
console.log('ERRORS:', errs.length ? errs : 'none')
await b.close()
