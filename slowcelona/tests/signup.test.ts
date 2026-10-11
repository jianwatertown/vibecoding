import test from 'node:test';
import assert from 'node:assert/strict';
import {signupName,signupOnce,nameKey,type SignupStore} from '../lib/signup';
import type {Player} from '../lib/model';
test('signup validates and normalizes names without interpreting formulas',()=>{
 assert.equal(signupName({name:'  李 明  '}),'李 明');assert.equal(signupName({name:' Alex   Smith '}),'Alex Smith');
 for(const name of ['', 'x', '123', 'A\u0000B', 'a'.repeat(81)])assert.throws(()=>signupName({name}));
 assert.equal(signupName({name:'=Alex'}),'=Alex');
});
test('simultaneous signup and lost responses reuse one player',async()=>{
 const rows=new Map<string,Player>(),claims=new Map<number,string>();let writes=0;
 const store:SignupStore={find:async n=>rows.get(nameKey(n)),claimOwner:async id=>claims.get(id),commit:async(id,p)=>{if(claims.has(id))throw Error('duplicate');claims.set(id,p.id);rows.set(nameKey(p.name),p);writes++;throw Error('lost response')}};
 const results=await Promise.all(Array.from({length:10},(_,i)=>signupOnce(store,i%2?'Test Player':'TEST PLAYER')));
 assert.equal(writes,1);assert.equal(new Set(results.map(r=>r.id)).size,1);
});
