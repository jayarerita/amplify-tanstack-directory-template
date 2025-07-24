import { useState } from 'react';
import { HONEYPOT_FIELDS } from '~/utils/spam-detection';

interface HoneypotFieldsProps {
  values: Record<string, string>;
  onChange: (field: string, value: string) => void;
}

/**
 * Honeypot fields component - renders hidden fields that should remain empty
 * If a bot fills these fields, it indicates spam
 */
export function HoneypotFields({ values, onChange }: HoneypotFieldsProps) {
  return (
    <div style={{ display: 'none' }} aria-hidden="true">
      {/* These fields should never be filled by real users */}
      <label htmlFor="email_confirm">
        Email Confirmation (leave blank):
        <input
          type="email"
          id="email_confirm"
          name="email_confirm"
          value={values.email_confirm || ''}
          onChange={(e) => onChange('email_confirm', e.target.value)}
          tabIndex={-1}
          autoComplete="off"
        />
      </label>
      
      <label htmlFor="website_url">
        Website URL (leave blank):
        <input
          type="url"
          id="website_url"
          name="website_url"
          value={values.website_url || ''}
          onChange={(e) => onChange('website_url', e.target.value)}
          tabIndex={-1}
          autoComplete="off"
        />
      </label>
      
      <label htmlFor="company_name">
        Company Name (leave blank):
        <input
          type="text"
          id="company_name"
          name="company_name"
          value={values.company_name || ''}
          onChange={(e) => onChange('company_name', e.target.value)}
          tabIndex={-1}
          autoComplete="off"
        />
      </label>
      
      <label htmlFor="phone_number">
        Phone Number (leave blank):
        <input
          type="tel"
          id="phone_number"
          name="phone_number"
          value={values.phone_number || ''}
          onChange={(e) => onChange('phone_number', e.target.value)}
          tabIndex={-1}
          autoComplete="off"
        />
      </label>
      
      <label htmlFor="message_body">
        Message Body (leave blank):
        <textarea
          id="message_body"
          name="message_body"
          value={values.message_body || ''}
          onChange={(e) => onChange('message_body', e.target.value)}
          tabIndex={-1}
          autoComplete="off"
        />
      </label>
    </div>
  );
}

/**
 * Hook to manage honeypot field state
 */
export function useHoneypotFields() {
  const [honeypotValues, setHoneypotValues] = useState<Record<string, string>>(
    Object.keys(HONEYPOT_FIELDS).reduce((acc, key) => {
      acc[key] = '';
      return acc;
    }, {} as Record<string, string>)
  );

  const updateHoneypotField = (field: string, value: string) => {
    setHoneypotValues(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const getHoneypotData = () => honeypotValues;

  const hasHoneypotViolation = () => {
    return Object.values(honeypotValues).some(value => value.trim() !== '');
  };

  return {
    honeypotValues,
    updateHoneypotField,
    getHoneypotData,
    hasHoneypotViolation,
  };
}

import { useState } from 'react';