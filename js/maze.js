/* ==========================================================================
   MODULE 7: 动态迷宫与材质
   程序化无限迷宫、实例化墙面、天花板灯、物品与敌人精灵。
   （由原单文件 index.html 拆分而来，模块划分沿用原始 MODULE 编号）
   ========================================================================== */

import { scene, SHADOWS, WALL_H, TILE } from './render.js';
import { p } from './physics.js';
import { assets } from './assets.js';

// 当前关卡色相：由 setupLevel 通过 setHue 写入，同时更新背景与雾色
let hue=260;
export function setHue(h){
  hue=h;
  scene.background.setHSL((hue%360)/360,.38,.035);
  scene.fog.color.copy(scene.background);
}

const PERIOD=48;
function mod(v,n){return((v%n)+n)%n;}
function hash2(x,z){var h=Math.sin(x*127.1+z*311.7)*43758.5453;return h-Math.floor(h);}
function vnoiseP(x,z,per){
  var xi=Math.floor(x),zi=Math.floor(z),xf=x-xi,zf=z-zi;
  var u=xf*xf*(3-2*xf),v=zf*zf*(3-2*zf);
  var a=hash2(mod(xi,per),mod(zi,per)),b=hash2(mod(xi+1,per),mod(zi,per)),c=hash2(mod(xi,per),mod(zi+1,per)),d=hash2(mod(xi+1,per),mod(zi+1,per));
  return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;
}
function cellAt(gx,gz){
  var wx=mod(gx,PERIOD),wz=mod(gz,PERIOD);
  var mx=mod(wx,8),mz=mod(wz,8);
  if(mx<2||mz<2)return 0;
  if(vnoiseP(wx*.25+7.25,wz*.25+3.25,12)>.66)return 0;
  var ex=mod(wx,2),ez=mod(wz,2);
  if(ex===0&&ez===0)return 1;
  if(ex===0||ez===0){
    var dens=.30+.30*vnoiseP(wx*.125+13.75,wz*.125+5.75,6);
    return hash2(wx,wz)<dens?0:1;
  }
  return 0;
}
export function cell(x,z){
  if(!isFinite(x)||!isFinite(z))return 1;
  return cellAt(Math.floor(x/TILE),Math.floor(z/TILE));
}
export function findSpot(minD,maxD){
  for(var t=0;t<80;t++){
    var a=Math.random()*6.283,d=minD+Math.random()*(maxD-minD);
    var gx=Math.floor((p.x+Math.cos(a)*d)/TILE),gz=Math.floor((p.z+Math.sin(a)*d)/TILE);
    if(cellAt(gx,gz)===0)return{x:(gx+.5)*TILE,y:(gz+.5)*TILE};
  }
  return{x:p.x+TILE*2,y:p.z+TILE*2};
}

export const worldRoot=new THREE.Group();
const m4=new THREE.Matrix4(),cTmp=new THREE.Color();
const CHUNK_R=16,WALLCAP=1100,LIGHTCAP=380,GLOWCAP=380;
let lastCX=99999,lastCZ=99999;
let wallInst,lightInst,glowInst,floorMesh,ceilMesh,fTex,cTex;
export const itemMeshes=[],enemySprites=[],enemyGlows=[];
export const MAXEN=16;
let ceilLightMat,ceilGlowMat;

var ghostCv=document.createElement('canvas');ghostCv.width=ghostCv.height=96;
(function(){
  var g=ghostCv.getContext('2d');
  var gr=g.createRadialGradient(48,52,5,48,52,44);
  gr.addColorStop(0,'rgba(68,18,92,.98)');gr.addColorStop(1,'rgba(8,3,15,0)');
  g.fillStyle=gr;g.beginPath();g.arc(48,52,44,0,7);g.fill();
  g.fillStyle='#ff2244';g.beginPath();g.arc(40,46,5,0,7);g.fill();g.beginPath();g.arc(56,46,5,0,7);g.fill();
})();
var ghostTex=new THREE.CanvasTexture(ghostCv);ghostTex.encoding=THREE.sRGBEncoding;

var glowCv=document.createElement('canvas');glowCv.width=glowCv.height=64;
(function(){
  var g=glowCv.getContext('2d');var gr=g.createRadialGradient(32,32,2,32,32,30);
  gr.addColorStop(0,'rgba(255,255,255,.95)');gr.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle=gr;g.fillRect(0,0,64,64);
})();
var glowTex=new THREE.CanvasTexture(glowCv);

var gunmuOK=false,gunmuAspect=1,waaoAspect=1;
var gunmuMat=new THREE.SpriteMaterial({transparent:true,depthWrite:false});
var waaoMat=new THREE.SpriteMaterial({map:ghostTex,transparent:true,depthWrite:false});

