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
  const { user, accessToken, refreshToken } = await authService.signin(
    req.body,
  );

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  ApiResponse.ok(res, "Login successful", { user, accessToken });
};

const refreshToken = async (req, res) => {
  const token = req.cookies?.refreshToken;
  const { accessToken } = await authService.refreshToken(token);
  ApiResponse.ok(res, "Token refreshed", { accessToken });
};

const logout = async (req, res) => {
  await authService.logout(req.user.id);
  res.clearCookie("refreshToken");
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

const forgotPassword = async (req, res) => {
  await authService.forgotPassword(req.body.email);
  ApiResponse.ok(res, "Password reset email sent");
};

const resetPassword = async (req, res) => {
  await authService.resetPassword(req.params.token, req.body.password);
  ApiResponse.ok(res, "Password reset successfully");
};

const getMe = async (req, res) => {
  const user = await authService.getMe(req.user.id);
  ApiResponse.ok(res, "User profile", user);
};

export {
  signup,
  signin,
  refreshToken,
  logout,
  verifyEmail,
  forgotPassword,
  resetPassword,
  getMe
};
