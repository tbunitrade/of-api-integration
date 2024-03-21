// update-group-status.dto.ts

import { ApiProperty } from '@nestjs/swagger';

export class UpdateGroupStatus {
  @ApiProperty({
    type: 'array',
  })
  groupIds: number[];

  @ApiProperty({
    type: 'number',
  })
  status?: number;
}
