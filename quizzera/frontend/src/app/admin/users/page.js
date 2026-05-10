'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { getFirebaseAuth } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

const api = axios.create({ baseURL: '' });

const USER_ROLES = [
  'guest',
  'student',
  'mentor',
  'admin',
  'superAdmin',
  'contentManager',
  'financeManager',
];

const ACCOUNT_STATUSES = ['active', 'suspended', 'inactive'];

const selectClass =
  'h-[52px] w-full min-w-[8.5rem] rounded-full border border-border bg-background px-4 text-sm text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] outline-none transition-[border-color,box-shadow] focus:border-primary focus:shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_0_0_3px_rgba(17,17,17,0.06)]';

async function getBearer() {
  const auth = getFirebaseAuth();
  const u = auth.currentUser;
  if (!u) throw new Error('Not signed in.');
  return u.getIdToken(true);
}

function isElevatedRole(role) {
  return role === 'admin' || role === 'superAdmin';
}

function RoleCell({ role }) {
  const r = role ? String(role) : '—';
  if (isElevatedRole(r)) {
    return (
      <span className="inline-flex rounded-full bg-primary px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-inverse">
        {r}
      </span>
    );
  }
  return <span className="text-sm capitalize text-primary">{r}</span>;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const { user: fbUser, mongoUser, role, loading: authLoading } = useAuth();
  const effectiveRole = mongoUser?.role ?? role;
  const isAdmin = effectiveRole === 'admin' || effectiveRole === 'superAdmin';

  const [users, setUsers] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [fetching, setFetching] = useState(true);
  const [rowBusy, setRowBusy] = useState({});

  const setBusy = useCallback((userId, key, v) => {
    setRowBusy((prev) => ({ ...prev, [`${userId}:${key}`]: v }));
  }, []);

  useEffect(() => {
    if (!authLoading && !fbUser) {
      router.replace('/login');
    }
  }, [authLoading, fbUser, router]);

  useEffect(() => {
    if (!authLoading && fbUser && mongoUser && !isAdmin) {
      router.replace('/dashboard');
    }
  }, [authLoading, fbUser, mongoUser, effectiveRole, router, isAdmin]);

  const loadUsers = useCallback(async () => {
    if (!fbUser || !isAdmin) return;
    setLoadError('');
    setFetching(true);
    try {
      const idToken = await getBearer();
      const { data } = await api.get('/api/users', {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!data?.success || !Array.isArray(data?.data?.users)) {
        throw new Error(data?.message || 'Could not load users.');
      }
      setUsers(data.data.users);
    } catch (e) {
      const status = e?.response?.status;
      if (status === 401 || status === 403) {
        router.replace('/dashboard');
        return;
      }
      setLoadError(e?.response?.data?.message || e?.message || 'Failed to load users.');
      setUsers([]);
    } finally {
      setFetching(false);
    }
  }, [fbUser, isAdmin, router]);

  useEffect(() => {
    if (!authLoading && fbUser && mongoUser && isAdmin) {
      loadUsers();
    }
  }, [authLoading, fbUser, mongoUser, isAdmin, loadUsers]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => String(u.email ?? '').toLowerCase().includes(q));
  }, [users, search]);

  async function patchUser(userId, body, busyKey) {
    setBusy(userId, busyKey, true);
    try {
      const idToken = await getBearer();
      const { data } = await api.patch(`/api/users/${userId}`, body, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!data?.success || !data?.data?.user) {
        throw new Error(data?.message || 'Update failed.');
      }
      const updated = data.data.user;
      setUsers((prev) => prev.map((u) => (String(u._id) === String(userId) ? { ...u, ...updated } : u)));
    } catch (e) {
      const status = e?.response?.status;
      if (status === 401 || status === 403) {
        router.replace('/dashboard');
        return;
      }
      setLoadError(e?.response?.data?.message || e?.message || 'Update failed.');
      await loadUsers();
    } finally {
      setBusy(userId, busyKey, false);
    }
  }

  if (authLoading || !fbUser) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-primary">
        <p className="text-sm text-secondary">Loading...</p>
      </main>
    );
  }

  if (!mongoUser) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-primary">
        <p className="text-sm text-secondary">Loading profile…</p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-primary">
        <p className="text-sm text-secondary">Redirecting…</p>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-background text-primary">
      <header className="flex items-center justify-between border-b border-[#E5E5E5] px-5 py-4 sm:px-8">
        <Link
          href="/dashboard"
          className="text-[10px] font-semibold uppercase tracking-[0.35em] text-secondary hover:text-primary"
        >
          QUIZZERA
        </Link>
        <Link href="/dashboard" className="text-sm text-secondary hover:text-primary">
          Dashboard
        </Link>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
        <h1 className="text-xl font-semibold tracking-tight text-primary">Users</h1>
        <p className="mt-1 text-sm text-secondary">Manage roles and account status.</p>

        <div className="mt-6">
          <label htmlFor="admin-user-search" className="sr-only">
            Search by email
          </label>
          <input
            id="admin-user-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email…"
            className={`${selectClass} max-w-md`}
          />
        </div>

        {loadError ? (
          <p className="mt-4 text-sm text-primary" role="alert">
            {loadError}
          </p>
        ) : null}

        {fetching ? (
          <p className="mt-8 text-sm text-secondary">Loading users…</p>
        ) : (
          <div className="mt-8 overflow-x-auto rounded-sm border border-[#E5E5E5]">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[#E5E5E5] bg-background">
                  <th className="px-4 py-3 font-semibold text-primary">Email</th>
                  <th className="px-4 py-3 font-semibold text-primary">Role</th>
                  <th className="px-4 py-3 font-semibold text-primary">Status</th>
                  <th className="px-4 py-3 font-semibold text-primary">Onboarding</th>
                  <th className="px-4 py-3 font-semibold text-primary">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u, idx) => {
                  const id = String(u._id);
                  const roleBusy = rowBusy[`${id}:role`];
                  const statusBusy = rowBusy[`${id}:status`];
                  return (
                    <tr
                      key={id}
                      className={`border-b border-[#E5E5E5] last:border-b-0 ${idx % 2 === 1 ? 'bg-[#F9F9F9]' : 'bg-background'}`}
                    >
                      <td className="px-4 py-3 align-middle text-primary">{u.email ?? '—'}</td>
                      <td className="px-4 py-3 align-middle">
                        <RoleCell role={u.role} />
                      </td>
                      <td className="px-4 py-3 align-middle capitalize text-primary">
                        {u.accountStatus ?? '—'}
                      </td>
                      <td className="px-4 py-3 align-middle text-primary">
                        {u.onboardingCompleted ? 'Yes' : 'No'}
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                          <div className="min-w-0 sm:max-w-[11rem]">
                            <label className="sr-only" htmlFor={`role-${id}`}>
                              Change role for {u.email}
                            </label>
                            <select
                              id={`role-${id}`}
                              disabled={roleBusy}
                              value={u.role ?? 'student'}
                              className={selectClass}
                              onChange={(e) => {
                                const next = e.target.value;
                                if (next === u.role) return;
                                patchUser(id, { role: next }, 'role');
                              }}
                            >
                              {USER_ROLES.map((r) => (
                                <option key={r} value={r}>
                                  {r}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="min-w-0 sm:max-w-[11rem]">
                            <label className="sr-only" htmlFor={`status-${id}`}>
                              Change status for {u.email}
                            </label>
                            <select
                              id={`status-${id}`}
                              disabled={statusBusy}
                              value={u.accountStatus ?? 'active'}
                              className={selectClass}
                              onChange={(e) => {
                                const next = e.target.value;
                                if (next === u.accountStatus) return;
                                patchUser(id, { accountStatus: next }, 'status');
                              }}
                            >
                              {ACCOUNT_STATUSES.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!fetching && filteredUsers.length === 0 ? (
              <p className="border border-t-0 border-[#E5E5E5] bg-[#F9F9F9] px-4 py-6 text-center text-sm text-secondary">
                {users.length === 0 ? 'No users found.' : 'No users match this search.'}
              </p>
            ) : null}
          </div>
        )}
      </main>
    </div>
  );
}
