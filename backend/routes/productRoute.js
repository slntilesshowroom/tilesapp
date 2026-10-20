const express = require('express');
const { getAllProducts, getProductDetails, updateProduct, deleteProduct, getProductReviews, deleteReview, createProductReview, createProduct, getAdminProducts, getProducts, getProductsByIds, getProductFacets, extractProductsFromPdfText, extractProductsFromPdfImages, bulkCreateProducts } = require('../controllers/productController');
const { isAuthenticatedUser, authorizeRoles } = require('../middlewares/auth');

const router = express.Router();

router.route('/products').get(getAllProducts);
router.route('/products/all').get(getProducts);
router.route('/products/facets').get(getProductFacets);
// GET for cache-ability; POST for carts with more ids than fit in a URL.
router.route('/products/by-ids').get(getProductsByIds).post(getProductsByIds);

router.route('/admin/products').get(isAuthenticatedUser, authorizeRoles("admin", "superadmin"), getAdminProducts);
router.route('/admin/product/new').post(isAuthenticatedUser, authorizeRoles("admin", "superadmin"), createProduct);
router.route('/admin/products/extract-pdf-text').post(isAuthenticatedUser, authorizeRoles("admin", "superadmin"), extractProductsFromPdfText);
router.route('/admin/products/extract-pdf-images').post(isAuthenticatedUser, authorizeRoles("admin", "superadmin"), extractProductsFromPdfImages);
router.route('/admin/products/bulk').post(isAuthenticatedUser, authorizeRoles("admin", "superadmin"), bulkCreateProducts);

router.route('/admin/product/:id')
    .put(isAuthenticatedUser, authorizeRoles("admin", "superadmin"), updateProduct)
    .delete(isAuthenticatedUser, authorizeRoles("admin", "superadmin"), deleteProduct);

router.route('/product/:id').get(getProductDetails);

router.route('/review').put(isAuthenticatedUser, createProductReview);

router.route('/admin/reviews')
    .get(getProductReviews)
    .delete(isAuthenticatedUser, deleteReview);

module.exports = router;