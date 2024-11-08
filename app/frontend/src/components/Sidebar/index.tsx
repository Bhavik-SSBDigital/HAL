import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import SidebarLinkGroup from './SidebarLinkGroup';
// import Logo from '../../assets/images/kdccLogo1.png';
import { Button, Stack, Tooltip } from '@mui/material';
import sessionData from '../../Store';
import { IconCornerDownRight, IconUserCircle } from '@tabler/icons-react';
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
  const isPhysicalDocumentKeeper = sessionStorage.getItem(
    'isKeeperOfPhysicalDocs',
  );

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
          strokeWidth="2"
          strokeLinecap="round"
          color="white"
          strokeLinejoin="round"
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
                          <path d="M12 13m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
                          <path d="M13.45 11.55l2.05 -2.05" />
                          <path d="M6.4 20a9 9 0 1 1 11.2 0z" />
                        </svg>
                        <span className="duration-300 ease-in-out transform group-hover:scale-105">
                          Dashboard
                        </span>
                        <svg
                          className={`absolute right-4 top-1/2 -translate-y-1/2 transform fill-current duration-300 ease-in-out ${
                            open === 'dashboard' ? 'rotate-180' : 'rotate-0'
                          }`}
                          width="20"
                          height="20"
                          viewBox="0 0 20 20"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            fillRule="evenodd"
                            clipRule="evenodd"
                            d="M4.41107 6.9107C4.73651 6.58527 5.26414 6.58527 5.58958 6.9107L10.0003 11.3214L14.4111 6.91071C14.7365 6.58527 15.2641 6.58527 15.5896 6.91071C15.915 7.23614 15.915 7.76378 15.5896 8.08922L10.5896 13.0892C10.2641 13.4147 9.73651 13.4147 9.41107 13.0892L4.41107 8.08922C4.08563 7.76378 4.08563 7.23614 4.41107 6.9107Z"
                            fill="currentColor"
                          />
                        </svg>
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
                  <path d="M5 12l-2 0l9 -9l9 9l-2 0" />
                  <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-7" />
                  <path d="M9 21v-6a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v6" />
                </svg>
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
                  <path d="M14 3v4a1 1 0 0 0 1 1h4" />
                  <path d="M12 21h-5a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v4.5" />
                  <path d="M16.5 17.5m-2.5 0a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0 -5 0" />
                  <path d="M18.5 19.5l2.5 2.5" />
                </svg>

                <span className="duration-300 ease-in-out transform group-hover:scale-105">
                  Search Document
                </span>
              </NavLink>
              <NavLink
                to="/meeting"
                style={{
                  fontWeight: 700,
                  marginRight: '2px',
                  borderRadius: '8px',
                  fontSize: 16,
                  letterSpacing: '0.5px',
                }}
                className={`group relative flex items-center gap-3 rounded-sm py-3 px-4 font-medium text-bodydark1 duration-300 ease-in-out hover:bg-gray-700 dark:hover:bg-meta-4 hover:text-white ${
                  (pathname === '/meeting' || pathname.includes('meeting')) &&
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
                  <path d="M11.795 21h-6.795a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v4" />
                  <path d="M18 18m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" />
                  <path d="M15 3v4" />
                  <path d="M7 3v4" />
                  <path d="M3 11h16" />
                  <path d="M18 16.496v1.504l1 1" />
                </svg>
                <span className="duration-300 ease-in-out transform group-hover:scale-105">
                  Meeting Manager
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
                  <path d="M3 5a1 1 0 0 1 1 -1h16a1 1 0 0 1 1 1v10a1 1 0 0 1 -1 1h-16a1 1 0 0 1 -1 -1v-10z" />
                  <path d="M7 20h10" />
                  <path d="M9 16v4" />
                  <path d="M15 16v4" />
                </svg>
                <span className="duration-300 ease-in-out transform group-hover:scale-105">
                  Monitor Processes
                </span>
              </NavLink>

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
                              <path
                                stroke="none"
                                d="M0 0h24v24H0z"
                                fill="none"
                              />
                              <path d="M6 20a2 2 0 1 0 -4 0a2 2 0 0 0 4 0z" />
                              <path d="M16 4a2 2 0 1 0 -4 0a2 2 0 0 0 4 0z" />
                              <path d="M16 20a2 2 0 1 0 -4 0a2 2 0 0 0 4 0z" />
                              <path d="M11 12a2 2 0 1 0 -4 0a2 2 0 1 0 4 0z" />
                              <path d="M21 12a2 2 0 1 0 -4 0a2 2 0 0 0 4 0z" />
                              <path d="M5.058 18.306l2.88 -4.606" />
                              <path d="M10.061 10.303l2.877 -4.604" />
                              <path d="M10.065 13.705l2.876 4.6" />
                              <path d="M15.063 5.7l2.881 4.61" />
                            </svg>
                            <span className="duration-300 ease-in-out transform group-hover:scale-105">
                              Branches
                            </span>
                            <svg
                              className={`absolute right-4 top-1/2 -translate-y-1/2 transform fill-current duration-300 ease-in-out ${
                                open === 'branches' ? 'rotate-180' : 'rotate-0'
                              }`}
                              width="20"
                              height="20"
                              viewBox="0 0 20 20"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                fillRule="evenodd"
                                clipRule="evenodd"
                                d="M4.41107 6.9107C4.73651 6.58527 5.26414 6.58527 5.58958 6.9107L10.0003 11.3214L14.4111 6.91071C14.7365 6.58527 15.2641 6.58527 15.5896 6.91071C15.915 7.23614 15.915 7.76378 15.5896 8.08922L10.5896 13.0892C10.2641 13.4147 9.73651 13.4147 9.41107 13.0892L4.41107 8.08922C4.08563 7.76378 4.08563 7.23614 4.41107 6.9107Z"
                                fill="currentColor"
                              />
                            </svg>
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
                              <path
                                stroke="none"
                                d="M0 0h24v24H0z"
                                fill="none"
                              />
                              <path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0" />
                              <path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2" />
                            </svg>
                            <span className="duration-300 ease-in-out transform group-hover:scale-105">
                              Users
                            </span>
                            <svg
                              className={`absolute right-4 top-1/2 -translate-y-1/2 transform fill-current duration-300 ease-in-out ${
                                open === 'users' ? 'rotate-180' : 'rotate-0'
                              }`}
                              width="20"
                              height="20"
                              viewBox="0 0 20 20"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                fillRule="evenodd"
                                clipRule="evenodd"
                                d="M4.41107 6.9107C4.73651 6.58527 5.26414 6.58527 5.58958 6.9107L10.0003 11.3214L14.4111 6.91071C14.7365 6.58527 15.2641 6.58527 15.5896 6.91071C15.915 7.23614 15.915 7.76378 15.5896 8.08922L10.5896 13.0892C10.2641 13.4147 9.73651 13.4147 9.41107 13.0892L4.41107 8.08922C4.08563 7.76378 4.08563 7.23614 4.41107 6.9107Z"
                                fill="currentColor"
                              />
                            </svg>
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
                              <path
                                stroke="none"
                                d="M0 0h24v24H0z"
                                fill="none"
                              />
                              <path d="M9 10a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" />
                              <path d="M6 21v-1a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v1" />
                              <path d="M3 5a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-14z" />
                            </svg>
                            <span className="duration-300 ease-in-out transform group-hover:scale-105">
                              Roles
                            </span>
                            <svg
                              className={`absolute right-4 top-1/2 -translate-y-1/2 transform fill-current duration-300 ease-in-out ${
                                open === 'roles' ? 'rotate-180' : 'rotate-0'
                              }`}
                              width="20"
                              height="20"
                              viewBox="0 0 20 20"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                fillRule="evenodd"
                                clipRule="evenodd"
                                d="M4.41107 6.9107C4.73651 6.58527 5.26414 6.58527 5.58958 6.9107L10.0003 11.3214L14.4111 6.91071C14.7365 6.58527 15.2641 6.58527 15.5896 6.91071C15.915 7.23614 15.915 7.76378 15.5896 8.08922L10.5896 13.0892C10.2641 13.4147 9.73651 13.4147 9.41107 13.0892L4.41107 8.08922C4.08563 7.76378 4.08563 7.23614 4.41107 6.9107Z"
                                fill="currentColor"
                              />
                            </svg>
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
                              <path
                                stroke="none"
                                d="M0 0h24v24H0z"
                                fill="none"
                              />
                              <path d="M9 12l-2 -2v-2a1 1 0 0 1 1 -1h8a1 1 0 0 1 1 1v2l-2 2m-6 0l2 2l2 -2" />
                              <path d="M7 21h10v-4a2 2 0 0 0 -2 -2h-6a2 2 0 0 0 -2 2v4z" />
                            </svg>
                            <span className="duration-300 ease-in-out transform group-hover:scale-105">
                              Departments
                            </span>
                            <svg
                              className={`absolute right-4 top-1/2 -translate-y-1/2 transform fill-current duration-300 ease-in-out ${
                                open === 'department'
                                  ? 'rotate-180'
                                  : 'rotate-0'
                              }`}
                              width="20"
                              height="20"
                              viewBox="0 0 20 20"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                fillRule="evenodd"
                                clipRule="evenodd"
                                d="M4.41107 6.9107C4.73651 6.58527 5.26414 6.58527 5.58958 6.9107L10.0003 11.3214L14.4111 6.91071C14.7365 6.58527 15.2641 6.58527 15.5896 6.91071C15.915 7.23614 15.915 7.76378 15.5896 8.08922L10.5896 13.0892C10.2641 13.4147 9.73651 13.4147 9.41107 13.0892L4.41107 8.08922C4.08563 7.76378 4.08563 7.23614 4.41107 6.9107Z"
                                fill="currentColor"
                              />
                            </svg>
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
                        <svg
                          className={`absolute right-4 top-1/2 -translate-y-1/2 transform fill-current duration-300 ease-in-out ${
                            open === 'processes' ? 'rotate-180' : 'rotate-0'
                          }`}
                          width="20"
                          height="20"
                          viewBox="0 0 20 20"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            fillRule="evenodd"
                            clipRule="evenodd"
                            d="M4.41107 6.9107C4.73651 6.58527 5.26414 6.58527 5.58958 6.9107L10.0003 11.3214L14.4111 6.91071C14.7365 6.58527 15.2641 6.58527 15.5896 6.91071C15.915 7.23614 15.915 7.76378 15.5896 8.08922L10.5896 13.0892C10.2641 13.4147 9.73651 13.4147 9.41107 13.0892L4.41107 8.08922C4.08563 7.76378 4.08563 7.23614 4.41107 6.9107Z"
                            fill="currentColor"
                          />
                        </svg>
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
              {isPhysicalDocumentKeeper == 'true' ? (
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
