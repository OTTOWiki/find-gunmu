/* ==========================================================================
   MODULE 0: 全局单一字符串字典 (Centralized String Dictionary)
   集中管理全部可展示文案；字典内容请勿随意修改。
   （由原单文件 index.html 拆分而来，模块划分沿用原始 MODULE 编号）
   ========================================================================== */

window.GAME_STRINGS = {
  // 基础与窗口标题
  docTitle: '寻找棍母 · 超能漫步版',
  engineVersion: 'gunmugunmu',

  // 界面静态标签与引导
  hudLevel: '层级',
  hudGoal: '目标',
  blankInitial: '_________',
  blankFound: '棍母',
  startTitle: '寻找棍母',
  startTag: '超能漫步版',
  startBang: '!寻找棍母!',
  startLead1: '穿梭飞门，在暗影回廊中寻回你的 ',
  startLead2: ' ...',
  startHintDesktop: '长按空格极速连跳 ｜ 甩尾转向保留强大 G 力惯性 ｜ Q 轮椅冲撞',
  startHintTouch: '左半屏摇杆 ｜ 右半屏滑动转向 ｜ 长按 ⬆️ 连跳 | 投稿方:143 | 制作:【芙兰朵露斯卡雷特】 https://www.ottohub.cn/u/633 | 引流 https://wiki.ottohub.cn',
  toastTip: '⚡ 连跳 + 旋转视角即可充能!',

  // 主菜单：模式选择 / 玩法说明 / 设置
  menuNormalTitle: '正式模式',
  menuNormalDesc: '90 秒倒计时 · 冲击更深层级',
  menuPracticeTitle: '练习模式',
  menuPracticeDesc: '时间不限 · 自由探索练习',
  menuRule1: '目标：集齐 5 个棍母 → 飞门轰鸣开启 → 冲进下一层',
  menuRule2: '正式模式 90 秒倒计时，归零即「你迷失了」；练习模式时间不限，被哇袄撞到不再扣时间',
  menuRule3: 'HUD 统计：GPM = 每分钟获得棍母数 ×10 ｜ WAPM = 每分钟被哇袄撞击数 ×10',
  soundOn: '音效：开',
  soundOff: '音效：关',
  btnExit: '退出',
  btnMenu: '返回主菜单',

  // 结算与飞门
  gateEntering: '进入飞门...',
  gateClear: function(lv){ return '层级 ' + lv + ' · 棍母已集齐<br>飞门轰鸣开启 →'; },
  lostTitle: '你迷失了...',
  lostLevelLabel: '到达层级',
  lostCountLabel: '收集棍母',
  btnRetry: '重新挑战',

  // 技能按钮名称
  skNut: '槟榔',
  skBox: '韭菜盒子',
  skDash: '冲刺',
  skJump: '飞',

  // HUD 桌面端按键与冷却提示
  desktopControlsGuide: 'WASD 移动 | 鼠标 转向 | 左键 韭菜盒子 | 右键 槟榔 | 空格 连跳甩尾 | Q 轮椅猛冲',
  pillBoxReady: '左键 韭菜盒子 就绪',
  pillBoxCd: function(s){ return '左键 韭菜盒子 ' + s + 's'; },
  pillNutReady: '右键 槟榔 就绪',
  pillNutActive: '右键 槟榔 狂暴加速!',
  pillNutCd: function(s){ return '右键 槟榔 ' + s + 's'; },
  pillDashReady: 'Q 轮椅猛冲 就绪',
  pillDashActive: 'Q 冲刺!',
  pillDashCd: function(s){ return 'Q 冲刺 ' + s + 's'; },

  // HUD 动态文本片段
  hudMeterUnit: 'm',
  hudSpeedUnit: ' m/s @ ',
  hudTimeUnlimited: '不限时',
  hudGpmLabel: 'GPM×10',
  hudWapmLabel: 'WAPM×10',

  // 浮动战况飘字消息
  msgJumpCombo: function(c){ return '⚡ 飞' + c+'分钱'; },
  msgNutBoost: '🌰 wc槟！',
  msgDashSmash: '💥 我创撕你的面!',
  msgCollect: '✨ 棍母 +1',
  msgHurt: '💀 哇袄 -5秒!',
  msgHurtPractice: '💀 哇袄！',
  msgBoxHit: '🎯 击败!',

  // 诊断与运行错误告警
  diagInit: '别急...',
  diagLoadingLibs: '正在加载lib...',
  diagWebGLError: '⚠ WebGL 不可用，请开启浏览器硬件加速',
  diagModelFallback: 'daoli.glb 加载跳过，启用保底模型',
  diagCoreLibBlocked: '⚠ Three.js 核心库加载受阻，请检查网络',
  diagBootErrorPrefix: '⚠ 启动异常: ',
  diagDiagPrefix: '干飞马 · ',

  // 模块异常标签
  errTagModel: '模型解析',
  errTagGLTF: 'GLTF',
  errTagGate: '飞门',
  errTagLevel: '关卡',
  errTagPhysics: '物理',
  errTagRender: '渲染',
  errTagFrame: '帧',
  errTagPost: '后期',
  errTagInit: '初始化'
};

export const STR = window.GAME_STRINGS;
