// import spdy from "spdy";
import express from "express";
// import fs from "fs/promises";
import http from "http";
import cors from "cors";
import router from "./routes/routes.js";
import db from "./db.js";
import { Server } from "socket.io";
import User from "./models/user.js";
import Process from "./models/process.js";
import Department from "./models/department.js";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import dotenv from "dotenv";
import { ObjectId } from "mongodb";
// database connection
// dbConnection();

dotenv.config();

const PORT = process.env.PORT;

// const password = encodeURIComponent(process.env.MONGODB_PASS);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"], // You can specify other allowed methods as needed
    allowedHeaders: ["my-custom-header"],
    credentials: true,
  },
});

app.use(express.static(path.join(__dirname, "build")));
app.use(cors());
app.use(bodyParser.json());

app.use(bodyParser.urlencoded({ extended: true }));
app.use("/", router);

export const userSockets = new Map();

// Start the HTTP/2 server with spdy
// const options = {
//   key: await fs.readFile('./private-key.pem'),
//   cert: await fs.readFile('./certificate.pem')
// };

server.listen(8000, () => console.log(`Listening on port ${8000}`));

io.on("connection", (socket) => {
  socket.on("login", (username) => {
    userSockets.set(username, socket);
  });

  socket.on("joinMeetingRoom", ({ meetingId, username }) => {
    socket.join(meetingId);
    console.log(`${username} joined room ${meetingId}`);
    io.to(meetingId).emit("userJoined", { username });
  });

  socket.on("leaveMeetingRoom", ({ meetingId, username }) => {
    socket.leave(meetingId);
    console.log(`${username} left room ${meetingId}`);
    io.to(meetingId).emit("userLeft", { username });
  });

  socket.on("sendMessageToRoom", ({ meetingId, message }) => {
    io.to(meetingId).emit("newMessage", message);
  });

  socket.on("offer", (roomId, offer) => {
    socket.to(roomId).emit("receiveOffer", offer);
  });

  socket.on("answer", (roomId, answer) => {
    socket.to(roomId).emit("receiveAnswer", answer);
  });

  socket.on("iceCandidate", (roomId, candidate) => {
    socket.to(roomId).emit("receiveIceCandidate", candidate);
  });

  socket.on("disconnect", () => {
    userSockets.forEach((value, key) => {
      if (value === socket) {
        userSockets.delete(key);
      }
    });
  });
});

app.get("*", (req, res) => {
  res.sendFile(path.resolve(__dirname, "build", "index.html"));
});

