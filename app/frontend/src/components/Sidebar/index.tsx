import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import SidebarLinkGroup from './SidebarLinkGroup';
import { Button, Stack, Tooltip } from '@mui/material';
import sessionData from '../../Store';
import {
  IconBrandSpeedtest, IconCaretDown, IconCornerDownRight,
  IconFolderOpen, IconBuildingEstate, IconUser, IconUserSquareRounded,
  IconDatabaseCog, IconChartDots3, IconSquareLetterX, IconRecycle,
  IconDeviceIpadHorizontalQuestion, IconHistory, IconArchive,
  IconSearch, IconScript, IconBookmark, IconFile, IconSettings,
} from '@tabler/icons-react';
import { defaultPath } from '../../Slices/PathSlice';
import { useDispatch } from 'react-redux';
import { getRecommendations, fetchSidebarConfig } from '../../common/Apis';

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (arg: boolean) => void;
}

// ─── Derive user type from sessionStorage ─────────────────────────────────────
function getUserTypeKey(): string {
  if (sessionStorage.getItem('isAdmin') === 'true')          return 'showToAdmin';
  if (sessionStorage.getItem('isDepartmentHead') === 'true') return 'showToDepartmentHead';
  if (sessionStorage.getItem('isRootLevel') === 'true')      return 'showToRootLevel';
  return 'showToNormal';
}

