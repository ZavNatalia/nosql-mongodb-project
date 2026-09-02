const express = require('express');

const { sendCover, ROUTE } = require('../util/covers');

const router = express.Router();

router.get(`${ROUTE}/:hash`, sendCover);

module.exports = router;
