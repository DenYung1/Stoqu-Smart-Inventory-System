import React, { useEffect, useState } from 'react';
import { Clock, AlertTriangle, RefreshCw, LogOut } from 'lucide-react';

interface SessionTimeoutModalProps {
  isOpen: boolean;
  timeRemaining: number;
  onStayLoggedIn: () => void;
  onLogout: () => void;
  isExtending?: boolean;
}

const SessionTimeoutModal: React.FC<SessionTimeoutModalProps> = ({
  isOpen,
  timeRemaining,
  onStayLoggedIn,
  onLogout,
  isExtending = false
}) => {
  const [minutes, setMinutes] = useState(Math.floor(timeRemaining / 60));
  const [seconds, setSeconds] = useState(timeRemaining % 60);

  useEffect(() => {
    setMinutes(Math.floor(timeRemaining / 60));
    setSeconds(timeRemaining % 60);
  }, [timeRemaining]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Background overlay */}
        <div className="fixed inset-0 bg-black/75 transition-opacity" />

        {/* Modal */}
        <div className="relative z-10 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
          <div className="flex flex-col items-center">
            {/* Warning Icon */}
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
            </div>

            {/* Title */}
            <h3 className="mb-4 text-xl font-bold text-gray-900">
              Session Timeout Warning
            </h3>

            {/* Time remaining */}
            <div className="mb-6 text-center">
              <div className="mb-2 flex items-center justify-center gap-2 text-gray-600">
                <Clock className="h-5 w-5" />
                <span>Time remaining:</span>
              </div>
              <div className="text-3xl font-bold text-red-600">
                {minutes}:{seconds.toString().padStart(2, '0')}
              </div>
            </div>

            {/* Message */}
            <p className="mb-6 text-center text-gray-600">
              Your session is about to expire. Would you like to stay logged in?
            </p>

            {/* Buttons */}
            <div className="flex w-full justify-center gap-4">
              <button
                onClick={onStayLoggedIn}
                disabled={isExtending}
                className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-white transition
                         hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                         disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw className={`h-5 w-5 ${isExtending ? 'animate-spin' : ''}`} />
                Stay Logged In
              </button>
              <button
                onClick={onLogout}
                className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-gray-700 transition
                         hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                <LogOut className="h-5 w-5" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionTimeoutModal;
