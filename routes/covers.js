const express = require('express');

module.exports = covers => {
  const router = express.Router();

  router.get(`${covers.route}/:hash`, covers.sendCover);

  return router;
};
