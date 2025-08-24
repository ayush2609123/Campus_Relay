export class ApiResponse<T = unknown> {
    statusCode: number;
    data: T | null;
    message: string;
    success: boolean;
  
    constructor(statusCode: number, data: T | null, message = "Success") {
      this.statusCode = statusCode;
      this.data = data;
      this.message = message;
      this.success = statusCode < 400;
    }
  }
  