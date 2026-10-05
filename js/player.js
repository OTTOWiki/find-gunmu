/* ==========================================================================
   MODULE 6: 玩家模型
   daoli.glb 模型加载，失败时回退到程序化小人。
   （由原单文件 index.html 拆分而来，模块划分沿用原始 MODULE 编号）
   ========================================================================== */

import { scene, SHADOWS } from './render.js';
import { showErr, setDiagErr } from './diag.js';
import { STR } from './strings.js';
import { p } from './physics.js';

export let playerRoot=null;
let modelYaw=0,mixer=null;
const MODEL_YAW_OFFSET=0;

function makeFallbackPlayer(){
  var g=new THREE.Group();
  var body=new THREE.Mesh(new THREE.CapsuleGeometry(.3,.75,4,10),new THREE.MeshLambertMaterial({color:0x6b4db8}));
  body.position.y=.88;body.castShadow=SHADOWS;
  var head=new THREE.Mesh(new THREE.SphereGeometry(.22,14,12),new THREE.MeshLambertMaterial({color:0xc4adff}));
  head.position.y=1.54;head.castShadow=SHADOWS;
  var eyeM=new THREE.MeshBasicMaterial({color:0x110d1e});
  var e1=new THREE.Mesh(new THREE.SphereGeometry(.04,6,6),eyeM);e1.position.set(.08,1.56,.19);
  var e2=e1.clone();e2.position.x=-.08;
  g.add(body,head,e1,e2);
  return g;
}

export function initPlayer(){
  playerRoot=new THREE.Group();
  scene.add(playerRoot);
  playerRoot.add(makeFallbackPlayer());
  if(window.THREE&&THREE.GLTFLoader){
    try{
      new THREE.GLTFLoader().load('./daoli.glb',function(gltf){
        try{
          var m=gltf.scene,box=new THREE.Box3().setFromObject(m),size=box.getSize(new THREE.Vector3());
          var s=1.7/Math.max(size.y,.001);m.scale.setScalar(s);box.setFromObject(m);
          m.position.set(-(box.min.x+box.max.x)/2,-box.min.y,-(box.min.z+box.max.z)/2);
          m.rotation.y=MODEL_YAW_OFFSET;
          m.traverse(function(o){if(o.isMesh){o.castShadow=SHADOWS;o.receiveShadow=SHADOWS;}});
          playerRoot.clear();playerRoot.add(m);
          if(gltf.animations&&gltf.animations.length){
            mixer=new THREE.AnimationMixer(m);mixer.clipAction(gltf.animations[0]).play();
          }
        }catch(e){showErr(STR.errTagModel,e);}
      },undefined,function(){
        setDiagErr(STR.diagModelFallback);
      });
    }catch(e){showErr(STR.errTagGLTF,e);}
  }
}

// 由 visuals 每帧调用：同步模型位置 / 朝向 / 倾斜 / 落地压扁
export function posePlayer(dt,hs,side,camDip,fx,fz){
  playerRoot.position.set(p.x,p.y,p.z);
  var targetYaw=hs>1?Math.atan2(p.vx,p.vz):Math.atan2(fx,fz);
  var dy=targetYaw-modelYaw;
  while(dy>Math.PI)dy-=6.283;while(dy<-Math.PI)dy+=6.283;
  modelYaw+=dy*Math.min(1,dt*10);
  playerRoot.rotation.y=modelYaw;
  playerRoot.rotation.z=THREE.MathUtils.clamp(-side*.015,-.16,.16);
  playerRoot.rotation.x=p.grounded?0:THREE.MathUtils.clamp(-p.vy*.022,-.28,.28);
  var squish=1.0-Math.min(.3,camDip*1.2);
  playerRoot.scale.set(1.0/Math.sqrt(squish),squish,1.0/Math.sqrt(squish));
  if(mixer)mixer.update(dt);
}
