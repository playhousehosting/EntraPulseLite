import { EventEmitter } from 'events';

export enum Role {
  SUPER_ADMIN = 'super_admin',
  MSP_ADMIN = 'msp_admin', 
  TENANT_ADMIN = 'tenant_admin',
  TENANT_USER = 'tenant_user',
  READ_ONLY = 'read_only',
  CUSTOM = 'custom'
}

export enum Permission {
  // Tenant Management
  TENANT_CREATE = 'tenant:create',
  TENANT_DELETE = 'tenant:delete',
  TENANT_UPDATE = 'tenant:update',
  TENANT_VIEW = 'tenant:view',
  TENANT_SWITCH = 'tenant:switch',

  // User Management
  USER_CREATE = 'user:create',
  USER_DELETE = 'user:delete',
  USER_UPDATE = 'user:update',
  USER_VIEW = 'user:view',
  USER_ASSIGN_LICENSES = 'user:assign_licenses',

  // Group Management
  GROUP_CREATE = 'group:create',
  GROUP_DELETE = 'group:delete',
  GROUP_UPDATE = 'group:update',
  GROUP_VIEW = 'group:view',
  GROUP_MANAGE_MEMBERS = 'group:manage_members',

  // Security & Compliance
  SECURITY_VIEW = 'security:view',
  SECURITY_MANAGE = 'security:manage',
  COMPLIANCE_VIEW = 'compliance:view',
  COMPLIANCE_MANAGE = 'compliance:manage',
  CONDITIONAL_ACCESS_VIEW = 'conditional_access:view',
  CONDITIONAL_ACCESS_MANAGE = 'conditional_access:manage',

  // Applications
  APP_VIEW = 'app:view',
  APP_MANAGE = 'app:manage',
  APP_ASSIGN = 'app:assign',

  // Reports & Analytics
  REPORTS_VIEW = 'reports:view',
  REPORTS_GENERATE = 'reports:generate',
  REPORTS_EXPORT = 'reports:export',
  REPORTS_SCHEDULE = 'reports:schedule',
  ANALYTICS_VIEW = 'analytics:view',

  // Templates & Automation
  TEMPLATES_VIEW = 'templates:view',
  TEMPLATES_EXECUTE = 'templates:execute',
  TEMPLATES_MANAGE = 'templates:manage',
  AUTOMATION_VIEW = 'automation:view',
  AUTOMATION_MANAGE = 'automation:manage',

  // Configuration
  CONFIG_VIEW = 'config:view',
  CONFIG_UPDATE = 'config:update',
  MSP_CONFIG = 'msp:config',

  // Billing & Usage
  BILLING_VIEW = 'billing:view',
  BILLING_MANAGE = 'billing:manage',
  USAGE_VIEW = 'usage:view',

  // System Administration
  SYSTEM_ADMIN = 'system:admin',
  AUDIT_LOG_VIEW = 'audit:view',
  ROLE_MANAGE = 'role:manage'
}

export interface RoleDefinition {
  id: Role;
  name: string;
  description: string;
  permissions: Permission[];
  canAssignTo?: Role[];
  inheritsFrom?: Role;
  isSystemRole: boolean;
  tenantScoped: boolean;
}

export interface UserRole {
  userId: string;
  role: Role;
  permissions: Permission[];
  tenantId?: string;
  assignedBy: string;
  assignedAt: Date;
  expiresAt?: Date;
  customPermissions?: Permission[];
}

export interface RoleAssignment {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  role: Role;
  tenantId?: string;
  tenantName?: string;
  assignedBy: string;
  assignedAt: Date;
  expiresAt?: Date;
  isActive: boolean;
  source: 'manual' | 'inherited' | 'automatic';
}

export interface PermissionCheck {
  userId: string;
  permission: Permission;
  tenantId?: string;
  resourceId?: string;
}

export interface AccessContext {
  userId: string;
  tenantId?: string;
  roles: Role[];
  permissions: Permission[];
  effectivePermissions: Permission[];
}

export class RBACService extends EventEmitter {
  private roleDefinitions: Map<Role, RoleDefinition> = new Map();
  private userRoles: Map<string, UserRole[]> = new Map();
  private roleHierarchy: Map<Role, Role[]> = new Map();
  private permissionCache: Map<string, Permission[]> = new Map();

  constructor() {
    super();
    this.initializeSystemRoles();
  }

