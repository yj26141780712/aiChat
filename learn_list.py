"""Python 基础学习 - 列表（list）"""

# ============================
# 一、什么是列表
# ============================
# 列表 = 一组有序的数据，用方括号 [] 包裹，元素之间用逗号分隔
# 可以存任何类型的数据，也可以混合存
fruits: list[str] = ["苹果", "香蕉", "橘子"]
numbers: list[int] = [10, 20, 30, 40, 50]
mixed: list = [1, "hello", 3.14, True]  # 混合类型（不推荐）

print(f"水果列表：{fruits}")
print(f"列表长度：{len(fruits)}")  # len() 获取元素个数


# ============================
# 二、访问元素：索引和切片
# ============================
# 索引从 0 开始（第一个元素是索引 0）
print(f"第一个水果：{fruits[0]}")   # → "苹果"
print(f"第二个水果：{fruits[1]}")   # → "香蕉"
print(f"最后一个水果：{fruits[-1]}") # → "橘子"（-1 表示倒数第一个）

# 切片：取出一段子列表 [起始:结束]（包含起始，不包含结束）
print(f"前两个：{fruits[0:2]}")     # → ["苹果", "香蕉"]
print(f"后两个：{fruits[-2:]}")     # → ["香蕉", "橘子"]
print(f"全部复制：{fruits[:]}")     # → ["苹果", "香蕉", "橘子"]

# 步长：[起始:结束:步长]
print(f"每隔一个取：{numbers[::2]}")   # → [10, 30, 50]
print(f"反转列表：{numbers[::-1]}")    # → [50, 40, 30, 20, 10]


# ============================
# 三、添加元素
# ============================
# append()：添加到末尾（最常用）
fruits.append("葡萄")
print(f"添加后：{fruits}")

# insert()：在指定位置插入
fruits.insert(1, "芒果")  # 在索引 1 处插入
print(f"插入后：{fruits}")

# extend()：合并另一个列表到末尾
more_fruits: list[str] = ["西瓜", "草莓"]
fruits.extend(more_fruits)
print(f"合并后：{fruits}")

# 也可以用 + 号拼接（但会创建新列表，不修改原列表）
combined: list[str] = ["苹果"] + ["香蕉"]
print(f"拼接结果：{combined}")


# ============================
# 四、删除元素
# ============================
# remove()：按值删除（只删第一个匹配的）
fruits.remove("香蕉")
print(f"删除香蕉后：{fruits}")

# pop()：按索引删除并返回该元素（默认删最后一个）
last_fruit: str = fruits.pop()      # 删最后一个
print(f"弹出了：{last_fruit}，剩余：{fruits}")

second_fruit: str = fruits.pop(1)   # 删索引 1 的元素
print(f"弹出了索引1：{second_fruit}，剩余：{fruits}")

# del：按索引删除（不返回值）
del fruits[0]
print(f"del 删除索引0后：{fruits}")

# clear()：清空整个列表
temp_list: list[int] = [1, 2, 3]
temp_list.clear()
print(f"清空后：{temp_list}")  # → []


# ============================
# 五、查找和判断
# ============================
scores: list[int] = [85, 92, 78, 95, 88, 92]

# in：判断元素是否在列表中（返回布尔值）
if 95 in scores:
    print("有人考了95分！")

if 100 not in scores:
    print("没人考满分")

# index()：查找元素的索引位置（找不到会报错）
first_92: int = scores.index(92)
print(f"第一个92分在索引：{first_92}")  # → 1

# count()：统计元素出现次数
count_92: int = scores.count(92)
print(f"92分出现了：{count_92}次")  # → 2


# ============================
# 六、排序和反转
# ============================
nums: list[int] = [3, 1, 4, 1, 5, 9, 2, 6]

# sort()：原地排序（修改原列表）
nums.sort()              # 升序
print(f"升序：{nums}")

nums.sort(reverse=True)  # 降序
print(f"降序：{nums}")

# sorted()：返回新列表（不修改原列表）
original: list[int] = [5, 2, 8]
new_sorted: list[int] = sorted(original)
print(f"原列表：{original}，新列表：{new_sorted}")

# reverse()：原地反转
letters: list[str] = ["a", "b", "c", "d"]
letters.reverse()
print(f"反转后：{letters}")  # → ["d", "c", "b", "a"]


# ============================
# 七、列表推导式（进阶）
# ============================
# 快速生成列表的简洁写法
# 格式：[表达式 for 变量 in 可迭代对象]
squares: list[int] = [x**2 for x in range(1, 6)]
print(f"平方列表：{squares}")  # → [1, 4, 9, 16, 25]

# 带条件的列表推导式
# 格式：[表达式 for 变量 in 可迭代对象 if 条件]
even_squares: list[int] = [x**2 for x in range(1, 11) if x % 2 == 0]
print(f"偶数的平方：{even_squares}")  # → [4, 16, 36, 64, 100]

# 字符串处理
words: list[str] = ["hello", "world", "python"]
upper_words: list[str] = [w.upper() for w in words]
print(f"大写：{upper_words}")  # → ["HELLO", "WORLD", "PYTHON"]


# ============================
# 八、在记账本中的应用
# ============================
# 记账本的 records 就是一个列表
records: list[dict] = [
    {"id": 1, "type": "支出", "amount": 25.5, "category": "餐饮"},
    {"id": 2, "type": "收入", "amount": 5000, "category": "工资"},
    {"id": 3, "type": "支出", "amount": 15.0, "category": "交通"},
]

# 添加新记录 → append()
records.append({"id": 4, "type": "支出", "amount": 100, "category": "购物"})

# 删除记录 → pop() 配合索引
for i, r in enumerate(records):
    if r["id"] == 2:
        records.pop(i)
        break

# 筛选记录 → 列表推导式
expenses: list[dict] = [r for r in records if r["type"] == "支出"]
print(f"\n支出记录数：{len(expenses)}")

# 统计总金额 → sum() 配合生成器
total: float = sum(r["amount"] for r in records if r["type"] == "支出")
print(f"总支出：{total}元")
