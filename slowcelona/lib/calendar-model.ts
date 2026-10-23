import {AppError} from './errors';
import {laToday} from './model';
export type CalendarEvent={id?:string;summary?:string;status?:string;start?:{dateTime?:string;date?:string};end?:{dateTime?:string;date?:string};location?:string};
export type CalendarGame={eventId:string;date:string;time:string;location:string};
export function calendarGames(events:CalendarEvent[],today:string):CalendarGame[]{
 const games:CalendarGame[]=[];
 for(const e of events){
  if(e.status==='cancelled'||! /\bslowcelona\b/i.test(e.summary||''))continue;
  if(!e.id||!e.start?.dateTime||!e.end?.dateTime)throw new AppError('CALENDAR_TIME','A Slowcelona event needs a start and end time in the calendar.');
  const start=new Date(e.start.dateTime),end=new Date(e.end.dateTime);
  if(!Number.isFinite(+start)||!Number.isFinite(+end)||end<=start)throw new AppError('CALENDAR_TIME','A Slowcelona event has an invalid time.');
  const date=laToday(start);if(date<today)continue;
  if(laToday(end)!==date)throw new AppError('CALENDAR_TIME','An overnight game needs an organizer schedule review.');
  const fmt=new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',hour:'numeric',minute:'2-digit',hour12:true});
  const clock=(d:Date)=>fmt.format(d).replace(':00','');
  games.push({eventId:e.id,date,time:`${clock(start)}–${clock(end)} Pacific`,location:e.location?.trim()||''});
 }
 if(new Set(games.map(g=>g.date)).size!==games.length)throw new AppError('CALENDAR_AMBIGUOUS','More than one Slowcelona game is on the same date. Please ask the organizer to review the calendar.');
 return games.sort((a,b)=>a.date.localeCompare(b.date));
}
