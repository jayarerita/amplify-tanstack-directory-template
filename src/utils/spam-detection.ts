// Spam detection utilities
export interface SpamDetectionResult {
  isSpam: boolean;
  score: number; // 0-1, higher = more likely spam
  indicators: string[];
}

export interface SubmissionData {
  text?: string;
  email?: string;
  phone?: string;
  website?: string;
  honeypotFields?: Record<string, any>;
  submissionTime?: number;
  userAgent?: string;
  ip?: string;
}

// Honeypot field names (should be hidden from users)
export const HONEYPOT_FIELDS = {
  email_confirm: '', // Should always be empty
  website_url: '', // Different from actual website field
  company_name: '', // Different from actual name field
  phone_number: '', // Different from actual phone field
  message_body: '', // Different from actual message field
};

export function detectSpam(data: SubmissionData): SpamDetectionResult {
  const indicators: string[] = [];
  let score = 0;

  // Check honeypot fields
  if (data.honeypotFields) {
    for (const [field, value] of Object.entries(data.honeypotFields)) {
      if (value && value.toString().trim() !== '') {
        indicators.push(`honeypot-${field}`);
        score += 0.8; // High spam indicator
      }
    }
  }

  // Check submission speed (too fast = likely bot)
  if (data.submissionTime && data.submissionTime < 3000) { // Less than 3 seconds
    indicators.push('submission-too-fast');
    score += 0.6;
  }

  // Text-based spam detection
  if (data.text) {
    const textScore = analyzeTextForSpam(data.text);
    score += textScore.score;
    indicators.push(...textScore.indicators);
  }

  // Email pattern analysis
  if (data.email) {
    const emailScore = analyzeEmailForSpam(data.email);
    score += emailScore.score;
    indicators.push(...emailScore.indicators);
  }

  // Phone pattern analysis
  if (data.phone) {
    const phoneScore = analyzePhoneForSpam(data.phone);
    score += phoneScore.score;
    indicators.push(...phoneScore.indicators);
  }

  // Website/URL analysis
  if (data.website) {
    const urlScore = analyzeUrlForSpam(data.website);
    score += urlScore.score;
    indicators.push(...urlScore.indicators);
  }

  // User agent analysis
  if (data.userAgent) {
    const uaScore = analyzeUserAgentForSpam(data.userAgent);
    score += uaScore.score;
    indicators.push(...uaScore.indicators);
  }

  // Normalize score to 0-1 range
  score = Math.min(score, 1);

  return {
    isSpam: score > 0.5,
    score,
    indicators,
  };
}

function analyzeTextForSpam(text: string): { score: number; indicators: string[] } {
  const indicators: string[] = [];
  let score = 0;

  const lowerText = text.toLowerCase();

  // Common spam keywords
  const spamKeywords = [
    'buy now', 'click here', 'limited time', 'act now', 'free money',
    'make money fast', 'work from home', 'guaranteed', 'no risk',
    'viagra', 'cialis', 'pharmacy', 'casino', 'lottery', 'winner',
    'congratulations', 'selected', 'claim now', 'urgent', 'immediate',
    'bitcoin', 'cryptocurrency', 'investment opportunity'
  ];

  for (const keyword of spamKeywords) {
    if (lowerText.includes(keyword)) {
      indicators.push(`spam-keyword-${keyword.replace(/\s+/g, '-')}`);
      score += 0.2;
    }
  }

  // Excessive capitalization
  const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
  if (capsRatio > 0.5 && text.length > 20) {
    indicators.push('excessive-caps');
    score += 0.3;
  }

  // Excessive punctuation
  const punctRatio = (text.match(/[!?]{2,}/g) || []).length;
  if (punctRatio > 2) {
    indicators.push('excessive-punctuation');
    score += 0.2;
  }

  // Repeated characters
  if (/(.)\1{4,}/.test(text)) {
    indicators.push('repeated-characters');
    score += 0.3;
  }

  // Multiple URLs
  const urlCount = (text.match(/https?:\/\/[^\s]+/g) || []).length;
  if (urlCount > 2) {
    indicators.push('multiple-urls');
    score += 0.4;
  }

  // Very short or very long text
  if (text.length < 10) {
    indicators.push('text-too-short');
    score += 0.2;
  } else if (text.length > 5000) {
    indicators.push('text-too-long');
    score += 0.3;
  }

  return { score: Math.min(score, 1), indicators };
}

function analyzeEmailForSpam(email: string): { score: number; indicators: string[] } {
  const indicators: string[] = [];
  let score = 0;

  // Suspicious domains
  const suspiciousDomains = [
    'tempmail', 'guerrillamail', '10minutemail', 'mailinator',
    'throwaway', 'temp-mail', 'fakeinbox'
  ];

  const domain = email.split('@')[1]?.toLowerCase();
  if (domain) {
    for (const suspicious of suspiciousDomains) {
      if (domain.includes(suspicious)) {
        indicators.push('suspicious-email-domain');
        score += 0.6;
        break;
      }
    }
  }

  // Random-looking email patterns
  const localPart = email.split('@')[0];
  if (localPart && /^[a-z0-9]{8,}$/.test(localPart.toLowerCase())) {
    indicators.push('random-email-pattern');
    score += 0.3;
  }

  // Multiple consecutive numbers
  if (/\d{4,}/.test(localPart)) {
    indicators.push('email-many-numbers');
    score += 0.2;
  }

  return { score: Math.min(score, 1), indicators };
}

