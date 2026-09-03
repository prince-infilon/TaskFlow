const Activity = require('../models/Activity');

exports.getBoardActivity = async (req, res, next) => {
  try {
    const { boardId } = req.params;
    let page = parseInt(req.query.page, 10) || 1;
    let limit = parseInt(req.query.limit, 10) || 50;

    if (page < 1) page = 1;
    if (limit < 1 || limit > 100) limit = 50;

    const skip = (page - 1) * limit;

    // RBAC: Already handled by authorizeBoard middleware; user must be member or admin.
    const activities = await Activity.find({ board: boardId })
      .populate('user', 'name email avatarUrl')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Activity.countDocuments({ board: boardId });

    res.status(200).json({
      success: true,
      data: {
        activities,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};
