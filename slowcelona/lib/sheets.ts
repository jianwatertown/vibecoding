import {google,metadata,values,stringRow,sheetId,type Grid} from './google';
import {AppError,SheetsError} from './errors';
import {playersFrom,upcomingGame,reservationsFrom,publicRoster,WAIVER,CONSENT,type ReserveInput,type Reservation} from './model';
import {reserveOnce} from './reservations';
export const SCHEMA={Reservations:['reservation_id','game_id','player_id','player_name','reserved_at','status','admin_notes'],WaiverAcceptances:['acceptance_id','reservation_id','game_id','player_id','participant_name','accepted_at','waiver_version','waiver_sha256','consent_text','signer_is_adult'],WaiverVersions:['waiver_version','sha256','text','created_at']};
function assertHeaders(grid:Grid,expected:string[]){if(expected.some((h,i)=>grid[0]?.[i]!==h))throw new AppError('SHEET_CONFIG','Reservations need an organizer update. Please try again later.');}
let cached:{at:number;data:Awaited<ReturnType<typeof readState>>}|undefined;
let inFlight:Promise<Awaited<ReturnType<typeof readState>>>|undefined;
async function readState(){
  const [players,games,reservations,acceptances]=await values(['Players!A:E','Games!A:Z','Reservations!A:G','WaiverAcceptances!A1:J1']);
  assertHeaders(acceptances,SCHEMA.WaiverAcceptances);
  assertHeaders(players,['player_id','name','payment_type','credit_balance','active']);
  assertHeaders(games,['game_id','date']);assertHeaders(reservations,SCHEMA.Reservations);
  return {players:playersFrom(players),game:upcomingGame(games),reservations:reservationsFrom(reservations)};
}
export async function state(fresh=false){
  if(!fresh&&cached&&Date.now()-cached.at<10000)return cached.data;
  if(!fresh&&inFlight)return inFlight;
  const read=readState().then(data=>{cached={at:Date.now(),data};return data});
  if(fresh)return read;
  inFlight=read;try{return await read}finally{inFlight=undefined}
}
export async function publicState(){const s=await state();return {game:s.game,players:s.players,reservations:s.game?publicRoster(s.reservations,s.game.id):[],waiver:{version:WAIVER.version,hash:WAIVER.textSha256}};}
let tableIds: {at:number;ids:Record<string,number>}|undefined;
let tableRead:Promise<Record<string,number>>|undefined;
async function getTableIds(){
 if(tableIds&&Date.now()-tableIds.at<600000)return tableIds.ids;
 if(tableRead)return tableRead;
 tableRead=metadata().then(meta=>{const ids=Object.fromEntries(meta.sheets.map(s=>[s.properties.title,s.properties.sheetId]));tableIds={at:Date.now(),ids};return ids});
 try{return await tableRead}finally{tableRead=undefined}
}
export async function reserve(input:ReserveInput){
  const s=await state(true),player=s.players.find(p=>p.id===input.playerId);
  if(!player)throw new AppError('PLAYER_UNAVAILABLE','This player is not on the active roster. Please contact the organizer.',409);
  if(!s.game||s.game.id!==input.gameId)throw new AppError('GAME_CHANGED','The next game has changed. Refresh the page before reserving.',409);
  const ids=await getTableIds();
  if(!ids.Reservations||!ids.WaiverAcceptances)throw new AppError('SHEET_CONFIG','Reservations are being set up. Please try again shortly.');
  let firstFind=true;
  const find=async(key:string)=>{const rows=firstFind?s.reservations:reservationsFrom((await values(['Reservations!A:G']))[0]);firstFind=false;return rows.find(r=>r.id===key||(r.gameId===input.gameId&&r.playerId===input.playerId));};
  const result=await reserveOnce({find,claimOwner:async id=>{
    try{const m=await google<{metadataKey:string;metadataValue:string}>(`/${sheetId()}/developerMetadata/${id}`);return m.metadataKey==='SlowcelonaReservation'?m.metadataValue:'foreign:'+m.metadataKey;}
    catch(error){if(error instanceof SheetsError&&error.status===404)return undefined;throw error;}
  },commit:async(id,key)=>{
    const now=new Date().toISOString();
    const row:Reservation={id:key,gameId:input.gameId,playerId:player.id,name:player.name,reservedAt:now,status:'reserved'};
    await google(`/${sheetId()}:batchUpdate`,'POST',{requests:[
      {createDeveloperMetadata:{developerMetadata:{metadataId:id,metadataKey:'SlowcelonaReservation',metadataValue:key,location:{spreadsheet:true},visibility:'DOCUMENT'}}},
      {appendCells:{sheetId:ids.Reservations,rows:[stringRow([key,input.gameId,player.id,player.name,now,'reserved',''])],fields:'userEnteredValue'}},
      {appendCells:{sheetId:ids.WaiverAcceptances,rows:[stringRow(['w_'+key.slice(2),key,input.gameId,player.id,input.signerName,now,WAIVER.version,WAIVER.textSha256,CONSENT,true])],fields:'userEnteredValue'}}
    ]});return row;
  }},input.gameId,input.playerId);
  cached=undefined;
  return {alreadyReserved:result.alreadyReserved,reservation:{gameId:result.reservation.gameId,playerId:result.reservation.playerId,name:result.reservation.name}};
}

