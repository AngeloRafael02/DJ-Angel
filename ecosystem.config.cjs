/**
 * PM2 process definition: daemon, crash recovery, separate stdout/stderr logs.
 * Start: npm run pm2:start
 * Log rotation (10MB, retain old files): npm run pm2:logrotate:install then npm run pm2:logrotate:configure
 */
const path = require("path");

const root = __dirname;
const tsxCli = path.join(root, "node_modules", "tsx", "dist", "cli.mjs");

module.exports = {
  apps: [
    {
      name: "dj-angel",
      cwd: root,
      script: tsxCli,
      args: "src/index.ts",
      interpreter: "node",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 50,
      min_uptime: "10s",
      exp_backoff_restart_delay: 100,
      merge_logs: false,
      error_file: path.join(root, "logs", "dj-angel-error.log"),
      out_file: path.join(root, "logs", "dj-angel-out.log"),
      time: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
  ],
};
