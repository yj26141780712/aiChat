"""命令行记账本 - 主程序入口"""
import json  # 标准库：处理 JSON 数据的读写
from datetime import date, datetime  # 标准库：获取今天的日期 + 日期解析校验

# 数据文件路径常量（UPPER_SNAKE_CASE）
DATA_FILE: str = "records.json"
CATEGORIES_FILE: str = "categories.json"

# 默认分类常量
DEFAULT_CATEGORIES: list[str] = ["餐饮", "交通", "购物", "工资", "其他"]


def show_menu() -> None:
    """打印主菜单选项"""
    print("\n===== 记账本 =====")
    print("1. 记一笔账")
    print("2. 查看账目")
    print("3. 删除记录")
    print("4. 收支统计")
    print("5. 管理分类")
    print("0. 退出")


def load_records() -> list[dict]:
    """从 JSON 文件读取所有账目记录；文件不存在时返回空列表。
    若旧记录缺少 id 字段，自动补上并回写文件。
    """
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as file:
            records: list[dict] = json.load(file)
    except FileNotFoundError:
        # 第一次使用，还没有数据文件，返回空列表
        return []
    except json.JSONDecodeError:
        # 文件存在但内容损坏（如写入中断、手动编辑出错）
        print(f"警告：{DATA_FILE} 数据文件格式损坏，已重置为空数据。")
        return []

    # 兼容旧数据：先收集所有已有 ID，再为缺 ID 的记录分配新 ID
    needs_save: bool = False
    existing_ids: set[int] = {r["id"] for r in records if "id" in r}
    current_id: int = max(existing_ids, default=0) + 1  # 从最大 ID + 1 开始分配

    for record in records:
        if "id" not in record:
            record["id"] = current_id
            current_id += 1
            needs_save = True

    if needs_save:
        save_records(records)  # 将修复后的数据写回文件

    return records


def save_records(records: list[dict]) -> None:
    """将账目记录列表写入 JSON 文件（覆盖写入）"""
    # ensure_ascii=False 让中文直接显示，不被转成 \uXXXX
    # indent=2 让文件有缩进格式，方便人工查看
    with open(DATA_FILE, "w", encoding="utf-8") as file:
        json.dump(records, file, ensure_ascii=False, indent=2)


def next_id(records: list[dict]) -> int:
    """根据已有记录计算下一个可用的自增 ID"""
    if not records:
        return 1  # 没有记录时从 1 开始
    # max() 配合 key 参数，找出所有记录中 id 最大的那条，取其 id + 1
    return max(record["id"] for record in records) + 1


def add_record(categories: list[str]) -> None:
    """引导用户输入一条收支记录并保存到文件"""
    print("\n--- 记一笔账 ---")

    # 提前加载记录，用于生成自增 ID
    records: list[dict] = load_records()
    new_id: int = next_id(records)

    # 1. 收入 or 支出
    record_type: str = input("收入(i) / 支出(e)：").strip().lower()
    if record_type not in ("i", "e"):
        print("输入无效，已取消。")
        return
    # 用三元表达式把简写转成完整中文
    type_name: str = "收入" if record_type == "i" else "支出"

    # 2. 金额（需要转成浮点数）
    amount_str: str = input("金额：").strip()
    try:
        amount: float = float(amount_str)
    except ValueError:
        # 用户输入了非数字内容，捕获异常并取消
        print("金额必须是数字，已取消。")
        return
    if amount <= 0:
        # 金额必须是正数，零和负数都不合理
        print("金额必须大于 0，已取消。")
        return

    # 3. 分类（显示当前可用分类供选择）
    print(f"可选分类：{', '.join(categories)}")
    category: str = input("分类：").strip()
    if not category:
        print("分类不能为空，已取消。")
        return
    if category not in categories:
        print(f"分类「{category}」不在可选列表中，已取消。（可先去「管理分类」添加）")
        return

    # 4. 备注（可以不填）
    note: str = input("备注（可跳过）：").strip()

    # 5. 日期（默认今天，用户也可手动输入）
    today: str = date.today().isoformat()  # 格式："2026-06-10"
    date_str: str = input(f"日期（默认 {today}，格式 YYYY-MM-DD）：").strip()
    if not date_str:
        date_str = today
    else:
        # 校验日期格式是否合法
        try:
            datetime.strptime(date_str, "%Y-%m-%d")  # 解析失败会抛 ValueError
        except ValueError:
            print("日期格式无效（正确示例：2026-06-10），已取消。")
            return

    # 组装成一条记录字典，id 放在最前面方便查看
    record: dict = {
        "id": new_id,
        "type": type_name,
        "amount": amount,
        "category": category,
        "note": note,
        "date": date_str,
    }

    # 追加新记录 → 写回文件
    records.append(record)
    save_records(records)
    print(f"已保存：#{new_id} {type_name} {amount}元 [{category}]")


