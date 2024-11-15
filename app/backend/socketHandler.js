import { Server } from "socket.io";
import {
  add_comment_in_meeting,
  add_participant_in_meeting,
} from "./controller/meeting-controller.js";
import User from "./models/user.js";
import { ObjectId } from "mongodb";
import Meeting from "./models/Meeting.js";

let io;
let usernames = [];

export const initializeSocket = (server) => {
  io = new Server(server, {
    transports: ["websocket"],
    path: "/socket.io/",
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      allowedHeaders: ["my-custom-header"],
      credentials: true,
    },
  });

  // Creating a custom namespace '/socket.io'
  const socketNamespace = io.of("/socket.io");

  socketNamespace.on("connection", async (socket) => {
    console.log("New client connected to /socket.io/ namespace:", socket.id);

    socket.on("join-room", async ({ roomId, username }) => {
      socket.join(roomId);

      const participant = await User.findOne({ username: username }).select(
        "_id"
      );

      await add_participant_in_meeting(roomId, participant._id);

      const meet = await Meeting.findOne({ meetingId: roomId }).select("logs");

      meet.logs.push({
        attendee: participant._id,
        joinedAt: Date.now(),
      });

      await meet.save();

      usernames.push({ socketId: socket.id, username }); // Add user

      // Notify other users in the room about the new user
      socket.to(roomId).emit("user-joined", { socketId: socket.id, username });

      // Send the list of users in the room to the newly joined user
      const usersInRoom = Array.from(
        socketNamespace.adapter.rooms.get(roomId) || []
      )
        .map((id) => ({
          socketId: id,
          username: usernames.find((u) => u.socketId === id).username,
        }))
        .filter((user) => user.socketId !== socket.id);

      socket.emit("room-users", usersInRoom);

      // Handle sending messages to the room
      socket.on("sendMessage", async ({ meetingId, message, username }) => {
        socketNamespace
          .to(meetingId)
          .emit("message", { user: username, text: message });

        const commentor = await User.findOne({ username: username }).select(
          "_id"
        );

        await add_comment_in_meeting(meetingId, commentor._id, message.text);

        const room = socketNamespace.adapter.rooms.get(meetingId);
        if (!room) {
          console.log(`Room with meetingId ${meetingId} does not exist`);
          return;
        }

        const usersInRoom = Array.from(room)
          .map((id) => ({
            socketId: id,
            username: usernames.find((item) => item.socketId === id).username,
          }))
          .filter((user) => user.socketId !== socket.id);
      });

      // Handle offers, answers, and ICE candidates
      socket.on("offer", (data) => {
        const { target, offer } = data;
        socketNamespace.to(target).emit("offer", {
          from: socket.id,
          offer,
          name: username,
        });
      });

      socket.on("answer", (data) => {
        const { target, answer } = data;
        socketNamespace.to(target).emit("answer", {
          from: socket.id,
          answer,
          name: username,
        });
      });

      socket.on("ice-candidate", (data) => {
        const { target, candidate } = data;
        socketNamespace.to(target).emit("ice-candidate", {
          from: socket.id,
          candidate,
        });
      });

      // Handle leaving the room
      socket.on("leave-room", async ({ roomId, username }) => {
        socket.leave(roomId);

        const meet = await Meeting.findOne({ meetingId: roomId }).select(
          "logs"
        );

        let logIndexWhereAttendeeYetToLeave = meet.logs.findIndex(
          (item) => !item.leftAt
        );

        let logWhereAttendeeYetToLeave =
          meet.logs[logIndexWhereAttendeeYetToLeave];

        meet.logs[logIndexWhereAttendeeYetToLeave] = {
          attendee: logWhereAttendeeYetToLeave.attendee,
          joinedAt: logWhereAttendeeYetToLeave.joinedAt,
          leftAt: Date.now(),
        };

        await meet.save();

        socket.removeAllListeners("sendMessage");
        socket.removeAllListeners("offer");
        socket.removeAllListeners("answer");
        socket.removeAllListeners("ice-candidate");

        usernames = usernames.filter((u) => u.socketId !== socket.id);

        socket.to(roomId).emit("user-left", { socketId: socket.id, username });
      });

      // Handle disconnection
      socket.on("disconnect", () => {
        usernames = usernames.filter((u) => u.socketId !== socket.id);

        const rooms = Array.from(socket.rooms);
        rooms.forEach((roomId) => {
          socket
            .to(roomId)
            .emit("user-left", { socketId: socket.id, username });
        });
      });
    });
  });
};

export const getSocketInstance = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};
