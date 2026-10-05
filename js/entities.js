/* ==========================================================================
   MODULE 9: 实体与交互
   关卡生成、物品收集、敌人 AI、投掷物与结算流程。
   （由原单文件 index.html 拆分而来，模块划分沿用原始 MODULE 编号）
   ========================================================================== */

import { $ } from './core.js';
import { STR } from './strings.js';
import { showErr, buzz } from './diag.js';
import { playHurtSFX, playThrowSFX, playCollectSFX, playHeavyImpact, silenceAmbient } from './audio.js';
import { puff } from './particles.js';
import { worldRoot, cell, findSpot, rebuildChunks, setHue, MAXEN } from './maze.js';
import { state, setState, p, moveWithCollision, addTrauma, hurt, resetJumpTimers, resetCombo, dashT } from './physics.js';
import { resetMotionBlur } from './post.js';
import { WALL_H, TILE } from './render.js';
export let level=1,goal=0,total=0,time=90,boxCD=0;
// 练习模式（时间不限）与本局统计：runTime 只累计 playing 状态时长
export let practice=false,runTime=0,hits=0,gpm=0,wapm=0;
export let items=[],enemies=[],projs=[];

export function setupLevel(lv,fresh){
  level=lv;setHue(lv*47+260);
  if(fresh){p.x=1.5*TILE;p.z=1.5*TILE;p.y=0;p.vx=p.vy=p.vz=0;p.iT=0;p.grounded=true;}
  goal=0;time=90;resetCombo();resetMotionBlur();
  resetJumpTimers();
  projs.forEach(function(pr){if(pr.mesh){worldRoot.remove(pr.mesh);pr.mesh.geometry.dispose();pr.mesh.material.dispose();}});
  projs=[];items=[];
  for(var i=0;i<5;i++){
    var s=findSpot(15,55);items.push({x:s.x,y:s.y,taken:false,ph:Math.random()*6.28});
  }
  enemies=[];
  var n=Math.min(7+lv,MAXEN);
  for(i=0;i<n;i++){
    var e=findSpot(20,55);enemies.push({x:e.x,y:e.y,dir:Math.random()*6.28,dirT:0,alive:true,resp:0,ph:Math.random()*6.28});
  }
  // 关卡色相（背景 / 雾）由 maze 的 setHue 一并更新
  rebuildChunks(true);
}
function los(ax,az,bx,bz){
  var dx=bx-ax,dz=bz-az,d=Math.hypot(dx,dz),steps=Math.ceil(d/.25);
  for(var i=1;i<steps;i++)if(cell(ax+dx*i/steps,az+dz*i/steps)===1)return false;
  return true;
}

export function throwBox(){
  if(state!=='playing'||boxCD>0)return;boxCD=.45;
  var cp=Math.cos(p.pitch);
  var fx=Math.cos(p.yaw)*cp,fy=Math.sin(p.pitch),fz=Math.sin(p.yaw)*cp;
  var m=new THREE.Mesh(new THREE.SphereGeometry(.16,10,8),new THREE.MeshLambertMaterial({color:0xe5af40,emissive:0x664400}));
  m.scale.y=.65;m.position.set(p.x+fx*.5,p.y+1.3,p.z+fz*.5);
  worldRoot.add(m);
  projs.push({x:p.x+fx*.5,y:p.y+1.3,z:p.z+fz*.5,vx:fx*13.5,vy:fy*13.5,vz:fz*13.5,life:1.6,mesh:m});
  puff(p.x+fx*.5,p.y+1.3,p.z+fz*.5,5,.9,.75,.3,2);
  playThrowSFX();buzz(16);
}

export function msg(t){
  var d=document.createElement('div');d.className='floatmsg';d.textContent=t;
  $('wrap').appendChild(d);setTimeout(function(){d.remove&&d.remove();},1100);
}

function killEnemy(en){
  en.alive=false;en.resp=4+Math.random()*2;
  puff(en.x,.9,en.y,20,.6,.2,.8,3.2);
  playHeavyImpact(1.4);addTrauma(.45);
}

function flashRed(){var f=$('flash');f.classList.add('on');setTimeout(function(){f.classList.remove('on');},90);}

function collect(it){
  it.taken=true;goal++;total++;msg(STR.msgCollect);
  puff(it.x,.8,it.y,24,1,.85,.35,3.6);
  playCollectSFX();buzz([20,30,40]);
  if(goal>=5){levelClear();return;}
  var s=findSpot(20,60);
  it.x=s.x;it.y=s.y;it.taken=false;it.ph=Math.random()*6.28;
}

