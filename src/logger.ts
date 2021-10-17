import { createLogger } from "bunyan"

export const logger = createLogger({
  name: "mutex-locks",
  streams: [{
    level: 'info',
    stream: process.stdout
  }]
})
