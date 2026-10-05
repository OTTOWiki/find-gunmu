/* ==========================================================================
   MODULE 3: Three.js 渲染器 & 暗黑光影
   WebGL 渲染器、场景、相机与灯光。
   （由原单文件 index.html 拆分而来，模块划分沿用原始 MODULE 编号）
   ========================================================================== */

import { $, W, H, isTouch, setViewport } from './core.js';
import { STR } from './strings.js';
import { resizeTargets } from './post.js';

export let renderer=null,scene=null,camera=null,headLamp=null,flash=null,SHADOWS=false;
let flick=1,flickT=0;

export function initRenderer(){
  try{
    renderer=new THREE.WebGLRenderer({antialias:!isTouch,powerPreference:'high-performance'});
  }catch(e){
    $('diag').textContent=STR.diagWebGLError;return false;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,isTouch?1.5:2));
  renderer.setSize(W,H);
  SHADOWS=!isTouch;
  if(SHADOWS){renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;}
  $('wrap').insertBefore(renderer.domElement,$('vignette'));

  scene=new THREE.Scene();
  scene.background=new THREE.Color(0x040208);
  scene.fog=new THREE.FogExp2(0x040208,.032);
  camera=new THREE.PerspectiveCamera(74,W/H,.12,150);
  scene.add(camera);

  var hemi=new THREE.HemisphereLight(0x7e66ad,0x1a1226,.4);scene.add(hemi);
  scene.add(new THREE.AmbientLight(0x120c1e,.4));
  headLamp=new THREE.PointLight(0xffe6c2,1.2,26);scene.add(headLamp);
  flash=new THREE.SpotLight(0xffe4be,2.2,40,.62,.6,1.4);
  flash.castShadow=SHADOWS;
  if(SHADOWS){flash.shadow.mapSize.set(1024,1024);flash.shadow.camera.near=.5;flash.shadow.camera.far=40;}
  scene.add(flash);scene.add(flash.target);
  return true;
}

// 灯光闪烁 + 手电/头灯跟随；返回当前闪烁系数供天花板发光使用
export function applyLighting(dt,hx,hy,hz,fx,fy,fz){
  flickT-=dt;
  if(flickT<=0){
    if(Math.random()<.1){flickT=.06+Math.random()*.2;flick=.25+Math.random()*.45;}
    else flickT=.12;
  }
  flick+=(1-flick)*Math.min(1,dt*12);
  flash.position.copy(camera.position);
  flash.target.position.set(hx+fx*12,hy+fy*12-.6,hz+fz*12);
  flash.intensity=2.2*flick;
  headLamp.position.set(hx,hy+.45,hz);
  headLamp.intensity=1.2*flick;
  return flick;
}

// 视口尺寸变化：同步渲染器 / 相机 / 后期 RT
export function resize(){
  const w=innerWidth,h=innerHeight;
  setViewport(w,h);
  renderer.setSize(w,h);
  camera.aspect=w/h;camera.updateProjectionMatrix();
  resizeTargets();
}

export const TILE=4,WALL_H=5;
