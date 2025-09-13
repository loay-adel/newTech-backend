import Product from "../models/Product.js";

// GET /api/products - fetch all products
export const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find({});
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/products/:id - fetch single product
export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/products - create a product
export const createProduct = async (req, res) => {
  const { name, description, image, price, category, rating } = req.body;

  try {
    const product = new Product({
      name,
      description,
      image,
      price,
      category,
      rating,
    });
    const saved = await product.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: "Invalid product data" });
  }
};

// PUT /api/products/:id - update a product
export const updateProduct = async (req, res) => {
  try {
    const { name, description, image, price, category, rating } = req.body;

    const product = await Product.findById(req.params.id);

    if (!product) return res.status(404).json({ message: "Product not found" });

    product.name = name || product.name;
    product.description = description || product.description;
    product.image = image || product.image;
    product.price = price || product.price;
    product.category = category || product.category;
    product.rating = rating ?? product.rating;

    const updated = await product.save();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE /api/products/:id - delete a product
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    await product.remove();
    res.json({ message: "Product removed" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/products/categories - fetch all unique categories
export const getAllCategories = async (req, res) => {
  try {
    const categories = await Product.distinct("category");
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch categories" });
  }
};

// GET /api/products/category/:category - fetch products by category
export const getProductsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const products = await Product.find({ category }); // This "loops" through all products in the database

    if (products.length === 0) {
      return res.status(404).json({
        message: `No products found in category: ${category}`,
      });
    }

    res.json(products);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