def show_records() -> None:
    """展示所有账目记录，每条一行紧凑显示"""
    records: list[dict] = load_records()
    if not records:
        print("\n还没有记录，快去记一笔账吧！")
        return

    print("\n--- 账目列表 ---")
    for record in records:
        # 每条记录打印一行：#id 类型 金额元 [分类] 备注 | 日期
        print(
            f"#{record['id']}  "
            f"{record['type']}  "
            f"{record['amount']}元  "
            f"[{record['category']}]  "
            f"{record['note']}  |  "
            f"{record['date']}"
        )
    print(f"共 {len(records)} 条记录")


def delete_record() -> None:
    """先展示账目，再根据用户输入的 ID 删除对应记录"""
    # 复用 show_records 让用户看到所有记录及编号
    show_records()
    records: list[dict] = load_records()
    if not records:
        return

    target_id_str: str = input("\n输入要删除的记录 ID（直接回车取消）：").strip()
    if not target_id_str:
        return

    try:
        target_id: int = int(target_id_str)
    except ValueError:
        print("ID 必须是数字，已取消。")
        return

    if target_id <= 0:
        print("ID 必须是正整数，已取消。")
        return

    # 遍历找到匹配的 id，删除并保存
    for i, record in enumerate(records):
        if record["id"] == target_id:
            # 二次确认，防止误删
            confirm: str = input(f"确认删除 #{target_id}？(y/n)：").strip().lower()
            if confirm == "y":
                records.pop(i)  # pop(i) 删除指定索引位置的元素
                save_records(records)
                print(f"已删除记录 #{target_id}")
            else:
                print("已取消删除。")
            return

    # 循环结束仍未找到，说明 ID 不存在
    print(f"找不到 ID 为 {target_id} 的记录。")


def show_statistics() -> None:
    """展示收支汇总统计：总收入、总支出、结余，以及分类支出明细"""
    records: list[dict] = load_records()
    if not records:
        print("\n还没有记录，无法统计。")
        return

    total_income: float = 0.0   # 总收入
    total_expense: float = 0.0  # 总支出
    category_expense: dict[str, float] = {}  # 按分类累加支出

    for record in records:
        amount: float = record["amount"]
        if record["type"] == "收入":
            total_income += amount
        else:
            total_expense += amount
            # 字典的 get() 方法：有该键则返回值，没有则返回默认值 0.0
            category_expense[record["category"]] = (
                category_expense.get(record["category"], 0.0) + amount
            )

    balance: float = total_income - total_expense  # 结余

    print("\n--- 收支统计 ---")
    print(f"总收入：{total_income:.2f} 元")  # :.2f 保留两位小数
    print(f"总支出：{total_expense:.2f} 元")
    print(f"结  余：{balance:.2f} 元")

    print("\n【分类支出明细】")
    # sorted() 按金额从大到小排序，reverse=True 表示降序
    for category, amount in sorted(
        category_expense.items(), key=lambda item: item[1], reverse=True
    ):
        print(f"  {category}：{amount:.2f} 元")


def load_categories() -> list[str]:
    """从 JSON 文件读取分类列表；文件不存在或损坏时返回默认分类"""
    try:
        with open(CATEGORIES_FILE, "r", encoding="utf-8") as file:
            return json.load(file)
    except FileNotFoundError:
        # 首次运行，用默认分类并立即保存一份到文件
        default: list[str] = DEFAULT_CATEGORIES.copy()
        save_categories(default)
        return default
    except json.JSONDecodeError:
        # 文件存在但内容损坏，恢复为默认分类
        print(f"警告：{CATEGORIES_FILE} 文件格式损坏，已恢复为默认分类。")
        default = DEFAULT_CATEGORIES.copy()
        save_categories(default)
        return default


def save_categories(categories: list[str]) -> None:
    """将分类列表写入 JSON 文件"""
    with open(CATEGORIES_FILE, "w", encoding="utf-8") as file:
        json.dump(categories, file, ensure_ascii=False, indent=2)


def manage_categories(categories: list[str]) -> None:
    """查看和新增自定义分类，新增后持久化保存"""
    print(f"当前分类：{', '.join(categories)}")
    new_cat: str = input("输入新分类名称（直接回车跳过）：").strip()

    if not new_cat:
        # 用户直接回车，不做任何操作
        return
    if new_cat in categories:
        # 分类已存在，给出明确提示
        print(f"分类「{new_cat}」已存在，无需重复添加。")
        return

    categories.append(new_cat)
    save_categories(categories)  # 追加后立即写入文件
    print(f"已添加分类：{new_cat}")


def main() -> None:
    """主程序：循环展示菜单并响应用户选择"""
    # 从文件加载分类（首次运行自动创建文件并写入默认分类）
    categories: list[str] = load_categories()

    while True:
        show_menu()
        choice: str = input("请选择功能编号：").strip()

        if choice == "1":
            add_record(categories)
        elif choice == "2":
            show_records()
        elif choice == "3":
            delete_record()
        elif choice == "4":
            show_statistics()
        elif choice == "5":
            manage_categories(categories)
        elif choice == "0":
            print("再见！")
            break
        else:
            print("无效输入，请重新选择。")


# __name__ == "__main__" 保证只有直接运行此文件时才执行 main()
if __name__ == "__main__":
    main()
