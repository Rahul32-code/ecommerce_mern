import jwt from "jsonwebtoken";
import User from "../modals/user.modal.js";

export const protectRoute = async (req, res, next) => {
  try {
    const accessToken = req.cookies.accessToken;
    if (!accessToken)
      return res
        .status(401)
        .json({ message: "Unauthorized - No Token Provided" });

    try {
      const decoded = jwt.verify(
        accessToken,
        process.env.JWT_ACCESS_TOKEN_SECRET
      );
      const user = await User.findById(decoded.id).select("-password");

      if (!user)
        return res
          .status(401)
          .json({ message: "Unauthorized - User Not Found" });

      req.user = user;

      next();
    } catch (error) {
        if(error.name === "TokenExpiredError") {
            return res.status(401).json({ message: "Unauthorized - Token Expired" });
        }
      throw error;
    }
  } catch (error) {
    console.log(`Error in protectRoute middleware: ${error}`);
    res.status(500).json({ message: "Server Error" });
  }
};

export const adminRoute = (req, res, next) => {
  console.log(req.user);
    if(req.user && req.user.role === "admin") {
        next();
    } else {
        return res.status(403).json({ message: "Forbidden - Admin Only" });
    }
};