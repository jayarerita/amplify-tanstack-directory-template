import type { Handler } from 'aws-lambda';
import { RekognitionClient, DetectModerationLabelsCommand } from '@aws-sdk/client-rekognition';
import { ComprehendClient, DetectSentimentCommand, DetectPiiEntitiesCommand } from '@aws-sdk/client-comprehend';

export interface ContentModerationEvent {
  type: 'listing' | 'review';
  content: {
    text?: string;
    images?: string[];
  };
  id: string;
}

export interface ContentModerationResult {
  approved: boolean;
  confidence: number;
  flags: string[];
  requiresHumanReview: boolean;
  moderationDetails?: {
    textAnalysis?: any;
    imageAnalysis?: any[];
  };
}

// Initialize AWS clients
const rekognitionClient = new RekognitionClient({ 
  region: process.env.REKOGNITION_REGION || 'us-east-1' 
});

const comprehendClient = new ComprehendClient({ 
  region: process.env.COMPREHEND_REGION || 'us-east-1' 
});

export const handler: Handler<ContentModerationEvent, ContentModerationResult> = async (event) => {
  console.log('Content moderation event:', JSON.stringify(event, null, 2));

  try {
    const { type, content, id } = event;
    const flags: string[] = [];
    let confidence = 1.0;
    let approved = true;
    const moderationDetails: any = {};

    // Text analysis with AWS Comprehend
    if (content.text) {
      const textAnalysis = await analyzeText(content.text);
      moderationDetails.textAnalysis = textAnalysis;
      flags.push(...textAnalysis.flags);
      
      if (textAnalysis.flags.length > 0) {
        approved = false;
        confidence = Math.min(confidence, textAnalysis.confidence);
      }
    }

    // Image analysis with AWS Rekognition
    if (content.images && content.images.length > 0) {
      const imageAnalysis = await analyzeImages(content.images);
      moderationDetails.imageAnalysis = imageAnalysis;
      
      for (const analysis of imageAnalysis) {
        flags.push(...analysis.flags);
        if (analysis.flags.length > 0) {
          approved = false;
          confidence = Math.min(confidence, analysis.confidence);
        }
      }
    }

    // Determine if human review is required
    const requiresHumanReview = !approved && confidence < 0.8;

    return {
      approved,
      confidence,
      flags,
      requiresHumanReview,
      moderationDetails,
    };
  } catch (error) {
    console.error('Content moderation error:', error);
    
    // Default to requiring human review on error
    return {
      approved: false,
      confidence: 0.0,
      flags: ['error-occurred'],
      requiresHumanReview: true,
    };
  }
};

async function analyzeText(text: string): Promise<{ flags: string[]; confidence: number; details: any }> {
  const flags: string[] = [];
  let confidence = 1.0;
  const details: any = {};
  
  try {
    // Basic keyword detection
    const spamKeywords = ['spam', 'scam', 'fake', 'fraud', 'click here', 'buy now', 'limited time'];
    const inappropriateKeywords = ['hate', 'offensive', 'discriminatory'];
    
    const lowerText = text.toLowerCase();
    
    for (const keyword of spamKeywords) {
      if (lowerText.includes(keyword)) {
        flags.push(`spam-keyword-${keyword}`);
        confidence = Math.min(confidence, 0.6);
      }
    }
    
    for (const keyword of inappropriateKeywords) {
      if (lowerText.includes(keyword)) {
        flags.push(`inappropriate-keyword-${keyword}`);
        confidence = Math.min(confidence, 0.5);
      }
    }

    // AWS Comprehend sentiment analysis
    try {
      const sentimentCommand = new DetectSentimentCommand({
        Text: text,
        LanguageCode: 'en'
      });
      
      const sentimentResponse = await comprehendClient.send(sentimentCommand);
      details.sentiment = sentimentResponse;
      
      // Flag very negative sentiment
      if (sentimentResponse.Sentiment === 'NEGATIVE' && 
          sentimentResponse.SentimentScore?.Negative && 
          sentimentResponse.SentimentScore.Negative > 0.8) {
        flags.push('high-negative-sentiment');
        confidence = Math.min(confidence, 0.7);
      }
    } catch (error) {
      console.warn('Sentiment analysis failed:', error);
    }

    // AWS Comprehend PII detection
    try {
      const piiCommand = new DetectPiiEntitiesCommand({
        Text: text,
        LanguageCode: 'en'
      });
      
      const piiResponse = await comprehendClient.send(piiCommand);
      details.pii = piiResponse;
      
      // Flag if PII is detected
      if (piiResponse.Entities && piiResponse.Entities.length > 0) {
        for (const entity of piiResponse.Entities) {
          if (entity.Type && ['EMAIL', 'PHONE', 'SSN', 'CREDIT_DEBIT_NUMBER'].includes(entity.Type)) {
            flags.push(`pii-detected-${entity.Type.toLowerCase()}`);
            confidence = Math.min(confidence, 0.8);
          }
        }
      }
    } catch (error) {
      console.warn('PII detection failed:', error);
    }

    // Check for excessive capitalization (spam indicator)
    const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
    if (capsRatio > 0.5 && text.length > 20) {
      flags.push('excessive-capitalization');
      confidence = Math.min(confidence, 0.7);
    }

    // Check for repeated characters (spam indicator)
    if (/(.)\1{4,}/.test(text)) {
      flags.push('repeated-characters');
      confidence = Math.min(confidence, 0.6);
    }

  } catch (error) {
    console.error('Text analysis error:', error);
    flags.push('text-analysis-error');
    confidence = 0.5;
  }
  
  return { flags, confidence, details };
}

