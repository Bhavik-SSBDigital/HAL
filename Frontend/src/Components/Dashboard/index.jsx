import React from 'react'
import LineChart from './LineChart'
import PieChart from './PieChart'
import ScatterChart from './ScatterChart'
import BarChart from './BarChart'

export default function Dashboard() {
    return (
        <div className='grid lg:grid-cols-2 md: grid-flow-col-0 gap-2 p-2'>
            <div>
                <LineChart />
            </div>
            <div>
                <PieChart />
            </div>
            <div>
                <ScatterChart />
            </div>
            <div>
                <BarChart />
            </div>
        </div>
    )
}
