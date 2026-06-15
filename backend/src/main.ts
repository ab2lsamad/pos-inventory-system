import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HttpExceptionFilter } from './shared/filters/http-exception.filter';
import { InvalidRequestValidator } from './shared/pipes/invalid-request.validator';

// Secrets that must never be used outside local development.
const INSECURE_DEFAULT_SECRETS = [
  'dev-access-secret-change-me',
  'dev-refresh-secret-change-me',
  'your-access-secret-here',
  'your-refresh-secret-here',
];

// Fail fast in production if JWT secrets are missing or still placeholders.
function assertSecureSecrets() {
  if (process.env.NODE_ENV !== 'production') return;

  const accessSecret = process.env.JWT_ACCESS_SECRET;
  const refreshSecret = process.env.JWT_REFRESH_SECRET;

  const problems: string[] = [];
  for (const [name, value] of [
    ['JWT_ACCESS_SECRET', accessSecret],
    ['JWT_REFRESH_SECRET', refreshSecret],
  ] as const) {
    if (!value) {
      problems.push(`${name} is not set`);
    } else if (INSECURE_DEFAULT_SECRETS.includes(value)) {
      problems.push(`${name} is still a placeholder/default value`);
    } else if (value.length < 32) {
      problems.push(`${name} is too short (use at least 32 characters)`);
    }
  }

  if (accessSecret && refreshSecret && accessSecret === refreshSecret) {
    problems.push('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must differ');
  }

  if (problems.length > 0) {
    throw new Error(
      `Refusing to start in production with insecure JWT secrets:\n` +
        problems.map((p) => `  - ${p}`).join('\n') +
        `\nGenerate strong values with: openssl rand -base64 48`,
    );
  }
}

async function bootstrap() {
  assertSecureSecrets();

  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(new InvalidRequestValidator());

  // Credentialed requests require an explicit origin allowlist — a wildcard
  // origin is ignored by browsers when credentials are enabled.
  const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3001')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // Only expose the API schema/docs outside production.
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('POS System API')
      .setDescription('The API description for the Point of Sale system')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(`Application running on port ${port}`, 'Bootstrap');
}
bootstrap();
