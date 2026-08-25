import {
  sendResetPasswordEmail,
  sendVerificationEmail,
} from "../../common/config/email.js";
import ApiError from "../../common/utils/api-error.js";
import {
  generateAccessToken,
  generateRefreshToken,
  generateResetToken,
  hashToken,
  verifyRefreshToken,
} from "../../common/utils/jwt.utils.js";
import User from "./auth.model.js";

const signup = async ({ name, email, password, role }) => {
  const existing = await User.findOne({ email });

  if (existing) {
    throw ApiError.conflict("Email already registered");
  }

  // Generate a secure one-time token.
  // Raw token goes to the user's email, only hashed token is stored in DB.
  const { rawToken, hashedToken } = generateResetToken();

  const user = await User.create({
    name,
    email,
    password,
    ...(role && { role }),
    verificationToken: hashedToken,
  });

  // Email failure should not rollback account creation.
  // User can request a resend verification email later.
  try {
    await sendVerificationEmail(email, rawToken);
  } catch {}

  // Remove sensitive fields before returning user data.
  const userObj = user.toObject();

  delete userObj.password;
  delete userObj.verificationToken;

  return userObj;
};

const signin = async ({ email, password }) => {
  // Fetch password explicitly because it is excluded in the User schema.
  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  // Compare plain password with hashed password stored in database.
  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  // Only verified users are allowed to access the application.
  if (!user.isVerified) {
    throw ApiError.forbidden("Please verify your email before logging in");
  }

  // Generate short-lived access token and long-lived refresh token.
  const accessToken = generateAccessToken({
    id: user._id
  });

  const refreshToken = generateRefreshToken({
    id: user._id,
  });

  // If the database leaks, the raw refresh token cannot be reused.
  user.refreshToken = hashToken(refreshToken);

  await user.save({
    // Skip unnecessary schema validations because only refreshToken changed.
    validateBeforeSave: false,
  });

  // Remove sensitive fields before sending user data to client.
  const userObj = user.toObject();

  delete userObj.password;
  delete userObj.refreshToken;

  return {
    user: userObj,
    accessToken,
    refreshToken,
  };
};

const refreshToken = async (token) => {
  if (!token) {
    throw ApiError.unauthorized("Refresh token missing");
  }

  const decoded = verifyRefreshToken(token);
  const user = await User.findById(decoded.id).select("+refreshToken");

  if (!user) {
    throw ApiError.unauthorized("User no longer exists");
  }

  // Hash the incoming refresh token and compare it
  const hashedToken = hashToken(token);

  if (user.refreshToken !== hashedToken) {
    throw ApiError.unauthorized("Invalid refresh token — please log in again");
  }

  // Generate a new access token after successful verification.
  const accessToken = generateAccessToken({
    id: user._id,
  });

  return {
    accessToken,
  };
};

const logout = async (userId) => {
  // Remove stored refresh token completely.
  await User.findByIdAndUpdate(userId, {
    $unset: {
      refreshToken: 1,
    },
  });
};

const verifyEmail = async (token) => {
  const trimmed = String(token).trim();

  if (!trimmed) {
    throw ApiError.badRequest("Invalid or expired verification token");
  }

  // Hash the raw token received from the email link.
  const hashedInput = hashToken(trimmed);

  let user = await User.findOne({
    verificationToken: hashedInput,
  }).select("+verificationToken");

  // Development/testing fallback:
  // allow direct comparison instead of hashing it again.
  if (!user) {
    user = await User.findOne({
      verificationToken: trimmed,
    }).select("+verificationToken");
  }

  if (!user) {
    throw ApiError.badRequest("Invalid or expired verification token");
  }

  // Avoid unnecessary database writes if the account is already verified.
  if (!user.isVerified) {
    await User.findByIdAndUpdate(user._id, {
      $set: {
        isVerified: true,
      },
      // Remove token after use so it cannot be reused.
      $unset: {
        verificationToken: 1,
      },
    });
  }

  return user;
};

const forgotPassword = async (email) => {
  const user = await User.findOne({ email });

  // Do not reveal whether an email is registered bcz of security reasons.
  if (!user) {
    return;
  }

  // Raw token is sent through email, hashed token is stored in DB.
  const { rawToken, hashedToken } = generateResetToken();

  user.resetPasswordToken = hashedToken;

  // Reset link will expire after 15 minutes.
  user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;

  await user.save();

  // Email failure should not crash the request.
  try {
    await sendResetPasswordEmail(email, rawToken);
  } catch {}
};

const resetPassword = async (token, newPassword) => {
  // Hash the incoming token because database stores only the hashed version.
  const hashedToken = hashToken(token);

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: {
      $gt: Date.now(),
    },
  }).select("+resetPasswordToken +resetPasswordExpires");

  if (!user) {
    throw ApiError.badRequest("Invalid or expired reset token");
  }

  // The User model pre-save hook should hash it before storing.
  user.password = newPassword;

  // Remove reset token data after successful password change.
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;

  // User will need to login again on all devices.
  user.refreshToken = undefined;

  await user.save();
};

const getMe = async (userId) => {
  if (!userId) throw ApiError.badRequest("User id is required");
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound("User not found");
  return user;
};

export {
  signup,
  signin,
  refreshToken,
  logout,
  verifyEmail,
  forgotPassword,
  resetPassword,
  getMe,
};
