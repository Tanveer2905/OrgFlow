export interface TaskComment {
    id: string;
    content: string;
    authorEmail: string;
    createdAt: string;
}

export interface Task {
    id: string;
    title: string;
    description: string;
    status: 'TODO' | 'IN_PROGRESS' | 'DONE';
    assigneeEmail: string;
    dueDate?: string;
    comments: TaskComment[];
}

export interface Project {
    id: string;
    name: string;
    description: string;
    status: 'ACTIVE' | 'COMPLETED' | 'ON_HOLD';
    taskCount: number;
    completionRate: number;
    completedTasks: number;
    dueDate?: string;
}