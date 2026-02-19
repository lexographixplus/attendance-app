import { Attendance, Trainee, Training, User, UserRole } from '../types';

const runtimePathBase = (() => {
  const path = window.location.pathname || '/';
  return path.endsWith('/') ? path : `${path.substring(0, path.lastIndexOf('/') + 1)}`;
})();

const API_BASE =
  ((import.meta as any).env?.VITE_API_BASE_URL as string | undefined) ||
  `${runtimePathBase}api/index.php`;

type HttpMethod = 'GET' | 'POST';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

const toQueryString = (params: Record<string, string | undefined>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      search.set(key, value);
    }
  });
  return search.toString();
};

const request = async <T>(
  action: string,
  method: HttpMethod = 'GET',
  payload?: unknown,
  query?: Record<string, string | undefined>
): Promise<T> => {
  const qs = toQueryString({ action, ...(query || {}) });
  const url = `${API_BASE}?${qs}`;

  const storedUser = localStorage.getItem('traintrack_user');
  let token = '';
  if (storedUser) {
    try {
      token = JSON.parse(storedUser).apiToken || '';
    } catch {}
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (method === 'POST') {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: method === 'POST' ? JSON.stringify(payload || {}) : undefined,
  });

  const raw = await response.text();
  let parsed: ApiResponse<T> | null = null;
  try {
    parsed = JSON.parse(raw) as ApiResponse<T>;
  } catch {
    const preview = raw.trim().slice(0, 120).replace(/\s+/g, ' ');
    throw new Error(
      `Server returned non-JSON response (${response.status}). Check API path/config. ${
        preview ? `Preview: ${preview}` : ''
      }`
    );
  }

  if (!response.ok || !parsed?.success) {
    throw new Error(parsed?.error || `Request failed (${response.status}).`);
  }

  if (parsed.data === undefined) {
    return undefined as T;
  }

  return parsed.data;
};

export const initDB = async (): Promise<void> => {
  await request<void>('init');
};

// Auth + User Ops
export const getUser = async (id: string): Promise<User | undefined> => {
  try {
    return await request<User>('user_get', 'GET', undefined, { id });
  } catch {
    return undefined;
  }
};

export const getUsers = async (workspaceId?: string, actorId?: string): Promise<User[]> => {
  return request<User[]>('users', 'GET', undefined, { workspaceId, actorId });
};

export const signUp = async (name: string, email: string, password: string): Promise<User> => {
  return request<User>('signup', 'POST', { name, email, password });
};

export const login = async (email: string, password: string): Promise<User | null> => {
  try {
    return await request<User>('login', 'POST', { email, password });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Login failed.';
    if (message.toLowerCase().includes('invalid email or password')) {
      return null;
    }
    throw err;
  }
};

export const createUser = async (
  actor: User,
  userData: Pick<User, 'name' | 'email' | 'passwordHash'>
): Promise<User> => {
  return request<User>('users_create', 'POST', {
    actorId: actor.id,
    name: userData.name,
    email: userData.email,
    password: userData.passwordHash,
  });
};

export const deleteUser = async (actor: User, workspaceId: string, id: string): Promise<void> => {
  await request<void>('users_delete', 'POST', { actorId: actor.id, workspaceId, id });
};

export const promoteUser = async (actor: User, workspaceId: string, id: string, newRole: UserRole): Promise<void> => {
  await request<void>('users_promote', 'POST', { actorId: actor.id, workspaceId, id, newRole });
};

// Training Ops
export const getTrainings = async (workspaceId: string, adminId?: string): Promise<Training[]> => {
  return request<Training[]>('trainings', 'GET', undefined, { workspaceId, adminId });
};

export const createTraining = async (workspaceId: string, training: Omit<Training, 'id'>): Promise<Training> => {
  return request<Training>('trainings_create', 'POST', { workspaceId, training });
};

export const updateTraining = async (workspaceId: string, id: string, data: Partial<Training>): Promise<void> => {
  await request<void>('trainings_update', 'POST', { workspaceId, id, data });
};

export const deleteTraining = async (workspaceId: string, id: string): Promise<void> => {
  await request<void>('trainings_delete', 'POST', { workspaceId, id });
};

export const getTrainingById = async (workspaceId: string, id: string): Promise<Training | undefined> => {
  const training = await request<Training | null>('training_get', 'GET', undefined, { workspaceId, id });
  return training || undefined;
};

// Trainee Ops
export const getTrainees = async (workspaceId: string, trainingId: string): Promise<Trainee[]> => {
  return request<Trainee[]>('trainees', 'GET', undefined, { workspaceId, trainingId });
};

export const addTrainee = async (workspaceId: string, trainee: Omit<Trainee, 'id' | 'uniqueCode'>): Promise<Trainee> => {
  return request<Trainee>('trainees_add', 'POST', { workspaceId, trainee });
};

export const removeTrainee = async (workspaceId: string, id: string): Promise<void> => {
  await request<void>('trainees_remove', 'POST', { workspaceId, id });
};

// Attendance Ops
export const getAttendance = async (workspaceId: string, trainingId: string): Promise<Attendance[]> => {
  return request<Attendance[]>('attendance', 'GET', undefined, { workspaceId, trainingId });
};

export const getAllAttendance = async (workspaceId: string): Promise<Attendance[]> => {
  return request<Attendance[]>('attendance_all', 'GET', undefined, { workspaceId });
};

export const markAttendance = async (
  workspaceId: string,
  trainingId: string,
  email: string
): Promise<{ success: boolean; message: string; traineeName?: string }> => {
  try {
    return await request<{ success: boolean; message: string; traineeName?: string }>('attendance_mark', 'POST', {
      workspaceId,
      trainingId,
      email,
    });
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Unable to mark attendance.',
    };
  }
};
