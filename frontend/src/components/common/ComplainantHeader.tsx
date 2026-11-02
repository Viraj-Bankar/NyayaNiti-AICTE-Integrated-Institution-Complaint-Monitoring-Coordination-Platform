import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useComplainantAuth } from '../../context/ComplainantAuthContext';
import { api } from '../../services/api';
import { ComplainantNotificationItem } from '../../types';
import { LogOut, User, Bell, Check, Clock, FileText, CheckCircle2 } from 'lucide-react';

export const ComplainantHeader: React.FC = () => {
  const { complainant, logout } = useComplainantAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [notifications, setNotifications] = useState<ComplainantNotificationItem[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isLoadingNotifs, setIsLoadingNotifs] = useState(false);
  const notifDropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      setIsLoadingNotifs(true);
      const data = await api.getComplainantNotifications();
      setNotifications(data || []);
    } catch {
      // Fail silently to avoid interrupting citizen navigation
    } finally {
      setIsLoadingNotifs(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: number) => {
    try {
      await api.markComplainantNotificationRead(id);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch {
      // Fail silently
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllComplainantNotificationsRead();
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true }))
      );
    } catch {
      // Fail silently
    }
  };

  const handleNotificationClick = async (n: ComplainantNotificationItem) => {
    if (!n.is_read) {
      await handleMarkAsRead(n.id);
    }
    setShowNotifications(false);
    if (n.related_case_id) {
      navigate(`/complainant/complaints/${n.related_case_id}`);
    } else if (n.link_url) {
      const match = n.link_url.match(/cases\/([A-Za-z0-9\-_]+)/);
      if (match && match[1]) {
        navigate(`/complainant/complaints/${match[1]}`);
      } else {
        navigate('/complainant/complaints');
      }
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isHomeActive = location.pathname === '/complainant/home' || location.pathname === '/complainant/dashboard';
  const isSubmitActive = location.pathname.startsWith('/complainant/submit');
  const isComplaintsActive = location.pathname.startsWith('/complainant/complaints');
  const isProfileActive = location.pathname.startsWith('/complainant/profile');

  return (
    <header className="bg-white border-b border-slate-200 py-3 px-4 shadow-sm relative z-30">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left: AICTE Emblem + Citizen Portal Branding */}
        <Link to="/complainant/home" className="flex items-center gap-3 group">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-tr from-[#061E46] via-[#092D62] to-[#1E5AA8] p-1 flex items-center justify-center shadow-md flex-shrink-0">
            <div className="w-full h-full rounded-full border border-amber-400/60 flex flex-col items-center justify-center text-white text-center">
              <span className="text-[8px] font-bold text-[#FFB900]">AICTE</span>
              <span className="text-[6px] tracking-widest uppercase">CITIZEN</span>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#FFB900] bg-[#092D62] px-2 py-0.5 rounded">
                न्यायनीति
              </span>
              <span className="text-sm sm:text-base font-extrabold text-[#092D62]">
                Citizen Portal
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium hidden sm:block">
              AICTE Institutional Complaint Redressal & Milestone Tracking
            </p>
          </div>
        </Link>

        {/* Middle: Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1">
          <Link
            to="/complainant/home"
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              isHomeActive
                ? 'bg-[#092D62] text-white shadow-2xs'
                : 'text-slate-600 hover:text-[#092D62] hover:bg-slate-100'
            }`}
          >
            Dashboard
          </Link>
          <Link
            to="/complainant/submit"
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              isSubmitActive
                ? 'bg-[#092D62] text-white shadow-2xs'
                : 'text-slate-600 hover:text-[#092D62] hover:bg-slate-100'
            }`}
          >
            Submit Complaint
          </Link>
          <Link
            to="/complainant/complaints"
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              isComplaintsActive
                ? 'bg-[#092D62] text-white shadow-2xs'
                : 'text-slate-600 hover:text-[#092D62] hover:bg-slate-100'
            }`}
          >
            Complaint History
          </Link>
          <Link
            to="/complainant/profile"
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              isProfileActive
                ? 'bg-[#092D62] text-white shadow-2xs'
                : 'text-slate-600 hover:text-[#092D62] hover:bg-slate-100'
            }`}
          >
            Citizen Profile
          </Link>
        </nav>

        {/* Right: Notification Bell + User Profile & Actions */}
        <div className="flex items-center gap-3">
          {/* Notification Bell Dropdown */}
          <div className="relative" ref={notifDropdownRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-lg text-slate-600 hover:text-[#092D62] hover:bg-slate-100 transition-colors cursor-pointer"
              title="Citizen Notifications"
              aria-label="Citizen Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-600 text-white text-[9px] font-black flex items-center justify-center animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Popover */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
                <div className="bg-[#092D62] text-white px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-[#FFB900]" />
                    <span className="text-xs font-bold">Official Notifications</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <>
                        <button
                          onClick={handleMarkAllRead}
                          className="text-[10px] text-amber-300 hover:text-white underline cursor-pointer"
                        >
                          Mark all read
                        </button>
                        <span className="bg-amber-400 text-[#092D62] text-[10px] font-black px-2 py-0.5 rounded-full">
                          {unreadCount} Unread
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {isLoadingNotifs ? (
                    <div className="p-6 text-center text-xs text-slate-400">Loading notifications...</div>
                  ) : notifications.length === 0 ? (
                    <div className="p-6 text-center space-y-1">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
                      <p className="text-xs font-bold text-slate-700">No New Notifications</p>
                      <p className="text-[10px] text-slate-400">You will receive updates when bureaus take action on your complaints.</p>
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className={`p-3.5 text-xs transition-colors cursor-pointer ${
                          n.is_read ? 'bg-white hover:bg-slate-50' : 'bg-blue-50/70 hover:bg-blue-50 font-medium'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-1.5">
                              {!n.is_read && (
                                <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />
                              )}
                              <h5 className="font-bold text-[#061E46] text-xs">{n.title}</h5>
                            </div>
                            <p className="text-slate-600 text-[11px] leading-relaxed">{n.message}</p>
                            <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(n.created_at).toLocaleString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          {!n.is_read && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAsRead(n.id);
                              }}
                              className="text-slate-400 hover:text-emerald-600 p-1"
                              title="Mark read"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="hidden md:flex flex-col text-right">
            <span className="text-xs font-bold text-[#061E46] flex items-center gap-1 justify-end">
              <User className="w-3.5 h-3.5 text-[#1E5AA8]" />
              {complainant?.full_name || 'Citizen User'}
            </span>
            <span className="text-[10px] text-slate-500">
              {complainant?.email} • {complainant?.complainant_type || 'Student'}
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="btn-3d-white px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer text-slate-700 shadow-2xs hover:text-red-700"
            title="Sign out of Citizen Portal"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default ComplainantHeader;