# 养猫咪小游戏技术文档

## 1. 项目定位
- 项目类型: 纯前端 Canvas Web 游戏（无构建工具，直接静态资源运行）
- 核心目标: 以最小依赖实现可玩、可测试、可迭代的小游戏
- 当前主题: 养猫咪（移动、互动、养成、胜负状态）

## 2. 快速开始
1. 进入目录:
```bash
cd /Users/guangyaoli/Documents/citrolabs/cat-game
```
2. 启动服务（默认端口已改为 `5188`）:
```bash
npm run dev
```
3. 打开浏览器:
```text
http://localhost:5188
```

如果 `5188` 也冲突，可临时指定:
```bash
PORT=5188 npm run dev
```

## 3. 目录结构与职责
```text
cat-game/
├── index.html                # 页面骨架、菜单面板、canvas
├── styles.css                # 外观与布局
├── game.js                   # 核心游戏逻辑（状态、输入、更新、渲染）
├── server.js                 # 轻量静态服务器
├── package.json              # npm 脚本
├── progress.md               # 迭代进度、TODO、交接记录
├── scripts/
│   └── web_game_playwright_client.js   # Playwright 自动操作循环脚本（本地副本）
└── references/
    └── action_payloads.json            # 动作样例
```

## 4. 核心技术名词解释

### 4.1 Canvas
- `canvas` 是浏览器里的即时绘图区域。
- 这个项目把游戏画面（背景、猫咪、站点、道具、HUD）都绘制在一个 Canvas 上。

### 4.2 Game Loop（游戏循环）
- 核心流程是: `update -> draw -> 下一帧`。
- `update` 处理状态变化（移动、数值衰减、碰撞、胜负条件）。
- `draw` 负责把当前状态渲染成画面。

### 4.3 Delta Time (`dt`)
- `dt` 是两帧之间经过的时间（秒）。
- 有了 `dt`，无论设备帧率高低，逻辑速度都更稳定。

### 4.4 Deterministic Step（确定性步进）
- 项目暴露 `window.advanceTime(ms)`，允许测试脚本“精确推进”游戏时间。
- 这能降低自动化测试的不确定性（比纯依赖真实帧率稳定）。

### 4.5 `render_game_to_text`
- 项目暴露 `window.render_game_to_text()`，返回当前可交互状态的 JSON 字符串。
- 作用: 在自动测试中快速读取游戏状态，不只靠截图肉眼判断。

### 4.6 Playwright 是什么？
- Playwright 是一个浏览器自动化框架。
- 能驱动 Chromium/Chrome、Firefox、WebKit，执行点击、按键、截图、读取页面状态等动作。
- 在本项目里，Playwright 用于“自动玩游戏 + 采样状态 + 抓错误日志”的验证回路。

### 4.7 Headless / Headed
- Headless: 无界面运行浏览器，速度快，适合自动化。
- Headed: 有可见界面，便于人工观察。
- 当前脚本默认 headless，可按需切换。

## 5. 游戏架构（逻辑分层）

### 5.1 状态层（State）
- 单一 `state` 对象管理:
  - 模式: `menu / playing / paused / won / lost`
  - 玩家: 坐标、速度、半径、移动速度
  - 养成值: 饥饿、快乐、清洁、精力、健康
  - 交互: 站点、可收集物、冷却计时器
  - UI: 提示消息、分数等

### 5.2 输入层（Input）
- 键盘监听:
  - 方向键: 移动
  - `Enter`: 开始/互动/重开
  - `Space`: 抚摸
  - `A`: 暂停/继续
  - `B`: 特殊零食
  - `F`: 全屏切换

### 5.3 规则层（Simulation）
- 数值衰减规则（随时间降低部分状态）
- 站点互动规则（食物/玩具/清洁/睡觉）
- 胜负规则（健康归零失败、分数达标胜利）
- 可收集物刷出与拾取规则

### 5.4 渲染层（Render）
- 背景层
- 站点层
- 道具层
- 玩家层
- HUD 层（状态条、分数、消息）

## 6. 自动化验证流程（Playwright Loop）

