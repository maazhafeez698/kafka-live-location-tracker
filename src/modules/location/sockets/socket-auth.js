import ApiError from "../../../common/utils/api-error.js";
import { verifyAccessToken } from "../../../common/utils/jwt.utils.js";
import User from "../../auth/auth.model.js";

const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(ApiError.unauthorized("Not authenticated"));
    }

    const decoded = verifyAccessToken(token);

    const user = await User.findById(decoded.id).select("_id role name email");

    if (!user) {
      return next(ApiError.unauthorized("User no longer exists"));
    }

    socket.user = {
      id: user._id.toString(),
      role: user.role,
      name: user.name,
      email: user.email,
    };

    next();
  } catch (error) {
    next(ApiError.unauthorized("Invalid or expired access token"));
  }
};

export default authenticateSocket;
