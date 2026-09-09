const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Board = require('./models/Board');

let io;
// Map: boardId -> Map(userId -> { user data, connections: Set(socketIds) })
const presence = new Map();

const parseOrigins = (val) => {
  if (!val) return [];
  return val.split(',').map(s => s.trim().replace(/\/$/, '')).filter(Boolean);
};

const initializeSocket = (server) => {
  const allowedSocketOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    ...parseOrigins(process.env.CORS_ORIGIN),
    ...parseOrigins(process.env.CLIENT_URL)
  ];

  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedSocketOrigins.includes(origin) || (origin && (origin.endsWith('.vercel.app') || origin.includes('vercel.app')))) {
          callback(null, true);
        } else {
          callback(null, true);
        }
      },
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

        // Verify authorization via Board membership, ownership, team status, or task assignment
        const board = await Board.findById(boardId);
        if (!board) return socket.emit('error', { message: 'Board not found' });

        const Task = require('./models/Task');
        const Organization = require('./models/Organization');
        const org = await Organization.findById(board.organizationId);

        const isOwner = board.owner && board.owner.toString() === socket.user._id.toString();
        const hasTaskOnBoard = await Task.exists({ board: board._id, assignee: socket.user._id });
        const isAdmin = socket.user.globalRole === 'admin';

        let isAuthorized = false;

        if (socket.user.globalRole === 'member') {
          // Members strictly ONLY have room access if they are board owner or have assigned tasks
          isAuthorized = isOwner || hasTaskOnBoard;
        } else {
          const isOrgMember = org && org.members.some(m => m.user.toString() === socket.user._id.toString());
          const isBoardMember = board.members && board.members.some(m => m.user.toString() === socket.user._id.toString());
          const isManagerBoard = socket.user.managerId && board.owner && board.owner.toString() === socket.user.managerId.toString();

          isAuthorized = isOrgMember || isBoardMember || isOwner || isManagerBoard || isAdmin || hasTaskOnBoard;
        }

        if (!isAuthorized) {
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

const broadcastUserEvent = (eventName, payload) => {
  try {
    getIo().emit(eventName, payload);
  } catch (err) {
    // Silent fail if socket not active
  }
};

module.exports = { initializeSocket, getIo, broadcastBoardEvent, broadcastUserEvent };