核心思路:
1. 启动本地服务
2. Playwright 打开页面
3. 执行动作序列（键盘/鼠标）
4. 每轮输出:
   - 截图 (`shot-*.png`)
   - 状态 (`state-*.json`)
   - 新错误 (`errors-*.json`)
5. 发现问题后修复，再跑下一轮

示例命令:
```bash
node scripts/web_game_playwright_client.js \
  --url http://localhost:5188 \
  --actions-file references/action_payloads.json \
  --click-selector "#start-btn" \
  --iterations 3 \
  --pause-ms 250 \
  --screenshot-dir output/web-game/run-1
```

推荐的一键命令（项目内已配置）:
```bash
npm run test:playwright
```

预推送门禁（自动起临时服务并跑 smoke）:
```bash
npm run test:playwright:prepush
```

### 6.1 为什么要生成截图和 JSON？
- `shot-*.png`（截图）用于视觉回归验证。
- `state-*.json`（文本状态）用于逻辑回归验证。
- `errors-*.json`（错误日志）用于快速定位前端报错。

这三类文件一起使用，可以回答三个问题：
1. 画面看起来对不对（视觉层）。
2. 状态值和交互链路对不对（逻辑层）。
3. 控制台有没有新错误（稳定性层）。

### 6.2 每种产物怎么解读？
- `shot-*.png`:
  - 看角色、站点、UI 是否按预期显示。
  - 对比改动前后，确认没有明显视觉回退。
- `state-*.json`:
  - 核对 `mode`、`player`、`stats`、`score`、`nearestStationId` 等关键字段。
  - 验证动作后的状态变化是否符合预期（例如互动后分数变化、状态条变化）。
- `errors-*.json`:
  - 文件存在通常表示该轮捕获到新 `console.error` 或 `pageerror`。
  - 处理顺序建议：先修第一条新错误，再重跑验证。

### 6.3 什么算“测试通过”？
- 至少生成本轮预期的 `shot-*.png` 与 `state-*.json`。
- 没有 `errors-*.json`，或错误文件为空且经确认不是本次改动引入。
- 截图与 JSON 表达的状态一致（例如角色位置、模式、分数、状态值匹配）。

### 6.4 这些文件是长期保存吗？
- 默认放在 `output/web-game/...`，主要用于本地调试和回归比对。
- 一般不提交到 Git（已由 `.gitignore` 忽略 `output/`）。
- 如需留证据，可在评审时挑选关键截图手动归档到文档或 PR 描述。

## 7. Git 最佳实践（本项目建议）

### 7.1 分支策略
- 每次功能/修复一个分支:
  - 例如: `codex/cat-game-bootstrap`

### 7.2 提交粒度
- 一次提交聚焦一个意图:
  - `feat: add playable cat care core loop`
  - `fix: stabilize interaction cooldown logic`
  - `docs: add technical glossary and architecture guide`

### 7.3 提交前检查
- 至少确保:
  - 语法可通过
  - 本地服务可启动
  - Playwright 回放可跑通（截图/状态/错误输出正常）

### 7.4 不建议操作
- 不要在未确认的情况下强制覆盖历史（如 `git reset --hard`）。
- 不要把不相关改动混进同一个提交。

## 8. 常见问题（FAQ）

### Q1: 为什么要 `render_game_to_text`，截图不够吗？
- 截图适合视觉验证；JSON 状态适合逻辑验证。
- 两者结合可以更快定位问题。

### Q2: 为什么要 `advanceTime(ms)`？
- 自动测试里精确推进时间，减少帧率波动造成的偶发失败。

### Q3: Playwright 启动报浏览器缺失怎么办？
- 常见原因是未安装 Playwright 浏览器二进制。
- 本项目脚本已优先尝试系统 Chrome 路径，减少这类依赖问题。

### Q4: 端口被占用怎么办？
- 改端口即可:
```bash
PORT=5190 npm run dev
```

### Q5: Playwright 每次会自动跑吗？
- 默认不会自动跑，它是“手动触发的自动化测试”。
- 你可以在改完代码后手动执行:
```bash
npm run test:playwright
```
- 如果你希望每次提交前自动跑，可以后续加 Git hook（`pre-commit` / `pre-push`）或接入 CI。

