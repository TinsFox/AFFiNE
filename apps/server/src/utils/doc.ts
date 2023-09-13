import { registerEnumType } from '@nestjs/graphql';
import { GraphQLScalarType, Kind, ValueNode } from 'graphql';

export enum DocVariant {
  Workspace = 'workspace',
  Space = 'space',
  Settings = 'settings',
}

registerEnumType(DocVariant, {
  name: 'DocVariant',
});

export class DocID {
  raw: string;
  workspace: string;
  variant: DocVariant;
  private sub: string | null;

  static parse(raw: string): DocID | null {
    try {
      return new DocID(raw);
    } catch (e) {
      return null;
    }
  }

  /**
   * pure guid for workspace, and  `${variant}:${subId}` for subdocs
   */
  get id(): string {
    return this.variant === DocVariant.Workspace
      ? this.workspace
      : `${this.variant}:${this.sub}`;
  }

  /**
   * pure guid for workspace and subdoc without any prefix
   */
  get guid(): string {
    return this.variant === DocVariant.Workspace
      ? this.workspace
      : // sub is always truthy when variant is not workspace
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this.sub!;
  }

  get full(): string {
    return this.variant === DocVariant.Workspace
      ? this.workspace
      : `${this.workspace}:${this.variant}:${this.sub}`;
  }

  get isWorkspace(): boolean {
    return this.variant === DocVariant.Workspace;
  }

  constructor(raw: string, workspaceId?: string) {
    const parts = raw.split(':');

    if (parts.length > 3) {
      throw new Error(`Invalid format of Doc ID: ${raw}`);
    }

    // `${variant}:${guid}`
    if (parts.length === 2) {
      if (!workspaceId) {
        throw new Error('Workspace is required');
      }

      parts.unshift(workspaceId);
    }

    let workspace = parts.at(0);

    // fix for `${non-workspaceId}:${variant}:${guid}`
    if (workspaceId) {
      workspace = workspaceId;
    }

    const variant = parts.at(1);
    const docId = parts.at(2);

    if (!workspace) {
      throw new Error('Workspace is required');
    }

    if (variant) {
      if (!Object.values(DocVariant).includes(variant as any)) {
        throw new Error(`Invalid ID variant: ${variant}`);
      }

      if (!docId) {
        throw new Error('ID is required for non-workspace doc');
      }
    } else if (docId) {
      throw new Error('Variant is required for non-workspace doc');
    }

    this.raw = raw;
    this.workspace = workspace;
    this.variant = (variant as DocVariant | undefined) ?? DocVariant.Workspace;
    this.sub = docId || null;
  }

  toString() {
    return this.full;
  }

  fixWorkspace(workspaceId: string) {
    if (!this.isWorkspace && this.workspace !== workspaceId) {
      this.workspace = workspaceId;
    }
  }
}

export const DocIDScalar = new GraphQLScalarType({
  name: 'DocID',
  description: `The universal ID used to describe any entity of a workspace. For instance, a workspace itself, a page, a user setting, etc.
Either \${workspaceID} or \${workspaceID}:\${variant}:\${subDocID}`,

  /**
   * parse string value from client to DocId object
   */
  parseValue(value: unknown): DocID {
    if (typeof value !== 'string') {
      throw new Error('Invalid type of Doc ID');
    }

    return new DocID(value);
  },

  /**
   * serialize value that will be sent to the client
   */
  serialize(value: unknown): string {
    if (!(value instanceof DocID)) {
      throw new Error('Invalid type of Doc ID');
    }

    return value.toString();
  },

  parseLiteral(ast: ValueNode): DocID {
    if (ast.kind === Kind.STRING) {
      return new DocID(ast.value);
    }

    throw new Error('Invalid type of Doc ID');
  },
});
