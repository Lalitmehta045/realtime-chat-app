import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from '@components/sidebar/Sidebar';
import { ChatWindow } from '@components/chat/ChatWindow';
import { useChatStore } from '@store/useChatStore';
import { useAuthStore } from '@store/useAuthStore';
import { Avatar } from '@components/shared/Avatar';
import axios from '@lib/axios';
import toast from 'react-hot-toast';
import {
  ChevronRight,
  User,
  Lock,
  Bell,
  Moon,
  Sun,
  Camera,
  X,
  Check,
  Loader2,
  Eye,
  EyeOff,
  LogOut
} from 'lucide-react';

// Settings/Profile Drawer Component
const SettingsDrawer = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('profile');
  const { authUser, setAccessToken, setAuthUser, logout } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    username: authUser?.username || '',
    bio: authUser?.bio || '',
  });
  const [avatarPreview, setAvatarPreview] = useState(authUser?.profilePicture || null);
  const [avatarFile, setAvatarFile] = useState(null);

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return !document.documentElement.classList.contains('light');
  });

  // Reset form when drawer opens
  useEffect(() => {
    if (isOpen && authUser) {
      setProfileForm({
        username: authUser.username || '',
        bio: authUser.bio || '',
      });
      setAvatarPreview(authUser.profilePicture || null);
      setAvatarFile(null);
    }
  }, [isOpen, authUser]);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleUpdateProfile = async () => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('username', profileForm.username);
      formData.append('bio', profileForm.bio);
      if (avatarFile) {
        formData.append('avatar', avatarFile);
      }

      const response = await axios.put('/users/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Update local auth state
      const updatedUser = { ...authUser, ...response.data.user };
      setAuthUser(updatedUser);
      setAccessToken(response.data.accessToken || authUser.token);
      
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    try {
      await axios.put('/users/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });

      toast.success('Password changed successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    document.documentElement.classList.toggle('light', !newMode);
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
    toast.success(`Switched to ${newMode ? 'dark' : 'light'} mode`);
  };

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    onClose();
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'appearance', label: 'Appearance', icon: isDarkMode ? Moon : Sun },
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50"
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Drawer */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="absolute right-0 top-0 bottom-0 w-full max-w-md glass border-l border-[var(--border-glass)] shadow-2xl"
        >
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-[var(--border-glass)] flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Settings</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[var(--border-glass)]">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'text-violet-400 border-b-2 border-violet-400'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  {/* Avatar */}
                  <div className="flex flex-col items-center">
                    <div className="relative">
                      <Avatar
                        src={avatarPreview}
                        alt={profileForm.username}
                        size="xl"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-0 right-0 w-10 h-10 gradient-primary rounded-full flex items-center justify-center shadow-lg hover:opacity-90 transition-opacity"
                      >
                        <Camera className="w-5 h-5 text-white" />
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="hidden"
                      />
                    </div>
                    <p className="mt-3 text-sm text-[var(--text-muted)]">
                      Click to change avatar
                    </p>
                  </div>

                  {/* Username */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                      Username
                    </label>
                    <input
                      type="text"
                      value={profileForm.username}
                      onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-glass)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
                    />
                  </div>

                  {/* Bio */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                      Bio
                    </label>
                    <textarea
                      value={profileForm.bio}
                      onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                      placeholder="Tell us about yourself..."
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-glass)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all resize-none"
                    />
                  </div>

                  {/* Save Button */}
                  <button
                    onClick={handleUpdateProfile}
                    disabled={isLoading}
                    className="w-full py-3 gradient-primary text-white font-semibold rounded-xl shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Check className="w-5 h-5" />
                        Save Changes
                      </>
                    )}
                  </button>
                </motion.div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                    Change Password
                  </h3>

                  {/* Current Password */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.current ? 'text' : 'password'}
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                        className="w-full px-4 py-3 pr-12 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-glass)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                      >
                        {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.new ? 'text' : 'password'}
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        className="w-full px-4 py-3 pr-12 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-glass)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                      >
                        {showPasswords.new ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.confirm ? 'text' : 'password'}
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                        className="w-full px-4 py-3 pr-12 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-glass)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                      >
                        {showPasswords.confirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Change Password Button */}
                  <button
                    onClick={handleChangePassword}
                    disabled={isLoading || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                    className="w-full py-3 gradient-primary text-white font-semibold rounded-xl shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Lock className="w-5 h-5" />
                        Change Password
                      </>
                    )}
                  </button>

                  {/* Logout */}
                  <div className="pt-6 border-t border-[var(--border-glass)]">
                    <button
                      onClick={handleLogout}
                      className="w-full py-3 bg-red-500/20 text-red-400 font-semibold rounded-xl hover:bg-red-500/30 transition-colors flex items-center justify-center gap-2"
                    >
                      <LogOut className="w-5 h-5" />
                      Logout
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Appearance Tab */}
              {activeTab === 'appearance' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                    Theme
                  </h3>

                  <div className="space-y-3">
                    {/* Dark Mode Toggle */}
                    <button
                      onClick={() => isDarkMode || toggleTheme()}
                      className={`w-full p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${
                        isDarkMode
                          ? 'border-violet-500 bg-violet-500/10'
                          : 'border-[var(--border-glass)] hover:border-[var(--text-muted)]'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center">
                        <Moon className="w-6 h-6 text-violet-400" />
                      </div>
                      <div className="text-left flex-1">
                        <p className="font-semibold text-[var(--text-primary)]">Dark Mode</p>
                        <p className="text-sm text-[var(--text-muted)]">Easier on the eyes</p>
                      </div>
                      {isDarkMode && <Check className="w-5 h-5 text-violet-400" />}
                    </button>

                    {/* Light Mode Toggle */}
                    <button
                      onClick={() => !isDarkMode || toggleTheme()}
                      className={`w-full p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${
                        !isDarkMode
                          ? 'border-violet-500 bg-violet-500/10'
                          : 'border-[var(--border-glass)] hover:border-[var(--text-muted)]'
                      }`}
                    >
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                        <Sun className="w-6 h-6 text-amber-500" />
                      </div>
                      <div className="text-left flex-1">
                        <p className="font-semibold text-[var(--text-primary)]">Light Mode</p>
                        <p className="text-sm text-[var(--text-muted)]">Classic look</p>
                      </div>
                      {!isDarkMode && <Check className="w-5 h-5 text-violet-400" />}
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export const HomePage = () => {
  const { selectedConversation, selectConversation } = useChatStore();
  const [showSettings, setShowSettings] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [showSidebar, setShowSidebar] = useState(true);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isMobile && selectedConversation) {
      setShowSidebar(false);
    }
  }, [selectedConversation, isMobile]);

  const handleSelectConversation = (conversation) => {
    selectConversation(conversation);
    if (isMobile) {
      setShowSidebar(false);
    }
  };

  const handleBack = () => {
    selectConversation(null);
    setShowSidebar(true);
  };

  return (
    <div className="h-screen w-full flex overflow-hidden bg-[var(--bg-base)]">
      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {(!isMobile || showSidebar) && (
          <motion.div
            initial={isMobile ? { x: -300, opacity: 0 } : false}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`${isMobile ? 'absolute inset-0 z-20 w-full' : 'relative'} h-full`}
          >
            <Sidebar
              onSelectConversation={handleSelectConversation}
              selectedConversationId={selectedConversation?._id}
              onOpenSettings={() => setShowSettings(true)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence mode="wait">
        {(!isMobile || !showSidebar) && (
          <motion.div
            initial={isMobile ? { x: 300, opacity: 0 } : false}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="flex-1 h-full"
          >
            <ChatWindow 
              onBack={isMobile ? handleBack : undefined}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Drawer */}
      <SettingsDrawer 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
      />
    </div>
  );
};
