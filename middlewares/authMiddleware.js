import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  let token;
  console.log("Auth Header:", req.headers.authorization);

  // Check for token in Authorization header (Bearer token)
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select("-password");
      return next();
    } catch (error) {
      // Check if token is expired
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Token expired" });
      }
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  }

  // Check for token in cookies (if using cookie-based auth)
  if (req.cookies && req.cookies.refreshToken) {
    try {
      // Since we're using refreshToken in cookies, we need to handle it differently
      // For access token, we should still use the Authorization header
      return res.status(401).json({
        message: "Please provide access token in Authorization header",
      });
    } catch (error) {
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  }

  // If no token found
  return res.status(401).json({ message: "Not authorized, no token" });
};
