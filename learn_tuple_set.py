"""Python 基础学习 - 元组（tuple）和集合（set）"""

# ============================
# 一、元组（tuple）：不可变的列表
# ============================
# 元组和列表很像，区别是：元组创建后不能修改
# 用圆括号 () 创建，元素之间用逗号分隔

# 创建元组
point: tuple[int, int] = (3, 5)       # 坐标点（x, y）
colors: tuple[str, ...] = ("红", "绿", "蓝")
single: tuple[int] = (42,)            # 只有一个元素时，必须加逗号

print(f"坐标：{point}")
print(f"颜色：{colors}")
print(f"单元素元组：{single}")

# 访问元素（和列表一样用索引）
print(f"x = {point[0]}, y = {point[1]}")
print(f"第一个颜色：{colors[0]}")
print(f"最后一个颜色：{colors[-1]}")

# 元组不能修改！以下操作会报错：
# colors[0] = "黄"        # ❌ TypeError: 元组不支持赋值
# colors.append("紫")     # ❌ AttributeError: 元组没有 append 方法
# del colors[0]           # ❌ TypeError: 元组不支持删除


# ============================
# 二、为什么要用元组
# ============================
# 1. 数据不应该被修改时（如坐标、日期、配置）
POSITION: tuple[int, int] = (100, 200)  # 屏幕坐标，不应该变

# 2. 元组可以作为字典的键（列表不行）
location_scores: dict[tuple[int, int], int] = {
    (0, 0): 10,     # 坐标 (0,0) 得分 10
    (1, 2): 25,     # 坐标 (1,2) 得分 25
    (3, 4): 40,
}

print(f"坐标(1,2)的得分：{location_scores[(1, 2)]}")

# 3. 函数返回多个值时，实际上是返回元组
def get_name_and_age() -> tuple[str, int]:
    """返回姓名和年龄"""
    return "小明", 25  # 返回的其实是元组 ("小明", 25)

result: tuple[str, int] = get_name_and_age()
print(f"返回值：{result}")  # → ("小明", 25)


# ============================
# 三、元组解包（常用技巧）
# ============================
# 把元组的元素分别赋值给多个变量
name, age = get_name_and_age()  # 自动解包
print(f"姓名：{name}，年龄：{age}")

# 交换两个变量的值（Python 特色写法）
a: int = 10
b: int = 20
a, b = b, a  # 交换
print(f"交换后：a={a}, b={b}")

# 用 * 收集剩余元素
first, *rest = (1, 2, 3, 4, 5)
print(f"第一个：{first}，剩余：{rest}")  # → 1, [2, 3, 4, 5]

*init, last = (1, 2, 3, 4, 5)
print(f"开头：{init}，最后：{last}")  # → [1, 2, 3, 4], 5


# ============================
# 四、集合（set）：不重复的元素集
# ============================
# 集合 = 无序、不重复的元素集合
# 用花括号 {} 创建，但空集合必须用 set()（因为 {} 是空字典）

fruits: set[str] = {"苹果", "香蕉", "橘子", "苹果"}  # 重复的"苹果"会被自动去除
print(f"水果集合：{fruits}")  # → {"苹果", "香蕉", "橘子"}（顺序可能不同）
print(f"集合长度：{len(fruits)}")  # → 3

# 空集合
empty_set: set = set()  # ✅ 正确
# empty_dict = {}       # 这是空字典，不是集合！
print(f"空集合类型：{type(empty_set)}")  # → <class 'set'>


# ============================
# 五、集合操作：增删
# ============================
numbers: set[int] = {1, 2, 3}

# add()：添加元素（已存在则无效果）
numbers.add(4)
numbers.add(3)  # 3 已存在，不会重复添加
print(f"添加后：{numbers}")

# remove()：删除元素（不存在会报错 KeyError）
numbers.remove(2)
print(f"删除2后：{numbers}")

# discard()：删除元素（不存在也不报错，更安全）
numbers.discard(99)  # 99 不存在，但不报错
print(f"discard 后：{numbers}")

# pop()：随机弹出一个元素（集合无序，不知道弹出哪个）
popped: int = numbers.pop()
print(f"弹出了：{popped}，剩余：{numbers}")

# clear()：清空集合
numbers.clear()
print(f"清空后：{numbers}")  # → set()


# ============================
# 六、集合运算：交集、并集、差集
# ============================
class_a: set[str] = {"小明", "小红", "小刚", "小丽"}
class_b: set[str] = {"小刚", "小丽", "小王", "小张"}

# 交集 & ：两个班都有的学生
both: set[str] = class_a & class_b  # 或 class_a.intersection(class_b)
print(f"两个班都有：{both}")  # → {"小刚", "小丽"}

# 并集 | ：所有学生（去重）
all_students: set[str] = class_a | class_b  # 或 class_a.union(class_b)
print(f"所有学生：{all_students}")

# 差集 - ：只在 A 班的学生
only_a: set[str] = class_a - class_b  # 或 class_a.difference(class_b)
print(f"只在A班：{only_a}")  # → {"小明", "小红"}

# 对称差集 ^ ：只在某一个班的学生（排除两个班都有的）
either_not_both: set[str] = class_a ^ class_b
print(f"只在一个班：{either_not_both}")


# ============================
# 七、集合的常见用途
# ============================
# 1. 去重：列表转集合再转回列表
scores: list[int] = [85, 92, 85, 78, 92, 95]
unique_scores: list[int] = list(set(scores))
print(f"去重后：{unique_scores}")  # 顺序可能变化

# 2. 快速判断元素是否存在（比列表快）
large_set: set[int] = set(range(1000000))
if 999999 in large_set:  # 集合查找是 O(1)，列表是 O(n)
    print("找到了！")

# 3. 在记账本里的应用：收集已有的 ID
records: list[dict] = [
    {"id": 1, "type": "支出"},
    {"id": 3, "type": "收入"},
    {"id": 5, "type": "支出"},
]
# 用集合收集所有已有 ID，快速判断新 ID 是否冲突
existing_ids: set[int] = {r["id"] for r in records}
print(f"已有ID集合：{existing_ids}")

new_id: int = 4
if new_id not in existing_ids:
    print(f"ID {new_id} 可用！")
