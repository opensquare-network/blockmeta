NODE_ENV=production pm2 start src/index.js --name prod-meta-polkadot --log-date-format 'YYYY-MM-DD HH:mm Z' --env production --max-memory-restart 600M
