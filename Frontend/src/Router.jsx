import { createBrowserRouter } from "react-router-dom";
import Layout from "./Layout";
import Contact from "./Components/Contact";
import Dashboard from "./Components/Dashboard";
import Blogs from "./Components/Blogs";

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
                path: '/contact',
                element: <Contact />,
            },
            {
                path: '/blogs',
                element: <Blogs />,
            },
        ],
    },
]);

export default router;