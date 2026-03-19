// src/lib/response.lib.ts

export interface SuccessResponse<T> {
  success: true;
  data: T;
}

export interface ErrorResponse {
  success: false;
  error: {
    status: number; // HTTP status e.g. 401
    code: string; // string code e.g. "UNAUTHORIZED"
    message: string;
    details?: { field: string; message: string }[];
  };
}

export function successResponse<T>(data: T): SuccessResponse<T> {
  return {
    success: true,
    data,
  };
}

export function errorResponse(
  status: number,
  code: string,
  message: string,
  details?: { field: string; message: string }[],
): ErrorResponse {
  return {
    success: false,
    error: { status, code, message, details },
  };
}
