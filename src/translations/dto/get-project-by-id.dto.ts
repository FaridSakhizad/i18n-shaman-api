export type TSortBy = 'name' | 'type' | 'created' | 'updated';
export type TSortDirection = 'asc' | 'desc';

export class GetProjectByIdDto {
  projectId: string;
  page?: number;
  itemsPerPage?: number;
  userId: string;
  subFolderId?: string;
  sortBy?: TSortBy;
  sortDirection?: TSortDirection;
  filters?: string[];
  tags?: string[];
  searchQuery?: string;
  searchParams?: string[];
}
