import { createBrowserRouter, Navigate } from "react-router-dom";
import Layout from "./Layout";
import Contact from "./Components/Contact";
import Blogs from "./Components/Blogs";
import FileSystem from "./Components/File_System/index";
import Users from './Components/Users'
import Branches from './Components/Branches'
import ProcessList from "./Components/Processes/ProcessList";
import LogsList from "./Components/Logs/LogsList";
import MeetingManager from "./Components/Meeting";
import InitiateForm from "./Components/Processes/InitiateForm";
import Overall from "./Components/Dashboard/Overall";
import Login from "./Components/Authorization/Login";


// ProtectedRoute component
const ProtectedRoute = ({ children }) => {
    const username = sessionStorage.getItem('username');

    if (!username) {
        // If the user is not authenticated, redirect to the login page
        return <Navigate to="/login" replace />;
    }

    // If the user is authenticated, render the children (the protected route)
    return children;
};


const router = createBrowserRouter([
    {
        path: '/',
        element: (
            <ProtectedRoute>
                <Layout />
            </ProtectedRoute>
        ),
        children: [
            {
                path: '/',
                element: <Overall />,
            },
            {
                path: '/files',
                element: <FileSystem />,
            },
            {
                path: '/contact',
                element: <Contact />,
            },
            {
                path: '/blogs',
                element: <Blogs />,
            },
            {
                path: '/branches',
                element: <Branches />,
            },
            {
                path: '/users',
                element: <Users />,
            },
            {
                path: '/processes',
                element: <ProcessList />,
            },
            {
                path: '/logs',
                element: <LogsList />,
            },
            {
                path: '/meeting',
                element: <MeetingManager />,
            },
            {
                path: '/initiate',
                element: <InitiateForm />,
            },
        ],
    },
    {
        path: '/login',
        element: <Login />,
    },
    {
        path: '*',
        element: <Navigate to="/login" />,
    },
]);

export default router;
