const Column = require('../models/Column');
const Task = require('../models/Task');

exports.getColumns = async (req, res, next) => {
  try {
    const { boardId } = req.params;
    const columns = await Column.find({ board: boardId }).sort({ position: 1 });
    res.status(200).json({ success: true, data: { columns } });
  } catch (error) {
    next(error);
  }
};

exports.createColumn = async (req, res, next) => {
  try {
    const { boardId } = req.params;
    const { name, position } = req.body;
    
    let pos = position;
    if (pos === undefined) {
      const lastCol = await Column.findOne({ board: boardId }).sort({ position: -1 });
      pos = lastCol ? lastCol.position + 1 : 0;
    }

    const column = new Column({ board: boardId, name, position: pos });
    await column.save();

    res.status(201).json({ success: true, data: { column } });
  } catch (error) {
    next(error);
  }
};

exports.updateColumn = async (req, res, next) => {
  try {
    const { boardId, columnId } = req.params;
    const { name, position } = req.body;

    const column = await Column.findOne({ _id: columnId, board: boardId });
    if (!column) {
      return res.status(404).json({ success: false, error: { message: 'Column not found' } });
    }

    if (name !== undefined) column.name = name;
    if (position !== undefined) column.position = position;

    await column.save();
    res.status(200).json({ success: true, data: { column } });
  } catch (error) {
    next(error);
  }
};

exports.deleteColumn = async (req, res, next) => {
  try {
    const { boardId, columnId } = req.params;
    
    const column = await Column.findOne({ _id: columnId, board: boardId });
    if (!column) {
      return res.status(404).json({ success: false, error: { message: 'Column not found' } });
    }

    // Delete tasks associated with the column to prevent orphans
    await Task.deleteMany({ column: columnId, board: boardId });
    await Column.deleteOne({ _id: columnId });

    res.status(200).json({ success: true, data: { message: 'Column deleted' } });
  } catch (error) {
    next(error);
  }
};
