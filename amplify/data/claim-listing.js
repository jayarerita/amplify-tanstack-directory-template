import { util } from '@aws-appsync/utils';

/**
 * Custom resolver for claiming listings
 * Associates an unauthenticated listing with an authenticated user
 */
export function request(ctx) {
  const { listingId, verificationData } = ctx.arguments;
  const { identity } = ctx;
  
  if (!identity || !identity.sub) {
    util.error('Authentication required', 'Unauthorized');
  }
  
  const now = util.time.nowISO8601();
  
  // Update the listing to associate it with the authenticated user
  const updateExpression = 'SET ownerId = :userId, #updatedAt = :updatedAt, #version = #version + :versionIncrement';
  const expressionAttributeNames = {
    '#updatedAt': 'updatedAt',
    '#version': 'version',
  };
  const expressionAttributeValues = util.dynamodb.toMapValues({
    ':userId': identity.sub,
    ':updatedAt': now,
    ':versionIncrement': 1,
  });
  
  // Condition: listing must not already have an owner
  const conditionExpression = 'attribute_not_exists(ownerId) OR ownerId = :nullValue';
  const conditionAttributeValues = util.dynamodb.toMapValues({
    ':nullValue': null,
  });
  
  return {
    operation: 'UpdateItem',
    key: util.dynamodb.toMapValues({ id: listingId }),
    update: {
      expression: updateExpression,
      expressionAttributeNames,
      expressionAttributeValues,
    },
    condition: {
      expression: conditionExpression,
      expressionAttributeValues: conditionAttributeValues,
    },
  };
}

export function response(ctx) {
  if (ctx.error) {
    if (ctx.error.type === 'ConditionalCheckFailedException') {
      util.error('This listing has already been claimed', 'ConflictException');
    }
    util.error(ctx.error.message, ctx.error.type);
  }
  
  // Return the updated listing
  return ctx.result;
}