import assert from 'node:assert/strict';
import {google,values,sheetId,metadata} from '../lib/google';
import {records,dateKey} from '../lib/model';
async function main(){const meta=await metadata(),id=meta.sheets.find(s=>s.properties.title==='Season Summary')!.properties.sheetId;
const query=new URLSearchParams({valueRenderOption:'FORMULA',ranges:'Season Summary!C9:C1008'});
const formulas=await google<{valueRanges:{values:string[][]}[]}>(`/${sheetId()}/values:batchGet?${query}`);
await google(`/${sheetId()}:batchUpdate`,'POST',{requests:[{updateCells:{start:{sheetId:id,rowIndex:8,columnIndex:2},rows:formulas.valueRanges[0].values.map(r=>({values:[{userEnteredValue:{formulaValue:r[0].replace('COUNTA(FILTER','ROWS(FILTER')}}]})),fields:'userEnteredValue'}}]});
const [a,r,g,p,s]=await values(['Attendance!A:E','Reservations!A:G','Games!A:B','Players!A:E','Season Summary!A9:D1008']);
const dates=new Map(records(g).map(r=>[r.game_id,dateKey(r.date)]));const keys=new Map<string,Set<string>>();
for(const row of [...records(a).map(r=>({game:r.game_id,player:r.player_id,status:'reserved'})),...records(r).map(r=>({game:r.game_id,player:r.player_id,status:r.status}))]){const date=dates.get(row.game);if(row.status!=='reserved'||!date||date<'2026-01-01'||date>'2026-12-31')continue;const key=String(row.player);if(!keys.has(key))keys.set(key,new Set());keys.get(key)!.add(String(row.game));}
for(const row of s.filter(r=>r[0]))assert.equal(row[2],keys.get(String(row[0]))?.size??0,`Count mismatch for player ID ${row[0]}`);
assert.equal(s.filter(r=>r[0]).length,records(p).filter(r=>r.player_id).length);console.log('PASS: every Season Summary count matches an independent deduplicated tally.');}
main().catch(e=>{console.error(e.message);process.exitCode=1});
