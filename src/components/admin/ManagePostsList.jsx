import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function ManagePostsList({ posts, onDelete }) {
  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardContent className="p-4">
        <h3 className="font-semibold text-white mb-4">Manage Posts</h3>
        {posts.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-8">No posts yet</p>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <div
                key={post.id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">{post.title}</p>
                  <p className="text-xs text-slate-500">
                    {formatDistanceToNow(new Date(post.created_date), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex gap-2 ml-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    onClick={() => onDelete(post.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}