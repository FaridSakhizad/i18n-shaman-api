import { Injectable } from '@nestjs/common';
import {
  IValidationResponse,
  IValidationResponseError,
  PASSWORD_MIN_LENGTH,
  EEmailValidationErrors,
  EPasswordValidationErrors,
} from './interfaces/validation.interface';

@Injectable()
export class ValidationService {
  validateEmail(email: string): IValidationResponse {
    const errors: IValidationResponseError[] = [];

    if (!/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(email)) {
      errors.push({
        message: EEmailValidationErrors.INVALID,
      });
    }

    return {
      success: errors.length < 1,
      errors,
    };
  }

  validatePassword(password: string): IValidationResponse {
    const errors: IValidationResponseError[] = [];

    if (password.length < PASSWORD_MIN_LENGTH) {
      errors.push({
        message: EPasswordValidationErrors.TOO_SHORT,
      });
    }

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()])[A-Za-z\d!@#$%^&*()]{6,}$/.test(password)) {
      errors.push({
        message: EPasswordValidationErrors.TOO_WEAK,
      });
    }

    return {
      success: errors.length < 1,
      errors,
    };
  }
}
