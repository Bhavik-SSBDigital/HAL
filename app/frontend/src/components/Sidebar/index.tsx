import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import SidebarLinkGroup from './SidebarLinkGroup';
// import Logo from '../../assets/images/kdccLogo1.png';
import { Button, Stack, Tooltip } from '@mui/material';
import sessionData from '../../Store';
import {
  IconBrandSpeedtest,
  IconCaretDown,
  IconCornerDownRight,
  IconChartHistogram,
  IconFolderOpen,
  IconFolderSearch,
  IconUserCircle,
  IconSitemap,
  IconBuildingEstate,
  IconUser,
  IconUserSquareRounded,
  IconDatabaseCog,
} from '@tabler/icons-react';
import { defaultPath } from '../../Slices/PathSlice';
import { useDispatch } from 'react-redux';

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (arg: boolean) => void;
}
const Sidebar = ({ sidebarOpen, setSidebarOpen }: SidebarProps) => {
  const [open, setOpen] = useState<string>('');
  const { show } = sessionData();
  const location = useLocation();
  const { pathname } = location;
  const username = sessionStorage.getItem('username');
  const isPhysicalDocumentKeeper =
    sessionStorage.getItem('isKeeperOfPhysicalDocs') == 'true';

  const trigger = useRef<any>(null);
  const sidebar = useRef<any>(null);

  const storedSidebarExpanded = sessionStorage.getItem('sidebar-expanded');
  const [sidebarExpanded, setSidebarExpanded] = useState(
    storedSidebarExpanded === null ? false : storedSidebarExpanded === 'true',
  );

  // close on click outside
  useEffect(() => {
    const clickHandler = ({ target }: MouseEvent) => {
      if (!sidebar.current || !trigger.current) return;
      if (
        !sidebarOpen ||
        sidebar.current.contains(target) ||
        trigger.current.contains(target)
      )
        return;
      setSidebarOpen(false);
    };
    document.addEventListener('click', clickHandler);
    return () => document.removeEventListener('click', clickHandler);
  });

  // close if the esc key is pressed
  useEffect(() => {
    const keyHandler = ({ keyCode }: KeyboardEvent) => {
      if (!sidebarOpen || keyCode !== 27) return;
      setSidebarOpen(false);
    };
    document.addEventListener('keydown', keyHandler);
    return () => document.removeEventListener('keydown', keyHandler);
  });

  useEffect(() => {
    sessionStorage.setItem('sidebar-expanded', sidebarExpanded.toString());
    if (sidebarExpanded) {
      document.querySelector('body')?.classList.add('sidebar-expanded');
    } else {
      document.querySelector('body')?.classList.remove('sidebar-expanded');
    }
  }, [sidebarExpanded]);
  const dispatch = useDispatch();

  const navigate = useNavigate();
  return (
    <aside
      ref={sidebar}
      style={{
        width: '280px',
        zIndex: 21,
        // background: 'linear-gradient(63deg, #08203e, #557c93)',
        background: 'linear-gradient(360deg, rgb(0 0 0), rgb(113 73 183))',
      }}
      className={`absolute left-0 top-0 z-10 flex h-screen w-72.5 flex-col overflow-y-hidden bg-black duration-300 ease-linear dark:bg-boxdark lg:static lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* <!-- SIDEBAR HEADER --> */}
      <button
        ref={trigger}
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-controls="sidebar"
        aria-expanded={sidebarOpen}
        className="flex lg:hidden"
        style={{
          justifyContent: 'flex-end',
          marginRight: '5px',
          marginTop: '5px',
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="25"
          height="25"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          color="white"
          stroke-linejoin="round"
        >
          <path stroke="none" d="M0 0h24v24H0z" fill="none" />
          <path d="M3 5a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v14a2 2  0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-14z" />
          <path d="M9 9l6 6m0 -6l-6 6" />
        </svg>
      </button>
      <Tooltip title="Profile">
        <Button
          onClick={() => navigate('/profile')}
          sx={{
            border: 'none',
            margin: '20px',
            borderRadius: '8px',
            backgroundColor: '#FFFFFF44',
            color: 'white',
            fontSize: '22px',
            '&:hover': {
              backgroundColor: '#FFFFFF66',
            },
            fontWeight: 600,
          }}
          startIcon={<IconUserCircle stroke={2.3} size={34} color="white" />}
        >
          {username}
        </Button>
      </Tooltip>
      <div
        style={{
          boxShadow:
            'rgba(0, 0, 0, 0.05) 0px 6px 24px 0px, rgba(0, 0, 0, 0.08) 0px 0px 0px 1px',
        }}
      />
      <div className="no-scrollbar flex flex-col overflow-y-auto duration-300 ease-linear">
        {/* <!-- Sidebar Menu --> */}
        <nav className="py-3 px-1">
          {/* <!-- Menu Group --> */}
          <div>
            <ul className="mb-6 flex flex-col gap-0.5 p-1">
              {/* <!-- Menu Item Dashboard --> */}
              <SidebarLinkGroup
                activeCondition={
                  pathname === '/' || pathname.includes('dashboard')
                }
              >
                {() => {
                  return (
                    <React.Fragment>
                      <NavLink
                        to="#"
                        style={{
                          fontWeight: 700,
                          marginRight: '2px',
                          borderRadius: '8px',
                          fontSize: 16,
                          letterSpacing: '0.5px',
                        }}
                        className={`group relative flex items-center gap-3 rounded-sm px-4 py-3 font-medium text-bodydark1 duration-300 ease-in-out hover:bg-gray-700 dark:hover:bg-meta-4 hover:text-white ${
                          (pathname === '/' ||
                            pathname.includes('dashboard')) &&
                          'bg-indigo-400 text-white'
                        }`}
                        onClick={(e) => {
                          e.preventDefault();
                          sidebarExpanded
                            ? setOpen((prev) =>
                                prev === 'dashboard' ? '' : 'dashboard',
                              )
                            : setSidebarExpanded(true);
                        }}
                      >
                        <IconBrandSpeedtest
                          size={26}
                          className="duration-300 ease-in-out transform group-hover:scale-105"
                        />
                        <span className="duration-300 ease-in-out transform group-hover:scale-105">
                          Dashboard
                        </span>
                        <IconCaretDown
                          size={18}
                          className={`absolute right-4 top-1/2 -translate-y-1/2 transform fill-current duration-300 ease-in-out ${
                            open === 'dashboard' ? 'rotate-180' : 'rotate-0'
                          }`}
                        />
                      </NavLink>

                      {/* <!-- Dropdown Menu Start --> */}
                      {open === 'dashboard' && (
                        <Stack gap={1} sx={{ ml: 4.2, mt: 1, mb: 1 }}>
                          <div
                            className={`translate transform overflow-hidden ${
                              !(open === 'dashboard') && 'hidden'
                            }`}
                          >
                            <NavLink
                              to="/"
                              className={({ isActive }) =>
                                'group relative flex items-center gap-2.5 rounded-md pl-2 font-medium text-bodydark2 duration-300 ease-in-out hover:text-white ' +
                                (isActive && '!text-white')
                              }
                            >
                              <IconCornerDownRight />
                              Overall
                            </NavLink>
                          </div>
                          <div
                            className={`translate transform overflow-hidden ${
                              !(open === 'dashboard') && 'hidden'
                            }`}
                          >
                            <NavLink
                              to="/dashboard/perticularBranch"
                              className={({ isActive }) =>
                                'group relative flex items-center gap-2.5 rounded-md pl-2 font-medium text-bodydark2 duration-300 ease-in-out hover:text-white ' +
                                (isActive && '!text-white')
                              }
                            >
                              <IconCornerDownRight />
                              Branch Wise
                            </NavLink>
                          </div>
                        </Stack>
                      )}
                      {/* <!-- Dropdown Menu End --> */}
                    </React.Fragment>
                  );
                }}
              </SidebarLinkGroup>
              <NavLink
                to="/files"
                onClick={() => {
                  sessionStorage.setItem('path', '..');
                  dispatch(defaultPath());
                }}
                style={{
                  fontWeight: 700,
                  marginRight: '2px',
                  borderRadius: '8px',
                  fontSize: 16,
                  letterSpacing: '0.5px',
                }}
                className={`group relative flex items-center gap-3 rounded-sm py-3 px-4 font-medium text-bodydark1 duration-300 ease-in-out hover:bg-gray-700 dark:hover:bg-meta-4 hover:text-white ${
                  (pathname === '/files' || pathname.includes('files')) &&
                  'bg-indigo-400 text-white'
                }`}
              >
                <IconFolderOpen
                  size={26}
                  className="duration-300 ease-in-out transform group-hover:scale-105"
                />
                <span className="duration-300 ease-in-out transform group-hover:scale-105">
                  File System
                </span>
              </NavLink>
              <NavLink
                to="/Search"
                style={{
                  fontWeight: 700,
                  marginRight: '2px',
                  borderRadius: '8px',
                  fontSize: 16,
                  letterSpacing: '0.5px',
                }}
                className={`group relative flex items-center gap-3 rounded-sm py-3 px-4 font-medium text-bodydark1 duration-300 ease-in-out hover:bg-gray-700 dark:hover:bg-meta-4 hover:text-white ${
                  (pathname === '/Search' || pathname.includes('Search')) &&
                  'bg-indigo-400 text-white'
                }`}
              >
                <IconFolderSearch
                  size={26}
                  className="duration-300 ease-in-out transform group-hover:scale-105"
                />

                <span className="duration-300 ease-in-out transform group-hover:scale-105">
                  Search Document
                </span>
              </NavLink>

              <NavLink
                to="/monitor"
                style={{
                  fontWeight: 700,
                  marginRight: '2px',
                  borderRadius: '8px',
                  fontSize: 16,
                  letterSpacing: '0.5px',
                }}
                className={`group relative flex items-center gap-3 rounded-sm py-3 px-4 font-medium text-bodydark1 duration-300 ease-in-out hover:bg-gray-700 dark:hover:bg-meta-4 hover:text-white ${
                  (pathname === '/monitor' || pathname.includes('monitor')) &&
                  'bg-indigo-400 text-white'
                }`}
              >
                <IconChartHistogram
                  size={26}
                  className="duration-300 ease-in-out transform group-hover:scale-105"
                />
                <span className="duration-300 ease-in-out transform group-hover:scale-105">
                  Monitor Processes
                </span>
              </NavLink>
              {isPhysicalDocumentKeeper ? (
                <NavLink
                  to="/meta-data"
                  style={{
                    fontWeight: 700,
                    marginRight: '2px',
                    borderRadius: '8px',
                    fontSize: 16,
                    letterSpacing: '0.5px',
                  }}
                  className={`group relative flex items-center gap-3 rounded-sm py-3 px-4 font-medium text-bodydark1 duration-300 ease-in-out hover:bg-gray-700 dark:hover:bg-meta-4 hover:text-white ${
                    (pathname === '/meta-data' ||
                      pathname.includes('meta-data')) &&
                    'bg-indigo-400 text-white'
                  }`}
                >
                  <IconDatabaseCog
                    size={26}
                    className="duration-300 ease-in-out transform group-hover:scale-105"
                  />
                  <span className="duration-300 ease-in-out transform group-hover:scale-105">
                    Meta Data Form
                  </span>
                </NavLink>
              ) : null}

              {show && (
                <>
                  <SidebarLinkGroup
                    activeCondition={
                      pathname === '/branches' || pathname.includes('branches')
                    }
                  >
                    {() => {
                      return (
                        <React.Fragment>
                          <NavLink
                            to="#"
                            style={{
                              fontWeight: 700,
                              marginRight: '2px',
                              borderRadius: '8px',
                              fontSize: 16,
                              letterSpacing: '0.5px',
                            }}
                            className={`group relative flex items-center gap-3 rounded-sm px-4 py-3 font-medium text-bodydark1 duration-300 ease-in-out hover:bg-gray-700 dark:hover:bg-meta-4 hover:text-white ${
                              (pathname === '/branches' ||
                                pathname.includes('branches')) &&
                              'bg-indigo-400 text-white'
                            }`}
                            onClick={(e) => {
                              e.preventDefault();
                              sidebarExpanded
                                ? setOpen((prev) =>
                                    prev === 'branches' ? '' : 'branches',
                                  )
                                : setSidebarExpanded(true);
                            }}
                          >
                            <IconSitemap className="duration-300 ease-in-out transform group-hover:scale-105" />
                            <span className="duration-300 ease-in-out transform group-hover:scale-105">
                              Branches
                            </span>
                            <IconCaretDown
                              size={18}
                              className={`absolute right-4 top-1/2 -translate-y-1/2 transform fill-current duration-300 ease-in-out ${
                                open === 'branches' ? 'rotate-180' : 'rotate-0'
                              }`}
                            />
                          </NavLink>

                          {/* <!-- Dropdown Menu Start --> */}
                          {open === 'branches' && (
                            <Stack gap={1} sx={{ ml: 4.2, mt: 1, mb: 1 }}>
                              <div
                                className={`translate transform overflow-hidden ${
                                  !(open === 'branches') && 'hidden'
                                }`}
                              >
                                <NavLink
                                  to="/branches/list"
                                  className={({ isActive }) =>
                                    'group relative flex items-center gap-2.5 rounded-md pl-2 font-medium text-bodydark2 duration-300 ease-in-out hover:text-white ' +
                                    (isActive && '!text-white')
                                  }
                                >
                                  <IconCornerDownRight />
                                  List Branches
                                </NavLink>
                              </div>
                              <div
                                className={`translate transform overflow-hidden ${
                                  !(open === 'branches') && 'hidden'
                                }`}
                              >
                                <NavLink
                                  to="/branches/createNew"
                                  className={({ isActive }) =>
                                    'group relative flex items-center gap-2.5 rounded-md pl-2 font-medium text-bodydark2 duration-300 ease-in-out hover:text-white ' +
                                    (isActive && '!text-white')
                                  }
                                >
                                  <IconCornerDownRight />
                                  Create Branch
                                </NavLink>
                              </div>
                            </Stack>
                          )}
                          {/* <!-- Dropdown Menu End --> */}
                        </React.Fragment>
                      );
                    }}
                  </SidebarLinkGroup>

                  <SidebarLinkGroup
                    activeCondition={
                      pathname === '/users' || pathname.includes('users')
                    }
                  >
                    {() => {
                      return (
                        <React.Fragment>
                          <NavLink
                            to="#"
                            style={{
                              fontWeight: 700,
                              marginRight: '2px',
                              borderRadius: '8px',
                              fontSize: 16,
                            }}
                            className={`group relative flex items-center gap-3 rounded-sm px-4 py-3 font-medium text-bodydark1 duration-300 ease-in-out hover:bg-gray-700 dark:hover:bg-meta-4 hover:text-white ${
                              (pathname === '/users' ||
                                pathname.includes('users')) &&
                              'bg-indigo-400 text-white'
                            }`}
                            onClick={(e) => {
                              e.preventDefault();
                              sidebarExpanded
                                ? setOpen((prev) =>
                                    prev === 'users' ? '' : 'users',
                                  )
                                : setSidebarExpanded(true);
                            }}
                          >
                            <IconUser
                              size={26}
                              className="duration-300 ease-in-out transform group-hover:scale-105"
                            />
                            <span className="duration-300 ease-in-out transform group-hover:scale-105">
                              Users
                            </span>
                            <IconCaretDown
                              size={18}
                              className={`absolute right-4 top-1/2 -translate-y-1/2 transform fill-current duration-300 ease-in-out ${
                                open === 'users' ? 'rotate-180' : 'rotate-0'
                              }`}
                            />
                          </NavLink>

                          {/* <!-- Dropdown Menu Start --> */}
                          {open === 'users' && (
                            <Stack gap={1} sx={{ ml: 4.2, mt: 1, mb: 1 }}>
                              <div
                                className={`translate transform overflow-hidden ${
                                  !(open === 'users') && 'hidden'
                                }`}
                              >
                                <NavLink
                                  to="/users/list"
                                  className={({ isActive }) =>
                                    'group relative flex items-center gap-2.5 rounded-md pl-2 font-medium text-bodydark2 duration-300 ease-in-out hover:text-white ' +
                                    (isActive && '!text-white')
                                  }
                                >
                                  <IconCornerDownRight />
                                  List Users
                                </NavLink>
                              </div>
                              <div
                                className={`translate transform overflow-hidden ${
                                  !(open === 'users') && 'hidden'
                                }`}
                              >
                                <NavLink
                                  to="/users/createNew"
                                  className={({ isActive }) =>
                                    'group relative flex items-center gap-2.5 rounded-md pl-2 font-medium text-bodydark2 duration-300 ease-in-out hover:text-white ' +
                                    (isActive && '!text-white')
                                  }
                                >
                                  <IconCornerDownRight />
                                  Create User
                                </NavLink>
                              </div>
                            </Stack>
                          )}
                          {/* <!-- Dropdown Menu End --> */}
                        </React.Fragment>
                      );
                    }}
                  </SidebarLinkGroup>

                  <SidebarLinkGroup
                    activeCondition={
                      pathname === '/roles' || pathname.includes('roles')
                    }
                  >
                    {() => {
                      return (
                        <React.Fragment>
                          <NavLink
                            to="#"
                            style={{
                              fontWeight: 700,
                              marginRight: '2px',
                              borderRadius: '8px',
                              fontSize: 16,
                            }}
                            className={`group relative flex items-center gap-3 rounded-sm px-4 py-3 font-medium text-bodydark1 duration-300 ease-in-out hover:bg-gray-700 dark:hover:bg-meta-4 ${
                              (pathname === '/roles' ||
                                pathname.includes('roles')) &&
                              'bg-indigo-400 text-white'
                            }`}
                            onClick={(e) => {
                              e.preventDefault();
                              sidebarExpanded
                                ? setOpen((prev) =>
                                    prev === 'roles' ? '' : 'roles',
                                  )
                                : setSidebarExpanded(true);
                            }}
                          >
                            <IconUserSquareRounded className="duration-300 ease-in-out transform group-hover:scale-105" />
                            <span className="duration-300 ease-in-out transform group-hover:scale-105">
                              Roles
                            </span>
                            <IconCaretDown
                              size={18}
                              className={`absolute right-4 top-1/2 -translate-y-1/2 transform fill-current duration-300 ease-in-out ${
                                open === 'roles' ? 'rotate-180' : 'rotate-0'
                              }`}
                            />
                          </NavLink>

                          {/* <!-- Dropdown Menu Start --> */}
                          {open === 'roles' && (
                            <Stack gap={1} sx={{ ml: 4.2, mt: 1, mb: 1 }}>
                              <div
                                className={`translate transform overflow-hidden ${
                                  !(open === 'roles') && 'hidden'
                                }`}
                              >
                                <NavLink
                                  to="/roles/list"
                                  className={({ isActive }) =>
                                    'group relative flex items-center gap-2.5 rounded-md pl-2 font-medium text-bodydark2 duration-300 ease-in-out hover:text-white ' +
                                    (isActive && '!text-white')
                                  }
                                >
                                  <IconCornerDownRight />
                                  List Roles
                                </NavLink>
                              </div>
                              <div
                                className={`translate transform overflow-hidden ${
                                  !(open === 'roles') && 'hidden'
                                }`}
                              >
                                <NavLink
                                  to="/roles/createNew"
                                  className={({ isActive }) =>
                                    'group relative flex items-center gap-2.5 rounded-md pl-2 font-medium text-bodydark2 duration-300 ease-in-out hover:text-white ' +
                                    (isActive && '!text-white')
                                  }
                                >
                                  <IconCornerDownRight />
                                  Create Role
                                </NavLink>
                              </div>
                            </Stack>
                          )}
                          {/* <!-- Dropdown Menu End --> */}
                        </React.Fragment>
                      );
                    }}
                  </SidebarLinkGroup>

                  <SidebarLinkGroup
                    activeCondition={
                      pathname === '/department' ||
                      pathname.includes('department')
                    }
                  >
                    {() => {
                      return (
                        <React.Fragment>
                          <NavLink
                            to="#"
                            style={{
                              fontWeight: 700,
                              marginRight: '2px',
                              borderRadius: '8px',
                              fontSize: 16,
                            }}
                            className={`group relative flex items-center gap-3 rounded-sm px-4 py-3 font-medium text-bodydark1 duration-300 ease-in-out hover:bg-gray-700 dark:hover:bg-meta-4 ${
                              (pathname === '/department' ||
                                pathname.includes('department')) &&
                              'bg-indigo-400 text-white'
                            }`}
                            onClick={(e) => {
                              e.preventDefault();
                              sidebarExpanded
                                ? setOpen((prev) =>
                                    prev === 'department' ? '' : 'department',
                                  )
                                : setSidebarExpanded(true);
                            }}
                          >
                            <IconBuildingEstate
                              size={26}
                              className="duration-300 ease-in-out transform group-hover:scale-105"
                            />
                            <span className="duration-300 ease-in-out transform group-hover:scale-105">
                              Departments
                            </span>
                            <IconCaretDown
                              size={18}
                              className={`absolute right-4 top-1/2 -translate-y-1/2 transform fill-current duration-300 ease-in-out ${
                                open === 'department'
                                  ? 'rotate-180'
                                  : 'rotate-0'
                              }`}
                            />
                          </NavLink>

                          {/* <!-- Dropdown Menu Start --> */}
                          {open === 'department' && (
                            <div className="translate transform overflow-hidden">
                              <ul className="mt-4 mb-5.5 flex flex-col gap-2 pl-6">
                                <li>
                                  <NavLink
                                    to="/departments/list"
                                    className={({ isActive }) =>
                                      'group relative flex items-center gap-2.5 rounded-md pl-2 font-medium text-bodydark2 duration-300 ease-in-out hover:text-white ' +
                                      (isActive && '!text-white')
                                    }
                                  >
                                    <IconCornerDownRight />
                                    List Departments
                                  </NavLink>
                                </li>
                                <li>
                                  <NavLink
                                    to="/departments/createNew"
                                    className={({ isActive }) =>
                                      'group relative flex items-center gap-2.5 rounded-md pl-2 font-medium text-bodydark2 duration-300 ease-in-out hover:text-white ' +
                                      (isActive && '!text-white')
                                    }
                                  >
                                    <IconCornerDownRight />
                                    Create Department
                                  </NavLink>
                                </li>
                              </ul>
                            </div>
                          )}
                          {/* <!-- Dropdown Menu End --> */}
                        </React.Fragment>
                      );
                    }}
                  </SidebarLinkGroup>
                </>
              )}
              <SidebarLinkGroup
                activeCondition={
                  pathname === '/processes' || pathname.includes('processes')
                }
              >
                {() => {
                  return (
                    <React.Fragment>
                      <NavLink
                        to="#"
                        style={{
                          fontWeight: 700,
                          marginRight: '2px',
                          borderRadius: '8px',
                          fontSize: 16,
                        }}
                        className={`group relative flex items-center gap-3 rounded-sm px-4 py-3 font-medium text-bodydark1 duration-300 ease-in-out hover:bg-gray-700 dark:hover:bg-meta-4 ${
                          (pathname === '/processes' ||
                            pathname.includes('processes')) &&
                          'bg-indigo-400 text-white'
                        }`}
                        onClick={(e) => {
                          e.preventDefault();
                          sidebarExpanded
                            ? setOpen((prev) =>
                                prev === 'processes' ? '' : 'processes',
                              )
                            : setSidebarExpanded(true);
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="28"
                          height="28"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="duration-300 ease-in-out transform group-hover:scale-105"
                        >
                          <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                          <path d="M3 7m0 2a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v9a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2z" />
                          <path d="M8 7v-2a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2v2" />
                          <path d="M12 12l0 .01" />
                          <path d="M3 13a20 20 0 0 0 18 0" />
                        </svg>
                        <span className="duration-300 ease-in-out transform group-hover:scale-105">
                          Processes
                        </span>
                        <IconCaretDown
                          size={18}
                          className={`absolute right-4 top-1/2 -translate-y-1/2 transform fill-current duration-300 ease-in-out ${
                            open === 'processes' ? 'rotate-180' : 'rotate-0'
                          }`}
                        />
                      </NavLink>

                      {/* <!-- Dropdown Menu Start --> */}
                      {open === 'processes' && (
                        <div className="translate transform overflow-hidden">
                          <ul className="mt-4 mb-5.5 flex flex-col gap-2.5 pl-8">
                            <li>
                              <NavLink
                                to="/processes/work"
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md pl-2 font-medium text-bodydark2 duration-300 ease-in-out hover:text-white ' +
                                  (isActive && '!text-white')
                                }
                              >
                                <IconCornerDownRight />
                                Pending Work
                              </NavLink>
                            </li>
                            <li>
                              <NavLink
                                to="/processes/logs"
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md pl-2 font-medium text-bodydark2 duration-300 ease-in-out hover:text-white ' +
                                  (isActive && '!text-white')
                                }
                              >
                                <IconCornerDownRight />
                                Logs
                              </NavLink>
                            </li>
                            <li>
                              <NavLink
                                to="/processes/published"
                                className={({ isActive }) =>
                                  'group relative flex items-center gap-2.5 rounded-md pl-2 font-medium text-bodydark2 duration-300 ease-in-out hover:text-white ' +
                                  (isActive && '!text-white')
                                }
                              >
                                <IconCornerDownRight />
                                Published
                              </NavLink>
                            </li>
                            {sessionStorage.getItem('initiator') === 'true' && (
                              <li>
                                <NavLink
                                  to="/processes/initiate"
                                  className={({ isActive }) =>
                                    'group relative flex items-center gap-2.5 rounded-md pl-2 font-medium text-bodydark2 duration-300 ease-in-out hover:text-white ' +
                                    (isActive && '!text-white')
                                  }
                                >
                                  <IconCornerDownRight />
                                  Initiate Process
                                </NavLink>
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                      {/* <!-- Dropdown Menu End --> */}
                    </React.Fragment>
                  );
                }}
              </SidebarLinkGroup>
              {isPhysicalDocumentKeeper ? (
                <NavLink
                  to="/physicalDocuments"
                  onClick={() => {
                    sessionStorage.setItem('path', '..');
                    dispatch(defaultPath());
                  }}
                  style={{
                    fontWeight: 700,
                    marginRight: '2px',
                    borderRadius: '8px',
                    fontSize: 16,
                    letterSpacing: '0.5px',
                  }}
                  className={`group relative flex items-center gap-3 rounded-sm py-3 px-4 font-medium text-bodydark1 duration-300 ease-in-out hover:bg-gray-700 dark:hover:bg-meta-4 hover:text-white ${
                    (pathname === '/physicalDocuments' ||
                      pathname.includes('physicalDocuments')) &&
                    'bg-indigo-400 text-white'
                  }`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="duration-300 ease-in-out transform group-hover:scale-105"
                  >
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <path d="M11 18l-2 -1l-6 3v-13l6 -3l6 3l6 -3v7.5" />
                    <path d="M9 4v13" />
                    <path d="M15 7v5" />
                    <path d="M18 18m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
                    <path d="M20.2 20.2l1.8 1.8" />
                  </svg>
                  <span className="duration-300 ease-in-out transform group-hover:scale-105">
                    Documents Tracking
                  </span>
                </NavLink>
              ) : null}
            </ul>
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
