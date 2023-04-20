export enum FieldType {
  integer = 'number',
  string = 'string',
  array = '[]'
}

export type FieldTypeKey =  keyof typeof FieldType

