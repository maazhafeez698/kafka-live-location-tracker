import {
  sendVerificationEmail,
} from "../../common/config/email.js";
import ApiError from "../../common/utils/api-error.js";
import {
  generateAccessToken,
  generateResetToken,
  hashToken,
} from "../../common/utils/jwt.utils.js";
import User from "./auth.model.js";

const signup = async ({ name, email, password, role }) => {
  const existing = await User.findOne({ email });

  if (existing) {
    throw ApiError.conflict("Email already registered");
  }

  const { rawToken, hashedToken } = generateResetToken();

  const user = await User.create({
    name,
    email,
    password,
    ...(role && { role }),
    verificationToken: hashedToken,
  });

  try {
    await sendVerificationEmail(email, rawToken);
  } catch {}

  const userObj = user.toObject();

  delete userObj.password;
  delete userObj.verificationToken;

  return userObj;
};

const signin = async ({ email, password }) => {
  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  if (!user.isVerified) {
    throw ApiError.forbidden("Please verify your email before logging in");
  }

  const accessToken = generateAccessToken({
    id: user._id
  });

  const userObj = user.toObject();

  delete userObj.password;

  return {
    user: userObj,
    accessToken,
  };
};

const logout = async (userId) => {};

const verifyEmail = async (token) => {
  const trimmed = String(token).trim();

  if (!trimmed) {
    throw ApiError.badRequest("Invalid or expired verification token");
  }

  const hashedInput = hashToken(trimmed);

  let user = await User.findOne({
    verificationToken: hashedInput,
  }).select("+verificationToken");

  if (!user) {
    user = await User.findOne({
      verificationToken: trimmed,
    }).select("+verificationToken");
  }

  if (!user) {
    throw ApiError.badRequest("Invalid or expired verification token");
  }

  if (!user.isVerified) {
    await User.findByIdAndUpdate(user._id, {
      $set: {
        isVerified: true,
      },
      $unset: {
        verificationToken: 1,
      },
    });
  }

  return user;
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
  logout,
  verifyEmail,
  getMe,
};
