const express = require('express');
const router = express.Router();
const artisanController = require('../controllers/artisanController');

router.get('/fundis', artisanController.getArtisans);
router.get('/fundis/:id', artisanController.getArtisanDetail);
router.post('/fundis/:id/inquiry', artisanController.postArtisanInquiry);

module.exports = router;
