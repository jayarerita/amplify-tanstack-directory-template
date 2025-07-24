import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';
import { useAuth } from '../../hooks/useAuth';
import { SubscriptionPlans, SubscriptionFeatureComparison } from '../../components/SubscriptionPlans';
import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const client = generateClient<Schema>();
const stripePromise = loadStripe(process.env.VITE_STRIPE_PUBLISHABLE_KEY!);

export const Route = createFileRoute('/_authed/subscription')({
  component: SubscriptionPage,
});

interface Subscription {
  id: string;
  userId: string;
  tier: 'BRONZE' | 'SILVER' | 'GOLD';
  stripeSubscriptionId: string;
  status: 'ACTIVE' | 'CANCELED' | 'PAST_DUE';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  features: string[];
}

function SubscriptionPage() {
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [showPayment, setShowPayment] = useState(false);

  const { data: subscription, isLoading } = useQuery({
    queryKey: ['user-subscription', user?.userId],
    queryFn: async () => {
      if (!user?.userId) return null;
      const { data } = await client.models.Subscription.list({
        filter: { userId: { eq: user.userId } }
      });
      return data?.[0] as Subscription | null;
    },
    enabled: !!user?.userId,
  });

  const handleSelectPlan = (plan: any) => {
    setSelectedPlan(plan);
    setShowPayment(true);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-8">
          <div className="h-8 bg-gray-200 rounded w-1/3 mx-auto"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-96 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {subscription && (
        <div className="mb-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            Current Subscription: {subscription.tier}
          </h3>
          <p className="text-blue-700">
            Status: {subscription.status} | 
            Next billing: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
          </p>
        </div>
      )}

      <SubscriptionPlans
        currentTier={subscription?.tier}
        onSelectPlan={handleSelectPlan}
      />

      <SubscriptionFeatureComparison />

      {showPayment && selectedPlan && (
        <Elements stripe={stripePromise}>
          <PaymentModal
            plan={selectedPlan}
            onClose={() => setShowPayment(false)}
            currentSubscription={subscription}
          />
        </Elements>
      )}
    </div>
  );
}

interface PaymentModalProps {
  plan: any;
  onClose: () => void;
  currentSubscription?: Subscription | null;
}

function PaymentModal({ plan, onClose, currentSubscription }: PaymentModalProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSubscriptionMutation = useMutation({
    mutationFn: async ({ paymentMethodId }: { paymentMethodId: string }) => {
      const response = await fetch('/api/stripe-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-subscription',
          userId: user?.userId,
          tier: plan.tier,
          priceId: plan.priceId,
          paymentMethodId,
        }),
      });

      if (!response.ok) {
        throw new Error('Payment failed');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-subscription'] });
      onClose();
    },
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) return;

    try {
      // Create payment method
      const { error: paymentError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      if (paymentError) {
        setError(paymentError.message || 'Payment failed');
        return;
      }

      // Create subscription
      await createSubscriptionMutation.mutateAsync({
        paymentMethodId: paymentMethod.id,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">
          {currentSubscription ? 'Update' : 'Subscribe to'} {plan.name} Plan
        </h2>

        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="font-medium">{plan.name} Plan</span>
            <span className="text-xl font-bold">${plan.price}/month</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Information
            </label>
            <div className="p-3 border border-gray-300 rounded-md">
              <CardElement
                options={{
                  style: {
                    base: {
                      fontSize: '16px',
                      color: '#424770',
                      '::placeholder': {
                        color: '#aab7c4',
                      },
                    },
                  },
                }}
              />
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!stripe || processing}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {processing ? 'Processing...' : `Subscribe for $${plan.price}/month`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}