/* ==========================================================================
   MODULE 14: 背景音乐（BGM）
   音频由 assets 预加载（<audio> 元素流式播放，省内存），开局的手势里播放，
   循环播放；跟随主菜单的「声音」开关静音，不额外占用一次用户手势。
   ========================================================================== */

import { assets } from './assets.js';
import { isMuted } from './audio.js';

const VOLUME=.42;      // BGM 压低，避免盖过音效
let el=null,wantPlay=false;

export function initBgm(){
  if(el||!assets.bgm)return false;
  el=assets.bgm;
  el.loop=true;
  el.volume=VOLUME;
  el.muted=isMuted();
  return true;
}

// 由开局按钮（用户手势）调用，满足浏览器自动播放策略
export function startBgm(){
  if(!el)return;
  wantPlay=true;
  el.muted=isMuted();
  play();
}
// 音效/声音开关切换后同步（开启时若从未成功播放过则补一次播放）
export function refreshBgmMute(){
  if(!el)return;
  el.muted=isMuted();
  if(!el.muted&&wantPlay&&el.paused)play();
}
// 回到主菜单时暂停（下次开局在同一位置继续）
export function stopBgm(){
  if(!el)return;
  wantPlay=false;
  try{el.pause();}catch(e){}
}

function play(){
  try{
    var p=el.play();
    if(p&&p.catch)p.catch(function(){});   // 被自动播放策略拒绝时静默等待下一次手势
  }catch(e){}
}
