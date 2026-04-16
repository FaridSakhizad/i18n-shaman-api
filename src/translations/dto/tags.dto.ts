export class CreateTagDto {
  projectId: string;
  tagName: string;
}

export class AddTagsToEntityDto {
  projectId: string;
  entityIds: string[];
  tagName: string;
  color: string;
}

export class AssignTagToEntitiesDto {
  projectId: string;
  entityIds: string[];
  tagId: string;
}

export class DeleteTagDto {
  projectId: string;
  tagId: string;
}

export class EditTagDto {
  projectId: string;
  id: string;
  name: string;
  color: string;
  customColor: string;
}
