export class RegisterDto {
  email: string;
  password: string;
}

export class SetNewPasswordDto {
  password: string;
  resetToken: string;
  securityToken: string;
}

export class ResetPasswordRequestDto {
  email: string;
}

export class ResetTokenDto {
  resetToken: string;
}

export class VerificationTokenDto {
  verificationToken: string;
}

export class VerifyEmailDto {
  verificationToken: string;
  verificationSecurityToken: string;
}

export interface ITokenResponse {
  token: string;
  used?: boolean;
  valid?: boolean;
}

export interface IVerifyEmailResponse extends ITokenResponse {
  message: string;
  success: boolean;
}

export interface IMessageResponse {
  message: string;
}
