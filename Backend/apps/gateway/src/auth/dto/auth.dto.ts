import { applyDecorators } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

function IsAccountEmail() {
  return applyDecorators(
    ApiProperty({ example: 'student@example.com' }),
    Transform(({ value }: { value: unknown }) =>
      typeof value === 'string' ? value.trim().toLowerCase() : value,
    ),
    IsEmail({}, { message: 'Enter a valid email, like name@example.com' }),
  );
}

// Same rules as the signup form. The upper limit stops very long inputs from
// making password hashing expensive.
function IsNewPassword() {
  return applyDecorators(
    ApiProperty({ example: 'abcd1234', minLength: 8, maxLength: 128 }),
    IsString(),
    MinLength(8, { message: 'Use at least 8 characters' }),
    MaxLength(128, { message: 'Use 128 characters or fewer' }),
    Matches(/\p{L}/u, { message: 'Use at least 1 letter' }),
    Matches(/\d/, { message: 'Use at least 1 number' }),
  );
}

function IsRequiredText() {
  return applyDecorators(ApiProperty(), IsString(), IsNotEmpty());
}

export class SignupDto {
  @ApiProperty({ example: 'Ana Silva', maxLength: 100 })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty({ message: 'Enter your full name' })
  @MaxLength(100)
  fullName: string;

  @IsAccountEmail()
  email: string;

  @IsNewPassword()
  password: string;
}

export class LoginDto {
  @IsAccountEmail()
  email: string;

  @IsRequiredText()
  @MaxLength(128)
  password: string;
}

export class GoogleLoginDto {
  @IsRequiredText()
  idToken: string;
}

export class EmailDto {
  @IsAccountEmail()
  email: string;
}

export class ResetPasswordDto {
  @IsRequiredText()
  token: string;

  @IsNewPassword()
  password: string;
}