  private initializeSystemRoles(): void {
    const systemRoles: RoleDefinition[] = [
      {
        id: Role.SUPER_ADMIN,
        name: 'Super Administrator',
        description: 'Full system access across all tenants and MSP operations',
        permissions: Object.values(Permission),
        isSystemRole: true,
        tenantScoped: false
      },
      {
        id: Role.MSP_ADMIN,
        name: 'MSP Administrator',
        description: 'Full administrative access within MSP environment',
        permissions: [
          Permission.TENANT_CREATE,
          Permission.TENANT_DELETE,
          Permission.TENANT_UPDATE,
          Permission.TENANT_VIEW,
          Permission.TENANT_SWITCH,
          Permission.USER_VIEW,
          Permission.USER_UPDATE,
          Permission.GROUP_VIEW,
          Permission.GROUP_UPDATE,
          Permission.SECURITY_VIEW,
          Permission.SECURITY_MANAGE,
          Permission.COMPLIANCE_VIEW,
          Permission.COMPLIANCE_MANAGE,
          Permission.APP_VIEW,
          Permission.APP_MANAGE,
          Permission.REPORTS_VIEW,
          Permission.REPORTS_GENERATE,
          Permission.REPORTS_EXPORT,
          Permission.REPORTS_SCHEDULE,
          Permission.ANALYTICS_VIEW,
          Permission.TEMPLATES_VIEW,
          Permission.TEMPLATES_EXECUTE,
          Permission.TEMPLATES_MANAGE,
          Permission.AUTOMATION_VIEW,
          Permission.AUTOMATION_MANAGE,
          Permission.CONFIG_VIEW,
          Permission.MSP_CONFIG,
          Permission.BILLING_VIEW,
          Permission.BILLING_MANAGE,
          Permission.USAGE_VIEW,
          Permission.AUDIT_LOG_VIEW,
          Permission.ROLE_MANAGE
        ],
        canAssignTo: [Role.TENANT_ADMIN, Role.TENANT_USER, Role.READ_ONLY],
        isSystemRole: true,
        tenantScoped: false
      },
      {
        id: Role.TENANT_ADMIN,
        name: 'Tenant Administrator',
        description: 'Full administrative access within assigned tenant',
        permissions: [
          Permission.TENANT_VIEW,
          Permission.USER_CREATE,
          Permission.USER_DELETE,
          Permission.USER_UPDATE,
          Permission.USER_VIEW,
          Permission.USER_ASSIGN_LICENSES,
          Permission.GROUP_CREATE,
          Permission.GROUP_DELETE,
          Permission.GROUP_UPDATE,
          Permission.GROUP_VIEW,
          Permission.GROUP_MANAGE_MEMBERS,
          Permission.SECURITY_VIEW,
          Permission.SECURITY_MANAGE,
          Permission.COMPLIANCE_VIEW,
          Permission.CONDITIONAL_ACCESS_VIEW,
          Permission.CONDITIONAL_ACCESS_MANAGE,
          Permission.APP_VIEW,
          Permission.APP_MANAGE,
          Permission.APP_ASSIGN,
          Permission.REPORTS_VIEW,
          Permission.REPORTS_GENERATE,
          Permission.REPORTS_EXPORT,
          Permission.ANALYTICS_VIEW,
          Permission.TEMPLATES_VIEW,
          Permission.TEMPLATES_EXECUTE,
          Permission.AUTOMATION_VIEW,
          Permission.CONFIG_VIEW,
          Permission.USAGE_VIEW
        ],
        canAssignTo: [Role.TENANT_USER, Role.READ_ONLY],
        isSystemRole: true,
        tenantScoped: true
      },
      {
        id: Role.TENANT_USER,
        name: 'Tenant User',
        description: 'Standard user access within assigned tenant',
        permissions: [
          Permission.TENANT_VIEW,
          Permission.USER_VIEW,
          Permission.GROUP_VIEW,
          Permission.SECURITY_VIEW,
          Permission.COMPLIANCE_VIEW,
          Permission.APP_VIEW,
          Permission.REPORTS_VIEW,
          Permission.ANALYTICS_VIEW,
          Permission.TEMPLATES_VIEW,
          Permission.TEMPLATES_EXECUTE,
          Permission.USAGE_VIEW
        ],
        isSystemRole: true,
        tenantScoped: true
      },
      {
        id: Role.READ_ONLY,
        name: 'Read Only',
        description: 'View-only access to assigned resources',
        permissions: [
          Permission.TENANT_VIEW,
          Permission.USER_VIEW,
          Permission.GROUP_VIEW,
          Permission.SECURITY_VIEW,
          Permission.COMPLIANCE_VIEW,
          Permission.APP_VIEW,
          Permission.REPORTS_VIEW,
          Permission.ANALYTICS_VIEW,
          Permission.TEMPLATES_VIEW,
          Permission.USAGE_VIEW
        ],
        isSystemRole: true,
        tenantScoped: true
      }
    ];

    systemRoles.forEach(role => {
      this.roleDefinitions.set(role.id, role);
    });

    // Set up role hierarchy for inheritance
    this.roleHierarchy.set(Role.SUPER_ADMIN, []);
    this.roleHierarchy.set(Role.MSP_ADMIN, [Role.SUPER_ADMIN]);
    this.roleHierarchy.set(Role.TENANT_ADMIN, [Role.MSP_ADMIN]);
    this.roleHierarchy.set(Role.TENANT_USER, [Role.TENANT_ADMIN]);
    this.roleHierarchy.set(Role.READ_ONLY, [Role.TENANT_USER]);
  }

