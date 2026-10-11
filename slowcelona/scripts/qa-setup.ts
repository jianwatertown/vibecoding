import {google,metadata,stringRow,sheetId} from '../lib/google';
import {laToday} from '../lib/model';
async function main(){
 if(sheetId()!=='1aSEDQDawfABWkpOHnW5FU2p5xwBFmTpbND8z-fUIW2E')throw new Error('QA sheet only.');
 const m=await metadata();if(m.sheets.some(s=>s.properties.title==='Players')){console.log('QA already set up');return;}
 await google(`/${sheetId()}:batchUpdate`,'POST',{requests:[
 {addSheet:{properties:{sheetId:101,title:'Players'}}},{addSheet:{properties:{sheetId:102,title:'Games'}}},{addSheet:{properties:{sheetId:103,title:'Attendance'}}},
 {updateCells:{start:{sheetId:101,rowIndex:0,columnIndex:0},rows:[stringRow(['player_id','name','payment_type','credit_balance','active']),stringRow(['qa001','Test Alex','prepaid',500,true]),stringRow(['qa002','Test Wei','pay_per_game',0,true]),stringRow(['qa003','Test Minor','pay_per_game',0,true])],fields:'userEnteredValue'}},
 {updateCells:{start:{sheetId:102,rowIndex:0,columnIndex:0},rows:[stringRow(['game_id','date','price','active']),stringRow(['qa_game',laToday(),'',false])],fields:'userEnteredValue'}},
 {updateCells:{start:{sheetId:103,rowIndex:0,columnIndex:0},rows:[stringRow(['game_id','player_id','name','checked_in_at','price'])],fields:'userEnteredValue'}}]});console.log('Synthetic QA roster ready.');}
main().catch(e=>{console.error(e.message);process.exitCode=1});
