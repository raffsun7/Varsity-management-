export type UserRole = 'admin' | 'teacher' | 'student';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  createdAt: any;
}

export interface Suggestion {
  id: string;
  title: string;
  content: string;
  type: 'notice' | 'lecture' | 'note';
  createdBy: string;
  creatorName: string;
  status: 'pending' | 'approved' | 'rejected';
  feedback?: string;
  timestamp: any;
}

export interface Notice {
  id: string;
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'urgent';
  audience: string;
  createdAt: any;
}

export interface Lecture {
  id: string;
  courseName: string;
  title: string;
  description: string;
  week: number;
  videoUrl?: string;
  fileUrl?: string;
  createdAt: any;
}

export interface Note {
  id: string;
  title: string;
  fileUrl: string;
  courseName: string;
  visibility: 'public' | 'department';
  uploadedBy: string;
  createdAt: any;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  relatedId?: string;
  userId: string;
  isRead: boolean;
  createdAt: any;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}
