/* ==========================================================================
   MODULE 2: 空间音频合成引擎
   全部音效由 WebAudio 实时合成，无外部音频资源。
   （由原单文件 index.html 拆分而来，模块划分沿用原始 MODULE 编号）
   ========================================================================== */

import { p } from './physics.js';

var ac=null,noiseBuf=null,windGain=null,windFilter=null,skidGain=null,skidFilter=null,droneGain=null,droneOsc=null;
var masterGain=null,muted=false;
var MUTE_KEY='gunmu.muted';
try{muted=localStorage.getItem(MUTE_KEY)==='1';}catch(e){}

// 全部音效统一汇入 master gain，用于「音效：关」静音
function out(){
  if(!masterGain){masterGain=ac.createGain();masterGain.gain.value=muted?0:1;masterGain.connect(ac.destination);}
  return masterGain;
}
export function isMuted(){return muted;}
export function setMuted(v){
  muted=!!v;
  try{if(masterGain)masterGain.gain.value=muted?0:1;}catch(e){}
  try{localStorage.setItem(MUTE_KEY,muted?'1':'0');}catch(e){}
}
// 离开游戏（结算 / 返回主菜单）时关闭持续性的环境音，避免菜单里还在刮风
export function silenceAmbient(){
  if(!ac)return;try{
    if(windGain)windGain.gain.setTargetAtTime(0,ac.currentTime,.05);
    if(skidGain)skidGain.gain.setTargetAtTime(0,ac.currentTime,.05);
    if(droneGain)droneGain.gain.setTargetAtTime(0,ac.currentTime,.05);
  }catch(e){}
}
export function initAudio(){
  try{
    if(!ac)ac=new(window.AudioContext||window.webkitAudioContext)();
    if(ac.state==='suspended')ac.resume();
    if(!noiseBuf){
      var len=ac.sampleRate*2;
      noiseBuf=ac.createBuffer(1,len,ac.sampleRate);
      var d=noiseBuf.getChannelData(0);
      for(var i=0;i<len;i++)d[i]=Math.random()*2-1;
    }
    if(!windGain){
      var wSrc=ac.createBufferSource();wSrc.buffer=noiseBuf;wSrc.loop=true;
      windFilter=ac.createBiquadFilter();windFilter.type='bandpass';windFilter.frequency.value=280;windFilter.Q.value=1.2;
      windGain=ac.createGain();windGain.gain.value=0;
      wSrc.connect(windFilter);windFilter.connect(windGain);windGain.connect(out());
      wSrc.start();
    }
    if(!skidGain){
      var sSrc=ac.createBufferSource();sSrc.buffer=noiseBuf;sSrc.loop=true;
      skidFilter=ac.createBiquadFilter();skidFilter.type='bandpass';skidFilter.frequency.value=1200;skidFilter.Q.value=3.5;
      skidGain=ac.createGain();skidGain.gain.value=0;
      sSrc.connect(skidFilter);skidFilter.connect(skidGain);skidGain.connect(out());
      sSrc.start();
    }
    if(!droneGain){
      droneOsc=ac.createOscillator();droneOsc.type='sawtooth';droneOsc.frequency.value=48;
      var dFilt=ac.createBiquadFilter();dFilt.type='lowpass';dFilt.frequency.value=110;
      droneGain=ac.createGain();droneGain.gain.value=0.03;
      droneOsc.connect(dFilt);dFilt.connect(droneGain);droneGain.connect(out());
      droneOsc.start();
    }
  }catch(e){}
}

export function playSubBass(fStart,fEnd,dur,vol){
  if(!ac)return;try{
    var t=ac.currentTime,o=ac.createOscillator(),g=ac.createGain();
    o.type='sine';o.frequency.setValueAtTime(fStart||95,t);
    o.frequency.exponentialRampToValueAtTime(Math.max(15,fEnd||28),t+dur);
    g.gain.setValueAtTime(vol||.35,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    o.connect(g).connect(out());o.start(t);o.stop(t+dur);
  }catch(e){}
}

export function playHeavyImpact(strength){
  if(!ac)return;try{
    var t=ac.currentTime;playSubBass(120,25,.35,Math.min(.6,.25+strength*.2));
    if(noiseBuf){
      var src=ac.createBufferSource();src.buffer=noiseBuf;
      var f=ac.createBiquadFilter();f.type='lowpass';
      f.frequency.setValueAtTime(800,t);f.frequency.exponentialRampToValueAtTime(80,t+.2);
      var g=ac.createGain();g.gain.setValueAtTime(.35,t);g.gain.exponentialRampToValueAtTime(.001,t+.22);
      src.connect(f);f.connect(g);g.connect(out());
      src.start(t,Math.random());src.stop(t+.23);
    }
  }catch(e){}
}

export function playStep(alt){
  if(!ac||!noiseBuf)return;try{
    var t=ac.currentTime,src=ac.createBufferSource();src.buffer=noiseBuf;
    var f=ac.createBiquadFilter();f.type='lowpass';f.frequency.value=alt?420:320;
    var g=ac.createGain(),v=.12+Math.min(.18,Math.hypot(p.vx,p.vz)*.01);
    g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+.08);
    src.connect(f);f.connect(g);g.connect(out());
    src.start(t,Math.random()*.5);src.stop(t+.09);
    playSubBass(alt?75:65,30,.07,.12);
  }catch(e){}
}

