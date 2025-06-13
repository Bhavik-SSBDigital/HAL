import { useEffect, useState } from 'react';
import { GetNotifications } from '../../common/Apis';
import CustomButton from '../../CustomComponents/CustomButton';
import { useNavigate } from 'react-router-dom';

const DropdownNotification = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const navigate = useNavigate();

  const getNotifications = async () => {
    try {
      const res = await GetNotifications();
      if (res.status === 200) {
        setNotifications(res.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    }
  };

  const handleView = async (id) => {
    navigate(`/process/view/${id}`);
    setDropdownOpen(!dropdownOpen);
  };

  useEffect(() => {
    getNotifications();
  }, []);

  return (
    <li className="relative">
      <div
        className="flex justify-center items-center h-[35px] w-[35px] bg-[#EFF4FB] border border-gray-300 rounded-full cursor-pointer"
        onClick={() => setDropdownOpen(!dropdownOpen)}
      >
        <span
          className={`absolute -top-0.5 right-0 z-1 h-2 w-2 rounded-full bg-meta-1 ${
            notifications.length ? 'inline' : 'hidden'
          }`}
        >
          <span className="absolute -z-1 inline-flex h-full w-full animate-ping rounded-full bg-meta-1 opacity-75"></span>
        </span>
        <svg
          className="fill-current"
          width="18"
          height="18"
          viewBox="0 0 18 18"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M16.2 14.93L15.64 14.06C15.52 13.89 15.47 13.72 15.47 13.53V7.68C15.47 6.02 14.77 4.47 13.47 3.32C12.43 2.39 11.08 1.8 9.65 1.69V1.12C9.65 0.79 9.37 0.48 9 0.48C8.66 0.48 8.35 0.76 8.35 1.12V1.66C4.92 2.05 2.47 4.67 2.47 7.79V13.53C2.45 13.81 2.39 13.95 2.33 14.03L1.8 14.93C1.63 15.22 1.63 15.55 1.8 15.83C1.97 16.09 2.25 16.26 2.56 16.26H8.38V16.87C8.38 17.21 8.66 17.52 9.03 17.52C9.37 17.52 9.67 17.24 9.67 16.87V16.26H15.47C15.78 16.26 16.06 16.09 16.23 15.83C16.4 15.55 16.4 15.22 16.2 14.93ZM3.23 14.99L3.43 14.65C3.6 14.37 3.68 14.03 3.74 13.64V7.79C3.74 5.32 5.71 3.23 8.32 2.95C9.93 2.78 11.5 3.26 12.66 4.27C13.67 5.17 14.23 6.38 14.23 7.68V13.53C14.23 13.95 14.34 14.34 14.6 14.74L14.77 14.99H3.23Z" />
        </svg>
      </div>

      {dropdownOpen && (
        <div
          className="fixed top-0 z-1 left-0 bg-black opacity-0"
          onClick={() => setDropdownOpen(false)}
          style={{ height: '100vh', width: '100vw' }}
        />
      )}

      <div
        className={`absolute right-0 z-9 mt-2.5 w-80 rounded-sm border border-stroke bg-white shadow-default ${
          dropdownOpen ? 'block' : 'hidden'
        }`}
      >
        <div className="px-4 py-3">
          <h5 className="text-sm font-medium text-gray-700">Notifications</h5>
        </div>
        <hr className="border-gray-200" />

        <ul className="max-h-96 overflow-y-auto">
          {notifications.length > 0 ? (
            notifications.map((item) => (
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

export default DropdownNotification;
