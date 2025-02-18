module.exports = {
  apps: [
    {
      name: 'proxy-server',    // PM2 进程名称
      script: 'app.js',        // 启动脚本文件
      watch: true,             // 开启 watch 模式
      ignore_watch: ['node_modules', 'log', 'package-lock.json'],
      // 指定日志文件路径
      error_file: './log/app.err.log',  // 错误日志
      out_file: './log/app.out.log',    // 正常输出日志
      log_file: './log/app.combined.log', // 合并日志（会包含错误日志和输出日志）
      merge_logs: true,        // 如果有多个实例，则合并日志
    },
  ],
};
