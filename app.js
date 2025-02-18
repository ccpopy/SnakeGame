const express = require('express');
const cors = require('cors');
// 排行榜
const rankingsRoutes = require('./routes/rankingsRoutes');

const app = express();

// 开启跨域支持
app.use(cors());
// 解析 JSON 请求体
app.use(express.json());

// 注册路由模块
app.use(rankingsRoutes);
app.use(proxyRoutes);


// 启动服务，监听3456端口
const PORT = 3456;
app.listen(PORT, () => {
  console.log(`服务器已启动，监听端口 ${PORT}`);
});