# 汉字密盒 · Hanzi Mibox

一个基于大模型的汉字字谜互动小游戏。AI 出题、判对错、给提示，对话记录保存在本地。

## 功能

- **AI 出题**：随机出一道常见字谜，不重复、不生僻
- **智能判题**：答对即时夸奖，答错只给提示、不剧透答案
- **多会话**：新建 / 切换 / 删除，每个会话的上下文相互独立
- **本地持久化**：会话以 JSON 文件形式存在 `session/` 目录
- **主题切换**：浅色 / 深色

## 技术栈

| 层 | 选型 |
|---|---|
| 后端 | FastAPI + Uvicorn |
| 前端 | 原生 HTML / CSS / JavaScript，无框架 |
| 模型 | DeepSeek（OpenAI 兼容接口） |

## 运行

**1. 安装依赖**

```bash
pip install -r requirements.txt
```

**2. 配置 API Key**

密钥通过环境变量读取，不写在代码里：

```bash
# Windows PowerShell
$env:DEEPSEEK_API_KEY="your-api-key"

# macOS / Linux
export DEEPSEEK_API_KEY="your-api-key"
```

**3. 启动**

```bash
python main.py
```

浏览器打开 <http://127.0.0.1:8001>

## 接口

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/sessions` | 获取会话列表 |
| POST | `/api/sessions` | 新建会话 |
| GET | `/api/sessions/{session_id}` | 获取单个会话的聊天记录 |
| DELETE | `/api/sessions/{session_id}` | 删除会话 |
| POST | `/api/chat` | 发送消息并获取 AI 回复 |

## 目录结构

```
.
├── main.py              # FastAPI 应用：路由、AI 调用、会话读写
├── requirements.txt
├── static/
│   ├── index.html
│   ├── style.css
│   └── app.js           # 前端交互逻辑
└── session/             # 会话记录（运行时生成，不入库）
    └── YYYY-MM-DD_HH-MM-SS.json
```

## 说明

- 必须在项目根目录启动，代码里用的是相对路径（`static/`、`session/`）。
- 会话文件名是创建时间，同一秒内重复创建会自动加序号后缀。
- 本项目仅用于学习交流。
