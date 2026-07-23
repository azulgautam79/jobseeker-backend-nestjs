import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { UsersService } from '../users/users.service';
import { InjectModel } from '@nestjs/mongoose';
import { User } from '../users/schemas/user.schema';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RegisterResponseDto } from './dto/register-response.dto';
import { LoginResponseDto } from './dto/login-response.dto';

/**
 *! Auth Service
 */
@Injectable()
export class AuthService {
  private readonly SALT_ROUNDS = 10;

  //! Dependency Injection
  constructor(
    @InjectModel(User.name) private UserModel: Model<User>,
    private jwtService: JwtService,
    private usersService: UsersService,
  ) {}

  private generateToken = (userId: string): string => {
    return this.jwtService.sign(
      {}, // payload
      {
        subject: String(userId), // 👈 becomes payload.sub
        secret: process.env.JWT_SECRET,
        expiresIn: '7d',
      },
    );
  };

  //? Response for registration
  private buildResponse(user: any) {
    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      token: this.generateToken(user._id),
      companyName: user.companyName || '',
      companyDescription: user.companyDescription || '',
      companyLogo: user.companyLogo || '',
      resume: user.resume || '',
    };
  }

  /**
   *! Register a new user
   */
  async register(registerDto: RegisterDto): Promise<RegisterResponseDto> {
    const { name, email, password, avatar, role } = registerDto;

    const emailInUse = await this.usersService.findByEmail(email);
    if (emailInUse) {
      throw new BadRequestException('User with this email already exists');
    }

    try {
      const hashedPassword = await bcrypt.hash(password, this.SALT_ROUNDS);
      const user = await this.UserModel.create({
        name,
        email,
        password: hashedPassword,
        role,
        avatar,
      });

      return this.buildResponse(user);
    } catch (error) {
      console.error('Error during user registration:', error);
      throw new InternalServerErrorException(
        'An error occured during registration',
      );
    }
  }

  /**
   *! Login User
   */
  async login(loginDto: LoginDto): Promise<LoginResponseDto> {
    const { email, password } = loginDto;

    const user = await this.usersService.findByEmail(email);

    if (
      !user ||
      !(await bcrypt.compare(password.trim(), user.password.trim()))
    ) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.buildResponse(user);
  }
}
