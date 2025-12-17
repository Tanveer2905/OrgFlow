import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, gql } from '@apollo/client';

// --- Type Definitions ---
interface User {
  id: string;
  username: string;
  email: string;
}

interface Comment {
  id: string;
  content: string;
  author: {
    username: string;
  };
  createdAt: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  assigneeEmail: string;
  dueDate: string;
  comments: Comment[];
}

interface Project {
  id: string;
  name: string;
  status: string;
  completionRate: number;
  taskCount: number;
  organization: {
    id: string;
    name: string;
    members: User[];
    isAdmin: boolean;
  };
  tasks: Task[];
}

// --- GraphQL Operations ---
const GET_PROJECT_DETAILS = gql`
  query GetProject($id: ID!) {
    project(id: $id) {
      id
      name
      status
      completionRate   
      taskCount 
      organization { 
        id 
        name 
        slug 
        isAdmin 
        members { id username email }
      }       
      tasks {
        id
        title
        description
        status
        assigneeEmail
        dueDate
        comments { 
          id 
          content 
          author { username } 
          createdAt 
        }
      }
    }
  }
`;

const GET_ALL_ORGS = gql`
  query GetAllOrgs {
    allOrganizations {
      id
      name
      projects { id name }
    }
  }
`;

const UPDATE_PROJECT_STATUS = gql`
  mutation UpdateProject($projectId: ID!, $status: String!) {
    updateProject(projectId: $projectId, status: $status) { project { id status } }
  }
`;

const UPDATE_TASK = gql`
  mutation UpdateTask($taskId: ID!, $status: String, $desc: String, $assignee: String, $dueDate: String) {
    updateTask(taskId: $taskId, status: $status, description: $desc, assigneeEmail: $assignee, dueDate: $dueDate) {
      task { id status description assigneeEmail dueDate } 
    }
  }
`;

const CREATE_TASK = gql`
  mutation CreateTask($projectId: ID!, $title: String!) {
    createTask(projectId: $projectId, title: $title) {
      task { id title status }
    }
  }
`;

const ADD_COMMENT = gql`
  mutation AddComment($taskId: ID!, $content: String!) {
    addComment(taskId: $taskId, content: $content) {
      comment { id content author { username } createdAt }
    }
  }
`;

const GET_ME = gql`
  query GetMe {
    me {
      username
    }
  }
`;

// Helper for Avatar Initials
const getInitials = (email: string) => {
  if (!email) return "?";
  return email.substring(0, 2).toUpperCase();
};

