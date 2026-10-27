from typing import Any

from fastapi import FastAPI
from starlette.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import os
from datetime import datetime
import json
from pydantic import BaseModel
from openai import OpenAI

XTTSC = """
你是一个专门玩猜字谜的AI小助手，只进行字谜互动，不闲聊无关内容，全程纯文本交互，不使用表情符号。

## 核心能力
- 出字谜、判对错、给提示
- 记忆已用谜题，确保会话内不重复
- 简洁明快回应

## 出题规则（严格执行！）
1. 开场先友好打招呼，并随机出一道常见、简单、适合大众并必须符合逻辑推理的字谜，禁止使用生僻、低俗、网络烂梗。
2. 题目格式：“谜面”（打一字）。
3. 每次出题必须完全随机，禁止重复使用相同题目，也可以偶尔穿插使用，下面示例中的谜语。
4. 新出题目时, 不要提示, 用户需要提示时, 或者答错时, 再给予合理的提示。

## 判题规则（严格执行！）
1. 用户只回复一个字时，直接视为答案。
2. 答对：立即夸奖并揭晓谜底，格式如“太棒了！就是‘X’字！要不要再来一题？”
3. 答错：告知不对，可给一句简短提示，但不泄露答案。格式如“不对哦，再想想~”
4. 严禁在用户答错后直接公布答案！只有用户说“公布答案”或“不知道”等情况时才公布。

## 互动流程
1. 用户答对：夸奖 + 确认正确 + 询问“要不要再来一题？”
2. 用户答错：告知不对 + 简单提示 + 鼓励继续猜
3. 用户说“提示一下”：给出简短线索，不公布答案
4. 用户说“公布答案”或“不知道”：揭晓谜底并解释 + 询问“要不要再来一题？”
5. 用户说“换一题”“再来一题”：立即更换新字谜

## 回复风格约束
- 语气轻松有趣，但保持简洁
- 全程只围绕字谜，拒绝回答其他问题
- 回复不超过3句话
- **绝对不要在回复中说“这个出过了，我来个新的”或类似表述** — 直接给出新谜语即可
- 判题错误零容忍，不确定谜底时，先回复“我再想想”而不是乱判

## 常见谜语类型及谜底参考示例, 仅仅为参照示例
### 组合类
- 「一加一不是二」= 王
- 「二人不是天」= 夫
- 「十口不是田」= 古

### 包含类
- 「一人在内」= 肉
- 「口里有人」= 囚
- 「门里有口」= 问
- 「田里长草」= 苗
- 「心里有你」= 您
- 「山里有山」= 出
- 「王头上有人」= 全
- 「水上有石」= 泵

### 半取类
- 「半吃半拿」= 哈
- 「半真半假」= 值
- 「半青半紫」= 素
- 「半朋半友」= 有
- 「半推半就」= 扰
- 「半山半水」= 汕

### 象形类
- 「三人又重逢」= 众
- 「一口咬掉牛尾巴」= 告
- 「两座山」= 出
- 「三日又重逢」= 晶
"""

#ai路由地址和api密钥
client = OpenAI(
    api_key=os.environ.get('DEEPSEEK_API_KEY'),
    base_url="https://api.deepseek.com")


def huoqvwenjianming(huihuamingzi):
    return f"session/{huihuamingzi}.json"


def shengchenghuihuaming():
    jichumingzi = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    huihuamingzi = jichumingzi
    xuliehao = 1
    # 同一秒内连续新建会撞名, 撞了就加序号, 避免后一个把前一个覆盖掉
    while os.path.exists(f"session/{huihuamingzi}.json"):
        huihuamingzi = f"{jichumingzi}-{xuliehao}"
        xuliehao += 1
    return huihuamingzi

#接收前端json数据,转换为python对象，用于接收前端传来的会话数据
class Jieshoushujv(BaseModel):
    code: int
    message: str
    data: Any  #任意类型数据

#接收前端数据
class Fanhuishujv(BaseModel):
    session_id: str
    message: str

app = FastAPI(title="汉字谜盒")

app.mount("/static", StaticFiles(directory="static"), name="static")

#创建会话存放目录
if not os.path.exists("session"):
    os.mkdir("session")
@app.get("/")

def root():
    return FileResponse("static/index.html")

