import {accessToken,google,metadata,values,sheetId,stringRow,type Grid} from './google';
import {AppError} from './errors';
import {calendarGames,type CalendarEvent,type CalendarGame} from './calendar-model';
import {laToday,records,metadataId} from './model';
let nextRead=0,inFlight:Promise<void>|undefined;
export async function fetchCalendarGames(now=new Date()):Promise<CalendarGame[]>{
 const id=process.env.GOOGLE_CALENDAR_ID;if(!id)throw new AppError('CALENDAR_CONFIG','Calendar sync needs organizer setup.');
 const token=await accessToken('https://www.googleapis.com/auth/calendar.events.readonly');
 const start=new Date(now.getTime()-86400000).toISOString(),end=new Date(now.getTime()+180*86400000).toISOString();
 const events:CalendarEvent[]=[];let page='';
 for(let i=0;i<20;i++){
  const query=new URLSearchParams({timeMin:start,timeMax:end,singleEvents:'true',showDeleted:'false',q:'slowcelona',maxResults:'250',fields:'items(id,summary,status,start,end,location),nextPageToken'});if(page)query.set('pageToken',page);
  const r=await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(id)}/events?${query}`,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(12000),cache:'no-store'});
  if(!r.ok)throw new AppError('CALENDAR_UNAVAILABLE','The game calendar couldn’t be refreshed. Please try again shortly.');
  const data=await r.json();events.push(...(data.items||[]));page=data.nextPageToken||'';
  if(!page)return calendarGames(events,laToday(now));
 }
 throw new AppError('CALENDAR_TOO_LARGE','The calendar needs an organizer review.');
}
async function readGames(){return (await values(['Games!A1:Q2000']))[0]}
async function sync(){
 const now=new Date(),today=laToday(now),horizon=laToday(new Date(now.getTime()+179*86400000)),events=await fetchCalendarGames(now);
 const meta=await metadata(),tab=meta.sheets.find(s=>s.properties.title==='Games');
 if(!tab||tab.properties.gridProperties.columnCount<17)throw new AppError('CALENDAR_CONFIG','Calendar sync needs organizer setup.');
 let grid=await readGames();
 if(grid[0]?.[14]!=='cancelled'||grid[0]?.[15]!=='calendar_event_id'||grid[0]?.[16]!=='calendar_synced_at')throw new AppError('CALENDAR_CONFIG','Calendar columns need organizer setup.');
 // New dates are created once across server instances; old rows and reservation IDs survive moves.
 for(const e of events){
  const rows=records(grid);if(rows.some(r=>r.calendar_event_id===e.eventId)||rows.some(r=>r.date===e.date&&!r.calendar_event_id))continue;
  const id=metadataId('calendar-game:'+e.eventId),gameId='gcal_'+e.eventId.replace(/[^a-zA-Z0-9_-]/g,'_');
  try{await google(`/${sheetId()}:batchUpdate`,'POST',{requests:[{createDeveloperMetadata:{developerMetadata:{metadataId:id,metadataKey:'SlowcelonaCalendarGame',metadataValue:e.eventId,location:{spreadsheet:true},visibility:'DOCUMENT'}}},{appendCells:{sheetId:tab.properties.sheetId,rows:[stringRow([gameId,e.date,'',false,'','','','','','','','',e.time,e.location,false,e.eventId,now.toISOString()])],fields:'userEnteredValue'}}]});}
  catch(error){const claim=await google<{metadataKey:string;metadataValue:string}>(`/${sheetId()}/developerMetadata/${id}`).catch(()=>null);if(claim?.metadataKey!=='SlowcelonaCalendarGame'||claim.metadataValue!==e.eventId)throw error;}
  grid=await readGames();
 }
 const changes:{range:string;values:(string|boolean)[][]}[]=[];
 const claimed=new Set<number>();
 for(const e of events){
  let index=grid.findIndex((r,i)=>i>0&&r[15]===e.eventId);
  if(index<0)index=grid.findIndex((r,i)=>i>0&&r[1]===e.date&&!r[15]&&!claimed.has(i));
  if(index<1)throw new AppError('CALENDAR_REVIEW','A game needs organizer review before reservations can continue.');
  claimed.add(index);
  changes.push({range:`Games!B${index+1}`,values:[[e.date]]},{range:`Games!M${index+1}:Q${index+1}`,values:[[e.time,e.location,false,e.eventId,now.toISOString()]]});
 }
 for(let i=1;i<grid.length;i++){
  if(grid[i][15]&&String(grid[i][1])>=today&&String(grid[i][1])<=horizon&&!claimed.has(i))changes.push({range:`Games!O${i+1}`,values:[[true]]},{range:`Games!Q${i+1}`,values:[[now.toISOString()]]});
 }
 if(changes.length)await google(`/${sheetId()}/values:batchUpdate`,'POST',{valueInputOption:'RAW',data:changes});
}
export async function syncCalendar(force=false){
 if(!process.env.GOOGLE_CALENDAR_ID)return;
 if(inFlight)return inFlight;
 if(!force&&Date.now()<nextRead)return;
 inFlight=sync().then(()=>{nextRead=Date.now()+300000});
 try{await inFlight}finally{inFlight=undefined}
}
export function confirmedCalendarRows(grid:Grid):Grid{return process.env.GOOGLE_CALENDAR_ID?[grid[0],...grid.slice(1).filter(r=>Boolean(r[15]))]:grid;}
