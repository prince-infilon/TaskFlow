const Board = require('../models/Board');

exports.authorizeBoard = (...allowedBoardRoles) => {
  return async (req, res, next) => {
    try {
      const { boardId } = req.params;
      const board = await Board.findById(boardId);
      
      if (!board) {
        return res.status(404).json({ success: false, error: { message: 'Board not found.' } });
      }

      // Admin global role skips board role checks completely
      if (req.user.globalRole === 'admin') {
        req.board = board;
        req.boardRole = 'admin'; // virtual role for admins
        return next();
      }

      // Find user in members
      const member = board.members.find(m => m.user.toString() === req.user._id.toString());
      if (!member) {
        // Project secure 404 convention for non-members
        return res.status(404).json({ success: false, error: { message: 'Board not found.' } });
      }

      // Enforce specific board role if requested
      if (allowedBoardRoles.length > 0 && !allowedBoardRoles.includes(member.role)) {
        return res.status(403).json({ success: false, error: { message: 'Forbidden: Insufficient board permissions.' } });
      }

      req.board = board;
      req.boardRole = member.role;
      next();
    } catch (error) {
      if (error.name === 'CastError') {
        return res.status(404).json({ success: false, error: { message: 'Board not found.' } });
      }
      next(error);
    }
  };
};
