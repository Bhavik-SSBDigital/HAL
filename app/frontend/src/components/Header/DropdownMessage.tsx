import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GetNotifications } from '../../common/Apis';
import CustomButton from '../../CustomComponents/CustomButton';

const DropdownMessage = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const dropdown = useRef(null);
  const navigate = useNavigate();

  const getNotifications = async () => {
    try {
      const res = await GetNotifications();

      if (res.status === 200) {
        const now = new Date();
        const filtered = (res.data || [])
          .filter((n) => {
            const createdAt = new Date(n.createdAt);
            const diffInDays =
              (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
            return diffInDays > 15; // only older than 15 days
          })
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );
        setAlerts(filtered);
      }
    } catch (error) {
      console.error('Failed to fetch old notifications', error);
    }
  };

  const handleView = async (id) => {
    navigate(`/process/view/${id}`);
    setDropdownOpen(!dropdownOpen);
  };
  // const handleViewProcess = (id, workflow, forMonitoring) => {
  //   if (forMonitoring) {
  //     navigate(
  //       `/monitor/View?data=${encodeURIComponent(
  //         id,
  //       )}&workflow=${encodeURIComponent(workflow)}`,
  //     );
  //   } else {
  //     navigate(
  //       `/processes/work/view?data=${encodeURIComponent(
  //         id,
  //       )}&workflow=${encodeURIComponent(workflow)}`,
  //     );
  //   }
  //   setDropdownOpen(false);
  // };

  useEffect(() => {
    getNotifications();
  }, []);

  return (
    <li className="relative">
      {/* Bell Icon */}
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
          className="fixed inset-0 bg-black opacity-0 z-1"
          onClick={() => setDropdownOpen(false)}
          style={{ height: '100vh', width: '100vw' }}
        ></div>
      )}

      {/* Dropdown */}
      <div
        ref={dropdown}
        className={`absolute -right-16 z-9 mt-2.5 flex h-90 w-75 flex-col rounded-sm border border-stroke bg-white shadow-default sm:right-0 sm:w-80 ${
          dropdownOpen ? 'block' : 'hidden'
        }`}
      >
        <div className="px-4.5 py-3">
          <h5 className="text-sm font-medium text-gray-700">Alerts</h5>
        </div>
        <hr style={{ color: 'lightgray' }} />

        <ul className="max-h-96 overflow-y-auto">
          {alerts.length > 0 ? (
            alerts.map((item) => (
              <li
                key={item.processId}
                className="border-t px-4 py-3 hover:bg-gray-100"
              >
                <div className="text-sm font-semibold text-black">
                  {item.processName}
                </div>
                <div className="text-xs text-gray-500 mb-2">
                  {new Date(item.createdAt).toLocaleString()}
                </div>
                <CustomButton
                  click={() => handleView(item.processId)}
                  text={'View'}
                  type={'button'}
                  variant={'primary'}
                  disabled={false}
                  title={'View'}
                  className={''}
                />
              </li>
            ))
          ) : (
            <li className="px-4 py-3 text-center text-sm text-gray-500">
              No Notifications
            </li>
          )}
        </ul>
      </div>
    </li>
  );
};

export default DropdownMessage;
