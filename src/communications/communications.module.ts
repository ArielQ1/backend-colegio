import { Module } from '@nestjs/common';
import { CommunicationsService } from './communications.service';
import { CommunicationsController } from './communications.controller';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Module({
  imports: [AuthModule],
  controllers: [CommunicationsController],
  providers: [CommunicationsService, JwtAuthGuard],
})
export class CommunicationsModule {}
