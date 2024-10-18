import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const sessionData = create(
  persist(
    (set) => ({
      work: '',
      profileImage: '',
      notifications: [],
      alerts: [],
      dashDepartment: '',
      dashBranch: '',
      dashId: '',
      pickedProcesses: '',
      show: false,
      socketConnection: null,
      setSocketConnection: (connection) => {
        console.log(connection);
        set({ socketConnection: connection });
      },
      setShow: (show) => set({ show }),
      setDashDepartment: (dashDepartment) => set({ dashDepartment }),
      setDashId: (dashId) => set({ dashId }),
      setDashBranch: (dashBranch) => set({ dashBranch }),
      setWork: (work) => set({ work }),
      setPickedProcesses: (pickedProcesses) => set({ pickedProcesses }),
      setNotifications: (notifications) => set({ notifications }),
      setProfileImage: (profileImage) => set({ profileImage }),
      setAlerts: (alerts) => set({ alerts }),
      reset: () =>
        set({
          work: '',
          profileImage: '',
          notifications: [],
          alerts: [],
          dashDepartment: '',
          dashBranch: '',
          dashId: '',
          pickedProcesses: '',
          show: false,
        }),
    }),
    {
      name: 'store-data',
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
export const socketData = create((set) => ({
  socketConnection: null,
  setSocketConnection: (connection) => set({ socketConnection: connection }),
}));

export default sessionData;
