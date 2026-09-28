import { Logger } from '@nestjs/common';

export function logStructured(
  logger: Logger,
  event: string,
  fields: Record<string, unknown>,
) {
  const payload = {
    event,
    timestamp: new Date().toISOString(),
    ...fields,
  };
  if (process.env.NODE_ENV === 'production') {
    logger.log(JSON.stringify(payload));
  } else {
    logger.log(`${event} ${JSON.stringify(fields)}`);
  }
}
