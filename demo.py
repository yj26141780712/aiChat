#命令行账本
#功能列表
#1.记账
#2.查看账目列表
#3.删除记录
#4.收支统计
#5.管理分类
#6.退出系统
#数据结构 收入/支出 金额 日期 类型 描述

def showMenu():
    print("1.记账")
    print("2.查看账目列表")
    print("3.删除记录")
    print("4.收支统计")
    print("5.管理分类")
    print("6.退出系统")

def main():
    print("欢迎使用命令行账本系统")
    while True:
        showMenu()
        choice = input("请输入你的选择：")
        if choice == "1":
            print("记账功能正在开发中")
        elif choice == "2":
            print("查看账目列表功能正在开发中")
        elif choice == "3":
            print("删除记录功能正在开发中")
        elif choice == "4":
            print("收支统计功能正在开发中")
        elif choice == "5":
            print("管理分类功能正在开发中")
        elif choice == "6":
            print("退出系统")
            break
        else:
            print("无效的选择，请重新输入") 

main()

