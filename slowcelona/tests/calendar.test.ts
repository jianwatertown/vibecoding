import test from 'node:test';
import assert from 'node:assert/strict';
import {calendarGames} from '../lib/calendar-model';
import {arrivalTime} from '../lib/game-time';
import {wechatAnnouncement} from '../lib/wechat';
const event={id:'one',summary:'slowcelona',status:'confirmed',start:{dateTime:'2026-10-25T18:00:00-07:00'},end:{dateTime:'2026-10-25T20:00:00-07:00'},location:'Robinswood Soccer 1 East'};
test('calendar times flow through arrival and Chinese notice',()=>{
 const [g]=calendarGames([event],'2026-10-23');assert.equal(g.time,'6 PM–8 PM Pacific');assert.equal(arrivalTime(g.time),'5:30 PM Pacific');assert.match(wechatAnnouncement(g),/17:30/);assert.match(wechatAnnouncement(g),/18:00–20:00/);
});
test('only upcoming titled Slowcelona events are used, cancelled events disappear',()=>{
 assert.deepEqual(calendarGames([{...event,status:'cancelled'},{...event,summary:'Private appointment'},event],'2026-10-26'),[]);
 assert.equal(calendarGames([event,{...event,id:'private',summary:'Private appointment'}],'2026-10-23').length,1);
});
test('Seattle timezone handles UTC dates and daylight saving changes',()=>{
 const [g]=calendarGames([{...event,start:{dateTime:'2026-11-02T02:00:00Z'},end:{dateTime:'2026-11-02T04:00:00Z'}}],'2026-10-23');assert.equal(g.date,'2026-11-01');assert.equal(g.time,'6 PM–8 PM Pacific');
});
test('ambiguous or unspecified calendar times fail instead of fabricating a schedule',()=>{
 assert.throws(()=>calendarGames([event,{...event,id:'other'}],'2026-10-23'));
 assert.throws(()=>calendarGames([{...event,start:{date:'2026-10-25'}}],'2026-10-23'));
});
