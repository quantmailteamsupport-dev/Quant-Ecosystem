// ============================================================================
// Quant Developer Platform - GraphQL Schema Builder
// ============================================================================

import {
  GraphQLTypeDef,
  GraphQLField,
  GraphQLArg,
  GraphQLResolver,
  GraphQLQuery,
  GraphQLMutation,
  GraphQLSubscription,
  SchemaConfig,
} from '../types';

// ============================================================================
// GraphQL Schema Builder Class
// ============================================================================

export class GraphQLSchemaBuilder {
  private types: Map<string, GraphQLTypeDef> = new Map();
  private queries: Map<string, GraphQLQuery> = new Map();
  private mutations: Map<string, GraphQLMutation> = new Map();
  private subscriptions: Map<string, GraphQLSubscription> = new Map();
  private resolvers: Map<string, GraphQLResolver> = new Map();
  private fieldPermissions: Map<string, string[]> = new Map(); // typeName.fieldName -> permissions
  private config: SchemaConfig;

  constructor(config?: Partial<SchemaConfig>) {
    this.config = {
      queryTypeName: config?.queryTypeName || 'Query',
      mutationTypeName: config?.mutationTypeName || 'Mutation',
      subscriptionTypeName: config?.subscriptionTypeName || 'Subscription',
      enableIntrospection: config?.enableIntrospection !== false,
      maxDepth: config?.maxDepth || 10,
      maxComplexity: config?.maxComplexity || 1000,
    };
  }

  /**
   * Define an object type with fields and descriptions
   */
  public defineType(params: {
    name: string;
    fields: GraphQLField[];
    description?: string;
    implements?: string[];
  }): GraphQLTypeDef {
    const typeDef: GraphQLTypeDef = {
      name: params.name,
      kind: 'object',
      fields: params.fields,
      description: params.description,
      implements: params.implements,
    };

    this.types.set(params.name, typeDef);
    return typeDef;
  }

  /**
   * Define an input type for mutations
   */
  public defineInput(params: {
    name: string;
    fields: GraphQLField[];
    description?: string;
  }): GraphQLTypeDef {
    const typeDef: GraphQLTypeDef = {
      name: params.name,
      kind: 'input',
      fields: params.fields,
      description: params.description,
    };

    this.types.set(params.name, typeDef);
    return typeDef;
  }

  /**
   * Define an enum type
   */
  public defineEnum(params: {
    name: string;
    values: string[];
    description?: string;
  }): GraphQLTypeDef {
    const fields: GraphQLField[] = params.values.map(value => ({
      name: value,
      type: 'EnumValue',
      nullable: false,
      isList: false,
    }));

    const typeDef: GraphQLTypeDef = {
      name: params.name,
      kind: 'enum',
      fields,
      description: params.description,
    };

    this.types.set(params.name, typeDef);
    return typeDef;
  }

  /**
   * Define an interface type
   */
  public defineInterface(params: {
    name: string;
    fields: GraphQLField[];
    description?: string;
  }): GraphQLTypeDef {
    const typeDef: GraphQLTypeDef = {
      name: params.name,
      kind: 'interface',
      fields: params.fields,
      description: params.description,
    };

    this.types.set(params.name, typeDef);
    return typeDef;
  }

  /**
   * Add a query field with args, return type, and resolver
   */
  public addQuery(params: {
    name: string;
    args: GraphQLArg[];
    returnType: string;
    resolver: (parent: unknown, args: Record<string, unknown>, context: unknown) => unknown;
    description?: string;
    permissions?: string[];
  }): GraphQLQuery {
    const resolverDef: GraphQLResolver = {
      typeName: this.config.queryTypeName,
      fieldName: params.name,
      handler: params.resolver,
    };

    const query: GraphQLQuery = {
      name: params.name,
      returnType: params.returnType,
      args: params.args,
      resolver: resolverDef,
      description: params.description,
      permissions: params.permissions,
    };

    this.queries.set(params.name, query);
    this.resolvers.set(`${this.config.queryTypeName}.${params.name}`, resolverDef);
    return query;
  }

  /**
   * Add a mutation with input type, return type, and resolver
   */
  public addMutation(params: {
    name: string;
    inputType: string;
    returnType: string;
    resolver: (parent: unknown, args: Record<string, unknown>, context: unknown) => unknown;
    description?: string;
    permissions?: string[];
  }): GraphQLMutation {
    const resolverDef: GraphQLResolver = {
      typeName: this.config.mutationTypeName,
      fieldName: params.name,
      handler: params.resolver,
    };

    const mutation: GraphQLMutation = {
      name: params.name,
      inputType: params.inputType,
      returnType: params.returnType,
      resolver: resolverDef,
      description: params.description,
      permissions: params.permissions,
    };

    this.mutations.set(params.name, mutation);
    this.resolvers.set(`${this.config.mutationTypeName}.${params.name}`, resolverDef);
    return mutation;
  }

