import React, { useState, ReactNode } from 'react';
import Header from '../components/Header/index';
import Sidebar from '../components/Sidebar/index';
import { useIdleTimer } from 'react-idle-timer';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import { toast } from 'react-toastify';
import { LogOut } from '../common/Apis';
const DefaultLayout: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [idle, setIdle] = useState(false);

  const navigate = useNavigate();
  const onIdle = () => {
    setIdle(true);
  };
  const time = 10 * 60 * 1000;
  useIdleTimer({
    onIdle,
    timeout: time,
    throttle: 500,
  });

  // window.onbeforeunload = function () {
  //   sessionStorage.clear();
  //   return '';
  // };

  const handleRedirect = async () => {
    try {
      const response = await LogOut();
      sessionStorage.clear();
      toast.success(response?.data?.message);
      navigate('/auth/signin');
    } catch (error) {
      toast.error(error?.response?.data?.error || error?.message);
    }
  };
  return (
    <div className="dark:bg-boxdark-2 dark:text-bodydark">
      {/* <!-- ===== Page Wrapper Start ===== --> */}
      <div className="flex h-screen overflow-hidden">
        {/* <!-- ===== Sidebar Start ===== --> */}
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        {/* <!-- ===== Sidebar End ===== --> */}

        {/* <!-- ===== Content Area Start ===== --> */}
        <div className="relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
          {/* <!-- ===== Header Start ===== --> */}
          <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
          {/* <!-- ===== Header End ===== --> */}

          {/* <!-- ===== Main Content Start ===== --> */}
          <main>
            <div className="mx-auto max-w-screen-2xl p-2 md:p-3">
              {children}
            </div>
          </main>
          {/* <!-- ===== Main Content End ===== --> */}
        </div>
        {/* <!-- ===== Content Area End ===== --> */}
      </div>
      {/* <!-- ===== Page Wrapper End ===== --> */}
      <Dialog
        open={idle}
        sx={{ backgroundFilter: 'blur(3px)', zIndex: 99999999 }}
      >
        <DialogTitle>
          <Typography variant="h5">Session timeout!</Typography>
        </DialogTitle>
        <DialogContent>
          Your session time is out, Please re-login to system.
        </DialogContent>
        <DialogActions>
          <Button variant="contained" color="success" onClick={handleRedirect}>
            Ok
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default DefaultLayout;
