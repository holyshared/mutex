import cluster from "cluster"
import path from "path"
import os from "os"
import { logger } from "./logger"

const numCPUs = parseInt(process.env.WEB_CONCURRENCY, 10) || os.cpus().length

cluster.setupMaster({
  exec: path.resolve(__dirname, "worker.js"),
  silent: false,
});

for (let i = 0; i < numCPUs; i++) {
  const worker = cluster.fork();
  logger.info("worker %d started", worker.process.pid);
}

const shutdown = () => {
  for (const id in cluster.workers) {
    cluster.workers[id].kill();
  }
};

cluster.on("exit", worker => {
  logger.info("worker %d died", worker.process.pid);

  if (worker.exitedAfterDisconnect === true) {
    return;
  }

  logger.info("worker started");
  cluster.fork();
});
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
