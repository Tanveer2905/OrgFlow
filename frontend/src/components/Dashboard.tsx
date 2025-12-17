import React, { useState } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import { Link } from 'react-router-dom';
import { Project } from '../types';

// 1. UPDATED QUERY: Fetch the logged-in user's organization instead of a hardcoded slug
const GET_MY_ORG_PROJECTS = gql`
  query GetMyOrgProjects {
    myOrganization {
      id
      name
      slug
      projects {
        id
        name
        status
        description
        taskCount
        completionRate
      }
    }
  }
`;

const CREATE_PROJECT = gql`
  mutation CreateProject($orgSlug: String!, $name: String!, $desc: String!) {
    createProject(orgSlug: $orgSlug, name: $name, description: $desc) {
      project {
        id
        name
        status
        completionRate
        taskCount
      }
    }
  }
`;

export const Dashboard: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });
  
  // Use the new query that respects the logged-in user
  const { loading, error, data } = useQuery(GET_MY_ORG_PROJECTS, {
    fetchPolicy: "cache-and-network" 
  });

  const [createProject] = useMutation(CREATE_PROJECT, {
    refetchQueries: [GET_MY_ORG_PROJECTS],
    onCompleted: () => {
      setIsModalOpen(false);
      setFormData({ name: '', description: '' });
    }
  });

  // Access the organization data safely
  const org = data?.myOrganization;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!org) return; // Guard clause
    
    createProject({
      variables: { orgSlug: org.slug, name: formData.name, desc: formData.description }
    });
  };

  if (loading && !data) return <div className="p-10 text-center">Loading dashboard...</div>;
  if (error) return <div className="p-10 text-red-500">Error: {error.message}</div>;
  
  // Handle case where user is logged in but has no organization linked
  if (!org) {
      return (
        <div className="p-10 text-center">
            <h2 className="text-xl font-bold text-gray-700">No Organization Found</h2>
            <p className="text-gray-500">You don't seem to be part of any organization.</p>
        </div>
      );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">{org.name} Projects</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition"
        >
          + New Project
        </button>
      </div>
      
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold mb-4">Create New Project</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input 
                  className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea 
                  className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Grid Display Logic (Unchanged) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {org.projects.length === 0 ? (
            <div className="col-span-full text-center py-10 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl">
                <p className="text-gray-500">No projects found. Create one to get started!</p>
            </div>
        ) : (
            org.projects.map((proj: Project) => (
            <Link key={proj.id} to={`/project/${proj.id}`} className="block group">
                <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-200 h-full flex flex-col">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-bold text-gray-800 group-hover:text-blue-600">{proj.name}</h3>
                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                    proj.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                    {proj.status}
                    </span>
                </div>
                <p className="text-gray-500 text-sm mb-6 flex-grow">{proj.description || "No description provided."}</p>
                
                <div className="space-y-2">
                    <div className="flex justify-between text-xs font-semibold text-gray-500">
                    <span>Progress</span>
                    <span>{Math.round(proj.completionRate)}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                    <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out" 
                        style={{ width: `${proj.completionRate}%` }}
                    ></div>
                    </div>
                    <div className="pt-2 text-xs text-gray-400 flex items-center gap-1">
                        📋 {proj.taskCount} Tasks
                    </div>
                </div>
                </div>
            </Link>
            ))
        )}
      </div>
    </div>
  );
};