// 贴图由 assets 预加载完成后再由 initWorld 接上（AVIF 优先，不可达时用保底模型）
function useLoadedTextures(){
  var gt=assets.gunmu,wt=assets.waao;
  if(gt){
    gunmuOK=true;
    gunmuAspect=(gt.image&&gt.image.width&&gt.image.height)?gt.image.width/gt.image.height:1;
    gunmuMat.map=gt;gunmuMat.needsUpdate=true;
  }
  if(wt){
    waaoAspect=(wt.image&&wt.image.width&&wt.image.height)?wt.image.width/wt.image.height:1;
    waaoMat.map=wt;waaoMat.needsUpdate=true;
  }
}

function gridTex(h,bright){
  var c=document.createElement('canvas');c.width=c.height=128;var g=c.getContext('2d');
  g.fillStyle='#090610';g.fillRect(0,0,128,128);
  g.strokeStyle='hsla('+h+',55%,'+bright+'%,.38)';g.lineWidth=4;g.strokeRect(2,2,124,124);
  g.strokeStyle='hsla('+h+',55%,'+bright+'%,.15)';g.lineWidth=1.5;
  g.beginPath();g.moveTo(64,0);g.lineTo(64,128);g.moveTo(0,64);g.lineTo(128,64);g.stroke();
  var t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}

function makeGunmu(){
  var g=new THREE.Group(),body=new THREE.Group();
  var brown=new THREE.MeshLambertMaterial({color:0x9a6530,emissive:0x221307});
  var stick=new THREE.Mesh(new THREE.CylinderGeometry(.055,.075,.98,8),brown);stick.position.y=.49;stick.castShadow=SHADOWS;
  var arm1=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,.36,6),brown);arm1.position.set(.18,.64,0);arm1.rotation.z=-.7;
  var arm2=arm1.clone();arm2.position.x=-.18;arm2.rotation.z=.7;
  var head=new THREE.Mesh(new THREE.SphereGeometry(.18,12,10),new THREE.MeshLambertMaterial({color:0xd99a52,emissive:0x33200a}));
  head.position.y=1.08;head.castShadow=SHADOWS;
  var eyeM=new THREE.MeshBasicMaterial({color:0x2b1608});
  var e1=new THREE.Mesh(new THREE.SphereGeometry(.035,6,6),eyeM);e1.position.set(.065,1.1,.16);
  var e2=e1.clone();e2.position.x=-.065;
  body.add(stick,arm1,arm2,head,e1,e2);body.visible=!gunmuOK;
  g.add(body);

  var img=new THREE.Sprite(gunmuMat);img.scale.set(1.35*Math.min(gunmuAspect,2),1.35,1);img.position.y=.78;img.visible=gunmuOK;
  g.add(img);

  var halo=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:0xffaa33,transparent:true,opacity:.65,blending:THREE.AdditiveBlending,depthWrite:false}));
  halo.scale.set(2.0,2.0,1);halo.position.y=.6;
  var beam=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color:0xffd080,transparent:true,opacity:.35,blending:THREE.AdditiveBlending,depthWrite:false}));
  beam.scale.set(.85,5.2,1);beam.position.y=2.5;
  g.add(halo,beam);
  return g;
}