async function analyzeImages(imageUrls: string[]): Promise<Array<{ url: string; flags: string[]; confidence: number; details: any }>> {
  const results = [];
  
  for (const url of imageUrls) {
    const flags: string[] = [];
    let confidence = 1.0;
    const details: any = {};
    
    try {
      if (!url || url.trim() === '') {
        flags.push('invalid-image-url');
        confidence = 0.0;
        results.push({ url, flags, confidence, details });
        continue;
      }

      // Extract S3 bucket and key from URL
      const s3UrlMatch = url.match(/https:\/\/([^.]+)\.s3\.([^.]+)\.amazonaws\.com\/(.+)/);
      if (!s3UrlMatch) {
        flags.push('invalid-s3-url');
        confidence = 0.5;
        results.push({ url, flags, confidence, details });
        continue;
      }

      const [, bucket, region, key] = s3UrlMatch;

      // AWS Rekognition content moderation
      try {
        const moderationCommand = new DetectModerationLabelsCommand({
          Image: {
            S3Object: {
              Bucket: bucket,
              Name: decodeURIComponent(key)
            }
          },
          MinConfidence: 50 // Minimum confidence threshold
        });

        const moderationResponse = await rekognitionClient.send(moderationCommand);
        details.moderation = moderationResponse;

        if (moderationResponse.ModerationLabels && moderationResponse.ModerationLabels.length > 0) {
          for (const label of moderationResponse.ModerationLabels) {
            if (label.Name && label.Confidence) {
              // Flag high-confidence inappropriate content
              if (label.Confidence > 80) {
                flags.push(`inappropriate-content-${label.Name.toLowerCase().replace(/\s+/g, '-')}`);
                confidence = Math.min(confidence, 0.3);
              } else if (label.Confidence > 60) {
                flags.push(`potential-inappropriate-content-${label.Name.toLowerCase().replace(/\s+/g, '-')}`);
                confidence = Math.min(confidence, 0.6);
              }
            }
          }
        }
      } catch (error) {
        console.warn(`Rekognition moderation failed for ${url}:`, error);
        flags.push('rekognition-moderation-error');
        confidence = Math.min(confidence, 0.7);
      }

      // Additional checks for image quality and validity
      try {
        // Check if image is accessible (basic validation)
        const response = await fetch(url, { method: 'HEAD' });
        if (!response.ok) {
          flags.push('image-not-accessible');
          confidence = Math.min(confidence, 0.5);
        } else {
          const contentType = response.headers.get('content-type');
          if (!contentType || !contentType.startsWith('image/')) {
            flags.push('invalid-image-type');
            confidence = Math.min(confidence, 0.4);
          }
        }
      } catch (error) {
        console.warn(`Image accessibility check failed for ${url}:`, error);
        flags.push('image-accessibility-error');
        confidence = Math.min(confidence, 0.6);
      }

    } catch (error) {
      console.error(`Image analysis error for ${url}:`, error);
      flags.push('image-analysis-error');
      confidence = 0.5;
    }
    
    results.push({ url, flags, confidence, details });
  }
  
  return results;
}