/* ==========================================================================
   MODULE 12: 多源容灾轮子加载器（入口模块）
   依次尝试多个 CDN 加载 three.js / GLTFLoader / nipplejs / tween.js，
   全部就绪后再动态 import 游戏本体，避免模块顶层依赖未就绪的全局库。
   ========================================================================== */
import { STR } from './strings.js';

const diag = document.getElementById('diag');
const stLoad = document.getElementById('st-loading');
function setMenuLoad(t){if(stLoad)stLoad.textContent=t;}

function loadSeq(list){
  return new Promise(function(resolve){
    var i=0;
    (function next(){
      if(i>=list.length)return resolve(false);
      var s=document.createElement('script');
      s.src=list[i];
      s.onload=function(){resolve(true);};
      s.onerror=function(){if(s.parentNode)s.parentNode.removeChild(s);i++;next();};
      document.head.appendChild(s);
    })();
  });
}

const CORE=[
  'https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js',
  'https://unpkg.com/three@0.147.0/build/three.min.js',
  'https://cdn.bootcdn.net/ajax/libs/three.js/0.147.0/three.min.js',
  'https://npm.elemecdn.com/three@0.147.0/build/three.min.js'
];
const LOADER=[
  'https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/loaders/GLTFLoader.js',
  'https://unpkg.com/three@0.147.0/examples/js/loaders/GLTFLoader.js'
];
const NIPPLE=[
  'https://cdn.jsdelivr.net/npm/nipplejs@0.10.1/dist/nipplejs.min.js',
  'https://unpkg.com/nipplejs@0.10.1/dist/nipplejs.min.js'
];
const TWEEN_LIB=[
  'https://cdn.jsdelivr.net/npm/@tweenjs/tween.js@18.6.4/dist/tween.umd.js',
  'https://unpkg.com/@tweenjs/tween.js@18.6.4/dist/tween.umd.js'
];

(async function boot(){
  diag.textContent=STR.diagLoadingLibs;
  setMenuLoad(STR.assetLoadingLibs);

  var ok=await loadSeq(CORE);
  if(!ok||!window.THREE){
    diag.textContent=STR.diagCoreLibBlocked;
    setMenuLoad(STR.diagCoreLibBlocked);
    return;
  }
  // 逐个等待，尽力在可达的镜像上把运行库全部加载完；结果交给 initGame 做诊断
  var libStatus={three:true};
  libStatus.gltf=await loadSeq(LOADER);
  libStatus.nipple=await loadSeq(NIPPLE);
  libStatus.tween=await loadSeq(TWEEN_LIB);

  try{
    const { initGame }=await import('./main.js');
    await initGame(libStatus);
  }catch(e){
    diag.textContent=STR.diagBootErrorPrefix+((e&&e.message)||e);
    setMenuLoad(STR.diagBootErrorPrefix+((e&&e.message)||e));
  }
})();
