import Order from "../models/Order.js";

export const createOrder = async (req, res) => {
  try {
    const {
      user,
      orderItems,
      shippingAddress,
      paymentMethod,
      subtotal,
      shippingCost,
      totalPrice,
    } = req.body;

    if (!orderItems || orderItems.length === 0) {
      return res.status(400).json({ message: "No order items" });
    }

    const order = new Order({
      user,
      orderItems,
      shippingAddress,
      paymentMethod,
      subtotal,
      shippingCost,
      totalPrice,
    });

    const createdOrder = await order.save();
    res.status(201).json(createdOrder);
  } catch (error) {
    console.error("Order creation error:", error);
    res
      .status(500)
      .json({ message: "Order creation failed", error: error.message });
  }
};
