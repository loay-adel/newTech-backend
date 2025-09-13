import express from "express";
import { createPayment } from "../controllers/paymentController.js";

const router = express.Router();

router.post("/create-payment", createPayment);
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  (req, res) => {
    const sig = req.headers["x-paymob-signature"];
    const payload = req.body;

    // Verify signature (use Paymob's docs for your specific method)
    if (!validSignature(sig, payload)) {
      return res.status(400).send("Invalid signature");
    }

    // Update order status
    Order.findOneAndUpdate(
      { paymobOrderId: payload.order },
      {
        isPaid: payload.success,
        "paymentResult.status": payload.success ? "paid" : "failed",
        "paymentResult.update_time": new Date(),
      }
    ).exec();

    res.status(200).send("OK");
  }
);
export default router;
