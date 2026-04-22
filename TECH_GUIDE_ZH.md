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
