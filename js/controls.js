/* ==========================================================================
   MODULE 10: 摇杆与控制
   触屏摇杆 / 转向、技能按钮、键鼠输入与全屏。
   （由原单文件 index.html 拆分而来，模块划分沿用原始 MODULE 编号）
   ========================================================================== */

import { $, isTouch } from './core.js';
import { STR } from './strings.js';
import { initAudio, setMuted, isMuted } from './audio.js';
import { renderer } from './render.js';
import { state, p, doDash, eatNut, bufferJump } from './physics.js';
import { throwBox, startRun, gotoMenu } from './entities.js';
import { isReady } from './assets.js';
import { startBgm, refreshBgmMute, stopBgm } from './bgm.js';

export const keys={};
export let touchJump=false;
let lookDX=0,lookDY=0;

const joyVector={x:0,y:0};
export function getJoyInput(){return joyVector;}

// 开局 / 退出时清空残留输入，避免长按的按键或未归零的摇杆带进下一局
function resetInput(){
  for(var k in keys)keys[k]=false;
  touchJump=false;joyVector.x=0;joyVector.y=0;lookDX=0;lookDY=0;
}
function refreshSoundBtn(){
  var b=$('btn-sound');
  if(b)b.textContent=isMuted()?STR.soundOff:STR.soundOn;
}

