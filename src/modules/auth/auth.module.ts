import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt-strategy';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../users/schemas/user.schema';
import { RefreshTokenStrategy } from './strategies/refresh-token.strategy';
import { Otp, OtpSchema } from './schemas/otp.schema';
import { MailModule } from '../mail/mail.module';
import { AuthV2Controller } from './authv2.controller';
import { AuthV2Service } from './authv2.service';
import { AppLoggerModule } from '../../common/logger/logger.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.getOrThrow<number>('JWT_EXPIRES_IN'),
        },
      }),
    }),
    MongooseModule.forFeature([
      {
        name: User.name,
        schema: UserSchema,
      },
      {
        name: Otp.name,
        schema: OtpSchema,
      },
    ]),
    UsersModule,
    MailModule,
    AppLoggerModule,
  ],
  controllers: [AuthController, AuthV2Controller],
  providers: [AuthService, AuthV2Service, JwtStrategy, RefreshTokenStrategy],
})
export class AuthModule {}
