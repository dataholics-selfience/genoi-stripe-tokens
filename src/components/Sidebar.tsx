import { useState, useEffect } from 'react';
import { Plus, X, FolderClosed, FolderOpen, Rocket } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { Link, useNavigate } from 'react-router-dom';
import { auth, db } from '../config/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import UserProfile from './UserProfile';
import { ChallengeType, StartupListType } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  challenges: ChallengeType[];
  currentChallengeId: string | null;
  onSelectChallenge: (challengeId: string) => void;
}

const MAX_VISIBLE_STARTUPS = 3;

const Sidebar = ({ isOpen, toggleSidebar, challenges, currentChallengeId, onSelectChallenge }: SidebarProps) => {
  const navigate = useNavigate();
  const [pulseCount, setPulseCount] = useState(0);
  const [challengeStartups, setChallengeStartups] = useState<Record<string, StartupListType[]>>({});
  const [expandedChallenge, setExpandedChallenge] = useState<string | null>(null);

  useEffect(() => {
    if (pulseCount >= 5) return;

    const interval = setInterval(() => {
      setPulseCount(prev => prev + 1);
    }, 180000); // 3 minutes

    return () => clearInterval(interval);
  }, [pulseCount]);

  useEffect(() => {
    const fetchStartupLists = async () => {
      const startupsByChallenge: Record<string, StartupListType[]> = {};
      
      for (const challenge of challenges) {
        const q = query(
          collection(db, 'startupList'),
          where('challengeId', '==', challenge.id)
        );
        const querySnapshot = await getDocs(q);
        startupsByChallenge[challenge.id] = querySnapshot.docs.map(
          doc => ({ id: doc.id, ...doc.data() } as StartupListType)
        );
      }
      
      setChallengeStartups(startupsByChallenge);
    };

    fetchStartupLists();
  }, [challenges]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const renderStartupIcons = (challengeId: string, startups: StartupListType[]) => {
    const isExpanded = expandedChallenge === challengeId;
    const visibleStartups = isExpanded ? startups : startups.slice(0, MAX_VISIBLE_STARTUPS);
    
    return (
      <div className="flex -space-x-2 ml-6 mt-2">
        {visibleStartups.map((startup) => (
          <Link
            key={startup.id}
            to="/startups"
            className="relative group"
          >
            <div className="w-6 h-6 rounded-full bg-blue-900/40 flex items-center justify-center border-2 border-gray-900 hover:border-blue-500 transition-colors">
              <Rocket size={12} className="text-blue-400" />
            </div>
          </Link>
        ))}
        {!isExpanded && startups.length > MAX_VISIBLE_STARTUPS && (
          <button
            onClick={() => setExpandedChallenge(challengeId)}
            className="w-6 h-6 rounded-full bg-gray-800/40 flex items-center justify-center border-2 border-gray-900 hover:border-gray-700 transition-colors text-gray-400 hover:text-white text-xs font-medium"
          >
            +{startups.length - MAX_VISIBLE_STARTUPS}
          </button>
        )}
      </div>
    );
  };

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black bg-opacity-50 z-20 ${isOpen ? 'block' : 'hidden'}`}
        onClick={toggleSidebar}
      />

      <div 
        className={`fixed inset-y-0 left-0 flex flex-col w-64 bg-[#1a1b2e] text-gray-300 z-30 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <img 
            src="https://genoi.net/wp-content/uploads/2024/12/Logo-gen.OI-Novo-1-2048x1035.png" 
            alt="Genie Logo" 
            className="h-16"
          />
          <button
            onClick={toggleSidebar}
            className={`w-12 h-12 flex items-center justify-center text-gray-300 hover:text-white focus:outline-none bg-gray-800 hover:bg-gray-700 rounded-xl border-2 border-gray-700 hover:border-gray-600 transition-all ${
              pulseCount < 5 ? 'animate-[pulse_3s_cubic-bezier(0.4,0,0.6,1)_infinite]' : ''
            }`}
          >
            <X size={28} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar">
          <div className="p-3">
            <Link 
              to="/new-challenge"
              className="w-full flex items-center gap-3 text-lg font-bold bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white p-4 rounded-lg transition-all shadow-lg hover:shadow-xl"
            >
              <Plus size={20} />
              <span>Novo desafio</span>
            </Link>
          </div>

          <nav className="px-3">
            <div className="space-y-1">
              {challenges.map((challenge) => {
                const isActive = currentChallengeId === challenge.id;
                const formattedDate = format(new Date(challenge.createdAt), "dd/MM/yy", { locale: ptBR });
                const startups = challengeStartups[challenge.id] || [];
                
                return (
                  <div key={challenge.id} className="space-y-2">
                    <button
                      onClick={() => onSelectChallenge(challenge.id)}
                      className={`w-full flex flex-col gap-1 text-base p-3 rounded-lg transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-blue-900/40 to-purple-900/40 text-white shadow-md'
                          : 'text-gray-400 hover:bg-gray-900 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isActive ? (
                          <FolderOpen size={18} className="text-blue-400" />
                        ) : (
                          <FolderClosed size={18} className="text-gray-500" />
                        )}
                        <span className="truncate text-left flex-1 font-medium">{challenge.title}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 pl-6">
                        <span>{formattedDate}</span>
                      </div>
                    </button>
                    {startups.length > 0 && renderStartupIcons(challenge.id, startups)}
                  </div>
                );
              })}
            </div>
          </nav>
        </div>

        <div className="p-4 border-t border-gray-800">
          <div className="flex justify-between items-center">
            <Link to="/profile">
              <UserProfile hideText={false} />
            </Link>
            <button
              onClick={handleLogout}
              className="text-base font-medium text-gray-400 hover:text-white transition-colors"
            >
              Sair
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;