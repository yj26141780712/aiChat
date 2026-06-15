"""Python 基础学习 - 函数定义、参数传递、作用域"""

# ============================
# 一、函数定义：用 def
# ============================
# 函数 = 可重复使用的代码块
# 格式：def 函数名(参数): ... return 返回值

def greet(name: str) -> str:
    """打招呼（这是 docstring，描述函数用途）"""
    return f"你好，{name}！"

# 调用函数
message: str = greet("小明")
print(message)

# 1.记账本 作用记录收入和支出
# 1.收入/支出 金额 日期 类型（交通、餐饮、娱乐、工资、奖金、其他） 

# ============================
# 二、参数类型
# ============================

# 1. 位置参数：按顺序传入
def add(a: int, b: int) -> int:
    """两数相加"""
    return a + b

print(add(3, 5))       # 3→a, 5→b
# print(add(3))        # ❌ 缺少参数 b

# 2. 关键字参数：用名字指定，顺序随意
print(add(a=3, b=5))   # 明确指定
print(add(b=5, a=3))   # 关键字参数可以换顺序

# 3. 默认参数：给参数设默认值
def greet_v2(name: str, greeting: str = "你好") -> str:
    """带默认问候语的打招呼"""
    return f"{greeting}，{name}！"

print(greet_v2("小明"))           # 用默认值 → "你好，小明！"
print(greet_v2("小明", "早上好"))  # 覆盖默认值 → "早上好，小明！"

# 4. *args：接收任意数量的位置参数（打包成元组）
def sum_all(*numbers: int) -> int:
    """计算所有参数的总和"""
    total: int = 0
    for n in numbers:
        total += n
    return total

print(sum_all(1, 2, 3))        # → 6
print(sum_all(10, 20, 30, 40)) # → 100
print(sum_all())               # → 0（没有参数时是空元组）

# 5. **kwargs：接收任意数量的关键字参数（打包成字典）
def print_info(**info: str) -> None:
    """打印所有信息"""
    for key, value in info.items():
        print(f"  {key}: {value}")

print("用户信息：")
print_info(name="小明", age="25", city="北京")

# 6. 混合使用（顺序：位置 → 默认 → *args → **kwargs）
def mixed(a: int, b: int = 10, *args: int, **kwargs: str) -> None:
    """演示参数顺序"""
    print(f"a={a}, b={b}, args={args}, kwargs={kwargs}")

mixed(1)                        # a=1, b=10, args=(), kwargs={}
mixed(1, 2, 3, 4, name="test")  # a=1, b=2, args=(3,4), kwargs={"name":"test"}


# ============================
# 三、返回值
# ============================
# return 返回一个值（函数执行后立即结束）
def is_adult(age: int) -> bool:
    """判断是否成年"""
    return age >= 18

print(f"20岁成年？{is_adult(20)}")  # True
print(f"15岁成年？{is_adult(15)}")  # False

# 返回多个值（实际上是返回元组）
def get_min_max(numbers: list[int]) -> tuple[int, int]:
    """返回列表的最小值和最大值"""
    return min(numbers), max(numbers)

smallest, largest = get_min_max([3, 1, 4, 1, 5, 9])
print(f"最小：{smallest}，最大：{largest}")

# 没有 return 或 return 后没内容 → 返回 None
def do_nothing() -> None:
    """什么都不做"""
    pass  # pass 是占位符，表示"这里故意什么都不做"

result = do_nothing()
print(f"返回值：{result}")  # None


# ============================
# 四、作用域：变量在哪里可见
# ============================
# LEGB 规则：Local → Enclosing → Global → Built-in
# 查找变量时按这个顺序找，找到就停

# 全局变量：在函数外面定义
global_count: int = 0  # 全局可见

def show_global() -> None:
    """演示全局变量的读取"""
    print(f"读取全局变量：{global_count}")  # ✅ 可以读

show_global()

def try_modify_global() -> None:
    """演示修改全局变量的陷阱"""
    # global_count = 100  # ❌ 这会在函数内创建新的局部变量，不是修改全局
    global global_count   # 用 global 声明后才能修改全局变量
    global_count = 100
    print(f"修改后：{global_count}")

try_modify_global()
print(f"全局变量现在是：{global_count}")  # 100

# 局部变量：在函数内部定义
def local_demo() -> None:
    """演示局部变量"""
    local_var: str = "我是局部变量"
    print(local_var)  # ✅ 函数内可见

local_demo()
# print(local_var)   # ❌ 函数外不可见，会报 NameError


# ============================
# 五、闭包（Enclosing 作用域）
# ============================
# 函数嵌套时，内层函数可以读取外层函数的变量

def make_counter() -> tuple:
    """创建一个计数器"""
    count: int = 0  # 外层函数的变量

    def increment() -> int:
        nonlocal count  # 声明要修改外层变量
        count += 1
        return count

    def get_count() -> int:
        return count  # 读取外层变量不需要 nonlocal

    return increment, get_count

inc, get = make_counter()
print(f"计数：{inc()}")  # 1
print(f"计数：{inc()}")  # 2
print(f"计数：{inc()}")  # 3
print(f"当前值：{get()}")  # 3


# ============================
# 六、在记账本里的函数应用
# ============================

# 1. 工具函数：只做一件事，可以被多处调用
def load_records() -> list[dict]:
    """加载记录（模拟）"""
    return [
        {"id": 1, "type": "支出", "amount": 25.5},
        {"id": 2, "type": "收入", "amount": 5000},
    ]

def save_records(records: list[dict]) -> None:
    """保存记录（模拟）"""
    print(f"已保存 {len(records)} 条记录")

# 2. 函数调用函数（代码复用）
def add_record(record: dict) -> None:
    """添加一条记录"""
    records: list[dict] = load_records()  # 调用加载函数
    records.append(record)
    save_records(records)                  # 调用保存函数

add_record({"id": 3, "type": "支出", "amount": 100})

# 3. 参数校验函数（把校验逻辑独立出来）
def validate_amount(amount_str: str) -> float | None:
    """校验金额字符串，合法返回 float，不合法返回 None"""
    try:
        amount: float = float(amount_str)
        if amount <= 0:
            return None
        return amount
    except ValueError:
        return None

print(f"'25.5' → {validate_amount('25.5')}")   # 25.5
print(f"'abc' → {validate_amount('abc')}")      # None
print(f"'-10' → {validate_amount('-10')}")      # None
