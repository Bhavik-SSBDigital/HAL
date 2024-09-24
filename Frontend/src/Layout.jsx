import React from 'react'
import { Outlet } from 'react-router-dom'
import SideBar from './Components/SideBar'
import Header from './Components/Header'

export default function Layout() {
    return (
        <div>
            <Header />
            {/* <SideBar /> */}
            <main>
                <Outlet />
            </main>
        </div>
    )
}
