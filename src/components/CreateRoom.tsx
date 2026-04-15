import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createRoom } from '../services/api';
import { useChatStore } from '../store/useChatStore';
import { Plus, Loader2 } from 'lucide-react';

export const CreateRoom: React.FC = () => {
  const [maxUsers, setMaxUsers] = useState<number>(10);
  const [duration, setDuration] = useState<number>(60);
  const [password, setPassword] = useState<string>('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const navigate = useNavigate();
  const setRoom = useChatStore((state) => state.setRoom);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (maxUsers < 2 || maxUsers > 50) {
      setError('Max users must be between 2 and 50');
      return;
    }
    
    if (duration < 1 || duration > 1440) {
      setError('Duration must be between 1 and 1440 minutes (24 hours)');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      
      const data = await createRoom(maxUsers, duration, password || undefined);
      
      // Save host token keyed to room code so Room.tsx can find it
      localStorage.setItem(`hostToken_${data.roomCode}`, data.hostToken);
      // Save password (if any) keyed to room code so Room.tsx can send it on re-join
      if (password) {
        localStorage.setItem(`roomPassword_${data.roomCode}`, password);
      }
      
      // We'll also store sessionId for WS connection later when joining properly
      let sessionId = localStorage.getItem('sessionId');
      if (!sessionId) {
        sessionId = Math.random().toString(36).substring(2, 15);
        localStorage.setItem('sessionId', sessionId);
      }
      
      setSuccess(true);
      
      // Pre-fill store state optionally
      setRoom(data.roomCode, {
        id: -1, // We'll get real ID on WS connection or full join
        nickName: 'Host',
        avatarColor: '#000000',
        isHost: true
      });
      
      // Brief feedback before redirect
      setTimeout(() => {
        navigate(`/room/${data.roomCode}`);
      }, 1500);
      
    } catch (err) {
      setError('Failed to create room. The backend might be unreachable.');
    } finally {
      if (!success) {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <div className="w-full glass rounded-2xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)]">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--color-gray-900)] dark:bg-[var(--color-gray-200)] text-[var(--color-gray-50)] dark:text-[var(--color-gray-900)] mb-4">
            <Plus className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-gray-900)] dark:text-[var(--color-gray-50)]">
            Create a Room
          </h2>
          <p className="text-[var(--color-gray-500)] dark:text-[var(--color-gray-400)] text-sm mt-2">
            Set up a new temporary collaboration space.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm text-center border border-red-100 dark:border-red-900/30 font-medium">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm text-center border border-green-100 dark:border-green-900/30 font-medium">
            Room created successfully! Redirecting...
          </div>
        )}

        <form onSubmit={handleCreateRoom} className="space-y-5">
          <div>
            <label htmlFor="maxUsers" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Max Users (2-50)
            </label>
            <input
              id="maxUsers"
              type="number"
              min="2"
              max="50"
              required
              value={maxUsers}
              onChange={(e) => setMaxUsers(parseInt(e.target.value) || 2)}
              className="appearance-none rounded-xl relative block w-full px-4 py-3 border border-[var(--border-color)] text-[var(--text-primary)] bg-[var(--bg-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-gray-400)] focus:border-transparent sm:text-sm transition-all shadow-sm"
              disabled={isLoading || success}
            />
          </div>

          <div>
            <label htmlFor="duration" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Duration (minutes)
            </label>
            <input
              id="duration"
              type="number"
              min="1"
              required
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value) || 60)}
              className="appearance-none rounded-xl relative block w-full px-4 py-3 border border-[var(--border-color)] text-[var(--text-primary)] bg-[var(--bg-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-gray-400)] focus:border-transparent sm:text-sm transition-all shadow-sm"
              disabled={isLoading || success}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Password <span className="text-[var(--text-secondary)]/70 font-normal">(Optional)</span>
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank for public room"
              className="appearance-none rounded-xl relative block w-full px-4 py-3 border border-[var(--border-color)] placeholder-[var(--text-secondary)]/50 text-[var(--text-primary)] bg-[var(--bg-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-gray-400)] focus:border-transparent sm:text-sm transition-all shadow-sm"
              disabled={isLoading || success}
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading || success}
              className="w-full relative flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl text-sm font-semibold text-[var(--color-gray-50)] bg-[var(--color-gray-900)] hover:bg-[var(--color-gray-800)] dark:bg-[var(--color-gray-200)] dark:text-[var(--color-gray-900)] dark:hover:bg-[var(--color-gray-300)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-gray-900)] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_2px_10px_rgb(0,0,0,0.1)]"
            >
              {isLoading && !success && (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              )}
              {success ? 'Success!' : isLoading ? 'Creating...' : 'Create Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
