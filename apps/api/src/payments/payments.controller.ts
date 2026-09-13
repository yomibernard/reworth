import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { InitiatePaymentDto } from './dto/payments.dto';
import { PaymentsService } from './payments.service';

@Controller()
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('payments/initiate')
  @UseGuards(JwtAuthGuard)
  initiate(@CurrentUser() user: AuthUser, @Body() dto: InitiatePaymentDto) {
    return this.payments.initiate(user.id, dto);
  }

  @Get('payments/:id')
  @UseGuards(JwtAuthGuard)
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.payments.getById(id, user.id);
  }

  @Post('webhooks/paystack')
  async paystackWebhook(
    @Req() req: { rawBody?: Buffer; body: unknown },
    @Headers('x-paystack-signature') signature?: string,
  ) {
    const raw =
      req.rawBody ??
      Buffer.from(JSON.stringify(req.body ?? {}), 'utf8');
    return this.payments.handleWebhook(raw, signature, req.body);
  }

  @Post('webhooks/mock-psp')
  mockPspWebhook(
    @Body() body: { reference: string; event?: string },
  ) {
    return this.payments.handleMockWebhook(body);
  }
}
