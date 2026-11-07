import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createStudioSky} from '../src/scene/studioSky.ts';
// Full float-buffer hashes captured before optimization, not handpicked pixels.
const original={light:'4a1ab63d60a45ea5b58d180d2a602bbf3e5b6b22d529196262e225a079ecb943',dark:'d7d2ba20fb26376b86bf51628f094a1d0806919569d55eb65929a4b05b8cf47e'};
for(const theme of ['light','dark']){
 const start=performance.now(),sky=createStudioSky(theme),ms=performance.now()-start;
 assert.equal(sky.image.width,1024);assert.equal(sky.image.height,512);
 assert.equal(createHash('sha256').update(Buffer.from(sky.image.data.buffer)).digest('hex'),original[theme],`${theme} panorama must remain bit-for-bit identical`);
 console.log(`${theme}: identical 1024×512 float panorama, ${ms.toFixed(2)} ms generation`);sky.dispose();
}
console.log('PASS: day and night environment data remains exactly unchanged.');