// export { userSockets };
app.listen(PORT, () => {
  // connection(password);
  db();
  const processChangeStream = Process.watch();

  processChangeStream.on("change", async (change) => {
    if (change.operationType === "update") {
      const updatedProcess = await Process.findOne({
        _id: change.documentKey._id,
      });

      const updatedConnectorPaths = Object.keys(
        change.updateDescription.updatedFields
      ).filter(
        (path) =>
          path.startsWith("connectors.") && path.endsWith(".currentActorUser")
      );

      try {
        if (updatedProcess) {
          if (
            change.updateDescription.updatedFields.hasOwnProperty(
              "lastStepDone"
            )
          ) {
            // The 'lastStepDone' property exists within updatedFields
            const department = await Department.findOne({
              _id: updatedProcess.workFlow,
            }).select("steps");

            const steps = department.steps;

            const updatedLastStepNumber =
              change.updateDescription.updatedFields.lastStepDone;

            if (updatedLastStepNumber < steps.length) {
              // const userProcessIsForwardedTo =
              //   steps[updatedLastStepNumber].actorUser;

              const usersProcessIsForwardedTo = steps[
                change.updateDescription.updatedFields.currentStepNumber - 1
              ].users.map((item) => item.user);

              let process = await Process.findOne({
                _id: updatedProcess._id,
              }).select(
                "_id name completed createdAt isInterBranchProcess workFlow"
              );
              if (process !== undefined) {
                for (let m = 0; m < usersProcessIsForwardedTo.length; m++) {
                  let usernameOfProcessIsForwardedTo = await User.findOne({
                    _id: usersProcessIsForwardedTo[m],
                  }).select("username notifications");

                  const username = usernameOfProcessIsForwardedTo.username;

                  const userSocket = userSockets.get(username);

                  let notification = {
                    processId: process._id,
                    processName: process.name,
                    completed: process.completed,
                    receivedAt: Date.now(),
                    isPending: updatedProcess.pending,
                  };

                  if (!process.isInterBranchProcess) {
                    notification["workFlowToBeFollowed"] = process.workFlow;
                  }

                  if (usernameOfProcessIsForwardedTo.notifications) {
                    usernameOfProcessIsForwardedTo.notifications.push(
                      notification
                    );
                    const z = await usernameOfProcessIsForwardedTo.save();
                  } else {
                    usernameOfProcessIsForwardedTo.notifications = [];
                    usernameOfProcessIsForwardedTo.notifications.push(
                      notification
                    );

                    const z = await usernameOfProcessIsForwardedTo.save();
                  }

                  if (userSocket) {
                    userSocket.emit("processesUpdated", {
                      newProcess: {
                        processId: process._id,
                        processName: process.name,
                        completed: process.completed,
                        receivedAt: Date.now(),
                        isPending: updatedProcess.pending,
                        workFlowToBeFollowed: process.workFlow,
                      },
                    });
                  }
                }
              }
            }
          } else if (
            change.updateDescription.updatedFields.hasOwnProperty(
              "currentActorUser"
            )
          ) {
            const updatedCurrentActorUser =
              change.updateDescription.updatedFields.currentActorUser;

            let process = await Process.findOne({
              _id: updatedProcess._id,
            }).select("_id currentStepNumber workFlow");

            const department = await Department.findOne({
              _id: process.workFlow,
            }).select("steps");

            let currentStepUsersExceptUserWhoPickedProcess = department.steps[
              process.currentStepNumber - 1
            ].users
              .map((item) => item.user)
              .filter(
                (item) => !item.equals(new ObjectId(updatedCurrentActorUser))
              );

            for (
              let k = 0;
              k < currentStepUsersExceptUserWhoPickedProcess.length;
              k++
            ) {
              const user = currentStepUsersExceptUserWhoPickedProcess[k];
              const userObject = await User.findOne({ _id: user }).select(
                "notifications processes username"
              );
              userObject.notifications = userObject.notifications.filter(
                (item) =>
                  !item.processId.equals(new ObjectId(updatedProcess._id))
              );
              userObject.processes = userObject.processes.filter(
                (item) => !item.process.equals(new ObjectId(updatedProcess._id))
              );

              await userObject.save();

              const userSocket = userSockets.get(userObject.username);

              if (userSocket) {
                userSocket.emit("pickedProcess", {
                  processId: updatedProcess._id,
                });
              }
            }
          } else if (updatedConnectorPaths.length > 0) {
            // Iterate over the paths of updated connectors
            updatedConnectorPaths.forEach(async (path) => {
              // Extract the updated currentActorUser value

              // Extract the index of the connector from the path
              const connectorIndex = parseInt(path.split(".")[1]);

              // Find the corresponding connector in the process
              const updatedConnector =
                updatedProcess.connectors[connectorIndex];

              // Check if currentActorUser in this connector has changed

              // Extract the updated currentActorUser value

              const updatedCurrentActorUser = updatedConnector.currentActorUser;

              // Find the process corresponding to the updated connector
              let process = await Process.findOne({
                _id: updatedProcess._id,
              }).select("_id connectors");

              // Find the target connector in the process
              const targetConnector = process.connectors.find((item) =>
                item.department.equals(
                  new ObjectId(updatedConnector.department)
                )
              );

              // Find the department associated with the updated connector
              const department = await Department.findOne({
                _id: updatedConnector.department,
              }).select("steps");

              // Filter out the users who are not the updated currentActorUser
              const currentStepNumber = targetConnector.currentStepNumber || 1;
              let currentStepUsersExceptUserWhoPickedProcess = department.steps[
                currentStepNumber - 1
              ].users
                .map((item) => item.user)
                .filter(
                  (item) => !item.equals(updatedConnector.currentActorUser)
                );

              // Iterate over the filtered users
              for (
                let k = 0;
                k < currentStepUsersExceptUserWhoPickedProcess.length;
                k++
              ) {
                const user = currentStepUsersExceptUserWhoPickedProcess[k];
                const userObject = await User.findOne({
                  _id: user,
                }).select("notifications processes username");

                // Filter out notifications related to the updated process
                userObject.notifications = userObject.notifications.filter(
                  (item) =>
                    !item.processId.equals(new ObjectId(updatedProcess._id))
                );

                // Filter out processes related to the updated process
                userObject.processes = userObject.processes.filter(
                  (item) =>
                    !item.process.equals(new ObjectId(updatedProcess._id))
                );

                // Save the updated user object
                await userObject.save();

                // Emit an event to the user's socket if available
                const userSocket = userSockets.get(userObject.username);
                if (userSocket) {
                  userSocket.emit("pickedProcess", {
                    processId: updatedProcess._id,
                  });
                }
              }
            });
          } else {
            console.log("problem found");
          }
        }
      } catch (error) {
        console.log("error reacting on updation of process", error);
      }
    }
  });
  console.log("listening on", `${PORT}`);
});

// spdy.createServer(options, app).listen(9000, async () => {
//   connection(password);
// });
