import { useAuth } from '../context/AuthContext';
import { LogOut, Cpu, User, Bell, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Navbar() {
    const { currentUser, logout } = useAuth();

    return (
        <nav className="border-b border-white/10 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                <Link to="/dashboard" className="flex items-center gap-2">
                    <Cpu className="text-blue-500" />
                    <span className="font-bold text-white text-lg tracking-tight">Skill-Bridge</span>
                </Link>
                <div className="flex items-center gap-4">
                    <Link to="/profile" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
                        My Profile
                    </Link>
                    <Link to="/hackathons" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
                        Hackathons
                    </Link>
                    <Link to="/chat" className="text-slate-400 hover:text-white transition-colors" title="Messages">
                        <MessageSquare size={20} />
                    </Link>
                    <Link to="/notifications" className="text-slate-400 hover:text-white transition-colors">
                        <Bell size={20} />
                    </Link>
                    <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/5">
                        <img src={currentUser?.photoURL} alt="User" className="w-6 h-6 rounded-full" />
                        <span className="text-sm font-medium text-slate-200">{currentUser?.displayName}</span>
                    </div>
                    <button onClick={logout} className="p-2 hover:bg-white/5 rounded-lg transition-colors text-slate-400 hover:text-white">
                        <LogOut size={20} />
                    </button>
                </div>
            </div>
        </nav>
    );
}
