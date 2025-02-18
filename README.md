# SnakeGame
贪吃蛇小游戏，类minecraft风格，简单支持排行榜系统，无聊捣鼓出来的，部分用了AI修改代码，侵删

## 使用说明
#### 前置准备
1. 需要[Emscripten 编译器前端 (emcc)](https://emscripten.webassembly.net.cn/docs/getting_started/downloads.html)，用于将c语言生成wasm文件以及game_data.js
#### 编译
emcc ./game_data.c -O3 -s ENVIRONMENT=web -s WASM=1 -s EXPORTED_FUNCTIONS="['_startSession','_recordFood','_setScore','_getFoodEaten','_generateSignature']" -s MODULARIZE=1 -s EXPORT_NAME="createGameModule" -flto -o ./game_data.js
