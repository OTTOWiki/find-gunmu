/* ==========================================================================
   入口：按依赖顺序初始化全部模块
   （由原 window.startGame 的调用顺序整理而来）
   ========================================================================== */
import { applyStaticStrings } from './core.js';
import { STR } from './strings.js';
import { showErr } from './diag.js';
import { initRenderer, resize } from './render.js';
import { initPost } from './post.js';
import { initParticles } from './particles.js';
import { initPlayer } from './player.js';
import { initWorld } from './maze.js';
import { setupLevel } from './entities.js';
import { initControls } from './controls.js';
import { startLoop } from './visuals.js';

export function initGame(){
  applyStaticStrings();

  if(!initRenderer())return;   // WebGL 不可用，直接停在提示信息上

  initPost();
  initParticles();
  initPlayer();
  initControls();

  try{
    initWorld();
    setupLevel(1,true);
  }catch(e){showErr(STR.errTagInit,e);}

  window.addEventListener('resize',resize);
  window.addEventListener('orientationchange',function(){setTimeout(resize,250);});
  if(window.visualViewport)visualViewport.addEventListener('resize',resize);

  startLoop();
}
