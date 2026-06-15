import { HttpStatus, HttpException } from '@nestjs/common';
import { compact, map, flatten, flattenDeep } from 'lodash';
import { ValidationError } from 'class-validator';

class ValidationErrorResponse {
  public readonly path: string;
  public readonly value: any;
  public readonly constraints: any;
}

export class InvalidRequestException extends HttpException {
  private static walk(
    root: string,
    error: ValidationError,
  ): Array<ValidationErrorResponse> {
    const path = compact([root, error.property]).join('.');

    if (!error.children || error.children.length === 0) {
      return [{ path, constraints: error.constraints, value: error.value }];
    }

    return flatten(
      map(error.children, (child) => InvalidRequestException.walk(path, child)),
    );
  }

  constructor(errors: Array<ValidationError>) {
    const validationErrors = flattenDeep(
      errors.map((error) => InvalidRequestException.walk('', error)),
    );

    const response = {
      message: 'Validation errors',
      errors: validationErrors,
    };

    super(response, HttpStatus.BAD_REQUEST);
  }
}
