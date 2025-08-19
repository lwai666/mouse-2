module.exports = {
  apps: [
    {
      name: "mouse-hid-backend",
      script: "backend/server.js",
      instances: 1,                // 进程实例数（1 表示单实例，可改为 'max' 以使用所有 CPU）
      exec_mode: "fork",           // 运行模式：fork（单进程）或 cluster（多进程）
      watch: false,                // 是否监听文件变动自动重启
      env: {
        NODE_ENV: "production",    // 生产环境变量
        PORT: 3010                 // 端口号（可根据实际情况修改）
      }
    }
  ]
};
