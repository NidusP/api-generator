export enum FieldType {
  integer = 'number',
  string = 'string',
  array = '[]'
}

export type FieldTypeKey =  keyof typeof FieldType

export interface ApiDoc {
  swagger: string;
  info: any;
  host: string;
  basePath: string;
  paths: Record<string, { [x: string]: ApiInfo }>;
  tags: Array<{ name: string }>;
  definitions: {
    [key: string]: {
      type: "";
      properties: Record<
        string,
        {
          type: FieldTypeKey;
        }
      >;
    };
  };
}

export type ApiInfo = {
  tags: Array<string>;
  summary: string;
  operationId: string;
  parameters?: Array<{
    name: string;
    in: "query" | "body" | "formData";
    description: string;
    required: boolean;
    type: FieldTypeKey;
    schema: {
      $ref?: string;
      type: FieldTypeKey;
      items: {
        type: FieldTypeKey;
      };
    };
    format: string;
  }>;
  responses: {
    200: {
      schema?: {
        $ref?: string;
      };
    };
  };
};