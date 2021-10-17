import MutexLock from "gcs-mutex-lock"
import { logger } from "./logger"

interface MutexWorker {
  start(): void
  shutdown(): Promise<void>
}

const mutex = new MutexLock({
  bucket: process.env.BUCKET,
  object: process.env.OBJECT,
  timeout: 10000
})

const createWorker = (action: () => Promise<void>) : MutexWorker => {
  let interval : NodeJS.Timer | null = null

  const perform = async () =>  {
    if (mutex.isLocked) {
      logger.info(`skip lock pid = ${process.pid}`)
      return
    }

    logger.info(`try lock pid = ${process.pid}`)
    const { success } = await mutex.acquire()

    if (!success) {
      logger.info(`lock failed pid = ${process.pid}`)
      return
    }
    logger.info(`locked pid = ${process.pid}`)

    try {
      await action()
    } catch (err) {
      logger.error(err)
    } finally {
      logger.info(`lock release pid = ${process.pid}`)
      const { success, err } = await mutex.release()
      if (success) {
        logger.info(`lock release done pid = ${process.pid}`)
      } else {
        logger.error(`lock release failed pid = ${process.pid} ${err.stack}`)
      }
    }
  }

  return {
    start() {
      logger.info(`start process pid = ${process.pid}`)
      interval = setInterval(() => {
        perform().then(() => {

        }).catch((err) => {
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
    process.exit()
  }).catch((err) => {
    logger.error(`process shutdown completed pid = ${process.pid}, ${err.stack}`)
    process.exit(-1)
  })
}

const worker = createWorker(async () => {
  logger.info(`process pid = ${process.pid}`)
})

worker.start()

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)