### Q6: 这个项目现在有 push 前自动测试吗？
- 有。已配置版本化 `pre-push` hook：`/.githooks/pre-push`。
- 安装命令:
```bash
npm run hooks:install
```
- push 时会自动触发:
```bash
npm run test:playwright:prepush
```

## 9. 后续建议
- 把 `game.js` 拆分为 `state/input/update/render` 多文件，降低耦合。
- 增加更多关卡目标与事件系统（例如生病、访客、天气）。
- 增加自动化动作脚本集合（覆盖暂停、重开、胜利、失败等路径）。

## 10. 宏观技术选型与决策说明

### 10.1 当前选型清单（以及为什么）
- 运行时: 原生浏览器 + Canvas 2D  
  原因: 启动成本最低，便于快速试错玩法，不被引擎约束。
- 代码组织: 纯 JavaScript（无框架）  
  原因: 当前体量小，减少构建与依赖复杂度。
- 本地服务: `node server.js` 轻量静态服务  
  原因: 只需解决本地访问与自动化入口，不引入额外基础设施。
- 自动化验证: Playwright 冒烟 + 回放  
  原因: Web 游戏本质在浏览器中运行，Playwright 可直接覆盖真实输入和渲染结果。
- 可测性钩子: `window.render_game_to_text` + `window.advanceTime(ms)`  
  原因: 让自动化从“只能看图”升级为“图 + 状态 + 可控时间”。
- 质量门禁: Git `pre-push` 自动跑 smoke  
  原因: 在最小成本下阻止明显回归进入远端分支。

### 10.2 这些是“标准流程”吗？
- 结论: 不是唯一标准，但属于 Web 游戏团队里“务实且常见”的工程化流程。
- 行业内更普遍的是“组合拳”，而不是单工具标准:
  1. 小步迭代玩法（人工体验）
  2. 自动化冒烟（输入链路、关键状态）
  3. 错误日志门禁（console/pageerror）
  4. CI 做完整回归（更长用例）
- Playwright 在 Web 场景很合适，因为它直接驱动真实浏览器，能覆盖:
  - 键鼠输入
  - Canvas 页面加载与渲染
  - 控制台错误
  - 截图与状态采样

### 10.3 为什么是“smoke + full”两层测试？
- `smoke` 的定位: 快速挡住基础回归（速度优先）。
- `full` 的定位: 覆盖更完整交互链路（覆盖优先）。
- 这套分层符合工程实践:
  - 开发中高频跑 `smoke`
  - 提交前 / PR 前跑 `full`
  - CI 可按分支策略决定是否强制 `full`

### 10.4 当前方案的边界与风险
- 优点:
  - 快速落地，反馈闭环短。
  - 对“可玩性 + 稳定性”有直接保障。
- 局限:
  - 目前没有单元测试层（数值规则变复杂后维护成本会升高）。
  - Canvas 像素级视觉回归还未做基线比对（当前主要人工看图）。
  - 单文件 `game.js` 在功能增长后会变难维护。

### 10.5 什么时候应该升级技术栈？
- 当出现以下信号时，建议升级:
  1. `game.js` 超过 1200-1500 行且频繁冲突。
  2. 玩法系统 > 5 个且互相耦合（状态机/事件系统开始混乱）。
  3. 需要资产管理（音效、动画、图集）和资源加载管线。
  4. 需要多人并行开发并保持稳定发版节奏。
- 升级方向（按优先级）:
  1. 先拆模块（state / systems / render / input）。
  2. 增加规则层单元测试（纯函数逻辑）。
  3. 再评估引擎化（如 Phaser）是否带来净收益。

### 10.6 建议的团队开发流程（可直接执行）
1. 需求拆成小迭代（每次只改一类机制）。
2. 本地实现后先手动玩 2-3 分钟确认体验。
3. 运行 `npm run test:playwright:smoke`。
4. 准备提交前运行 `npm run test:playwright`。
5. `git push` 自动触发 `pre-push` smoke 门禁。
6. 合并前在 CI 再跑完整回归。

### 10.7 决策准则（你们讨论技术方案时可用）
- 先问三件事:
  1. 是否缩短反馈回路？
  2. 是否提升可维护性？
  3. 是否降低回归风险？
- 如果一个新工具只增加复杂度、但对这三点没有显著提升，就暂缓引入。
