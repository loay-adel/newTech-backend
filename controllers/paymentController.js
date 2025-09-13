import axios from "axios";
import Order from "../models/Order.js";
// Constants
const PAYMOB_API_URL = "https://accept.paymob.com/api";

// Get authentication token
async function getAuthToken() {
  try {
    const response = await axios.post(`${PAYMOB_API_URL}/auth/tokens`, {
      api_key: process.env.PAYMOB_API_KEY,
    });

    if (!response.data.token) {
      throw new Error("No authentication token received");
    }

    return response.data.token;
  } catch (error) {
    console.error("Authentication error:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });
    throw new Error(
      `Authentication failed: ${error.response?.data?.message || error.message}`
    );
  }
}

// Create Paymob order
async function createPaymobOrder(authToken, amount, items, customerData) {
  try {
    // Paymob requires these fields at the root level
    const orderPayload = {
      auth_token: authToken,
      delivery_needed: "false",
      amount_cents: Math.round(amount * 100),
      currency: "EGP",
      // These fields must be at root level
      first_name: customerData.first_name || customerData.customer?.first_name,
      last_name: customerData.last_name || customerData.customer?.last_name,
      phone_number:
        customerData.phone_number || customerData.customer?.phone_number,
      // Items array
      items: items.map((item) => ({
        name: item.name.substring(0, 50),
        description:
          item.description?.substring(0, 100) || item.name.substring(0, 100),
        amount_cents: Math.round(item.price * 100),
        quantity: item.quantity,
      })),
      // Shipping data
      shipping_data: {
        apartment: "NA",
        email: customerData.customer?.email || "no-email@example.com",
        floor: "NA",
        first_name:
          customerData.first_name ||
          customerData.customer?.first_name ||
          "Customer",
        street: customerData.shipping_address?.street || "Unknown",
        building: "NA",
        phone_number:
          customerData.phone_number ||
          customerData.customer?.phone_number ||
          "+201000000000",
        postal_code: customerData.shipping_address?.postal_code || "00000",
        city: customerData.shipping_address?.city || "Cairo",
        country: "EGY",
        last_name:
          customerData.last_name || customerData.customer?.last_name || "Name",
        state: customerData.shipping_address?.state || "Cairo",
      },
    };

    const response = await axios.post(
      `${PAYMOB_API_URL}/ecommerce/orders`,
      orderPayload
    );

    if (!response.data.id) {
      throw new Error("No order ID received from Paymob");
    }

    return response.data.id;
  } catch (error) {
    console.error("Paymob order creation failed:", {
      status: error.response?.status,
      data: error.response?.data,
      config: {
        url: error.config?.url,
        data: {
          amount_cents: Math.round(amount * 100),
          first_name: "***",
          last_name: "***",
          phone_number: "***",
        },
      },
    });
    throw new Error(
      `Order creation failed: ${error.response?.data?.message || error.message}`
    );
  }
}

// Create payment key
async function createPaymentKey(authToken, orderId, amount, customerData) {
  try {
    // Paymob requires very specific field names and formats
    const billingData = {
      first_name: customerData.first_name?.substring(0, 30) || "Customer",
      last_name: customerData.last_name?.substring(0, 30) || "Name",
      email: customerData.email || "no-email@example.com",
      phone_number: customerData.phone_number || "+201000000000",
      country: "EGY", // Must be "EGY" not "EG"
      city: customerData.shipping_address?.city?.substring(0, 30) || "Cairo",
      street:
        customerData.shipping_address?.street?.substring(0, 100) || "Unknown",
      apartment: "NA",
      floor: "NA",
      building: "NA",
      postal_code: customerData.shipping_address?.postal_code || "00000",
      state: customerData.shipping_address?.state?.substring(0, 30) || "Cairo",
    };

    // Critical validation
    if (!billingData.street || !billingData.city) {
      throw new Error("Street and city are required in billing data");
    }

    const response = await axios.post(
      `${PAYMOB_API_URL}/acceptance/payment_keys`,
      {
        auth_token: authToken,
        amount_cents: Math.round(amount * 100),
        expiration: 3600,
        order_id: orderId,
        billing_data: billingData,
        currency: "EGP",
        integration_id: process.env.PAYMOB_INTEGRATION_ID,
      }
    );

    if (!response.data.token) {
      throw new Error("No payment token received from Paymob");
    }

    return response.data.token;
  } catch (error) {
    console.error("Payment key generation failed:", {
      status: error.response?.status,
      data: error.response?.data,
      config: {
        url: error.config?.url,
        data: {
          amount_cents: Math.round(amount * 100),
          order_id: orderId,
          billing_data: {
            // Mask sensitive data in logs
            first_name: customerData.first_name ? "***" : "missing",
            city: customerData.shipping_address?.city ? "***" : "missing",
            street: customerData.shipping_address?.street ? "***" : "missing",
            phone_number: "***",
          },
        },
      },
    });
    throw new Error(
      `Payment key generation failed: ${
        error.response?.data?.message || error.message
      }`
    );
  }
}

// Main payment endpoint

export const createPayment = async (req, res) => {
  try {
    const { amount, items, customer, userId, orderId } = req.body;

    // Enhanced validation
    if (!amount || !items || !customer || !userId || !orderId) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
        missing: {
          amount: !amount,
          items: !items,
          customer: !customer,
          userId: !userId,
          orderId: !orderId,
        },
      });
    }

    // Validate amount is a positive number
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid amount value",
      });
    }

    // Create Paymob order and payment key
    const authToken = await getAuthToken();
    const paymobOrderId = await createPaymobOrder(
      authToken,
      amount,
      items,
      customer
    );
    const paymentKey = await createPaymentKey(
      authToken,
      paymobOrderId,
      amount,
      customer
    );

    // Update local order with Paymob reference
    await Order.findByIdAndUpdate(orderId, {
      paymobOrderId,
      "paymentResult.status": "initiated",
      "paymentResult.initiatedAt": new Date(),
    });

    const iframeUrl = `https://accept.paymob.com/api/acceptance/iframes/${process.env.PAYMOB_IFRAME_ID}?payment_token=${paymentKey}&order=${orderId}`;

    res.status(200).json({
      success: true,
      paymentUrl: iframeUrl,
      paymobOrderId,
      localOrderId: orderId,
    });
  } catch (error) {
    console.error("Payment processing failed:", {
      error: error.message,
      stack: error.stack,
      requestBody: req.body,
    });

    // Update order status if creation failed
    if (req.body.orderId) {
      await Order.findByIdAndUpdate(req.body.orderId, {
        "paymentResult.status": "failed",
        "paymentResult.error": error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: "Payment processing failed",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
