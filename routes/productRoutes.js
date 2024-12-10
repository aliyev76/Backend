import express from 'express';
import { requireAuth } from '../middlewares/authMiddleware.js'; // Middleware for authentication
import {
  addProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} from '../controllers/productController.js';

const router = express.Router();

// Add product (requires authentication)
router.post('/', requireAuth, addProduct);

// Get all products (requires authentication to populate req.user)
router.get('/', requireAuth, getProducts);

// Get product by ID
router.get('/:id', requireAuth, getProductById);

// Update product (requires authentication)
router.put('/:id', requireAuth, updateProduct);

// Delete product (requires authentication)
router.delete('/:id', requireAuth, deleteProduct);

export default router;

