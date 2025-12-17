import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ApolloProvider } from '@apollo/client';
import { client } from './apollo';
import { Dashboard } from './components/Dashboard';
import { ProjectBoard } from './components/ProjectBoard';
import { Auth } from './components/Auth';

// FIX: Explicitly type 'children' as React.ReactNode
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('token');
  return token ? <>{children}</> : <Navigate to="/auth" />;
};

function App() {
  const token = localStorage.getItem('token');

  return (
    <ApolloProvider client={client}>
      <BrowserRouter>
        <div className="min-h-screen font-sans bg-gray-50">
          
          {/* Show Navigation only if logged in */}
          {token && (
            <nav className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 sticky top-0 z-10 flex justify-between items-center">
               {/* UPDATED NAME HERE */}
               <span className="text-xl font-extrabold text-blue-600 tracking-tight">OrgFlow</span>
               
               <button 
                 onClick={() => { 
                   localStorage.removeItem('token'); 
                   window.location.href = '/auth'; 
                 }} 
                 className="text-sm font-medium text-gray-500 hover:text-red-600 transition"
               >
                 Logout
               </button>
            </nav>
          )}

          <Routes>
            <Route path="/auth" element={!token ? <Auth /> : <Navigate to="/" />} />
            
            <Route path="/" element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            } />
            
            <Route path="/project/:id" element={
              <PrivateRoute>
                <ProjectBoard />
              </PrivateRoute>
            } />
          </Routes>

        </div>
      </BrowserRouter>
    </ApolloProvider>
  );
}

export default App;