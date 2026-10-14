const express = require('express');
const router = express.Router();
const catalogController = require('../controllers/catalogController');
const { productUpload, handleUploadError } = require('../middleware/upload');

router.get('/materials', catalogController.getMaterials);
router.get('/materials/post', catalogController.getPostMaterial);
router.post('/materials/post', productUpload.array('product_images', 5), handleUploadError, catalogController.postMaterial);
router.get('/rentals/post', (req, res) => res.redirect('/materials/post?type=rental'));
router.get('/rentals', catalogController.getRentals);
router.get('/materials/:id', catalogController.getProductDetail);
router.get('/rentals/:id', (req, res) => res.redirect(`/materials/${req.params.id}`));

module.exports = router;
