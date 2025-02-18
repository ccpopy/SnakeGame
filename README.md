# SnakeGame
贪吃蛇小游戏，类minecraft风格，简单支持排行榜系统，无聊捣鼓出来的，部分用了AI修改代码，侵删

## 使用说明
#### 前置准备
1. 需要[nodejs](https://nodejs.org/zh-cn/download)环境
2. 需要有mysql数据库
#### 下载
```powershell
git clone -b express https://github.com/ccpopy/SnakeGame.git
```
#### 依赖安装
```powershell
npm install
```
注：需要修改`routes/rankingsRoutes.js`里的数据库连接信息
#### 运行
```powershell
npm start
```
#### 接口
运行后将提供接口，提交成绩：`http://域名:3456/snake/rankings`、根据当前分数查询排名：`http://域名:3456/snake/rankings/rank?score=xxx`、分页查询排行榜所有数据：`http://域名:3456/snake/rankings?page=1&pageSize=10`
