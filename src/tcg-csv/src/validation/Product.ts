import typia from 'typia';
import * as types from '../types';

export const validateProduct = typia.assert<types.Product>;

export const validateProductsEndpointResponse =
  typia.assert<types.ProductsEndpointResponse>;

export const parseProductsEndpointResponse = typia.json
  .assertParse<types.ProductsEndpointResponse>;
