export interface AttributeValue {
  id: string;
  attributeId: string;
  value: string;
  position: number;
  isActive: boolean;
}

export interface Attribute {
  id: string;
  name: string;
  position: number;
  isActive: boolean;
  values: AttributeValue[];
}

export interface CreateAttributePayload {
  name: string;
  isActive?: boolean;
}

export type UpdateAttributePayload = Partial<CreateAttributePayload>;

export interface AddAttributeValuePayload {
  value: string;
}

export interface UpdateAttributeValuePayload {
  value?: string;
  isActive?: boolean;
}

export interface ReorderPayload {
  ids: string[];
}
