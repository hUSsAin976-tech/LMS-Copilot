import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  BookOpen,
  Calendar,
  Award,
  FileText,
  Settings as SettingsIcon,
  X,
  GraduationCap,
  Sparkles,
  Target,
  Layers,
  Activity,
  ShieldCheck,
  Globe
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'LMS / AMS Portal', href: '/portal', icon: Globe, badge: 'Real-Time' },
  { name: 'Courses', href: '/courses', icon: BookOpen },
  { name: 'Assignments & Intake', href: '/assignments', icon: FileText },
  { name: 'Study Planner', href: '/planner', icon: Calendar },
  { name: 'Concept Coach', href: '/coach', icon: Sparkles },
  { name: 'Draft Reviewer', href: '/reviewer', icon: Award },
  { name: 'Exam Prep Studio', href: '/exam-prep', icon: Target },
  { name: 'Knowledge Base', href: '/materials', icon: Layers },
  { name: 'Agent Activity', href: '/activity', icon: Activity },
  { name: 'Settings', href: '/settings', icon: SettingsIcon },
];

export default function Sidebar({ open, setOpen }: { open: boolean; setOpen: (val: boolean) => void }) {
  const location = useLocation();

  const renderNavLinks = (isMobile = false) => (
    <nav className="px-2 space-y-1">
      {navigation.map((item) => {
        const isActive = location.pathname === item.href || (item.href !== '/dashboard' && location.pathname.startsWith(item.href));
        return (
          <Link
            key={item.name}
            to={item.href}
            onClick={() => isMobile && setOpen(false)}
            className={`group flex items-center px-3 py-2.5 text-xs font-semibold rounded-xl transition ${
              isActive
                ? 'bg-primary-50 text-primary-700 font-bold shadow-xs'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <item.icon
              className={`mr-3 flex-shrink-0 h-4 w-4 transition ${
                isActive ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-500'
              }`}
            />
            <span className="flex-1 truncate">{item.name}</span>
            {item.badge && (
              <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 flex z-40 md:hidden ${open ? '' : 'hidden'}`} role="dialog" aria-modal="true">
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" aria-hidden="true" onClick={() => setOpen(false)}></div>
        <div className="relative flex-1 flex flex-col max-w-xs w-full pt-5 pb-4 bg-white">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setOpen(false)}
            >
              <span className="sr-only">Close sidebar</span>
              <X className="h-6 w-6 text-white" aria-hidden="true" />
            </button>
          </div>
          <div className="flex-shrink-0 flex items-center px-4 space-x-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary-600 flex items-center justify-center text-white shadow-xs">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-gray-900 tracking-tight">Rahnuma AI</h1>
              <p className="text-[10px] text-gray-500 font-medium">Multi-Agent Student Guide</p>
            </div>
          </div>
          <div className="mt-5 flex-1 h-0 overflow-y-auto">
            {renderNavLinks(true)}
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64 border-r border-gray-200 bg-white shadow-xs">
          <div className="flex flex-col h-0 flex-1">
            {/* Top Brand */}
            <div className="p-5 border-b border-gray-100 flex items-center space-x-3">
              <div className="h-9 w-9 rounded-xl bg-primary-600 flex items-center justify-center text-white shadow-xs">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-base font-extrabold text-gray-900 tracking-tight">Rahnuma AI</h1>
                <p className="text-[10px] text-gray-400 font-medium">Supervised Student Guide</p>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 py-4 overflow-y-auto">
              {renderNavLinks(false)}
            </div>

            {/* Academic Integrity Badge */}
            <div className="p-4 border-t border-gray-100 bg-gray-50/50">
              <div className="p-3 bg-white rounded-xl border border-gray-200 space-y-1">
                <div className="flex items-center space-x-1.5 text-blue-700">
                  <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                  <span className="text-[11px] font-bold">Academic Integrity</span>
                </div>
                <p className="text-[10px] text-gray-500 leading-snug">
                  Coach, not ghostwriter. Student retains authorship.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
