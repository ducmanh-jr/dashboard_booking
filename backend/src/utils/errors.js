/**
 * Lớp lỗi tùy chỉnh cho ứng dụng.
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, errorCode = "INTERNAL_ERROR") {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true; // Đánh dấu lỗi này là lỗi đã được xử lý (như validate, auth...)

    Error.captureStackTrace(this, this.constructor);
  }
}

export const NotFoundError = (message = "Không tìm thấy tài nguyên") => 
  new AppError(message, 404, "NOT_FOUND");

export const BadRequestError = (message = "Dữ liệu không hợp lệ") => 
  new AppError(message, 400, "BAD_REQUEST");

export const UnauthorizedError = (message = "Chưa đăng nhập") => 
  new AppError(message, 401, "UNAUTHORIZED");

export const ForbiddenError = (message = "Không có quyền truy cập") => 
  new AppError(message, 403, "FORBIDDEN");

export const ConflictError = (message = "Dữ liệu đã tồn tại") => 
  new AppError(message, 409, "CONFLICT");
