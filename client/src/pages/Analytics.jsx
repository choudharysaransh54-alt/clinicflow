import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ResponsiveContainer } from 'recharts';

export default function Analytics() {
  const [waitTimes, setWaitTimes] = useState([]);
  const [peakHours, setPeakHours] = useState([]);
  const [throughput, setThroughput] = useState([]);
  
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [wt, ph, tp] = await Promise.all([
          axios.get('/api/analytics/wait-times'),
          axios.get('/api/analytics/peak-hours'),
          axios.get('/api/analytics/throughput')
        ]);
        setWaitTimes(wt.data.data);
        setPeakHours(ph.data.data);
        setThroughput(tp.data.data);
      } catch (err) {
        console.error('Error fetching analytics', err);
      }
    };
    fetchAnalytics();
  }, []);

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Analytics Dashboard</h2>
      
      <div style={{ marginBottom: '2rem', height: 300 }}>
        <h3>Average Wait Times (Minutes)</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={waitTimes}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="doctorName" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="avgWaitTimeMinutes" fill="#8884d8" name="Wait Time (min)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ marginBottom: '2rem', height: 300 }}>
        <h3>Peak Hours (Patients joined)</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={peakHours}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hour" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="#82ca9d" name="Patient Count" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ marginBottom: '2rem', height: 300 }}>
        <h3>Throughput (Last 7 Days)</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={throughput}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="#ffc658" name="Completed Patients" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
