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

const options = {
  key: fs.readFileSync("/etc/letsencrypt/live/dms.ssbd.in/privkey.pem"),
  cert: fs.readFileSync("/etc/letsencrypt/live/dms.ssbd.in/fullchain.pem"),
};

const server = https.createServer(options, app);

const io = new Server(server, {
  path: "/socket/",
  cors: {
    origin: "*",
    methods: ["GET", "POST"], // You can specify other allowed methods as needed
    allowedHeaders: ["my-custom-header"],
    credentials: true,
  },
});

const socketNamespace = io.of("/socket/");

export const userSockets = new Map();

// Start the HTTP/2 server with spdy
// const options = {
//   key: await fs.readFile('./private-key.pem'),
//   cert: await fs.readFile('./certificate.pem')
// };

server.listen(5000, () => console.log(`Listening on port ${5000}`));

server.on("error", (error) => {
  console.error("Server error:", error);
  // You can also add logic to handle different types of errors
  // For example, if it's a port already in use error:
  if (error.code === "EADDRINUSE") {
    console.error(
      `Port ${5000} is already in use. Please choose another port.`
    );
    process.exit(1); // Exit the process
  }
});

// 3rd backend
const usernames = {}; // Object to store socket.id to username mapping

socketNamespace.on("connection", (socket) => {
  console.log(`New client connected in namespace '/socket': ${socket.id}`);

  // Handle joining a room
  socket.on("join-room", ({ roomId, username }) => {
    socket.join(roomId);
    usernames[socket.id] = username; // Store the username

    console.log(
      `Socket ${socket.id} (Username: ${username}) joined room ${roomId}`
    );

    // Notify existing users in the room about the new user, including username
    socket.to(roomId).emit("user-joined", { socketId: socket.id, username });

    // Send the list of all users (including their usernames) in the room to the newly joined user
    const usersInRoom = Array.from(
      socketNamespace.adapter.rooms.get(roomId) || []
    )
      .map((id) => ({ socketId: id, username: usernames[id] }))
      .filter((user) => user.socketId !== socket.id); // Exclude the new user itself

    socket.emit("room-users", usersInRoom);

    // Handle sending offers
    socket.on("offer", (data) => {
      const { target, offer } = data;
      socketNamespace.to(target).emit("offer", {
        from: socket.id,
        offer,
        name: username,
      });
    });

    // Handle sending answers
    socket.on("answer", (data) => {
      const { target, answer } = data;
      socketNamespace.to(target).emit("answer", {
        from: socket.id,
        answer,
        name: username,
      });
    });

    // Handle sending ICE candidates
    socket.on("ice-candidate", (data) => {
      const { target, candidate } = data;
      socketNamespace.to(target).emit("ice-candidate", {
        from: socket.id,
        candidate,
      });
    });

    // Handle sending messages to the room
    socket.on("sendMessage", ({ meetingId, message, username }) => {
      console.log(`message from ${username} for ${meetingId}: ${message}`);
      socketNamespace
        .to(meetingId)
        .emit("message", { user: username, text: message });

      const usersInRoom = Array.from(
        socketNamespace.adapter.rooms.get(meetingId) || []
      )
        .map((id) => ({ socketId: id, username: usernames[id] }))
        .filter((user) => user.socketId !== socket.id); // Update the room users
      console.log("users in room", usersInRoom);
    });

    // Handle leaving the room
    socket.on("leave-room", ({ roomId, username }) => {
      socket.leave(roomId);
      delete usernames[socket.id]; // Remove the user from the mapping

      console.log(
        `Socket ${socket.id} (Username: ${username}) left room ${roomId}`
      );

      // Notify other users in the room that this user has left
      socket.to(roomId).emit("user-left", { socketId: socket.id, username });
    });

    socket.on("error", (error) => {
      console.error(`Socket error on ${socket.id}:`, error);
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
      const username = usernames[socket.id];
      delete usernames[socket.id]; // Remove the user from the mapping

      // Notify others of this disconnection, if the user was in a room
      const rooms = Array.from(socket.rooms);
      rooms.forEach((roomId) => {
        socket.to(roomId).emit("user-left", {
          socketId: socket.id,
          username,
        });
      });
    });
  });
});

app.use(express.static(path.join(__dirname, "build")));
app.use(cors());
app.use(bodyParser.json());

app.use(bodyParser.urlencoded({ extended: true }));
app.use("/", router);

app.get("*", (req, res) => {
  console.log("hit general url");
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