export function playLand(imp){
  if(!ac)return;try{
    var t=ac.currentTime,v=Math.min(.55,.15+imp*.04);
    playSubBass(110,22,.28,v*.9);
    if(noiseBuf){
      var src=ac.createBufferSource();src.buffer=noiseBuf;
      var f=ac.createBiquadFilter();f.type='lowpass';
      f.frequency.setValueAtTime(950,t);f.frequency.exponentialRampToValueAtTime(90,t+.22);
      var g=ac.createGain();g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+.24);
      src.connect(f);f.connect(g);g.connect(out());
      src.start(t,Math.random()*.3);src.stop(t+.25);
    }
  }catch(e){}
}

export function playDashSFX(){
  if(!ac)return;try{
    var t=ac.currentTime;
    playSubBass(140,25,.45,.6);
    var o=ac.createOscillator(),g=ac.createGain();
    o.type='sawtooth';o.frequency.setValueAtTime(180,t);o.frequency.exponentialRampToValueAtTime(650,t+.15);
    o.frequency.exponentialRampToValueAtTime(80,t+.45);
    var f=ac.createBiquadFilter();f.type='bandpass';f.frequency.value=450;f.Q.value=2.0;
    g.gain.setValueAtTime(.25,t);g.gain.exponentialRampToValueAtTime(.001,t+.45);
    o.connect(f).connect(g).connect(out());
    o.start(t);o.stop(t+.46);
  }catch(e){}
}

export function playNutSFX(){
  if(!ac)return;try{
    for(var i=0;i<3;i++){
      (function(idx){
        setTimeout(function(){
          if(!ac)return;
          var t2=ac.currentTime,o=ac.createOscillator(),g=ac.createGain();
          o.type='square';o.frequency.setValueAtTime(500+Math.random()*400,t2);o.frequency.exponentialRampToValueAtTime(120,t2+.06);
          g.gain.setValueAtTime(.18,t2);g.gain.exponentialRampToValueAtTime(.001,t2+.06);
          o.connect(g).connect(out());o.start(t2);o.stop(t2+.07);
        },idx*70);
      })(i);
    }
    setTimeout(function(){playSubBass(80,180,.35,.35);},220);
  }catch(e){}
}

export function playCollectSFX(){
  if(!ac)return;try{
    playSubBass(120,40,.25,.3);
    var notes=[523.25, 659.25, 783.99, 1046.50];
    notes.forEach(function(freq,idx){
      setTimeout(function(){
        if(!ac)return;
        var t=ac.currentTime,o=ac.createOscillator(),g=ac.createGain();
        o.type='triangle';o.frequency.setValueAtTime(freq,t);
        g.gain.setValueAtTime(.15,t);g.gain.exponentialRampToValueAtTime(.001,t+.22);
        o.connect(g).connect(out());o.start(t);o.stop(t+.23);
      },idx*45);
    });
  }catch(e){}
}

export function playThrowSFX(){
  if(!ac)return;try{
    var t=ac.currentTime,o=ac.createOscillator(),g=ac.createGain();
    o.type='sine';o.frequency.setValueAtTime(450,t);o.frequency.exponentialRampToValueAtTime(150,t+.16);
    g.gain.setValueAtTime(.2,t);g.gain.exponentialRampToValueAtTime(.001,t+.16);
    o.connect(g).connect(out());o.start(t);o.stop(t+.17);
  }catch(e){}
}

export function playHurtSFX(){
  if(!ac)return;try{
    var t=ac.currentTime;playSubBass(150,20,.5,.7);
    var o=ac.createOscillator(),g=ac.createGain();
    o.type='sawtooth';o.frequency.setValueAtTime(90,t);o.frequency.linearRampToValueAtTime(40,t+.35);
    g.gain.setValueAtTime(.35,t);g.gain.exponentialRampToValueAtTime(.001,t+.35);
    o.connect(g).connect(out());o.start(t);o.stop(t+.36);
  }catch(e){}
}
// 由主循环每帧调用：根据速度 / 漂移 / 冲刺 / 剩余时间驱动环境音量
export function updateAudio(hs,dashing,yawVelS,time){
  if(!ac)return;
  if(windGain){
    var twg=(hs>8?Math.min(.18,(hs-8)*.014):0)+(dashing?.12:0);
    windGain.gain.setTargetAtTime(twg,ac.currentTime,.1);
    windFilter.frequency.setTargetAtTime(260+hs*48,ac.currentTime,.1);
  }
  if(skidGain){
    var isDrifting=(Math.abs(yawVelS)>1.4&&hs>7.5)||dashing;
    var tsg=isDrifting?Math.min(.16,Math.abs(yawVelS)*.035):0;
    skidGain.gain.setTargetAtTime(tsg,ac.currentTime,.08);
  }
  if(droneGain){
    droneGain.gain.setTargetAtTime(time<15?0.09:0.03,ac.currentTime,.2);
  }
}