export async function signup(name:string){
 const {nameKey,signupOnce}=await import('./signup');
 const {records,truth}=await import('./model');
 const player=await signupOnce({find:async name=>{
  const rows=records((await values(['Players!A:E']))[0]);
  const matches=rows.filter(r=>nameKey(String(r.name))===nameKey(name));
  if(matches.length>1)throw new AppError('NAME_REVIEW','More than one player has this name. Please contact the organizer.',409);
  if(matches[0]){if(!truth(matches[0].active))throw new AppError('PLAYER_INACTIVE','This name is already registered but inactive. Please contact the organizer.',409);return {id:String(matches[0].player_id),name:String(matches[0].name)};}
 },claimOwner:async id=>{
  try{const m=await google<{metadataKey:string;metadataValue:string}>(`/${sheetId()}/developerMetadata/${id}`);return m.metadataKey==='SlowcelonaSignup'?m.metadataValue:'foreign:'+m.metadataKey;}
  catch(e){if(e instanceof SheetsError&&e.status===404)return undefined;throw e;}
 },commit:async(id,player)=>{
  const ids=await getTableIds();if(!ids.Players)throw new AppError('SHEET_CONFIG','The roster needs an organizer update.');
  // Allocate a blank row atomically; never write into the array-formula columns.
  const {metadataId}=await import('./model');
  const [rows]=await values(['Players!A1:C1000']);
  for(let rowIndex=2;rowIndex<1000;rowIndex++){
   if(rows[rowIndex]?.some(v=>v!==''))continue;
   const slot=metadataId('player-row:'+rowIndex);
   try{
    await google(`/${sheetId()}:batchUpdate`,'POST',{requests:[
     {createDeveloperMetadata:{developerMetadata:{metadataId:id,metadataKey:'SlowcelonaSignup',metadataValue:player.id,location:{spreadsheet:true},visibility:'DOCUMENT'}}},
     {createDeveloperMetadata:{developerMetadata:{metadataId:slot,metadataKey:'SlowcelonaPlayerRow',metadataValue:String(rowIndex),location:{spreadsheet:true},visibility:'DOCUMENT'}}},
     {updateCells:{start:{sheetId:ids.Players,rowIndex,columnIndex:0},rows:[stringRow([player.id,player.name,'pay_per_game'])],fields:'userEnteredValue'}},
     {updateCells:{start:{sheetId:ids.Players,rowIndex,columnIndex:4},rows:[stringRow([true,0,0])],fields:'userEnteredValue'}}
    ]});return;
   }catch(error){
    // Another signup may have claimed this blank row. A failed batch writes nothing.
    try{await google(`/${sheetId()}/developerMetadata/${slot}`);}catch{throw error;}
    const [current]=await values([`Players!A${rowIndex+1}:A${rowIndex+1}`]);
    if(current[0]?.[0]===player.id)return;
   }
  }
  throw new AppError('ROSTER_FULL','The roster needs more space. Please contact the organizer.');
 }},name);
 cached=undefined;return {player};
}
