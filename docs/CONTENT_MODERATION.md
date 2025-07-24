# Content Moderation Pipeline

This document describes the comprehensive content moderation system implemented in the directory template, designed to automatically detect and filter spam, inappropriate content, and bot submissions while maintaining a smooth user experience.

## Overview

The content moderation pipeline consists of multiple layers of protection:

1. **Client-side Spam Detection** - Initial filtering using honeypot fields and basic pattern matching
2. **Server-side AI Analysis** - AWS Rekognition and Comprehend for advanced content analysis
3. **Human Moderation Queue** - Admin interface for reviewing flagged content
4. **Rate Limiting** - Protection against rapid-fire submissions
5. **WAF Protection** - Network-level bot and attack protection

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Client-side   │    │   Server-side    │    │   Admin Panel   │
│   Detection     │───▶│   AI Analysis    │───▶│   Human Review  │
│                 │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
│                      │                      │
├─ Honeypot Fields    ├─ AWS Rekognition    ├─ Moderation Queue
├─ Rate Limiting      ├─ AWS Comprehend     ├─ Bulk Actions
├─ Basic Patterns     ├─ Spam Scoring       ├─ Priority System
└─ Form Validation    └─ Auto-approval      └─ Escalation
```

## Components

### 1. Client-side Spam Detection

#### Honeypot Fields
Hidden form fields that should never be filled by real users:

```typescript
export const HONEYPOT_FIELDS = {
  email_confirm: '',     // Fake email confirmation
  website_url: '',       // Different from real website field
  company_name: '',      // Different from real name field
  phone_number: '',      // Different from real phone field
  message_body: '',      // Different from real message field
};
```

**Implementation:**
- Fields are hidden with `display: none` and `aria-hidden="true"`
- Have `tabIndex={-1}` and `autoComplete="off"`
- Any content in these fields indicates bot activity

#### Submission Speed Detection
Tracks form completion time to detect automated submissions:

```typescript
const submissionTime = Date.now() - submissionStartTime;
if (submissionTime < 3000) { // Less than 3 seconds
  indicators.push('submission-too-fast');
  score += 0.6;
}
```

#### Pattern-based Detection
Analyzes content for common spam patterns:

- **Excessive capitalization** - More than 50% caps in text over 20 characters
- **Repeated characters** - Patterns like "aaaaaaa" or "!!!!!!"
- **Spam keywords** - "buy now", "limited time", "guaranteed", etc.
- **Multiple URLs** - More than 2 URLs in submission
- **Suspicious email domains** - Temporary email services
- **Bot user agents** - Known crawler/bot patterns

### 2. Server-side AI Analysis

#### AWS Rekognition (Image Analysis)
Automatically scans uploaded images for inappropriate content:

```typescript
const moderationCommand = new DetectModerationLabelsCommand({
  Image: {
    S3Object: {
      Bucket: bucket,
      Name: key
    }
  },
  MinConfidence: 50
});
```

**Detected Categories:**
- Explicit content
- Violence
- Hate symbols
- Drugs and alcohol
- Weapons
- Self-harm

#### AWS Comprehend (Text Analysis)
Analyzes text content for various issues:

```typescript
// Sentiment analysis
const sentimentCommand = new DetectSentimentCommand({
  Text: text,
  LanguageCode: 'en'
});

// PII detection
const piiCommand = new DetectPiiEntitiesCommand({
  Text: text,
  LanguageCode: 'en'
});
```

**Analysis Types:**
- **Sentiment Analysis** - Flags extremely negative content
- **PII Detection** - Identifies personal information leaks
- **Language Detection** - Ensures content is in expected language
- **Key Phrase Extraction** - Identifies suspicious phrases

### 3. Moderation Queue System

#### Priority Levels
Content is automatically prioritized based on risk:

- **URGENT** - Honeypot triggered or spam score > 0.8
- **HIGH** - Multiple AI flags or many spam indicators
- **MEDIUM** - Some flags or moderate spam score
- **LOW** - Clean content requiring routine review

#### Queue Management
Admins can:
- Filter by status, content type, and priority
- Bulk approve/reject/escalate items
- Add moderation notes
- View detailed AI analysis results
- Track moderation history

#### Auto-approval Logic
Content is automatically approved if:
- Spam score < 0.5
- No honeypot violations
- AI confidence > 0.8
- No high-risk flags

### 4. Rate Limiting

#### Implementation Levels
1. **Client-side** - Basic tracking in memory
2. **Server-side** - Persistent rate limiting
3. **WAF-level** - Network protection

#### Rate Limits
- **Listing Submissions** - 3 per hour per IP/user
- **Review Submissions** - 10 per 15 minutes per user
- **Contact Forms** - 5 per 15 minutes per IP

#### Tracking Methods
- IP address
- User ID (if authenticated)
- Email address
- User agent fingerprint

### 5. WAF Protection

#### Managed Rule Groups
- **AWS Core Rule Set** - Basic web attack protection
- **Known Bad Inputs** - Common attack patterns
- **Bot Control** - Automated traffic detection

#### Custom Rules
- **Form Submission Protection** - Rate limiting on submission endpoints
- **Geo-blocking** - Block high-risk countries (optional)
- **IP Reputation** - Block known malicious IPs

## Configuration

### Environment Variables

```bash
# AI Services
REKOGNITION_REGION=us-east-1
COMPREHEND_REGION=us-east-1

# WAF Configuration
WAF_REGION=us-east-1

