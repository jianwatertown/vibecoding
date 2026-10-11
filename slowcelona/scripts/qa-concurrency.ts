import assert from 'node:assert/strict';
import {google,values,sheetId} from '../lib/google';
import {reserve} from '../lib/sheets';
import {validateInput,WAIVER} from '../lib/model';
async function main(){if(sheetId()!=='1aSEDQDawfABWkpOHnW5FU2p5xwBFmTpbND8z-fUIW2E')throw new Error('QA sheet only');
const payload=validateInput({gameId:'qa_game',playerId:process.env.QA_PLAYER_ID||'qa002',signerName:'SYNTHETIC TEST — not a legal signature',adult:true,waiverAccepted:true,waiverVersion:WAIVER.version,waiverHash:WAIVER.textSha256});
const result=await Promise.all([reserve(payload),reserve(payload)]);
const [r,w]=await values(['Reservations!A:G','WaiverAcceptances!A:J']);
assert.equal(r.filter(x=>x[2]===payload.playerId).length,1);assert.equal(w.filter(x=>x[3]===payload.playerId).length,1);
assert.equal(new Set(result.map(x=>x.reservation.playerId)).size,1);
console.log('PASS: concurrent real Google API writes produced exactly one reservation and one matching waiver record.');
// Prove whole-batch atomicity on an invalid trailing request; no orphan claim remains.
const id=202610111;try{await google(`/${sheetId()}:batchUpdate`,'POST',{requests:[{createDeveloperMetadata:{developerMetadata:{metadataId:id,metadataKey:'QAAtomicity',metadataValue:'test',location:{spreadsheet:true},visibility:'DOCUMENT'}}},{appendCells:{sheetId:-999,rows:[],fields:'userEnteredValue'}}]});throw new Error('Invalid batch unexpectedly succeeded');}catch(e){if(!(e instanceof Error)||!e.message.includes('400'))throw e;}
await assert.rejects(google(`/${sheetId()}/developerMetadata/${id}`),/404/);console.log('PASS: invalid Google batch rolled back its metadata claim.');}
main().catch(e=>{console.error(e.message);process.exitCode=1});
