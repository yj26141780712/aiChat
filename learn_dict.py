"""Python 基础学习 - 字典（dict）"""

# ============================
# 一、什么是字典
# ============================
# 字典 = "键值对"的集合，像一本电话簿：名字(键) → 电话(值)
# 记账本里的一条记录就是字典：
record: dict = {
    "id": 1,           # 键 "id"   → 值 1
    "type": "支出",     # 键 "type" → 值 "支出"
    "amount": 25.5,    # 键 "amount" → 值 25.5
    "category": "餐饮",
    "note": "午餐",
    "date": "2026-06-10",
}
print(record)


# ============================
# 二、读取值：用键去取
# ============================
# 方式1：直接取（键不存在会报错 KeyError）
print(record["type"])      # → "支出"
print(record["amount"])    # → 25.5

# 方式2：用 get()（键不存在时返回默认值，更安全）
print(record.get("note", "无备注"))    # → "午餐"
print(record.get("tags", "无标签"))    # → "无标签"（键不存在，返回默认值）
print(record.get("id", 0))
print(record.get("mainId", 0))


# ============================
# 三、增、改、删
# ============================
# 添加新键值对（键不存在 = 新增）
record["tags"] = "工作日"
print(f"新增后：{record}")

# 修改已有值（键已存在 = 修改）
record["amount"] = 30.0
print(f"修改后金额：{record['amount']}")

# 删除键值对
del record["tags"]         # del 删除指定键
print(f"删除后：{record}")

# pop()：删除并返回值（类似从盒子里拿走一样东西）
note_value: str = record.pop("note")
print(f"弹出了：{note_value}，剩余：{record}")


# ============================
# 四、检查键是否存在
# ============================
# in 关键字：判断字典里有没有某个键
if "category" in record:
    print(f"分类是：{record['category']}")

if "tags" not in record:
    print("没有 tags 这个键")


# ============================
# 五、遍历字典
# ============================
# 1. 遍历所有键
print("\n--- 所有键 ---")
for key in record:
    print(f"  {key}")

# 2. 遍历所有值
print("\n--- 所有值 ---")
for value in record.values():
    print(f"  {value}")

# 3. 同时遍历键和值（最常用）
print("\n--- 键值对 ---")
for key, value in record.items():
    print(f"  {key}: {value}")


# ============================
# 六、字典列表（记账本的核心结构）
# ============================
# 多条记录放在一个列表里，就是 list[dict]
records: list[dict] = [
    {"id": 1, "type": "支出", "amount": 25.5, "category": "餐饮"},
    {"id": 2, "type": "收入", "amount": 5000, "category": "工资"},
    {"id": 3, "type": "支出", "amount": 15.0, "category": "交通"},
]

# 遍历每条记录
print("\n--- 所有账目 ---")
for r in records:
    print(f"#{r['id']} {r['type']} {r['amount']}元 [{r['category']}]")

# 筛选：只看支出
print("\n--- 只看支出 ---")
for r in records:
    if r["type"] == "支出":
        print(f"#{r['id']} {r['amount']}元 [{r['category']}]")

# 统计：计算总支出
total_expense: float = 0.0
for r in records:
    if r["type"] == "支出":
        total_expense += r["amount"]
print(f"\n总支出1：{total_expense}元")


# ============================
# 七、字典推导式（进阶）
# ============================
# 快速创建字典，类似列表推导式
print("\n--- 字典推导式 ---")
squares: dict = {x: x**2 for x in range(1, 6) if x % 2 == 0}
print(f"\n平方表：{squares}")  # {1: 1, 2: 4, 3: 9, 4: 16, 5: 25}
