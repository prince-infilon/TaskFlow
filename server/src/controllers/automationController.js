const Automation = require('../models/Automation');
const Board = require('../models/Board');

exports.getAutomations = async (req, res, next) => {
  try {
    const { boardId } = req.params;
    const automations = await Automation.find({ board: boardId })
      .populate('createdBy', 'name email')
      .populate('condition.columnId', 'name');
    res.status(200).json({ success: true, data: { automations } });
  } catch (error) {
    next(error);
  }
};

exports.createAutomation = async (req, res, next) => {
  try {
    const { boardId } = req.params;

    // Only admins or managers should be able to create automations
    if (req.boardRole === 'member' && req.user.globalRole !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: { message: 'Only managers and admins can create automations' } 
      });
    }

    const { trigger, condition, action, actionPayload } = req.body;

    const automation = new Automation({
      board: boardId,
      trigger,
      condition,
      action,
      actionPayload,
      createdBy: req.user._id
    });

    await automation.save();

    // Populate before returning
    await automation.populate('createdBy', 'name email');
    if (automation.condition && automation.condition.columnId) {
      await automation.populate('condition.columnId', 'name');
    }

    res.status(201).json({ success: true, data: { automation } });
  } catch (error) {
    next(error);
  }
};

exports.deleteAutomation = async (req, res, next) => {
  try {
    const { boardId, automationId } = req.params;

    if (req.boardRole === 'member' && req.user.globalRole !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: { message: 'Only managers and admins can delete automations' } 
      });
    }

    const automation = await Automation.findOneAndDelete({ _id: automationId, board: boardId });
    if (!automation) {
      return res.status(404).json({ 
        success: false, 
        error: { message: 'Automation not found' } 
      });
    }

    res.status(200).json({ success: true, data: { message: 'Automation deleted' } });
  } catch (error) {
    next(error);
  }
};

exports.toggleAutomation = async (req, res, next) => {
  try {
    const { boardId, automationId } = req.params;

    if (req.boardRole === 'member' && req.user.globalRole !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: { message: 'Only managers and admins can edit automations' } 
      });
    }

    const { isActive } = req.body;
    const automation = await Automation.findOneAndUpdate(
      { _id: automationId, board: boardId },
      { isActive },
      { new: true }
    )
      .populate('createdBy', 'name email')
      .populate('condition.columnId', 'name');

    if (!automation) {
      return res.status(404).json({ 
        success: false, 
        error: { message: 'Automation not found' } 
      });
    }

    res.status(200).json({ success: true, data: { automation } });
  } catch (error) {
    next(error);
  }
};
