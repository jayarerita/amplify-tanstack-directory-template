import type { Handler } from 'aws-lambda';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../data/resource';

export interface ModerationTriggerEvent {
  contentType: 'LISTING' | 'REVIEW';
  contentId: string;
  content: {
    text?: string;
    images?: string[];
  };
  submissionData?: {
    honeypotFields?: Record<string, any>;
    submissionTime?: number;
    userAgent?: string;
    ip?: string;
    email?: string;
    phone?: string;
    website?: string;
  };
  submitterId?: string;
}

export interface ModerationTriggerResult {
  success: boolean;
  moderationQueueId?: string;
  autoApproved?: boolean;
  error?: string;
}

// Initialize clients
const lambdaClient = new LambdaClient({ 
  region: process.env.AWS_REGION || 'us-east-1' 
});

const dataClient = generateClient<Schema>();

export const handler: Handler<ModerationTriggerEvent, ModerationTriggerResult> = async (event) => {
  console.log('Moderation trigger event:', JSON.stringify(event, null, 2));

  try {
    const { contentType, contentId, content, submissionData, submitterId } = event;

    // Step 1: Run spam detection
    const spamResult = await runSpamDetection(submissionData);
    console.log('Spam detection result:', spamResult);

    // Step 2: Run AI content moderation
    const aiModerationResult = await runAIModeration(content);
    console.log('AI moderation result:', aiModerationResult);

    // Step 3: Determine priority and status
    const priority = determinePriority(spamResult, aiModerationResult);
    const requiresHumanReview = shouldRequireHumanReview(spamResult, aiModerationResult);

    // Step 4: Create content snapshot
    const contentSnapshot = await createContentSnapshot(contentType, contentId);

    // Step 5: Create moderation queue entry
    const moderationQueueEntry = await dataClient.models.ModerationQueue.create({
      contentType,
      contentId,
      status: requiresHumanReview ? 'PENDING' : 'APPROVED',
      priority,
      aiFlags: aiModerationResult.flags,
      aiConfidence: aiModerationResult.confidence,
      aiDetails: aiModerationResult.moderationDetails,
      contentSnapshot,
      spamScore: spamResult.score,
      spamIndicators: spamResult.indicators,
      honeypotTriggered: spamResult.honeypotTriggered || false,
      rateLimitTriggered: spamResult.rateLimitTriggered || false,
      submitterId,
      submitterIP: submissionData?.ip,
      submitterUserAgent: submissionData?.userAgent,
      submissionTimestamp: new Date().toISOString(),
    });

    // Step 6: If auto-approved, update the original content status
    if (!requiresHumanReview) {
      await autoApproveContent(contentType, contentId);
      return {
        success: true,
        moderationQueueId: moderationQueueEntry.data?.id,
        autoApproved: true,
      };
    }

    // Step 7: If high priority, send notification to admins
    if (priority === 'HIGH' || priority === 'URGENT') {
      await sendAdminNotification(moderationQueueEntry.data?.id, priority, contentType);
    }

    return {
      success: true,
      moderationQueueId: moderationQueueEntry.data?.id,
      autoApproved: false,
    };

  } catch (error) {
    console.error('Moderation trigger error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
};

async function runSpamDetection(submissionData?: any): Promise<{
  score: number;
  indicators: string[];
  honeypotTriggered: boolean;
  rateLimitTriggered: boolean;
}> {
  // Basic spam detection logic
  const indicators: string[] = [];
  let score = 0;
  let honeypotTriggered = false;
  let rateLimitTriggered = false;

  if (submissionData) {
    // Check honeypot fields
    if (submissionData.honeypotFields) {
      for (const [field, value] of Object.entries(submissionData.honeypotFields)) {
        if (value && value.toString().trim() !== '') {
          indicators.push(`honeypot-${field}`);
          score += 0.8;
          honeypotTriggered = true;
        }
      }
    }

    // Check submission speed
    if (submissionData.submissionTime && submissionData.submissionTime < 3000) {
      indicators.push('submission-too-fast');
      score += 0.6;
    }

    // Check user agent
    if (submissionData.userAgent) {
      const botPatterns = ['bot', 'crawler', 'spider', 'scraper'];
      if (botPatterns.some(pattern => submissionData.userAgent.toLowerCase().includes(pattern))) {
        indicators.push('bot-user-agent');
        score += 0.7;
      }
    }

    // Simple rate limiting check (would be more sophisticated in production)
    if (submissionData.ip) {
      // This is a simplified check - in production, you'd use a proper rate limiting service
      rateLimitTriggered = false; // Placeholder
    }
  }

  return {
    score: Math.min(score, 1),
    indicators,
    honeypotTriggered,
    rateLimitTriggered,
  };
}

async function runAIModeration(content: { text?: string; images?: string[] }): Promise<{
  approved: boolean;
  confidence: number;
  flags: string[];
  requiresHumanReview: boolean;
  moderationDetails?: any;
}> {
  try {
    // Invoke the content moderation Lambda function
    const command = new InvokeCommand({
      FunctionName: process.env.CONTENT_MODERATION_FUNCTION_NAME || 'content-moderation',
      Payload: JSON.stringify({
        type: 'content',
        content,
        id: 'moderation-check',
      }),
    });

    const response = await lambdaClient.send(command);
    
    if (response.Payload) {
      const result = JSON.parse(Buffer.from(response.Payload).toString());
      return result;
    }
  } catch (error) {
    console.error('AI moderation error:', error);
  }

  // Fallback result if AI moderation fails
  return {
    approved: false,
    confidence: 0.5,
    flags: ['ai-moderation-error'],
    requiresHumanReview: true,
  };
}

function determinePriority(
  spamResult: any,
  aiResult: any
): 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' {
  // Urgent: High spam score or honeypot triggered
  if (spamResult.score > 0.8 || spamResult.honeypotTriggered) {
    return 'URGENT';
  }

  // High: AI flagged with high confidence or multiple spam indicators
  if (aiResult.flags.length > 2 || spamResult.indicators.length > 3) {
    return 'HIGH';
  }

  // Medium: Some flags or moderate spam score
  if (aiResult.flags.length > 0 || spamResult.score > 0.3) {
    return 'MEDIUM';
  }

  return 'LOW';
}

function shouldRequireHumanReview(spamResult: any, aiResult: any): boolean {
  // Always require human review for high spam scores or honeypot triggers
  if (spamResult.score > 0.5 || spamResult.honeypotTriggered) {
    return true;
  }

  // Require human review if AI is not confident
  if (aiResult.confidence < 0.8 && aiResult.flags.length > 0) {
    return true;
  }

  // Require human review if AI explicitly recommends it
  if (aiResult.requiresHumanReview) {
    return true;
  }

  return false;
}

async function createContentSnapshot(contentType: string, contentId: string): Promise<any> {
  try {
    if (contentType === 'LISTING') {
      const listing = await dataClient.models.Listing.get({ id: contentId });
      return listing.data;
    } else if (contentType === 'REVIEW') {
      const review = await dataClient.models.Review.get({ id: contentId });
      return review.data;
    }
  } catch (error) {
    console.error('Error creating content snapshot:', error);
  }
  
  return {};
}

async function autoApproveContent(contentType: string, contentId: string): Promise<void> {
  try {
    if (contentType === 'LISTING') {
      await dataClient.models.Listing.update({
        id: contentId,
        status: 'PUBLISHED',
      });
    } else if (contentType === 'REVIEW') {
      await dataClient.models.Review.update({
        id: contentId,
        status: 'APPROVED',
      });
    }
  } catch (error) {
    console.error('Error auto-approving content:', error);
  }
}

async function sendAdminNotification(
  moderationQueueId?: string,
  priority?: string,
  contentType?: string
): Promise<void> {
  // In a real implementation, this would send notifications via SNS, SES, or another service
  console.log(`Admin notification: ${priority} priority ${contentType} requires review (Queue ID: ${moderationQueueId})`);
  
  // TODO: Implement actual notification logic
  // - Send email to admin users
  // - Send SNS notification
  // - Create in-app notification
}