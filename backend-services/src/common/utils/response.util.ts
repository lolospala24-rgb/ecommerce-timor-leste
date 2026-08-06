// placeholder for src/common/utils/response.util.ts
export class ResponseUtil {
  /**
   * Create a success response
   * @param data - Response data
   * @param message - Success message
   * @returns Formatted success response
   */
  static success(data: any, message: string = 'Success') {
    return {
      success: true,
      message,
      data,
    };
  }

  /**
   * Create an error response
   * @param message - Error message
   * @param statusCode - HTTP status code
   * @returns Formatted error response
   */
  static error(message: string, statusCode: number = 400) {
    return {
      success: false,
      message,
      statusCode,
    };
  }

  /**
   * Create a paginated response
   * @param data - Array of data items
   * @param total - Total number of items
   * @param page - Current page number
   * @param limit - Items per page
   * @returns Formatted paginated response
   */
  static paginate(data: any[], total: number, page: number, limit: number) {
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNext,
        hasPrev,
        from: (page - 1) * limit + 1,
        to: Math.min(page * limit, total),
      },
    };
  }

  /**
   * Create a no content response
   * @returns No content response
   */
  static noContent() {
    return {
      success: true,
      message: 'Operation successful, no content to return',
      data: null,
    };
  }

  /**
   * Create a created response
   * @param data - Created resource data
   * @param message - Success message
   * @returns Created response
   */
  static created(data: any, message: string = 'Resource created successfully') {
    return {
      success: true,
      message,
      data,
    };
  }

  /**
   * Create an updated response
   * @param data - Updated resource data
   * @param message - Success message
   * @returns Updated response
   */
  static updated(data: any, message: string = 'Resource updated successfully') {
    return {
      success: true,
      message,
      data,
    };
  }

  /**
   * Create a deleted response
   * @param message - Success message
   * @returns Deleted response
   */
  static deleted(message: string = 'Resource deleted successfully') {
    return {
      success: true,
      message,
      data: null,
    };
  }

  /**
   * Validate required fields
   * @param data - Object to validate
   * @param requiredFields - Array of required field names
   * @throws Error if any required field is missing
   */
  static validateRequired(data: any, requiredFields: string[]) {
    const missingFields: string[] = [];
    
    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === null || data[field] === '') {
        missingFields.push(field);
      }
    }
    
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }
  }

  /**
   * Sanitize data (remove sensitive fields)
   * @param data - Data to sanitize
   * @param sensitiveFields - Array of fields to remove
   * @returns Sanitized data
   */
  static sanitize(data: any, sensitiveFields: string[] = ['password', 'refreshToken', 'resetToken']) {
    if (!data) return data;
    
    const sanitized = Array.isArray(data) ? [...data] : { ...data };
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        delete sanitized[field];
      }
    }
    
    if (Array.isArray(sanitized)) {
      sanitized.forEach(item => this.sanitize(item, sensitiveFields));
    }
    
    return sanitized;
  }
}