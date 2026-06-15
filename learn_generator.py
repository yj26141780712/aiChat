"""Python 进阶学习 - 生成器（generator）"""

# ============================
# 一、什么是生成器
# ============================
# 生成器 = 一种特殊的函数，用 yield 代替 return
# 普通函数：调用一次，返回一个结果，结束
# 生成器函数：调用后返回一个"生成器对象"，可以逐次取出值

# 普通函数（一次性返回所有数据）
def get_all_numbers() -> list[int]:
    """返回 [1, 2, 3]"""
    return [1, 2, 3]

result: list[int] = get_all_numbers()
print(f"普通函数返回：{result}")  # [1, 2, 3]，一次全拿到


# ============================
# 二、用 yield 写生成器
# ============================
def generate_numbers():
    """逐个产出数字"""
    yield 1   # 第1次调用 next() 时，产出 1，然后暂停
    yield 2   # 第2次调用 next() 时，产出 2，然后暂停
    yield 3   # 第3次调用 next() 时，产出 3，然后结束

gen = generate_numbers()  # 注意：这里不会执行函数体，只是创建生成器对象
print(f"\n生成器对象：{gen}")  # <generator object ...>

# 用 next() 逐个取值
print(f"第1次：{next(gen)}")  # → 1
print(f"第2次：{next(gen)}")  # → 2
print(f"第3次：{next(gen)}")  # → 3
# next(gen)                    # 第4次会报错 StopIteration（没有更多值了）


# ============================
# 三、用 for 循环自动迭代生成器（最常用）
# ============================
# for 循环会自动调用 next()，直到生成器结束，不会报错
print("\n--- for 循环遍历生成器 ---")
for num in generate_numbers():
    print(f"拿到：{num}")


# ============================
# 四、模拟 API 流式返回（核心！）
# ============================
# 流式 API 的 completion 就是一个生成器
# 我们来模拟它的行为：

import time

def simulate_streaming_response() -> None:
    """模拟 AI 流式回复：逐块产出文字"""
    # 模拟 AI 一个字一个字地生成回复
    words: list[str] = ["你", "好", "，", "我", "是", "A", "I", "助", "手", "！"]

    for word in words:
        time.sleep(0.2)  # 模拟生成每个字需要 0.2 秒
        # 用 yield 产出一个模拟的 chunk
        yield {"content": word}

print("\n--- 模拟流式输出 ---")
# 就像 agentDemo.py 里的 for chunk in completion:
full_reply: str = ""
for chunk in simulate_streaming_response():
    content: str = chunk["content"]
    print(content, end="", flush=True)  # 逐字显示
    full_reply += content

print(f"\n完整回复：{full_reply}")


# ============================
# 五、生成器 vs 列表：内存效率
# ============================
# 列表：一次性把所有数据加载到内存
big_list: list[int] = [x**2 for x in range(1000000)]  # 占用大量内存

# 生成器：按需产出，内存里只存当前值
def big_generator():
    """产出 100 万个平方数，但不会同时占内存"""
    for x in range(1000000):
        yield x ** 2

gen = big_generator()
print(f"\n生成器对象大小：{gen}")       # 只是一个生成器对象，很小
print(f"列表大小：{big_list.__sizeof__()} 字节")  # 列表占用大

# 生成器表达式（简洁写法，类似列表推导式）
gen_expr = (x**2 for x in range(1000000))  # 圆括号 () 而不是方括号 []
print(f"生成器表达式：{gen_expr}")


# ============================
# 六、yield 的执行流程（重要！）
# ============================
def trace_execution() -> None:
    """用打印来追踪生成器的执行顺序"""
    print("  → 生成器：开始执行")
    yield "A"
    print("  → 生成器：A 已产出，继续执行")
    yield "B"
    print("  → 生成器：B 已产出，继续执行")
    yield "C"
    print("  → 生成器：C 已产出，函数结束")

print("\n--- 执行流程追踪 ---")
gen = trace_execution()

print("主程序：准备取第1个值")
val1: str = next(gen)
print(f"主程序：拿到了 {val1}")

print("主程序：准备取第2个值")
val2: str = next(gen)
print(f"主程序：拿到了 {val2}")

# 输出顺序：
# 主程序：准备取第1个值
#   → 生成器：开始执行
# 主程序：拿到了 A
# 主程序：准备取第2个值
#   → 生成器：A 已产出，继续执行
# 主程序：拿到了 B
#
# 关键：yield 让函数"暂停"，下次 next() 时从暂停处"恢复"


# ============================
# 七、回到 agentDemo.py 的流式输出
# ============================
# client.chat.completions.create(stream=True) 返回的就是一个生成器
#
# 简化版的原理：
#
# def create(stream=True):
#     while True:
#         chunk = receive_from_server()   # 从服务器接收一小块数据
#         if chunk is None:               # 没有更多数据了
#             break
#         yield chunk                     # 产出这块数据，暂停等待下次 next()
#
# 我们的代码：
# for chunk in completion:    ← 每次循环自动调用 next()
#     print(chunk.content)    ← 立即显示这块内容
#
# 这就是"流式"的本质：服务器产出一块 → yield → for 取出 → 显示 → 继续下一块
