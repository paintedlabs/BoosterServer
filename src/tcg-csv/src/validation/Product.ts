import * as typiaExtensions from '@extensions/typia';
import * as typia from 'typia';

import * as types from '../types';

export const validateProduct = typiaExtensions.wrapValidate(
  typia.createValidate<types.Product>(),
);

export const validateProductsEndpointResponse = typiaExtensions.wrapValidate(
  typia.createValidate<types.ProductsEndpointResponse>(),
);

export const parseProductsEndpointResponse = typiaExtensions.wrapValidateParse(
  typia.json.createValidateParse<types.ProductsEndpointResponse>(),
);
