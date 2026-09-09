export class CreateEntityDto {
  projectId: string;
  parentId: string;
  id: string;
  label: string;
  values: [
    {
      id: string;
      languageId: string;
      value: string;
    },
  ];
  description: string;
  type: string;
  pathCache: string;
}
