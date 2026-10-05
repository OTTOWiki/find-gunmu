/* ==========================================================================
   CORE: DOM 工具 / 视口与触屏判定 / 静态文案注入
   原 window.startGame 开头的公共部分。
   （由原单文件 index.html 拆分而来，模块划分沿用原始 MODULE 编号）
   ========================================================================== */

import { STR } from './strings.js';

export const $ = function(id){return document.getElementById(id);};
export let W=innerWidth,H=innerHeight;
export let isTouch=matchMedia('(pointer:coarse)').matches||(('ontouchstart'in window)&&navigator.maxTouchPoints>0);
if(isTouch)document.body.classList.add('touch');
window.addEventListener('touchstart',function(){if(!isTouch){isTouch=true;document.body.classList.add('touch');}},{once:true,passive:true});

// 将字典文本注入静态 DOM
export function applyStaticStrings(){
  document.title=STR.docTitle;
  $('diag').textContent=STR.diagInit;
  $('lb-level').textContent=STR.hudLevel;
  $('lb-goal').textContent=STR.hudGoal;
  $('pill-guide').textContent=STR.desktopControlsGuide;
  $('pill-box').textContent=STR.pillBoxReady;
  $('pill-nut').textContent=STR.pillNutReady;
  $('pill-dash').textContent=STR.pillDashReady;
  $('sk-lb-nut').textContent=STR.skNut;
  $('sk-lb-box').textContent=STR.skBox;
  $('sk-lb-dash').textContent=STR.skDash;
  $('sk-lb-jump').textContent=STR.skJump;
  $('toast').textContent=STR.toastTip;
  $('st-h1').childNodes[0].nodeValue=STR.startTitle+' ';
  $('st-tag').textContent=STR.startTag;
  $('st-bang').textContent=STR.startBang;
  $('st-lead1').textContent=STR.startLead1;
  $('st-lead2').textContent=STR.startLead2;
  $('blank').textContent=STR.blankInitial;
  $('st-hint-d').textContent=STR.startHintDesktop;
  $('st-hint-t').textContent=STR.startHintTouch;
  $('btn-mode-normal-t').textContent=STR.menuNormalTitle;
  $('btn-mode-normal-d').textContent=STR.menuNormalDesc;
  $('btn-mode-practice-t').textContent=STR.menuPracticeTitle;
  $('btn-mode-practice-d').textContent=STR.menuPracticeDesc;
  $('st-rule-1').textContent=STR.menuRule1;
  $('st-rule-2').textContent=STR.menuRule2;
  $('st-rule-3').textContent=STR.menuRule3;
  $('btn-sound').textContent=STR.soundOn;
  $('btn-exit').textContent=STR.btnExit;
  $('st-foot').textContent=STR.engineVersion;
  $('lost-title').textContent=STR.lostTitle;
  $('lost-lb-lv').textContent=STR.lostLevelLabel;
  $('lost-lb-cnt').textContent=STR.lostCountLabel;
  $('btn-retry').textContent=STR.btnRetry;
  $('btn-menu').textContent=STR.btnMenu;
  $('lost-foot').textContent=STR.engineVersion;
}
export function setViewport(w,h){W=w;H=h;}
