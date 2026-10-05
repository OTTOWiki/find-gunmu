/* ==========================================================================
   MODULE 4: 后期着色管线
   拖影累积、色差、暗角、噪点等后处理。
   （由原单文件 index.html 拆分而来，模块划分沿用原始 MODULE 编号）
   ========================================================================== */

import { renderer, scene, camera } from './render.js';
import { showErr } from './diag.js';
import { STR } from './strings.js';

export const tmpV2=new THREE.Vector2();
function makeRT(){return new THREE.WebGLRenderTarget(tmpV2.x,tmpV2.y,{minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,format:THREE.RGBAFormat});}
export let rtA=null,rtB=null,rtC=null;
let accIdx=0,mbReset=0;
let postQuad=null;
export const postScene=new THREE.Scene();
export const postCam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
export const quadGeo=new THREE.PlaneGeometry(2,2);

export const accumUniforms={tCur:{value:null},tPrev:{value:null},uMix:{value:0},uSpeed:{value:0},uYaw:{value:0},uDash:{value:0}};
const accumMat=new THREE.ShaderMaterial({
  uniforms:accumUniforms,depthTest:false,depthWrite:false,
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
  fragmentShader:[
    'uniform sampler2D tCur,tPrev;uniform float uMix,uSpeed,uYaw,uDash;varying vec2 vUv;',
    'void main(){',
    '  vec2 c=vUv-.5; vec3 cur=texture2D(tCur,vUv).rgb;',
    '  float kR=max((uSpeed-7.)*.00035,0.)+uDash*.007;',
    '  float kY=abs(uYaw)*.0012;',
    '  if(kR>0.||kY>0.){',
    '    vec2 dr=c*kR; vec2 dh=vec2(kY,0.); vec3 acc=cur;',
    '    acc+=texture2D(tCur,vUv+dr+dh).rgb; acc+=texture2D(tCur,vUv-dr-dh).rgb;',
    '    acc+=texture2D(tCur,vUv+(dr+dh)*2.2).rgb; acc+=texture2D(tCur,vUv-(dr+dh)*2.2).rgb;',
    '    cur=acc/5.;',
    '  }',
    '  vec3 prev=texture2D(tPrev,vUv).rgb;',
    '  gl_FragColor=vec4(mix(cur,prev,uMix),1.);',
    '}'
  ].join('\n')
});

export const gradeUniforms={tDiffuse:{value:null},uTime:{value:0},uSpeed:{value:0},uHurt:{value:0},uBoost:{value:0},uVig:{value:.5},uGrain:{value:.045},uImpact:{value:0}};
const gradeMat=new THREE.ShaderMaterial({
  uniforms:gradeUniforms,depthTest:false,depthWrite:false,
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
  fragmentShader:[
    'uniform sampler2D tDiffuse;uniform float uTime,uSpeed,uHurt,uBoost,uVig,uGrain,uImpact;varying vec2 vUv;',
    'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
    'void main(){',
    '  vec2 uv=vUv; vec2 c=uv-.5; float r=length(c);',
    '  float ab=.0012+uSpeed*.00028+uHurt*.008+uImpact*.006;',
    '  vec3 col;',
    '  col.r=texture2D(tDiffuse,uv+c*ab*2.6).r;',
    '  col.g=texture2D(tDiffuse,uv).g;',
    '  col.b=texture2D(tDiffuse,uv-c*ab*2.6).b;',
    '  if(uSpeed>12.0){',
    '    float ang=atan(c.y,c.x);',
    '    float strk=sin(ang*36.+uTime*25.)*smoothstep(.28,.75,r)*(uSpeed-12.)*.02;',
    '    col+=vec3(strk*.4,strk*.6,strk);',
    '  }',
    '  col=pow(max(col,vec3(0.)),vec3(.48))*1.22;',
    '  col=col/(col+vec3(.52))*1.62;',
    '  col+=uBoost*vec3(.12,.07,.01);',
    '  col=mix(col,vec3(1.1,.08,.12),uHurt*smoothstep(.08,.7,r)*.9);',
    '  float vig=smoothstep(.95,.2,r*(1.+uVig*.45));',
    '  col*=mix(.2,1.,vig);',
    '  col+=(hash(uv*vec2(1621.,1034.)+fract(uTime)*7.)-.5)*uGrain;',
    '  gl_FragColor=vec4(col,1.);',
    '}'
  ].join('\n')
});
export function initPost(){
  renderer.getDrawingBufferSize(tmpV2);
  rtA=makeRT();rtB=makeRT();rtC=makeRT();
  postQuad=new THREE.Mesh(quadGeo,accumMat);
  postScene.add(postQuad);
}

// 主循环的渲染阶段：主场景 → 累积(拖影) → 调色输出
export function renderFrame(){
  try{
    renderer.setRenderTarget(rtA);
    renderer.render(scene,camera);

    postQuad.material=accumMat;
    accumUniforms.tCur.value=rtA.texture;
    accumUniforms.tPrev.value=(accIdx===0?rtB:rtC).texture;
    renderer.setRenderTarget(accIdx===0?rtC:rtB);
    renderer.render(postScene,postCam);

    postQuad.material=gradeMat;
    gradeUniforms.tDiffuse.value=(accIdx===0?rtC:rtB).texture;
    renderer.setRenderTarget(null);
    renderer.render(postScene,postCam);
    accIdx=1-accIdx;
  }catch(e){
    renderer.setRenderTarget(null);renderer.render(scene,camera);showErr(STR.errTagPost,e);
  }
}

export function resizeTargets(){
  if(!rtA)return;
  renderer.getDrawingBufferSize(tmpV2);
  rtA.setSize(tmpV2.x,tmpV2.y);rtB.setSize(tmpV2.x,tmpV2.y);rtC.setSize(tmpV2.x,tmpV2.y);
}

// 切换层级时清掉一帧累积，避免拖影串场
export function resetMotionBlur(){mbReset=3;}

export function setMotionBlur(mb,speed,yawRate,dashing){
  if(mbReset>0){mb=0;mbReset--;}
  accumUniforms.uMix.value=mb;
  accumUniforms.uSpeed.value=speed;
  accumUniforms.uYaw.value=yawRate;
  accumUniforms.uDash.value=dashing?1:0;
}
