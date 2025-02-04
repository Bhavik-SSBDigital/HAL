// import spdy from "spdy";
import express from "express";
// import fs from "fs/promises";
import http from "http";
import cors from "cors";
import router from "./routes/routes.js";
import db from "./db.js";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import dotenv from "dotenv";

import https from "https";
import fs from "fs";

// database connection
// dbConnection();

dotenv.config();

const PORT = process.env.PORT;

// const password = encodeURIComponent(process.env.MONGODB_PASS);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

app.use(express.static(path.join(__dirname, "build")));
app.use(cors());
app.use(bodyParser.json());

app.use(bodyParser.urlencoded({ extended: true }));
app.use("/", router);

app.get("*", (req, res) => {
  res.sendFile(path.resolve(__dirname, "build", "index.html"));
});

// export { userSockets };
app.listen(PORT, () => {
  // connection(password);
  console.log("listening on", `${PORT}`);
});

// spdy.createServer(options, app).listen(9000, async () => {
//   connection(password);
// });
