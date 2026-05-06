import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { LogOut, GraduationCap, Bell, MessageSquare, Home, UserRound, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLocation } from 'react-router-dom';

export default function Navbar() {
    const { currentUser, logout } = useAuth();
    const { unreadMessagesCount, pendingRequestsCount } = useNotifications();
    const location = useLocation();

    const navItems = [
        { to: '/dashboard', label: 'Community', icon: Home },
        { to: '/hackathons', label: 'Hub', icon: Trophy },
        { to: '/chat', label: 'Chats', icon: MessageSquare },
        { to: '/notifications', label: 'Notifications', icon: Bell },
        { to: '/profile', label: 'Profile', icon: UserRound }
    ];

    return (
        <>
            <nav className="md:hidden sticky top-0 z-40 px-4 pt-3">
                <div className="rounded-2xl border border-white/10 bg-slate-900/65 backdrop-blur-xl px-4 py-2.5 flex items-center justify-between">
                    <Link to="/dashboard" className="flex items-center gap-2 min-w-0">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                            <GraduationCap className="text-white" size={16} />
                        </div>
                        <p className="font-semibold text-white text-sm truncate">SkillBridge Campus</p>
                    </Link>
                    <button onClick={logout} className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors" title="Logout">
                        <LogOut size={17} />
                    </button>
                </div>
            </nav>

            <aside className="hidden md:flex fixed left-4 top-4 bottom-4 z-50 w-64 flex-col rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur-xl shadow-[0_12px_45px_rgba(0,0,0,0.4)] p-3">
                <Link to="/dashboard" className="flex items-center gap-2 rounded-xl px-2 py-2 mb-3">
                    <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                        <GraduationCap className="text-white" size={18} />
                    </div>
                    <div>
                        <p className="font-semibold text-white text-sm">SkillBridge Campus</p>
                        <p className="text-[10px] text-cyan-300/90 uppercase tracking-widest">Hackathon Social</p>
                    </div>
                </Link>

                <div className="flex-1 space-y-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const active = location.pathname.startsWith(item.to);
                        const badge =
                            item.to === '/chat' ? unreadMessagesCount :
                            item.to === '/notifications' ? pendingRequestsCount : 0;
                        return (
                            <Link
                                key={item.to}
                                to={item.to}
                                className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm transition-all ${
                                    active ? 'bg-blue-600 text-white shadow shadow-blue-500/30' : 'text-slate-300 hover:bg-white/10'
                                }`}
                            >
                                <span className="flex items-center gap-2">
                                    <Icon size={16} />
                                    {item.label}
                                </span>
                                {badge > 0 && (
                                    <span className="min-w-5 h-5 px-1 rounded-full bg-rose-500 text-[10px] text-white flex items-center justify-center">
                                        {badge > 9 ? '9+' : badge}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </div>

                <div className="mt-3 rounded-xl border border-white/10 bg-white/5 px-2 py-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <img src={currentUser?.photoURL} alt="User" className="w-7 h-7 rounded-lg" />
                        <span className="text-xs text-slate-100 truncate">{currentUser?.displayName}</span>
                    </div>
                    <button onClick={logout} className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors" title="Logout">
                        <LogOut size={15} />
                    </button>
                </div>
            </aside>
        </>
    );
}
