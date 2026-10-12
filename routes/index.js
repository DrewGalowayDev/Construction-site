const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');
const calculatorController = require('../controllers/calculatorController');

router.get('/', homeController.getIndex);
router.get('/about', homeController.getAbout);
router.get('/contact', homeController.getContact);
router.post('/contact', homeController.postContact);

// Phase 6: Kenyan Construction Material Estimator & BOQ Generator
router.get('/calculator', calculatorController.getCalculator);
router.post('/calculator/quote', calculatorController.postCalculatorQuote);
router.get('/calculator/invoice', calculatorController.getCalculatorInvoice);

router.post('/subscribe', (req, res) => {
  const { email } = req.body;
  req.flash('success', `Subscribed! Price updates will be sent to ${email}`);
  res.redirect('back');
});

module.exports = router;
