import winston from "winston";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Custom transport to log to SystemLog model
class PrismaTransport extends winston.Transport {
  constructor(options = {}) {
    super(options);
  }

  async log(info, callback) {
    setImmediate(async () => {
      try {
        // Extract action, userId, and details from info.message if it exists
        const logData = info.message || {};
        await prisma.systemLog.create({
          data: {
            userId: logData.userId || info.userId || null,
            action: logData.action || info.action || "UNKNOWN",
            details: logData.details || info.details || {},
            timestamp: new Date(),
          },
        });
      } catch (error) {
        console.error("Error logging to database:", error);
      }
      this.emit("logged", info);
    });
    callback();
  }
}

// Configure Winston logger
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    // Log to file
    new winston.transports.File({ filename: "logs/app.log" }),
    // Log to database
    new PrismaTransport(),
  ],
});

export default logger;
