import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: 2,
      maxlength: 45,
    },
    email: {
      type: String,
      required: [true, "email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 322,
    },
    password: {
      type: String,
      required: [true, "password is required"],
      minlength: 8,
      maxlength: 255,
      select: false,
    },
    role: {
      type: String,
      enum: ["admin", "manager", "viewer"],
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: { type: String, select: false },
  },
  { timestamps: true },
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = async function (candiatePassword) {
  return bcrypt.compare(candiatePassword, this.password);
};

export default mongoose.model("User", userSchema);
