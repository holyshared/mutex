import MutexLock from "gcs-mutex-lock"
import { logger } from "./logger"

interface MutexWorker {
  start(): void
  shutdown(): void
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
      interval = setInterval(() => {
        perform().then().catch((err) => {
          logger.error(err)
        })
      }, 50000)
    },
    shutdown() {
      clearInterval(interval)
    }
  }
}

const worker = createWorker(async () => {
  logger.info(`process pid = ${process.pid}`)
})

worker.start()

process.on("SIGINT", () => {
  worker.shutdown()
})
process.on("SIGTERM", () => {
  worker.shutdown()
})