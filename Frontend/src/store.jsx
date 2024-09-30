import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const sessionData = create(
    persist(
        (set) => ({
            path: '..',
            setPath: (path) => set({ path }),

        }),
        {
            name: 'store-data',
            storage: createJSONStorage(() => sessionStorage),
        },
    ),
);

export default sessionData;
