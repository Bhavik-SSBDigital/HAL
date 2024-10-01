import { useState } from 'react'
import './App.css'
import { RouterProvider } from 'react-router-dom'
import router from './Router'
import { ToastContainer } from 'react-toastify'
import { QueryClient, QueryClientProvider } from 'react-query'

function App() {
  const queryClient = new QueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <ToastContainer
        position="bottom-right"
        autoClose={2000}
        hideProgressBar={true}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        draggable
        pauseOnHover
      // style={{ zIndex: '999999' }}
      // theme="light"
      />
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}

export default App
