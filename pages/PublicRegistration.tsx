import React, { useState, useEffect } from 'react';
import { getTrainingById, addTrainee } from '../services/dbService';
import { Training } from '../types';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { CheckCircle2, AlertCircle, MapPin, Calendar, UserPlus } from 'lucide-react';

interface Props {
  workspaceId: string;
  trainingId: string;
}

const PublicRegistration: React.FC<Props> = ({ workspaceId, trainingId }) => {
  const [training, setTraining] = useState<Training | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const loadTraining = async () => {
      try {
        const t = await getTrainingById(workspaceId, trainingId);
        if (t) {
          setTraining(t);
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
        try {
            await addTrainee(workspaceId, {
                trainingId: training.id,
                name: formData.name,
                email: formData.email
            });
            setStatus('success');
            setMessage('You have been successfully registered!');
        } catch (err: any) {
            setStatus('error');
            setMessage(err.message || 'Registration failed.');
        }
    }, 800);
  };

  if (!training && status === 'error') {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h1 className="text-xl font-bold text-gray-900">Training Not Found</h1>
                <p className="text-gray-500 mt-2">Please ask your instructor for a valid link.</p>
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
                <span className="flex items-center"><Calendar className="w-3 h-3 mr-1" /> {training.startDate}</span>
            </div>
        </div>

        <div className="p-8">
            {status === 'success' ? (
                <div className="text-center py-6 animate-in fade-in zoom-in duration-300">
                    <CheckCircle2 className="w-20 h-20 text-cyan-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Complete!</h2>
                    <p className="text-lg text-cyan-600 font-medium mb-4">Welcome, {formData.name}</p>
                    <p className="text-gray-500 text-sm">You have been added to the participant list.</p>
                </div>
            ) : (
                <>
                    <div className="text-center mb-6">
                        <div className="bg-cyan-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-cyan-600">
                             <UserPlus className="w-6 h-6" />
                        </div>
                        <h2 className="text-xl font-semibold text-gray-800">Training Registration</h2>
                        <p className="text-gray-500 text-sm mt-1">Join the session by filling out your details.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Input 
                            label="Full Name"
                            placeholder="John Doe" 
                            required 
                            value={formData.name}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                            disabled={status === 'loading'}
                        />
                        <Input 
                            type="email" 
                            label="Email Address"
                            placeholder="name@example.com" 
                            required 
                            value={formData.email}
                            onChange={e => setFormData({...formData, email: e.target.value})}
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
                            className="w-full h-10 mt-2" 
                            isLoading={status === 'loading'}
                        >
                            Register Now
                        </Button>
                    </form>
                </>
            )}
        </div>
      </div>
      
      <p className="mt-8 text-xs text-gray-400">Powered by TrainTrack</p>
    </div>
  );
};

export default PublicRegistration;

