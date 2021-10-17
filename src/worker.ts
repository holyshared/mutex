import MutexLock from "gcs-mutex-lock"
import { logger } from "./logger"

interface MutexWorker {
  start(): void
  shutdown(): Promise<void>
}

const mutex = new MutexLock({
  bucket: process.env.BUCKET,
  object: process.env.OBJECT
})

const createWorker = (action: () => Promise<void>) : MutexWorker => {
  let interval : NodeJS.Timer | null = null

  const perform = async () =>  {
    logger.info(`try lock pid = ${process.pid}`)
    const { success, err } = await mutex.acquire()

    if (!success) {
      logger.info(`lock failed pid = ${process.pid}`)
      if (err) {
        logger.error(err)
      }
      return
    }

    try {
      await action()
    } catch (err) {
      logger.error(err)
    } finally {
      await mutex.release()
    }
  }

  return {
    start() {
      logger.info(`start process pid = ${process.pid}`)
      interval = setInterval(() => {
        perform().then().catch((err) => {
          logger.error(err)
        })
      }, 10000)
    },
    async shutdown() {
      clearInterval(interval)
      if (!mutex.isLocked) {
        return
      }
      await mutex.release()
    }
  }
}

const shutdown = () => {
  logger.info(`process shutdown pid = ${process.pid}`)
  worker.shutdown().then(() => {
    logger.info(`process shutdown completed pid = ${process.pid}`)
  }).catch((err) => {
    logger.error(`process shutdown completed pid = ${process.pid}, ${err.stack}`)
  })
}

const worker = createWorker(async () => {
  logger.info(`process pid = ${process.pid}`)
})

worker.start()

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)
