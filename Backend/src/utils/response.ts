import { Response } from 'express';
import { HttpStatus, HttpStatusCode } from '../constants/httpStatus';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  [key: string]: any;
}

export const sendResponse = <T>(
  res: Response,
  statusCode: HttpStatusCode,
  payload: ApiResponse<T>
): void => {
  res.status(statusCode).json(payload);
};

export const sendSuccess = <T>(
  res: Response,
  data?: T,
  message?: string,
  statusCode: HttpStatusCode = HttpStatus.OK,
  extra: Record<string, any> = {}
): void => {
  res.status(statusCode).json({
    success: true,
    ...(message && { message }),
    ...(data !== undefined && { data }),
    ...extra,
  });
};

export const sendError = (
  res: Response,
  message: string = 'An error occurred',
  statusCode: HttpStatusCode = HttpStatus.INTERNAL_SERVER_ERROR,
  extra: Record<string, any> = {}
): void => {
  res.status(statusCode).json({
    success: false,
    message,
    ...extra,
  });
};
