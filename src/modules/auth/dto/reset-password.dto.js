import Joi from "joi";
import BaseDto from "../../../common/dto/base.dto.js";

class ResetPasswordDto extends BaseDto {
  static schema = Joi.object({
    password: Joi.string()
      .min(8)
      .pattern(/(?=.*[A-Z])(?=.*\d)/)
      .message(
        "Password must be at least 8 characters and include one uppercase letter and one number.",
      )
      .required(),
  });
}

export default ResetPasswordDto;
