import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Users, FileText, MessageCircle, TrendingUp } from 'lucide-react';

export default function AnalyticsCards({ stats }) {
  const cards = [
    { 
      label: 'Active Members', 
      value: stats.activeMembers, 
      icon: Users,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/20'
    },
    { 
      label: 'Posts This Week', 
      value: stats.postsThisWeek, 
      icon: FileText,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/20'
    },
    { 
      label: 'Comments This Week', 
      value: stats.commentsThisWeek, 
      icon: MessageCircle,
      color: 'text-violet-400',
      bg: 'bg-violet-500/20'
    },
    { 
      label: 'Total Posts', 
      value: stats.totalPosts, 
      icon: TrendingUp,
      color: 'text-amber-400',
      bg: 'bg-amber-500/20'
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 mb-6">
      {cards.map((card) => (
        <Card key={card.label} className="bg-card border">
          <CardContent className="p-4">
            <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center mb-3`}>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <p className="text-2xl font-bold mb-1">{card.value}</p>
            <p className="text-sm text-muted-foreground">{card.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}