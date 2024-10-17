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
  cors: {
    origin: "*",
    methods: ["GET", "POST"], // You can specify other allowed methods as needed
    allowedHeaders: ["my-custom-header"],
    credentials: true,
  },
});

const socketNamespace = io.of("/socket");

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

server.listen(5000, () => console.log(`Listening on port ${5000}`));

// 1st backend
// io.on("connection", (socket) => {
//   socket.on("login", (username) => {
//     userSockets.set(username, socket);
//   });

//   socket.on("joinMeetingRoom", ({ meetingId, username }) => {
//     socket.join(meetingId);
//     console.log(`${username} joined room ${meetingId}`);
//     io.to(meetingId).emit("userJoined", { username });
//   });

//   socket.on("leaveMeetingRoom", ({ meetingId, username }) => {
//     socket.leave(meetingId);
//     console.log(`${username} left room ${meetingId}`);
//     io.to(meetingId).emit("userLeft", { username });
//   });

//   socket.on("sendMessageToRoom", ({ meetingId, message }) => {
//     io.to(meetingId).emit("newMessage", message);
//   });

//   socket.on("offer", (roomId, offer) => {
//     socket.to(roomId).emit("receiveOffer", offer);
//   });

//   socket.on("answer", (roomId, answer) => {
//     socket.to(roomId).emit("receiveAnswer", answer);
//   });

//   socket.on("iceCandidate", (roomId, candidate) => {
//     socket.to(roomId).emit("receiveIceCandidate", candidate);
//   });

//   socket.on("disconnect", () => {
//     userSockets.forEach((value, key) => {
//       if (value === socket) {
//         userSockets.delete(key);
//       }
//     });
//   });
// });

// 2nd backend
// io.on("connection", (socket) => {
//   console.log(`User connected: ${socket.id}`);

//   // Handle user login (optional, based on frontend)
//   socket.on("login", ({ username }) => {
//     socket.username = username || "Anonymous";
//     console.log(`User logged in: ${socket.username} (${socket.id})`);
//   });

//   // Handle joining a meeting room
//   socket.on("joinMeetingRoom", ({ meetingId, username }) => {
//     socket.join(meetingId);
//     socket.username = username || "Anonymous";

//     if (!rooms[meetingId]) {
//       rooms[meetingId] = {};
//     }
//     rooms[meetingId][socket.id] = socket.username;

//     // Notify existing users in the room about the new user
//     socket.to(meetingId).emit("userJoined", {
//       username: socket.username,
//       socketId: socket.id,
//     });

//     // Send existing users to the newly joined user
//     const existingUsers = Object.keys(rooms[meetingId])
//       .filter((id) => id !== socket.id)
//       .map((id) => ({ socketId: id, username: rooms[meetingId][id] }));

//     socket.emit("existingUsers", existingUsers);

//     console.log(`${socket.username} joined room: ${meetingId}`);
//   });

//   // Handle leaving a meeting room
//   socket.on("leaveMeetingRoom", ({ meetingId, username }) => {
//     socket.leave(meetingId);

//     if (rooms[meetingId]) {
//       delete rooms[meetingId][socket.id];
//       // Notify remaining users in the room
//       socket.to(meetingId).emit("userLeft", {
//         username: socket.username,
//         socketId: socket.id,
//       });

//       console.log(`${socket.username} left room: ${meetingId}`);

//       // If the room is empty, delete it
//       if (Object.keys(rooms[meetingId]).length === 0) {
//         delete rooms[meetingId];
//         console.log(`Room deleted: ${meetingId}`);
//       }
//     }
//   });

//   // Handle sending an offer
//   socket.on("offer", ({ meetingId, to, offer }) => {
//     io.to(to).emit("offer", {
//       from: socket.id,
//       offer,
//     });
//     console.log(`Offer from ${socket.id} to ${to} in room ${meetingId}`);
//   });

//   // Handle sending an answer
//   socket.on("answer", ({ meetingId, to, answer }) => {
//     io.to(to).emit("answer", {
//       from: socket.id,
//       answer,
//     });
//     console.log(`Answer from ${socket.id} to ${to} in room ${meetingId}`);
//   });

//   // Handle sending ICE candidates
//   socket.on("ice-candidate", ({ meetingId, to, candidate }) => {
//     io.to(to).emit("ice-candidate", {
//       from: socket.id,
//       candidate,
//     });
//     // console.log(`ICE candidate from ${socket.id} to ${to} in room ${meetingId}`);
//   });

//   // Handle sending chat messages
//   socket.on("sendMessageToRoom", ({ meetingId, message }) => {
//     io.to(meetingId).emit("newMessage", message);
//     console.log(
//       `Message from ${socket.username} in room ${meetingId}: ${message.text}`
//     );
//   });

//   // Handle user disconnect
//   socket.on("disconnect", () => {
//     console.log(`User disconnected: ${socket.id}`);

//     // Iterate through all rooms to find where the user was
//     for (const [meetingId, participants] of Object.entries(rooms)) {
//       if (participants[socket.id]) {
//         const username = participants[socket.id];
//         socket.to(meetingId).emit("userLeft", {
//           username,
//           socketId: socket.id,
//         });
//         delete rooms[meetingId][socket.id];
//         console.log(`${username} disconnected and left room: ${meetingId}`);

//         // If the room is empty, delete it
//         if (Object.keys(rooms[meetingId]).length === 0) {
//           delete rooms[meetingId];
//           console.log(`Room deleted: ${meetingId}`);
//         }
//         break; // Assuming a user is only in one room
//       }
//     }
//   });
// });

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
