const Board = require('../models/Board');
const Task = require('../models/Task');
const Organization = require('../models/Organization');

exports.authorizeBoard = (...allowedBoardRoles) => {
  return async (req, res, next) => {
    try {
      const { boardId } = req.params;
      const board = await Board.findById(boardId);
      
      if (!board) {
        return res.status(404).json({ success: false, error: { message: 'Board not found.' } });
      }

      // Check organization alignment and auto-scope if user has access to board's organization
      if (!req.organization || board.organizationId.toString() !== req.organization._id.toString()) {
        const boardOrg = await Organization.findById(board.organizationId);
        if (boardOrg) {
          let orgMember = boardOrg.members.find(m => m.user.toString() === req.user._id.toString());
          
          if (!orgMember && req.user.managerId) {
            // Auto-add member to manager's organization if not present
            const isManagerInOrg = boardOrg.members.some(m => m.user.toString() === req.user.managerId.toString()) || boardOrg.owner.toString() === req.user.managerId.toString();
            if (isManagerInOrg) {
              boardOrg.members.push({ user: req.user._id, role: 'member' });
              await boardOrg.save();
              orgMember = { user: req.user._id, role: 'member' };
            }
          }

          if (orgMember || req.user.globalRole === 'admin') {
            req.organization = boardOrg;
            req.orgRole = orgMember ? orgMember.role : 'admin';
          } else {
            return res.status(404).json({ success: false, error: { message: 'Board not found in this organization.' } });
          }
        } else {
          return res.status(404).json({ success: false, error: { message: 'Board not found.' } });
        }
      }

      // Org admin or global admin skips board role checks completely
      if (req.orgRole === 'admin' || req.user.globalRole === 'admin') {
        req.board = board;
        req.boardRole = 'admin'; // virtual role for admins
        return next();
      }

      // Find user in members
      let member = board.members.find(m => m.user.toString() === req.user._id.toString());

      // Auto-authorize if user's manager owns the board, or if user is owner, or has tasks assigned
      if (!member) {
        const isManagerBoard = req.user.managerId && board.owner.toString() === req.user.managerId.toString();
        const isOwner = board.owner.toString() === req.user._id.toString();
        const hasTaskOnBoard = await Task.exists({ board: board._id, assignee: req.user._id });

        if (isManagerBoard || isOwner || hasTaskOnBoard) {
          const roleToAdd = isOwner ? 'manager' : 'member';
          board.members.push({ user: req.user._id, role: roleToAdd });
          await board.save();
          member = { user: req.user._id, role: roleToAdd };
        }
      }

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
