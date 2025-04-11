import * as typiaExtensions from '@extensions/typia';
import * as typia from 'typia';

import * as types from '../types';

export const validatePrice = typiaExtensions.wrapValidate(
  typia.createValidate<types.Price>(),
);

export const validatePricesEndpointResponse = typiaExtensions.wrapValidate(
  typia.createValidate<types.PricesEndpointResponse>(),
);

export const parsePricesEndpointResponse = typiaExtensions.wrapValidateParse(
  typia.json.createValidateParse<types.PricesEndpointResponse>(),
);
