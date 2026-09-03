import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CheckSquare, Eye, EyeOff } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import IconButton from '../components/ui/IconButton';

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setEmailError('');
    setPasswordError('');
    
    let hasError = false;
    
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      hasError = true;
    } else if (password.length > 0 && password.length < 8) {
      setPasswordError('Password must be at least 8 characters long.');
      hasError = true;
    }
    
    if (hasError) {
      setIsLoading(false);
      return;
    }

    try {
      await register(name, email, password);
      navigate('/app', { replace: true });
    } catch (err) {
      // Handle potential API errors (like email already taken)
      if (err.message && err.message.toLowerCase().includes('email')) {
        setEmailError(err.message);
      } else {
        setPasswordError(err.message || 'Registration failed.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Basic password strength hint calculation
  const getStrengthHint = () => {
    if (!password) return null;
    if (password.length < 8) return { label: 'Weak', color: 'text-danger-500' };
    if (/[A-Z]/.test(password) && /[0-9]/.test(password)) return { label: 'Strong', color: 'text-success-500' };
    return { label: 'Fair', color: 'text-warning-500' };
  };

  const strength = getStrengthHint();

  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-4 py-12">
      
      {/* Brand / Logo */}
      <div className="flex items-center gap-2 mb-8">
        <div className="w-8 h-8 bg-accent-600 rounded-md flex items-center justify-center shrink-0">
          <CheckSquare className="w-5 h-5 text-white" />
        </div>
        <span className="text-display text-primary tracking-tight">TaskFlow</span>
      </div>

      {/* Register Card */}
      <div className="bg-surface border border-border rounded-lg shadow-sm w-full max-w-[400px] p-6 sm:p-8">
        <h1 className="text-h1 text-primary mb-6">Create an account</h1>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="name" className="text-small text-primary font-medium">
              Full name
            </label>
            <Input 
              id="name" 
              type="text" 
              placeholder="Jane Doe" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

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
              error={emailError}
              required
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-small text-primary font-medium">
              Password
            </label>
            <Input 
              id="password" 
              type={showPassword ? "text" : "password"} 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
              endAdornment={
                <IconButton 
                  type="button"
                  variant="ghost" 
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="w-7 h-7 text-secondary hover:text-primary"
                  tabIndex="-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </IconButton>
              }
            />
            {/* Password Strength Hint */}
            {strength && !passwordError && (
              <p className="text-small text-secondary mt-1 flex justify-end">
                Strength: <span className={`ml-1 font-medium ${strength.color}`}>{strength.label}</span>
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label htmlFor="confirmPassword" className="text-small text-primary font-medium">
              Confirm password
            </label>
            <Input 
              id="confirmPassword" 
              type={showConfirmPassword ? "text" : "password"} 
              placeholder="••••••••" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
              error={passwordError}
              required
              endAdornment={
                <IconButton 
                  type="button"
                  variant="ghost" 
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  className="w-7 h-7 text-secondary hover:text-primary"
                  tabIndex="-1"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </IconButton>
              }
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
              {isLoading ? "Creating account..." : "Create account"}
            </Button>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-border text-center">
          <p className="text-body text-secondary">
            Already have an account?{' '}
            <Link to="/login" className="text-accent-600 hover:text-accent-700 font-medium focus:outline-none focus:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
