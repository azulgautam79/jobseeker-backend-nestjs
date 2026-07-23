import { applyDecorators } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';

export function ApiDeprecated(summary: string) {
  return applyDecorators(
    ApiOperation({
      summary,
      deprecated: true,
    }),
  );
}
