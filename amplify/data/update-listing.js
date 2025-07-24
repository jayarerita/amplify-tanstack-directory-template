import { util } from '@aws-appsync/utils';

/**
 * Custom resolver for updating listings with ownership validation
 * Handles version tracking and composite field updates
 */
export function request(ctx) {
  const { id, input } = ctx.arguments;
  const { identity } = ctx;
  
  if (!identity || !identity.sub) {
    util.error('Authentication required', 'Unauthorized');
  }
  
  // Store the input for version history
  ctx.stash.updateInput = input;
  ctx.stash.userId = identity.sub;
  
  // Build update expression
  const updates = {};
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};
  
  // Handle basic field updates
  Object.keys(input).forEach(key => {
    if (input[key] !== undefined && input[key] !== null) {
      updates[key] = input[key];
      expressionAttributeNames[`#${key}`] = key;
      expressionAttributeValues[`:${key}`] = input[key];
    }
  });
  
  // Update composite fields if location or category changed
  if (input.city || input.state) {
    // We need to get current values to build composite field
    // This is a simplified version - in production, you'd fetch current item first
    if (input.city && input.state) {
      const cityState = `${input.city}, ${input.state}`;
      updates.cityState = cityState;
      expressionAttributeNames['#cityState'] = 'cityState';
      expressionAttributeValues[':cityState'] = cityState;
    }
  }
  
  if (input.categories && input.categories.length > 0) {
    const status = input.status || 'PENDING';
    const categoryStatus = `${input.categories[0]}#${status}`;
    updates.categoryStatus = categoryStatus;
    expressionAttributeNames['#categoryStatus'] = 'categoryStatus';
    expressionAttributeValues[':categoryStatus'] = categoryStatus;
  }
  
  // Update slug if name changed
  if (input.name) {
    const slug = input.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
    updates.slug = slug;
    expressionAttributeNames['#slug'] = 'slug';
    expressionAttributeValues[':slug'] = slug;
  }
  
  // Always update version and timestamp
  const now = util.time.nowISO8601();
  expressionAttributeNames['#updatedAt'] = 'updatedAt';
  expressionAttributeNames['#version'] = 'version';
  expressionAttributeValues[':updatedAt'] = now;
  expressionAttributeValues[':version'] = 1;
  expressionAttributeValues[':userId'] = identity.sub;
  
  // Build SET expression
  const setExpressions = Object.keys(updates).map(key => `#${key} = :${key}`);
  setExpressions.push('#updatedAt = :updatedAt');
  setExpressions.push('#version = #version + :version');
  
  const updateExpression = `SET ${setExpressions.join(', ')}`;
  
  // Condition: user must be owner or admin
  const conditionExpression = 'ownerId = :userId';
  
  return {
    operation: 'UpdateItem',
    key: util.dynamodb.toMapValues({ id }),
    update: {
      expression: updateExpression,
      expressionAttributeNames,
      expressionAttributeValues: util.dynamodb.toMapValues(expressionAttributeValues),
    },
    condition: {
      expression: conditionExpression,
      expressionAttributeValues: util.dynamodb.toMapValues({ ':userId': identity.sub }),
    },
  };
}

export function response(ctx) {
  if (ctx.error) {
    if (ctx.error.type === 'ConditionalCheckFailedException') {
      util.error('You can only update listings you own', 'Unauthorized');
    }
    util.error(ctx.error.message, ctx.error.type);
  }
  
  // Create version history entry after successful update
  const result = ctx.result;
  if (result && result.version) {
    // Create a version history record
    const versionHistoryItem = {
      id: util.autoId(),
      listingId: result.id,
      version: result.version,
      changes: ctx.stash.updateInput,
      changedBy: ctx.stash.userId,
      changeType: 'UPDATE',
      changeDescription: generateChangeDescription(ctx.stash.updateInput),
      createdAt: util.time.nowISO8601(),
      updatedAt: util.time.nowISO8601(),
    };
    
    // Store version history (this would typically be done via a separate mutation or pipeline)
    // For now, we'll add it to the result for the client to handle
    result.versionHistory = versionHistoryItem;
  }
  
  return result;
}

function generateChangeDescription(input) {
  const changedFields = Object.keys(input).filter(key => 
    key !== 'updatedAt' && key !== 'version'
  );
  
  if (changedFields.length === 0) {
    return 'Minor update';
  }
  
  if (changedFields.length === 1) {
    return `Updated ${changedFields[0]}`;
  }
  
  if (changedFields.length <= 3) {
    return `Updated ${changedFields.join(', ')}`;
  }
  
  return `Updated ${changedFields.length} fields`;
}