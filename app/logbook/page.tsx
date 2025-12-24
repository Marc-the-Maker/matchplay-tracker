'use client';

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, ArrowLeft, Loader2, Filter, X, Flag } from 'lucide-react';

type Match = {
  date: string;
  courseName: string;
  format: string;
  opponent: string;
  result: 'Win' | 'Loss' | 'Half';
  score: string;
};

function LogbookContent() {
  const searchParams = useSearchParams();
  const initialView = searchParams.get('new') === 'true' ? 'add' : 'list';
  
  const [view, setView] = useState<'list' | 'add'>(initialView);
  const [matches, setMatches] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // FILTERS
  const [showFilters, setShowFilters] = useState(false);
  const [filterPeriod, setFilterPeriod] = useState('All');
  const [filterResult, setFilterResult] = useState('All'); 
  const [filterCourse, setFilterCourse] = useState('All');

  const [formData, setFormData] = useState<Match>({
      date: new Date().toISOString().split('T')[0],
      courseName: '',
      format: 'Singles',
      opponent: '',
      result: 'Win',
      score: ''
  });
  const [courseSuggestions, setCourseSuggestions] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: matchData } = await supabase.from('matches').select('*, courses(name)').order('date', { ascending: false });
    if (matchData) setMatches(matchData);

    const { data: courseData } = await supabase.from('courses').select('*');
    if (courseData) setCourses(courseData);
  };

  const handleCourseSearch = (query: string) => {
      setFormData({...formData, courseName: query});
      if (query.length > 1) {
          const filtered = courses.filter(c => c.name.toLowerCase().includes(query.toLowerCase()));
          setCourseSuggestions(filtered);
      } else {
          setCourseSuggestions([]);
      }
  };

  const saveMatch = async () => {
      if (!formData.courseName || !formData.opponent) {
          alert("Please fill in Course and Opponent");
          return;
      }
      setLoading(true);

      let courseId;
      const existingCourse = courses.find(c => c.name.toLowerCase() === formData.courseName.toLowerCase());
      
      if (existingCourse) {
          courseId = existingCourse.id;
      } else {
          const { data, error } = await supabase.from('courses').insert({ name: formData.courseName }).select().single();
          if (error) {
              alert("Error creating course: " + error.message);
              setLoading(false);
              return;
          }
          courseId = data.id;
      }

      const { error: matchError } = await supabase.from('matches').insert({
          date: formData.date,
          course_id: courseId,
          format: formData.format,
          opponent: formData.opponent,
          result: formData.result,
          score: formData.score
      });

      if (matchError) {
          alert("Error saving match: " + matchError.message);
      } else {
          fetchData();
          setView('list');
          setFormData({ date: new Date().toISOString().split('T')[0], courseName: '', format: 'Singles', opponent: '', result: 'Win', score: '' });
      }
      setLoading(false);
  };

  // --- FILTERING LOGIC ---
  const uniqueCourses = Array.from(new Set(matches.map(m => m.courses?.name))).filter(Boolean).sort();

  const filteredMatches = matches.filter(m => {
      const d = new Date(m.date);
      const now = new Date();

      // Period
      if (filterPeriod === 'Last 30 Days') {
          const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(now.getDate() - 30);
          if (d < thirtyDaysAgo) return false;
      }
      if (filterPeriod === 'This Year') {
          if (d.getFullYear() !== now.getFullYear()) return false;
      }
      if (filterPeriod === 'Last Year') {
          if (d.getFullYear() !== now.getFullYear() - 1) return false;
      }

      // Result
      if (filterResult !== 'All' && m.result !== filterResult) return false;

      // Course
      if (filterCourse !== 'All' && m.courses?.name !== filterCourse) return false;

      return true;
  });

  const groupedMatches = filteredMatches.reduce((groups: any[], match) => {
      const date = new Date(match.date);
      const monthYear = date.toLocaleString('default', { month: 'long', year: 'numeric' });
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.title === monthYear) {
          lastGroup.items.push(match);
      } else {
          groups.push({ title: monthYear, items: [match] });
      }
      return groups;
  }, []);

  // --- DYNAMIC STYLES ---
  const getCircleStyle = (res: string) => {
      if (res === 'Win') return 'bg-[#22c55e] text-white'; // Green
      if (res === 'Loss') return 'bg-[#ef4444] text-white'; // Red
      return 'bg-gray-400 text-white'; // Grey (Half)
  };

  if (view === 'add') {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <h2 className="text-2xl font-black mb-6 text-gray-900 uppercase tracking-tight">Log Match</h2>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
            <div>
                <label className="text-[10px] text-gray-400 font-bold uppercase mb-1 block">Date</label>
                <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl font-bold text-gray-900 outline-none focus:ring-2 focus:ring-[#FF2800]"/>
            </div>

            <div className="relative">
                <label className="text-[10px] text-gray-400 font-bold uppercase mb-1 block">Course Name</label>
                <input 
                    placeholder="e.g. Fancourt Montagu" 
                    value={formData.courseName} 
                    onChange={e => handleCourseSearch(e.target.value)}
                    className="w-full p-3 bg-gray-50 rounded-xl font-bold text-gray-900 outline-none focus:ring-2 focus:ring-[#FF2800]"
                />
                {courseSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full bg-white border border-gray-100 shadow-xl rounded-xl mt-1 overflow-hidden">
                        {courseSuggestions.map(c => (
                            <div key={c.id} onClick={() => { setFormData({...formData, courseName: c.name}); setCourseSuggestions([]); }} className="p-3 hover:bg-gray-50 font-medium text-sm cursor-pointer">
                                {c.name}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-[10px] text-gray-400 font-bold uppercase mb-1 block">Format</label>
                    <select value={formData.format} onChange={e => setFormData({...formData, format: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl font-bold text-gray-900 outline-none focus:ring-2 focus:ring-[#FF2800]">
                        <option>Singles</option>
                        <option>Betterball</option>
                        <option>Foursomes</option>
                    </select>
                </div>
                <div>
                    <label className="text-[10px] text-gray-400 font-bold uppercase mb-1 block">Opponent</label>
                    <input placeholder="Name" value={formData.opponent} onChange={e => setFormData({...formData, opponent: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl font-bold text-gray-900 outline-none focus:ring-2 focus:ring-[#FF2800]"/>
                </div>
            </div>

            <div>
                <label className="text-[10px] text-gray-400 font-bold uppercase mb-2 block">Result</label>
                <div className="flex bg-gray-100 p-1 rounded-xl">
                    {['Win', 'Loss', 'Half'].map((r: any) => (
                        <button 
                            key={r} 
                            onClick={() => setFormData({...formData, result: r})}
                            className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${formData.result === r ? 'bg-white shadow text-[#FF2800]' : 'text-gray-400'}`}
                        >
                            {r}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <label className="text-[10px] text-gray-400 font-bold uppercase mb-1 block">Score</label>
                <input placeholder="e.g. 3 & 2" value={formData.score} onChange={e => setFormData({...formData, score: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl font-bold text-gray-900 outline-none focus:ring-2 focus:ring-[#FF2800]"/>
            </div>

            <div className="flex gap-3 pt-2">
                <button onClick={saveMatch} disabled={loading} className="flex-1 bg-[#FF2800] text-white p-4 rounded-xl font-bold shadow-lg shadow-[#FF2800]/20 flex items-center justify-center gap-2">
                    {loading && <Loader2 className="animate-spin" size={20}/>} Save Match
                </button>
                <button onClick={() => setView('list')} className="bg-white border border-gray-200 text-gray-700 p-4 rounded-xl font-bold">Cancel</button>
            </div>

        </div>
      </div>
    );
  }

  // LIST VIEW
  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-20">
       <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Match Logbook</h1>
          <Link href="/" className="bg-white p-2 rounded-lg border border-gray-200 text-gray-600 hover:text-[#FF2800] hover:border-[#FF2800] transition-colors"><ArrowLeft size={20}/></Link>
       </div>
       
       <button onClick={() => setView('add')} className="w-full bg-[#FF2800] text-white p-4 rounded-xl mb-6 font-bold shadow-lg shadow-[#FF2800]/20 flex items-center justify-center gap-2"><Plus size={20}/> Log New Match</button>
       
       {/* FILTERS */}
       <div className="mb-6">
           <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-[#FF2800] mb-2 transition-colors">
               <Filter size={14}/> {showFilters ? 'Hide Filters' : 'Show Filters'}
           </button>
           
           {showFilters && (
               <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-3 animate-in fade-in slide-in-from-top-2">
                   <div className="grid grid-cols-2 gap-3">
                       <div>
                           <label className="text-[10px] font-bold text-gray-400 uppercase">Period</label>
                           <select value={filterPeriod} onChange={e => setFilterPeriod(e.target.value)} className="w-full p-2 bg-gray-50 rounded text-sm font-bold text-gray-700 outline-none focus:ring-1 focus:ring-[#FF2800]">
                               <option value="All">All Time</option>
                               <option value="Last 30 Days">Last 30 Days</option>
                               <option value="This Year">This Year</option>
                               <option value="Last Year">Last Year</option>
                           </select>
                       </div>
                       <div>
                           <label className="text-[10px] font-bold text-gray-400 uppercase">Result</label>
                           <select value={filterResult} onChange={e => setFilterResult(e.target.value)} className="w-full p-2 bg-gray-50 rounded text-sm font-bold text-gray-700 outline-none focus:ring-1 focus:ring-[#FF2800]">
                               <option value="All">All Results</option>
                               <option value="Win">Wins</option>
                               <option value="Loss">Losses</option>
                               <option value="Half">Halves</option>
                           </select>
                        </div>
                   </div>
                   
                   <div>
                       <label className="text-[10px] font-bold text-gray-400 uppercase">Course</label>
                       <select value={filterCourse} onChange={e => setFilterCourse(e.target.value)} className="w-full p-2 bg-gray-50 rounded text-sm font-bold text-gray-700 outline-none focus:ring-1 focus:ring-[#FF2800]">
                           <option value="All">All Courses</option>
                           {uniqueCourses.map((c: any) => (
                               <option key={c} value={c}>{c}</option>
                           ))}
                       </select>
                   </div>

                   {(filterPeriod !== 'All' || filterResult !== 'All' || filterCourse !== 'All') && (
                       <button onClick={() => { setFilterPeriod('All'); setFilterResult('All'); setFilterCourse('All'); }} className="w-full py-2 text-xs font-bold text-red-400 hover:text-red-600 flex items-center justify-center gap-1">
                           <X size={12}/> Clear Filters
                       </button>
                   )}
               </div>
           )}
       </div>

       {/* LIST */}
       <div className="space-y-6">
          {groupedMatches.length === 0 ? (
              <div className="text-center py-10 text-gray-400 text-sm font-medium">No matches found.</div>
          ) : (
              groupedMatches.map(group => (
                  <div key={group.title}>
                      <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 ml-1">{group.title}</div>
                      <div className="space-y-3">
                          {group.items.map((m: any) => (
                              <div key={m.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
                                  <div className="flex items-center gap-4">
                                      {/* SCORE CIRCLE (Replaces Logo) */}
                                      <div className={`w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${getCircleStyle(m.result)}`}>
                                          <div className="font-black text-sm">{m.score || '-'}</div>
                                      </div>
                                      <div>
                                          <div className="font-bold text-gray-900">{m.courses?.name || 'Unknown Course'}</div>
                                          <div className="text-xs text-gray-500">
                                              vs {m.opponent} • {m.format}
                                          </div>
                                          <div className="text-[10px] text-gray-400 mt-1">
                                              {new Date(m.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                                          </div>
                                      </div>
                                  </div>
                                  <div className="text-right">
                                      {/* Minimalist Right Side (Result name is now redundant but kept for clarity) */}
                                      <div className="text-xs font-bold text-gray-900 uppercase tracking-wider">{m.result}</div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              ))
          )}
       </div>
    </div>
  );
}

export default function GolfLogbookWrapper() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading...</div>}>
      <LogbookContent />
    </Suspense>
  );
}