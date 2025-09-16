import { Link } from 'react-router-dom';
import DropdownMessage from './DropdownMessage';
import DropdownNotification from './DropdownNotification';
import DropdownUser from './DropdownUser';
import LogoIcon from '../../assets/images/ssbi-Logo1.png';
import smallLogo from '../../assets/images/logo.png';
import sessionData from '../../Store';
import { useEffect } from 'react';
import axios from 'axios';
// import DarkModeSwitcher from './DarkModeSwitcher';

const Header = (props: {
  sidebarOpen: string | boolean | undefined;
  setSidebarOpen: (arg0: boolean) => void;
}) => {
  const { setNotifications, notifications, setAlerts } = sessionData();
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const fetchNotifications = async () => {
    try {
      const url = backendUrl + '/getUserProcessNotifications';
      const res = await axios.post(url, null, {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem('accessToken')}`,
        },
      });
      if (res.status === 200 && res.data.notifications) {
        // setNotifications(res.data.notifications);
        const uniqueNotifications = [
          ...new Map(
            res?.data?.notifications?.map((item: any) => [item._id, item]),
          ).values(),
        ]?.filter((item: any) => !item.isAlert);

        const alerts = [
          ...new Map(
            notifications?.map((item: any) => [item._id, item]),
          ).values(),
        ]?.filter((item: any) => item.isAlert);

        setNotifications(uniqueNotifications);
        setAlerts(alerts);
      }
    } catch (error) {
      console.error('error', error);
    }
  };

  useEffect(() => {
    setTimeout(() => {
      if (notifications.length === 0) {
        fetchNotifications();
      }
    }, 200);
  }, []);
  return (
    <header className="sticky top-0 z-[70] flex w-full bg-white drop-shadow-1 dark:bg-boxdark dark:drop-shadow-none">
      <div className="flex flex-grow items-center justify-between px-4 py-4 shadow-2 md:px-6 2xl:px-11">
        <div className="flex items-center gap-2 sm:gap-4">
          {/* <!-- Hamburger Toggle BTN --> */}
          <button
            aria-controls="sidebar"
            onClick={(e) => {
              e.stopPropagation();
              props.setSidebarOpen(!props.sidebarOpen);
            }}
            className="z-99999 block rounded-sm border border-stroke bg-white p-1.5 shadow-sm dark:border-strokedark dark:bg-boxdark lg:hidden"
          >
            <span className="relative block h-5.5 w-5.5 cursor-pointer">
              <span className="du-block absolute right-0 h-full w-full">
                <span
                  className={`relative left-0 top-0 my-1 block h-0.5 w-0 rounded-sm bg-black delay-[0] duration-200 ease-in-out dark:bg-white ${
                    !props.sidebarOpen && '!w-full delay-300'
                  }`}
                ></span>
                <span
                  className={`relative left-0 top-0 my-1 block h-0.5 w-0 rounded-sm bg-black delay-150 duration-200 ease-in-out dark:bg-white ${
                    !props.sidebarOpen && 'delay-400 !w-full'
                  }`}
                ></span>
                <span
                  className={`relative left-0 top-0 my-1 block h-0.5 w-0 rounded-sm bg-black delay-200 duration-200 ease-in-out dark:bg-white ${
                    !props.sidebarOpen && '!w-full delay-500'
                  }`}
                ></span>
              </span>
              <span className="absolute right-0 h-full w-full rotate-45">
                <span
                  className={`absolute left-2.5 top-0 block h-full w-0.5 rounded-sm bg-black delay-300 duration-200 ease-in-out dark:bg-white ${
                    !props.sidebarOpen && '!h-0 !delay-[0]'
                  }`}
                ></span>
                <span
                  className={`delay-400 absolute left-0 top-2.5 block h-0.5 w-full rounded-sm bg-black duration-200 ease-in-out dark:bg-white ${
                    !props.sidebarOpen && '!h-0 !delay-200'
                  }`}
                ></span>
              </span>
            </span>
          </button>
          {/* <!-- Hamburger Toggle BTN --> */}

          <Link className="hidden md:block flex-shrink-0" to="/">
            <img style={{ height: '40px' }} src={LogoIcon} alt="Logo" />
          </Link>
          <Link className="md:hidden flex-shrink-0" to="/">
            <img style={{ height: '40px' }} src={smallLogo} alt="Logo" />
          </Link>
        </div>

        <div className="flex items-center gap-3 2xsm:gap-7">
          <ul className="flex items-center gap-2 2xsm:gap-4">
            <li>
              <DropdownNotification />
            </li>
            <li>
              <DropdownMessage />
            </li>
            <li>
              <DropdownUser />
            </li>
            {/* <DarkModeSwitcher /> */}
          </ul>
        </div>
      </div>
    </header>
  );
};

export default Header;
