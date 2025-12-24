'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';
import Link from 'next/link';
import { Trophy, TrendingUp, Calendar, Target, Plus, ArrowRight, Filter } from 'lucide-react';

export default function GolfDashboard() {
  const [matches, setMatches] = useState<any[]>([]);
  const [timeFilter, setTimeFilter] = useState('All Time'); // Default filter
  
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data } = await supabase.from('matches').select('*, courses(name)').order('date', { ascending: true });
    if (data) setMatches(data);
  };

  // --- FILTER ENGINE ---
  const availableYears = Array.from(new Set(matches.map(m => new Date(m.date).getFullYear()))).sort().reverse();
  
  const filteredMatches = matches.filter(m => {
      if (timeFilter === 'All Time') return true;
      return new Date(m.date).getFullYear().toString() === timeFilter;
  });

  // --- STATS ENGINE ---
  const wins = filteredMatches.filter(m => m.result === 'Win').length;
  const losses = filteredMatches.filter(m => m.result === 'Loss').length;
  const halves = filteredMatches.filter(m => m.result === 'Half').length;
  const total = filteredMatches.length;
  
  // Unbeaten Streak (Calculated on FILTERED data)
  let streak = 0;
  for (let i = filteredMatches.length - 1; i >= 0; i--) {
      if (filteredMatches[i].result === 'Loss') break;
      streak++;
  }

  // Best Win (Simple String Parsing)
  const bestWin = filteredMatches.find(m => m.result === 'Win' && m.score?.includes('&'))?.score || '-';

  // "Favorite Course" Logic (Most Wins)
  const getFavoriteCourse = () => {
      const winMatches = filteredMatches.filter(m => m.result === 'Win');
      if (winMatches.length === 0) return '-';
      
      const courseCounts: Record<string, number> = {};
      winMatches.forEach(m => {
          const name = m.courses?.name || 'Unknown';
          courseCounts[name] = (courseCounts[name] || 0) + 1;
      });
      
      // Find course with max wins
      return Object.keys(courseCounts).reduce((a, b) => courseCounts[a] > courseCounts[b] ? a : b);
  };
  const favCourse = getFavoriteCourse();

  // --- GRAPH DATA ---
  const getGraphData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.map((m, i) => {
        const monthMatches = filteredMatches.filter(match => new Date(match.date).getMonth() === i);
        return {
            name: m,
            Win: monthMatches.filter(x => x.result === 'Win').length,
            Loss: monthMatches.filter(x => x.result === 'Loss').length,
            Half: monthMatches.filter(x => x.result === 'Half').length,
        };
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-24">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <div>
           <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight leading-none">
             MARC&apos;S <br/> <span className="text-[#FF2800]">MATCH PLAY</span>
           </h1>
        </div>
        <Link href="/logbook?new=true" className="bg-[#FF2800] text-white p-3 rounded-full shadow-lg shadow-[#FF2800]/20 hover:scale-105 transition-transform">
           <Plus size={24} />
        </Link>
      </div>

      {/* FILTER TOGGLE */}
      <div className="flex justify-end mb-4">
          <div className="relative">
              <select 
                  value={timeFilter} 
                  onChange={(e) => setTimeFilter(e.target.value)}
                  className="appearance-none bg-white border border-gray-200 text-gray-700 text-xs font-bold uppercase py-2 pl-4 pr-8 rounded-full shadow-sm outline-none focus:border-[#FF2800] focus:ring-1 focus:ring-[#FF2800]"
              >
                  <option value="All Time">All Time</option>
                  {availableYears.map(year => (
                      <option key={year} value={year}>{year}</option>
                  ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                  <Filter size={12} />
              </div>
          </div>
      </div>

      {/* STATS GRID */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatCard icon={<Trophy size={18} className="text-[#FF2800]"/>} label="Record" value={`${wins}-${losses}-${halves}`} sub={`${total} Games`} />
        {/* NEW: Favorite Course */}
        <StatCard icon={<Target size={18} className="text-[#FF2800]"/>} label="Fav Course" value={favCourse} sub="Most Wins" truncate={true} />
        <StatCard icon={<TrendingUp size={18} className="text-[#FF2800]"/>} label="Unbeaten" value={streak} sub="Current Streak" />
        <StatCard icon={<Calendar size={18} className="text-[#FF2800]"/>} label="Best Win" value={bestWin} sub={timeFilter === 'All Time' ? 'All Time' : `${timeFilter}`} />
      </div>

      {/* PERFORMANCE GRAPH */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="mb-6 flex justify-between items-center">
          <h2 className="font-bold text-gray-800 text-lg">Performance</h2>
          <div className="text-xs font-bold text-gray-400 uppercase">{timeFilter}</div>
        </div>

        <div style={{ width: '100%', height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={getGraphData()} margin={{ top: 10, right: 0, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#9ca3af'}} />
                <Tooltip cursor={{fill: '#f9fafb', opacity: 0.5}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Legend iconType="circle" fontSize={10} />
                <Bar dataKey="Win" stackId="a" fill="#22c55e" radius={[0, 0, 4, 4]} />
                <Bar dataKey="Half" stackId="a" fill="#9ca3af" />
                <Bar dataKey="Loss" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* FOOTER BUTTON */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center pointer-events-none">
         <Link href="/logbook" className="bg-[#FF2800] text-white px-6 py-3 rounded-full shadow-xl shadow-[#FF2800]/30 font-bold text-sm pointer-events-auto flex items-center gap-2 hover:bg-red-600 transition-colors">
            View Match Log <ArrowRight size={16}/>
         </Link>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, truncate }: any) {
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between h-28">
      <div className="text-gray-400 mb-1">{icon}</div>
      <div>
        <div className={`text-2xl font-black text-gray-900 ${truncate ? 'truncate' : ''}`} title={typeof value === 'string' ? value : ''}>{value}</div>
        <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">{label}</div>
        <div className="text-[10px] text-[#FF2800] mt-1 font-semibold opacity-80">{sub}</div>
      </div>
    </div>
  );
}