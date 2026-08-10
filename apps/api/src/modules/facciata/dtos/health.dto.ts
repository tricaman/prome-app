import { ApiProperty } from '@nestjs/swagger';
import type { HealthResponse } from '@prome/contracts';

/** Rappresentazione OpenAPI di HealthResponse del contratto client. */
export class HealthDto implements HealthResponse {
  @ApiProperty({ enum: ['ok'] })
  status!: 'ok';

  @ApiProperty({ enum: ['app', 'worker'] })
  role!: 'app' | 'worker';

  @ApiProperty({ example: 'v1' })
  version!: string;
}
