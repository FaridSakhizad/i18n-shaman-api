import { IsString } from 'class-validator';

export class RegisterDto {
  @IsString()
  email: string;

  @IsString()
  password: string;
}

export class SetNewPasswordDto {
  @IsString()
  password: string;

  @IsString()
  resetToken: string;

  @IsString()
  securityToken: string;
}

export class ResetPasswordRequestDto {
  @IsString()
  email: string;
}

export class ResetTokenDto {
  @IsString()
  resetToken: string;
}

export class VerificationTokenDto {
  @IsString()
  verificationToken: string;
}

export class VerifyEmailDto {
  @IsString()
  verificationToken: string;

  @IsString()
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
