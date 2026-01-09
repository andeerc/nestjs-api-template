import fastifyCookie from '@fastify/cookie';
import fastifyHelmet from '@fastify/helmet';
import fastifySession from '@fastify/session';
import {
  ClassSerializerInterceptor,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import compression from 'compression';
import { ResponseInterceptor } from '../application/http/common/interceptors/response.interceptor';
import { envConfig } from './env.config';
import { createSessionConfig } from './session.config';

export class AppConfig {
  static async setup(app: INestApplication & NestFastifyApplication) {
    // Compression
    app.use(compression({
      filter: () => { return true },
      threshold: 0
    }));

    // CORS
    app.enableCors({
      origin: (origin, callback) => {
        // Permitir requisições sem origin (como file://) ou do CORS_ORIGIN configurado
        const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || [];

        // Permite: localhost, IPs locais, null (arquivos locais), e origens configuradas
        if (!origin ||
          origin === 'null' ||
          origin.includes('localhost') ||
          origin.includes('127.0.0.1') ||
          /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(origin) || // IPs da rede local 192.168.x.x
          /^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(origin) || // IPs da rede local 10.x.x.x
          /^http:\/\/172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(origin) || // IPs da rede local 172.16-31.x.x
          allowedOrigins.includes(origin)) {
          callback(null, true);
        } else if (allowedOrigins.length === 0 || allowedOrigins[0] === '*') {
          // Se não houver restrições configuradas, permite tudo
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
      allowedHeaders: 'Content-Type, Accept, Authorization',
      credentials: true,
    });

    await app.register(fastifyCookie);
    await app.register(fastifySession, await createSessionConfig());

    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    app.useGlobalInterceptors(
      new ResponseInterceptor(),
      new ClassSerializerInterceptor(app.get(Reflector)),
    );

    // Helmet para segurança
    // Em desenvolvimento, relaxa CSP para permitir testes de rede local
    const cspConfig = envConfig.isProduction ? {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
          scriptSrcAttr: ["'none'"],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            'https://cdn.jsdelivr.net',
            'https://fonts.googleapis.com',
          ],
          styleSrcElem: [
            "'self'",
            'https://cdn.jsdelivr.net',
            'https://fonts.googleapis.com',
            "'unsafe-inline'",
          ],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: [
            "'self'",
            'https://cdn.jsdelivr.net',
            'https://fonts.gstatic.com',
            'data:',
          ],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
    } : {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
          scriptSrcAttr: ["'unsafe-inline'"],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            'https://cdn.jsdelivr.net',
            'https://fonts.googleapis.com',
          ],
          styleSrcElem: [
            "'self'",
            'https://cdn.jsdelivr.net',
            'https://fonts.googleapis.com',
            "'unsafe-inline'",
          ],
          imgSrc: ["'self'", 'data:', 'https:', 'http:'],
          connectSrc: ["'self'", 'http:', 'ws:', 'wss:'], // Permite qualquer HTTP/WS em dev
          fontSrc: [
            "'self'",
            'https://cdn.jsdelivr.net',
            'https://fonts.gstatic.com',
            'data:',
          ],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
          upgradeInsecureRequests: null, // Não força HTTPS em dev
        },
      },
    };

    await app.register(fastifyHelmet as any, cspConfig as any);

    // Configuração do Swagger
    this.setupSwagger(app);
  }

  private static setupSwagger(app: INestApplication & NestFastifyApplication) {
    const config = new DocumentBuilder()
      .addServer(`http://localhost:${envConfig.port}`, 'Local server')
      .setTitle('api API')
      .setDescription(
        '# api Back-end\n\n' +
        'API back-end para o sistema api.\n\n' +
        '## Recursos\n\n' +
        '- **Cache com Redis**: Suporte completo a cache com múltiplas estratégias\n' +
        '- **Validação**: Validação automática de DTOs com class-validator\n' +
        '- **Logs**: Morgan para logs de requisição e resposta\n' +
        '- **Segurança**: Helmet configurado para proteção contra vulnerabilidades comuns\n' +
        '- **Performance**: Fastify para máxima performance\n\n',
      )
      .setVersion('1.0')
      .build();

    const documentFactory = SwaggerModule.createDocument(app, config);

    // Scalar UI como interface principal
    app.use(
      '/docs',
      apiReference({
        content: documentFactory,
        showDeveloperTools: 'never',
        theme: 'bluePlanet',
        darkMode: true,
        withFastify: true,
        layout: 'modern',
        pageTitle: 'API Documentation',
      }),
    );

    // Swagger endpoints para JSON e YAML
    SwaggerModule.setup('swagger', app, documentFactory, {
      jsonDocumentUrl: '/swagger/json',
      yamlDocumentUrl: '/swagger/yaml',
      swaggerUiEnabled: false,
    });
  }
}