export function initControls(){
  if(window.nipplejs){
    var manager=nipplejs.create({
      zone:$('joy-zone'),mode:'dynamic',color:'#d8b5ff',size:110,threshold:0.1,fadeTime:200
    });
    manager.on('move',function(evt,data){
      if(data&&data.vector){
        joyVector.x=data.vector.x;
        joyVector.y=data.vector.y;
      }
    });
    manager.on('end',function(){
      joyVector.x=0;joyVector.y=0;
    });
  }else{
    var lkZone=$('joy-zone');
    var jTouchId=null,jStartX=0,jStartY=0;
    lkZone.addEventListener('pointerdown',function(e){
      if(jTouchId===null){jTouchId=e.pointerId;jStartX=e.clientX;jStartY=e.clientY;}
    });
    window.addEventListener('pointermove',function(e){
      if(e.pointerId===jTouchId){
        var dx=(e.clientX-jStartX)/50,dy=(e.clientY-jStartY)/50;
        var d=Math.hypot(dx,dy);if(d>1){dx/=d;dy/=d;}
        joyVector.x=dx;joyVector.y=-dy;
      }
    });
    function endJ(e){if(e.pointerId===jTouchId){jTouchId=null;joyVector.x=0;joyVector.y=0;}}
    window.addEventListener('pointerup',endJ);
    window.addEventListener('pointercancel',endJ);
  }

  var lookZone=$('look-zone'),lookId=null,lastLX=0,lastLY=0;
  lookZone.addEventListener('pointerdown',function(e){
    if(lookId===null){lookId=e.pointerId;lastLX=e.clientX;lastLY=e.clientY;}
  });
  window.addEventListener('pointermove',function(e){
    if(e.pointerId===lookId){
      lookDX+=e.clientX-lastLX;lookDY+=e.clientY-lastLY;
      lastLX=e.clientX;lastLY=e.clientY;
    }
  });
  function endL(e){if(e.pointerId===lookId){lookId=null;}}
  window.addEventListener('pointerup',endL);
  window.addEventListener('pointercancel',endL);

  $('sk-box').addEventListener('pointerdown',function(e){e.preventDefault();e.stopPropagation();throwBox();},{passive:false});
  $('sk-nut').addEventListener('pointerdown',function(e){e.preventDefault();e.stopPropagation();eatNut();},{passive:false});
  $('sk-dash').addEventListener('pointerdown',function(e){e.preventDefault();e.stopPropagation();doDash();},{passive:false});
  var skJump=$('sk-jump');
  skJump.addEventListener('pointerdown',function(e){
    e.preventDefault();e.stopPropagation();touchJump=true;bufferJump(0.15);
  },{passive:false});
  skJump.addEventListener('pointerup',function(){touchJump=false;});
  skJump.addEventListener('pointercancel',function(){touchJump=false;});

  window.addEventListener('keydown',function(e){
    keys[e.code]=true;
    if(e.code==='KeyQ')doDash();
    if(e.code==='Space'){e.preventDefault();bufferJump(0.15);}
    // Esc 返回主菜单；指针锁定时先交给浏览器解锁，避免一次按下双重动作
    if(e.code==='Escape'&&state==='playing'&&!document.pointerLockElement){resetInput();stopBgm();gotoMenu();}
  });
  window.addEventListener('keyup',function(e){keys[e.code]=false;});

  var md=false,mxx=0,myy=0,moved=0;
  renderer.domElement.addEventListener('mousedown',function(e){
    if(state!=='playing'||isTouch)return;
    if(e.button===2){eatNut();return;}
    if(e.button!==0)return;
    if(document.pointerLockElement===renderer.domElement){throwBox();return;}
    try{renderer.domElement.requestPointerLock&&renderer.domElement.requestPointerLock();}catch(err){}
    md=true;mxx=e.clientX;myy=e.clientY;moved=0;
  });
  window.addEventListener('mousemove',function(e){
    if(state!=='playing')return;
    if(document.pointerLockElement===renderer.domElement){
      p.yaw+=e.movementX*.0024;
      p.pitch=THREE.MathUtils.clamp(p.pitch-e.movementY*.002,-.55,1.1);
      return;
    }
    if(md){
      var dx=e.clientX-mxx,dy=e.clientY-myy;mxx=e.clientX;myy=e.clientY;
      moved+=Math.abs(dx)+Math.abs(dy);
      p.yaw+=dx*.004;
      p.pitch=THREE.MathUtils.clamp(p.pitch-dy*.003,-.55,1.1);
    }
  });
  window.addEventListener('mouseup',function(e){
    if(e.button===0&&md){md=false;if(moved<8&&document.pointerLockElement!==renderer.domElement)throwBox();}
  });
  document.addEventListener('contextmenu',function(e){e.preventDefault();});

  // 主菜单：两个模式按钮（不再「点任意处开始」）；素材未加载完不可开局
  $('btn-mode-normal').addEventListener('click',function(){
    if(state!=='start'||!isReady())return;resetInput();initAudio();startBgm();startRun('normal');
  });
  $('btn-mode-practice').addEventListener('click',function(){
    if(state!=='start'||!isReady())return;resetInput();initAudio();startBgm();startRun('practice');
  });
  $('btn-sound').addEventListener('click',function(){setMuted(!isMuted());refreshSoundBtn();refreshBgmMute();});
  $('btn-retry').addEventListener('click',function(){
    if(state!=='lost')return;resetInput();initAudio();startBgm();startRun('normal');
  });
  $('btn-menu').addEventListener('click',function(){
    if(state!=='lost')return;resetInput();stopBgm();gotoMenu();
  });
  // 游戏中退出（飞门过场期间不开放，避免与过场回调打架）
  $('btn-exit').addEventListener('click',function(){
    if(state!=='playing')return;resetInput();stopBgm();gotoMenu();
  });
  refreshSoundBtn();
  setTimeout(function(){var b=$('blank');if(b)b.textContent=STR.blankFound;},900);
  $('btn-fs').addEventListener('click',function(){
    var el=document.documentElement;
    if(document.fullscreenElement){document.exitFullscreen&&document.exitFullscreen();return;}
    var fn=el.requestFullscreen||el.webkitRequestFullscreen;if(fn)fn.call(el);
  });
}

// 触屏滑动转向：由 visuals 每帧消费累积的位移
export function applyLookToPlayer(){
  if(state==='playing'){
    p.yaw+=lookDX*.0062;
    p.pitch=THREE.MathUtils.clamp(p.pitch-lookDY*.0045,-.55,1.1);
  }
  lookDX=0;lookDY=0;
}
