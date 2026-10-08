import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {TABLES,bits,encrypt,decrypt,traceBlock,encodeText,decodeText,findKeys,collisionProfile} from '../src/sdes.js';
await mkdir('docs',{recursive:true});
const generatedAt=new Date().toISOString(),vector={plain:'11010111',key:'1010000010',cipher:'10001100'};
assert.equal(encrypt(vector.plain,vector.key),vector.cipher);
let roundTrips=0;const vectors=[],jsOutputs=[];
for(let k=0;k<1024;k++)for(let p=0;p<256;p++){
  const plain=bits(p),key=bits(k,10),cipher=encrypt(plain,key);
  assert.equal(decrypt(cipher,key),plain);roundTrips++;
  vectors.push({plain,key});jsOutputs.push(cipher);
}
console.log(`Basic round trips: ${roundTrips}/${roundTrips}`);
const python=spawnSync(process.env.PYTHON||'python',['reference/sdes.py'],{input:JSON.stringify(vectors),encoding:'utf8',maxBuffer:64*1024*1024});
if(python.status!==0)throw new Error(`Python reference failed: ${python.stderr||python.error}`);
const pythonOutputs=JSON.parse(python.stdout);assert.equal(pythonOutputs.length,jsOutputs.length);
pythonOutputs.forEach((value,i)=>assert.equal(value,jsOutputs[i],`cross vector ${i}`));
const mappingHash=createHash('sha256').update(jsOutputs.join('')).digest('hex');
console.log(`Independent Python cross-check: ${vectors.length}/${vectors.length}`);
const textSamples=['Hello, S-DES!','\0\n\r\t',Array.from({length:128},(_,n)=>String.fromCharCode(n)).join('')];
const ascii=textSamples.map(plain=>{const hex=encodeText(plain,vector.key);const restored=decodeText(hex,vector.key);assert.equal(restored,plain);return {plain,hex,restored};});
const unicode='王海丞 · 杨翔宇 · 刘焱 🔐',unicodeHex=encodeText(unicode,vector.key,'utf8');assert.equal(decodeText(unicodeHex,vector.key,'utf8'),unicode);
const pairs=[0,1,2,42,215].map(n=>({plain:bits(n),cipher:encrypt(bits(n),vector.key)}));
const bruteStartedAt=new Date().toISOString(),start=performance.now(),snapshots=[],matches=[];
for(let k=0;k<1024;k++){
  const key=bits(k,10);if(pairs.every(p=>encrypt(p.plain,key)===p.cipher))matches.push(key);
  if((k+1)%128===0)snapshots.push({checked:k+1,elapsedMs:performance.now()-start,matches:[...matches]});
}
const elapsedMs=performance.now()-start,bruteEndedAt=new Date().toISOString();
assert.deepEqual(matches,findKeys(pairs));assert.ok(matches.includes(vector.key));
const brute={pairs,onePairCandidates:findKeys(pairs.slice(0,1)),candidates:matches,checked:1024,startedAt:bruteStartedAt,endedAt:bruteEndedAt,elapsedMs,snapshots};
const profile=collisionProfile(vector.plain),closure=[];
for(let p=0;p<256;p++){const r=collisionProfile(bits(p));assert.ok(r.maxCollision>=4);closure.push({plain:bits(p),distinct:r.distinct,maxCollision:r.maxCollision});}
const result={generatedAt,node:process.version,platform:process.platform,standard:'course-sdes-2026',team:['王海丞','杨翔宇','刘焱'],tables:TABLES,basic:{vector,trace:traceBlock(vector.plain,vector.key),roundTrips},cross:{compared:vectors.length,mismatches:0,mappingSha256:mappingHash,realInterGroupTest:'需要其他小组向量；未虚构'},extension:{ascii,unicode,unicodeHex},brute,closure:{allPlaintextsHaveCollisions:true,rows:closure,example:profile}};
await writeFile('docs/test-results.json',JSON.stringify(result,null,2));
await writeFile('docs/cross-vectors.json',JSON.stringify({standard:'course-sdes-2026',vectors:Array.from({length:256},(_,p)=>({plain:bits(p),key:vector.key,cipher:encrypt(bits(p),vector.key)}))},null,2));
const md=`# 五关测试报告\n\n组员：王海丞、杨翔宇、刘焱。生成时间：${generatedAt}（UTC；北京时间 UTC+8）。环境：${process.platform} / Node ${process.version}。本报告由 \`npm run verify\` 根据实际计算自动生成。\n\n## 第 1 关：基本测试\n\n8-bit 明文 \`${vector.plain}\`、10-bit 密钥 \`${vector.key}\`，加密得到 \`${vector.cipher}\`，解密恢复原文。K₁=10100100，K₂=01000011。全部 **${roundTrips.toLocaleString()}** 个明文/密钥组合加密后解密均恢复原文。输入位数与字符验证见 \`tests/sdes.test.mjs\`。\n\n## 第 2 关：交叉测试\n\nJavaScript 使用整数位运算；独立 Python 实现使用列表与逐位运算。两个实现比较全部 **${vectors.length.toLocaleString()}** 个输入组合，**0** 项不一致。完整映射 SHA-256：\`${mappingHash}\`。\n\n课程 S-box2 完整参数为 \`[[0,1,2,3],[2,3,1,0],[3,0,1,2],[2,1,0,3]]\`，与常见网络教材版本不同。\n\n这是独立实现的一致性测试，**尚未取得其他真实小组的测试结果**。组间验证可在 GUI 导入对方 JSON，或将 [256 组向量](cross-vectors.json) 发给对方；其结果不能以此独立验证代替。\n\n## 第 3 关：扩展功能\n\nASCII 字符串 \`Hello, S-DES!\` 的 Hex 密文为 \`${ascii[0].hex}\`，解密原样恢复。额外验证控制字符与全部 128 个 ASCII 码。UTF-8 验证中文组员姓名与 emoji：${unicode}。空字符串、非法 Hex、错误位数均有测试。原始密文字节可为不可打印字符，GUI 同时提供可复制 Hex 和原始字符显示。\n\n## 第 4 关：暴力破解\n\n开始时间：${brute.startedAt}；结束时间：${brute.endedAt}。完整遍历 **1024** 个密钥，实际计算耗时 **${elapsedMs.toFixed(3)} ms**。\n\n| 明文 | 密文 |\n| --- | --- |\n${pairs.map(p=>`| ${p.plain} | ${p.cipher} |`).join('\n')}\n\n只使用第一对时的候选：${brute.onePairCandidates.map(k=>'\`'+k+'\`').join('、')}。使用全部五对后的候选：${matches.map(k=>'\`'+k+'\`').join('、')}。返回所有候选，不提前在首次匹配处停止。\n\n![真实搜索日志计时回放](bruteforce.gif)\n\n动图由实际搜索日志生成，逐帧标注原始累计计算耗时；播放时放慢以便阅读，动图播放时长不等于计算耗时。可运行 \`python scripts/render-demo.py\` 复现。\n\n## 第 5 关：封闭测试\n\n对明文 \`${vector.plain}\`，1024 个密钥产生 **${profile.distinct}** 个不同密文，最大 **${profile.maxCollision}** 个密钥映射到同一密文。一个具体例子：密文 \`${profile.groups[0].cipher}\` 对应密钥 ${profile.groups[0].keys.slice(0,5).map(k=>'\`'+k+'\`').join('、')} 等。\n\n穷举全部 256 个明文，每个明文都存在不同密钥产生相同密文的情况。1024 个密钥映射至最多 256 个密文，由鸽巢原理至少一个密文对应 4 个密钥。不能据此断言每个密文恰有 4 个密钥，也不能混淆为不同密钥在全部明文上都等价。\n\n| 明文 | 不同密文数 | 最大碰撞数 |\n| --- | --- | --- |\n${closure.slice(0,16).map(r=>`| ${r.plain} | ${r.distinct} | ${r.maxCollision} |`).join('\n')}\n\n全部 256 项统计和完整密钥列表见 [原始测试数据](test-results.json)。\n\n## GUI 验证\n\n界面验收记录见 [UI-QA.md](UI-QA.md)。自动化算法测试与 GUI 验收分别记录。\n`;
await writeFile('docs/TEST-REPORT.md',md);
console.log(`Brute-force: ${matches.length} candidates / ${elapsedMs.toFixed(3)} ms; collision: ${profile.distinct} outputs; report written.`);
