import * as typiaExtensions from '@extensions/typia';
import * as typia from 'typia';

import * as types from '../types';

export const validateGroup = typiaExtensions.wrapValidate(
  typia.createValidate<types.Group>(),
);

export const validateGroupsEndpointResponse = typiaExtensions.wrapValidate(
  typia.createValidate<types.GroupsEndpointResponse>(),
);

export const parseGroupsEndpointResponse = typiaExtensions.wrapValidateParse(
  typia.json.createValidateParse<types.GroupsEndpointResponse>(),
);
