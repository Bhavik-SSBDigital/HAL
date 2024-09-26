import mongoose from "mongoose";
import { startSettingPendingProcessNumber } from "./schedulers/process-pending-count-scheduler.js";
const db = () => {
  const connectionParams = {
    newUrlParser: true,
    useUnifiedTopology: true,
  };

  try {
    mongoose.connect(process.env.DB_URL, {
      useUnifiedTopology: true,
      useNewUrlParser: true,
    });
    startSettingPendingProcessNumber();
  } catch (error) {
    console.log("error connecting database", error);
  }
};

export default db;
