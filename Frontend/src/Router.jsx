import { createBrowserRouter } from "react-router-dom";
import Layout from "./Layout";
import Contact from "./Components/Contact";
import Dashboard from "./Components/Dashboard";
import Blogs from "./Components/Blogs";
import FileSystem from "./Components/File_System/index";
import Users from './Components/Users'
import Branches from './Components/Branches'

const router = createBrowserRouter([
    {
        path: '/',
        element: <Layout />,
        children: [
            {
                path: '/',
                element: <Dashboard />,
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
        ],
    },
]);

export default router;