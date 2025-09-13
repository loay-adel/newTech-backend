import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    image: { type: String, default: "" },
    price: { type: Number, required: true },
    category: { type: String, required: true },
    rating: { type: Number, default: 0 },
    numbersOfRating: { type: Number, default: 0 },
    stock: { type: Boolean, default: true },
    slug: { type: String, unique: true },
    discount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Product = mongoose.model("Product", productSchema);

export default Product;
