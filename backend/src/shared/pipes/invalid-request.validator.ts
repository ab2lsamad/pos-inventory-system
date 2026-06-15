import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { InvalidRequestException } from '../errors';

@Injectable()
export class InvalidRequestValidator implements PipeTransform<any> {
  public async transform(value: any, metadata: ArgumentMetadata) {
    const { metatype } = metadata;

    if (metadata.type === 'param' && typeof value === 'string') {
      return value;
    }

    if (!metatype || !value) {
      return value;
    }

    const primitiveTypes: unknown[] = [String, Boolean, Number, Array, Object];
    if (primitiveTypes.includes(metatype)) {
      return value;
    }

    const object = plainToClass(metatype, value, {
      excludeExtraneousValues: false,
    });
    let errors;

    try {
      errors = await validate(object);
    } catch (err) {
      console.log(
        'InvalidRequestException could not validate request:',
        JSON.stringify(object, null, 2),
      );
      console.error(err);

      throw new InvalidRequestException([]);
    }

    if (errors.length > 0) {
      console.log('InvalidRequestException: ', JSON.stringify(errors, null, 2));

      throw new InvalidRequestException(errors);
    }

    Object.keys(object).forEach((key) => {
      if (object[key] == null) {
        delete object[key];
      }
    });

    return object;
  }
}