  // Role Management
  getRoleDefinition(role: Role): RoleDefinition | undefined {
    return this.roleDefinitions.get(role);
  }

  getAllRoles(): RoleDefinition[] {
    return Array.from(this.roleDefinitions.values());
  }

  getSystemRoles(): RoleDefinition[] {
    return Array.from(this.roleDefinitions.values()).filter(role => role.isSystemRole);
  }

  getCustomRoles(): RoleDefinition[] {
    return Array.from(this.roleDefinitions.values()).filter(role => !role.isSystemRole);
  }

  createCustomRole(roleDefinition: Omit<RoleDefinition, 'isSystemRole'>): void {
    const customRole: RoleDefinition = {
      ...roleDefinition,
      isSystemRole: false
    };

    this.roleDefinitions.set(customRole.id, customRole);
    this.emit('roleCreated', customRole);
  }

  updateRole(roleId: Role, updates: Partial<RoleDefinition>): boolean {
    const role = this.roleDefinitions.get(roleId);
    if (!role || role.isSystemRole) {
      return false; // Cannot modify system roles
    }

    const updatedRole = { ...role, ...updates };
    this.roleDefinitions.set(roleId, updatedRole);
    this.clearPermissionCache();
    this.emit('roleUpdated', updatedRole);
    return true;
  }

  deleteRole(roleId: Role): boolean {
    const role = this.roleDefinitions.get(roleId);
    if (!role || role.isSystemRole) {
      return false; // Cannot delete system roles
    }

    // Remove all assignments of this role
    const affectedUsers: string[] = [];
    for (const [userId, userRoles] of this.userRoles.entries()) {
      const filteredRoles = userRoles.filter(ur => ur.role !== roleId);
      if (filteredRoles.length !== userRoles.length) {
        this.userRoles.set(userId, filteredRoles);
        affectedUsers.push(userId);
      }
    }

    this.roleDefinitions.delete(roleId);
    this.clearPermissionCache();
    
    this.emit('roleDeleted', { roleId, affectedUsers });
    return true;
  }

  // User Role Assignment
  assignRole(userId: string, role: Role, assignedBy: string, tenantId?: string, expiresAt?: Date): boolean {
    const roleDefinition = this.roleDefinitions.get(role);
    if (!roleDefinition) {
      return false;
    }

    // Check if role requires tenant scope
    if (roleDefinition.tenantScoped && !tenantId) {
      return false;
    }

    const userRole: UserRole = {
      userId,
      role,
      permissions: [...roleDefinition.permissions],
      tenantId,
      assignedBy,
      assignedAt: new Date(),
      expiresAt
    };

    const existingRoles = this.userRoles.get(userId) || [];
    
    // Remove any existing assignment of the same role for the same tenant
    const filteredRoles = existingRoles.filter(ur => 
      !(ur.role === role && ur.tenantId === tenantId)
    );
    
    filteredRoles.push(userRole);
    this.userRoles.set(userId, filteredRoles);
    
    this.clearUserPermissionCache(userId);
    this.emit('roleAssigned', { userId, role, tenantId, assignedBy });
    
    return true;
  }

