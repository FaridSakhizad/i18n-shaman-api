import {
  BadRequestException,
  Body,
  Req,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Inject,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import {
  IMessageResponse,
  ITokenResponse,
  IVerifyEmailResponse,
  RegisterDto,
  ResetPasswordRequestDto,
  ResetTokenDto,
  SetNewPasswordDto,
  VerificationTokenDto,
  VerifyEmailDto,
} from './dto/register.dto';
import { IPublicUserData, IUpdatePassword } from './interfaces/user.interface';
import { ApiResponse } from '../interfaces';
import { TokenService } from './token.service';
import { ValidationService } from '../validation/validation.servise';
import { Model } from 'mongoose';
import { IToken } from './interfaces/token.interface';
import { AuthGuard } from './auth.guard';
import { CurrentUserId } from './current-user-id.decorator';
import { createApiResponse } from '../common/http-response';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject('TOKEN_MODEL')
    private tokenModel: Model<IToken>,

    private readonly authService: AuthService,
    private readonly tokenService: TokenService,
    private readonly validationService: ValidationService,
  ) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto, @Req() req): Promise<ApiResponse<IPublicUserData>> {
    const result = await this.authService.loginUser(loginDto, req.session);

    return createApiResponse(req, result);
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  async logout(@Req() req): Promise<ApiResponse<IMessageResponse>> {
    await req.session.destroy();

    return createApiResponse(req, { message: 'ok' });
  }

  @Post('register')
  async register(@Req() req, @Body() registerDto: RegisterDto): Promise<ApiResponse<IPublicUserData>> {
    if (!registerDto.email || !registerDto.password) {
      throw new BadRequestException({
        error: 'Registration Failed',
        message: 'Insufficient credentials',
      });
    }

    const data = await this.authService.createUser(registerDto);
    const { id: newUserId, email } = data as IPublicUserData;

    await this.authService.initEmailVerification(email, newUserId.toString());

    return createApiResponse(req, data);
  }

  @Post('validateVerificationToken')
  async validateVerificationToken(@Req() req, @Body() { verificationToken }: VerificationTokenDto): Promise<ApiResponse<ITokenResponse>> {
    const verificationTokenDocument = await this.tokenService.verifyToken(verificationToken, 'email_verification');

    if (!verificationTokenDocument) {
      throw new BadRequestException({
        error: 'Verification Token is Invalid',
        message: 'Verification token is invalid or expired',
      });
    }

    const { token, used } = verificationTokenDocument;

    return createApiResponse(req, {
      token,
      used,
      valid: !used && verificationToken === token,
    });
  }

  @Post('getEmailVerificationSecurityToken')
  async getEmailVerificationSecurityToken(@Req() req, @Body() { verificationToken }: VerificationTokenDto): Promise<ApiResponse<ITokenResponse>> {
    const verificationTokenDocument = await this.tokenService.verifyToken(verificationToken, 'email_verification');

    if (!verificationTokenDocument) {
      throw new NotFoundException({
        error: 'Verification Token not Found',
        message: 'Verification token is invalid or expired',
      });
    }

    const emailVerificationSecurityToken = await this.authService.createEmailVerificationSecurityToken(
      verificationTokenDocument.userId.toString(),
      verificationToken,
    );

    return createApiResponse(req, { token: emailVerificationSecurityToken });
  }

  @Post('verifyEmail')
  async verifyEmail(@Req() req, @Body() { verificationToken, verificationSecurityToken }: VerifyEmailDto): Promise<ApiResponse<IVerifyEmailResponse>> {
    const verificationTokenDocument = await this.tokenService.verifyToken(verificationToken, 'email_verification');
    const verificationSecurityTokenDocument = await this.tokenService.verifyToken(verificationSecurityToken, 'email_verification_security');

    if (!verificationSecurityTokenDocument || !verificationTokenDocument) {
      throw new BadRequestException({
        error: 'Verification Security Token is Invalid',
        message: 'Verification token is invalid or expired',
      });
    }

    const tokensBelongToSameUser =
      verificationSecurityTokenDocument.userId.toString() === verificationTokenDocument.userId.toString()
      && verificationSecurityTokenDocument.metadata?.verificationToken === verificationToken;

    if (!tokensBelongToSameUser) {
      throw new ForbiddenException({
        error: 'Verification Token Mismatch',
        message: 'Verification token mismatch',
      });
    }

    const emailVerificationResult = await this.authService.verifyEmail(
      verificationSecurityTokenDocument.userId.toString(),
      verificationTokenDocument,
    );

    const { token, used } = verificationSecurityTokenDocument;

    return createApiResponse(req, {
      token,
      used,
      message: emailVerificationResult.data,
      success: emailVerificationResult.success,
    });
  }

  @Get('verifyUser')
  @UseGuards(AuthGuard)
  async verify(@Req() req, @CurrentUserId() userId: string): Promise<ApiResponse<IPublicUserData>> {
    const result = await this.authService.verifyUser(userId);

    return createApiResponse(req, result);
  }

  @Post('resendVerificationEmail')
  @UseGuards(AuthGuard)
  async resendVerificationEmail(@Req() req, @CurrentUserId() userId: string): Promise<ApiResponse<IMessageResponse>> {
    await this.authService.resendEmailVerification(userId);

    return createApiResponse(req, { message: 'Verification Email Sent' });
  }

  @Post('resetPasswordRequest')
  async resetPasswordRequest(@Req() req, @Body() { email }: ResetPasswordRequestDto): Promise<ApiResponse<IMessageResponse>> {
    const { session, sessionID } = req;

    if (session && sessionID && session.userId && session.userLoggedIn) {
      throw new ForbiddenException('Reset password operation is not available for authenticated sessions');
    }

    const resetPasswordData = await this.authService.resetPasswordRequest(email);

    if (resetPasswordData) {
      session.userId = resetPasswordData.userId;
      session.resetToken = resetPasswordData.resetToken;
    }

    return createApiResponse(req, { message: 'Reset Password Request Successful' });
  }

  @Get('getPasswordResetSecurityToken')
  async getPasswordResetSecurityToken(@Req() req): Promise<ApiResponse<ITokenResponse>> {
    return this.createPasswordResetSecurityTokenResponse(req, req.session.resetToken);
  }

  @Post('setNewPassword')
  async setNewPassword(@Req() req, @Body() setNewPasswordDto: SetNewPasswordDto): Promise<ApiResponse<unknown>> {
    const { session } = req;

    const { password, resetToken, securityToken } = setNewPasswordDto;

    if (password.length < 3) {
      throw new BadRequestException({
        error: 'Reset Password Failed',
        message: 'Password is invalid',
      });
    }

    delete session.userLoggedIn;

    const resetTokenDocument = await this.tokenService.verifyToken(resetToken, 'password_reset');
    const resetSecurityTokenDocument = await this.tokenService.verifyToken(securityToken, 'password_reset_security');

    if (!resetTokenDocument) {
      delete session.resetToken;
    }

    if (!resetSecurityTokenDocument) {
      delete session.resetSecurityToken;
    }

    const tokensBelongToSameUser = resetTokenDocument
      && resetSecurityTokenDocument
      && resetTokenDocument.userId.toString() === resetSecurityTokenDocument.userId.toString();
    const tokensMatchSession =
      session.userId?.toString() === resetTokenDocument?.userId.toString()
      && session.resetToken === resetToken
      && session.resetSecurityToken === securityToken;
    const securityTokenMatchesResetToken =
      resetSecurityTokenDocument?.metadata?.resetToken === resetToken;

    if (
      !resetTokenDocument
      || !resetSecurityTokenDocument
      || !tokensBelongToSameUser
      || !tokensMatchSession
      || !securityTokenMatchesResetToken
    ) {
      throw new ForbiddenException({
        error: 'Reset Password Failed',
        message: 'Reset token is invalid or expired',
      });
    }

    const setNewPasswordResult = await this.authService.setNewPassword(resetTokenDocument.userId.toString(), password);

    delete session.userId;
    delete session.resetToken;
    delete session.resetSecurityToken;

    return createApiResponse(req, setNewPasswordResult);
  }

  @Post('validateResetToken')
  async validateResetToken(@Req() req, @Body() { resetToken }: ResetTokenDto): Promise<ApiResponse<ITokenResponse>> {
    const resetTokenDocument = await this.tokenService.verifyToken(resetToken, 'password_reset');
    const { session } = req;

    if (!resetTokenDocument) {
      throw new BadRequestException({
        error: 'Reset Token is Invalid',
        message: 'Reset token is invalid or expired',
      });
    }

    const { token, used } = resetTokenDocument;

    session.userId = resetTokenDocument.userId.toString();
    session.resetToken = token;
    delete session.resetSecurityToken;
    delete session.userLoggedIn;

    return createApiResponse(req, {
      token,
      used,
      valid: !used && resetToken === token,
    });
  }

  @Post('getPasswordResetSecurityToken')
  async getPasswordResetSecurityTokenPost(
    @Req() req,
    @Body() { resetToken }: ResetTokenDto,
  ): Promise<ApiResponse<ITokenResponse>> {
    return this.createPasswordResetSecurityTokenResponse(req, resetToken);
  }

  @Get('getUpdatePasswordSecurityToken')
  @UseGuards(AuthGuard)
  async getUpdatePasswordSecurityToken(@Req() req, @CurrentUserId() userId: string): Promise<ApiResponse<ITokenResponse>> {
    const { session } = req;

    await this.tokenModel.deleteMany({
      userId,
      type: 'password_update',
    });

    const updateTokenDocument = await this.tokenService.createToken({
      userId,
      type: 'password_update',
      expiresInMinutes: 10,
    });

    session.passwordUpdateToken = updateTokenDocument.token;

    return createApiResponse(req, { token: updateTokenDocument.token });
  }

  private async createPasswordResetSecurityTokenResponse(req, resetToken: string): Promise<ApiResponse<ITokenResponse>> {
    const { session } = req;

    if (session.userLoggedIn) {
      throw new BadRequestException({
        error: 'Insufficient credentials',
        message: 'Reset password operation is not available for authenticated sessions',
      });
    }

    if (!resetToken) {
      throw new BadRequestException({
        error: 'Reset Token is Invalid',
        message: 'Reset token is missing',
      });
    }

    const resetTokenDocument = await this.tokenService.verifyToken(resetToken, 'password_reset');

    if (!resetTokenDocument || (session.resetToken && session.resetToken !== resetToken)) {
      throw new BadRequestException({
        error: 'Reset Token is Invalid',
        message: 'Reset token is invalid or expired',
      });
    }

    const userId = resetTokenDocument.userId.toString();
    const resetSecurityToken = await this.authService.createPasswordResetSecurityToken(userId, resetToken);

    if (!resetSecurityToken || resetSecurityToken.length < 1) {
      throw new NotFoundException({
        error: 'Security Token Not Found',
        message: 'Security token could not be created',
      });
    }

    session.userId = userId;
    session.resetToken = resetToken;
    session.resetSecurityToken = resetSecurityToken;

    return createApiResponse(req, { token: resetSecurityToken });
  }

  @Post('updatePassword')
  @UseGuards(AuthGuard)
  async updatePassword(
    @Req() req,
    @Body() { securityToken, password, newPassword, confirmPassword }: IUpdatePassword,
    @CurrentUserId() userId: string,
  ): Promise<ApiResponse<Record<string, never>>> {
    const { session } = req;

    const isPasswordValid = await this.authService.verifyUserPassword(userId, password);

    const updateTokenDocument = await this.tokenService.verifyToken(securityToken, 'password_update');

    const tokenBelongsToCurrentUser = updateTokenDocument
      && updateTokenDocument.userId.toString() === userId
      && session.passwordUpdateToken === securityToken;

    if (!isPasswordValid || !tokenBelongsToCurrentUser) {
      throw new ForbiddenException({
        error: 'Update Password Failed',
        message: 'Password or security token is invalid',
      });
    }

    const validationResult = this.validationService.validatePassword(newPassword);

    if (newPassword !== confirmPassword || !validationResult.success) {
      throw new BadRequestException({
        error: 'Update Password Failed',
        message: 'New password is invalid',
        errors: validationResult.errors ? validationResult.errors.map((error) => ({ ...error, field: 'password' })) : [],
      });
    }

    await this.authService.updatePassword(userId, newPassword);

    delete session.passwordUpdateToken;

    return createApiResponse(req, {});
  }
}