@app.post("/api/sessions")#创建会话
def xinjianhuihua() -> Jieshoushujv:
    print("创建会话")

    #生成会话标识
    huihuamingzi = shengchenghuihuaming()


    #组装会话信息,保存到文件
    huihuaxinxi = {
        "huihua_name": huihuamingzi,
        "huihuaxinxi":[]
    }

    with open(f"session/{huihuamingzi}.json", "w", encoding="utf-8") as f:
        json.dump(huihuaxinxi, f, ensure_ascii=False, indent=2)

    #返回会话数据到前端
    # return {"code": 200, "message":"创建会话成功", "data":huihuaxinxi}
    return Jieshoushujv(code=200, message="创建会话成功", data=huihuaxinxi)

@app.post("/api/chat")
def fanhuihuihuadatas(fanhui: Fanhuishujv) -> Jieshoushujv:
    print("接收会话数据")

    #加载json文件会话数据
    print("加载json文件会话数据")
    wenjianlujing = huoqvwenjianming(fanhui.session_id)
    with open(wenjianlujing, "r", encoding="utf-8") as f:
        huihuashujv = json.load(f)

    #构建ai大模型交互的消息数据
    print("构建ai大模型交互的消息数据")
    lishihuihuacunchu = [
        {"role": "system", "content": XTTSC},
    ]
    for msg in huihuashujv["huihuaxinxi"]:
        lishihuihuacunchu.append(msg)
    lishihuihuacunchu.append({"role": "user", "content": fanhui.message})

    #调用ai
    print("调用ai")
    response = client.chat.completions.create(
        model="deepseek-flash",
        messages=[
            # {"role": "system", "content": XTTSC},
            *lishihuihuacunchu
        ],
        stream=False,
        reasoning_effort="high",
        extra_body={"thinking": {"type": "enabled"}}

    )

    #获取ai回复
    print("获取ai回复")
    fanhuijieguo = response.choices[0].message.content

    #更新会话数据
    lishihuihuacunchu.pop(0)
    print("更新会话数据")
    lishihuihuacunchu.append({"role": "assistant", "content": fanhuijieguo})
    huihuashujv["huihuaxinxi"] = lishihuihuacunchu

    #保存会话数据到json文件中
    print("保存会话数据到json文件中")
    with open(wenjianlujing, "w", encoding="utf-8") as f:
        json.dump(huihuashujv, f, ensure_ascii=False, indent=2)


    #返回会话数据到前端
    print("返回会话数据到前端")

    return Jieshoushujv(code=200, message="接收会话数据成功", data=fanhuijieguo)


#获取会话列表
@app.get("/api/sessions")
def huoqvhuihualiebiao() -> Jieshoushujv:
    print("获取会话列表")

    huihualiebiao = []

    print("遍历会话文件")
    for filename in os.listdir("session"):
        if filename.endswith(".json"):
            huihualiebiao.append(filename[:-5])
    huihualiebiao.sort(reverse=True)
    #返回会话列表
    return Jieshoushujv(code=200, message="获取会话列表成功", data=huihualiebiao)


def jianchahuihuaming(session_id: str) -> bool:
    """会话名只能是 数字/字母/下划线/短横线, 防止 ../ 这类路径穿越"""
    return bool(session_id) and all(c.isalnum() or c in "_-" for c in session_id)


#获取单个会话的聊天记录
@app.get("/api/sessions/{session_id}")
def huoqvhuihuaxiangqing(session_id: str) -> Jieshoushujv:
    print("获取会话详情:", session_id)

    if not jianchahuihuaming(session_id):
        return Jieshoushujv(code=400, message="会话名不合法", data=None)

    wenjianlujing = huoqvwenjianming(session_id)
    if not os.path.exists(wenjianlujing):
        return Jieshoushujv(code=404, message="会话不存在", data=None)

    with open(wenjianlujing, "r", encoding="utf-8") as f:
        huihuashujv = json.load(f)

    return Jieshoushujv(code=200, message="获取会话成功", data=huihuashujv)


#删除会话
@app.delete("/api/sessions/{session_id}")
def shanchuhuihua(session_id: str) -> Jieshoushujv:
    print("删除会话:", session_id)

    if not jianchahuihuaming(session_id):
        return Jieshoushujv(code=400, message="会话名不合法", data=None)

    wenjianlujing = huoqvwenjianming(session_id)
    if not os.path.exists(wenjianlujing):
        return Jieshoushujv(code=404, message="会话不存在", data=None)

    os.remove(wenjianlujing)
    return Jieshoushujv(code=200, message="删除会话成功", data=None)
















































if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8001)
