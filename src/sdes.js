const freeze = value => { Object.values(value).forEach(v=> { if(v && typeof v==='object') freeze(v); }); return Object.freeze(value); };
export const TABLES = freeze({P10:[3,5,2,7,4,10,1,9,8,6],P8:[6,3,7,4,8,5,10,9],IP:[2,6,3,1,4,8,5,7],IP_INV:[4,1,3,5,7,2,8,6],EP:[4,1,2,3,2,3,4,1],P4:[2,4,3,1],S0:[[1,0,3,2],[3,2,1,0],[0,2,1,3],[3,1,0,2]],S1:[[0,1,2,3],[2,3,1,0],[3,0,1,2],[2,1,0,3]]});
export const bits=(value,width=8)=>value.toString(2).padStart(width,'0');
export function validateBits(value,width,label='输入') {
  if(typeof value!=='string'||!new RegExp(`^[01]{${width}}$`).test(value)) throw new Error(`${label}必须为 ${width} 位二进制，只能包含 0 和 1。`);
  return parseInt(value,2);
}
function permute(value,width,table) {return table.reduce((out,pos)=>(out<<1)|((value>>(width-pos))&1),0);}
function shiftHalves(value,count) {
  const rotate=n=>((n<<count)|(n>>(5-count)))&31;
  return (rotate(value>>5)<<5)|rotate(value&31);
}
const keyCache=new Map();
export function expandKey(key) {
  const value=validateBits(key,10,'密钥');
  if(keyCache.has(value)) return keyCache.get(value);
  const p10=permute(value,10,TABLES.P10),ls1=shiftHalves(p10,1),ls2=shiftHalves(ls1,2);
  const expanded=Object.freeze({p10:bits(p10,10),ls1:bits(ls1,10),ls2:bits(ls2,10),k1:bits(permute(ls1,10,TABLES.P8)),k2:bits(permute(ls2,10,TABLES.P8))});
  keyCache.set(value,expanded); return expanded;
}
function substitute(value,box) {return box[((value&8)>>2)|(value&1)][(value>>1)&3];}
function round(value,key,detailed=false) {
  const left=value>>4,right=value&15,ep=permute(right,4,TABLES.EP),mixed=ep^key;
  const s0=substitute(mixed>>4,TABLES.S0),s1=substitute(mixed&15,TABLES.S1),joined=(s0<<2)|s1,p4=permute(joined,4,TABLES.P4),out=((left^p4)<<4)|right;
  return detailed?{input:bits(value),left:bits(left,4),right:bits(right,4),ep:bits(ep),key:bits(key),mixed:bits(mixed),s0:bits(s0,2),s1:bits(s1,2),p4:bits(p4,4),output:bits(out)}:out;
}
function transform(value,keys,decrypting) {
  let block=permute(value,8,TABLES.IP);
  block=round(block,parseInt(decrypting?keys.k2:keys.k1,2));
  block=((block&15)<<4)|(block>>4);
  return permute(round(block,parseInt(decrypting?keys.k1:keys.k2,2)),8,TABLES.IP_INV);
}
export function encrypt(plain,key) {return bits(transform(validateBits(plain,8,'明文'),expandKey(key),false));}
export function decrypt(cipher,key) {return bits(transform(validateBits(cipher,8,'密文'),expandKey(key),true));}
export function traceBlock(input,key,decrypting=false) {
  const value=validateBits(input,8),keys=expandKey(key),ip=permute(value,8,TABLES.IP);
  const first=round(ip,parseInt(decrypting?keys.k2:keys.k1,2),true),v=parseInt(first.output,2),sw=((v&15)<<4)|(v>>4);
  const second=round(sw,parseInt(decrypting?keys.k1:keys.k2,2),true);
  return {input,key,decrypting,keys,ip:bits(ip),first,sw:bits(sw),second,output:bits(permute(parseInt(second.output,2),8,TABLES.IP_INV))};
}
function checkEncoding(encoding) {if(!['ascii','utf8'].includes(encoding)) throw new Error('编码必须是 ascii 或 utf8。');}
export function encodeText(text,key,encoding='ascii') {
  checkEncoding(encoding); const keys=expandKey(key);
  if(encoding==='ascii' && Array.from(text).some(c=>c.codePointAt(0)>127)) throw new Error('ASCII 模式仅支持 0–127 的字符，中文请切换 UTF-8。');
  const bytes=encoding==='ascii'?Uint8Array.from(text,c=>c.charCodeAt(0)):new TextEncoder().encode(text);
  return Array.from(bytes,b=>transform(b,keys,false).toString(16).padStart(2,'0')).join(' ').toUpperCase();
}
export function decodeText(hex,key,encoding='ascii') {
  checkEncoding(encoding); const keys=expandKey(key),clean=hex.replace(/\s/g,'');
  if(!/^(?:[0-9a-fA-F]{2})*$/.test(clean)) throw new Error('密文应为完整的十六进制字节，例如 A8 3F。');
  const bytes=Uint8Array.from(clean.match(/../g)||[],b=>transform(parseInt(b,16),keys,true));
  if(encoding==='ascii') {if(bytes.some(b=>b>127)) throw new Error('解密结果不是 ASCII，请检查密钥或切换 UTF-8。'); return Array.from(bytes,b=>String.fromCharCode(b)).join('');}
  try {return new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);} catch {throw new Error('解密结果不是有效 UTF-8，请检查密钥。');}
}
export function findKeys(pairs) {
  if(!Array.isArray(pairs)||!pairs.length) throw new Error('至少需要一对明文和密文。');
  const parsed=pairs.map(p=>({plain:validateBits(p.plain,8,'明文'),cipher:validateBits(p.cipher,8,'密文')}));
  const found=[];
  for(let k=0;k<1024;k++) {const key=bits(k,10),keys=expandKey(key); if(parsed.every(p=>transform(p.plain,keys,false)===p.cipher)) found.push(key);}
  return found;
}
export function collisionProfile(plain) {
  const value=validateBits(plain,8,'明文'),groups=Array.from({length:256},(_,i)=>({cipher:bits(i),keys:[]}));
  for(let k=0;k<1024;k++) {const key=bits(k,10); groups[transform(value,expandKey(key),false)].keys.push(key);}
  const occupied=groups.filter(g=>g.keys.length);
  return {plain,distinct:occupied.length,maxCollision:Math.max(...occupied.map(g=>g.keys.length)),groups:occupied.sort((a,b)=>b.keys.length-a.keys.length||a.cipher.localeCompare(b.cipher))};
}
