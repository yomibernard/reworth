import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  type AuthUser,
} from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { DeliveryService } from './delivery.service';
import {
  DeliveryQuoteQueryDto,
  DeliveryWebhookDto,
  MeetPointFulfilmentDto,
  MeetPointsQueryDto,
} from './dto/delivery.dto';

@Controller('meet-points')
export class MeetPointsController {
  constructor(private readonly delivery: DeliveryService) {}

  @Get()
  list(@Query() query: MeetPointsQueryDto) {
    return this.delivery.listMeetPoints(query.community);
  }
}

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrderDeliveryController {
  constructor(private readonly delivery: DeliveryService) {}

  @Get(':id/delivery-quote')
  quote(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query() query: DeliveryQuoteQueryDto,
  ) {
    return this.delivery.quote(id, user.id, query.toLat, query.toLng);
  }

  @Post(':id/fulfilment/meet-point')
  setMeetPoint(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: MeetPointFulfilmentDto,
  ) {
    return this.delivery.setMeetPoint(id, user.id, dto.meetPointId);
  }

  @Post(':id/disclose-address')
  disclose(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.delivery.discloseAddress(id, user.id);
  }

  @Get(':id/shipment')
  shipment(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.delivery.getShipment(id, user.id);
  }
}

@Controller('webhooks')
export class DeliveryWebhookController {
  constructor(private readonly delivery: DeliveryService) {}

  @Post('delivery')
  webhook(@Body() dto: DeliveryWebhookDto) {
    return this.delivery.handleWebhook(dto);
  }
}
