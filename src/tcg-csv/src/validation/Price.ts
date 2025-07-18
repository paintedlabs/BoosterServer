import typia from 'typia';
import * as types from '../types';

export const validatePrice = typia.assert<types.Price>;

export const validatePricesEndpointResponse =
  typia.assert<types.PricesEndpointResponse>;

export const parsePricesEndpointResponse = typia.json
  .assertParse<types.PricesEndpointResponse>;
