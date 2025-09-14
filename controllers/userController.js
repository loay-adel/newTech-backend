import User from "../models/User.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

// Generate tokens function
const generateTokens = (id) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }

  if (!process.env.JWT_REFRESH_SECRET) {
    throw new Error(
      "JWT_REFRESH_SECRET is not defined in environment variables"
    );
  }

  const accessToken = jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "15m", // Short-lived access token
  });

  const refreshToken = jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: "7d", // Long-lived refresh token
  });

  return { accessToken, refreshToken };
};

// Set refresh token as HTTP-only cookie
const setRefreshTokenCookie = (res, refreshToken) => {
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

// @desc    Register a new user
// @route   POST /api/users/register
// @access  Public
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, phone, addresses } = req.body;

    // Validation
    if (!name || !email || !password || !phone) {
      return res
        .status(400)
        .json({ message: "Please enter all required fields" });
    }

    // Check if user exists by email or phone
    const userExists = await User.findOne({
      $or: [{ email }, { phone }],
    });

    if (userExists) {
      if (userExists.email === email) {
        return res
          .status(400)
          .json({ message: "User with this email already exists" });
      } else {
        return res
          .status(400)
          .json({ message: "User with this phone number already exists" });
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user with additional fields
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      phone,
      addresses: addresses || [],
    });

    if (user) {
      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(user._id);

      // Set refresh token as HTTP-only cookie
      setRefreshTokenCookie(res, refreshToken);

      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        token: accessToken, // Send access token in response for client-side storage
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    console.error("Registration error:", error);

    // Handle specific validation errors
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({ message: errors.join(", ") });
    }

    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Login user
// @route   POST /api/users/login
// @access  Public
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check for user email
    const user = await User.findOne({ email });

    if (user && (await bcrypt.compare(password, user.password))) {
      // Generate tokens
      const { accessToken, refreshToken } = generateTokens(user._id);

      // Set refresh token as HTTP-only cookie
      setRefreshTokenCookie(res, refreshToken);

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        token: accessToken, // Send access token in response for client-side storage
      });
    } else {
      res.status(401).json({ message: "Invalid credentials" });
    }
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Refresh token
// @route   POST /api/users/refresh-token
// @access  Public
export const refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ message: "No refresh token provided" });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Check if user still exists
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Generate new tokens
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
      generateTokens(user._id);

    // Set new refresh token as HTTP-only cookie
    setRefreshTokenCookie(res, newRefreshToken);

    res.json({ token: newAccessToken });
  } catch (error) {
    console.error("Refresh token error:", error);

    // Clear invalid refresh token
    res.clearCookie("refreshToken");

    if (error.name === "TokenExpiredError") {
      return res.status(403).json({ message: "Refresh token expired" });
    }

    res.status(403).json({ message: "Invalid refresh token" });
  }
};

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (user) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        addresses: user.addresses,
        preferences: user.preferences,
      });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
export const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (user) {
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      user.phone = req.body.phone || user.phone;

      if (req.body.addresses) {
        // Filter out addresses with missing required fields
        user.addresses = req.body.addresses.filter(
          (addr) => addr.street && addr.city && addr.state
        );

        // If all addresses were invalid, keep the original ones
        if (user.addresses.length === 0) {
          user.addresses = user.addresses; // Keep original addresses
        }
      }

      if (req.body.preferences) {
        user.preferences = {
          ...user.preferences,
          ...req.body.preferences,
        };
      }

      const updatedUser = await user.save();

      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        addresses: updatedUser.addresses,
        preferences: updatedUser.preferences,
      });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
// @desc    Delete user
// @route   DELETE /api/users/profile
// @access  Private
export const deleteUser = async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.user.id);
    if (!deletedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Clear the refresh token cookie
    res.clearCookie("refreshToken");
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Logout user
// @route   POST /api/users/logout
// @access  Private
export const logoutUser = async (req, res) => {
  try {
    // Clear the refresh token cookie
    res.clearCookie("refreshToken");
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
