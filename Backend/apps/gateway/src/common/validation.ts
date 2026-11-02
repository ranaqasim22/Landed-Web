import { BadRequestException } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

export function validationExceptionFactory(errors: ValidationError[]) {
  return new BadRequestException({
    message: 'Please check the highlighted fields',
    errors: Object.fromEntries(
      errors.map(({ property, constraints }) => [
        property,
        Object.values(constraints ?? {}),
      ]),
    ),
  });
}
