const express = require('express');

const { getExistRoom } = require('../controllers/rooms');

const router = express.Router();

router.get('/room-exist/:roomId', getExistRoom);

module.exports = router;
