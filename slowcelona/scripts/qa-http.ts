import assert from 'node:assert/strict';
import {WAIVER} from '../lib/model';
async function main(){const state=await(await fetch('http://127.0.0.1:3001/api/state')).json();assert.deepEqual(Object.keys(state).sort(),['game','players','reservations','waiver']);assert.equal(state.players[0].name,'Test Alex');
const body={gameId:state.game.id,playerId:'qa001',signerName:'SYNTHETIC UI TEST — not a legal signature',adult:true,waiverAccepted:true,waiverVersion:WAIVER.version,waiverHash:WAIVER.textSha256};
const post=(data:unknown)=>fetch('http://127.0.0.1:3001/api/reserve',{method:'POST',headers:{'Content-Type':'application/json',Origin:'http://127.0.0.1:3001'},body:JSON.stringify(data)});
assert.equal((await post({...body,adult:false})).status,403);assert.equal((await post({...body,waiverAccepted:false})).status,400);assert.equal((await post({...body,gameId:'wrong_game'})).status,409);assert.equal((await post({...body,playerId:'invalid_player'})).status,409);
const response=await post(body);assert.equal(response.status,200);const retry=await(await post(body)).json();assert.equal(retry.alreadyReserved,true);console.log('PASS: HTTP validation, adult reservation, duplicate retry and public response privacy.');}
main().catch(e=>{console.error(e.message);process.exitCode=1});