function analyzePhoneForSpam(phone: string): { score: number; indicators: string[] } {
  const indicators: string[] = [];
  let score = 0;

  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');

  // Suspicious patterns
  if (/^(\d)\1+$/.test(digits)) { // All same digit
    indicators.push('phone-repeated-digits');
    score += 0.7;
  }

  if (digits.length < 7 || digits.length > 15) {
    indicators.push('phone-invalid-length');
    score += 0.4;
  }

  // Sequential numbers
  if (/123456|654321|012345/.test(digits)) {
    indicators.push('phone-sequential-digits');
    score += 0.5;
  }

  return { score: Math.min(score, 1), indicators };
}

function analyzeUrlForSpam(url: string): { score: number; indicators: string[] } {
  const indicators: string[] = [];
  let score = 0;

  try {
    const urlObj = new URL(url);
    
    // Suspicious TLDs
    const suspiciousTlds = ['.tk', '.ml', '.ga', '.cf', '.click', '.download'];
    if (suspiciousTlds.some(tld => urlObj.hostname.endsWith(tld))) {
      indicators.push('suspicious-tld');
      score += 0.4;
    }

    // Very long URLs
    if (url.length > 200) {
      indicators.push('url-too-long');
      score += 0.3;
    }

    // URL shorteners (could be hiding malicious links)
    const shorteners = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly'];
    if (shorteners.some(shortener => urlObj.hostname.includes(shortener))) {
      indicators.push('url-shortener');
      score += 0.2;
    }

    // Suspicious keywords in URL
    const suspiciousKeywords = ['free', 'money', 'casino', 'pharmacy', 'viagra'];
    if (suspiciousKeywords.some(keyword => url.toLowerCase().includes(keyword))) {
      indicators.push('suspicious-url-keyword');
      score += 0.3;
    }

  } catch (error) {
    indicators.push('invalid-url');
    score += 0.5;
  }

  return { score: Math.min(score, 1), indicators };
}

function analyzeUserAgentForSpam(userAgent: string): { score: number; indicators: string[] } {
  const indicators: string[] = [];
  let score = 0;

  // Empty or very short user agent
  if (!userAgent || userAgent.length < 10) {
    indicators.push('suspicious-user-agent');
    score += 0.4;
  }

  // Known bot patterns
  const botPatterns = [
    'bot', 'crawler', 'spider', 'scraper', 'curl', 'wget',
    'python-requests', 'java/', 'go-http-client'
  ];

  if (botPatterns.some(pattern => userAgent.toLowerCase().includes(pattern))) {
    indicators.push('bot-user-agent');
    score += 0.6;
  }

  // Very old browsers (often used by bots)
  if (userAgent.includes('MSIE 6.0') || userAgent.includes('MSIE 7.0')) {
    indicators.push('outdated-browser');
    score += 0.3;
  }

  return { score: Math.min(score, 1), indicators };
}

// Rate limiting utilities
interface RateLimitEntry {
  count: number;
  firstSubmission: number;
  lastSubmission: number;
}

class RateLimiter {
  private submissions = new Map<string, RateLimitEntry>();
  private readonly maxSubmissions: number;
  private readonly timeWindow: number; // in milliseconds

  constructor(maxSubmissions = 5, timeWindowMinutes = 15) {
    this.maxSubmissions = maxSubmissions;
    this.timeWindow = timeWindowMinutes * 60 * 1000;
  }

  checkRateLimit(identifier: string): { allowed: boolean; remainingAttempts: number } {
    const now = Date.now();
    const entry = this.submissions.get(identifier);

    if (!entry) {
      // First submission
      this.submissions.set(identifier, {
        count: 1,
        firstSubmission: now,
        lastSubmission: now,
      });
      return { allowed: true, remainingAttempts: this.maxSubmissions - 1 };
    }

    // Check if time window has passed
    if (now - entry.firstSubmission > this.timeWindow) {
      // Reset the window
      this.submissions.set(identifier, {
        count: 1,
        firstSubmission: now,
        lastSubmission: now,
      });
      return { allowed: true, remainingAttempts: this.maxSubmissions - 1 };
    }

    // Within time window, check count
    if (entry.count >= this.maxSubmissions) {
      return { allowed: false, remainingAttempts: 0 };
    }

    // Update count
    entry.count++;
    entry.lastSubmission = now;
    this.submissions.set(identifier, entry);

    return { allowed: true, remainingAttempts: this.maxSubmissions - entry.count };
  }

  // Clean up old entries periodically
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.submissions.entries()) {
      if (now - entry.firstSubmission > this.timeWindow) {
        this.submissions.delete(key);
      }
    }
  }
}

// Global rate limiter instances
export const listingSubmissionRateLimit = new RateLimiter(3, 60); // 3 submissions per hour
export const reviewSubmissionRateLimit = new RateLimiter(10, 15); // 10 reviews per 15 minutes
export const contactFormRateLimit = new RateLimiter(5, 15); // 5 contact forms per 15 minutes

// Cleanup function to be called periodically
export function cleanupRateLimiters(): void {
  listingSubmissionRateLimit.cleanup();
  reviewSubmissionRateLimit.cleanup();
  contactFormRateLimit.cleanup();
}