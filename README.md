# 寻找棍母 · 超能漫步版

> OWOW 小游戏之「寻找棍母」。穿梭飞门，在暗影回廊中集齐 5 个 **棍母**，一路向下抵达更深的层级。

一个纯静态、零构建的 3D 网页小游戏：Three.js 渲染 + 自研物理/迷宫生成 + WebAudio 实时合成音效。
代码已从单文件 `index.html` 拆分为 **ES Module** 多文件结构。

---

## 游戏模式

打开页面先进入**主菜单**（模式按钮 + 玩法说明 + 音效开关），点按钮才开局：

| 模式 | 规则 |
| --- | --- |
| 正式模式 | 90 秒倒计时，归零即「你迷失了」；结算页可「重新挑战」或「返回主菜单」 |
| 练习模式 | **时间不限**，被哇袄撞到仍然受伤/击退，但不再扣时间；可自由推层 |

两种模式下集齐 5 个棍母都会开启飞门进入下一层。HUD 第二行显示本局实时统计：

- **GPM×10** = 每分钟获得棍母数 ×10
- **WAPM×10** = 每分钟被哇袄撞击数 ×10

游戏中随时可以点 HUD 右上角「退出」或按 `Esc` 返回主菜单（正式模式中途退出视为放弃本局；
桌面端指针锁定时第一次 `Esc` 只解锁指针）。

---

## 快速开始

ES Module 受同源策略限制，**不能用 `file://` 直接双击打开**，必须通过 HTTP 访问（不需要任何构建步骤）：

```bash
# 任选一种，在本目录下起一个静态服务器
python3 -m http.server 8000
npx serve .
```

然后浏览器打开 <http://localhost:8000/>。

部署同理：把仓库根目录原样发布到 GitHub Pages / 任意静态托管即可（没有打包产物，源码即发布内容）。

> 首次进入需要联网：`three.js` / `GLTFLoader` / `nipplejs` / `tween.js` 通过多 CDN 容灾加载。

---

## 操作方式

| 操作 | 桌面端 | 触屏 |
| --- | --- | --- |
| 移动 | `WASD` / 方向键 | 左半屏摇杆 |
| 转向 | 鼠标（点击画面锁定指针） | 右半屏滑动 |
| 跳跃 / 连跳 | `空格`（长按极速连跳） | 长按 ⬆️ |
| 韭菜盒子（投掷） | 鼠标左键 | 🥟 按钮 |
| 槟榔（狂暴加速） | 鼠标右键 | 🌰 按钮 |
| 轮椅猛冲 | `Q` | 🦽 按钮 |
| 返回主菜单 | `Esc` / HUD「退出」 | HUD「退出」 |
| 全屏 | — | 右上角 ⛶ |

小技巧：**连跳 + 旋转视角可以给画面充能**（拖影/速度感），甩尾转向会保留很强的 G 力惯性。

---

## 目录结构

```
.
├── index.html          # 页面骨架：只放 DOM + 样式链接 + <script type="module" src="js/boot.js">
├── css/
│   └── style.css       # 全部界面样式（原 <style> 内容）
├── js/
│   ├── boot.js         # 入口：多 CDN 容灾加载三方库 → 动态 import main.js
│   ├── main.js         # initGame()：按依赖顺序初始化各模块
│   ├── strings.js      # MODULE 0  全局字符串字典
│   ├── core.js         # CORE      DOM 工具 / 视口尺寸 / 触屏判定 / 静态文案注入
│   ├── diag.js         # MODULE 1  错误上报、FPS 诊断、振动
│   ├── audio.js        # MODULE 2  WebAudio 音效合成
│   ├── render.js       # MODULE 3  渲染器 / 场景 / 相机 / 灯光
│   ├── post.js         # MODULE 4  后期着色管线（拖影、色差、暗角、噪点）
│   ├── particles.js    # MODULE 5  点精灵粒子池
│   ├── player.js       # MODULE 6  玩家模型（GLB + 保底模型）
│   ├── maze.js         # MODULE 7  程序化无限迷宫、材质、物品与敌人精灵
│   ├── physics.js      # MODULE 8  移动 / 碰撞 / 跳跃 / 冲刺 / 相机震动状态
│   ├── entities.js     # MODULE 9  关卡生成、收集、敌人 AI、投掷物、结算
│   ├── controls.js     # MODULE 10 摇杆 / 键鼠 / 技能按钮 / 全屏
│   ├── visuals.js      # MODULE 11 相机运动、HUD、主更新与渲染循环
│   └── ...
├── daoli.glb           # 玩家模型（加载失败时自动回退到程序化小人）
├── gunmu.png           # 「棍母」贴图（收集物）
└── waao.png            # 「哇袄」贴图（敌人）
```

---

## 启动流程

```
index.html
  └─ <script type="module" src="js/boot.js">
       ├─ 依次尝试多个 CDN 加载 three.js → GLTFLoader → nipplejs → tween.js
       └─ 全部尝试完成后 await import('./main.js') → initGame()
            ├─ applyStaticStrings()          注入全部界面文案（含主菜单）
            ├─ initRenderer()                WebGL 不可用时直接中止
            ├─ initPost() / initParticles() / initPlayer() / initControls()
            ├─ initWorld() + setupLevel(1)   生成迷宫与第 1 层
            └─ startLoop()                   启动 requestAnimationFrame 主循环
```

