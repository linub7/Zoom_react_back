const express = require('express');
const { v4: uuidv4 } = require('uuid');
const http = require('http');
const cors = require('cors');
const twilio = require('twilio');
const morgan = require('morgan');
require('dotenv').config();

let connectedUsers = [];
let rooms = [];

const app = express();

const server = http.createServer(app);

app.use(express.json());
app.use(cors());
app.use(morgan('dev'));

app.get('/api/v1/room-exist/:roomId', (req, res) => {
  const {
    params: { roomId },
  } = req;

  console.log(rooms);

  const room = rooms.find((room) => room.id.toString() === roomId.toString());

  console.log(room);

  if (room) {
    if (room.connectedUsers.length > 3) {
      return res.json({ roomExists: true, full: true });
    } else {
      return res.json({ roomExists: true, full: false });
    }
  } else {
    return res.json({ roomExists: false });
  }
});

const io = require('socket.io')(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log(`user connected ${socket.id}`);

  socket.on('create-new-room', (data) => {
    createNewRoomHandler(data, socket);
  });

  socket.on('join-room', (data) => {
    joinRoomHandler(data, socket);
  });

  socket.on('disconnect', () => {
    disconnectHandler(socket);
  });

  socket.on('signal-peer-data', (data) => {
    signalingHandler(data, socket);
  });

  socket.on('connection-init', (data) => {
    initializeConnectionHandler(data, socket);
  });
});

const createNewRoomHandler = (data, socket) => {
  const { identity } = data;
  const roomId = uuidv4();

  // create new user
  const newUser = {
    identity,
    id: uuidv4(),
    socketId: socket.id,
    roomId,
  };

  // push that user to connectedUsers
  connectedUsers = [...connectedUsers, newUser];

  // create new room
  const newRoom = {
    id: roomId,
    connectedUsers: [newUser],
  };

  // join socket.io room
  socket.join(roomId);

  rooms = [...rooms, newRoom];

  console.log(rooms);
  console.log(newRoom);

  // emit to that client which created that room roomId
  socket.emit('room-id', { roomId });

  // emit an event to all users connected to that room about new user joined
  socket.emit('room-update', { connectedUsers: newRoom.connectedUsers });
};

const joinRoomHandler = (data, socket) => {
  const { roomId, identity } = data;

  const newUser = {
    identity,
    id: uuidv4(),
    socketId: socket.id,
    roomId,
  };

  //   find the room
  const room = rooms.find((room) => room.id.toString() === roomId.toString());

  //   if room exists
  if (room) {
    //push new user to connectedUsers
    connectedUsers = [...connectedUsers, newUser];

    //push new user to room
    room.connectedUsers = [...room.connectedUsers, newUser];

    //join socket.io room
    socket.join(roomId);

    // emit to all users which are already in this room to prepare peer connection
    room.connectedUsers.forEach((user) => {
      // emit to all users except the user who joined
      if (user.socketId !== socket.id) {
        const data = {
          connectedUserSocketId: socket.id,
        };

        io.to(user.socketId).emit('prepare-peer-connection', data);
      }
    });

    //emit an event to all users connected to that room about new user joined
    io.to(roomId).emit('room-update', {
      connectedUsers: room.connectedUsers,
    });
  }
};

const disconnectHandler = (socket) => {
  // find the user
  const user = connectedUsers.find(
    (user) => user.socketId.toString() === socket.id.toString()
  );

  if (user) {
    // find the room
    const room = rooms.find(
      (room) => room.id.toString() === user.roomId.toString()
    );

    // remove user from room
    room.connectedUsers = room.connectedUsers?.filter(
      (user) => user.socketId.toString() !== socket.id.toString()
    );

    socket.leave(user.roomId);

    // emit an event to all users connected to that room about user left
    // if no user left in that room then delete that room
    if (room.connectedUsers?.length > 0) {
      // emit to all users which are still in the room that user disconnected
      io.to(room.id).emit('user-disconnected', {
        socketId: socket.id,
      });
      io.to(room.id).emit('room-update', {
        connectedUsers: room.connectedUsers,
      });
    } else {
      rooms = rooms.filter((room) => room.id.toString() !== room.id.toString());
    }
  }
};

const signalingHandler = (data, socket) => {
  const { connectedUserSocketId, signal } = data;

  const signalingData = { signal, connectedUserSocketId: socket.id };

  io.to(connectedUserSocketId).emit('signal-peer', signalingData);
};

// information from clients which are already in room that they have prepared for incoming connection
const initializeConnectionHandler = (data, socket) => {
  const { connectedUserSocketId } = data;

  const initData = { connectedUserSocketId: socket.id };

  io.to(connectedUserSocketId).emit('initialize-connection', initData);
};

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => console.log(`Server has started on port ${PORT}`));
