import { Server } from "socket.io";
import { add_comment_in_meeting } from "./controller/meeting-controller.js";

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

  io.on("connection", (socket) => {
    console.log(`New client connected: ${socket.id}`);

    socket.on("join-room", ({ roomId, username }) => {
      socket.join(roomId);

      usernames.push({ socketId: socket.id, username }); // Add user

      console.log(
        `Socket ${socket.id} (Username: ${username}) joined room ${roomId}`
      );

      // Notify other users in the room about the new user
      socket.to(roomId).emit("user-joined", { socketId: socket.id, username });

      // Send the list of users in the room to the newly joined user
      const usersInRoom = Array.from(io.sockets.adapter.rooms.get(roomId) || [])
        .map((id) => ({
          socketId: id,
          username: usernames.find((u) => u.socketId === id).username,
        }))
        .filter((user) => user.socketId !== socket.id);

      socket.emit("room-users", usersInRoom);

      // Handle sending messages to the room
      socket.on("sendMessage", async ({ meetingId, message, username }) => {
        console.log("messsss", JSON.stringify(message));
        console.log(`Message from ${username} for ${meetingId}: ${message}`);
        io.to(meetingId).emit("message", { user: username, text: message });

        // await add_comment_in_meeting(meetingId, username, message);

        const room = io.sockets.adapter.rooms.get(meetingId);
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

        console.log("Users in room:", usersInRoom);
      });

      // Handle offers, answers, and ICE candidates
      socket.on("offer", (data) => {
        const { target, offer } = data;
        io.to(target).emit("offer", {
          from: socket.id,
          offer,
          name: username,
        });
      });

      socket.on("answer", (data) => {
        const { target, answer } = data;
        io.to(target).emit("answer", {
          from: socket.id,
          answer,
          name: username,
        });
      });

      socket.on("ice-candidate", (data) => {
        const { target, candidate } = data;
        io.to(target).emit("ice-candidate", {
          from: socket.id,
          candidate,
        });
      });

      // Handle leaving the room
      socket.on("leave-room", ({ roomId, username }) => {
        socket.leave(roomId);

        socket.removeAllListeners("sendMessage");
        socket.removeAllListeners("offer");
        socket.removeAllListeners("answer");
        socket.removeAllListeners("ice-candidate");

        usernames = usernames.filter((u) => u.socketId !== socket.id);

        console.log(
          `Socket ${socket.id} (Username: ${username}) left room ${roomId}`
        );
        socket.to(roomId).emit("user-left", { socketId: socket.id, username });
      });

      // Handle disconnection
      socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.id}`);
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
