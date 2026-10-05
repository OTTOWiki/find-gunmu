/* ==========================================================================
   入口：按依赖顺序初始化全部模块
   （由原 window.startGame 的调用顺序整理而来）
   资源加载完成后才构建世界并开放主菜单的开始按钮：
   可达的素材必须全部加载完，不可达的才退回保底素材。
   ========================================================================== */
import { applyStaticStrings, $ } from './core.js';
import { STR } from './strings.js';
import { showErr, setDiagErr } from './diag.js';
import { initRenderer, resize } from './render.js';
import { initPost } from './post.js';
import { initParticles } from './particles.js';
import { initPlayer, applyPlayerModel } from './player.js';
import { initWorld } from './maze.js';
import { setupLevel } from './entities.js';
import { initControls } from './controls.js';
import { startLoop } from './visuals.js';
import { preload, assets } from './assets.js';
import { initBgm } from './bgm.js';

function setLoadText(t){var el=$('st-loading');if(el)el.textContent=t;}
function setAssetsState(s){document.body.dataset.assets=s;}
function setCredit(t){var el=$('st-credit');if(el)el.textContent=t;}
function assetName(key){return (STR.assetNames&&STR.assetNames[key])||key;}

export async function initGame(libStatus){
  applyStaticStrings();

  if(!initRenderer()){         // WebGL 不可用，直接停在提示信息上
    setLoadText(STR.diagWebGLError);
    setAssetsState('partial');
    return;
  }

  setAssetsState('loading');
  initPost();
  initParticles();
  initPlayer();
  initControls();

  // 运行库缺失不阻塞游戏（各有保底实现），但必须明确告知
  var missing=[];
  if(libStatus){
    if(!libStatus.gltf)missing.push('GLTFLoader');
    if(!libStatus.nipple)missing.push('nipplejs');
    if(!libStatus.tween)missing.push('tween.js');
  }

  var rep=await preload(function(done,total){
    setLoadText(STR.assetLoading(done,total));
  });

  try{
    if(assets.model)applyPlayerModel(assets.model);
    initWorld();
    setupLevel(1,true);
  }catch(e){showErr(STR.errTagInit,e);}
  if(initBgm())setCredit(STR.bgmCredit);   // BGM 就绪才显示来源署名

  window.addEventListener('resize',resize);
  window.addEventListener('orientationchange',function(){setTimeout(resize,250);});
  if(window.visualViewport)visualViewport.addEventListener('resize',resize);

  var lost=rep.failed.map(assetName);
  if(lost.length)setLoadText(STR.assetPartial(lost.join('、')));
  else if(rep.missingOptional.length)setLoadText(STR.assetBgmMissing);
  else setLoadText(STR.assetReady);
  setAssetsState(lost.length?'partial':'ready');
  var missingAll=missing.concat(lost);
  if(missingAll.length)setDiagErr(STR.diagMissing(missingAll.join('/')));

  startLoop();
}
