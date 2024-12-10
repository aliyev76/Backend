import Product from '../models/Product.js';
import User from '../models/User.js'; // Ensure you have a User model to fetch user data
import transporter from '../services/email/transporter.js';
import submissionConfirmationTemplate from '../services/email/templates/submissionConfirmationTemplate.js';

export const addProduct = async (req, res) => {
  const { products } = req.body;
  const userId = req.user?.id; // Assume this is added by authentication middleware

  try {
    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: "No products provided." });
    }

    // Fetch user data from the database
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const createdProducts = await Promise.all(
      products.map(async (product) => {
        const {
          category,
          modifications,
          saflaştırma,
          scale,
          totalPrice,
          oligoAdi,
          quantity,
        } = product;

        return await Product.create({
          category,
          modifications,
          saflaştırma: category === "prime" ? saflaştırma : null,
          scale,
          totalPrice,
          oligoAdi,
          userId,
          quantity: quantity || 1,
          isOrder: true, // Set isOrder to true when the product is added
        });
      })
    );

    // Send confirmation email
    const mailOptions = {
      from: `"Polgen Order Confirmation" <${process.env.SMTP_USER}>`,
      to: user.email, // Use email from the database
      subject: "Order Confirmation",
      html: submissionConfirmationTemplate(user.username, createdProducts),
    };

    await transporter.sendMail(mailOptions);
    console.log(`Order confirmation email sent to ${user.email}`);

    res.status(201).json({
      message: "Products added successfully.",
      products: createdProducts,
    });
  } catch (error) {
    console.error("Error adding product:", error);
    res.status(500).json({ error: "Failed to add product." });
  }
};



//
//
//
// Get All Products
export const getProducts = async (req, res) => {
  console.log('Request user:', req.user); // Debugging log
  const userId = req.user?.id;
  const userRole = req.user?.role;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required.' });
  }

  try {
    let products;
    if (userRole === 'admin') {
      products = await Product.findAll({
        order: [['createdAt', 'DESC']],
      });
    } else {
      products = await Product.findAll({
        where: { userId },
        order: [['createdAt', 'DESC']],
      });
    }

    res.status(200).json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products.' });
  }
};



// Get Product by ID
export const getProductById = async (req, res) => {
  const { id } = req.params;
  try {
    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }
    res.status(200).json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product.' });
  }
};

// Update Product
export const updateProduct = async (req, res) => {
  const { id } = req.params;
  const { name, description, price, stock, category } = req.body;

  try {
    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    await product.update({ name, description, price, stock, category });
    res.status(200).json({ message: 'Product updated successfully.', product });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product.' });
  }
};

// Delete Product
export const deleteProduct = async (req, res) => {
  const { id } = req.params;

  try {
    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    await product.destroy();
    res.status(200).json({ message: 'Product deleted successfully.' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Failed to delete product.' });
  }
};