# Function Names
CONTENT_MODERATION_FUNCTION_NAME=content-moderation
MODERATION_TRIGGER_FUNCTION_NAME=moderation-trigger
WAF_PROTECTION_FUNCTION_NAME=waf-protection
```

### Spam Detection Thresholds

```typescript
const SPAM_THRESHOLDS = {
  AUTO_REJECT: 0.8,        // Immediately reject
  REQUIRE_REVIEW: 0.5,     // Send to human review
  AUTO_APPROVE: 0.3,       // Automatically approve
};

const AI_CONFIDENCE_THRESHOLD = 0.8; // Minimum for auto-approval
```

## Usage

### Integrating with Forms

```typescript
import { HoneypotFields, useHoneypotFields } from '~/components/HoneypotFields';
import { detectSpam } from '~/utils/spam-detection';
import { triggerContentModeration } from '~/lib/server-functions';

function MyForm() {
  const { honeypotValues, updateHoneypotField, hasHoneypotViolation } = useHoneypotFields();
  const [submissionStartTime] = useState(Date.now());

  const handleSubmit = async (formData) => {
    // Check honeypot
    if (hasHoneypotViolation()) {
      return; // Silently reject
    }

    // Run spam detection
    const spamResult = detectSpam({
      text: formData.description,
      email: formData.email,
      honeypotFields: honeypotValues,
      submissionTime: Date.now() - submissionStartTime,
      userAgent: navigator.userAgent,
    });

    if (spamResult.isSpam && spamResult.score > 0.8) {
      setError('Content flagged as spam');
      return;
    }

    // Submit and trigger moderation
    const result = await submitContent(formData);
    if (result.id) {
      await triggerContentModeration({
        contentType: 'LISTING',
        contentId: result.id,
        content: {
          text: formData.description,
          images: formData.images,
        },
        submissionData: {
          honeypotFields: honeypotValues,
          submissionTime: Date.now() - submissionStartTime,
          userAgent: navigator.userAgent,
        },
      });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <HoneypotFields values={honeypotValues} onChange={updateHoneypotField} />
      {/* Regular form fields */}
    </form>
  );
}
```

### Admin Moderation Interface

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';

function ModerationQueue() {
  const { data: items } = useQuery({
    queryKey: ['moderationQueue'],
    queryFn: () => client.models.ModerationQueue.list(),
  });

  const moderationMutation = useMutation({
    mutationFn: ({ itemId, decision, notes }) => 
      client.models.ModerationQueue.update({
        id: itemId,
        status: decision,
        moderationNotes: notes,
      }),
  });

  return (
    <div>
      {items?.map(item => (
        <ModerationItem 
          key={item.id}
          item={item}
          onDecision={moderationMutation.mutate}
        />
      ))}
    </div>
  );
}
```

## Monitoring and Analytics

### Key Metrics
- **Spam Detection Rate** - Percentage of submissions flagged
- **False Positive Rate** - Legitimate content incorrectly flagged
- **Auto-approval Rate** - Content approved without human review
- **Average Review Time** - Time from submission to decision
- **Moderator Workload** - Items per moderator per day

### Logging
All moderation decisions are logged with:
- Timestamp
- Content ID and type
- AI analysis results
- Spam scores and indicators
- Moderator ID and decision
- Processing time

### Alerts
Automated alerts for:
- Spam detection rate spikes
- High-priority content requiring urgent review
- System errors in AI analysis
- Rate limiting threshold breaches

## Security Considerations

### Data Privacy
- PII detected by Comprehend is flagged but not stored
- User IP addresses are hashed for rate limiting
- Moderation logs exclude sensitive personal data

### Access Control
- Moderation interface restricted to admin users
- Bulk actions require additional permissions
- All moderation actions are audited

### Performance
- AI analysis runs asynchronously to avoid blocking submissions
- Results are cached to prevent duplicate analysis
- Rate limiting uses efficient in-memory stores with persistence

## Troubleshooting

### Common Issues

#### High False Positive Rate
- Adjust spam detection thresholds
- Review and update keyword lists
- Retrain AI models with feedback data

#### Slow Moderation Queue
- Increase auto-approval thresholds
- Add more moderators
- Implement bulk action workflows

#### Bot Bypass Attempts
- Update honeypot field names
- Implement additional behavioral analysis
- Enhance WAF rules

### Debugging Tools

#### Spam Detection Testing
```typescript
// Test spam detection with sample data
const testResult = detectSpam({
  text: 'Sample content to test',
  email: 'test@example.com',
});
console.log('Spam analysis:', testResult);
```

#### AI Analysis Testing
```typescript
// Test AI moderation directly
const aiResult = await invokeContentModeration({
  type: 'listing',
  content: { text: 'Sample text', images: ['image-url'] },
});
console.log('AI analysis:', aiResult);
```

## Best Practices

### For Developers
1. Always implement honeypot fields in forms
2. Use server-side validation in addition to client-side
3. Log all moderation decisions for analysis
4. Implement graceful degradation if AI services fail
5. Test with various spam patterns regularly

### For Administrators
1. Review moderation queue daily
2. Provide feedback on false positives/negatives
3. Update spam keywords based on trends
4. Monitor system performance metrics
5. Train moderators on consistent decision-making

### For Content Creators
1. Avoid excessive capitalization and punctuation
2. Use professional language and tone
3. Include complete, accurate information
4. Avoid suspicious links or promotional language
5. Be patient during the review process

## Future Enhancements

### Planned Features
- Machine learning model training with feedback data
- Advanced behavioral analysis
- Integration with external threat intelligence
- Real-time collaboration tools for moderators
- Automated appeals process

### Scalability Improvements
- Distributed rate limiting with Redis
- Multi-region AI service deployment
- Automated moderator assignment
- Performance optimization for high-volume sites

This content moderation system provides comprehensive protection while maintaining usability and can be customized based on specific requirements and risk tolerance.