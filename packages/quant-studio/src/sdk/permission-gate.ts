import { Permission, PermissionDeniedError } from '../types.js';

export class PermissionGate {
  private readonly granted: Set<Permission>;

  constructor(permissions: Permission[]) {
    this.granted = new Set(permissions);
  }

  check(permission: Permission): boolean {
    return this.granted.has(permission);
  }

  enforce(permission: Permission): void {
    if (!this.granted.has(permission)) {
      throw new PermissionDeniedError(permission);
    }
  }

  listGranted(): Permission[] {
    return [...this.granted];
  }
}
