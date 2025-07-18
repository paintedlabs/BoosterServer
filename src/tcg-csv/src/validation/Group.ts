import typia from 'typia';
import * as types from '../types';

export const validateGroup = typia.assert<types.Group>;

export const validateGroupsEndpointResponse =
  typia.assert<types.GroupsEndpointResponse>;

export const parseGroupsEndpointResponse = typia.json
  .assertParse<types.GroupsEndpointResponse>;
