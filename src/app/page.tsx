'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const PRIORITY_MAP = {
  'Blocker': 5,
  'Critical': 4,
  'High': 3,
  'Medium': 2,
  'Low': 1
} as const;

type PriorityLevel = keyof typeof PRIORITY_MAP;

interface Task {
  id: string;
  title: string;
  date: string;
  priority: PriorityLevel;
  effort: number;
  completed: boolean;
}

export default function LogposeTodo() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>('Medium');
  const [effort, setEffort] = useState(2);
  const [isLoading, setIsLoading] = useState(true);
  
  const getLocalDateString = (offsetDays = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toLocaleDateString('en-CA'); 
  };

  const [taskDate, setTaskDate] = useState(getLocalDateString(0));

  const dateYesterday = getLocalDateString(-1);
  const dateToday = getLocalDateString(0);
  const dateTomorrow = getLocalDateString(1);

  // Fetch dữ liệu từ Supabase khi load trang
  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Lỗi khi tải dữ liệu:', error);
    } else {
      setTasks(data || []);
    }
    setIsLoading(false);
  };

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    const newTask = {
      title,
      date: taskDate,
      priority,
      effort,
      completed: false
    };
    
    // Gọi API Insert xuống Supabase
    const { data, error } = await supabase
      .from('tasks')
      .insert([newTask])
      .select();

    if (error) {
      console.error('Lỗi khi thêm task:', error);
    } else if (data) {
      setTasks([...tasks, data[0]]);
      setTitle('');
    }
  };

  const toggleTask = async (id: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    
    // Cập nhật UI ngay lập tức để tạo cảm giác mượt mà (Optimistic Update)
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: newStatus } : t));

    // Gọi API Update xuống Supabase
    const { error } = await supabase
      .from('tasks')
      .update({ completed: newStatus })
      .eq('id', id);

    if (error) {
      console.error('Lỗi khi cập nhật trạng thái:', error);
      // Nếu lỗi, rollback lại trạng thái cũ
      setTasks(tasks.map(t => t.id === id ? { ...t, completed: currentStatus } : t));
    }
  };

  const deleteTask = async (id: string) => {
    // Cập nhật UI
    setTasks(tasks.filter(t => t.id !== id));

    // Gọi API Delete
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Lỗi khi xóa task:', error);
      // Có thể fetch lại data nếu cần đảm bảo tính đồng bộ tuyệt đối
    }
  };

  const getSortedTasks = (targetDate: string) => {
    return tasks
      .filter(t => t.date === targetDate)
      .sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        const scoreA = PRIORITY_MAP[a.priority] * 2 - a.effort;
        const scoreB = PRIORITY_MAP[b.priority] * 2 - b.effort;
        return scoreB - scoreA;
      });
  };

  const formatDisplayDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const getPriorityColor = (p: PriorityLevel) => {
    switch(p) {
      case 'Blocker': return 'text-red-700 bg-red-100';
      case 'Critical': return 'text-orange-700 bg-orange-100';
      case 'High': return 'text-yellow-700 bg-yellow-100';
      case 'Medium': return 'text-blue-700 bg-blue-100';
      case 'Low': return 'text-gray-700 bg-gray-200';
      default: return 'text-gray-700 bg-gray-200';
    }
  };

  const ColumnUI = ({ title, targetDate }: { title: string, targetDate: string }) => (
    <div className="bg-white p-4 rounded-sm shadow-sm border border-stone-200 flex-1">
      <div className="text-center border-b border-stone-100 pb-3 mb-4">
        <h2 className="text-lg font-bold text-stone-800">{title}</h2>
        <p className="text-xs text-stone-500 font-mono mt-1">{formatDisplayDate(targetDate)}</p>
      </div>
      <div className="space-y-2">
        {isLoading ? (
           <p className="text-center text-stone-400 text-sm py-4">Loading...</p>
        ) : (
          <>
            {getSortedTasks(targetDate).map(task => (
              <div 
                key={task.id} 
                className={`p-3 rounded-sm border ${task.completed ? 'bg-stone-50 border-stone-100 opacity-60' : 'bg-white border-stone-200 hover:border-stone-300'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 flex-1">
                    <input 
                      type="checkbox" 
                      checked={task.completed}
                      onChange={() => toggleTask(task.id, task.completed)}
                      className="mt-1 w-4 h-4 cursor-pointer accent-stone-800"
                    />
                    <div>
                      <p className={`text-sm font-medium ${task.completed ? 'line-through text-stone-400' : 'text-stone-800'}`}>
                        {task.title}
                      </p>
                      <div className="flex gap-2 mt-2 text-[10px] font-mono">
                        <span className={`px-1.5 py-0.5 rounded-sm ${getPriorityColor(task.priority)}`}>
                          {task.priority}
                        </span>
                        <span className="text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded-sm">
                          Effort: {task.effort}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => deleteTask(task.id)} className="text-stone-300 hover:text-red-500 text-sm">
                    ✕
                  </button>
                </div>
              </div>
            ))}
            {getSortedTasks(targetDate).length === 0 && (
              <p className="text-center text-stone-400 text-sm italic py-4">No tasks</p>
            )}
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F7F6F3] text-stone-900 p-6 font-sans">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-stone-800 uppercase">Logpose</h1>
        </div>

        <form onSubmit={addTask} className="bg-white p-5 rounded-sm shadow-sm border border-stone-200 mb-8 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wider">Task Info</label>
            <input 
              type="text" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              className="w-full border border-stone-300 rounded-sm p-2 text-sm focus:border-stone-500 focus:ring-0 outline-none transition-colors"
              placeholder="Ex: Refactor Database Module..."
              autoFocus
            />
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wider">Date</label>
            <input 
              type="date" 
              value={taskDate} 
              onChange={e => setTaskDate(e.target.value)} 
              className="border border-stone-300 rounded-sm p-2 text-sm outline-none cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wider">Priority</label>
            <select value={priority} onChange={e => setPriority(e.target.value as PriorityLevel)} className="border border-stone-300 rounded-sm p-2 text-sm outline-none cursor-pointer">
              {Object.keys(PRIORITY_MAP).map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div className="w-16">
            <label className="block text-xs font-semibold text-stone-600 mb-1.5 uppercase tracking-wider">Effort</label>
            <input type="number" min="1" max="10" value={effort} onChange={e => setEffort(Number(e.target.value))} className="w-full border border-stone-300 rounded-sm p-2 text-sm outline-none" />
          </div>

          <button type="submit" className="bg-stone-800 hover:bg-stone-900 text-white text-sm font-semibold py-2 px-5 rounded-sm transition-colors h-[38px]">
            Add
          </button>
        </form>

        <div className="flex flex-col md:flex-row gap-5">
          <ColumnUI title="Hôm qua" targetDate={dateYesterday} />
          
          <div className="flex-1 transform md:-translate-y-2">
            <div className="border-2 border-stone-400 rounded-sm relative">
               <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-stone-400 text-white text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-widest">
                 Focus
               </div>
               <ColumnUI title="Hôm nay" targetDate={dateToday} />
            </div>
          </div>

          <ColumnUI title="Ngày mai" targetDate={dateTomorrow} />
        </div>
      </div>
    </div>
  );
}
