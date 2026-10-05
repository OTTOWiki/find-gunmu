/* ==========================================================================
   MODULE 1: 诊断与振动管理
   错误上报、FPS 诊断、设备振动。
   （由原单文件 index.html 拆分而来，模块划分沿用原始 MODULE 编号）
   ========================================================================== */

import { $ } from './core.js';
import { STR } from './strings.js';

let diagErr='',fps=0,errCount=0,lastErr='';
let frames=0,fpsT=0;
export function showErr(tag,e){
  var m=(e&&e.message)?e.message:String(e);
  if(m===lastErr){errCount++;}
  else{lastErr=m;errCount=1;diagErr=tag+': '+m;}
  if(window.console)console.error('['+tag+']',e);
}
export function buzz(pattern){
  try{if(navigator.vibrate)navigator.vibrate(pattern);}catch(e){}
}
export function setDiagErr(msg){diagErr=msg;}

export function startFpsClock(now){frames=0;fpsT=now;}

// 由主循环每帧调用：统计 FPS 并刷新左上角诊断信息
export function updateDiagnostics(now,stateName){
  frames++;
  if(now-fpsT>=.5){
    fps=Math.round(frames/(now-fpsT));frames=0;fpsT=now;
    $('diag').textContent=STR.diagDiagPrefix+stateName+' · '+fps+'fps · ∞'+(diagErr?' · ⚠ '+diagErr.slice(0,75)+(errCount>1?' ×'+errCount:''):'');
  }
}
