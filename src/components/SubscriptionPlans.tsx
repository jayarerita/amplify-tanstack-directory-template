import React, { useState } from 'react';
import { Check, Crown, Star, Award } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface SubscriptionPlan {
  tier: 'BRONZE' | 'SILVER' | 'GOLD';
  name: string;
  price: number;
  priceId: string;
  features: string[];
  popular?: boolean;
}

const plans: SubscriptionPlan[] = [
  {
    tier: 'BRONZE',
    name: 'Bronze',
    price: 29,
    priceId: 'price_bronze_monthly',
    features: [
      'Basic listing',
      'Contact form',
      'Basic analytics',
      'Email support',
      '5 images per listing',
    ],
  },
  {
    tier: 'SILVER',
    name: 'Silver',
    price: 59,
    priceId: 'price_silver_monthly',
    popular: true,
    features: [
      'Everything in Bronze',
      'Priority support',
      'Featured badge',
      'Advanced analytics',
      '15 images per listing',
      'Social media integration',
    ],
  },
  {
    tier: 'GOLD',
    name: 'Gold',
    price: 99,
    priceId: 'price_gold_monthly',
    features: [
      'Everything in Silver',
      'Sponsored placement',
      'Premium analytics',
      'Unlimited images',
      'Custom branding',
      'API access',
      'Dedicated account manager',
    ],
  },
];

interface SubscriptionPlansProps {
  currentTier?: 'BRONZE' | 'SILVER' | 'GOLD';
  onSelectPlan: (plan: SubscriptionPlan) => void;
  loading?: boolean;
}

export function SubscriptionPlans({ currentTier, onSelectPlan, loading }: SubscriptionPlansProps) {
  const { user } = useAuth();

  const getIcon = (tier: string) => {
    switch (tier) {
      case 'BRONZE':
        return <Award className="w-8 h-8 text-amber-600" />;
      case 'SILVER':
        return <Star className="w-8 h-8 text-gray-500" />;
      case 'GOLD':
        return <Crown className="w-8 h-8 text-yellow-500" />;
      default:
        return <Star className="w-8 h-8" />;
    }
  };

  const getButtonText = (plan: SubscriptionPlan) => {
    if (!user) return 'Sign in to subscribe';
    if (currentTier === plan.tier) return 'Current plan';
    if (currentTier && plans.findIndex(p => p.tier === currentTier) > plans.findIndex(p => p.tier === plan.tier)) {
      return 'Downgrade';
    }
    return currentTier ? 'Upgrade' : 'Get started';
  };

  const getButtonStyle = (plan: SubscriptionPlan) => {
    if (currentTier === plan.tier) {
      return 'bg-gray-100 text-gray-500 cursor-not-allowed';
    }
    if (plan.popular) {
      return 'bg-blue-600 text-white hover:bg-blue-700';
    }
    return 'bg-white text-blue-600 border border-blue-600 hover:bg-blue-50';
  };

  return (
    <div className="py-12">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Choose Your Plan
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Unlock premium features and grow your business with our flexible subscription plans.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {plans.map((plan) => (
          <div
            key={plan.tier}
            className={`
              relative bg-white rounded-2xl border-2 p-8 transition-all duration-200
              ${plan.popular 
                ? 'border-blue-500 shadow-lg scale-105' 
                : 'border-gray-200 hover:border-gray-300'
              }
              ${currentTier === plan.tier ? 'ring-2 ring-green-500' : ''}
            `}
          >
            {plan.popular && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                  Most Popular
                </span>
              </div>
            )}

            {currentTier === plan.tier && (
              <div className="absolute -top-4 right-4">
                <span className="bg-green-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                  Current
                </span>
              </div>
            )}

            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                {getIcon(plan.tier)}
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {plan.name}
              </h3>
              <div className="mb-4">
                <span className="text-4xl font-bold text-gray-900">
                  ${plan.price}
                </span>
                <span className="text-gray-600">/month</span>
              </div>
            </div>

            <ul className="space-y-4 mb-8">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => onSelectPlan(plan)}
              disabled={!user || currentTier === plan.tier || loading}
              className={`
                w-full py-3 px-6 rounded-lg font-medium transition-colors
                ${getButtonStyle(plan)}
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {loading ? 'Processing...' : getButtonText(plan)}
            </button>
          </div>
        ))}
      </div>

      <div className="text-center mt-12">
        <p className="text-gray-600 mb-4">
          All plans include a 14-day free trial. Cancel anytime.
        </p>
        <div className="flex justify-center gap-8 text-sm text-gray-500">
          <span>✓ No setup fees</span>
          <span>✓ Cancel anytime</span>
          <span>✓ 24/7 support</span>
        </div>
      </div>
    </div>
  );
}

export function SubscriptionFeatureComparison() {
  const features = [
    { name: 'Basic listing', bronze: true, silver: true, gold: true },
    { name: 'Contact form', bronze: true, silver: true, gold: true },
    { name: 'Basic analytics', bronze: true, silver: true, gold: true },
    { name: 'Email support', bronze: true, silver: true, gold: true },
    { name: 'Images per listing', bronze: '5', silver: '15', gold: 'Unlimited' },
    { name: 'Priority support', bronze: false, silver: true, gold: true },
    { name: 'Featured badge', bronze: false, silver: true, gold: true },
    { name: 'Advanced analytics', bronze: false, silver: true, gold: true },
    { name: 'Social media integration', bronze: false, silver: true, gold: true },
    { name: 'Sponsored placement', bronze: false, silver: false, gold: true },
    { name: 'Premium analytics', bronze: false, silver: false, gold: true },
    { name: 'Custom branding', bronze: false, silver: false, gold: true },
    { name: 'API access', bronze: false, silver: false, gold: true },
    { name: 'Dedicated account manager', bronze: false, silver: false, gold: true },
  ];

  const renderFeatureValue = (value: boolean | string) => {
    if (typeof value === 'boolean') {
      return value ? (
        <Check className="w-5 h-5 text-green-500 mx-auto" />
      ) : (
        <span className="text-gray-300">—</span>
      );
    }
    return <span className="text-gray-900">{value}</span>;
  };

  return (
    <div className="py-12">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Feature Comparison
        </h2>
        <p className="text-lg text-gray-600">
          Compare all features across our subscription tiers
        </p>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="grid grid-cols-4 bg-gray-50 border-b">
            <div className="p-4 font-medium text-gray-900">Features</div>
            <div className="p-4 text-center font-medium text-gray-900">Bronze</div>
            <div className="p-4 text-center font-medium text-gray-900">Silver</div>
            <div className="p-4 text-center font-medium text-gray-900">Gold</div>
          </div>

          {features.map((feature, index) => (
            <div
              key={index}
              className={`grid grid-cols-4 border-b ${
                index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
              }`}
            >
              <div className="p-4 text-gray-900">{feature.name}</div>
              <div className="p-4 text-center">
                {renderFeatureValue(feature.bronze)}
              </div>
              <div className="p-4 text-center">
                {renderFeatureValue(feature.silver)}
              </div>
              <div className="p-4 text-center">
                {renderFeatureValue(feature.gold)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}