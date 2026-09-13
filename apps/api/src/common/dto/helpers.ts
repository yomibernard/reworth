import { applyDecorators } from '@nestjs/common';
import { plainToInstance, type ClassConstructor } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

/** Re-export common validators for DTOs. */
export {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
  applyDecorators,
  plainToInstance,
};

export function toDto<T extends object>(
  cls: ClassConstructor<T>,
  plain: unknown,
): T {
  return plainToInstance(cls, plain, {
    enableImplicitConversion: true,
    excludeExtraneousValues: false,
  });
}
