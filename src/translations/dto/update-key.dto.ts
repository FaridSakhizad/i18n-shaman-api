export class UpdateKeyDto {
  id: string;
  projectId: string;
  parentId: string;
  label: string;
  description: string;
  values: [
    {
      id: string;
      languageId: string;
      value: string;
      pathCache?: string;
    },
  ];
}
