import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { googleLogin } from '../api';
import './AuthPage.css';

const FEATURES = [
  { icon: '⚡', title: 'Deploy in Minutes', desc: 'Create a bot, train it with your knowledge base, and embed it — all in one place.' },
  { icon: '🧠', title: 'Custom Knowledge Base', desc: 'Teach your bot about your business — FAQs, policies, pricing, and more.' },
  { icon: '🔗', title: 'REST API & Widget', desc: 'Use the /v1/chat API or drop in our embeddable chat widget with a single script tag.' },
  { icon: '📊', title: 'Analytics & Logs', desc: 'Track conversations, monitor usage, and see how your customers interact.' },
];

export default function AuthPage() {
  const { loginUser } = useAuth();
  const [error, setError] = useState('');

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    try {
      const data = await googleLogin(credentialResponse.credential);
      loginUser(data.user, data.token);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGoogleError = () => {
    setError('Google sign-in failed. Please try again.');
  };

  return (
    <div className="auth-page">
      {/* Left: Hero */}
      <div className="auth-hero">
        <div className="auth-hero-content">
          <div className="auth-brand">
            <div className="auth-brand-icon">C</div>
            <span>ChatBotAgent</span>
          </div>
          <h1 className="auth-headline">Build AI Chatbots<br />for Your Business</h1>
          <p className="auth-tagline">
            Create, train, and deploy intelligent chatbots that understand your business — powered by local LLMs.
          </p>
          <div className="auth-features">
            {FEATURES.map((f, i) => (
              <div key={i} className="auth-feature">
                <span className="auth-feature-icon">{f.icon}</span>
                <div>
                  <h4>{f.title}</h4>
                  <p>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="auth-hero-bg" />
      </div>

      {/* Right: Google Login */}
      <div className="auth-form-side">
        <div className="auth-card">
          <h2 className="auth-title">Welcome</h2>
          <p className="auth-subtitle">Sign in to your dashboard</p>

          <div className="google-login-wrapper">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              size="large"
              width="380"
              text="continue_with"
              shape="rectangular"
              theme="outline"
            />
          </div>

          {error && <p className="auth-error">{error}</p>}
        </div>
      </div>
    </div>
  );
}
