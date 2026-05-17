export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string | undefined;

  constructor(message: string, statusCode = 500, errorCode?: string) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.name = "AppError";
    Error.captureStackTrace(this, this.constructor);
  }
}
