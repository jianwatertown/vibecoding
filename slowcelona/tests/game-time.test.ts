import test from 'node:test';
import assert from 'node:assert/strict';
import {arrivalTime} from '../lib/game-time';
test('arrival is 30 minutes before kickoff, including noon and midnight',()=>{
 assert.equal(arrivalTime('8–10 PM Pacific'),'7:30 PM Pacific');
 assert.equal(arrivalTime('8:15–10 PM Pacific'),'7:45 PM Pacific');
 assert.equal(arrivalTime('11 AM–1 PM Pacific'),'10:30 AM Pacific');
 assert.equal(arrivalTime('12–2 PM Pacific'),'11:30 AM Pacific');
 assert.equal(arrivalTime('12–2 AM Pacific'),'11:30 PM Pacific (previous day)');
 assert.equal(arrivalTime('TBD'),null);
 assert.equal(arrivalTime(undefined),null);
});
