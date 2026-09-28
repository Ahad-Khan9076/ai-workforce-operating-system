export class ApiError extends Error {
  statusCode: number;
  details?: string | string[];

  constructor(message: string, statusCode: number, details?: string | string[]) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Something went wrong';
}
