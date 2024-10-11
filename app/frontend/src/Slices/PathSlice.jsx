import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  value: '..',
  sourcePath: '..',
  fileName: '',
  method: '',
};

export const pathSlice = createSlice({
  name: 'path',
  initialState,
  reducers: {
    setPath: (state, action) => {
      state.value = `${state.value}/${action.payload}`;
      // sessionStorage.setItem('path', state.value);
    },
    backButtonPath: (state, action) => {
      state.value = action.payload;
      // sessionStorage.setItem('path', state.value);
    },
    sideBarPath: (state, action) => {
      sessionStorage.setItem('path', action.payload);
      state.value = action.payload;
    },
    defaultPath: (state) => {
      state.value = "..";
      // sessionStorage.setItem('path', state.value);
    },
    copy: (state, action) => {
      const { name, pathValue, method } = action.payload
      state.fileName = name;
      state.sourcePath = `${pathValue}/${name}`;
      state.method = `${method}`
    },
    cut: (state, action) => {
      const { name, pathValue, method } = action.payload
      state.fileName = name;
      state.sourcePath = `${pathValue}/${name}`;
      state.method = `${method}`
    },
    onReload: (state, action) => {
      state.value = action.payload;
    }
  },
});

export const { setPath, backButtonPath, sideBarPath, defaultPath, copy, cut, onReload } = pathSlice.actions;

export default pathSlice.reducer;
