import { createBrowserRouter } from "react-router-dom";
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

const router = createBrowserRouter([
    {
        path: '/',
        element: <Layout />,
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
]);

export default router;