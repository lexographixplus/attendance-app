
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../App';
import { 
  getTrainings, 
  createTraining, 
  updateTraining,
  deleteTraining,
  getTrainees, 
  addTrainee, 
  removeTrainee, 
  getAttendance 
} from '../services/dbService';
import { Training, Trainee, Attendance, TrainingType, UserRole } from '../types';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { useToast } from '../components/Toast';
import { generateQRUrl } from '../constants';
import { 
  Plus, 
  MapPin, 
  Calendar as CalIcon, 
  Users, 
  QrCode, 
  Download,
  Trash2,
  X,
  Video,
  Building,
  Check,
  Minus,
  Upload,
  Award,
  Printer,
  Edit,
  Link,
  Search,
  List,
  LayoutGrid,
  ExternalLink
} from 'lucide-react';

const Trainings: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [selectedTraining, setSelectedTraining] = useState<Training | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDeleteTraining, setPendingDeleteTraining] = useState<Training | null>(null);

  // Form State
  const initialFormState = {
    title: '',
    type: 'in_person' as TrainingType,
    location: '',
    dates: [] as string[],
    description: '',
    resourcesLink: ''
  };
  const [trainingForm, setTrainingForm] = useState(initialFormState);
  const [dateInput, setDateInput] = useState('');

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    void refreshTrainings();
  }, [user]);

  const refreshTrainings = async () => {
    if (user) {
      const nextTrainings = await getTrainings(user.workspaceId, user.role === UserRole.SUPER_ADMIN ? undefined : user.id);
      setTrainings(nextTrainings);
    }
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setTrainingForm(initialFormState);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (training: Training) => {
    setEditingId(training.id);
    setTrainingForm({
        title: training.title,
        type: training.type,
        location: training.location,
        dates: training.dates,
        description: training.description,
        resourcesLink: training.resourcesLink || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = (training: Training) => {
    setPendingDeleteTraining(training);
  };

  const confirmDelete = async () => {
    if (!user || !pendingDeleteTraining) return;
    await deleteTraining(user.workspaceId, pendingDeleteTraining.id);
    setPendingDeleteTraining(null);
    await refreshTrainings();
    showToast('Training deleted successfully.', 'success');
  };

  const handleAddDate = () => {
    if (dateInput && !trainingForm.dates.includes(dateInput)) {
      const updatedDates = [...trainingForm.dates, dateInput].sort();
      setTrainingForm({ ...trainingForm, dates: updatedDates });
      setDateInput('');
    }
  };

  const handleRemoveDate = (dateToRemove: string) => {
    setTrainingForm({
      ...trainingForm,
      dates: trainingForm.dates.filter(d => d !== dateToRemove)
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (trainingForm.dates.length === 0) {
      showToast('Please add at least one training date.', 'error');
      return;
    }

    const sortedDates = [...trainingForm.dates].sort();
    const payload = {
      ...trainingForm,
      dates: sortedDates,
      startDate: sortedDates[0],
      endDate: sortedDates[sortedDates.length - 1],
    };

    if (editingId) {
        await updateTraining(user.workspaceId, editingId, payload);
        showToast('Training updated successfully.', 'success');
    } else {
        await createTraining(user.workspaceId, {
            ...payload,
            adminId: user.id,
        });
        showToast('Training created successfully.', 'success');
    }

    setIsModalOpen(false);
    await refreshTrainings();
  };

  const copyRegistrationLink = async (id: string) => {
    if (!user) return;
    const url = `${window.location.origin}${window.location.pathname}#/register/${user.workspaceId}/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast('Registration link copied to clipboard.', 'success');
    } catch {
      showToast('Unable to copy link. Please copy manually.', 'error');
    }
  };

  // Calendar Logic
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sun, 1 = Mon
    
    const days = [];
    // Padding for previous month
    for (let i = 0; i < firstDayOfMonth; i++) {
        days.push(null);
    }
    // Days of current month
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(new Date(year, month, i));
    }
    return days;
  };

  const monthNames = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Training Management</h2>
        
        <div className="flex items-center gap-2">
            <div className="bg-white border border-gray-300 rounded-md flex p-1">
                <button 
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-cyan-100 text-cyan-700' : 'text-gray-500 hover:bg-gray-100'}`}
                    title="List View"
                >
                    <List className="w-4 h-4" />
                </button>
                <button 
                    onClick={() => setViewMode('calendar')}
                    className={`p-1.5 rounded ${viewMode === 'calendar' ? 'bg-cyan-100 text-cyan-700' : 'text-gray-500 hover:bg-gray-100'}`}
                    title="Calendar View"
                >
                    <LayoutGrid className="w-4 h-4" />
                </button>
            </div>
            <Button onClick={handleOpenCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Create
            </Button>
        </div>
      </div>

      {viewMode === 'list' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trainings.map(t => (
            <div key={t.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                <div className="p-5 flex-1">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-gray-900 line-clamp-1" title={t.title}>{t.title}</h3>
                    <div className="flex gap-2">
                        <button onClick={() => handleOpenEdit(t)} className="text-gray-400 hover:text-cyan-600">
                            <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(t)} className="text-gray-400 hover:text-red-600">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                <span className={`inline-block px-2 py-1 text-xs rounded-full border mb-3 ${t.type === 'virtual' ? 'bg-cyan-50 text-cyan-700 border-cyan-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                    {t.type === 'virtual' ? 'Virtual' : 'In Person'}
                </span>
                <p className="text-sm text-gray-500 mb-4 line-clamp-2 min-h-[40px]">{t.description}</p>
                
                <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center">
                    {t.type === 'virtual' ? <Video className="w-4 h-4 mr-2 text-gray-400" /> : <MapPin className="w-4 h-4 mr-2 text-gray-400" />}
                    <span className="truncate">{t.location}</span>
                    </div>
                    <div className="flex items-center">
                    <CalIcon className="w-4 h-4 mr-2 text-gray-400" />
                    {t.dates.length} Session{t.dates.length !== 1 ? 's' : ''} ({t.startDate})
                    </div>
                </div>
                </div>
                <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 flex justify-between items-center">
                <button 
                    className="text-cyan-600 hover:text-cyan-800 text-xs font-medium flex items-center"
                    onClick={() => copyRegistrationLink(t.id)}
                >
                    <Link className="w-3 h-3 mr-1" />
                    Copy Reg. Link
                </button>
                <Button 
                    variant="secondary" 
                    className="text-xs"
                    onClick={() => { setSelectedTraining(t); setIsDetailModalOpen(true); }}
                >
                    Manage & Details
                </Button>
                </div>
            </div>
            ))}
            {trainings.length === 0 && (
            <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-lg border border-dashed border-gray-300">
                No trainings found. Create one to get started.
            </div>
            )}
        </div>
      ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              {/* Calendar Header */}
              <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-gray-800">
                      {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                  </h3>
                  <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}>Prev</Button>
                      <Button variant="secondary" onClick={() => setCurrentDate(new Date())}>Today</Button>
                      <Button variant="secondary" onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}>Next</Button>
                  </div>
              </div>
              
              {/* Days Header */}
              <div className="grid grid-cols-7 gap-1 mb-2 text-center">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                      <div key={d} className="text-sm font-semibold text-gray-500 uppercase">{d}</div>
                  ))}
              </div>

              {/* Grid */}
              <div className="grid grid-cols-7 gap-1 auto-rows-fr">
                  {getDaysInMonth(currentDate).map((date, idx) => {
                      if (!date) return <div key={`empty-${idx}`} className="h-32 bg-gray-50/50 rounded-md"></div>;

                      const dateStr = date.toISOString().split('T')[0];
                      const dayTrainings = trainings.filter(t => t.dates.includes(dateStr));

                      return (
                          <div key={dateStr} className="min-h-[8rem] border border-gray-100 rounded-md p-2 hover:border-cyan-200 transition-colors bg-white relative">
                              <div className={`text-sm font-medium mb-1 ${dateStr === new Date().toISOString().split('T')[0] ? 'text-cyan-600 bg-cyan-50 inline-block px-1.5 rounded' : 'text-gray-700'}`}>
                                  {date.getDate()}
                              </div>
                              <div className="space-y-1 overflow-y-auto max-h-[6rem]">
                                  {dayTrainings.map(t => (
                                      <button 
                                        key={t.id} 
                                        onClick={() => { setSelectedTraining(t); setIsDetailModalOpen(true); }}
                                        className={`w-full text-left text-xs p-1 rounded border truncate block ${
                                            t.type === 'virtual' ? 'bg-cyan-50 text-cyan-800 border-cyan-100' : 'bg-amber-50 text-amber-800 border-amber-100'
                                        }`}
                                      >
                                          {t.title}
                                      </button>
                                  ))}
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">{editingId ? 'Edit Training' : 'New Training'}</h3>
              <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input label="Title" required value={trainingForm.title} onChange={e => setTrainingForm({...trainingForm, title: e.target.value})} />
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Training Type</label>
                <div className="flex gap-4">
                  <label className={`flex-1 cursor-pointer border rounded-md p-3 flex items-center justify-center gap-2 transition-colors ${trainingForm.type === 'in_person' ? 'bg-cyan-50 border-cyan-500 text-cyan-700' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <input type="radio" name="type" className="hidden" checked={trainingForm.type === 'in_person'} onChange={() => setTrainingForm({...trainingForm, type: 'in_person'})} />
                    <Building className="w-4 h-4" /> In Person
                  </label>
                  <label className={`flex-1 cursor-pointer border rounded-md p-3 flex items-center justify-center gap-2 transition-colors ${trainingForm.type === 'virtual' ? 'bg-cyan-50 border-cyan-500 text-cyan-700' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <input type="radio" name="type" className="hidden" checked={trainingForm.type === 'virtual'} onChange={() => setTrainingForm({...trainingForm, type: 'virtual'})} />
                    <Video className="w-4 h-4" /> Virtual
                  </label>
                </div>
              </div>

              <Input 
                label={trainingForm.type === 'virtual' ? 'Meeting URL / Link' : 'Location / Address'} 
                required 
                value={trainingForm.location} 
                onChange={e => setTrainingForm({...trainingForm, location: e.target.value})} 
              />

              <Input 
                label="Resources Link (Slides, PDF, Drive)" 
                placeholder="https://drive.google.com/..."
                value={trainingForm.resourcesLink} 
                onChange={e => setTrainingForm({...trainingForm, resourcesLink: e.target.value})} 
              />
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Session Dates</label>
                <div className="flex gap-2 mb-2">
                   <Input 
                     type="date" 
                     value={dateInput} 
                     onChange={e => setDateInput(e.target.value)} 
                     className="mb-0"
                   />
                   <Button type="button" variant="secondary" onClick={handleAddDate} disabled={!dateInput}>Add</Button>
                </div>
                {trainingForm.dates.length > 0 ? (
                  <div className="bg-gray-50 p-3 rounded-md border border-gray-200 space-y-2 max-h-32 overflow-y-auto">
                    {trainingForm.dates.map(date => (
                      <div key={date} className="flex justify-between items-center text-sm bg-white p-2 rounded border border-gray-100">
                        <span>{date}</span>
                        <button type="button" onClick={() => handleRemoveDate(date)} className="text-red-500 hover:text-red-700">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">No dates added yet.</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500"
                  rows={3}
                  value={trainingForm.description}
                  onChange={e => setTrainingForm({...trainingForm, description: e.target.value})}
                ></textarea>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit">{editingId ? 'Update Training' : 'Create Training'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {pendingDeleteTraining && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900">Delete Training</h3>
            <p className="text-sm text-gray-600 mt-2">
              Are you sure you want to delete <span className="font-semibold">{pendingDeleteTraining.title}</span>? This will permanently remove all trainees and attendance records for this training.
            </p>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="ghost" onClick={() => setPendingDeleteTraining(null)}>Cancel</Button>
              <Button variant="danger" onClick={confirmDelete}>Delete</Button>
            </div>
          </div>
        </div>
      )}

      {/* Detail/Manager Modal */}
      {isDetailModalOpen && selectedTraining && user && (
        <TrainingManager 
          training={selectedTraining} 
          workspaceId={user.workspaceId}
          onClose={() => { setIsDetailModalOpen(false); setSelectedTraining(null); }} 
        />
      )}
    </div>
  );
};

// Sub-component for managing specific training details
const TrainingManager: React.FC<{ training: Training; workspaceId: string; onClose: () => void }> = ({ training, workspaceId, onClose }) => {
  const { showToast } = useToast();
  const [trainees, setTrainees] = useState<Trainee[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [view, setView] = useState<'trainees' | 'attendance' | 'qr'>('trainees');
  const [newTrainee, setNewTrainee] = useState({ name: '', email: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Certificate State
  const [certificateTrainee, setCertificateTrainee] = useState<Trainee | null>(null);

  const refreshData = async () => {
    if (!workspaceId) return;
    const [nextTrainees, nextAttendance] = await Promise.all([
      getTrainees(workspaceId, training.id),
      getAttendance(workspaceId, training.id),
    ]);
    setTrainees(nextTrainees);
    setAttendance(nextAttendance);
  };

  useEffect(() => {
    void refreshData();
  }, [training]);

  // Filtered Trainees
  const filteredTrainees = trainees.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.uniqueCode.includes(searchTerm)
  );

  const handleAddTrainee = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await addTrainee(workspaceId, { ...newTrainee, trainingId: training.id });
      setNewTrainee({ name: '', email: '' });
      await refreshData();
      showToast('Trainee added successfully.', 'success');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split('\n');
      let successCount = 0;
      let errorCount = 0;

      // Skip header if it exists (simple check if first line contains "email")
      const startIdx = lines[0].toLowerCase().includes('email') ? 1 : 0;

      for (let i = startIdx; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Simple CSV parse: Name, Email
        const parts = line.split(',');
        if (parts.length >= 2) {
          const name = parts[0].trim();
          const email = parts[1].trim();
          
          if (name && email) {
            try {
              await addTrainee(workspaceId, { name, email, trainingId: training.id });
              successCount++;
            } catch (err) {
              errorCount++;
            }
          }
        }
      }
      showToast(`Import complete. Added: ${successCount}, skipped/duplicate: ${errorCount}.`, 'info');
      await refreshData();
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleExport = () => {
    // Header row: Name, Email, ID, Date1, Date2...
    const headers = ['Name', 'Email', 'Unique Code', ...training.dates];
    
    const rows = trainees.map(t => {
      // Create a row with basic info
      const row = [t.name, t.email, t.uniqueCode];
      // For each date, check if present
      training.dates.forEach(date => {
        const present = attendance.some(a => a.traineeId === t.id && a.sessionDate === date);
        row.push(present ? 'Present' : 'Absent');
      });
      return row;
    });

    const csvContent = [
      headers.join(','), 
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${training.title.replace(/\s+/g, '_')}_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const attendUrl = `${window.location.origin}${window.location.pathname}#/attend/${workspaceId}/${training.id}`;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
        <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-200 flex justify-between items-start bg-gray-50 rounded-t-lg">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{training.title}</h2>
              <div className="flex gap-4 text-sm text-gray-500 mt-1">
                <span className="flex items-center">
                    {training.type === 'virtual' ? <Video className="w-3 h-3 mr-1"/> : <MapPin className="w-3 h-3 mr-1"/>}
                    {training.location}
                </span>
                <span className="flex items-center">
                    <CalIcon className="w-3 h-3 mr-1"/>
                    {training.dates.length} Session(s)
                </span>
                {training.resourcesLink && (
                    <a href={training.resourcesLink} target="_blank" rel="noreferrer" className="flex items-center text-cyan-600 hover:text-cyan-800">
                        <ExternalLink className="w-3 h-3 mr-1" />
                        Materials
                    </a>
                )}
              </div>
            </div>
            <button onClick={onClose}><X className="text-gray-400 hover:text-gray-600" /></button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 px-6">
            <button 
              className={`py-3 px-4 text-sm font-medium border-b-2 ${view === 'trainees' ? 'border-cyan-500 text-cyan-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              onClick={() => setView('trainees')}
            >
              Trainees ({trainees.length})
            </button>
            <button 
              className={`py-3 px-4 text-sm font-medium border-b-2 ${view === 'attendance' ? 'border-cyan-500 text-cyan-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              onClick={() => setView('attendance')}
            >
              Attendance Report
            </button>
            <button 
              className={`py-3 px-4 text-sm font-medium border-b-2 ${view === 'qr' ? 'border-cyan-500 text-cyan-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              onClick={() => setView('qr')}
            >
              QR Code
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto flex-1">
            {view === 'trainees' && (
              <div className="space-y-6">
                
                {/* Tools Row */}
                <div className="flex flex-col md:flex-row justify-between gap-4 mb-4">
                     {/* Search */}
                    <div className="relative flex-1 max-w-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search trainees..."
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-2">
                         <input 
                            type="file" 
                            accept=".csv" 
                            className="hidden" 
                            ref={fileInputRef} 
                            onChange={handleFileUpload}
                         />
                         <Button variant="secondary" onClick={() => fileInputRef.current?.click()} title="CSV Format: Name, Email">
                            <Upload className="w-4 h-4 mr-2" />
                            Import CSV
                         </Button>
                    </div>
                </div>

                {/* Add Trainee Form */}
                <form onSubmit={handleAddTrainee} className="bg-gray-50 p-4 rounded-md border border-gray-200 flex gap-4 items-end">
                    <div className="flex-1">
                    <Input 
                        placeholder="Full Name" 
                        value={newTrainee.name} 
                        onChange={e => setNewTrainee({...newTrainee, name: e.target.value})} 
                        required 
                    />
                    </div>
                    <div className="flex-1">
                    <Input 
                        placeholder="Email Address" 
                        type="email" 
                        value={newTrainee.email} 
                        onChange={e => setNewTrainee({...newTrainee, email: e.target.value})} 
                        required 
                    />
                    </div>
                    <Button type="submit">Add</Button>
                </form>
                
                {error && <p className="text-red-500 text-sm">{error}</p>}

                {/* List */}
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Name</th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Email</th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Code</th>
                        <th className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Actions</span></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {filteredTrainees.map((person) => (
                        <tr key={person.id}>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">{person.name}</td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{person.email}</td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 font-mono">{person.uniqueCode}</td>
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => setCertificateTrainee(person)}
                                className="text-cyan-600 hover:text-cyan-900"
                                title="Generate Certificate"
                              >
                                <Award className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={async () => { await removeTrainee(workspaceId, person.id); await refreshData(); showToast('Trainee removed.', 'info'); }}
                                className="text-red-600 hover:text-red-900"
                                title="Remove Trainee"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredTrainees.length === 0 && (
                        <tr><td colSpan={4} className="text-center py-4 text-gray-500 text-sm">No trainees found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {view === 'attendance' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-medium text-gray-700">Attendance Matrix</h3>
                  <Button variant="secondary" onClick={handleExport}>
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
                <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sticky left-0 bg-gray-50">Trainee</th>
                        {training.dates.map(date => (
                          <th key={date} className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900 whitespace-nowrap">
                            {date}
                          </th>
                        ))}
                        <th className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900">%</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {trainees.map((t) => {
                        let presentCount = 0;
                        return (
                          <tr key={t.id}>
                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sticky left-0 bg-white shadow-[1px_0_0_0_#e5e7eb]">
                              <div>{t.name}</div>
                              <div className="text-xs text-gray-500 font-normal">{t.email}</div>
                            </td>
                            {training.dates.map(date => {
                              const record = attendance.find(a => a.traineeId === t.id && a.sessionDate === date);
                              if (record) presentCount++;
                              return (
                                <td key={date} className="whitespace-nowrap px-3 py-4 text-sm text-center">
                                  {record ? (
                                    <div className="mx-auto flex items-center justify-center w-6 h-6 rounded-full bg-cyan-100 text-cyan-600">
                                      <Check className="w-4 h-4" />
                                    </div>
                                  ) : (
                                    <div className="mx-auto flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-gray-300">
                                      <Minus className="w-4 h-4" />
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-center font-medium text-gray-900">
                              {Math.round((presentCount / training.dates.length) * 100)}%
                            </td>
                          </tr>
                        );
                      })}
                      {trainees.length === 0 && <tr><td colSpan={training.dates.length + 2} className="text-center py-6 text-gray-400">No data</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {view === 'qr' && (
              <div className="flex flex-col items-center justify-center space-y-6 py-8">
                <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-100">
                  <img src={generateQRUrl(attendUrl)} alt="Attendance QR Code" className="w-64 h-64" />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-medium text-gray-900">Scan to Check In</h3>
                  <p className="text-sm text-gray-500 max-w-md">
                    Trainees can check in for today's session by scanning this code.
                  </p>
                  <div className="pt-4">
                    <a href={attendUrl} target="_blank" rel="noreferrer" className="text-cyan-600 hover:text-cyan-500 text-sm font-medium break-all">
                      {attendUrl}
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Certificate Modal */}
      {certificateTrainee && (
        <div className="fixed inset-0 z-[60] bg-black bg-opacity-80 flex items-center justify-center p-4">
          <style>
            {`
              @media print {
                body * { visibility: hidden; }
                #certificate-container, #certificate-container * { visibility: visible; }
                #certificate-container { 
                  position: absolute; 
                  left: 0; 
                  top: 0; 
                  width: 100%; 
                  height: 100%; 
                  margin: 0; 
                  padding: 0;
                  box-shadow: none;
                  border: none;
                }
                #print-btn-container { display: none; }
              }
            `}
          </style>
          <div className="relative bg-white w-[800px] min-h-[600px] flex flex-col items-center">
            
            {/* Certificate Content */}
            <div id="certificate-container" className="flex-1 w-full p-12 flex flex-col items-center justify-between border-[20px] border-double border-cyan-900 text-center bg-white relative">
              <div className="absolute top-0 left-0 w-24 h-24 border-b-4 border-r-4 border-cyan-900 rounded-br-3xl"></div>
              <div className="absolute bottom-0 right-0 w-24 h-24 border-t-4 border-l-4 border-cyan-900 rounded-tl-3xl"></div>
              
              <div className="mt-8 space-y-2">
                <div className="flex justify-center mb-4">
                   <Award className="w-16 h-16 text-cyan-700" />
                </div>
                <h1 className="text-5xl font-serif font-bold text-cyan-900 uppercase tracking-widest">Certificate</h1>
                <p className="text-xl font-serif text-cyan-700 tracking-wider">OF COMPLETION</p>
              </div>

              <div className="space-y-4 my-8">
                <p className="text-gray-500 italic font-serif text-lg">This is to certify that</p>
                <h2 className="text-4xl font-bold font-serif text-gray-900 border-b-2 border-gray-300 pb-2 px-12 inline-block min-w-[300px]">
                  {certificateTrainee.name}
                </h2>
                <p className="text-gray-500 italic font-serif text-lg">has successfully completed the training on</p>
                <h3 className="text-2xl font-bold text-cyan-800">{training.title}</h3>
              </div>

              <div className="w-full flex justify-between items-end px-12 pb-8">
                <div className="text-center">
                  <p className="font-bold text-gray-900 border-t border-gray-400 pt-2 px-8 min-w-[200px]">{training.endDate}</p>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">Date</p>
                </div>
                <div className="text-center">
                  <div className="font-serif italic text-2xl text-cyan-900 mb-2 font-bold" style={{ fontFamily: 'cursive' }}>TrainTrack Admin</div>
                  <p className="font-bold text-gray-900 border-t border-gray-400 pt-2 px-8 min-w-[200px]">Instructor Signature</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div id="print-btn-container" className="w-full bg-gray-100 p-4 border-t flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setCertificateTrainee(null)}>Close</Button>
              <Button onClick={() => window.print()}>
                <Printer className="w-4 h-4 mr-2" />
                Print Certificate
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Trainings;

