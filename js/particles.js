/* ==========================================================================
   MODULE 5: 粒子系统
   点精灵粒子池，用于脚步、落地、撞击、收集等反馈。
   （由原单文件 index.html 拆分而来，模块划分沿用原始 MODULE 编号）
   ========================================================================== */

import { scene } from './render.js';

export const PMAX=320;
let pGeo,pPos,pCol,pBase,pVel,pLife,pMax,points;

export function initParticles(){
  pGeo=new THREE.BufferGeometry();
  pPos=new Float32Array(PMAX*3),pCol=new Float32Array(PMAX*3),pBase=new Float32Array(PMAX*3),pVel=new Float32Array(PMAX*3),pLife=new Float32Array(PMAX),pMax=new Float32Array(PMAX);
  for(var pi=0;pi<PMAX;pi++)pPos[pi*3+1]=-99;
  pGeo.setAttribute('position',new THREE.BufferAttribute(pPos,3).setUsage(THREE.DynamicDrawUsage));
  pGeo.setAttribute('color',new THREE.BufferAttribute(pCol,3).setUsage(THREE.DynamicDrawUsage));
  points=new THREE.Points(pGeo,new THREE.PointsMaterial({size:.28,vertexColors:true,transparent:true,opacity:.95,blending:THREE.AdditiveBlending,depthWrite:false,sizeAttenuation:true}));
  points.frustumCulled=false;scene.add(points);
}

export function puff(x,y,z,n,r,g,b,spd,grav){
  var c=0;
  for(var i=0;i<PMAX&&c<n;i++){
    if(pLife[i]>0)continue;
    pLife[i]=pMax[i]=.35+Math.random()*.55;
    pPos[i*3]=x;pPos[i*3+1]=y;pPos[i*3+2]=z;
    var a=Math.random()*6.283,e=Math.random()*1.5,v=spd*(.4+Math.random()*1.1);
    pVel[i*3]=Math.cos(a)*Math.cos(e)*v;pVel[i*3+1]=Math.sin(e)*v*(grav?-.2:1);pVel[i*3+2]=Math.sin(a)*Math.cos(e)*v;
    pBase[i*3]=r;pBase[i*3+1]=g;pBase[i*3+2]=b;c++;
  }
}
export function stepParticles(dt){
  for(var i=0;i<PMAX;i++){
    if(pLife[i]<=0)continue;
    pLife[i]-=dt;
    if(pLife[i]<=0){pPos[i*3+1]=-99;pCol[i*3]=pCol[i*3+1]=pCol[i*3+2]=0;continue;}
    pPos[i*3]+=pVel[i*3]*dt;pPos[i*3+1]+=pVel[i*3+1]*dt;pPos[i*3+2]+=pVel[i*3+2]*dt;
    pVel[i*3+1]-=6.5*dt;
    var dmp=1-2.4*dt;pVel[i*3]*=dmp;pVel[i*3+2]*=dmp;
    var k=pLife[i]/pMax[i];
    pCol[i*3]=pBase[i*3]*k;pCol[i*3+1]=pBase[i*3+1]*k;pCol[i*3+2]=pBase[i*3+2]*k;
  }
  pGeo.attributes.position.needsUpdate=true;pGeo.attributes.color.needsUpdate=true;
}
