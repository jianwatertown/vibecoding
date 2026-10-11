import {AppError} from './errors';
import {metadataId,reservationId,type Reservation} from './model';
export interface AtomicStore {
  find(key:string):Promise<Reservation|undefined>;
  claimOwner(id:number):Promise<string|undefined>;
  commit(id:number,key:string):Promise<Reservation>;
}
function existing(row:Reservation){
  if(row.status!=='reserved') throw new AppError('ORGANIZER_REQUIRED','Your reservation was updated by the organizer. Please contact them for help.',409);
  return {reservation:row,alreadyReserved:true};
}
// Google's unique metadata ID and atomic batch enforce uniqueness across instances.
// Optimistically write after validating the roster to keep the usual path to one read
// and one write. Read the full key on conflicts, collisions, or ambiguous timeouts.
export async function reserveOnce(store:AtomicStore,gameId:string,playerId:string){
  const key=reservationId(gameId,playerId);
  const found=await store.find(key); if(found) return existing(found);
  for(let attempt=0;attempt<8;attempt++){
    const id=metadataId(key,attempt);
    try{return {reservation:await store.commit(id,key),alreadyReserved:false};}
    catch(error){
      const owner=await store.claimOwner(id);
      if(owner===key){
        const row=await store.find(key);
        if(row)return existing(row);
        throw new AppError('RESERVATION_REVIEW','A previous reservation needs organizer review. Please contact the organizer.');
      }
      if(owner!==undefined)continue;
      throw error;
    }
  }
  throw new AppError('RESERVATION_BUSY','Please try reserving again in a moment.');
}
