import type { Handler } from 'aws-lambda';
import { 
  WAFV2Client, 
  CreateWebACLCommand, 
  CreateRuleGroupCommand,
  GetWebACLCommand,
  UpdateWebACLCommand,
  Rule,
  RuleAction,
  Statement,
  RateBasedStatement,
  ManagedRuleGroupStatement,
  IPSetReferenceStatement
} from '@aws-sdk/client-wafv2';

export interface WAFProtectionEvent {
  action: 'create' | 'update' | 'get';
  webAclName?: string;
  scope?: 'CLOUDFRONT' | 'REGIONAL';
}

export interface WAFProtectionResult {
  success: boolean;
  webAclArn?: string;
  webAclId?: string;
  message?: string;
  error?: string;
}

// Initialize AWS WAF client
const wafClient = new WAFV2Client({ 
  region: process.env.WAF_REGION || 'us-east-1' 
});

export const handler: Handler<WAFProtectionEvent, WAFProtectionResult> = async (event) => {
  console.log('WAF Protection event:', JSON.stringify(event, null, 2));

  try {
    const { action, webAclName = 'DirectoryTemplateWAF', scope = 'CLOUDFRONT' } = event;

    switch (action) {
      case 'create':
        return await createWebACL(webAclName, scope);
      case 'update':
        return await updateWebACL(webAclName, scope);
      case 'get':
        return await getWebACL(webAclName, scope);
      default:
        return {
          success: false,
          error: 'Invalid action specified'
        };
    }
  } catch (error) {
    console.error('WAF Protection error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

async function createWebACL(name: string, scope: 'CLOUDFRONT' | 'REGIONAL'): Promise<WAFProtectionResult> {
  try {
    // Define WAF rules for bot protection
    const rules: Rule[] = [
      // Rate limiting rule - 100 requests per 5 minutes per IP
      {
        Name: 'RateLimitRule',
        Priority: 1,
        Statement: {
          RateBasedStatement: {
            Limit: 100,
            AggregateKeyType: 'IP',
            ScopeDownStatement: {
              NotStatement: {
                Statement: {
                  IPSetReferenceStatement: {
                    ARN: '', // Would need to create IP set for whitelisted IPs
                  } as IPSetReferenceStatement
                }
              }
            }
          } as RateBasedStatement
        },
        Action: {
          Block: {}
        } as RuleAction,
        VisibilityConfig: {
          SampledRequestsEnabled: true,
          CloudWatchMetricsEnabled: true,
          MetricName: 'RateLimitRule'
        }
      },

      // AWS Managed Rules - Core Rule Set
      {
        Name: 'AWSManagedRulesCommonRuleSet',
        Priority: 2,
        OverrideAction: {
          None: {}
        },
        Statement: {
          ManagedRuleGroupStatement: {
            VendorName: 'AWS',
            Name: 'AWSManagedRulesCommonRuleSet',
            ExcludedRules: []
          } as ManagedRuleGroupStatement
        },
        VisibilityConfig: {
          SampledRequestsEnabled: true,
          CloudWatchMetricsEnabled: true,
          MetricName: 'CommonRuleSetMetric'
        }
      },

      // AWS Managed Rules - Known Bad Inputs
      {
        Name: 'AWSManagedRulesKnownBadInputsRuleSet',
        Priority: 3,
        OverrideAction: {
          None: {}
        },
        Statement: {
          ManagedRuleGroupStatement: {
            VendorName: 'AWS',
            Name: 'AWSManagedRulesKnownBadInputsRuleSet',
            ExcludedRules: []
          } as ManagedRuleGroupStatement
        },
        VisibilityConfig: {
          SampledRequestsEnabled: true,
          CloudWatchMetricsEnabled: true,
          MetricName: 'KnownBadInputsRuleSetMetric'
        }
      },

      // AWS Managed Rules - Bot Control
      {
        Name: 'AWSManagedRulesBotControlRuleSet',
        Priority: 4,
        OverrideAction: {
          None: {}
        },
        Statement: {
          ManagedRuleGroupStatement: {
            VendorName: 'AWS',
            Name: 'AWSManagedRulesBotControlRuleSet',
            ExcludedRules: []
          } as ManagedRuleGroupStatement
        },
        VisibilityConfig: {
          SampledRequestsEnabled: true,
          CloudWatchMetricsEnabled: true,
          MetricName: 'BotControlRuleSetMetric'
        }
      },

      // Custom rule for form submission protection
      {
        Name: 'FormSubmissionProtection',
        Priority: 5,
        Statement: {
          AndStatement: {
            Statements: [
              {
                ByteMatchStatement: {
                  SearchString: Buffer.from('/listings/submit'),
                  FieldToMatch: {
                    UriPath: {}
                  },
                  TextTransformations: [
                    {
                      Priority: 0,
                      Type: 'URL_DECODE'
                    }
                  ],
                  PositionalConstraint: 'CONTAINS'
                }
              },
              {
                RateBasedStatement: {
                  Limit: 10, // 10 form submissions per 5 minutes
                  AggregateKeyType: 'IP'
                } as RateBasedStatement
              }
            ]
          }
        },
        Action: {
          Block: {}
        } as RuleAction,
        VisibilityConfig: {
          SampledRequestsEnabled: true,
          CloudWatchMetricsEnabled: true,
          MetricName: 'FormSubmissionProtection'
        }
      },

      // Geo-blocking rule (optional - block specific countries known for spam)
      {
        Name: 'GeoBlockingRule',
        Priority: 6,
        Statement: {
          GeoMatchStatement: {
            CountryCodes: ['CN', 'RU'] // Example: Block China and Russia
          }
        },
        Action: {
          Block: {}
        } as RuleAction,
        VisibilityConfig: {
          SampledRequestsEnabled: true,
          CloudWatchMetricsEnabled: true,
          MetricName: 'GeoBlockingRule'
        }
      }
    ];

    const command = new CreateWebACLCommand({
      Name: name,
      Scope: scope,
      DefaultAction: {
        Allow: {}
      },
      Rules: rules,
      Description: 'WAF rules for directory template bot protection',
      VisibilityConfig: {
        SampledRequestsEnabled: true,
        CloudWatchMetricsEnabled: true,
        MetricName: `${name}Metric`
      }
    });

    const response = await wafClient.send(command);

    return {
      success: true,
      webAclArn: response.Summary?.ARN,
      webAclId: response.Summary?.Id,
      message: 'Web ACL created successfully'
    };

  } catch (error) {
    console.error('Error creating Web ACL:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create Web ACL'
    };
  }
}

async function updateWebACL(name: string, scope: 'CLOUDFRONT' | 'REGIONAL'): Promise<WAFProtectionResult> {
  try {
    // First get the current Web ACL
    const getCommand = new GetWebACLCommand({
      Name: name,
      Scope: scope,
      Id: '' // Would need to store/retrieve the ID
    });

    const currentWebACL = await wafClient.send(getCommand);

    if (!currentWebACL.WebACL) {
      return {
        success: false,
        error: 'Web ACL not found'
      };
    }

    // Update with new rules or modifications
    const updateCommand = new UpdateWebACLCommand({
      Name: name,
      Scope: scope,
      Id: currentWebACL.WebACL.Id!,
      DefaultAction: currentWebACL.WebACL.DefaultAction,
      Rules: currentWebACL.WebACL.Rules, // Could modify rules here
      Description: currentWebACL.WebACL.Description,
      VisibilityConfig: currentWebACL.WebACL.VisibilityConfig!,
      LockToken: currentWebACL.LockToken!
    });

    const response = await wafClient.send(updateCommand);

    return {
      success: true,
      message: 'Web ACL updated successfully'
    };

  } catch (error) {
    console.error('Error updating Web ACL:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update Web ACL'
    };
  }
}

async function getWebACL(name: string, scope: 'CLOUDFRONT' | 'REGIONAL'): Promise<WAFProtectionResult> {
  try {
    const command = new GetWebACLCommand({
      Name: name,
      Scope: scope,
      Id: '' // Would need to store/retrieve the ID
    });

    const response = await wafClient.send(command);

    return {
      success: true,
      webAclArn: response.WebACL?.ARN,
      webAclId: response.WebACL?.Id,
      message: 'Web ACL retrieved successfully'
    };

  } catch (error) {
    console.error('Error getting Web ACL:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get Web ACL'
    };
  }
}

// Helper function to create IP set for whitelisted IPs
async function createIPSet(name: string, scope: 'CLOUDFRONT' | 'REGIONAL', addresses: string[]) {
  // Implementation would create an IP set for whitelisted addresses
  // This is a placeholder for the actual implementation
  console.log(`Creating IP set ${name} with addresses:`, addresses);
}