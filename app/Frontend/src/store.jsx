import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const sessionData = create(
    persist(
        (set) => ({
            path: '..',
            work: '',
            pickedProcesses: "",

            setPath: (path) => set({ path }),
            setPickedProcesses: (pickedProcesses) => set({ pickedProcesses }),
            setWork: (work) => set({ work }),

        }),
        {
            name: 'store-data',
            storage: createJSONStorage(() => sessionStorage),
        },
    ),
);

export default sessionData;
