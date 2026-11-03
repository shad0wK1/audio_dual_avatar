import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const source=await fs.readFile(process.argv[2]||new URL('../static/avatar/avatar-player.js',import.meta.url),'utf8');
const {AvatarPlayer}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
function player(now=1) {
 const p=new AvatarPlayer({canvas:{}});p.gain={};
 p.ctx={currentTime:now,createBufferSource(){return {connect(){},start(when){this.when=when},stop(){}}}};
 return p;
}
function segment(startFrame,frames=24) {
 return {id:startFrame,startFrame,totalFrames:frames,startPtsUs:startFrame/24*1e6,duration:frames/24,
 audioBuffer:{duration:frames/24},receivedFrames:new Set(Array.from({length:frames},(_,i)=>startFrame+i)),startAt:null};
}
{
 const p=player();p.segments=[segment(0),segment(24)];p.epoch=20;
 p.segments[0].startAt=1;p.scheduleCursor=1;p.audioScheduleEnd=2;
 p._scheduleReady();assert.equal(p.segments[1].startAt,2,'video epoch drift must not insert silence between adjacent WAV samples');
}
{
 const p=player(1.8);p.segments=[segment(0),segment(24)];p.segments[0].startAt=1;p.scheduleCursor=1;p.audioScheduleEnd=2;
 p.segments[1].receivedFrames=new Set([24,25]);p._scheduleReady();assert.equal(p.segments[1].startAt,2,'continuation must schedule before the previous source ends with a small video lead');
}
{
 const p=player(2.01);p.segments=[segment(0),segment(24)];p.segments[0].startAt=1;p.scheduleCursor=1;p.audioScheduleEnd=2;
 p._scheduleReady();assert.ok(p.segments[1].startAt<2.03,'late continuation must not add the full answer-start delay');
}
{
 const p=player();p.segments=[segment(0)];p.segments[0].receivedFrames=new Set([0,1]);p._scheduleReady();assert.equal(p.scheduleCursor,0,'new answer must still have its initial video buffer');
 p.segments[0].receivedFrames=new Set(Array.from({length:8},(_,i)=>i));p._scheduleReady();assert.ok(p.segments[0].startAt>=1.18);
}
{
 const p=player();p.segments=[segment(0)];p._responseActive=true;p._dropFromCurrent();assert.equal(p.audioScheduleEnd,0);assert.equal(p._responseActive,false);assert.equal(p.hasPendingSpeech,false,'interrupt must discard queued audio immediately');
}
console.log('5 continuous audio scheduling and interrupt checks passed');
