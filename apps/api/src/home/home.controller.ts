import { Controller, Get, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';
import { HomeService } from './home.service';

class HomeQueryDto {
  @IsOptional()
  @IsString()
  community?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsIn([2, 5, 10, 25])
  radiusKm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  lng?: number;
}

@Controller('home')
export class HomeController {
  constructor(private readonly home: HomeService) {}

  @Get()
  getHome(@Query() query: HomeQueryDto) {
    return this.home.getHome(query);
  }
}
