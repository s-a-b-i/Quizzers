'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAuth } from '@/context/AuthContext';
import { PageLoader } from '@/components/ui/PageLoader';

const DROPDOWN_PANEL =
  'min-w-[180px] rounded-lg border border-[#E5E5E5] bg-white shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-opacity duration-150 ease-out';
const DROPDOWN_ITEM =
  'block w-full px-4 py-2.5 text-left text-[13px] text-[#111111] hover:bg-[#F9F9F9]';
const DIVIDER = 'my-1 h-px bg-[#E5E5E5]';

function emailInitials(email) {
  if (!email || typeof email !== 'string') return '?';
  const local = email.split('@')[0] || email;
  const parts = local
    .replace(/[^a-zA-Z0-9]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return local.slice(0, 2).toUpperCase() || '?';
}

function NavHoverDropdown({ label, active, items }) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef(null);

  const clearTimer = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    clearTimer();
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  }, [clearTimer]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  return (
    <div
      className="relative flex h-[60px] items-stretch"
      onMouseEnter={() => {
        clearTimer();
        setOpen(true);
      }}
      onMouseLeave={scheduleClose}
    >
      <span
        className={`inline-flex cursor-default items-center px-4 text-[13px] transition-colors ${
          active
            ? 'border-b-2 border-[#111111] text-[#111111]'
            : 'border-b-2 border-transparent text-[#6B6B6B] hover:text-[#111111]'
        }`}
      >
        {label}
      </span>
      <div
        className={`absolute left-1/2 top-full z-50 -translate-x-1/2 pt-1 ${
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onMouseEnter={clearTimer}
        onMouseLeave={scheduleClose}
      >
        <div className={DROPDOWN_PANEL} role="menu">
          {items.map(({ href, text }) => (
            <Link
              key={href}
              href={href}
              className={DROPDOWN_ITEM}
              role="menuitem"
            >
              {text}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function SimpleNavLink({ href, label, active }) {
  return (
    <Link
      href={href}
      className={`inline-flex h-[60px] items-center px-4 text-[13px] transition-colors ${
        active
          ? 'border-b-2 border-[#111111] text-[#111111]'
          : 'border-b-2 border-transparent text-[#6B6B6B] hover:text-[#111111]'
      }`}
    >
      {label}
    </Link>
  );
}

const MOBILE_FLAT_LINKS = [
  { href: '/dashboard', text: 'Dashboard' },
  { href: '/mcqs', text: 'Practice MCQs' },
  { href: '/performance', text: 'My Performance' },
  { href: '/exams', text: 'Take an Exam' },
  { href: '/results', text: 'My Results' },
  { href: '/resources', text: 'Study Materials' },
  { href: '/bookmarks', text: 'Bookmarks' },
];

const ADMIN_NAV_ITEMS = [
  { href: '/admin/users', text: 'Admin: Users' },
  { href: '/admin/taxonomy', text: 'Admin: Taxonomy' },
  { href: '/admin/mcqs', text: 'Admin: MCQ Bank' },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, mongoUser, role, logout } = useAuth();

  const email = mongoUser?.email ?? user?.email ?? '';
  const displayRole = mongoUser?.role ?? role ?? '';
  const canAccessAdminNav =
    displayRole === 'admin' || displayRole === 'superAdmin' || displayRole === 'contentManager';

  const [avatarOpen, setAvatarOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const avatarWrapRef = useRef(null);

  const practiceActive = pathname === '/mcqs' || pathname === '/performance';
  const examsActive = pathname === '/exams' || pathname === '/results';
  const resourcesActive = pathname === '/resources' || pathname === '/bookmarks';
  const adminNavActive =
    pathname === '/admin/users' ||
    pathname === '/admin/taxonomy' ||
    pathname === '/admin/mcqs';

  const initials = useMemo(() => emailInitials(email), [email]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!avatarOpen) return;
    function onDoc(e) {
      if (avatarWrapRef.current && !avatarWrapRef.current.contains(e.target)) {
        setAvatarOpen(false);
      }
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [avatarOpen]);

  async function onLogout() {
    setAvatarOpen(false);
    setMobileOpen(false);
    setLoggingOut(true);
    try {
      await logout();
      router.replace('/login');
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <>
      {loggingOut ? <PageLoader /> : null}
    <header
      className="sticky top-0 z-50 flex h-[60px] w-full items-center justify-between border-b border-[#E5E5E5] bg-white px-4 md:px-6"
      style={{ boxSizing: 'border-box' }}
    >
      <Link
        href="/dashboard"
        className="shrink-0 text-[15px] font-bold uppercase tracking-[2px] text-[#111111]"
      >
        QUIZZERA
      </Link>

      <nav className="absolute left-1/2 hidden h-[60px] -translate-x-1/2 items-stretch md:flex">
        <SimpleNavLink
          href="/dashboard"
          label="Dashboard"
          active={pathname === '/dashboard'}
        />
        <NavHoverDropdown
          label="Practice"
          active={practiceActive}
          items={[
            { href: '/mcqs', text: 'Practice MCQs' },
            { href: '/performance', text: 'My Performance' },
          ]}
        />
        <NavHoverDropdown
          label="Exams"
          active={examsActive}
          items={[
            { href: '/exams', text: 'Take an Exam' },
            { href: '/results', text: 'My Results' },
          ]}
        />
        <NavHoverDropdown
          label="Resources"
          active={resourcesActive}
          items={[
            { href: '/resources', text: 'Study Materials' },
            { href: '/bookmarks', text: 'Bookmarks' },
          ]}
        />
        {canAccessAdminNav ? (
          <NavHoverDropdown
            label="Admin"
            active={adminNavActive}
            items={ADMIN_NAV_ITEMS}
          />
        ) : null}
      </nav>

      <div className="flex shrink-0 items-center gap-2 md:gap-3">
        <span className="hidden max-w-[160px] truncate text-[13px] text-[#6B6B6B] md:block md:max-w-[200px] lg:max-w-[240px]">
          {email}
        </span>
        {displayRole ? (
          <span className="hidden rounded-full bg-[#111111] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white md:inline-flex">
            {String(displayRole)}
          </span>
        ) : null}

        <div className="relative" ref={avatarWrapRef}>
          <button
            type="button"
            aria-expanded={avatarOpen}
            aria-haspopup="true"
            onClick={() => setAvatarOpen((o) => !o)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#111111] text-[11px] font-semibold uppercase text-white"
          >
            {initials}
          </button>
          {avatarOpen ? (
            <div
              className={`absolute right-0 top-[calc(100%+6px)] z-50 ${DROPDOWN_PANEL}`}
              role="menu"
            >
              <Link
                href="/profile"
                className={DROPDOWN_ITEM}
                role="menuitem"
                onClick={() => setAvatarOpen(false)}
              >
                My Profile
              </Link>
              <Link
                href="/settings"
                className={DROPDOWN_ITEM}
                role="menuitem"
                onClick={() => setAvatarOpen(false)}
              >
                Settings
              </Link>
              <div className={DIVIDER} />
              <button
                type="button"
                className={`${DROPDOWN_ITEM} w-full`}
                role="menuitem"
                onClick={onLogout}
              >
                Logout
              </button>
              {canAccessAdminNav ? (
                <>
                  <div className={DIVIDER} />
                  {ADMIN_NAV_ITEMS.map(({ href, text }) => (
                    <Link
                      key={href}
                      href={href}
                      className={DROPDOWN_ITEM}
                      role="menuitem"
                      onClick={() => setAvatarOpen(false)}
                    >
                      {text}
                    </Link>
                  ))}
                </>
              ) : null}
            </div>
          ) : null}
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-[#E5E5E5] md:hidden"
          aria-label="Open menu"
          onClick={() => setMobileOpen((o) => !o)}
        >
          <span className="flex flex-col gap-1">
            <span className="block h-0.5 w-5 bg-[#111111]" />
            <span className="block h-0.5 w-5 bg-[#111111]" />
            <span className="block h-0.5 w-5 bg-[#111111]" />
          </span>
        </button>
      </div>

      {mobileOpen ? (
        <div className="absolute left-0 right-0 top-[60px] z-40 border-b border-[#E5E5E5] bg-white px-4 py-3 shadow-[0_4px_12px_rgba(0,0,0,0.08)] md:hidden">
          <div className="mb-2 border-b border-[#E5E5E5] pb-2">
            <p className="truncate text-[13px] text-[#6B6B6B]">{email}</p>
            {displayRole ? (
              <span className="mt-1 inline-flex rounded-full bg-[#111111] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
                {String(displayRole)}
              </span>
            ) : null}
          </div>
          <div className={`${DROPDOWN_PANEL} border-0 shadow-none`}>
            {MOBILE_FLAT_LINKS.map(({ href, text }) => (
              <Link
                key={href}
                href={href}
                className={DROPDOWN_ITEM}
                onClick={() => setMobileOpen(false)}
              >
                {text}
              </Link>
            ))}
            {canAccessAdminNav ? (
              <>
                <div className={DIVIDER} />
                {ADMIN_NAV_ITEMS.map(({ href, text }) => (
                  <Link
                    key={href}
                    href={href}
                    className={DROPDOWN_ITEM}
                    onClick={() => setMobileOpen(false)}
                  >
                    {text}
                  </Link>
                ))}
              </>
            ) : null}
            <div className={DIVIDER} />
            <Link
              href="/profile"
              className={DROPDOWN_ITEM}
              onClick={() => setMobileOpen(false)}
            >
              My Profile
            </Link>
            <Link
              href="/settings"
              className={DROPDOWN_ITEM}
              onClick={() => setMobileOpen(false)}
            >
              Settings
            </Link>
            <div className={DIVIDER} />
            <button type="button" className={DROPDOWN_ITEM} onClick={onLogout}>
              Logout
            </button>
          </div>
        </div>
      ) : null}
    </header>
    </>
  );
}
