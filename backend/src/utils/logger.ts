import pino from "pino";
import config from "../config/index.js";

const logger = pino({
  level: config.NODE_ENV === "production" ? "info" : "debug",
  transport: config.NODE_ENV !== "production" ? {
    target: "pino-pretty",
    options: {
      colorize: true,
    },
  } : undefined,
});

export default logger;
