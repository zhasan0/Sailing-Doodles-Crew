import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Users, FileText, MessageCircle, TrendingUp } from 'lucide-react';

export default function AdminStats({ users, posts, comments }) {
  const activeMembers = users.filter(u => u.membership_status === 'active').length;
  
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
  const postsThisWeek = posts.filter(p => new Date(p.created_date) > oneWeekAgo).length;
  const commentsThisWeek = comments.filter(c => new Date(c.created_date) > oneWeekAgo).length;

  const stats = [
    { 
      label: 'Active Members', 
      value: activeMembers, 
      icon: Users, 
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/20'
    },
    { 
      label: 'Total Posts', 
      value: posts.length, 
      icon: FileText, 
      color: 'text-violet-400',
      bg: 'bg-violet-500/20'
    },
    { 
      label: 'Posts This Week', 
      value: postsThisWeek, 
      icon: TrendingUp, 
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/20'
    },
    { 
      label: 'Comments This Week', 
      value: commentsThisWeek, 
      icon: MessageCircle, 
      color: 'text-amber-400',
      bg: 'bg-amber-500/20'
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map((stat) => (
        <Card key={stat.label} className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-4">
            <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-xs text-slate-500">{stat.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}