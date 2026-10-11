import {createHash} from 'node:crypto';
import waiver from '../content/waiver.json';
import {AppError} from './errors';
import type {Grid,Cell} from './google';
export const CONSENT = 'I have read and agree to the Release and Waiver of Liability. I am 18 or older and am signing for myself. I understand that reserving commits me to pay for this game, even if I do not attend.';
export const WAIVER = waiver;
export const WAIVER_TEXT = [waiver.title,...waiver.blocks.map(b=>b.text)].join(' ').replace(/\s+/g,' ').trim();
export type RecordRow = Record<string,Cell>;
export function records(grid:Grid):RecordRow[] {
  const [headers=[],...rows]=grid;
  return rows.filter(r=>r.some(c=>c!=='' && c!==undefined)).map(r=>Object.fromEntries(headers.map((h,i)=>[String(h),r[i]??''])));
}
export function laToday(now=new Date()) { return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).format(now); }
export function dateKey(value:Cell):string {
  if(typeof value==='number' && Number.isFinite(value)) return new Date(Date.UTC(1899,11,30)+Math.floor(value)*86400000).toISOString().slice(0,10);
  const raw=String(value).trim();
  if(!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return '';
  const parsed=new Date(raw+'T12:00:00Z');
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0,10)===raw ? raw : '';
}
export function truth(value:Cell) {return value===true||String(value).toLowerCase()==='true';}
export type Player={id:string;name:string};
export type Game={id:string;date:string;time?:string;location?:string};
export type Reservation={id:string;gameId:string;playerId:string;name:string;status:string;reservedAt:string};
export function playersFrom(grid:Grid):Player[]{
  const rows=records(grid).filter(r=>r.player_id&&r.name&&truth(r.active));
  if(new Set(rows.map(r=>r.player_id)).size!==rows.length) throw new AppError('ROSTER_CONFIG','The roster needs an organizer update. Please try again later.');
  return rows.map(r=>({id:String(r.player_id),name:String(r.name)})).sort((a,b)=>a.name.localeCompare(b.name));
}
export function upcomingGame(grid:Grid,now=new Date()):Game|null {
  const rows=records(grid).filter(r=>r.game_id && dateKey(r.date) && !truth(r.cancelled??false));
  if(new Set(rows.map(r=>r.game_id)).size!==rows.length) throw new AppError('SCHEDULE_CONFIG','The schedule needs an organizer update.');
  const dates=rows.map(r=>({id:String(r.game_id),date:dateKey(r.date),...(r.time?{time:String(r.time)}:{}),...(r.location?{location:String(r.location)}:{})})).filter(g=>g.date>=laToday(now)).sort((a,b)=>a.date.localeCompare(b.date));
  if(dates.length>1 && dates[0].date===dates[1].date) throw new AppError('SCHEDULE_CONFIG','More than one game is scheduled for this date. Please contact the organizer.');
  return dates[0]??null;
}
export function reservationsFrom(grid:Grid):Reservation[] {return records(grid).filter(r=>r.reservation_id&&r.game_id&&r.player_id).map(r=>({id:String(r.reservation_id),gameId:String(r.game_id),playerId:String(r.player_id),name:String(r.player_name),status:String(r.status),reservedAt:String(r.reserved_at)}));}
export function reservationId(gameId:string,playerId:string) {return 'r_'+createHash('sha256').update(JSON.stringify([gameId,playerId])).digest('hex');}
export function metadataId(key:string,attempt=0) {return (createHash('sha256').update(`slowcelona:${key}:${attempt}`).digest().readUInt32BE(0)&0x7fffffff)||1;}
export type ReserveInput={gameId:string;playerId:string;signerName:string;adult:true;waiverAccepted:true;waiverVersion:string;waiverHash:string};
export function validateInput(body:unknown):ReserveInput {
  if(!body||typeof body!=='object') throw new AppError('INVALID_REQUEST','Please choose your name and try again.',400);
  const b=body as Record<string,unknown>;
  for(const field of ['gameId','playerId']) if(typeof b[field]!=='string'||! /^[a-zA-Z0-9_-]{1,100}$/.test(b[field] as string)) throw new AppError('INVALID_REQUEST','Please choose your name and try again.',400);
  if(b.adult!==true) throw new AppError('PARENT_CONSENT_NEEDED','Players under 18 need parent or guardian consent. Please contact the organizer before reserving.',403);
  if(b.waiverAccepted!==true) throw new AppError('CONSENT_REQUIRED','Please read and agree to the waiver before reserving.',400);
  if(b.waiverVersion!==waiver.version||b.waiverHash!==waiver.textSha256) throw new AppError('WAIVER_CHANGED','The waiver has changed. Refresh the page and read the current version.',409);
  if(typeof b.signerName!=='string'||b.signerName.trim().length<2||b.signerName.trim().length>100||/[\x00-\x1f\x7f]/.test(b.signerName)) throw new AppError('NAME_REQUIRED','Enter your full name to sign the waiver.',400);
  return {...b,signerName:b.signerName.trim()} as ReserveInput;
}
export function publicRoster(rows:Reservation[],gameId:string){
  const unique=new Map<string,{playerId:string;name:string}>();
  for(const r of rows) if(r.gameId===gameId&&r.status==='reserved') unique.set(r.playerId,{playerId:r.playerId,name:r.name});
  return [...unique.values()].sort((a,b)=>a.name.localeCompare(b.name));
}
