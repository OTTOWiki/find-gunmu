/* ==========================================================================
   MODULE 8: 物理引擎
   移动、碰撞、跳跃/连跳、冲刺与槟榔加速，以及相机震动等状态。
   （由原单文件 index.html 拆分而来，模块划分沿用原始 MODULE 编号）
   ========================================================================== */

import { STR } from './strings.js';
import { buzz } from './diag.js';
import { playSubBass, playHeavyImpact, playStep, playLand, playDashSFX, playNutSFX } from './audio.js';
import { puff } from './particles.js';
import { cell } from './maze.js';
import { TILE } from './render.js';
import { keys, touchJump, getJoyInput } from './controls.js';
import { msg } from './entities.js';

export let state='start';
export let camDip=0,fovKick=0,hurtV=0,impactV=0;
export let nutCD=0,dashCD=0,nutT=0,dashT=0;
let combo=0,bumpCD=0;
let stepAcc=0,stepAlt=false;
export let trauma=0;
let jumpBufferTimer=0,coyoteTimer=0;

export function setState(s){state=s;document.body.dataset.state=s;}

export function addTrauma(v){trauma=Math.min(1.0,trauma+v);}
export function decayTrauma(dt){trauma=Math.max(0,trauma-dt*1.35);}
export function decayCamDip(dt){camDip*=1-Math.min(1,dt*6.5);}
export function decayFovKick(dt){fovKick*=1-Math.min(1,dt*3.2);}
export function decayImpact(dt){impactV*=1-Math.min(1,dt*4);}
export function hurt(){hurtV=1;}
export function decayHurt(dt){hurtV*=1-Math.min(1,dt*2.4);}
export function bufferJump(t){jumpBufferTimer=t;}
export function resetJumpTimers(){jumpBufferTimer=0;coyoteTimer=0;}
export function resetCombo(){combo=0;}

const GRAV=22.5, JUMP=7.0, FRIC=6.4;
const MAXS=9.8, GACC=24;
const AIRACC=36, AIRCAP=2.8;
const AIRMAX=1000;
const DASH_SPD=21.0;

export const p={x:6,y:0,z:6,vx:0,vy:0,vz:0,yaw:0,pitch:.12,grounded:true,iT:0};

const PR=.35;

export function moveWithCollision(o,dx,dz,r){
  var oz=(o.z!==undefined)?o.z:o.y;
  if(!blocked(o.x+dx,oz,r)){
    o.x+=dx;
  }else if(o===p){
    p.vx*=0.4;
  }
  oz=(o.z!==undefined)?o.z:o.y;
  if(!blocked(o.x,oz+dz,r)){
    if(o.z!==undefined)o.z+=dz;else o.y+=dz;
  }else if(o===p){
    p.vz*=0.4;
  }
}
function blocked(x,z,r){return cell(x-r,z-r)===1||cell(x+r,z-r)===1||cell(x-r,z+r)===1||cell(x+r,z+r)===1;}

function accelerate(wx,wz,wishspeed,accel,dt){
  var cur=p.vx*wx+p.vz*wz;
  var add=wishspeed-cur;
  if(add<=0)return;
  var as=accel*dt*wishspeed;
  if(as>add)as=add;
  p.vx+=wx*as;p.vz+=wz*as;
}

