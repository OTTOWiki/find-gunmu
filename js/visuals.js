/* ==========================================================================
   MODULE 11: 视觉循环
   相机运动、HUD、主更新与渲染循环。
   （由原单文件 index.html 拆分而来，模块划分沿用原始 MODULE 编号）
   ========================================================================== */

import { $, isTouch } from './core.js';
import { STR } from './strings.js';
import { showErr, updateDiagnostics, startFpsClock } from './diag.js';
import { camera, applyLighting, WALL_H } from './render.js';
import { renderFrame, setMotionBlur, gradeUniforms } from './post.js';
import { stepParticles } from './particles.js';
import { posePlayer } from './player.js';
import { rebuildChunks, scrollWorldTo, setCeilingFlicker, syncSprites, cell } from './maze.js';
import { physics, p, state, nutT, nutCD, dashT, dashCD, camDip, fovKick, trauma, hurtV, impactV, decayTrauma, decayCamDip, decayFovKick, decayImpact, decayHurt } from './physics.js';
import { entities, level, goal, time, items, enemies, projs, boxCD, tickClock, practice, gpm, wapm } from './entities.js';
import { applyLookToPlayer } from './controls.js';
import { updateAudio } from './audio.js';

let camRoll=0,fovCur=74,camDist=5.5;
const CAM_MAX=6.5,CAM_MIN=1.0;
let bobT=0,prevYaw=0,yawVelS=0;
let speedU=0,boostV=0,last=0,toastShown=false;

export function visuals(dt,now){
  applyLookToPlayer();

  rebuildChunks(false);
  scrollWorldTo(p.x,p.z);

  var hx=p.x,hy=p.y+1.45,hz=p.z;
  var cp=Math.cos(p.pitch),sp=Math.sin(p.pitch);
  var fx=Math.cos(p.yaw)*cp,fy=sp,fz=Math.sin(p.yaw)*cp;
  var want=CAM_MAX;
  for(var t=.4;t<want;t+=.2){
    var qx=hx-fx*t,qy=hy-fy*t,qz=hz-fz*t;
    if(cell(qx,qz)===1||qy<.3||qy>WALL_H-.25){want=Math.max(CAM_MIN,t-.2);break;}
  }
  camDist+=(want-camDist)*Math.min(1,dt*10);

  decayTrauma(dt);
  var shakeMag=trauma*trauma*0.35;
  var shakeX=(Math.random()-.5)*shakeMag;
  var shakeY=(Math.random()-.5)*shakeMag;
  var shakeRot=(Math.random()-.5)*shakeMag*.15;

  decayCamDip(dt);

  var hs=Math.hypot(p.vx,p.vz);
  bobT+=dt*((p.grounded?2.4:1.2)+hs*(p.grounded?1.3:.35));
  var amp=p.grounded?Math.min(.06,.006+hs*.0055):Math.min(.024,.004+hs*.0018);
  var swx=Math.sin(bobT)*amp*.65,swy=Math.abs(Math.cos(bobT))*amp;
  var br=Math.sin(now*1.7)*.009*(hs<.6?1:.35);
  var fhl=Math.max(.001,Math.hypot(fx,fz)),rx=-fz/fhl,rz=fx/fhl;

  var cy=hy-fy*camDist+shakeY-camDip+swy+br;
  cy=Math.max(.35,Math.min(WALL_H-.3,cy));
  camera.position.set(hx-fx*camDist+shakeX+rx*swx,cy,hz-fz*camDist+rz*swx);
  camera.lookAt(hx+fx*.6+rx*swx*.25,hy+fy*.6+(swy+br)*.3,hz+fz*.6+rz*swx*.25);

  var flick=applyLighting(dt,hx,hy,hz,fx,fy,fz);
  setCeilingFlicker(flick);

  decayFovKick(dt);
  var fovT=74+Math.min(24,hs*1.2)+(dashT>0?10:0)+(nutT>0?5:0)+fovKick;
  fovCur+=(fovT-fovCur)*Math.min(1,dt*6.5);
  camera.fov=fovCur;camera.updateProjectionMatrix();

  var side=p.vx*rx+p.vz*rz;
  var bobRoll=Math.sin(bobT)*.014*Math.min(1,hs/6);
  camRoll+=(THREE.MathUtils.clamp(-side*.01,-.07,.07)-camRoll)*Math.min(1,dt*8.5);
  camera.rotateZ(camRoll+bobRoll+shakeRot);

  posePlayer(dt,hs,side,camDip,fx,fz);

  syncSprites(items,enemies,projs,now,dt);
  stepParticles(dt);

  var rawYaw=(p.yaw-prevYaw)/Math.max(dt,1e-4);prevYaw=p.yaw;
  yawVelS+=(rawYaw-yawVelS)*Math.min(1,dt*8.5);
  var mb=0;
  mb+=THREE.MathUtils.clamp((hs-6)/24,0,.58);
  mb+=THREE.MathUtils.clamp(Math.abs(yawVelS)*.38,0,.48);
  if(dashT>0)mb+=.28;
  mb=Math.min(mb,.68);
  setMotionBlur(mb,hs,yawVelS,dashT>0);

  speedU+=(hs-speedU)*Math.min(1,dt*5.5);
  decayImpact(dt);
  gradeUniforms.uTime.value=now;gradeUniforms.uSpeed.value=speedU;gradeUniforms.uHurt.value=hurtV;gradeUniforms.uBoost.value=boostV;gradeUniforms.uImpact.value=impactV;
}

