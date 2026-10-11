import {createHash} from 'node:crypto';
import {AppError} from './errors';
import {metadataId,type Player} from './model';
export function signupName(body:unknown){
 const name=typeof (body as {name?:unknown})?.name==='string'?(body as {name:string}).name.normalize('NFKC').trim().replace(/\s+/g,' '):'';
 if(name.length<2||name.length>80||/[\p{Cc}\p{Cf}]/u.test(name)||!/[\p{L}]/u.test(name))throw new AppError('INVALID_NAME','Enter your name (2–80 characters).',400);
 return name;
}
export function nameKey(name:string){return name.normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase('en-US');}
export interface SignupStore{find(name:string):Promise<Player|undefined>;claimOwner(id:number):Promise<string|undefined>;commit(id:number,player:Player):Promise<void>}
export async function signupOnce(store:SignupStore,name:string){
 const found=await store.find(name);if(found)return found;
 const player={id:'p_'+createHash('sha256').update(nameKey(name)).digest('hex').slice(0,32),name};
 for(let attempt=0;attempt<8;attempt++){
  const id=metadataId('signup:'+player.id,attempt);
  try{await store.commit(id,player);return player;}catch(error){
   const owner=await store.claimOwner(id);
   if(owner===player.id){const found=await store.find(name);if(found)return found;throw new AppError('SIGNUP_REVIEW','This signup needs organizer review. Please contact the organizer.');}
   if(owner!==undefined)continue;
   throw error;
  }
 }
 throw new AppError('SIGNUP_BUSY','Please try signing up again.');
}
