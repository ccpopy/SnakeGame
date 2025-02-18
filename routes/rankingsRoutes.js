const express = require('express');
const mysql = require('mysql2');

const router = express.Router();
const pool = mysql.createPool({
  host: '127.0.0.1',
  port: 3306,
  // 在下面输入mysql数据库用户名
  user: '***',
  // 在下面输入mysql数据库密码
  password: '***',
  database: 'snake_game'
});

const SECRET_KEY = [
  0xbf, 0x67, 0x0f, 0x89, 0x67, 0x50, 0xf7, 0xbb,
  0x48, 0x8f, 0xb9, 0x83, 0xd0, 0x93, 0xcd, 0x8d,
  0x16, 0xd3, 0x1b, 0x4a, 0xa5, 0xec, 0xcc, 0xbb,
  0x85, 0x54, 0x4a, 0x89, 0xfa, 0x20, 0x91, 0xe9
];

function generateSignature (time, score) {
  // 初始化为无符号32位
  let hash = 0x811C9DC5 >>> 0;
  const food_eaten = Math.floor(score / 10);

  for (let i = 0; i < SECRET_KEY.length; i++) {
    const byte = SECRET_KEY[i] & 0xFF;
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  // 按顺序执行异或、加法、异或
  hash = (hash ^ score) >>> 0;
  hash = (hash + food_eaten) >>> 0;
  hash = (hash ^ time) >>> 0;
  hash = (hash ^ (hash >>> 16)) >>> 0;

  // 转换为8位十六进制并补前导零
  return hash.toString(16).padStart(8, '0');
}

// 启动时确保表存在（排行榜表）
pool.query(`CREATE TABLE IF NOT EXISTS rankings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  score INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`, (err, results) => {
  if (err) {
    console.error("创建表 rankings 出错:", err);
  } else {
    console.log("排行榜加载成功。");
  }
});

/**
 * 1. 提交成绩接口
 *    POST /snake/rankings
 *    参数：{ username: string, score: number }
 *    仅插入记录，不返回排名信息
 */
router.post('/snake/rankings', (req, res) => {
  const { username, score, signature, timestamp } = req.body;
  if (!username || typeof score !== 'number') {
    return res.status(400).json({ error: '参数错误' });
  }
  // 计算签名并验证
  const generatedSignature = generateSignature(timestamp, score);
  if (generatedSignature !== signature) {
    return res.status(400).json({ error: '签名验证失败' });
  }
  pool.query(
    'INSERT INTO rankings (username, score) VALUES (?, ?)',
    [username, score],
    (err, result) => {
      if (err) {
        console.error("插入排行榜记录出错:", err);
        return res.status(500).json({ error: '数据库错误' });
      }
      res.status(200).json({ message: '记录提交成功', id: result.insertId });
    }
  );
});

/**
 * 2. 根据当前分数查询排名接口（不提交该分数）
 *    GET /snake/rankings/rank?score=xxx
 *    计算规则：统计分数大于传入分数的记录数，
 *      或分数相等但提交时间早于当前时间的记录数，再加 1
 *    这里使用 NOW() 作为当前提交时间
 */
router.get('/snake/rankings/rank', (req, res) => {
  let { score } = req.query;
  score = parseInt(score, 10);
  if (isNaN(score)) {
    return res.status(400).json({ error: 'score 参数错误' });
  }
  pool.query(
    'SELECT COUNT(*) AS `rank` FROM rankings WHERE score > ? OR (score = ? AND created_at < NOW())',
    [score, score],
    (err, rankRows) => {
      if (err) {
        console.error("计算排名出错:", err);
        return res.status(500).json({ error: '数据库错误' });
      }
      const rank = rankRows[0].rank + 1;
      res.json({ rank });
    }
  );
});

/**
 * 3. 分页查询所有排行榜数据接口
 *    GET /snake/rankings?page=1&pageSize=10
 *    如果未传分页参数，则默认返回第一页 10 条数据，并返回分页信息
 *    排序规则：得分降序，得分相同时按 created_at 升序
 */
router.get('/snake/rankings', (req, res) => {
  let page = parseInt(req.query.page, 10) || 1;
  let pageSize = parseInt(req.query.pageSize, 10) || 10;
  if (page < 1) page = 1;
  if (pageSize < 1) pageSize = 10;
  const offset = (page - 1) * pageSize;

  // 查询总记录数
  pool.query(
    'SELECT COUNT(*) AS total FROM rankings',
    (err, countRows) => {
      if (err) {
        console.error("查询总记录数出错:", err);
        return res.status(500).json({ error: '数据库错误' });
      }
      const total = countRows[0].total;
      const totalPages = Math.ceil(total / pageSize);
      // 查询分页数据
      pool.query(
        'SELECT username, score, created_at FROM rankings ORDER BY score DESC, created_at ASC LIMIT ? OFFSET ?',
        [pageSize, offset],
        (err, rows) => {
          if (err) {
            console.error("查询排行榜出错:", err);
            return res.status(500).json({ error: '数据库错误' });
          }
          // 计算每条记录的全局排名（由于全局排序，可用 offset+index+1 计算）
          const rankings = rows.map((row, index) => ({
            rank: offset + index + 1,
            username: row.username,
            score: row.score,
            created_at: row.created_at
          }));
          res.json({
            total,
            totalPages,
            page,
            pageSize,
            rankings
          });
        }
      );
    }
  );
});

module.exports = router;