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

## 资源加载

开局前会**先把全部素材加载完**，主菜单的进度行会实时显示 `正在加载素材 n/4`，
加载完成前开始按钮不可点（`body[data-assets="loading"]`），因此不会出现「进了游戏贴图还没到」的情况。

| 资源 | 首选 | 回退 |
| --- | --- | --- |
| 棍母贴图 | `gunmu.avif`（无损 AVIF） | `gunmu.png` |
| 哇袄贴图 | `waao.avif`（无损 AVIF） | `waao.png` |
| 玩家模型 | `daoli.glb` | 程序化小人 |
| 背景音乐 | `bgm.m4a`（AAC，随仓库附带） | `bgm.mp3`（**可选**，缺失只是没有 BGM） |

- **无损 AVIF**：两张贴图用 `avifenc -l`（lossless，YUV444 全范围）从原 PNG 转换，解码后与原图**逐像素一致**（`magick compare -metric AE` = 0），体积分别减少约 16% / 9%。
- **AVIF 回退**：旧浏览器不支持 AVIF 时 `Image.onerror` 触发，自动改用同目录 PNG，不会因新格式而丢贴图。
- **不可达才降级**：只有候选地址全部失败才记入 `failedAssets`，此时菜单显示「⚠ 素材不可达：…（已启用保底素材）」、左上角诊断同步提示，游戏依然可玩。
- **BGM 是可选项**：`bgm.m4a` / `bgm.mp3` 存在就等它 `canplaythrough`（最多等 15 秒，超时按边下边播放行），不存在则菜单提示「未找到 BGM 音频（可选）」，不影响开局与其它素材。

重新生成 AVIF：

```bash
avifenc -l -s 6 -j all gunmu.png gunmu.avif   # --lossless
avifenc -l -s 6 -j all waao.png  waao.avif
# 校验无损：解码后与原 PNG 逐像素比对，AE 必须为 0
avifdec gunmu.avif /tmp/rt.png && magick compare -metric AE gunmu.png /tmp/rt.png null:
```

### 背景音乐（BGM）

