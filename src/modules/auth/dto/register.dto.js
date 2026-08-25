import Joi from "joi";
import BaseDto from "../../../common/dto/base.dto.js";

class RegisterDto extends BaseDto {
  static schema = Joi.object({
    name: Joi.string().trim().min(2).max(45).required(),
    email: Joi.string().email().lowercase().trim().max(322).required(),
    password: Joi.string()
      .min(8)
      .pattern(/(?=.*[A-Z])(?=.*\d)/)
      .message(
        "Password must be at least 8 characters and include one uppercase letter and one number.",
      )
      .required(),
    role: Joi.string().valid("admin", "manager", "viewer"),
  });
}

export default RegisterDto;
