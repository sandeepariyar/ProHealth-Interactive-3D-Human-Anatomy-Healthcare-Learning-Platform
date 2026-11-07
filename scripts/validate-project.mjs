/** Asset/structure checks which work without npm-installed packages or network. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const files=[];
function walk(p){for(const name of fs.readdirSync(p)){const f=path.join(p,name);if(fs.statSync(f).isDirectory())walk(f);else files.push(f)}}
walk(path.join(root,'src'));
let errors=0;
function check(ok,msg){console.log(ok?'  ✓':'  ✗',msg);if(!ok)errors++}
for(const filename of files.filter(x=>/\.tsx?$/.test(x))){
  const src=fs.readFileSync(filename,'utf8');
  for(const [,spec] of src.matchAll(/\b(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g)){
    const p=path.resolve(path.dirname(filename),spec);
    check(['','.ts','.tsx','.js','.jsx','/index.ts','/index.tsx'].some(ext=>fs.existsSync(p+ext)),`${path.relative(root,filename)} imports ${spec}`);
  }
}
const modelLoader=fs.readFileSync(path.join(root,'src/scene/RealAtlas.tsx'),'utf8');
check(modelLoader.includes('DRACOLoader')&&modelLoader.includes('loadWithFallback'),'Draco real-model loader configured');
check(modelLoader.includes('skeletal')&&modelLoader.includes('cardiovascular')&&modelLoader.includes('nervous'),'Multi-system anatomical atlas configured');
check(!fs.readFileSync(path.join(root,'src/scene/BodyAtlas.tsx'),'utf8').includes('SchematicOrgans'),'Primitive organ placeholder removed');
check(fs.existsSync(path.join(root,'scripts/download-anatomy.mjs')),'Automated anatomical asset downloader present');
check(fs.existsSync(path.join(root,'public/models/NOTICE.md')),'Anatomical attribution/notice present');
check(fs.existsSync(path.join(root,'docs/RESEARCH_AND_ROADMAP.md')),'Research and rendering roadmap present');
check(fs.readFileSync(path.join(root,'src/styles/app.css'),'utf8').includes('prefers-reduced-motion'),'Reduced-motion CSS present');
console.log(`\nStatic checks: ${errors===0?'PASS':'FAIL'} (${errors} issues)`);
if(errors)process.exit(1);
