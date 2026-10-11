import {createHash} from 'node:crypto';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {google,metadata,values,sheetId,stringRow,type Metadata} from '../lib/google';
import {SCHEMA} from '../lib/sheets';
import {WAIVER,WAIVER_TEXT} from '../lib/model';
const ORIGINAL=['Raw Data','Review','Players','Games','Attendance'];
function hash(v:unknown){return createHash('sha256').update(JSON.stringify(v)).digest('hex');}
async function snapshot(meta:Metadata){
  const ranges=meta.sheets.filter(s=>ORIGINAL.includes(s.properties.title)).map(s=>`'${s.properties.title}'`);
  return google(`/${sheetId()}?${ranges.map(r=>'ranges='+encodeURIComponent(r)).join('&')}&fields=sheets(properties(sheetId,title),data(startRow,startColumn,rowData(values(userEnteredValue))))`);
}
async function main(){
 const command=process.argv[2],meta=await metadata();
 if(command==='inspect'){console.log(JSON.stringify({title:meta.properties.title,tabs:meta.sheets.map(s=>s.properties.title)}));return;}
 if(command==='backup'){
   await mkdir('.private',{recursive:true,mode:0o700});
   const baseline=await snapshot(meta);await writeFile('.private/baseline.json',JSON.stringify(baseline),{mode:0o600});
   console.log('Backed up original five tabs including formulas. SHA256: '+hash(baseline));return;
 }
 if(command==='verify'){
   const before=JSON.parse(await readFile('.private/baseline.json','utf8')),after=await snapshot(meta);
   if(hash(before)!==hash(after))throw new Error('Original tabs differ from baseline; inspect before continuing.');
   console.log('Original five tabs match baseline exactly, including formulas.');return;
 }
 if(command!=='setup')throw new Error('Use inspect, backup, setup or verify.');
 const requests:unknown[]=[];const ids:Record<string,number>={};
 for(const [title,headers] of Object.entries(SCHEMA)){
   const existing=meta.sheets.find(s=>s.properties.title===title);
   const id=existing?.properties.sheetId??({Reservations:10271001,WaiverAcceptances:10271002,WaiverVersions:10271003} as Record<string,number>)[title];ids[title]=id;
   if(existing){const [rows]=await values([`'${title}'!1:1`]);if(headers.some((h,i)=>rows[0]?.[i]!==h))throw new Error(title+' headers differ; no changes made.');continue;}
   requests.push({addSheet:{properties:{sheetId:id,title,gridProperties:{rowCount:2000,columnCount:Math.max(headers.length,10),frozenRowCount:1}}}},
    {updateCells:{start:{sheetId:id,rowIndex:0,columnIndex:0},rows:[stringRow(headers)],fields:'userEnteredValue'}},
    {repeatCell:{range:{sheetId:id,startRowIndex:0,endRowIndex:1},cell:{userEnteredFormat:{backgroundColor:{red:0.08,green:0.22,blue:0.16},textFormat:{bold:true,foregroundColor:{red:1,green:1,blue:1}},wrapStrategy:'WRAP'}},fields:'userEnteredFormat'}},
    {updateDimensionProperties:{range:{sheetId:id,dimension:'COLUMNS',startIndex:0,endIndex:headers.length},properties:{pixelSize:180},fields:'pixelSize'}},
    {updateDimensionProperties:{range:{sheetId:id,dimension:'ROWS',startIndex:0,endIndex:1},properties:{pixelSize:44},fields:'pixelSize'}});
 }
 if(requests.length)await google(`/${sheetId()}:batchUpdate`,'POST',{requests});
 const [versions]=await values(['WaiverVersions!A:B']);
 const existing=versions.find(r=>r[0]===WAIVER.version);
 if(existing&&existing[1]!==WAIVER.textSha256)throw new Error('Published waiver version hash differs; never overwrite.');
 if(!existing)await google(`/${sheetId()}:batchUpdate`,'POST',{requests:[{appendCells:{sheetId:ids.WaiverVersions,rows:[stringRow([WAIVER.version,WAIVER.textSha256,WAIVER_TEXT,new Date().toISOString()])],fields:'userEnteredValue'}}]});
 console.log('Reservations, WaiverAcceptances and WaiverVersions ready. Original tabs untouched.');
}
main().catch(e=>{console.error(e instanceof Error?e.message:'Setup failed');process.exitCode=1});
