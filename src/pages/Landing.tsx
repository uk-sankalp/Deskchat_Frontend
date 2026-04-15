import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { joinRoom } from '../services/api';
import { useChatStore } from '../store/useChatStore';
import { MessageSquarePlus, LogIn } from 'lucide-react';
import { CreateRoom } from '../components/CreateRoom';

export const Landing: React.FC = () => {
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const navigate = useNavigate();
  const setRoom = useChatStore((state) => state.setRoom);

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    try {
      setIsLoading(true);
      setError('');
      let sessionId = localStorage.getItem('sessionId');
      if (!sessionId) {
        sessionId = Math.random().toString(36).substring(2, 15);
        localStorage.setItem('sessionId', sessionId);
      }
      const data = await joinRoom(joinCode.trim(), sessionId);
      setRoom(joinCode.trim(), data);
      navigate(`/room/${joinCode.trim()}`);
    } catch (err) {
      setError('Invalid room code or room is full.');
    } finally {
      setIsLoading(false);
    }
  };

  if (showCreate) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 transition-colors duration-300">
        <div className="w-full max-w-md relative">
          <button 
            onClick={() => setShowCreate(false)}
            className="absolute -top-10 left-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            ← Back to Join
          </button>
          <CreateRoom />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 transition-colors duration-300">
      <div className="max-w-md w-full glass rounded-2xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)]">
        
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--color-gray-900)] dark:bg-[var(--color-gray-200)] text-[var(--color-gray-50)] dark:text-[var(--color-gray-900)] mb-4">
            <MessageSquarePlus className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-gray-900)] dark:text-[var(--color-gray-50)]">DeskChat</h1>
          <p className="text-[var(--color-gray-500)] dark:text-[var(--color-gray-400)] text-sm mt-2">
            A minimalist temporary real-time collaboration space.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm text-center border border-red-100 dark:border-red-900/30">
            {error}
          </div>
        )}

        <div className="space-y-6">
          <button
            onClick={() => setShowCreate(true)}
            className="w-full relative flex justify-center py-3 px-4 border border-transparent rounded-xl text-sm font-medium text-[var(--color-gray-50)] bg-[var(--color-gray-900)] hover:bg-[var(--color-gray-800)] dark:bg-[var(--color-gray-200)] dark:text-[var(--color-gray-900)] dark:hover:bg-[var(--color-gray-300)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-gray-900)] transition-all"
          >
            Create New Room
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--border-color)]"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-[var(--bg-primary)] text-[var(--text-secondary)]">Or join existing</span>
            </div>
          </div>

          <form onSubmit={handleJoinRoom} className="space-y-4">
            <div>
              <label htmlFor="roomCode" className="sr-only">Room Code</label>
              <input
                id="roomCode"
                name="roomCode"
                type="text"
                required
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                className="appearance-none rounded-xl relative block w-full px-4 py-3 border border-[var(--border-color)] placeholder-[var(--text-secondary)] text-[var(--text-primary)] bg-[var(--bg-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-gray-400)] focus:border-transparent sm:text-sm transition-all"
                placeholder="Enter room code"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !joinCode.trim()}
              className="w-full flex items-center justify-center py-3 px-4 border border-[var(--border-color)] rounded-xl text-sm font-medium text-[var(--text-primary)] bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-gray-200)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Join Room
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
