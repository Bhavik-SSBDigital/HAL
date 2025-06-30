import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import App from './App';
import './css/style.css';
import './css/satoshi.css';
// import 'jsvectormap/dist/css/jsvectormap.css';
import 'flatpickr/dist/flatpickr.min.css';
import { configureStore } from '@reduxjs/toolkit';
import { pathSlice } from './Slices/PathSlice';
import { Provider } from 'react-redux';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const store = configureStore({
  reducer: {
    path: pathSlice.reducer, // Use the reducer property of the slice
  },
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <>
    <ToastContainer
      position="bottom-right"
      autoClose={2000}
      hideProgressBar={true}
      newestOnTop={false}
      closeOnClick
      rtl={false}
      draggable
      pauseOnHover
      style={{ zIndex: '999999' }}
      // theme="light"
    />
    <React.StrictMode>
      <Router>
        <Provider store={store}>
          <App />
        </Provider>
      </Router>
    </React.StrictMode>
  </>,
);
