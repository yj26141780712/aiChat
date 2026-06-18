"""命令行聊天机器人 - 支持多轮对话和流式输出（阿里云百炼 Qwen）"""
from openai import OpenAI
import os

# 客户端配置（复用 DashScope 兼容接口）
client: OpenAI = OpenAI(
    # 如果没有配置环境变量，请用阿里云百炼 API Key 替换：api_key="sk-xxx"
    # api_key=os.getenv("DASHSCOPE_API_KEY"),
    api_key="sk-#",
    base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
)


def chat_stream(messages: list[dict]) -> str:
    """发送消息并以流式方式打印回复，返回完整回复内容"""
    completion = client.chat.completions.create(
        model="qwen-max",        # 可按需更换模型
        messages=messages,
        stream=True,             # 开启流式输出
    )

    full_reply: str = ""
    for chunk in completion:
        if not chunk.choices:
            continue
        delta = chunk.choices[0].delta
        # 只取 content 部分（跳过 thinking/reasoning）
        if hasattr(delta, "content") and delta.content:
            print(delta.content, end="", flush=True)  # end="" 不换行
            full_reply += delta.content

    print()  # 回复结束后换行
    return full_reply


def main() -> None:
    """主程序：多轮对话循环"""
    # 对话历史：system 消息设定 AI 的角色，之后的消息逐步追加
    messages: list[dict] = [
        {"role": "system", "content": "你是一个友好的 AI 助手，回答简洁清晰。"}
    ]

    print("聊天机器人已启动！（输入 quit 退出）")
    print("-" * 40)

    while True:
        user_input: str = input("\n你：").strip()
        if not user_input:
            continue
        if user_input.lower() == "quit":
            print("再见！")
            break

        # 把用户消息加入历史
        messages.append({"role": "user", "content": user_input})

        # 流式获取回复
        print("AI：", end="")
        reply: str = chat_stream(messages)

        # 把 AI 回复也加入历史（实现多轮对话的关键）
        messages.append({"role": "assistant", "content": reply})
        print("对话轮数：",len(messages))


if __name__ == "__main__":
    main()