初始 `state='start'`，主菜单覆盖层可见；点「正式模式 / 练习模式」按钮（或结算页按钮）
才会 `startRun(mode)` 进入 `gate → playing`。主循环始终在渲染，但 `physics` / `entities`
只在 `playing` 状态更新。

三方库以传统 `<script>` 方式注入，暴露为全局变量（`THREE` / `nipplejs` / `TWEEN`），
游戏模块直接引用这些全局对象，因此**不需要打包器**。

---

## 模块状态约定

拆分前所有代码共享同一个 `window.startGame` 闭包，变量可以随意读写；
ES Module 的 `import` 绑定是**只读**的，因此约定：

- **只读共享**：其它模块只读取的值，直接用 `export let` / `export const` 导出，按需 `import`。
  例如 `p`（玩家）、`state`（全局状态）、`level`/`goal`/`time`、`items`/`enemies`/`projs`、各种冷却值。
  对象内部属性（如 `p.x`、`enemies[i].alive`）可直接修改。
- **跨模块写入**：一律通过所属模块导出的函数完成，不直接赋值。

关键写入 API：

| 所属模块 | API | 作用 |
| --- | --- | --- |
| `physics` | `setState(s)` | 切换游戏状态（start / playing / gate / lost） |
| `physics` | `addTrauma(v)` / `decayTrauma(dt)` | 相机震动的叠加与衰减 |
| `physics` | `hurt()` / `decayHurt(dt)` | 受击红屏与衰减 |
| `physics` | `decayCamDip(dt)` / `decayFovKick(dt)` / `decayImpact(dt)` | 各类镜头反馈衰减 |
| `physics` | `bufferJump(t)` / `resetJumpTimers()` / `resetCombo()` | 跳跃缓冲、土狼时间、连跳计数 |
| `physics` | `eatNut()` / `doDash()` | 槟榔加速 / 轮椅猛冲 |
| `entities` | `setupLevel(lv,fresh)` / `tickClock(dt)` | 关卡生成、倒计时与本局统计（GPM/WAPM） |
| `entities` | `startRun(mode)` | 开始一局；`mode` 为 `'normal'`（正式）或 `'practice'`（练习，时间不限） |
| `entities` | `gotoMenu()` | 本局作废并返回主菜单（playing / lost 状态可用） |
| `audio` | `setMuted(v)` / `isMuted()` | 全局音效开关（经 master gain，写入 `localStorage['gunmu.muted']`） |
| `audio` | `silenceAmbient()` | 结算 / 返回菜单时关闭风声、漂移声与底噪 |
| `maze` | `setHue(h)` | 关卡色相（同时更新场景背景与雾色） |
| `maze` | `setCeilingFlicker(flick)` / `scrollWorldTo(x,z)` / `syncSprites(...)` | 天花板灯、地板滚动、实体精灵同步 |
| `post` | `setMotionBlur(...)` / `resetMotionBlur()` | 拖影强度与切层重置 |
| `player` | `posePlayer(...)` | 模型位置 / 朝向 / 倾斜 / 落地压扁 |
| `controls` | `applyLookToPlayer()` | 消费触屏滑动位移并转向 |
| `diag` | `showErr(tag,e)` / `setDiagErr(msg)` / `updateDiagnostics(now,state)` | 诊断与错误上报 |

模块之间存在少量循环依赖（如 `physics ↔ entities ↔ controls`、`render ↔ post`、`maze ↔ physics`），
但都只在**运行时函数调用**阶段互相访问，不涉及模块求值期的顶层读取，因此是安全的。

---

## 与单文件版本的差异

拆分遵循「原样搬迁」原则：原 MODULE 0–11 的代码按行区间整体切出，逻辑未重写。仅做了以下必要调整：

1. 跨模块共享状态改为「只读导入 + 函数写入」（见上表）。
2. `resize` 及其窗口监听从 `visuals` 移到 `render` / `main`；`resizeTargets()` 归 `post`。
3. 场景背景与雾色的更新由 `setupLevel` 移入 `maze.setHue()`。
4. FPS 统计与诊断文本刷新从主循环抽成 `diag.updateDiagnostics()`。
5. 删除了从未被读写的死变量 `projMeshes`。
6. 唯一对外入口由 `window.startGame()` 变为 `boot.js` → `main.js` 的 `initGame()`（不再挂到 window）。

---

## 常见问题

**页面全白 / 控制台报 `Failed to resolve module specifier`**
用 `file://` 打开了页面。请改用 HTTP 服务器（见「快速开始」）。

**画面提示“Three.js 核心库加载受阻”**
四个 CDN 都没连上，检查网络/代理；也可在 `js/boot.js` 的 `CORE` 列表里补一个镜像地址。

**提示“WebGL 不可用”**
浏览器未开启硬件加速，或设备不支持 WebGL。

**模型/贴图没加载出来**
`daoli.glb` / `gunmu.png` / `waao.png` 必须与 `index.html` 同目录；加载失败会自动回退到程序化模型或保真贴图占位，游戏仍可玩。

---

## 开发提示

- 新增一个模块：在 `js/` 下建文件，用 `export` 暴露接口，并在 `main.js` 的 `initGame()` 里按需调用其 `init*()`。
- 需要其它模块的状态时：只读就 `import`，要写入就调用对方导出的函数（见「模块状态约定」）。
- 文案统一放在 `js/strings.js`，界面与提示不要在业务代码里硬编码。
- 语法自检：`for f in js/*.js; do node --check "$f"; done`
