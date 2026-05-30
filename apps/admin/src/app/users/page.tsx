'use client';

import { Card, Badge, Button } from '@quant/shared-ui';
import { useState } from 'react';

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Moderator' | 'User';
  status: 'active' | 'suspended' | 'banned';
  joinedAt: string;
  avatarInitials: string;
}

const usersData: UserRecord[] = [
  {
    id: '1',
    name: 'Alice Johnson',
    email: 'alice@quant.dev',
    role: 'Admin',
    status: 'active',
    joinedAt: '2023-06-15',
    avatarInitials: 'AJ',
  },
  {
    id: '2',
    name: 'Bob Smith',
    email: 'bob@quant.dev',
    role: 'Moderator',
    status: 'active',
    joinedAt: '2023-07-22',
    avatarInitials: 'BS',
  },
  {
    id: '3',
    name: 'Charlie Brown',
    email: 'charlie@example.com',
    role: 'User',
    status: 'active',
    joinedAt: '2023-08-10',
    avatarInitials: 'CB',
  },
  {
    id: '4',
    name: 'Diana Prince',
    email: 'diana@example.com',
    role: 'User',
    status: 'suspended',
    joinedAt: '2023-09-01',
    avatarInitials: 'DP',
  },
  {
    id: '5',
    name: 'Evan Harris',
    email: 'evan@example.com',
    role: 'User',
    status: 'active',
    joinedAt: '2023-09-15',
    avatarInitials: 'EH',
  },
  {
    id: '6',
    name: 'Fiona Green',
    email: 'fiona@example.com',
    role: 'Moderator',
    status: 'active',
    joinedAt: '2023-10-01',
    avatarInitials: 'FG',
  },
  {
    id: '7',
    name: 'George Wilson',
    email: 'george@example.com',
    role: 'User',
    status: 'banned',
    joinedAt: '2023-10-20',
    avatarInitials: 'GW',
  },
  {
    id: '8',
    name: 'Hannah Lee',
    email: 'hannah@example.com',
    role: 'User',
    status: 'active',
    joinedAt: '2023-11-05',
    avatarInitials: 'HL',
  },
];

const roleColors: Record<UserRecord['role'], string> = {
  Admin: 'bg-purple-100 text-purple-700',
  Moderator: 'bg-blue-100 text-blue-700',
  User: 'bg-gray-100 text-gray-700',
};

const statusColors: Record<UserRecord['status'], string> = {
  active: 'bg-green-100 text-green-700',
  suspended: 'bg-yellow-100 text-yellow-700',
  banned: 'bg-red-100 text-red-700',
};

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const filteredUsers = usersData.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--quant-foreground)]">Users Management</h1>
        <p className="text-sm text-[var(--quant-muted-foreground)] mt-1">
          Manage {usersData.length} registered users
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] rounded-lg border border-[var(--quant-border)] bg-[var(--quant-background)] px-4 py-2 text-sm text-[var(--quant-foreground)] placeholder:text-[var(--quant-muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-lg border border-[var(--quant-border)] bg-[var(--quant-background)] px-4 py-2 text-sm text-[var(--quant-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
        >
          <option value="all">All Roles</option>
          <option value="Admin">Admin</option>
          <option value="Moderator">Moderator</option>
          <option value="User">User</option>
        </select>
      </div>

      {/* Users Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--quant-border)]">
                <th className="px-4 py-3 text-left font-medium text-[var(--quant-muted-foreground)]">
                  User
                </th>
                <th className="px-4 py-3 text-left font-medium text-[var(--quant-muted-foreground)]">
                  Role
                </th>
                <th className="px-4 py-3 text-left font-medium text-[var(--quant-muted-foreground)]">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-medium text-[var(--quant-muted-foreground)]">
                  Joined
                </th>
                <th className="px-4 py-3 text-left font-medium text-[var(--quant-muted-foreground)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-[var(--quant-border)] last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--quant-muted)] text-xs font-medium text-[var(--quant-foreground)]">
                        {user.avatarInitials}
                      </div>
                      <div>
                        <p className="font-medium text-[var(--quant-foreground)]">{user.name}</p>
                        <p className="text-xs text-[var(--quant-muted-foreground)]">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${roleColors[user.role]}`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[user.status]}`}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--quant-muted-foreground)]">
                    {user.joinedAt}
                  </td>
                  <td className="px-4 py-3">
                    <Button>Manage</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-[var(--quant-muted-foreground)]">
        <span>
          Showing {filteredUsers.length} of {usersData.length} users
        </span>
        <div className="flex gap-2">
          <Badge variant="default">Page 1 of 1</Badge>
        </div>
      </div>
    </div>
  );
}
