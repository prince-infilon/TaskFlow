const express = require('express');
const router = express.Router({ mergeParams: true });
const { getColumns, createColumn, updateColumn, deleteColumn } = require('../controllers/columnController');
const { authorizeBoard } = require('../middleware/boardMiddleware');

// The route prefix will be /api/boards/:boardId/columns
// and authorizeBoard will be applied by boardRoutes.js before hitting this router.
// Wait, we need role checks: manager can create/edit/delete columns, members can only read.
// Actually, members shouldn't be able to create columns. We can use authorizeBoard(['admin', 'manager']) for post/patch/delete.
// Let's explicitly check req.boardRole in the routes or controller. It's better in the routes.

// Helper middleware to restrict to managers
const requireManager = (req, res, next) => {
  if (req.user.globalRole === 'admin') return next();
  if (req.boardRole !== 'manager') {
    return res.status(403).json({ success: false, error: { message: 'Forbidden: Requires manager role for this board' } });
  }
  next();
};

router.get('/', getColumns);
router.post('/', requireManager, createColumn);
router.patch('/:columnId', requireManager, updateColumn);
router.delete('/:columnId', requireManager, deleteColumn);

module.exports = router;
