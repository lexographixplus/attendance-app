import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../App';
import { getUsers, createUser, deleteUser, promoteUser } from '../services/dbService';
import { User, UserRole } from '../types';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { useToast } from '../components/Toast';
import { Trash2, UserPlus, Shield, AlertTriangle, Building2, Users } from 'lucide-react';

interface WorkspaceSummary {
  workspaceId: string;
  members: User[];
  adminCount: number;
  subAdminCount: number;
}

const UsersPage: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [newUser, setNewUser] = useState({ name: '', email: '', passwordHash: '' });
  const [error, setError] = useState('');
  const { showToast } = useToast();

  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN;

  const refreshUsers = async () => {
    if (!user) return;
    const nextUsers = await (isSuperAdmin ? getUsers(undefined, user.id) : getUsers(user.workspaceId));
    setUsers(nextUsers);
  };

  useEffect(() => {
    void refreshUsers();
  }, [user]);

  if (!user || (user.role !== UserRole.SUPER_ADMIN && user.role !== UserRole.ADMIN)) {
    return <div>Access Denied</div>;
  }

  const workspaceUsers = isSuperAdmin ? users.filter(u => u.workspaceId === user.workspaceId) : users;
  const managedSubAdmins = workspaceUsers.filter(u => u.parentAdminId === user.id && u.role === UserRole.SUB_ADMIN);
  const canAddMore = isSuperAdmin || managedSubAdmins.length < 3;

  const workspaceSummaries: WorkspaceSummary[] = useMemo(() => {
    if (!isSuperAdmin) return [];
    const grouped = new Map<string, User[]>();
    users.forEach(u => {
      const group = grouped.get(u.workspaceId) || [];
      group.push(u);
      grouped.set(u.workspaceId, group);
    });
    return Array.from(grouped.entries())
      .map(([workspaceId, members]) => ({
        workspaceId,
        members: members.sort((a, b) => a.name.localeCompare(b.name)),
        adminCount: members.filter(m => m.role === UserRole.SUPER_ADMIN || m.role === UserRole.ADMIN).length,
        subAdminCount: members.filter(m => m.role === UserRole.SUB_ADMIN).length,
      }))
      .sort((a, b) => a.workspaceId.localeCompare(b.workspaceId));
  }, [isSuperAdmin, users]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await createUser(user, newUser);
      setNewUser({ name: '', email: '', passwordHash: '' });
      await refreshUsers();
      showToast('User added to workspace.', 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create user.');
    }
  };

  const canManageUser = (target: User): boolean => {
    if (target.id === user.id || target.role === UserRole.SUPER_ADMIN) return false;
    if (isSuperAdmin) return true;
    return target.parentAdminId === user.id && target.role === UserRole.SUB_ADMIN;
  };

  const handleDelete = async (target: User) => {
    try {
      await deleteUser(user, target.workspaceId, target.id);
      await refreshUsers();
      showToast('User removed from workspace.', 'info');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to delete user.', 'error');
    }
  };

  const handlePromote = async (target: User) => {
    try {
      await promoteUser(user, target.workspaceId, target.id, UserRole.ADMIN);
      await refreshUsers();
      showToast('User promoted to admin.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to promote user.', 'error');
    }
  };

  const renderActionButtons = (target: User, compact = false) => {
    if (!canManageUser(target)) {
      return (
        <span className="text-xs text-gray-400">
          {target.id === user.id ? 'Current user' : 'No actions'}
        </span>
      );
    }

    return (
      <div className={`flex ${compact ? 'justify-start' : 'justify-end'} gap-2`}>
        {isSuperAdmin && target.role === UserRole.SUB_ADMIN && (
          <button onClick={() => handlePromote(target)} className="text-cyan-600 hover:text-cyan-900" title="Promote to Admin">
            <Shield className="w-4 h-4" />
          </button>
        )}
        <button onClick={() => handleDelete(target)} className="text-red-600 hover:text-red-900" title="Delete User">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    );
  };

  const totalWorkspaceCount = workspaceSummaries.length;
  const totalAdminCount = users.filter(u => u.role === UserRole.SUPER_ADMIN || u.role === UserRole.ADMIN).length;
  const totalUserCount = users.length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
        <p className="text-gray-500">
          {isSuperAdmin
            ? 'Global workspace overview plus user management for your own workspace.'
            : 'View all users in your workspace and manage your sub-admins.'}
        </p>
      </div>

      {isSuperAdmin && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <p className="text-xs uppercase text-gray-500 font-semibold tracking-wide">Workspaces</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{totalWorkspaceCount}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <p className="text-xs uppercase text-gray-500 font-semibold tracking-wide">Admins</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{totalAdminCount}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <p className="text-xs uppercase text-gray-500 font-semibold tracking-wide">All Users</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{totalUserCount}</p>
            </div>
          </div>

          <div className="space-y-4">
            {workspaceSummaries.map(summary => (
              <div key={summary.workspaceId} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-cyan-600" />
                    <h3 className="font-semibold text-gray-900">Workspace: {summary.workspaceId}</h3>
                    {summary.workspaceId === user.workspaceId && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-700 border border-cyan-200">
                        Your Workspace
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    Admins: {summary.adminCount} | Sub-admins: {summary.subAdminCount} | Users: {summary.members.length}
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-white">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {summary.members.map(member => (
                        <tr key={member.id}>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {member.name}
                            {member.id === user.id ? ' (You)' : ''}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600">{member.email}</td>
                          <td className="px-4 py-2 text-sm text-gray-600">{member.role.replace('_', ' ')}</td>
                          <td className="px-4 py-2 text-sm text-gray-600">{renderActionButtons(member, true)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-600" />
              {isSuperAdmin ? 'Your Workspace Users' : 'Workspace Users'}
            </h3>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {workspaceUsers.map(u => (
                <tr key={u.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {u.name}
                      {u.id === user.id ? ' (You)' : ''}
                    </div>
                    <div className="text-sm text-gray-500">{u.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        u.role === UserRole.SUPER_ADMIN
                          ? 'bg-slate-100 text-slate-800'
                          : u.role === UserRole.ADMIN
                          ? 'bg-cyan-100 text-cyan-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {u.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {renderActionButtons(u)}
                  </td>
                </tr>
              ))}
              {workspaceUsers.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                    No users found in this workspace.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 h-fit">
          <h3 className="text-lg font-bold mb-4 flex items-center">
            <UserPlus className="w-5 h-5 mr-2" />
            Add {isSuperAdmin ? 'Admin' : 'Sub-Admin'}
          </h3>

          {!canAddMore && (
            <div className="mb-4 bg-yellow-50 text-yellow-800 p-3 rounded-md text-sm flex items-start">
              <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0" />
              You have reached the limit of 3 sub-admins. Remove one before adding a new one.
            </div>
          )}

          <form onSubmit={handleAdd} className={!canAddMore ? 'opacity-50 pointer-events-none' : ''}>
            <Input label="Name" required value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} />
            <Input label="Email" type="email" required value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} />
            <Input
              label="Password"
              type="password"
              required
              value={newUser.passwordHash}
              onChange={e => setNewUser({ ...newUser, passwordHash: e.target.value })}
            />
            {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
            <Button type="submit" className="w-full" disabled={!canAddMore}>
              Create User
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UsersPage;

