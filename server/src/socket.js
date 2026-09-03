const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Board = require('./models/Board');

let io;
// Map: boardId -> Map(userId -> { user data, connections: Set(socketIds) })
const presence = new Map();

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication error'));
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');
      if (!user) return next(new Error('Authentication error: User not found'));
      
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  const getPresenceList = (boardId) => {
    if (!presence.has(boardId)) return [];
    return Array.from(presence.get(boardId).values()).map(u => ({
      id: u.id,
      name: u.name,
      avatarUrl: u.avatarUrl
    }));
  };

  const leaveBoard = (socket, boardId) => {
    socket.leave(`board:${boardId}`);
    
    if (presence.has(boardId)) {
      const boardPresence = presence.get(boardId);
      const userIdStr = socket.user._id.toString();
      
      if (boardPresence.has(userIdStr)) {
        const userPresence = boardPresence.get(userIdStr);
        userPresence.connections.delete(socket.id);
        
        if (userPresence.connections.size === 0) {
          boardPresence.delete(userIdStr);
          // Broadcast to remaining users
          io.to(`board:${boardId}`).emit('presence_update', getPresenceList(boardId));
        }
      }
    }
    socket.boardId = null;
  };

  io.on('connection', (socket) => {
    
    // Join board room
    socket.on('join_board', async (boardId) => {
      try {
        if (!boardId) return;

        // Verify authorization
        const board = await Board.findById(boardId);
        if (!board) return socket.emit('error', { message: 'Board not found' });

        const isMember = board.members.some(m => m.user.toString() === socket.user._id.toString());
        if (!isMember && socket.user.globalRole !== 'admin') {
          return socket.emit('error', { message: 'Unauthorized to join this board' });
        }

        // Leave previous board if any
        if (socket.boardId && socket.boardId !== boardId) {
          leaveBoard(socket, socket.boardId);
        }

        socket.join(`board:${boardId}`);
        socket.boardId = boardId;

        if (!presence.has(boardId)) {
          presence.set(boardId, new Map());
        }
        
        const boardPresence = presence.get(boardId);
        const userIdStr = socket.user._id.toString();
        
        let shouldBroadcast = false;
        if (!boardPresence.has(userIdStr)) {
          boardPresence.set(userIdStr, {
            id: userIdStr,
            name: socket.user.name,
            avatarUrl: socket.user.avatarUrl,
            connections: new Set([socket.id])
          });
          shouldBroadcast = true;
        } else {
          boardPresence.get(userIdStr).connections.add(socket.id);
        }
        
        const currentPresence = getPresenceList(boardId);
        if (shouldBroadcast) {
          io.to(`board:${boardId}`).emit('presence_update', currentPresence);
        } else {
          // Just send to the user joining
          socket.emit('presence_update', currentPresence);
        }

      } catch (err) {
        socket.emit('error', { message: 'Internal server error during join' });
      }
    });

    socket.on('leave_board', (boardId) => {
      leaveBoard(socket, boardId);
    });

    socket.on('disconnect', () => {
      if (socket.boardId) {
        leaveBoard(socket, socket.boardId);
      }
    });
  });
};

const getIo = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

// Exporting utility wrapper for broadcasting API changes
const broadcastBoardEvent = (boardId, eventName, payload) => {
  try {
    getIo().to(`board:${boardId}`).emit(eventName, payload);
  } catch (err) {
    console.error('Socket broadcast error:', err);
  }
};

module.exports = { initializeSocket, getIo, broadcastBoardEvent };
