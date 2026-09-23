const {chromium}=require('/tmp/ui/node_modules/playwright');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
 const p=await b.newPage({viewport:{width:412,height:892}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message+' '+(e.stack||'').split('\n')[1]));
 await p.goto('file:///tmp/ui/mate_b.html'); await p.waitForTimeout(1500);
 console.log(await p.evaluate(process.argv[2])); console.log(errs); await b.close(); })();
