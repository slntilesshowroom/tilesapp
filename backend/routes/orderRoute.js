const express = require('express');
const { newOrder, getSingleOrderDetails, myOrders, getAllOrders, updateOrder, deleteOrder } = require('../controllers/orderController');
const { isAuthenticatedUser, authorizeRoles } = require('../middlewares/auth');

const router = express.Router();

router.route('/order/new').post(isAuthenticatedUser, newOrder);
router.route('/order/:id').get(isAuthenticatedUser, getSingleOrderDetails);
router.route('/orders/me').get(isAuthenticatedUser, myOrders);

// Temporarily remove auth for testing - REMOVE IN PRODUCTION
router.route('/admin/orders').get(getAllOrders);

router.route('/admin/order/:id')
    .put(isAuthenticatedUser, authorizeRoles("admin", "superadmin"), updateOrder)
    .delete(isAuthenticatedUser, authorizeRoles("admin", "superadmin"), deleteOrder);

module.exports = router;