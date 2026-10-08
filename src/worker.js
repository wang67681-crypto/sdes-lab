import {findKeys,collisionProfile,bits} from './sdes.js';
self.onmessage=event=>{
  const {id,kind,payload}=event.data,startedAt=new Date().toISOString(),start=performance.now();
  try {
    let result;
    if(kind==='crack') result={keys:findKeys(payload),checked:1024};
    else if(kind==='collision') result=collisionProfile(payload);
    else if(kind==='all') {
      const rows=[];
      for(let p=0;p<256;p++) {const {distinct,maxCollision}=collisionProfile(bits(p)); rows.push({plain:bits(p),distinct,maxCollision}); if(p%16===0) self.postMessage({id,progress:(p+1)/256});}
      result={rows,checked:262144,allHaveCollisions:rows.every(r=>r.maxCollision>1)};
    } else throw new Error('未知实验类型。');
    self.postMessage({id,result,startedAt,endedAt:new Date().toISOString(),elapsedMs:performance.now()-start});
  } catch(error) {self.postMessage({id,error:error.message});}
};
