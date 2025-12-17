import React, { useState } from 'react';
import { useMutation, gql } from '@apollo/client';
import { useNavigate } from 'react-router-dom';

const LOGIN_MUTATION = gql`
  mutation Login($username: String!, $password: String!) {
    tokenAuth(username: $username, password: $password) {
      token
    }
  }
`;

const REGISTER_MUTATION = gql`
  mutation Register($username: String!, $password: String!, $email: String!, $orgName: String!) {
    register(username: $username, password: $password, email: $email, organizationName: $orgName) {
      token
    }
  }
`;

export const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ username: '', password: '', email: '', orgName: '' });
  // Local state to store and display readable error messages
  const [customError, setCustomError] = useState('');
  const navigate = useNavigate();

  const [login] = useMutation(LOGIN_MUTATION, {
    onCompleted: (data) => {
      localStorage.setItem('token', data.tokenAuth.token);
      window.location.href = '/'; // Hard reload to reset Apollo cache state
    },
    // FIX: Catch login errors gracefully
    onError: (err) => {
        setCustomError(err.message || "Login failed. Please check your credentials.");
    }
  });

  const [register] = useMutation(REGISTER_MUTATION, {
    onCompleted: (data) => {
      localStorage.setItem('token', data.register.token);
      window.location.href = '/';
    },
    // FIX: Catch registration errors (like "Username already exists") gracefully
    onError: (err) => {
        // Remove "GraphQL Error: " prefix if it exists for a cleaner look
        const msg = err.message.replace('GraphQL Error: ', '');
        setCustomError(msg);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomError(''); // Clear previous errors on new submission
    
    if (isLogin) {
      login({ variables: { username: formData.username, password: formData.password } });
    } else {
      register({ variables: { ...formData } });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md border border-gray-100">
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input name="username" onChange={handleChange} className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required />
          </div>

          {!isLogin && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input name="email" type="email" onChange={handleChange} className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Organization Name</label>
                <input name="orgName" onChange={handleChange} className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. My Startup" required />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input name="password" type="password" onChange={handleChange} className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required />
          </div>

          {/* FIX: Display the handled error message nicely */}
          {customError && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm text-center">
              {customError}
            </div>
          )}

          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 transition">
            {isLogin ? 'Login' : 'Register'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button 
            onClick={() => { setIsLogin(!isLogin); setCustomError(''); }} 
            className="text-blue-600 font-semibold hover:underline"
          >
            {isLogin ? 'Register' : 'Login'}
          </button>
        </div>
      </div>
    </div>
  );
};