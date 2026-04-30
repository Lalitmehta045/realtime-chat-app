import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Avatar } from './Avatar';
import { getUserProfile } from '../../lib/api';
import { Loader } from './Loader';
import { Mail, Info, Wifi, X } from 'lucide-react';

export const ProfileModal = ({ userId, isOpen, onClose }) => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId || !isOpen) {
        setUserData(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const user = await getUserProfile(userId);
        setUserData(user);
      } catch (err) {
        console.error(err);
        setError('Failed to load user profile.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId, isOpen]);

  // Close on ESC
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">

      {/* BACKDROP CLICK */}
      <div
        className="absolute inset-0"
        onClick={onClose}
      />

      {/* MODAL */}
      <div
        className="
          relative w-full 
          max-w-md sm:max-w-lg md:max-w-xl
          bg-[var(--bg-surface)]
          rounded-2xl
          border border-[var(--border-glass)]
          shadow-2xl
          max-h-[90vh]
          overflow-y-auto
          animate-[fadeIn_.2s_ease]
        "
      >

        {/* HEADER */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-[var(--border-glass)] bg-[var(--bg-surface)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            User Profile
          </h2>

          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--bg-base)] transition"
          >
            <X className="w-5 h-5 text-[var(--text-muted)]" />
          </button>
        </div>

        {/* CONTENT */}
        <div className="p-5">

          {loading && (
            <div className="py-10 flex justify-center items-center">
              <Loader />
            </div>
          )}

          {error && (
            <div className="text-red-500 text-center py-4">
              {error}
            </div>
          )}

          {userData && (
            <div className="flex flex-col items-center">

              {/* AVATAR */}
              <Avatar
                src={userData.profilePicture}
                alt={userData.username}
                size="xl"
                className="mb-4"
              />

              {/* NAME */}
              <h3 className="text-2xl font-bold text-[var(--text-primary)]">
                {userData.username}
              </h3>

              {/* STATUS */}
              <p className="text-sm text-[var(--text-muted)] mb-5">
                {userData.isOnline ? 'Online' : 'Offline'}
              </p>

              {/* INFO */}
              <div className="w-full space-y-4 text-sm">

                {userData.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-[var(--text-muted)]" />
                    <span className="text-[var(--text-secondary)] break-all">
                      {userData.email}
                    </span>
                  </div>
                )}

                {userData.bio && (
                  <div className="flex items-start gap-3">
                    <Info className="w-4 h-4 text-[var(--text-muted)] mt-1" />
                    <p className="text-[var(--text-secondary)] leading-relaxed">
                      {userData.bio}
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Wifi
                    className={`w-4 h-4 ${
                      userData.isOnline ? 'text-green-500' : 'text-gray-500'
                    }`}
                  />
                  <span className="text-[var(--text-secondary)]">
                    {userData.isOnline
                      ? 'Currently Online'
                      : 'Currently Offline'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};