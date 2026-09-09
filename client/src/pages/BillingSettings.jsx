import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import Button from '../components/ui/Button';
import { CreditCard, CheckCircle, Zap } from 'lucide-react';

const BillingSettings = () => {
  const { currentOrganization, user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Extract from current org context or fetch updated
  const plan = currentOrganization?.subscription?.plan || 'free';
  const status = currentOrganization?.subscription?.status || 'active';

  const PLAN_LIMITS = {
    free: { boards: 1, members: 3 },
    pro: { boards: 10, members: 15 },
    enterprise: { boards: 'Unlimited', members: 'Unlimited' }
  };

  const handleCheckout = async (selectedPlan) => {
    setIsLoading(true);
    setError('');
    try {
      const res = await apiClient.post('/billing/create-checkout-session', { plan: selectedPlan });
      window.location.href = res.data.url;
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to initiate checkout.');
      setIsLoading(false);
    }
  };

  const handleCustomerPortal = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await apiClient.post('/billing/customer-portal');
      window.location.href = res.data.url;
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to open customer portal.');
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <h1 className="text-h2 font-bold text-primary mb-2 flex items-center gap-2">
          <CreditCard className="w-8 h-8 text-accent-500" />
          Billing & Subscription
        </h1>
        <p className="text-body text-secondary mb-8">
          Manage your organization's subscription plan and billing details.
        </p>

        {error && <div className="mb-6 p-4 bg-danger-50 text-danger-600 rounded-md text-small">{error}</div>}

        <div className="bg-surface border border-border rounded-xl p-6 shadow-sm mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-h3 font-bold text-primary mb-1">Current Plan: <span className="capitalize text-accent-600">{plan}</span></h2>
              <p className="text-small text-secondary mb-4">
                Status: <span className={`font-medium ${status === 'active' ? 'text-success-600' : 'text-danger-600'} capitalize`}>{status}</span>
              </p>
              
              <div className="space-y-2 mt-6">
                <h4 className="text-body-medium font-medium text-primary">Your Limits</h4>
                <div className="flex gap-8 text-small text-secondary">
                  <div><span className="font-medium text-primary">Max Boards:</span> {PLAN_LIMITS[plan].boards}</div>
                  <div><span className="font-medium text-primary">Max Members:</span> {PLAN_LIMITS[plan].members}</div>
                </div>
              </div>
            </div>
            
            {plan !== 'free' && (
              <Button variant="outline" onClick={handleCustomerPortal} isLoading={isLoading}>
                Manage Billing
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Free Tier */}
          <div className={`bg-surface border rounded-xl p-6 flex flex-col ${plan === 'free' ? 'border-accent-500 ring-1 ring-accent-500 shadow-md' : 'border-border'}`}>
            <h3 className="text-h3 font-bold text-primary mb-2">Free</h3>
            <p className="text-h2 font-bold text-primary mb-4">$0 <span className="text-small text-tertiary font-normal">/mo</span></p>
            <ul className="space-y-3 mb-8 flex-1 text-small text-secondary">
              <li className="flex gap-2"><CheckCircle className="w-4 h-4 text-success-500 shrink-0" /> Up to 1 Board</li>
              <li className="flex gap-2"><CheckCircle className="w-4 h-4 text-success-500 shrink-0" /> Up to 3 Members</li>
              <li className="flex gap-2"><CheckCircle className="w-4 h-4 text-success-500 shrink-0" /> Basic Kanban Board</li>
            </ul>
            <Button variant="secondary" className="w-full" disabled>
              {plan === 'free' ? 'Current Plan' : 'Downgrade to Free'}
            </Button>
          </div>

          {/* Pro Tier */}
          <div className={`bg-surface border rounded-xl p-6 flex flex-col relative ${plan === 'pro' ? 'border-accent-500 ring-1 ring-accent-500 shadow-md' : 'border-border'}`}>
            {plan !== 'pro' && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                Recommended
              </span>
            )}
            <h3 className="text-h3 font-bold text-primary mb-2 flex items-center gap-2">Pro <Zap className="w-4 h-4 text-accent-500" /></h3>
            <p className="text-h2 font-bold text-primary mb-4">$12 <span className="text-small text-tertiary font-normal">/user/mo</span></p>
            <ul className="space-y-3 mb-8 flex-1 text-small text-secondary">
              <li className="flex gap-2"><CheckCircle className="w-4 h-4 text-success-500 shrink-0" /> Up to 10 Boards</li>
              <li className="flex gap-2"><CheckCircle className="w-4 h-4 text-success-500 shrink-0" /> Up to 15 Members</li>
              <li className="flex gap-2"><CheckCircle className="w-4 h-4 text-success-500 shrink-0" /> Calendar & Gantt Views</li>
              <li className="flex gap-2"><CheckCircle className="w-4 h-4 text-success-500 shrink-0" /> Board Automations</li>
            </ul>
            <Button 
              variant={plan === 'pro' ? 'secondary' : 'primary'} 
              className="w-full" 
              disabled={plan === 'pro'}
              isLoading={isLoading}
              onClick={() => handleCheckout('pro')}
            >
              {plan === 'pro' ? 'Current Plan' : 'Upgrade to Pro'}
            </Button>
          </div>

          {/* Enterprise Tier */}
          <div className={`bg-surface border rounded-xl p-6 flex flex-col ${plan === 'enterprise' ? 'border-accent-500 ring-1 ring-accent-500 shadow-md' : 'border-border'}`}>
            <h3 className="text-h3 font-bold text-primary mb-2">Enterprise</h3>
            <p className="text-h2 font-bold text-primary mb-4">$30 <span className="text-small text-tertiary font-normal">/user/mo</span></p>
            <ul className="space-y-3 mb-8 flex-1 text-small text-secondary">
              <li className="flex gap-2"><CheckCircle className="w-4 h-4 text-success-500 shrink-0" /> Unlimited Boards</li>
              <li className="flex gap-2"><CheckCircle className="w-4 h-4 text-success-500 shrink-0" /> Unlimited Members</li>
              <li className="flex gap-2"><CheckCircle className="w-4 h-4 text-success-500 shrink-0" /> Advanced Analytics</li>
              <li className="flex gap-2"><CheckCircle className="w-4 h-4 text-success-500 shrink-0" /> Priority Support</li>
            </ul>
            <Button 
              variant={plan === 'enterprise' ? 'secondary' : 'primary'} 
              className="w-full" 
              disabled={plan === 'enterprise'}
              isLoading={isLoading}
              onClick={() => handleCheckout('enterprise')}
            >
              {plan === 'enterprise' ? 'Current Plan' : 'Upgrade to Enterprise'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillingSettings;
