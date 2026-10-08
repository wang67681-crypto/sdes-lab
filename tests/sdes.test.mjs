import test from 'node:test';
import assert from 'node:assert/strict';
import {TABLES,expandKey,encrypt,decrypt,traceBlock,encodeText,decodeText,findKeys,collisionProfile} from '../src/sdes.js';
const bits=(n,w=8)=>n.toString(2).padStart(w,'0');
test('课程指定的 S-box2 修改项与子密钥',()=>{
  assert.equal(TABLES.S1?.[1]?.[2],1);
  assert.deepEqual([expandKey('1010000010').k1,expandKey('1010000010').k2],['10100100','01000011']);
});
test('独立 Python 验证的课程向量与解密、轨迹',()=>{
  assert.equal(encrypt('11010111','1010000010'),'10001100');
  assert.equal(decrypt('10001100','1010000010'),'11010111');
  assert.equal(traceBlock('11010111','1010000010').output,'10001100');
});
test('全部 262144 组合可逆',()=>{
  for(let k=0;k<1024;k++) for(let p=0;p<256;p++) assert.equal(decrypt(encrypt(bits(p),bits(k,10)),bits(k,10)),bits(p));
});
test('拒绝错误的位数、字符与编码',()=>{
  for(const p of ['101','abcdefgh','110101112',' 11010111']) assert.throws(()=>encrypt(p,'1010000010'));
  assert.throws(()=>encrypt('11010111','101'));
  assert.throws(()=>encodeText('中文','1010000010','ascii'));
  assert.throws(()=>decodeText('xyz','1010000010','ascii'));
  assert.throws(()=>decodeText('A','1010000010','ascii'));
});
test('ASCII 包含控制字符、UTF-8 包含中文 emoji',()=>{
  for(const [s,mode] of [['Hello, S-DES!\0\n','ascii'],['王海丞 · 杨翔宇 · 刘焱 🔐','utf8'],['\uFEFFABC','utf8'],['','ascii']]) assert.equal(decodeText(encodeText(s,'1010000010',mode),'1010000010',mode),s);
});
test('多对破解枚举所有候选，并拒绝空的约束',()=>{
  const pairs=[0,1,2,42,215].map(n=>({plain:bits(n),cipher:encrypt(bits(n),'1010000010')}));
  const one=findKeys(pairs.slice(0,1)); const many=findKeys(pairs);
  assert.ok(one.includes('1010000010')); assert.ok(many.includes('1010000010'));
  assert.ok(many.length<=one.length); assert.throws(()=>findKeys([]));
  assert.deepEqual(findKeys([{plain:'00000000',cipher:'00000000'},{plain:'00000000',cipher:'11111111'}]),[]);
});
test('固定明文的碰撞分布计数满足鸽巢原理',()=>{
  const profile=collisionProfile('11010111');
  assert.equal(profile.groups.reduce((sum,g)=>sum+g.keys.length,0),1024);
  assert.ok(profile.distinct<=256); assert.ok(profile.maxCollision>=4);
});
