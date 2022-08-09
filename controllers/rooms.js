const asyncHandler = require('../middlewares/async');

const rooms = [];

exports.getExistRoom = asyncHandler(async (req, res, next) => {
  const {
    params: { roomId },
  } = req;

  const room = rooms.find((room) => room.id.toString() === roomId.toString());

  if (room) {
    if (room.connectedUsers.length > 3) {
      return res.status(400).json({ roomExists: true, full: true });
    } else {
      return res.json({ roomExists: true, full: false });
    }
  } else {
    return res.status(404).json({ roomExists: false });
  }
});
