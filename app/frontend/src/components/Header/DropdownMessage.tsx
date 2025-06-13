import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import sessionData from '../../Store';
import axios from 'axios';

const DropdownMessage = () => {
  const { alerts, setAlerts } = sessionData();
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const dropdown = useRef<any>(null);
  const navigate = useNavigate();
  const handleViewProcess = (id: any, workflow: any, forMonitoring: any) => {
    if (forMonitoring) {
      navigate(
        `/monitor/View?data=${encodeURIComponent(
          id,
        )}&workflow=${encodeURIComponent(workflow)}`,
      );
    } else {
      navigate(
        `/processes/work/view?data=${encodeURIComponent(
          id,
        )}&workflow=${encodeURIComponent(workflow)}`,
      );
    }
  };
  const handleRemoveNotification = async (id: any) => {
    try {
      const url = backendUrl + `/removeProcessNotification/${id}`;
      const res = await axios.post(url, null, {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem('accessToken')}`,
        },
      });
      if (res.status === 200) {
        const updatedNotifications = alerts.filter(
          (item) => item.processId !== id,
        );
        setAlerts(updatedNotifications);
      }
    } catch (error) {
      console.error('error', error);
    }
  };

  return (
    <li className="relative">
      <div
        className="border border-gray-300"
        style={{
          display: 'flex',
          position: 'relative',
          justifyContent: 'center',
          alignItems: 'center',
          height: '35px',
          width: '35px',
          background: '#EFF4FB',
          borderRadius: '50%',
        }}
        onClick={() => setDropdownOpen(!dropdownOpen)}
      >
        <span
          className={`absolute -top-0.5 right-0 h-2 w-2 rounded-full bg-meta-1 ${
            alerts.length ? 'inline' : 'hidden'
          }`}
        >
          <span className="absolute -z-1 inline-flex h-full w-full animate-ping rounded-full bg-meta-1 opacity-75"></span>
        </span>

        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path stroke="none" d="M0 0h24v24H0z" fill="none" />
          <path d="M12 8v4" />
          <path d="M12 16h.01" />
        </svg>
      </div>
      {dropdownOpen && (
        <div
          className="fixed inset-0 bg-black opacity-0 z-20"
          onClick={() => setDropdownOpen(false)}
          style={{ height: '100vh', width: '100vw' }}
        ></div>
      )}
      {/* <!-- Dropdown Start --> */}
      <div
        ref={dropdown}
        onFocus={() => setDropdownOpen(true)}
        onBlur={() => setDropdownOpen(false)}
        className={`absolute -right-16 mt-2.5 flex h-90 w-75 flex-col rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark sm:right-0 sm:w-80 ${
          dropdownOpen === true ? 'block' : 'hidden'
        }`}
      >
        <div className="px-4.5 py-3">
          <h5 className="text-sm font-medium text-bodydark2">Alerts</h5>
        </div>
        <hr style={{ color: 'lightgray' }} />
        <ul className="flex h-auto flex-col overflow-y-auto">
          {alerts.length ? (
            alerts.map((item: any) => {
              return (
                <li>
                  <div
                    style={{ cursor: 'pointer' }}
                    className="flex flex-col gap-2.5 border-t border-stroke px-4.5 py-3 hover:bg-gray-2 dark:border-strokedark dark:hover:bg-meta-4"
                    onClick={() => {
                      // setWork(item.work);
                      handleRemoveNotification(item.processId);
                      handleViewProcess(
                        item?.processId,
                        item?.workFlowToBeFollowed,
                        item?.forMonitoring,
                      );
                    }}
                  >
                    <p className="text-sm">
                      <span className="text-black dark:text-white">
                        {item.processName}
                      </span>
                    </p>

                    <p className="text-xs">
                      {new Date(item.receivedAt).toLocaleString()}
                    </p>
                  </div>
                </li>
              );
            })
          ) : (
            // <li>
            <h5
              className="text-sm font-medium text-bodydark2 p-3"
              style={{
                textAlign: 'center',
              }}
            >
              No Alerts
            </h5>
            // </li>
          )}
        </ul>
      </div>
      {/* <!-- Dropdown End --> */}
    </li>
  );
};

export default DropdownMessage;
