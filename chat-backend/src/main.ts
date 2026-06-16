import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS 配置：支持环境变量指定来源
  const corsOrigin = process.env.CORS_ORIGIN;
  app.enableCors({
    origin: corsOrigin ? corsOrigin.split(',') : true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`后端服务已启动: http://0.0.0.0:${port}`);
}
bootstrap();