  /**
   * Add a subscription with filter and resolver
   */
  public addSubscription(params: {
    name: string;
    returnType: string;
    filter?: string;
    resolver: (parent: unknown, args: Record<string, unknown>, context: unknown) => unknown;
    description?: string;
  }): GraphQLSubscription {
    const resolverDef: GraphQLResolver = {
      typeName: this.config.subscriptionTypeName,
      fieldName: params.name,
      handler: params.resolver,
    };

    const subscription: GraphQLSubscription = {
      name: params.name,
      returnType: params.returnType,
      filter: params.filter,
      resolver: resolverDef,
      description: params.description,
    };

    this.subscriptions.set(params.name, subscription);
    this.resolvers.set(`${this.config.subscriptionTypeName}.${params.name}`, resolverDef);
    return subscription;
  }

  /**
   * Build the complete schema string (SDL format)
   */
  public buildSchema(): string {
    const parts: string[] = [];

    // Scalar types
    parts.push('scalar DateTime');
    parts.push('scalar JSON');
    parts.push('');

    // Enum types
    const enums = Array.from(this.types.values()).filter(t => t.kind === 'enum');
    for (const enumType of enums) {
      if (enumType.description) parts.push(`"""${enumType.description}"""`);
      parts.push(`enum ${enumType.name} {`);
      for (const field of enumType.fields) {
        parts.push(`  ${field.name}`);
      }
      parts.push('}');
      parts.push('');
    }

    // Interface types
    const interfaces = Array.from(this.types.values()).filter(t => t.kind === 'interface');
    for (const iface of interfaces) {
      if (iface.description) parts.push(`"""${iface.description}"""`);
      parts.push(`interface ${iface.name} {`);
      for (const field of iface.fields) {
        parts.push(`  ${this.formatField(field)}`);
      }
      parts.push('}');
      parts.push('');
    }

    // Input types
    const inputs = Array.from(this.types.values()).filter(t => t.kind === 'input');
    for (const input of inputs) {
      if (input.description) parts.push(`"""${input.description}"""`);
      parts.push(`input ${input.name} {`);
      for (const field of input.fields) {
        parts.push(`  ${this.formatField(field)}`);
      }
      parts.push('}');
      parts.push('');
    }

    // Object types
    const objects = Array.from(this.types.values()).filter(t => t.kind === 'object');
    for (const obj of objects) {
      if (obj.description) parts.push(`"""${obj.description}"""`);
      const implementsStr = obj.implements && obj.implements.length > 0
        ? ` implements ${obj.implements.join(' & ')}`
        : '';
      parts.push(`type ${obj.name}${implementsStr} {`);
      for (const field of obj.fields) {
        parts.push(`  ${this.formatField(field)}`);
      }
      parts.push('}');
      parts.push('');
    }

    // Query type
    if (this.queries.size > 0) {
      parts.push(`type ${this.config.queryTypeName} {`);
      for (const query of this.queries.values()) {
        const argsStr = this.formatArgs(query.args);
        const desc = query.description ? `  """${query.description}"""\n` : '';
        parts.push(`${desc}  ${query.name}${argsStr}: ${query.returnType}`);
      }
      parts.push('}');
      parts.push('');
    }

    // Mutation type
    if (this.mutations.size > 0) {
      parts.push(`type ${this.config.mutationTypeName} {`);
      for (const mutation of this.mutations.values()) {
        const argsStr = `(input: ${mutation.inputType})`;
        const desc = mutation.description ? `  """${mutation.description}"""\n` : '';
        parts.push(`${desc}  ${mutation.name}${argsStr}: ${mutation.returnType}`);
      }
      parts.push('}');
      parts.push('');
    }

    // Subscription type
    if (this.subscriptions.size > 0) {
      parts.push(`type ${this.config.subscriptionTypeName} {`);
      for (const sub of this.subscriptions.values()) {
        const desc = sub.description ? `  """${sub.description}"""\n` : '';
        parts.push(`${desc}  ${sub.name}: ${sub.returnType}`);
      }
      parts.push('}');
      parts.push('');
    }

    // Schema definition
    parts.push('schema {');
    if (this.queries.size > 0) parts.push(`  query: ${this.config.queryTypeName}`);
    if (this.mutations.size > 0) parts.push(`  mutation: ${this.config.mutationTypeName}`);
    if (this.subscriptions.size > 0) parts.push(`  subscription: ${this.config.subscriptionTypeName}`);
    parts.push('}');

    return parts.join('\n');
  }