  revokeRole(userId: string, role: Role, tenantId?: string): boolean {
    const userRoles = this.userRoles.get(userId);
    if (!userRoles) {
      return false;
    }

    const initialLength = userRoles.length;
    const filteredRoles = userRoles.filter(ur => 
      !(ur.role === role && ur.tenantId === tenantId)
    );

    if (filteredRoles.length === initialLength) {
      return false; // Role was not assigned
    }

    this.userRoles.set(userId, filteredRoles);
    this.clearUserPermissionCache(userId);
    this.emit('roleRevoked', { userId, role, tenantId });
    
    return true;
  }

  getUserRoles(userId: string, tenantId?: string): UserRole[] {
    const userRoles = this.userRoles.get(userId) || [];
    
    if (tenantId) {
      return userRoles.filter(ur => 
        ur.tenantId === tenantId || !this.roleDefinitions.get(ur.role)?.tenantScoped
      );
    }
    
    return userRoles;
  }

  getAllRoleAssignments(): RoleAssignment[] {
    const assignments: RoleAssignment[] = [];
    
    for (const [userId, userRoles] of this.userRoles.entries()) {
      for (const userRole of userRoles) {
        assignments.push({
          id: `${userId}-${userRole.role}-${userRole.tenantId || 'global'}`,
          userId,
          userEmail: '', // Would be populated from user data
          userName: '', // Would be populated from user data
          role: userRole.role,
          tenantId: userRole.tenantId,
          tenantName: '', // Would be populated from tenant data
          assignedBy: userRole.assignedBy,
          assignedAt: userRole.assignedAt,
          expiresAt: userRole.expiresAt,
          isActive: !userRole.expiresAt || userRole.expiresAt > new Date(),
          source: 'manual'
        });
      }
    }
    
    return assignments;
  }

  // Permission Checking
  hasPermission(userId: string, permission: Permission, tenantId?: string): boolean {
    const userPermissions = this.getUserEffectivePermissions(userId, tenantId);
    return userPermissions.includes(permission);
  }

  hasAnyPermission(userId: string, permissions: Permission[], tenantId?: string): boolean {
    const userPermissions = this.getUserEffectivePermissions(userId, tenantId);
    return permissions.some(permission => userPermissions.includes(permission));
  }

  hasAllPermissions(userId: string, permissions: Permission[], tenantId?: string): boolean {
    const userPermissions = this.getUserEffectivePermissions(userId, tenantId);
    return permissions.every(permission => userPermissions.includes(permission));
  }

  getUserEffectivePermissions(userId: string, tenantId?: string): Permission[] {
    const cacheKey = `${userId}-${tenantId || 'global'}`;
    const cached = this.permissionCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const userRoles = this.getUserRoles(userId, tenantId);
    const permissions = new Set<Permission>();

    for (const userRole of userRoles) {
      // Add direct permissions
      userRole.permissions.forEach(permission => permissions.add(permission));
      
      // Add custom permissions if any
      if (userRole.customPermissions) {
        userRole.customPermissions.forEach(permission => permissions.add(permission));
      }

      // Add inherited permissions
      const inheritedPermissions = this.getInheritedPermissions(userRole.role);
      inheritedPermissions.forEach(permission => permissions.add(permission));
    }

    const effectivePermissions = Array.from(permissions);
    this.permissionCache.set(cacheKey, effectivePermissions);
    
    return effectivePermissions;
  }

  private getInheritedPermissions(role: Role): Permission[] {
    const parentRoles = this.roleHierarchy.get(role) || [];
    const permissions = new Set<Permission>();

    for (const parentRole of parentRoles) {
      const parentDefinition = this.roleDefinitions.get(parentRole);
      if (parentDefinition) {
        parentDefinition.permissions.forEach(permission => permissions.add(permission));
        
        // Recursively get inherited permissions
        const inheritedPermissions = this.getInheritedPermissions(parentRole);
        inheritedPermissions.forEach(permission => permissions.add(permission));
      }
    }

    return Array.from(permissions);
  }

  getAccessContext(userId: string, tenantId?: string): AccessContext {
    const userRoles = this.getUserRoles(userId, tenantId);
    const roles = userRoles.map(ur => ur.role);
    const permissions = userRoles.flatMap(ur => ur.permissions);
    const effectivePermissions = this.getUserEffectivePermissions(userId, tenantId);

    return {
      userId,
      tenantId,
      roles,
      permissions,
      effectivePermissions
    };
  }

