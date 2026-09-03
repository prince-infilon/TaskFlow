import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckSquare, ArrowLeft, MailCheck } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    setTimeout(() => {
      setError('Password reset is not yet implemented (Tech Debt).');
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-4">
      {/* Brand / Logo */}
      <div className="flex items-center gap-2 mb-8">
        <div className="w-8 h-8 bg-accent-600 rounded-md flex items-center justify-center shrink-0">
          <CheckSquare className="w-5 h-5 text-white" />
        </div>
        <span className="text-display text-primary tracking-tight">TaskFlow</span>
      </div>

      {/* Card */}
      <div className="bg-surface border border-border rounded-lg shadow-sm w-full max-w-[400px] p-6 sm:p-8">
        {!isSuccess ? (
          <>
            <h1 className="text-h1 text-primary mb-2">Reset your password</h1>
            <p className="text-body text-secondary mb-6">
              Enter your email address and we'll send you a link to reset your password.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="email" className="text-small text-primary font-medium">
                  Email address
                </label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="you@example.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  error={error}
                  required
                />
              </div>

              <div className="pt-2">
                <Button 
                  type="submit" 
                  variant="primary" 
                  size="lg" 
                  className="w-full"
                  isLoading={isLoading}
                >
                  {isLoading ? "Sending..." : "Send reset link"}
                </Button>
              </div>
            </form>

            <div className="mt-6 text-center">
              <Link 
                to="/login" 
                className="inline-flex items-center text-small text-secondary hover:text-primary font-medium transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to log in
              </Link>
            </div>
          </>
        ) : (
          <div className="text-center flex flex-col items-center">
            <div className="w-12 h-12 bg-success-50 text-success-500 rounded-full flex items-center justify-center mb-4">
              <MailCheck className="w-6 h-6" />
            </div>
            <h1 className="text-h1 text-primary mb-2">Check your inbox</h1>
            <p className="text-body text-secondary mb-6">
              We've sent a password reset link to <strong>{email}</strong>. Please check your email to continue.
            </p>
            <Link to="/login" className="w-full">
              <Button variant="secondary" size="lg" className="w-full">
                Back to log in
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