const hLevel=$('h-level'),hGoal=$('h-goal'),hTime=$('h-time'),hSpd=$('h-spd'),hGpm=$('h-gpm'),hWapm=$('h-wapm');
function fmt(t){var ts=Math.ceil(Math.max(0,t));return String(ts/60|0).padStart(2,'0')+':'+String(ts%60).padStart(2,'0');}
function setCd(el,frac){if(el)el.style.background=frac>0?'conic-gradient(rgba(0,0,0,.7) '+(frac*100)+'%,transparent 0)':'none';}
const cdBox=document.querySelector('#sk-box .cd'),cdNut=document.querySelector('#sk-nut .cd'),cdDash=document.querySelector('#sk-dash .cd');
const pb=$('pill-box'),pn=$('pill-nut'),pd=$('pill-dash');

function hud(){
  hLevel.textContent=level;
  var nd=1e9;
  for(var i=0;i<items.length;i++){
    if(items[i].taken)continue;
    var d=Math.hypot(p.x-items[i].x,p.z-items[i].y);
    if(d<nd)nd=d;
  }
  hGoal.textContent=goal+'/5'+(nd<1e8?' · '+Math.round(nd)+STR.hudMeterUnit:'');
  hTime.textContent=practice?STR.hudTimeUnlimited:fmt(time);
  hTime.classList.toggle('low',!practice&&time<15);
  hGpm.textContent=STR.hudGpmLabel+' '+gpm;hWapm.textContent=STR.hudWapmLabel+' '+wapm;
  hSpd.textContent=Math.hypot(p.vx,p.vz).toFixed(1)+STR.hudSpeedUnit+Math.round(p.x)+','+Math.round(p.z);
  setCd(cdBox,boxCD/.45);setCd(cdNut,nutCD/8);setCd(cdDash,dashCD/5);
  if(pb){
    pb.textContent=(boxCD>0?STR.pillBoxCd(boxCD.toFixed(1)):STR.pillBoxReady);
    pn.textContent=(nutT>0?STR.pillNutActive:nutCD>0?STR.pillNutCd(nutCD.toFixed(1)):STR.pillNutReady);
    pn.className='cd-pill '+(nutT>0?'act':'ready');
    pd.textContent=(dashT>0?STR.pillDashActive:dashCD>0?STR.pillDashCd(dashCD.toFixed(1)):STR.pillDashReady);
    pd.className='cd-pill '+(dashT>0?'act':'ready');
  }
}

export function update(dt,now){
  if(window.TWEEN)TWEEN.update();
  tickClock(dt);
  hud();
  if(state==='playing'){
    try{physics(dt);entities(dt);}catch(e){showErr(STR.errTagPhysics,e);}
    if(!toastShown&&isTouch){toastShown=true;var tt=$('toast');tt.classList.add('show');setTimeout(function(){tt.classList.remove('show');},4200);}

    updateAudio(Math.hypot(p.vx,p.vz),dashT>0,yawVelS,time);
    decayHurt(dt);
    boostV+=((nutT>0?1:0)-boostV)*Math.min(1,dt*4);
    gradeUniforms.uVig.value=.5+(time<15?.25+.16*Math.sin(now*7):0);
  }
  try{visuals(dt,now);}catch(e){showErr(STR.errTagRender,e);}
}

function loop(t){
  requestAnimationFrame(loop);
  var now=t/1000;var dt=Math.min(.05,now-last||.016);last=now;
  try{update(dt,now);}catch(e){showErr(STR.errTagFrame,e);}
  renderFrame();
  updateDiagnostics(now,state);
}

export function startLoop(){
  requestAnimationFrame(function(t){last=t/1000;startFpsClock(last);requestAnimationFrame(loop);});
}