  // Bulk Operations
  bulkAssignRole(userIds: string[], role: Role, assignedBy: string, tenantId?: string): { successful: string[], failed: string[] } {
    const successful: string[] = [];
    const failed: string[] = [];

    for (const userId of userIds) {
      if (this.assignRole(userId, role, assignedBy, tenantId)) {
        successful.push(userId);
      } else {
        failed.push(userId);
      }
    }

    return { successful, failed };
  }

  bulkRevokeRole(userIds: string[], role: Role, tenantId?: string): { successful: string[], failed: string[] } {
    const successful: string[] = [];
    const failed: string[] = [];

    for (const userId of userIds) {
      if (this.revokeRole(userId, role, tenantId)) {
        successful.push(userId);
      } else {
        failed.push(userId);
      }
    }

    return { successful, failed };
  }

  // Audit and Compliance
  getRoleAuditLog(): any[] {
    // In a real implementation, this would return audit log entries
    return [];
  }

  getPermissionMatrix(): Record<Role, Permission[]> {
    const matrix: Record<Role, Permission[]> = {} as Record<Role, Permission[]>;
    
    for (const [role, definition] of this.roleDefinitions.entries()) {
      matrix[role] = definition.permissions;
    }
    
    return matrix;
  }

  validateRoleAssignment(userId: string, role: Role, tenantId?: string): { valid: boolean; reason?: string } {
    const roleDefinition = this.roleDefinitions.get(role);
    
    if (!roleDefinition) {
      return { valid: false, reason: 'Role does not exist' };
    }

    if (roleDefinition.tenantScoped && !tenantId) {
      return { valid: false, reason: 'Role requires tenant scope' };
    }

    if (!roleDefinition.tenantScoped && tenantId) {
      return { valid: false, reason: 'Role cannot be tenant-scoped' };
    }

    return { valid: true };
  }

  // Cache Management
  private clearPermissionCache(): void {
    this.permissionCache.clear();
  }

  private clearUserPermissionCache(userId: string): void {
    const keysToDelete = Array.from(this.permissionCache.keys()).filter(key => 
      key.startsWith(`${userId}-`)
    );
    
    keysToDelete.forEach(key => this.permissionCache.delete(key));
  }

  // Export/Import
  exportConfiguration(): any {
    return {
      roleDefinitions: Object.fromEntries(this.roleDefinitions),
      userRoles: Object.fromEntries(this.userRoles),
      roleHierarchy: Object.fromEntries(this.roleHierarchy)
    };
  }

  importConfiguration(config: any): void {
    if (config.roleDefinitions) {
      this.roleDefinitions = new Map(Object.entries(config.roleDefinitions).map(([key, value]) => [key as Role, value as RoleDefinition]));
    }
    
    if (config.userRoles) {
      this.userRoles = new Map(Object.entries(config.userRoles));
    }
    
    if (config.roleHierarchy) {
      this.roleHierarchy = new Map(Object.entries(config.roleHierarchy).map(([key, value]) => [key as Role, value as Role[]]));
    }
    
    this.clearPermissionCache();
    this.emit('configurationImported');
  }

  // Utility Methods
  canAssignRole(assignerUserId: string, targetRole: Role, tenantId?: string): boolean {
    const assignerContext = this.getAccessContext(assignerUserId, tenantId);
    
    // Super admin can assign any role
    if (assignerContext.roles.includes(Role.SUPER_ADMIN)) {
      return true;
    }

    // MSP admin can assign tenant-scoped roles
    if (assignerContext.roles.includes(Role.MSP_ADMIN)) {
      const roleDefinition = this.roleDefinitions.get(targetRole);
      return roleDefinition?.canAssignTo?.includes(targetRole) || false;
    }

    // Tenant admin can assign roles within their tenant
    if (assignerContext.roles.includes(Role.TENANT_ADMIN)) {
      const roleDefinition = this.roleDefinitions.get(Role.TENANT_ADMIN);
      return roleDefinition?.canAssignTo?.includes(targetRole) || false;
    }

    return false;
  }

  getAssignableRoles(assignerUserId: string, tenantId?: string): Role[] {
    const assignerContext = this.getAccessContext(assignerUserId, tenantId);
    const assignableRoles: Role[] = [];

    if (assignerContext.roles.includes(Role.SUPER_ADMIN)) {
      return Object.values(Role);
    }

    for (const role of assignerContext.roles) {
      const roleDefinition = this.roleDefinitions.get(role);
      if (roleDefinition?.canAssignTo) {
        assignableRoles.push(...roleDefinition.canAssignTo);
      }
    }

    return Array.from(new Set(assignableRoles));
  }
}