import { Injectable, NestMiddleware } from '@nestjs/common';

import moment from 'moment';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    const startHrTime = process.hrtime();

    let requestBodySize = 0;
    req.on('data', (chunk: Buffer) => {
      requestBodySize += chunk.length;
    });

    res.on('finish', () => {
      const elapsedHrTime = process.hrtime(startHrTime);
      const elapsedMs = (
        elapsedHrTime[0] * 1000 +
        elapsedHrTime[1] / 1e6
      ).toFixed(2);

      const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
      const fullUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
      const method = req.method;
      const status = res.statusCode;
      const statusMessage = res.statusMessage || '';
      const responseSize = res.getHeader('Content-Length') || 'unknown';
      const clientIp = req.ip || req.connection.remoteAddress || 'unknown';

      const statusColors: Record<number, string> = {
        1: '\x1b[35m',
        2: '\x1b[32m',
        3: '\x1b[36m',
        4: '\x1b[33m',
        5: '\x1b[31m',
      };
      const resetColor = '\x1b[0m';
      const statusColor = statusColors[Math.floor(status / 100)] || resetColor;

      const log = `${statusColor} ${timestamp} ${method} ${fullUrl} - ${status} : ${statusMessage} ${elapsedMs}ms${resetColor} - Res: ${responseSize} bytes Req: ${requestBodySize} bytes`;

      console.log(log);
    });

    next();
  }
}
