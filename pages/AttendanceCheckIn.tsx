
import React, { useState, useEffect } from 'react';
import { getTrainingById, markAttendance } from '../services/dbService';
import { Training } from '../types';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { CheckCircle2, AlertCircle, MapPin, Calendar, ExternalLink } from 'lucide-react';

interface Props {
  workspaceId: string;
  trainingId: string;
}

const AttendanceCheckIn: React.FC<Props> = ({ workspaceId, trainingId }) => {
  const [training, setTraining] = useState<Training | null>(null);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [traineeName, setTraineeName] = useState('');
  const [todayDate, setTodayDate] = useState('');

  useEffect(() => {
    const loadTraining = async () => {
      try {
        const t = await getTrainingById(workspaceId, trainingId);
        if (t) {
          setTraining(t);
          setTodayDate(new Date().toISOString().split('T')[0]);
        } else {
          setStatus('error');
          setMessage('Invalid Training Link');
        }
      } catch (err) {
        setStatus('error');
        setMessage('Unable to load training details.');
      }
    };
    void loadTraining();
  }, [workspaceId, trainingId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!training) return;
    setStatus('loading');
    setMessage('');
    
    // Simulate network delay for UX
    setTimeout(async () => {
        const result = await markAttendance(workspaceId, trainingId, email);
        if (result.success) {
            setStatus('success');
            setTraineeName(result.traineeName || '');
            setMessage(result.message);
        } else {
            setStatus('error');
            setMessage(result.message);
        }
    }, 800);
  };

  if (!training && status === 'error') {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h1 className="text-xl font-bold text-gray-900">Training Not Found</h1>
                <p className="text-gray-500 mt-2">Please ask your instructor for a valid QR code.</p>
            </div>
        </div>
    )
  }

  if (!training) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-cyan-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-cyan-600 p-6 text-white text-center">
            <h1 className="text-2xl font-bold">{training.title}</h1>
            <div className="flex justify-center items-center gap-4 mt-2 text-cyan-100 text-sm flex-wrap">
                <span className="flex items-center"><MapPin className="w-3 h-3 mr-1" /> {training.location}</span>
                <span className="flex items-center"><Calendar className="w-3 h-3 mr-1" /> {todayDate}</span>
            </div>
        </div>

        <div className="p-8">
            {status === 'success' ? (
                <div className="text-center py-6 animate-in fade-in zoom-in duration-300">
                    <CheckCircle2 className="w-20 h-20 text-cyan-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">You're Checked In!</h2>
                    <p className="text-lg text-cyan-600 font-medium mb-4">Hi, {traineeName}</p>
                    <p className="text-gray-500 text-sm mb-6">Your attendance has been recorded for today ({todayDate}).</p>
                    
                    {training.resourcesLink && (
                        <a 
                            href={training.resourcesLink} 
                            target="_blank" 
                            rel="noreferrer"
                            className="inline-flex items-center justify-center w-full px-4 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
                        >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            View Training Materials
                        </a>
                    )}
                </div>
            ) : (
                <>
                    <div className="text-center mb-6">
                        <h2 className="text-xl font-semibold text-gray-800">Attendance Check-In</h2>
                        <p className="text-gray-500 text-sm mt-1">Enter your registered email address.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Input 
                            type="email" 
                            placeholder="name@example.com" 
                            required 
                            className="text-center text-lg h-12"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            disabled={status === 'loading'}
                        />
                        
                        {status === 'error' && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm text-center flex items-center justify-center">
                                <AlertCircle className="w-4 h-4 mr-2" />
                                {message}
                            </div>
                        )}

                        <Button 
                            type="submit" 
                            className="w-full h-12 text-lg" 
                            isLoading={status === 'loading'}
                        >
                            Mark Attendance
                        </Button>
                        <p className="text-xs text-gray-400 text-center pt-2">
                           Current Session: {todayDate}
                        </p>
                    </form>
                </>
            )}
        </div>
      </div>
      
      <p className="mt-8 text-xs text-gray-400">Powered by TrainTrack</p>
    </div>
  );
};

export default AttendanceCheckIn;