export const ProjectBoard: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [commentText, setCommentText] = useState('');
  const [showOrgMenu, setShowOrgMenu] = useState(false);

  const { loading, error, data } = useQuery(GET_PROJECT_DETAILS, { 
    variables: { id }, 
    fetchPolicy: "cache-and-network" 
  });
  
  const { data: orgsData } = useQuery(GET_ALL_ORGS);
  const { data: meData } = useQuery(GET_ME);
  
  const [createTask] = useMutation(CREATE_TASK, { refetchQueries: [GET_PROJECT_DETAILS] });
  const [updateTask] = useMutation(UPDATE_TASK, { refetchQueries: [GET_PROJECT_DETAILS] });
  const [updateProject] = useMutation(UPDATE_PROJECT_STATUS);
  const [addComment] = useMutation(ADD_COMMENT, { refetchQueries: [GET_PROJECT_DETAILS] });

  // --- Handlers ---
  const handleDragStart = (e: React.DragEvent, taskId: string) => e.dataTransfer.setData("taskId", taskId);
  
  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    const taskId = e.dataTransfer.getData("taskId");
    await updateTask({ variables: { taskId, status: newStatus } });
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    try { await createTask({ variables: { projectId: id, title: newTaskTitle } }); setNewTaskTitle(''); } 
    catch (err) { console.error("Failed to create task", err); }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !commentText) return;
    await addComment({ variables: { taskId: selectedTask.id, content: commentText } });
    const newComment = { id: "temp-" + Date.now(), content: commentText, author: { username: meData?.me?.username || "Me" }, createdAt: new Date().toISOString() };
    setSelectedTask(prev => prev ? { ...prev, comments: [...prev.comments, newComment] } : null);
    setCommentText('');
  };

  const handleUpdateDetails = async (field: string, value: string) => {
    if (!selectedTask) return;
    const updatedLocalTask = { ...selectedTask };
    if (field === 'desc') updatedLocalTask.description = value;
    if (field === 'assignee') updatedLocalTask.assigneeEmail = value;
    if (field === 'status') updatedLocalTask.status = value as 'TODO' | 'IN_PROGRESS' | 'DONE';
    if (field === 'dueDate') updatedLocalTask.dueDate = value; 
    setSelectedTask(updatedLocalTask);

    const variables: any = { taskId: selectedTask.id };
    if (field === 'desc') variables.desc = value;
    if (field === 'assignee') variables.assignee = value;
    if (field === 'status') variables.status = value;
    if (field === 'dueDate') variables.dueDate = value; 

    try { 
        await updateTask({ variables }); 
        if (field === 'dueDate') window.location.reload();
    } catch (e) { console.error("Update failed", e); }
  };

  const handleProjectStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    await updateProject({ variables: { projectId: id, status: e.target.value } });
  };

  const handleSwitchProject = (newProjectId: string) => {
    setShowOrgMenu(false);
    navigate(`/project/${newProjectId}`);
  };

  const isOverdue = (dateStr: string | null | undefined, status: string) => {
    if (!dateStr) return false;
    if (status === 'DONE') return false; 
    return new Date(dateStr) < new Date(new Date().setHours(0,0,0,0));
  };

  if (loading && !data) return <div className="h-screen flex items-center justify-center text-slate-500 font-medium">Loading Workspace...</div>;
  if (error) return <div className="h-screen flex items-center justify-center text-red-500 font-medium">Unable to load project: {error.message}</div>;

  const columns = ['TODO', 'IN_PROGRESS', 'DONE'];
  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'ACTIVE': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'COMPLETED': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'ON_HOLD': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-white text-gray-700';
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8 h-screen flex flex-col bg-slate-50 font-sans">
      
      {/* HEADER SECTION */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8 transition-all hover:shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-5">
          <div className="flex items-center gap-6">
            <Link to="/" className="text-slate-400 hover:text-indigo-600 transition-colors duration-200 group flex items-center gap-1">
              <span className="text-lg group-hover:-translate-x-1 transition-transform">←</span>
              <span className="font-medium text-sm">Dashboard</span>
            </Link>
            
            {/* Context Switcher */}
            <div className="relative">
                <div 
                    className="flex flex-col cursor-pointer group"
                    onClick={() => setShowOrgMenu(!showOrgMenu)}
                >
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-indigo-500 transition-colors">
                        {data?.project?.organization?.name || 'Organization'}
                    </span>
                    <div className="flex items-center gap-2">
                        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight group-hover:text-indigo-600 transition-colors">
                          {data?.project?.name}
                        </h1>
                        <span className="text-slate-300 text-xs mt-1 transition-transform duration-200 group-hover:rotate-180">▼</span>
                    </div>
                </div>

                {/* Dropdown Menu */}
                {showOrgMenu && orgsData && (
                    <div className="absolute top-full left-0 mt-3 w-72 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 max-h-96 overflow-y-auto animate-fade-in-down ring-1 ring-black/5">
                        {orgsData.allOrganizations.map((org: any) => (
                            <div key={org.id} className="p-3 border-b border-slate-50 last:border-0">
                                <div className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">{org.name}</div>
                                {org.projects.map((proj: any) => (
                                    <div 
                                        key={proj.id}
                                        onClick={() => handleSwitchProject(proj.id)}
                                        className={`px-4 py-2.5 text-sm rounded-lg cursor-pointer flex justify-between items-center transition-all ${
                                            proj.id === id 
                                              ? 'bg-indigo-50 text-indigo-700 font-semibold' 
                                              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                        }`}
                                    >
                                        {proj.name}
                                        {proj.id === id && <span className="text-indigo-500 text-lg">✓</span>}
                                    </div>
                                ))}
                                {org.projects.length === 0 && <div className="text-xs text-slate-300 px-4 py-1 italic">No projects</div>}
                            </div>
                        ))}
                    </div>
                )}
                {showOrgMenu && <div className="fixed inset-0 z-40" onClick={() => setShowOrgMenu(false)} />}
            </div>
            
            <div className="h-8 w-px bg-slate-200 mx-2 hidden md:block"></div>

            <select 
              value={data?.project?.status}
              onChange={handleProjectStatusChange}
              className={`text-xs font-bold px-4 py-2 rounded-full border cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 transition-shadow ${getStatusBadge(data?.project?.status)}`}
            >
              <option value="ACTIVE">Active</option>
              <option value="ON_HOLD">On Hold</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>

          <div className="flex flex-col items-end gap-1">
             <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full whitespace-nowrap">
              {Math.round(data?.project?.completionRate || 0)}% Complete
            </span>
          </div>
        </div>
        
        {/* Modern Progress Bar */}
        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-1000 ease-out shadow-sm ${
              data?.project?.status === 'COMPLETED' 
                ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' 
                : 'bg-gradient-to-r from-blue-500 to-indigo-600'
            }`}
            style={{ width: `${data?.project?.completionRate || 0}%` }}
          ></div>
        </div>
      </div>

      {/* QUICK ADD TASK BAR */}
      <form onSubmit={handleCreateTask} className="mb-8 flex gap-4">
        <div className="relative flex-1 group">
          <input 
            value={newTaskTitle} 
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Add a new task..."
            className="w-full border-slate-200 border bg-white rounded-xl px-5 py-4 pl-12 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400 group-hover:border-indigo-300"
          />
          <span className="absolute left-4 top-4 text-slate-400 text-xl group-focus-within:text-indigo-500 transition-colors">+</span>
        </div>
        <button 
          type="submit" 
          className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white px-8 py-4 rounded-xl font-bold shadow-md hover:shadow-lg transition-all duration-200 ease-out"
        >
          Add Task
        </button>
      </form>

      {/* KANBAN BOARD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 flex-1 overflow-hidden min-h-0">
        {columns.map(status => (
          <div key={status} 
               onDrop={(e) => handleDrop(e, status)} onDragOver={(e) => e.preventDefault()}
               className="bg-slate-100/80 p-5 rounded-2xl border border-slate-200/60 flex flex-col h-full backdrop-blur-sm">
            
            <div className="flex justify-between items-center mb-5 px-1">
                <h2 className="font-bold text-slate-500 text-xs tracking-widest uppercase flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                        status === 'TODO' ? 'bg-slate-400' : 
                        status === 'IN_PROGRESS' ? 'bg-blue-500' : 'bg-emerald-500'
                    }`}></span>
                    {status.replace('_', ' ')}
                </h2>
                <span className="bg-white text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm border border-slate-100">
                    {data?.project?.tasks.filter((t: Task) => t.status === status).length}
                </span>
            </div>

            <div className="space-y-4 overflow-y-auto flex-1 pr-1 custom-scrollbar pb-4">
              {data?.project?.tasks
                .filter((t: Task) => t.status === status)
                .map((task: Task) => {
                  const overdue = isOverdue(task.dueDate, task.status);
                  return (
                    <div
                      key={task.id} 
                      draggable 
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      onClick={() => setSelectedTask(task)}
                      className="group bg-white p-5 rounded-xl shadow-sm border border-slate-100 cursor-grab active:cursor-grabbing hover:shadow-md hover:-translate-y-1 hover:border-indigo-200 transition-all duration-200 flex flex-col gap-3 relative overflow-hidden"
                    >
                      {/* Priority Stripe (Visual only for now) */}
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${overdue ? 'bg-red-500' : 'bg-transparent group-hover:bg-indigo-500'} transition-colors`}></div>

                      <div className="flex justify-between items-start gap-2">
                          <p className="font-semibold text-slate-800 leading-snug">{task.title}</p>
                      </div>
                      
                      <div className="flex justify-between items-center mt-1 pt-3 border-t border-slate-50">
                        <div className="flex items-center gap-3">
                            {/* Comments Count */}
                            <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
                                <span>💬</span> {task.comments.length}
                            </div>
                            
                            {/* Due Date Pill */}
                            {task.dueDate && (
                                <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold border ${
                                  overdue 
                                    ? 'bg-red-50 text-red-600 border-red-100' 
                                    : 'bg-slate-50 text-slate-500 border-slate-100'
                                }`}>
                                    {overdue ? '⚠️ ' : '📅 '}
                                    {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </div>
                            )}
                        </div>

                        {/* Avatar */}
                        {task.assigneeEmail ? (
                          <div 
                            className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-[10px] font-bold flex items-center justify-center shadow-sm" 
                            title={task.assigneeEmail}
                          >
                            {getInitials(task.assigneeEmail)}
                          </div>
                        ) : (
                           <div className="w-6 h-6 rounded-full border border-dashed border-slate-300 flex items-center justify-center text-slate-300 text-[10px]">+</div>
                        )}
                      </div>
                    </div>
                )})}
            </div>
          </div>
        ))}
      </div>

      {/* MODERN TASK DETAIL MODAL */}
      {selectedTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-scale-up">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start p-8 border-b border-slate-100 bg-slate-50/50">
              <div className="flex-1">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Task Details</div>
                  <h2 className="text-3xl font-extrabold text-slate-800 leading-tight">{selectedTask.title}</h2>
              </div>
              <button 
                onClick={() => setSelectedTask(null)} 
                className="ml-4 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 p-2 rounded-full transition-all"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="flex flex-1 overflow-hidden">
              {/* Left Column: Description & Conversation */}
              <div className="w-2/3 p-8 overflow-y-auto custom-scrollbar">
                <div className="mb-10">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
                    Description
                  </label>
                  <textarea 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-700 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-inner leading-relaxed" 
                    rows={6}
                    defaultValue={selectedTask.description}
                    onBlur={(e) => handleUpdateDetails('desc', e.target.value)}
                    placeholder="Add a more detailed description..."
                  />
                </div>
                
                <div>
                  <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-3 text-lg">
                    Activity <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-bold">{selectedTask.comments.length}</span>
                  </h3>
                  
                  <div className="space-y-6 mb-8">
                    {selectedTask.comments.map(comment => (
                      <div key={comment.id} className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold shrink-0 mt-1">
                            {comment.author.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                            <div className="flex items-baseline gap-2 mb-1">
                                <span className="font-bold text-sm text-slate-900">{comment.author.username}</span>
                                <span className="text-xs text-slate-400">{new Date(comment.createdAt).toLocaleDateString()} at {new Date(comment.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                            <div className="bg-white p-4 rounded-xl rounded-tl-none border border-slate-200 shadow-sm text-sm text-slate-600 leading-relaxed">
                                {comment.content}
                            </div>
                        </div>
                      </div>
                    ))}
                    {selectedTask.comments.length === 0 && (
                      <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <p className="text-slate-400 text-sm">No activity yet. Leave a comment to start the discussion.</p>
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleAddComment} className="relative flex gap-3 items-start">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0 mt-2">
                        You
                    </div>
                    <div className="flex-1 relative">
                        <input 
                        className="w-full bg-white border border-slate-300 rounded-xl pl-5 pr-14 py-4 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-sm placeholder:text-slate-400"
                        placeholder="Write a comment..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        />
                        <button 
                            type="submit" 
                            disabled={!commentText.trim()}
                            className="absolute right-2 top-2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-all shadow-sm"
                        >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                        </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Right Column: Meta Details */}
              <div className="w-1/3 bg-slate-50 p-8 border-l border-slate-100 flex flex-col gap-8">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Status</label>
                  <select 
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all cursor-pointer hover:border-indigo-300"
                    value={selectedTask.status}
                    onChange={(e) => handleUpdateDetails('status', e.target.value)}
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="DONE">Done</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Assignee</label>
                  {data?.project?.organization?.isAdmin ? (
                      <div className="relative group">
                        <span className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors">👤</span>
                        <select
                          className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-10 py-3 text-sm font-medium text-slate-700 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer hover:border-indigo-300 transition-all"
                          value={selectedTask.assigneeEmail || ""}
                          onChange={(e) => handleUpdateDetails('assignee', e.target.value)}
                        >
                          <option value="">Unassigned</option>
                          {data?.project?.organization?.members?.map((member: User) => (
                            <option key={member.id} value={member.email}>
                              {member.username}
                            </option>
                          ))}
                        </select>
                        <span className="absolute right-4 top-4 text-slate-400 pointer-events-none text-xs">▼</span>
                      </div>
                  ) : (
                      <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 text-sm text-slate-500 flex items-center gap-3 cursor-not-allowed select-none">
                        <span className="text-slate-400">👤</span>
                        <span className="font-medium">{selectedTask.assigneeEmail || "Unassigned"}</span>
                        <span className="ml-auto text-[10px] font-bold text-slate-400 bg-slate-200 px-2 py-0.5 rounded uppercase tracking-wider">Admin</span>
                      </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
                      {isOverdue(selectedTask.dueDate, selectedTask.status) ? (<span className="text-red-500 flex items-center gap-1">Due Date <span className="bg-red-100 text-red-600 text-[10px] px-1.5 rounded">OVERDUE</span></span>) : 'Due Date'}
                  </label>
                  <input 
                    type="date" 
                    className={`w-full bg-white border rounded-xl px-4 py-3 text-sm font-medium shadow-sm cursor-pointer outline-none focus:ring-2 transition-all ${
                        isOverdue(selectedTask.dueDate, selectedTask.status) 
                        ? 'border-red-300 text-red-600 focus:ring-red-500 bg-red-50/30' 
                        : 'border-slate-200 text-slate-600 focus:ring-indigo-500 hover:border-indigo-300'
                    }`}
                    value={selectedTask.dueDate || ''}
                    onChange={(e) => handleUpdateDetails('dueDate', e.target.value)} 
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end">
                <button 
                    onClick={() => setSelectedTask(null)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold shadow-md hover:shadow-lg transition-all transform active:scale-95"
                >
                    Done
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};