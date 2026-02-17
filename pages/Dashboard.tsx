import React, { useEffect, useState } from 'react';
import { useAuth } from '../App';
import { getTrainings, getAllAttendance, getUsers, getTrainees } from '../services/dbService';
import { Training, Attendance, UserRole } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar, Users, CheckSquare, Download } from 'lucide-react';
import { Button } from '../components/Button';

const StatCard = ({ title, value, icon: Icon, color }: any) => (
  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-center">
    <div className={`p-3 rounded-full ${color} text-white mr-4`}>
      <Icon className="w-6 h-6" />
    </div>
    <div>
      <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">{title}</p>
      <h3 className="text-2xl font-bold text-gray-800">{value}</h3>
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    trainingsCount: 0,
    totalAttendance: 0,
    activeAdmins: 0,
  });
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      const allTrainings = await getTrainings(user.workspaceId, user.role === UserRole.SUPER_ADMIN ? undefined : user.id);
      const allAttendance = await getAllAttendance(user.workspaceId);
      const allUsers = await getUsers(user.role === UserRole.SUPER_ADMIN ? undefined : user.workspaceId, user.id);

      // Calculate stats
      const trainingIds = allTrainings.map(t => t.id);

      // Filter attendance for visible trainings only
      const relAttendance = allAttendance.filter(a => trainingIds.includes(a.trainingId));

      setStats({
        trainingsCount: allTrainings.length,
        totalAttendance: relAttendance.length,
        activeAdmins: user.role === UserRole.SUPER_ADMIN ? allUsers.length : 0,
      });

      // Prepare Chart Data (Attendance per Training)
      const data = allTrainings.map(t => ({
        name: t.title.length > 15 ? t.title.substring(0, 15) + '...' : t.title,
        attendance: relAttendance.filter(a => a.trainingId === t.id).length
      }));
      setChartData(data);
    };

    void load();
  }, [user]);

  const handleGlobalExport = async () => {
      if (!user) return;
      // Collect all data
      const trainings = await getTrainings(user.workspaceId); // Get workspace data
      const attendance = await getAllAttendance(user.workspaceId);
      const traineeLists = await Promise.all(trainings.map(t => getTrainees(user.workspaceId, t.id)));
      const allTrainees = traineeLists.flat();
      const users = await getUsers(user.workspaceId);

      // Headers
      const headers = ['Training ID', 'Training Title', 'Admin Name', 'Trainee Name', 'Trainee Email', 'Session Date', 'Check-in Time'];
      
      const rows: string[][] = [];

      // Iterate through all trainings
      trainings.forEach(t => {
          const admin = users.find(u => u.id === t.adminId);
          const trainingTrainees = allTrainees.filter(tr => tr.trainingId === t.id);
          
          trainingTrainees.forEach(trainee => {
              // Find all attendance records for this trainee
              const records = attendance.filter(a => a.traineeId === trainee.id && a.trainingId === t.id);
              
              if (records.length === 0) {
                 // Add row for no attendance (optional, but good for roster view)
                 rows.push([
                     t.id,
                     t.title,
                     admin?.name || 'Unknown',
                     trainee.name,
                     trainee.email,
                     'N/A',
                     'Not Attended'
                 ]);
              } else {
                  records.forEach(rec => {
                      rows.push([
                        t.id,
                        t.title,
                        admin?.name || 'Unknown',
                        trainee.name,
                        trainee.email,
                        rec.sessionDate,
                        rec.timestamp
                      ]);
                  });
              }
          });
      });

      const csvContent = [
        headers.join(','), 
        ...rows.map(r => r.map(c => `"${c}"`).join(',')) // Quote fields to handle commas in names
      ].join('\n');
  
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `TrainTrack_Global_Report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-gray-500">Welcome back, {user?.name}</p>
        </div>
        {user?.role === UserRole.SUPER_ADMIN && (
            <Button variant="secondary" onClick={handleGlobalExport}>
                <Download className="w-4 h-4 mr-2" />
                Global Export
            </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Total Trainings" 
          value={stats.trainingsCount} 
          icon={Calendar} 
          color="bg-cyan-500" 
        />
        <StatCard 
          title="Total Check-ins" 
          value={stats.totalAttendance} 
          icon={CheckSquare} 
          color="bg-amber-500" 
        />
        {user?.role === UserRole.SUPER_ADMIN && (
           <StatCard 
           title="System Users" 
           value={stats.activeAdmins} 
           icon={Users} 
           color="bg-slate-700" 
         />
        )}
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Attendance Overview</h3>
        <div className="h-64 w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  cursor={{ fill: '#f3f4f6' }}
                />
                <Bar dataKey="attendance" fill="#0891b2" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              No training data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