const Sidebar = ({ sidebarOpen, setSidebarOpen }: SidebarProps) => {
  const [open, setOpen]                   = useState<string>('');
  const [sidebarConfig, setSidebarConfig] = useState<Record<string, any>>({});
  const { show, recommendationsLength, setRecommendationsLength } = sessionData();
  const location  = useLocation();
  const { pathname } = location;

  const username                 = sessionStorage.getItem('username');
  const isPhysicalDocumentKeeper = sessionStorage.getItem('isKeeperOfPhysicalDocs') === 'true';
  const isAdmin                  = sessionStorage.getItem('isAdmin') === 'true';
  const userTypeKey              = getUserTypeKey();

  const trigger  = useRef<any>(null);
  const sidebar  = useRef<any>(null);

  const storedSidebarExpanded = sessionStorage.getItem('sidebar-expanded');
  const [sidebarExpanded, setSidebarExpanded] = useState(storedSidebarExpanded === 'true');

  // ─── Load sidebar config from DB ───────────────────────────────────────────
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await fetchSidebarConfig();
        // Convert array → map keyed by routeKey for O(1) lookup
        const map: Record<string, any> = {};
        (res?.data || []).forEach((entry: any) => {
          map[entry.routeKey] = entry;
        });
        setSidebarConfig(map);
      } catch {
        // On error, fall back to showing everything (map stays empty → isVisible returns true)
      }
    };
    loadConfig();
  }, []);

  // ─── Visibility check: uses DB config, defaults true if config not loaded ──
  const isVisible = (routeKey: string): boolean => {
    const entry = sidebarConfig[routeKey];
    if (!entry) return true; // default open while loading or if not configured
    return entry[userTypeKey] ?? true;
  };

  // Close on click outside
  useEffect(() => {
    const clickHandler = ({ target }: MouseEvent) => {
      if (!sidebar.current || !trigger.current) return;
      if (!sidebarOpen || sidebar.current.contains(target) || trigger.current.contains(target)) return;
      setSidebarOpen(false);
    };
    document.addEventListener('click', clickHandler);
    return () => document.removeEventListener('click', clickHandler);
  }, [sidebarOpen]);

  // Close on ESC
  useEffect(() => {
    const keyHandler = ({ keyCode }: KeyboardEvent) => {
      if (!sidebarOpen || keyCode !== 27) return;
      setSidebarOpen(false);
    };
    document.addEventListener('keydown', keyHandler);
    return () => document.removeEventListener('keydown', keyHandler);
  }, [sidebarOpen]);

  useEffect(() => {
    sessionStorage.setItem('sidebar-expanded', sidebarExpanded.toString());
    document.querySelector('body')?.classList.toggle('sidebar-expanded', sidebarExpanded);
  }, [sidebarExpanded]);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await getRecommendations();
        setRecommendationsLength(response?.data?.recommendations?.length);
      } catch { /* silent */ }
    };
    load();
  }, []);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  function truncateUsername(u: string | null, maxLength = 12) {
    if (!u || typeof u !== 'string') return '';
    return u.length <= maxLength ? u : `${u.substring(0, maxLength)}...`;
  }

  // ─── All route definitions ──────────────────────────────────────────────────
  // Every route has a routeKey that matches DB config.
  // isVisible(routeKey) gates whether it renders.
  // No logic change from original — just wrapped with isVisible().
  const allRoutes = [
    {
      routeKey: 'dashboard',
      path: '/',
      label: 'Dashboard',
      icon: <IconBrandSpeedtest size={26} />,
      active: pathname === '/',
    },
    {
      routeKey: 'files',
      path: '/files',
      label: 'File System',
      icon: <IconFolderOpen size={26} />,
      active: pathname === '/files',
    },
    {
      routeKey: 'search',
      path: '/search',
      label: 'Deep Search',
      icon: <IconSearch size={26} />,
      active: pathname === '/search',
    },
    {
      routeKey: 'bin',
      path: '/bin',
      label: 'Recycle Bin',
      icon: <IconRecycle size={26} />,
      active: pathname === '/bin',
    },
    {
      routeKey: 'archive',
      path: '/archive',
      label: 'Archive Files',
      icon: <IconArchive size={26} />,
      active: pathname === '/archive',
    },
    {
      routeKey: 'bookmark',
      path: '/bookmark',
      label: 'Bookmarked Files',
      icon: <IconBookmark size={26} />,
      active: pathname === '/bookmark',
    },
    {
      routeKey: 'workflows',
      path: '/workflows',
      label: 'Workflows',
      icon: <IconChartDots3 size={26} />,
      active: pathname === '/workflows',
    },
    {
      routeKey: 'physical-document',
      path: '/physical-document',
      label: 'Physical Document',
      icon: <IconScript size={26} />,
      active: pathname === '/physical-document',
    },
    ...(isPhysicalDocumentKeeper ? [{
      routeKey: 'meta-data',
      path: '/meta-data',
      label: 'Meta Data Form',
      icon: <IconDatabaseCog size={26} />,
      active: pathname === '/meta-data',
    }] : []),
    ...(show ? [
      {
        routeKey: 'departments',
        path: '/department',
        label: 'Departments',
        icon: <IconBuildingEstate size={26} />,
        dropdown: [
          { path: '/departments/list',      label: 'List Departments' },
          { path: '/departments/createNew', label: 'Create Department' },
        ],
        active: pathname.includes('departments'),
      },
      {
        routeKey: 'roles',
        path: '/roles',
        label: 'Roles',
        icon: <IconUserSquareRounded size={26} />,
        dropdown: [
          { path: '/roles/list',      label: 'List Roles' },
          { path: '/roles/createNew', label: 'Create Role' },
        ],
        active: pathname.includes('roles'),
      },
      {
        routeKey: 'users',
        path: '/users',
        label: 'Users',
        icon: <IconUser size={26} />,
        dropdown: [
          { path: '/users/list',      label: 'List Users' },
          { path: '/users/createNew', label: 'Create User' },
        ],
        active: pathname.includes('users'),
      },
      {
        routeKey: 'reports',
        path: '/reports',
        label: 'Reports',
        icon: <IconFile size={26} />,
        active: pathname.includes('reports'),
      },
    ] : []),
    {
      routeKey: 'processes',
      path: '/processes',
      label: 'Processes',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path stroke="none" d="M0 0h24v24H0z" fill="none" />
          <path d="M3 7m0 2a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v9a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2z" />
          <path d="M8 7v-2a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2v2" />
          <path d="M12 12l0 .01" />
          <path d="M3 13a20 20 0 0 0 18 0" />
        </svg>
      ),
      dropdown: [
        { path: '/processes/work',      label: 'Pending Work' },
        { path: '/processes/completed', label: 'Initiated Processes' },
        { path: '/processes/drafted',   label: 'Drafted Processes' },
        { path: '/processes/initiate',  label: 'Initiate Process' },
        // ✅ Original logic preserved — admin-only sub-route
        ...(isAdmin ? [{ path: '/processes/delete', label: 'Delete Process' }] : []),
      ],
      active: pathname.includes('process'),
    },
    {
      routeKey: 'logs',
      path: '/logs',
      label: 'Logs',
      icon: <IconHistory size={26} />,
      active: pathname.includes('logs'),
    },
    {
      routeKey: 'recommendations',
      path: '/recommendations',
      label: 'Recommendations',
      icon: <IconDeviceIpadHorizontalQuestion size={26} />,
      active: pathname.includes('recommendation'),
    },
    ...(isPhysicalDocumentKeeper ? [{
      routeKey: 'physicalDocuments',
      path: '/physicalDocuments',
      label: 'Documents Tracking',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path stroke="none" d="M0 0h24v24H0z" fill="none" />
          <path d="M11 18l-2 -1l-6 3v-13l6 -3l6 3l6 -3v7.5" />
          <path d="M9 4v13" />
          <path d="M15 7v5" />
          <path d="M18 18m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
          <path d="M20.2 20.2l1.8 1.8" />
        </svg>
      ),
      active: pathname === '/physicalDocuments',
    }] : []),
    // ✅ Admin-only settings page — always visible to admin, not in DB config
    ...(isAdmin ? [{
      routeKey: 'sidebar-settings',
      path: '/sidebar-settings',
      label: 'Sidebar Settings',
      icon: <IconSettings size={26} />,
      active: pathname === '/sidebar-settings',
    }] : []),
  ];

  // ✅ Filter using DB config — isVisible() returns true by default if config not loaded
  const routes = allRoutes.filter((route) => {
    // Sidebar Settings is admin-only and not subject to DB config
    if (route.routeKey === 'sidebar-settings') return true;
    return isVisible(route.routeKey);
  });

  return (
    <aside
      ref={sidebar}
      style={{ width: '280px' }}
      className={`absolute bg-sidebar-gradient-9 left-0 top-0 z-99 flex h-screen w-72.5 flex-col overflow-y-hidden bg-black duration-300 ease-linear dark:bg-boxdark lg:static lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <button
        ref={trigger}
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-controls="sidebar"
        aria-expanded={sidebarOpen}
        className="flex lg:hidden justify-end p-1"
      >
        <IconSquareLetterX color="white" />
      </button>

      <Tooltip title={username || ''}>
        <Button
          onClick={() => navigate('/profile')}
          sx={{
            border: 'none', margin: '12px', borderRadius: '8px',
            backgroundColor: '#FFFFFF44', color: 'white', fontSize: '20px',
            '&:hover': { backgroundColor: '#FFFFFF66' }, fontWeight: 600,
          }}
        >
          {truncateUsername(username)}
        </Button>
      </Tooltip>

      <div className="no-scrollbar flex flex-col overflow-y-auto duration-300 ease-linear">
        <nav className="py-1 px-1">
          <ul className="mb-6 flex flex-col gap-0.5 p-1">
            {routes.map((route, index) => {
              if ('dropdown' in route && route.dropdown) {
                return (
                  <SidebarLinkGroup key={index} activeCondition={route.active}>
                    {() => (
                      <React.Fragment>
                        <NavLink
                          to="#"
                          className={`group relative flex items-center gap-3 rounded-sm px-4 py-3 font-medium text-bodydark1 duration-300 ease-in-out hover:bg-gray-700 dark:hover:bg-meta-4 ${
                            route.active ? 'bg-sidebar-active text-white' : ''
                          }`}
                          onClick={(e) => {
                            e.preventDefault();
                            sidebarExpanded
                              ? setOpen((prev) => prev === route.path ? '' : route.path)
                              : setSidebarExpanded(true);
                          }}
                        >
                          {route.icon}
                          {route.label}
                          <IconCaretDown
                            size={18}
                            className={`absolute right-4 top-1/2 -translate-y-1/2 transform fill-current duration-300 ease-in-out ${
                              open === route.path ? 'rotate-180' : 'rotate-0'
                            }`}
                          />
                        </NavLink>
                        {open === route.path && (
                          <Stack gap={1} sx={{ ml: 4.2, mt: 1, mb: 1 }}>
                            {route.dropdown.map((sub, si) => (
                              <NavLink
                                key={si}
                                to={sub.path}
                                className={({ isActive }) =>
                                  `group relative flex items-center gap-2.5 rounded-md pl-2 font-medium text-bodydark2 duration-300 ease-in-out hover:text-white ${isActive ? '!text-white' : ''}`
                                }
                              >
                                <IconCornerDownRight />
                                {sub.label}
                              </NavLink>
                            ))}
                          </Stack>
                        )}
                      </React.Fragment>
                    )}
                  </SidebarLinkGroup>
                );
              }

              return (
                <NavLink
                  key={index}
                  to={route.path}
                  onClick={() => {
                    if (route.path === '/physicalDocuments') {
                      sessionStorage.setItem('path', '..');
                      dispatch(defaultPath());
                    }
                  }}
                  className={`group relative flex items-center gap-3 rounded-sm py-3 px-4 font-medium text-bodydark1 duration-300 ease-in-out hover:bg-gray-700 dark:hover:bg-meta-4 hover:text-white ${
                    route.active ? 'bg-sidebar-active text-white' : ''
                  }`}
                >
                  {route.icon}
                  <span className="duration-300 ease-in-out transform group-hover:scale-105">
                    {route.label}
                  </span>
                  {route.path === '/recommendations' && recommendationsLength > 0 && (
                    <span className="ml-2 rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">
                      {recommendationsLength}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </ul>
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;