当前随仓库附带 `bgm.m4a`（**composition - Surreal music** · [LorenzoMusician](https://www.youtube.com/watch?v=uI_TF6eXWGY)，
AAC-LC 44.1 kHz 立体声 · 6:04 · 129 kbps · `moov` 前置可流式播放），由 `assets` 预加载、
在开局按钮（用户手势）里 `play()` 并 `loop`，跟随主菜单的**声音**开关静音，
返回主菜单时暂停、下次开局从原位置继续。`js/bgm.js` 不做任何网络请求。

换成自己的音乐：把音频放到根目录并命名 `bgm.m4a`（或 `bgm.mp3`）即可，无需改代码；
署名文案在 `js/strings.js` 的 `bgmCredit`（仅 BGM 加载成功时才显示）。

> ⚠ **版权**：该曲目来自 YouTube，属标准 YouTube 授权（非 CC）。署名不等于获得授权，
> 公开部署/商业使用请自行取得权利人许可，或改用 CC0 / CC-BY / 已获授权的音乐并相应更新署名。

重新生成（需要能访问 YouTube 的 yt-dlp，建议用 GitHub 上的新版；本机实测 `--js-runtimes node` + master 分支可绕过部分 403）：

```bash
# 取音频流（140 = AAC 129k）并重封装为可流式播放的 m4a
yt-dlp --js-runtimes node -f 140 -o src.m4a "https://www.youtube.com/watch?v=uI_TF6eXWGY"
ffmpeg -v error -i src.m4a -c copy -movflags +faststart bgm.m4a
ffprobe bgm.m4a   # 确认 aac / 44100 Hz / stereo / 364s
```

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
│   ├── main.js         # initGame()：初始化各模块 → 预加载素材 → 构建世界并开放开局
│   ├── assets.js       # MODULE 13 资源预加载（AVIF→PNG 回退、进度、不可达清单）
│   ├── bgm.js          # MODULE 14 背景音乐（循环、跟随声音开关、回菜单暂停）
│   ├── strings.js      # MODULE 0  全局字符串字典
│   ├── core.js         # CORE      DOM 工具 / 视口尺寸 / 触屏判定 / 静态文案注入
│   ├── diag.js         # MODULE 1  错误上报、FPS 诊断、振动
│   ├── audio.js        # MODULE 2  WebAudio 音效合成
│   ├── render.js       # MODULE 3  渲染器 / 场景 / 相机 / 灯光
│   ├── post.js         # MODULE 4  后期着色管线（拖影、色差、暗角、噪点）
│   ├── particles.js    # MODULE 5  点精灵粒子池
│   ├── player.js       # MODULE 6  玩家模型（预加载 GLB + 保底小人）
│   ├── maze.js         # MODULE 7  程序化无限迷宫、材质、物品与敌人精灵
│   ├── physics.js      # MODULE 8  移动 / 碰撞 / 跳跃 / 冲刺 / 相机震动状态
│   ├── entities.js     # MODULE 9  关卡生成、收集、敌人 AI、投掷物、结算
│   ├── controls.js     # MODULE 10 摇杆 / 键鼠 / 技能按钮 / 全屏
│   ├── visuals.js      # MODULE 11 相机运动、HUD、主更新与渲染循环
│   └── ...
├── daoli.glb           # 玩家模型（不可达时回退到程序化小人）
├── gunmu.avif          # 「棍母」贴图（无损 AVIF，收集物）
├── gunmu.png           #   └ 回退源图
├── waao.avif           # 「哇袄」贴图（无损 AVIF，敌人）
├── waao.png            #   └ 回退源图
└── bgm.m4a           # 背景音乐（AAC，见「背景音乐」；来源与授权提醒见该节）
```

---

## 启动流程

```
index.html
  └─ <script type="module" src="js/boot.js">
       ├─ 依次尝试多个 CDN 加载 three.js → GLTFLoader → nipplejs → tween.js
       └─ 全部尝试完成后 await import('./main.js') → initGame(libStatus)
            ├─ applyStaticStrings()          注入全部界面文案（含主菜单）
            ├─ initRenderer()                WebGL 不可用时直接中止
            ├─ initPost() / initParticles() / initPlayer() / initControls()
            ├─ await preload()               等待全部可达素材（菜单显示 n/3，按钮暂不可点）
            ├─ applyPlayerModel() / initWorld() + setupLevel(1)
            ├─ 标记 data-assets=ready|partial 并提示不可达资源
            └─ startLoop()                   启动 requestAnimationFrame 主循环
```

初始 `state='start'`，主菜单覆盖层可见；素材加载完成前模式按钮不可点，就绪后点
「正式模式 / 练习模式」按钮（或结算页按钮）才会 `startRun(mode)` 进入 `gate → playing`。
主循环始终在渲染，但 `physics` / `entities` 只在 `playing` 状态更新。

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
| `assets` | `preload(onProgress)` | 并行加载全部素材，返回 `{total,failed,missingOptional}`；可达的全部完成后才 resolve |
| `assets` | `isReady()` / `assets` / `failedAssets` / `missingOptional` | 是否已加载完 / 已加载的贴图·模型·BGM / 必需资源不可达清单 / 可选资源缺失清单 |
| `bgm` | `initBgm()` / `startBgm()` | 接上预加载的音频元素；在开局手势里开始循环播放 |
| `bgm` | `refreshBgmMute()` / `stopBgm()` | 跟随声音开关静音；返回主菜单时暂停 |
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
`daoli.glb` / `gunmu.avif`（或回退 `gunmu.png`）/ `waao.avif`（或回退 `waao.png`）必须与 `index.html` 同目录。
主菜单会显示「⚠ 素材不可达：…（已启用保底素材）」，此时贴图回退到程序化占位，游戏仍可玩；
把缺失文件补齐后刷新即可。

**浏览器不支持 AVIF**
会自动改用同目录 PNG（`Image.onerror` 回退），无需手动处理。

---

## 开发提示

- 新增一个模块：在 `js/` 下建文件，用 `export` 暴露接口，并在 `main.js` 的 `initGame()` 里按需调用其 `init*()`。
- 新增素材：把文件放进仓库根目录，并在 `js/assets.js` 的 `RESOURCES` 里登记（可选多个候选地址组成回退链；`optional:true` 表示缺失不报错）。
- 需要其它模块的状态时：只读就 `import`，要写入就调用对方导出的函数（见「模块状态约定」）。
- 文案统一放在 `js/strings.js`，界面与提示不要在业务代码里硬编码。
- 语法自检：`for f in js/*.js; do node --check "$f"; done`
