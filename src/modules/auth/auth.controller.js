import * as authService from "./auth.service.js";
import ApiResponse from "../../common/utils/api-response.js";

const signup = async (req, res) => {
  const user = await authService.signup(req.body);
  ApiResponse.created(
    res,
    "Registration successful. Please verify your email.",
    user,
  );
};

const signin = async (req, res) => {
  const { user, accessToken } = await authService.signin(req.body);
  ApiResponse.ok(res, "Login successful", { user, accessToken });
};

const logout = async (req, res) => {
  await authService.logout(req.user.id);
  ApiResponse.ok(res, "Logged out successfully");
};

const verifyEmail = async (req, res) => {
  const redirectToClient = req.query.redirect === "1";
  const clientUrl = process.env.CLIENT_URL || `${req.protocol}://${req.get("host")}`;

  try {
    await authService.verifyEmail(req.params.token);
  } catch (error) {
    if (redirectToClient) {
      return res.redirect(`${clientUrl}/?verification=failed`);
    }

    throw error;
  }

  if (redirectToClient) {
    return res.redirect(`${clientUrl}/?verification=success`);
  }

  ApiResponse.ok(res, "Email verified successfully");
};

const getMe = async (req, res) => {
  const user = await authService.getMe(req.user.id);
  ApiResponse.ok(res, "User profile", user);
};

export {
  signup,
  signin,
  logout,
  verifyEmail,
  getMe
};
