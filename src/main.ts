import { NestFactory } from "@nestjs/core";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import helmet from "helmet";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: ['https://yourtrusteddomain.com'],
    methods: 'GET,POST,DELETE,PATCH',
    allowedHeaders: 'Content-Type, Authorization',
  });

  app.use(helmet());

  const config = new DocumentBuilder()
    .setTitle("Movies API")
    .setDescription("API for managing movies and genres")
    .setVersion("1.0")
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  await app.listen(8080);
}
bootstrap();
