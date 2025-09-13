import mongoose from "mongoose";

const addressSchema = new mongoose.Schema({
  street: {
    type: String,
    required: true,
  },
  city: {
    type: String,
    required: true,
  },
  state: {
    type: String,
    required: true,
  },
  zipCode: {
    type: String,
    default: "", // Make it optional with empty default
  },
  country: {
    type: String,
    required: true,
    default: "Egypt",
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
});

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1,
  },
  price: {
    type: Number,
    required: true,
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
});

const wishlistItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
});

const orderHistorySchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
    required: true,
  },
  orderDate: {
    type: Date,
    required: true,
  },
  totalAmount: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    required: true,
  },
});

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    phone: {
      type: String,
      trim: true,
    },
    avatar: {
      type: String,
      default: "",
    },
    addresses: [addressSchema],
    paymentMethods: [
      {
        type: {
          type: String, // e.g., 'credit_card', 'paypal'
          required: true,
        },
        details: {
          // This would vary based on type, but for simplicity
          last4: String,
          brand: String,
          expiry: String,
        },
        isDefault: {
          type: Boolean,
          default: false,
        },
      },
    ],
    cart: [cartItemSchema],
    wishlist: [wishlistItemSchema],
    orderHistory: [orderHistorySchema],
    preferences: {
      newsletter: {
        type: Boolean,
        default: true,
      },
      emailNotifications: {
        type: Boolean,
        default: true,
      },
      smsNotifications: {
        type: Boolean,
        default: false,
      },
    },
    isAdmin: {
      type: Boolean,
      required: true,
      default: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: String,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    lastLogin: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Virtual for getting the cart total
userSchema.virtual("cartTotal").get(function () {
  return this.cart.reduce((total, item) => {
    return total + item.price * item.quantity;
  }, 0);
});

// Virtual for getting the cart item count
userSchema.virtual("cartItemCount").get(function () {
  return this.cart.reduce((count, item) => {
    return count + item.quantity;
  }, 0);
});

// Method to add item to cart
userSchema.methods.addToCart = function (productId, price, quantity = 1) {
  const existingItemIndex = this.cart.findIndex(
    (item) => item.product.toString() === productId.toString()
  );

  if (existingItemIndex >= 0) {
    this.cart[existingItemIndex].quantity += quantity;
  } else {
    this.cart.push({
      product: productId,
      price,
      quantity,
    });
  }

  return this.save();
};

// Method to remove item from cart
userSchema.methods.removeFromCart = function (productId) {
  this.cart = this.cart.filter(
    (item) => item.product.toString() !== productId.toString()
  );
  return this.save();
};

// Method to clear cart
userSchema.methods.clearCart = function () {
  this.cart = [];
  return this.save();
};

// Method to add item to wishlist
userSchema.methods.addToWishlist = function (productId) {
  if (
    !this.wishlist.some(
      (item) => item.product.toString() === productId.toString()
    )
  ) {
    this.wishlist.push({ product: productId });
  }
  return this.save();
};

// Method to remove item from wishlist
userSchema.methods.removeFromWishlist = function (productId) {
  this.wishlist = this.wishlist.filter(
    (item) => item.product.toString() !== productId.toString()
  );
  return this.save();
};

// Method to add address
userSchema.methods.addAddress = function (addressData) {
  // If this is the first address, set it as default
  if (this.addresses.length === 0) {
    addressData.isDefault = true;
  }

  this.addresses.push(addressData);
  return this.save();
};

// Method to set default address
userSchema.methods.setDefaultAddress = function (addressId) {
  this.addresses = this.addresses.map((address) => {
    address.isDefault = address._id.toString() === addressId.toString();
    return address;
  });
  return this.save();
};

const User = mongoose.model("User", userSchema);

export default User;