var gateTimer=null;
function gate(txt,dur,cb){
  setState('gate');$('gate-text').innerHTML=txt;
  clearTimeout(gateTimer);
  gateTimer=setTimeout(function(){
    try{cb&&cb();}catch(e){showErr(STR.errTagGate,e);setState('playing');}
  },dur);
}
export function startRun(mode){
  practice=(mode==='practice');
  total=0;hits=0;runTime=0;gpm=0;wapm=0;
  gate(STR.gateEntering,1000,function(){try{setupLevel(1,true);}catch(e){showErr(STR.errTagLevel,e);}setState('playing');});
}
function levelClear(){buzz([50,50,80]);gate(STR.gateClear(level),1400,function(){try{setupLevel(level+1,false);}catch(e){showErr(STR.errTagLevel,e);}setState('playing');});}
function lose(){setState('lost');$('lost-level').textContent=level;$('lost-count').textContent=total;playHurtSFX();buzz(120);silenceAmbient();}

// 返回主菜单：本局作废，世界重置回第 1 层（与 initGame 的初始状态一致）
export function gotoMenu(){
  if(state!=='playing'&&state!=='lost')return;
  total=0;hits=0;runTime=0;gpm=0;wapm=0;
  try{setupLevel(1,true);}catch(e){showErr(STR.errTagLevel,e);}
  document.body.classList.remove('danger');
  try{if(document.exitPointerLock)document.exitPointerLock();}catch(e){}
  silenceAmbient();
  setState('start');
}

export function entities(dt){
  boxCD=Math.max(0,boxCD-dt);
  items.forEach(function(it){
    if(!it.taken&&(p.x-it.x)*(p.x-it.x)+(p.z-it.y)*(p.z-it.y)<.42)collect(it);
  });
  enemies.forEach(function(en){
    if(!en.alive){
      en.resp-=dt;
      if(en.resp<=0){
        var d0=Math.hypot(p.x-en.x,p.z-en.y);
        if(d0>80){var s0=findSpot(30,55);en.x=s0.x;en.y=s0.y;}
        en.alive=true;
      }
      return;
    }
    var ddx=p.x-en.x,ddz=p.z-en.y,d=Math.hypot(ddx,ddz);
    if(d>90){var s=findSpot(35,60);en.x=s.x;en.y=s.y;return;}
    var dir=en.dir,esp=2.5;
    if(d<18&&los(en.x,en.y,p.x,p.z)){
      dir=Math.atan2(ddz,ddx);esp=9.3+Math.min(2,level*.1);en.dir=dir;
    }else{
      en.dirT-=dt;if(en.dirT<=0){en.dir=Math.random()*6.28;en.dirT=1+Math.random()*1.5;}dir=en.dir;
    }
    var ex=en.x,ey=en.y;
    moveWithCollision(en,Math.cos(dir)*esp*dt,Math.sin(dir)*esp*dt,.3);
    if(en.x===ex&&en.y===ey){en.dir=Math.random()*6.28;en.dirT=1;}
    if(d<1.0&&dashT>0){killEnemy(en);msg(STR.msgDashSmash);buzz([60,30,80]);return;}
    if(d<.58&&p.iT<=0&&dashT<=0){
      if(!practice)time=Math.max(0,time-5);
      hits++;p.iT=1.6;killEnemy(en);
      flashRed();addTrauma(.85);hurt();
      msg(practice?STR.msgHurtPractice:STR.msgHurt);playHurtSFX();buzz([100,50,150]);
    }
  });
  for(var i=projs.length-1;i>=0;i--){
    var pr=projs[i];pr.x+=pr.vx*dt;pr.y+=pr.vy*dt;pr.z+=pr.vz*dt;pr.life-=dt;
    var dead=pr.life<=0||pr.y<0||pr.y>WALL_H||cell(pr.x,pr.z)===1;
    if(!dead)for(var j=0;j<enemies.length;j++){
      var en2=enemies[j];
      if(en2.alive&&(pr.x-en2.x)*(pr.x-en2.x)+(pr.z-en2.y)*(pr.z-en2.y)<.28&&Math.abs(pr.y-1)<1.2){killEnemy(en2);msg(STR.msgBoxHit);dead=true;break;}
    }
    if(!dead)for(var k=0;k<items.length;k++){
      var it2=items[k];
      if(!it2.taken&&(pr.x-it2.x)*(pr.x-it2.x)+(pr.z-it2.y)*(pr.z-it2.y)<.38){collect(it2);dead=true;break;}
    }
    if(dead){
      if(pr.mesh){worldRoot.remove(pr.mesh);pr.mesh.geometry.dispose();pr.mesh.material.dispose();}
      puff(pr.x,pr.y,pr.z,7,.9,.7,.2,2.2);
      projs.splice(i,1);
    }
  }
}

// 由主循环每帧调用：倒计时、危急状态样式与本局统计（GPM/WAPM = 每分钟数量 ×10）
export function tickClock(dt){
  var live=(state==='playing');
  if(live){
    runTime+=dt;
    if(!practice){
      time-=dt;
      if(time<=0){time=0;lose();}
    }
  }
  // 开局 1 秒内样本太少，统计固定显示 0
  var m=runTime>=1?runTime/60:0;
  gpm=m>0?Math.round(total/m*10):0;
  wapm=m>0?Math.round(hits/m*10):0;
  document.body.classList.toggle('danger',live&&!practice&&time<15);
}
