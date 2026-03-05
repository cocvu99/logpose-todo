'use client';

import { useState, useEffect } from 'react';

type BoardColumn = 'yesterday' | 'today' | 'tomorrow';

interface Task {
  id: string;
  title: string;
  column: BoardColumn;
  impact: number;
  effort: number;
  completed: boolean;
}

export default function LogposeTodo() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [impact, setImpact] = useState(5);
  const [effort, setEffort] = useState(2);
  const [column, setColumn] = useState<BoardColumn>('today');

  // Load data từ Local Storage khi khởi tạo
  useEffect(() => {
    const saved = localStorage.getItem('logpose-tasks');
    if (saved) setTasks(JSON.parse(saved));
  }, []);

  // Save data vào Local Storage mỗi khi tasks thay đổi
  useEffect(() => {
    localStorage.setItem('logpose-tasks', JSON.stringify(tasks));
  }, [tasks]);

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    const newTask: Task = {
      id: crypto.randomUUID(),
      title,
      column,
      impact,
      effort,
      completed: false
    };
    
    setTasks([...tasks, newTask]);
    setTitle('');
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  // Thuật toán Core: Sắp xếp theo mức độ ưu tiên (Chưa hoàn thành lên trước -> Điểm ROI cao lên trước)
  // ROI Score = Impact (Càng cao càng tốt) - Effort (Càng thấp càng tốt)
  const getSortedTasks = (col: BoardColumn) => {
    return tasks
      .filter(t => t.column === col)
      .sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        const scoreA = a.impact * 2 - a.effort;
        const scoreB = b.impact * 2 - b.effort;
        return scoreB - scoreA;
      });
  };

  const ColumnUI = ({ title, colType }: { title: string, colType: BoardColumn }) => (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex-1">
      <h2 className="text-xl font-bold mb-4 text-center border-b pb-2 capitalize">{title}</h2>
      <div className="space-y-3">
        {getSortedTasks(colType).map(task => (
          <div 
            key={task.id} 
            className={`p-3 rounded-lg border ${task.completed ? 'bg-gray-50 opacity-60' : 'bg-blue-50/50 border-blue-100'}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 flex-1">
                <input 
                  type="checkbox" 
                  checked={task.completed}
                  onChange={() => toggleTask(task.id)}
                  className="mt-1 w-4 h-4 cursor-pointer"
                />
                <div>
                  <p className={`font-medium ${task.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                    {task.title}
                  </p>
                  <div className="flex gap-2 mt-1 text-xs">
                    <span className="text-green-600 font-semibold bg-green-100 px-1.5 rounded">Impact: {task.impact}</span>
                    <span className="text-orange-600 font-semibold bg-orange-100 px-1.5 rounded">Effort: {task.effort}</span>
                  </div>
                </div>
              </div>
              <button onClick={() => deleteTask(task.id)} className="text-red-400 hover:text-red-600 text-sm">
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6 font-sans">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight">Logpose Todo</h1>
          <p className="text-gray-500 mt-2">Zero-friction. High ROI tasks only.</p>
        </div>

        {/* Form nhập liệu nhanh */}
        <form onSubmit={addTask} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-8 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[250px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Task / Habit (VD: Hít đất 50 cái)</label>
            <input 
              type="text" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Bạn cần hoàn thành việc gì?"
              autoFocus
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cột thời gian</label>
            <select value={column} onChange={e => setColumn(e.target.value as BoardColumn)} className="border border-gray-300 rounded-md p-2 outline-none">
              <option value="yesterday">Hôm qua</option>
              <option value="today">Hôm nay</option>
              <option value="tomorrow">Ngày mai</option>
            </select>
          </div>

          <div className="w-20">
            <label className="block text-sm font-medium text-gray-700 mb-1">Impact</label>
            <input type="number" min="1" max="10" value={impact} onChange={e => setImpact(Number(e.target.value))} className="w-full border border-gray-300 rounded-md p-2 outline-none" />
          </div>

          <div className="w-20">
            <label className="block text-sm font-medium text-gray-700 mb-1">Effort</label>
            <input type="number" min="1" max="10" value={effort} onChange={e => setEffort(Number(e.target.value))} className="w-full border border-gray-300 rounded-md p-2 outline-none" />
          </div>

          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-md transition-colors">
            Add Task
          </button>
        </form>

        {/* Giao diện 3 cột */}
        <div className="flex flex-col md:flex-row gap-6">
          <ColumnUI title="Hôm qua" colType="yesterday" />
          <div className="md:transform md:-translate-y-4 flex-1">
            {/* Cột Today được highlight nổi bật hơn */}
            <div className="shadow-lg border-blue-200 rounded-xl overflow-hidden">
               <div className="bg-blue-600 text-white text-center py-2 font-bold text-sm tracking-widest">FOCUS ZONE</div>
               <ColumnUI title="Hôm nay" colType="today" />
            </div>
          </div>
          <ColumnUI title="Ngày mai" colType="tomorrow" />
        </div>
      </div>
    </div>
  );
}