  private formatField(field: GraphQLField): string {
    let typeStr = field.type;
    if (field.isList) typeStr = `[${typeStr}]`;
    if (!field.nullable) typeStr = `${typeStr}!`;

    let argsStr = '';
    if (field.args && field.args.length > 0) {
      argsStr = this.formatArgs(field.args);
    }

    const deprecation = field.deprecation ? ` @deprecated(reason: "${field.deprecation}")` : '';
    const description = field.description ? `"""${field.description}""" ` : '';

    return `${description}${field.name}${argsStr}: ${typeStr}${deprecation}`;
  }

  private formatArgs(args: GraphQLArg[]): string {
    if (args.length === 0) return '';
    const argStrs = args.map(arg => {
      let typeStr = arg.type;
      if (!arg.nullable) typeStr = `${typeStr}!`;
      const defaultStr = arg.defaultValue !== undefined ? ` = ${JSON.stringify(arg.defaultValue)}` : '';
      return `${arg.name}: ${typeStr}${defaultStr}`;
    });
    return `(${argStrs.join(', ')})`;
  }

  /**
   * Add field-level permission control
   */
  public addFieldPermission(typeName: string, fieldName: string, permissions: string[]): void {
    const key = `${typeName}.${fieldName}`;
    this.fieldPermissions.set(key, permissions);
  }

  /**
   * Check if a field is accessible with given permissions
   */
  public checkFieldAccess(typeName: string, fieldName: string, userPermissions: string[]): boolean {
    const key = `${typeName}.${fieldName}`;
    const required = this.fieldPermissions.get(key);
    if (!required || required.length === 0) return true;
    return required.some(perm => userPermissions.includes(perm));
  }

  /**
   * Stitch multiple schemas together with conflict resolution
   */
  public stitchSchemas(other: GraphQLSchemaBuilder, options?: { prefix?: string; conflictResolution?: 'keep' | 'override' | 'rename' }): void {
    const prefix = options?.prefix || '';
    const resolution = options?.conflictResolution || 'keep';

    // Merge types
    for (const [name, typeDef] of other.types.entries()) {
      const targetName = prefix ? `${prefix}_${name}` : name;
      if (this.types.has(targetName)) {
        if (resolution === 'override') {
          this.types.set(targetName, { ...typeDef, name: targetName });
        } else if (resolution === 'rename') {
          this.types.set(`${targetName}_merged`, { ...typeDef, name: `${targetName}_merged` });
        }
        // 'keep' means do nothing
      } else {
        this.types.set(targetName, { ...typeDef, name: targetName });
      }
    }

    // Merge queries
    for (const [name, query] of other.queries.entries()) {
      const targetName = prefix ? `${prefix}_${name}` : name;
      if (!this.queries.has(targetName) || resolution === 'override') {
        this.queries.set(targetName, { ...query, name: targetName });
      }
    }

    // Merge mutations
    for (const [name, mutation] of other.mutations.entries()) {
      const targetName = prefix ? `${prefix}_${name}` : name;
      if (!this.mutations.has(targetName) || resolution === 'override') {
        this.mutations.set(targetName, { ...mutation, name: targetName });
      }
    }

    // Merge subscriptions
    for (const [name, subscription] of other.subscriptions.entries()) {
      const targetName = prefix ? `${prefix}_${name}` : name;
      if (!this.subscriptions.has(targetName) || resolution === 'override') {
        this.subscriptions.set(targetName, { ...subscription, name: targetName });
      }
    }
  }

  /**
   * Return schema introspection result
   */
  public introspect(): {
    types: GraphQLTypeDef[];
    queries: GraphQLQuery[];
    mutations: GraphQLMutation[];
    subscriptions: GraphQLSubscription[];
    config: SchemaConfig;
    fieldPermissions: Record<string, string[]>;
  } {
    if (!this.config.enableIntrospection) {
      throw new Error('Introspection is disabled for this schema');
    }

    return {
      types: Array.from(this.types.values()),
      queries: Array.from(this.queries.values()),
      mutations: Array.from(this.mutations.values()),
      subscriptions: Array.from(this.subscriptions.values()),
      config: { ...this.config },
      fieldPermissions: Object.fromEntries(this.fieldPermissions),
    };
  }

  /**
   * Get a specific type definition
   */
  public getType(name: string): GraphQLTypeDef | null {
    return this.types.get(name) || null;
  }

  /**
   * Get resolver for a specific type and field
   */
  public getResolver(typeName: string, fieldName: string): GraphQLResolver | null {
    return this.resolvers.get(`${typeName}.${fieldName}`) || null;
  }

  /**
   * Validate query depth against max depth configuration
   */
  public validateDepth(depth: number): boolean {
    return depth <= this.config.maxDepth;
  }

  /**
   * Validate query complexity against max complexity
   */
  public validateComplexity(complexity: number): boolean {
    return complexity <= this.config.maxComplexity;
  }
}
