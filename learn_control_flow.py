"""Python 基础学习 - 条件判断与循环"""

# ============================
# 一、条件判断：if / elif / else
# ============================
# 根据不同条件执行不同的代码
age: int = 20

if age < 18:
    print("未成年")
elif age < 60:
    print("成年人")
else:
    print("老年人")

# 执行流程：从上往下判断，第一个为 True 的分支执行后，跳过其余所有
# elif 可以有多个，else 可以没有


# ============================
# 二、比较运算符
# ============================
# ==  等于       !=  不等于
# >   大于       <   小于
# >=  大于等于   <=  小于等于

x: int = 10
print(f"x == 10: {x == 10}")   # True
print(f"x != 5: {x != 5}")     # True
print(f"x > 10: {x > 10}")     # False
print(f"x >= 10: {x >= 10}")   # True

# 链式比较（Python 特色）
score: int = 85
print(f"60 <= score < 90: {60 <= score < 90}")  # True（等同于 60<=score and score<90）


# ============================
# 三、逻辑运算符：and / or / not
# ============================
# and：两个都为 True 才为 True
# or：至少一个为 True 就为 True
# not：取反

temp: int = 25
is_weekend: bool = True

# and：同时满足多个条件
if temp >= 20 and is_weekend:
    print("天气好又是周末，出去玩！")

# or：满足其中一个即可
age = 16
has_parent: bool = True
if age >= 18 or has_parent:
    print("可以进入（成年或有家长陪同）")

# not：取反
is_empty: bool = False
if not is_empty:
    print("列表不为空")

# 组合使用
amount: float = 50.0
if amount > 0 and amount <= 100:
    print("金额在合理范围内")


# ============================
# 四、三元表达式（简洁的 if-else）
# ============================
# 格式：值A if 条件 else 值B
# 条件为 True 取值A，为 False 取值B

age = 20
status: str = "成年" if age >= 18 else "未成年"
print(f"状态：{status}")

# 在记账本里的用法
record_type: str = "i"
type_name: str = "收入" if record_type == "i" else "支出"
print(f"类型：{type_name}")


# ============================
# 五、for 循环：遍历序列
# ============================
# 遍历列表
fruits: list[str] = ["苹果", "香蕉", "橘子"]
for fruit in fruits:
    print(f"水果：{fruit}")

# 遍历字符串（逐字符）
for char in "Python":
    print(char, end=" ")  # end=" " 让 print 不换行
print()  # 换行

# range()：生成数字序列
for i in range(5):          # 0, 1, 2, 3, 4
    print(f"第{i}次", end=" ")
print()

for i in range(2, 6):       # 2, 3, 4, 5
    print(i, end=" ")
print()

for i in range(0, 10, 2):   # 0, 2, 4, 6, 8（步长为2）
    print(i, end=" ")
print()

# enumerate()：同时获取索引和值
for i, fruit in enumerate(fruits):
    print(f"索引{i}: {fruit}")

# 遍历字典
record: dict = {"id": 1, "type": "支出", "amount": 25.5}
for key, value in record.items():
    print(f"{key}: {value}")


# ============================
# 六、while 循环：条件为真时重复
# ============================
# 基本 while 循环
count: int = 0
while count < 5:
    print(f"count = {count}")
    count += 1  # 别忘了更新条件，否则会死循环！

# while + input()：反复获取用户输入（记账本主菜单的写法）
# 以下是模拟，不会真的等待输入
print("\n--- 模拟菜单循环 ---")
choices: list[str] = ["1", "2", "0"]  # 模拟用户依次输入
index: int = 0

while index < len(choices):
    choice: str = choices[index]
    index += 1  # 模拟读取下一个输入

    if choice == "1":
        print("执行功能1")
    elif choice == "2":
        print("执行功能2")
    elif choice == "0":
        print("退出")
        break  # break 跳出循环
    else:
        print("无效输入")


# ============================
# 七、break 和 continue
# ============================
# break：立即跳出整个循环
print("\n--- break 示例 ---")
for i in range(10):
    if i == 5:
        print("遇到5，break 退出！")
        break
    print(f"i = {i}")

# continue：跳过本次，继续下一次循环
print("\n--- continue 示例 ---")
for i in range(10):
    if i % 2 == 0:
        continue  # 跳过偶数
    print(f"奇数：{i}")

# 在记账本里：删除记录时找到就 break
records: list[dict] = [
    {"id": 1, "type": "支出"},
    {"id": 2, "type": "收入"},
    {"id": 3, "type": "支出"},
]
target_id: int = 2
for i, r in enumerate(records):
    if r["id"] == target_id:
        records.pop(i)
        print(f"已删除 #{target_id}")
        break  # 找到就退出，不用继续找了


# ============================
# 八、嵌套循环
# ============================
# 循环里套循环
print("\n--- 九九乘法表 ---")
for i in range(1, 10):
    for j in range(1, i + 1):
        print(f"{j}×{i}={i*j}", end="\t")  # \t 是制表符（对齐用）
    print()  # 每行结束后换行

# 遍历二维列表（表格数据）
matrix: list[list[int]] = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
]
print("\n--- 遍历矩阵 ---")
for row in matrix:
    for cell in row:
        print(f"{cell:3d}", end="")  # :3d 表示占3位宽度，右对齐
    print()


# ============================
# 九、for...else（Python 特色）
# ============================
# else 在循环正常结束（没有被 break）时执行
print("\n--- for...else 示例 ---")
numbers: list[int] = [1, 3, 5, 7, 9]

for num in numbers:
    if num % 2 == 0:
        print(f"找到偶数：{num}")
        break
else:
    # 循环结束都没有 break，说明没找到偶数
    print("没有找到偶数")

# 在记账本里：查找记录是否存在的写法
for r in records:
    if r["id"] == 99:
        print("找到了！")
        break
else:
    print("ID 99 不存在")
