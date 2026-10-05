/* ==========================================================================
   MODULE 13: 资源预加载
   本地素材（贴图 / 模型）在开局前统一加载并统计：
   - 可达的资源必须全部加载完成，加载期间主菜单的开始按钮保持禁用；
   - 不可达的资源记入 failedAssets，启用保底素材，并在菜单与诊断里明确提示。
   贴图优先使用无损 AVIF，浏览器不支持（onerror）或缺文件时自动回退旧 PNG。
   ========================================================================== */

const RESOURCES=[
  {key:'gunmu',kind:'image',urls:['./gunmu.avif','./gunmu.png']},
  {key:'waao', kind:'image',urls:['./waao.avif','./waao.png']},
  {key:'model',kind:'glb',  urls:['./daoli.glb']}
];

export const assets={};        // key -> THREE.Texture（贴图）/ GLTF 结果（模型）
export const assetUrl={};      // key -> 实际生效的 URL，便于诊断
export const failedAssets=[];  // 不可达的 key 列表
let ready=false;

export function isReady(){return ready;}
export function assetTotal(){return RESOURCES.length;}

function loadImage(url){
  return new Promise(function(resolve,reject){
    var img=new Image();
    img.onload=function(){resolve(img);};
    img.onerror=function(){reject(new Error(url));};
    img.src=url;
  });
}
function loadGLB(url){
  return new Promise(function(resolve,reject){
    if(!window.THREE||!THREE.GLTFLoader)return reject(new Error('GLTFLoader'));
    try{
      new THREE.GLTFLoader().load(url,resolve,undefined,function(){reject(new Error(url));});
    }catch(e){reject(e);}
  });
}

// 依次尝试该资源的候选地址，全部失败才判定为不可达
function loadRes(res){
  var i=0;
  return (function next(){
    if(i>=res.urls.length)return Promise.reject(new Error(res.key));
    var url=res.urls[i++];
    return (res.kind==='image'?loadImage(url):loadGLB(url)).then(function(value){
      assetUrl[res.key]=url;
      if(res.kind==='image'){
        var t=new THREE.Texture(value);
        t.needsUpdate=true;t.encoding=THREE.sRGBEncoding;
        assets[res.key]=t;
      }else{
        assets[res.key]=value;
      }
    },next);
  })();
}

// 并行加载全部素材；onProgress(done,total,key) 用于菜单进度提示
export function preload(onProgress){
  var done=0;
  if(onProgress)onProgress(0,RESOURCES.length,'');
  return Promise.all(RESOURCES.map(function(res){
    return loadRes(res).then(function(){},function(){failedAssets.push(res.key);}).then(function(){
      done++;
      if(onProgress)onProgress(done,RESOURCES.length,res.key);
    });
  })).then(function(){
    ready=true;
    return {total:RESOURCES.length,failed:failedAssets.slice()};
  });
}
