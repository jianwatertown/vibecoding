import {arrivalTime} from './game-time';
type Game={date:string;time?:string;location?:string};
function chineseClock(value:string){return value.replace(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/gi,(_,h,m,p)=>`${Number(h)%12+(p.toUpperCase()==='PM'?12:0)}:${m||'00'}`).replace(/Pacific/gi,'（西雅图时间）').replace('(previous day)','（前一天）');}
export function wechatAnnouncement(game:Game){
 const date=new Intl.DateTimeFormat('zh-CN',{timeZone:'UTC',year:'numeric',month:'long',day:'numeric',weekday:'long'}).format(new Date(game.date+'T12:00:00Z'));
 const arrival=arrivalTime(game.time);
 // Fill an omitted AM/PM on the range's first time before converting both endpoints.
 const range=game.time?.replace(/^(\d{1,2}(?::\d{2})?)\s*([–—-])\s*(\d{1,2}(?::\d{2})?)\s*(AM|PM)/i,'$1 $4–$3 $4');
 return [
 'Slowcelona 本周踢球通知',
 '',
 `时间：${date}${arrival?' '+chineseClock(arrival)+'集合':''}`,
 `地点：${game.location||'待确认'}`,
 `场地预订时间：${range?chineseClock(range):'待确认'}`,
 '',
 arrival?'请提前30分钟到场热身，带好红、蓝球衣。':'请带好红、蓝球衣；集合时间待确认。',
 '参加请先登记并阅读、同意免责声明。预订后即计入本场费用，未到场也计费。',
 '',
 '报名链接：https://www.slowcelona.com'
 ].join('\n');
}
