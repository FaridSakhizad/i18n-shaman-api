import { IUserPreferences } from './interfaces/user.interface';

export function normalizeUserPreferences(data: unknown): IUserPreferences {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { projectsOrder: [] };
  }

  const { projectsOrder } = data as { projectsOrder?: unknown };

  if (!Array.isArray(projectsOrder)) {
    return { projectsOrder: [] };
  }

  if (!projectsOrder.every((projectId) => typeof projectId === 'string' && projectId.length > 0)) {
    return { projectsOrder: [] };
  }

  return { projectsOrder };
}
