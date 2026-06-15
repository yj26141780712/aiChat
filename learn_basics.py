"""Python 基础学习 - 变量与数据类型"""

# ============================
# 一、变量：给数据起个名字
# ============================
# 变量就像一个"盒子"，把数据放进去，以后用名字就能取出来
name: str = "小明"       # 把字符串 "小明" 存进变量 name
age: int = 25            # 把整数 25 存进变量 age
print(f"我叫{name}，今年{age}岁")

# 变量可以随时修改
age = 26                 # 不需要再写类型提示，Python 能自动识别
print(f"明年我就{age}岁了")


# ============================
# 二、字符串（str）：文字数据
# ============================
# 单引号和双引号都可以，效果一样
word1: str = "你好"
word2: str = '世界'
print(word1 + word2)     # + 号拼接字符串 → "你好世界"

# 常用操作
text: str = "Python编程"
print(len(text))         # len() 获取长度 → 8（每个汉字算1个字符）
print(text.upper())      # upper() 转大写 → "PYTHON编程"
print(text[0])           # 用索引取单个字符 → "P"（索引从0开始）
print(text[-1])          # 负数索引从末尾数 → "程"

# f-string：在字符串里嵌入变量（最推荐的写法）
score: int = 95
print(f"考试成绩：{score}分")
print(f"明年成绩：{score + 5}分")  # 花括号里可以写表达式


# ============================
# 三、数字：整数和浮点数
# ============================
# 整数（int）：没有小数点
count: int = 10
# 浮点数（float）：有小数点
price: float = 9.9

# 基本运算
total: float = count * price    # 乘法 → 99.0
half: float = count / 3         # 除法 → 3.333333...
remainder: int = count % 3      # 取余数 → 1
power: int = 2 ** 10            # 幂运算 → 1024（2的10次方）
floor_div: int = count // 3     # 整除 → 3（向下取整）

print(f"总价：{total:.2f}元")   # :.2f 保留两位小数
print(f"10除以3：商{floor_div}余{remainder}")

# 类型转换
num_str: str = "42"             # 这是字符串，不是数字
num_int: int = int(num_str)     # 字符串 → 整数
num_float: float = float("3.14")  # 字符串 → 浮点数
print(f"转换后：{num_int} + 1 = {num_int + 1}")


# ============================
# 四、布尔值（bool）：真或假
# ============================
# 只有两个值：True（真）和 False（假）
is_student: bool = True
is_adult: bool = age >= 18     # 比较运算的结果就是布尔值

print(f"是学生吗？{is_student}")
print(f"成年了吗？{is_adult}")

# 布尔值在 if 判断中最常用
if is_adult:
    print("可以签合同")
else:
    print("需要监护人同意")

# 这些值会被当作 False（称为"假值"）：
# False, 0, 0.0, "", [], {}, None
empty_str: str = ""
if not empty_str:              # not 取反，空字符串是假值，取反后为真
    print("字符串是空的")


# ============================
# 五、类型检查：type()
# ============================
# 不确定变量是什么类型？用 type() 看看
print(type("hello"))    # <class 'str'>
print(type(42))         # <class 'int'>
print(type(3.14))       # <class 'float'>
print(type(True))       # <class 'bool'>