export function physics(dt){
  if(!isFinite(p.x)||!isFinite(p.z)){p.x=1.5*TILE;p.z=1.5*TILE;p.vx=p.vz=0;}
  var nut=nutT>0?1.55:1;
  var jc=getJoyInput();
  var f=((keys.KeyW||keys.ArrowUp)?1:0)-((keys.KeyS||keys.ArrowDown)?1:0)+jc.y;
  var s=((keys.KeyD||keys.ArrowRight)?1:0)-((keys.KeyA||keys.ArrowLeft)?1:0)+jc.x;
  var len=Math.hypot(f,s);if(len>1){f/=len;s/=len;}
  var mag=Math.min(1,Math.hypot(f,s));

  var fwdX=Math.cos(p.yaw),fwdZ=Math.sin(p.yaw);
  var rgtX=-fwdZ,rgtZ=fwdX;
  var wx=fwdX*f+rgtX*s,wz=fwdZ*f+rgtZ*s;
  var wl=Math.hypot(wx,wz);
  if(wl>1e-4){wx/=wl;wz/=wl;}

  if(jumpBufferTimer>0)jumpBufferTimer-=dt;
  if(p.grounded)coyoteTimer=0.12;else if(coyoteTimer>0)coyoteTimer-=dt;

  var jumpHeld=keys.Space||touchJump;
  var wantJump=jumpHeld||jumpBufferTimer>0;

  if((p.grounded||coyoteTimer>0)&&wantJump){
    p.vy=JUMP;p.grounded=false;coyoteTimer=0;jumpBufferTimer=0;
    playSubBass(85,160,.12,.2);
    puff(p.x,.05,p.z,7,.5,.45,.6,1.4);
  }

  if(p.grounded&&!wantJump){
    var sp=Math.hypot(p.vx,p.vz);
    if(sp>0){
      var drop=sp*FRIC*dt;
      var sc=Math.max(0,sp-drop)/sp;
      p.vx*=sc;p.vz*=sc;
    }
    accelerate(wx,wz,MAXS*nut*mag,GACC*nut,dt);
  }else{
    accelerate(wx,wz,wl>1e-4?AIRCAP*nut:0,AIRACC,dt);
    if(wl>1e-4){
      var hsAir=Math.hypot(p.vx,p.vz);
      if(hsAir>0.8){
        var curA=Math.atan2(p.vz,p.vx);
        var wishA=Math.atan2(wz,wx);
        var diff=wishA-curA;
        while(diff>Math.PI)diff-=Math.PI*2;
        while(diff<-Math.PI)diff+=Math.PI*2;
        var maxTurn=(p.grounded?15:5.8)*dt;
        var rot=THREE.MathUtils.clamp(diff,-maxTurn,maxTurn);
        var nextA=curA+rot;
        p.vx=Math.cos(nextA)*hsAir;
        p.vz=Math.sin(nextA)*hsAir;
        if(Math.abs(diff)>0.3&&hsAir>8){
          puff(p.x-Math.cos(nextA)*.4,.1,p.z-Math.sin(nextA)*.4,2,.7,.6,.9,1.8);
        }
      }
    }
    var hs0=Math.hypot(p.vx,p.vz),cap=AIRMAX*nut;
    if(hs0>cap){p.vx*=cap/hs0;p.vz*=cap/hs0;}
  }
  p.vy-=GRAV*dt;

  var fallV=p.vy;
  var ox=p.x,oz=p.z;
  moveWithCollision(p,p.vx*dt,p.vz*dt,PR);
  bumpCD=Math.max(0,bumpCD-dt);
  var lost=Math.abs(p.vx*dt-(p.x-ox))+Math.abs(p.vz*dt-(p.z-oz));
  if(lost>.015&&Math.hypot(p.vx,p.vz)>7&&bumpCD<=0){
    bumpCD=.3;addTrauma(.55);impactV=1;
    playHeavyImpact(1.2);buzz([40,30,40]);
    puff(p.x,.9,p.z,12,.7,.5,.3,3.2);
  }

  p.y+=p.vy*dt;
  if(p.y<=0){
    p.y=0;p.vy=0;
    if(!p.grounded){
      var imp=-fallV;
      if(imp>1.5){
        playLand(imp);
        puff(p.x,.05,p.z,Math.min(32,3+imp*2.2)|0,.6,.55,.7,1.4+imp*.22);
        camDip=Math.min(.45,imp*.032);
        if(imp>8){addTrauma(.45);impactV=Math.min(1,imp*.1);}
      }
      if(wantJump){
        combo++;
        if(combo>=3)msg(STR.msgJumpCombo(combo));
        fovKick=Math.max(fovKick,Math.min(9,2.5+combo*.65));
        var hb=Math.hypot(p.vx,p.vz);
        if(hb>1){
          var hcap=AIRMAX*nut;
          var nb=Math.min(hcap,hb*1.07+.48);
          if(wl>1e-4){
            var curDirX=p.vx/hb,curDirZ=p.vz/hb;
            var steerFactor=0.48;
            var newDirX=curDirX*(1-steerFactor)+wx*steerFactor;
            var newDirZ=curDirZ*(1-steerFactor)+wz*steerFactor;
            var ndl=Math.hypot(newDirX,newDirZ)||1;
            p.vx=(newDirX/ndl)*nb;
            p.vz=(newDirZ/ndl)*nb;
          }else{
            p.vx*=nb/hb;p.vz*=nb/hb;
          }
        }
        p.vy=JUMP;
        p.grounded=false;
        jumpBufferTimer=0;
      }else{
        combo=0;
      }
    }
    if(!wantJump)p.grounded=true;
  }else{
    p.grounded=false;
  }

  var hsd=Math.hypot(p.vx,p.vz);
  if(p.grounded&&hsd>.8){
    stepAcc+=dt*hsd;
    if(stepAcc>2.5){stepAcc-=2.5;stepAlt=!stepAlt;playStep(stepAlt);}
  }else if(p.grounded)stepAcc=0;

  nutCD=Math.max(0,nutCD-dt);dashCD=Math.max(0,dashCD-dt);
  if(dashT>0){
    dashT-=dt;
    puff(p.x-Math.cos(p.yaw)*.6,.3,p.z-Math.sin(p.yaw)*.6,3,.6,.35,1,2.5);
  }
  if(nutT>0)nutT-=dt;
  if(p.iT>0)p.iT-=dt;
}

export function eatNut(){
  if(state!=='playing'||nutCD>0)return;nutCD=8;nutT=3.2;
  msg(STR.msgNutBoost);
  playNutSFX();buzz([30,40,60]);
}

export function doDash(){
  if(state!=='playing'||dashCD>0)return;dashCD=5;dashT=.48;
  addTrauma(.7);fovKick=9.5;impactV=1;
  var hs=Math.hypot(p.vx,p.vz),t=Math.max(hs,DASH_SPD);
  p.vx=Math.cos(p.yaw)*t;p.vz=Math.sin(p.yaw)*t;
  p.vy=Math.max(p.vy,2.0);
  puff(p.x-Math.cos(p.yaw)*.6,.4,p.z-Math.sin(p.yaw)*.6,22,.65,.45,1,3.8);
  playDashSFX();buzz([50,40,80]);
}
