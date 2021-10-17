import { createLogger } from "bunyan"

export const logger = createLogger({
  streams: [process.stdout]
})
