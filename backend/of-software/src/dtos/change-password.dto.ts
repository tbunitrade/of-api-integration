// update-user.dto.ts

import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({
    type: 'string',
    required: true,
  })
  currentPassword: string;
  @ApiProperty({
    type: 'string',
    required: true,
  })
  newPassword: string;
}