export function initWorld(){
  useLoadedTextures();
  scene.add(worldRoot);
  wallInst=new THREE.InstancedMesh(new THREE.BoxGeometry(TILE,WALL_H,TILE),new THREE.MeshLambertMaterial({color:0xffffff}),WALLCAP);
  wallInst.castShadow=SHADOWS;wallInst.receiveShadow=SHADOWS;wallInst.frustumCulled=false;worldRoot.add(wallInst);
  ceilLightMat=new THREE.MeshBasicMaterial({color:0xffe0b0});
  lightInst=new THREE.InstancedMesh(new THREE.PlaneGeometry(TILE*.45,TILE*.18),ceilLightMat,LIGHTCAP);
  lightInst.frustumCulled=false;worldRoot.add(lightInst);
  ceilGlowMat=new THREE.MeshBasicMaterial({map:glowTex,color:0xffd499,transparent:true,opacity:.22,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
  glowInst=new THREE.InstancedMesh(new THREE.PlaneGeometry(2.8,2.8),ceilGlowMat,GLOWCAP);
  glowInst.frustumCulled=false;worldRoot.add(glowInst);

  fTex=gridTex(hue,50);fTex.repeat.set(80,80);
  floorMesh=new THREE.Mesh(new THREE.PlaneGeometry(160,160),new THREE.MeshLambertMaterial({map:fTex}));
  floorMesh.rotation.x=-Math.PI/2;floorMesh.receiveShadow=SHADOWS;worldRoot.add(floorMesh);

  cTex=gridTex(hue,20);cTex.repeat.set(80,80);
  ceilMesh=new THREE.Mesh(new THREE.PlaneGeometry(160,160),new THREE.MeshLambertMaterial({map:cTex}));
  ceilMesh.rotation.x=Math.PI/2;ceilMesh.position.y=WALL_H;worldRoot.add(ceilMesh);

  for(var i=0;i<5;i++){var gm=makeGunmu();worldRoot.add(gm);itemMeshes.push(gm);}
  var auraMat=new THREE.SpriteMaterial({map:glowTex,color:0xff1838,transparent:true,opacity:.38,blending:THREE.AdditiveBlending,depthWrite:false});
  for(i=0;i<MAXEN;i++){
    var sp=new THREE.Sprite(waaoMat);
    sp.scale.set(1.9*Math.min(Math.max(waaoAspect,.4),1.8),1.9,1);sp.visible=false;
    worldRoot.add(sp);enemySprites.push(sp);
    var au=new THREE.Sprite(auraMat);
    au.scale.set(2.4,2.4,1);au.visible=false;
    worldRoot.add(au);enemyGlows.push(au);
  }
}

export function rebuildChunks(force){
  var pcx=Math.floor(p.x/TILE),pcz=Math.floor(p.z/TILE);
  if(!force&&pcx===lastCX&&pcz===lastCZ)return;
  lastCX=pcx;lastCZ=pcz;
  var wi=0,li=0,gi=0;
  for(var gz=pcz-CHUNK_R;gz<=pcz+CHUNK_R;gz++){
    for(var gx=pcx-CHUNK_R;gx<=pcx+CHUNK_R;gx++){
      var wx=(gx+.5)*TILE,wz=(gz+.5)*TILE;
      if(cellAt(gx,gz)===1){
        if(wi<WALLCAP){
          m4.identity();m4.setPosition(wx,WALL_H/2,wz);
          wallInst.setMatrixAt(wi,m4);
          var rnd=hash2(mod(gx,PERIOD)*3.7,mod(gz,PERIOD)*1.3);
          cTmp.setHSL(((hue+rnd*16-8)%360)/360,.38,.28+rnd*.18);
          wallInst.setColorAt(wi,cTmp);
          wi++;
        }
      }else if(mod(gx+gz,3)===0){
        if(li<LIGHTCAP){
          m4.makeRotationX(Math.PI/2);m4.setPosition(wx,WALL_H-.03,wz);
          lightInst.setMatrixAt(li++,m4);
        }
        if(gi<GLOWCAP){
          m4.makeRotationX(Math.PI/2);m4.setPosition(wx,WALL_H-.22,wz);
          glowInst.setMatrixAt(gi++,m4);
        }
      }
    }
  }
  wallInst.count=wi;lightInst.count=li;glowInst.count=gi;
  wallInst.instanceMatrix.needsUpdate=true;
  if(wallInst.instanceColor)wallInst.instanceColor.needsUpdate=true;
  lightInst.instanceMatrix.needsUpdate=true;
  glowInst.instanceMatrix.needsUpdate=true;
}
// 天花板灯随灯光闪烁变暗
export function setCeilingFlicker(flick){
  if(ceilLightMat)ceilLightMat.color.setRGB(1*flick,.86*flick,.66*flick);
  if(ceilGlowMat)ceilGlowMat.opacity=.22*flick;
}

// 地板 / 天花板跟随玩家滚动，避免使用无限大平面
export function scrollWorldTo(x,z){
  floorMesh.position.set(x,0,z);
  fTex.offset.set((x-80)/2,(-z-80)/2);
  ceilMesh.position.set(x,WALL_H,z);
  cTex.offset.set((x-80)/2,(-z-80)/2);
}

// 把实体数据同步到精灵（物品 / 敌人 / 投掷物）
export function syncSprites(items,enemies,projs,now,dt){
  for(var i=0;i<items.length;i++){
    var m=itemMeshes[i];if(!m)continue;
    var it=items[i];
    m.visible=!it.taken;m.position.set(it.x,0,it.y);
    if(!it.taken){m.position.y=Math.sin(now*2.2+it.ph)*.09;m.rotation.y+=dt*1.4;}
  }
  for(i=0;i<MAXEN;i++){
    var spr=enemySprites[i],gl=enemyGlows[i],en=enemies[i],on=!!en&&en.alive;
    spr.visible=on;gl.visible=on;
    if(on){
      var eyy=.9+.1*Math.sin(now*2.8+en.ph);
      spr.position.set(en.x,eyy,en.y);gl.position.set(en.x,eyy,en.y);
    }
  }
  for(i=0;i<projs.length;i++){
    if(projs[i].mesh)projs[i].mesh.position.set(projs[i].x,projs[i].y,projs[i].z);
  }
}
