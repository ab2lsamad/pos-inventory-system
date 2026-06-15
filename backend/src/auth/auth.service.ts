import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import * as bcrypt from 'bcryptjs';

interface TokenPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(loginDto: LoginDto) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email: loginDto.email },
        include: { store: { select: { isActive: true } } },
      });

      if (!user) {
        throw new UnauthorizedException('Invalid email or password');
      }

      const isPasswordValid = await bcrypt.compare(
        loginDto.password,
        user.password,
      );

      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid email or password');
      }

      if (!user.isActive) {
        throw new UnauthorizedException(
          'Your account is inactive. Please contact an administrator.',
        );
      }

      // Non-admin users must be assigned to a store to operate the POS.
      if (user.role !== 'ADMIN' && !user.storeId) {
        throw new UnauthorizedException(
          'Your account is not assigned to a store. Please contact an administrator.',
        );
      }

      if (user.role !== 'ADMIN' && user.store && !user.store.isActive) {
        throw new UnauthorizedException(
          'Your store is currently inactive. Please contact an administrator.',
        );
      }

      const tokens = await this.generateTokens({
        sub: user.id,
        email: user.email,
        role: user.role,
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          storeId: user.storeId,
        },
        ...tokens,
      };
    } catch (error) {
      this.logger.error('Login failed', error.stack);
      throw error;
    }
  }

  async refreshTokens(refreshTokenDto: RefreshTokenDto) {
    try {
      const payload = await this.jwtService.verifyAsync<TokenPayload>(
        refreshTokenDto.refreshToken,
        {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        },
      );

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, role: true, storeId: true },
      });

      if (!user) {
        throw new UnauthorizedException('User no longer exists');
      }

      const tokens = await this.generateTokens({
        sub: user.id,
        email: user.email,
        role: user.role,
      });

      return {
        user,
        ...tokens,
      };
    } catch (error) {
      this.logger.error('Refresh token verification failed', error.stack);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  private async generateTokens(payload: TokenPayload) {
    try {
      const [accessToken, refreshToken] = await Promise.all([
        this.jwtService.signAsync(
          { ...payload },
          {
            secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
            expiresIn: this.configService.get<string>(
              'JWT_ACCESS_EXPIRES_IN',
              '15m',
            ) as any,
          },
        ),
        this.jwtService.signAsync(
          { ...payload },
          {
            secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
            expiresIn: this.configService.get<string>(
              'JWT_REFRESH_EXPIRES_IN',
              '7d',
            ) as any,
          },
        ),
      ]);

      return { accessToken, refreshToken };
    } catch (error) {
      this.logger.error('Token generation failed', error.stack);
      throw error;
    }
  }
}
