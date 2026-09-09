import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();

        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let message: any = 'Internal server error';
        let error = 'Internal Server Error';

        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const errorResponse = exception.getResponse();

            if (typeof errorResponse === 'object' && errorResponse !== null) {
                message = (errorResponse as any).message || message;
                error = (errorResponse as any).error || exception.name;
            } else {
                message = errorResponse;
            }
        } else if (exception instanceof Error) {
            message = exception.message;
        }

        // frontend error structure 
        response.status(status).json({
            success: false,
            statusCode: status,
            error: error,
            message: Array.isArray(message) ? message[0] : message, // অ্যারে হলেও প্রথম মেসেজটা নিয়ে নেব
        });
    }
}