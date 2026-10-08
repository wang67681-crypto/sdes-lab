import {mkdir,cp,copyFile} from 'node:fs/promises';
await mkdir('dist',{recursive:true});
await copyFile('index.html','dist/index.html');
for(const dir of ['src','assets'])await cp(dir,`dist/${dir}`,{recursive:true});
console.log('Built dist/ — static files, no runtime dependencies.');
