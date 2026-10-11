import test from 'node:test';
import assert from 'node:assert/strict';
import {wechatAnnouncement} from '../lib/wechat';
test('WeChat notice follows game date, 30-minute arrival, booking and location',()=>{
 const t=wechatAnnouncement({date:'2026-10-11',time:'8–10 PM Pacific',location:'Robinswood Soccer 1 East'});
 assert.match(t,/2026年10月11日星期日 19:30/);assert.match(t,/20:00–22:00/);assert.match(t,/地点：Robinswood Soccer 1 East/);assert.match(t,/https:\/\/www.slowcelona.com/);assert.doesNotMatch(t,/已经空/);
 assert.match(wechatAnnouncement({date:'2026-10-18',time:'11 AM–1 PM Pacific'}),/10:30/);
 assert.match(wechatAnnouncement({date:'2026-10-18'}),/时间待确认/);
});
