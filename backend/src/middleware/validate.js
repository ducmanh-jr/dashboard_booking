import logger from "../utils/logger.js";

/**
 * Middleware để validate request body bằng Zod schema.
 * @param {import("zod").ZodSchema} schema 
 */
export const validateBody = (schema) => (req, res, next) => {
  try {
    // Parse và validate dữ liệu
    const validatedData = schema.parse(req.body);
    
    // Gán dữ liệu đã validate vào req.validated để sử dụng ở controller
    req.validated = validatedData;
    
    next();
  } catch (error) {
    // Nếu là lỗi validation từ Zod
    if (error.name === "ZodError") {
      const details = error.errors.map((err) => ({
        path: err.path.join("."),
        message: err.message,
      }));

      logger.warn({ details, body: req.body }, "[validation error]");
      
      return res.status(400).json({
        error: "Dữ liệu không hợp lệ",
        details: details,
      });
    }
    
    // Các lỗi khác
    next(error);
  }
};
