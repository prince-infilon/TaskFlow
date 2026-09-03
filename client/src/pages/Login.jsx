import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CheckSquare, Eye, EyeOff, AlertCircle } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import IconButton from '../components/ui/IconButton';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [serverError, setServerError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setServerError('Invalid email or password.');
      return;
    }

    setIsLoading(true);
    setServerError('');
    
    try {
      await login(email, password);
      navigate('/app', { replace: true });
    } catch (err) {
      setServerError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-4">
      
      {/* Brand / Logo */}
      <div className="flex items-center gap-2 mb-8">
        <div className="w-8 h-8 bg-accent-600 rounded-md flex items-center justify-center">
          <CheckSquare className="w-5 h-5 text-white" />
        </div>
        <span className="text-display text-primary tracking-tight">TaskFlow</span>
      </div>

      {/* Login Card */}
      <div className="bg-surface border border-border rounded-lg shadow-sm w-full max-w-[400px] p-6 sm:p-8">
        <h1 className="text-h1 text-primary mb-6">Log in</h1>

        {serverError && (
          <div className="mb-6 p-3 bg-danger-50 border-l-4 border-danger-500 rounded-r-md flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-danger-500 shrink-0 mt-0.5" />
            <span className="text-body text-danger-500 font-medium">{serverError}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
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
                  tabIndex="-1" // Don't interrupt normal form tab flow
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </IconButton>
              }
            />
            <div className="flex justify-end mt-1">
              <Link to="/forgot-password" className="text-small text-accent-600 hover:text-accent-700 font-medium focus:outline-none focus:underline">
                Forgot password?
              </Link>
            </div>
          </div>

          <div className="pt-2">
            <Button 
              type="submit" 
              variant="primary" 
              size="lg" 
              className="w-full"
              isLoading={isLoading}
            >
              {isLoading ? "Logging in..." : "Log in"}
            </Button>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-border text-center">
          <p className="text-body text-secondary">
            Don't have an account?{' '}
            <Link to="/register" className="text-accent-600 hover:text-accent-700 font-medium focus:outline-none focus:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
