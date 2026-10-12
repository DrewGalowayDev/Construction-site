const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');

router.get('/jobs', jobController.getJobs);
router.get('/jobs/post', jobController.getPostJob);
router.post('/jobs/post', jobController.postJob);
router.post('/jobs/:jobId/apply', jobController.applyJob);

module.exports = router;
