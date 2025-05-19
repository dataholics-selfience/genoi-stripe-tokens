import { useState, useRef, useEffect } from 'react';
import { Menu, SendHorizontal, Rocket, FolderOpen, ChevronDown, ChevronUp, Pencil } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, addDoc, collection, query, where, getDocs, updateDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { MessageType, ChallengeType, StartupListType, TokenUsageType } from '../types';
import { format, addDays, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LoadingStates } from './LoadingStates';
import { API_CONFIG } from '../config/api';

const MESSAGE_TOKEN_COST = 9;
const STARTUP_LIST_TOKEN_COST = 39;
const MAX_VISIBLE_STARTUPS = 3;

const TOKEN_LIMIT_MESSAGES = [
  // ... token limit messages array stays the same
];

interface ChatInterfaceProps {
  messages: MessageType[];
  addMessage: (message: Omit<MessageType, 'id' | 'timestamp'>) => void;
  toggleSidebar: () => void;
  isSidebarOpen: boolean;
  currentChallenge: ChallengeType | undefined;
}

const ChatInterface = ({ messages, addMessage, toggleSidebar, isSidebarOpen, currentChallenge }: ChatInterfaceProps) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userInitials, setUserInitials] = useState('');
  const [userName, setUserName] = useState('');
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [startupLists, setStartupLists] = useState<StartupListType[]>([]);
  const [showAllStartups, setShowAllStartups] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    title: '',
    description: ''
  });
  const [tokenUsage, setTokenUsage] = useState<TokenUsageType | null>(null);
  const [responseDelay, setResponseDelay] = useState<number>(0);
  const responseTimer = useRef<NodeJS.Timeout>();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      if (!auth.currentUser) return;
      
      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        const userData = userDoc.data();
        if (userData?.name) {
          const firstName = userData.name.split(' ')[0];
          setUserName(firstName);
          const initials = userData.name
            .split(' ')
            .map((n: string) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
          setUserInitials(initials);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, []);

  useEffect(() => {
    const fetchTokenUsage = async () => {
      if (!auth.currentUser) return;
      
      try {
        const tokenDoc = await getDoc(doc(db, 'tokenUsage', auth.currentUser.uid));
        if (tokenDoc.exists()) {
          setTokenUsage(tokenDoc.data() as TokenUsageType);
        }
      } catch (error) {
        console.error('Error fetching token usage:', error);
      }
    };

    fetchTokenUsage();
  }, []);

  useEffect(() => {
    if (currentChallenge?.id) {
      const fetchStartupLists = async () => {
        const q = query(
          collection(db, 'startupList'),
          where('challengeId', '==', currentChallenge.id)
        );
        const querySnapshot = await getDocs(q);
        setStartupLists(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StartupListType)));
      };
      fetchStartupLists();
    }
  }, [currentChallenge]);

  useEffect(() => {
    if (currentChallenge) {
      setEditData({
        title: currentChallenge.title,
        description: currentChallenge.description
      });
    }
  }, [currentChallenge]);

  const checkAndUpdateTokens = async (cost: number): Promise<boolean> => {
    if (!auth.currentUser || !tokenUsage) return false;

    const lastUpdated = new Date(tokenUsage.lastUpdated);
    const renewalDate = addDays(lastUpdated, 30);
    
    if (isAfter(new Date(), renewalDate)) {
      await updateDoc(doc(db, 'tokenUsage', auth.currentUser.uid), {
        usedTokens: 0,
        lastUpdated: new Date().toISOString()
      });
      
      setTokenUsage(prev => prev ? {
        ...prev,
        usedTokens: 0,
        lastUpdated: new Date().toISOString()
      } : null);
      
      return true;
    }

    const remainingTokens = tokenUsage.totalTokens - tokenUsage.usedTokens;
    if (remainingTokens < cost) {
      const messageIndex = Math.floor(Math.random() * TOKEN_LIMIT_MESSAGES.length);
      const message = TOKEN_LIMIT_MESSAGES[messageIndex].replace('{plan}', tokenUsage.plan);

      await addMessage({
        role: 'assistant',
        content: `${message}\n\n<upgrade-plan-button>Atualizar Plano</upgrade-plan-button>`
      });
      return false;
    }

    const newUsedTokens = tokenUsage.usedTokens + cost;
    const percentage = (newUsedTokens / tokenUsage.totalTokens) * 100;

    await updateDoc(doc(db, 'tokenUsage', auth.currentUser.uid), {
      usedTokens: newUsedTokens
    });

    setTokenUsage(prev => prev ? {
      ...prev,
      usedTokens: newUsedTokens
    } : null);

    if (percentage >= 70 && percentage < 90) {
      await addMessage({
        role: 'assistant',
        content: `Atenção! Você já utilizou ${percentage.toFixed(0)}% dos seus tokens disponíveis. Considere atualizar seu plano para continuar inovando sem interrupções!\n\n<upgrade-plan-button>Ver Planos</upgrade-plan-button>`
      });
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentChallenge) {
      navigate('/new-challenge');
      return;
    }
    
    if (input.trim() && !isLoading) {
      const hasTokens = await checkAndUpdateTokens(MESSAGE_TOKEN_COST);
      if (!hasTokens) {
        setInput('');
        return;
      }

      const userMessage = input.trim();
      setInput('');
      setIsLoading(true);
      
      // Reset textarea height
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
      }

      // Start response delay timer
      responseTimer.current = setTimeout(() => {
        setResponseDelay(prev => prev + 1);
      }, 3000);
      
      try {
        await addMessage({ role: 'user', content: userMessage });
        
        const response = await fetch(API_CONFIG.webhook.url, {
          method: 'POST',
          headers: API_CONFIG.webhook.headers,
          body: JSON.stringify({
            message: userMessage,
            sessionId: currentChallenge.sessionId,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to send message to webhook');
        }

        const data = await response.json();
        if (data[0]?.output) {
          const output = data[0].output;
          
          const startupCardsMatch = output.match(/<startup cards>([\s\S]*?)<\/startup cards>/);
          
          if (startupCardsMatch) {
            try {
              const startupData = JSON.parse(startupCardsMatch[1]);
              
              if (auth.currentUser) {
                const newStartupList = await addDoc(collection(db, 'startupList'), {
                  userId: auth.currentUser.uid,
                  userEmail: auth.currentUser.email,
                  challengeId: currentChallenge.id,
                  ...startupData,
                  createdAt: new Date().toISOString()
                });

                setStartupLists(prev => [...prev, { id: newStartupList.id, ...startupData }]);
              }

              await addMessage({
                role: 'assistant',
                content: `<startup-button>${JSON.stringify({
                  title: startupData.challengeTitle,
                  createdAt: new Date().toISOString()
                })}</startup-button>`
              });
            } catch (error) {
              console.error('Error processing startup cards:', error);
              await addMessage({ role: 'assistant', content: output });
            }
          } else {
            await addMessage({ role: 'assistant', content: output });
          }
        }
      } catch (error) {
        console.error('Error in chat:', error);
      } finally {
        clearTimeout(responseTimer.current);
        setResponseDelay(0);
        setIsLoading(false);
      }
    }
  };

  const handleEditSubmit = async () => {
    if (!currentChallenge || !auth.currentUser) return;

    try {
      await updateDoc(doc(db, 'challenges', currentChallenge.id), {
        title: editData.title,
        description: editData.description
      });

      const webhookMessage = {
        message: `Genie, tenho uma nova abordagem para o desafio ${editData.title} e parcebi algo novo: ${editData.description}. Analise todo histórico de conversa deste chat e as startups que foram indicadas nos statupList, e faça um questionamento técnico, operacional ou de novas tecnologias, que seja bem pertinente para que eu encontre uma startupList para meu desafio. Faça apenas questionamentos embasados, sem levantar fatos. Seja bem humorada em sua introdução`,
        sessionId: currentChallenge.sessionId
      };

      const response = await fetch(API_CONFIG.webhook.url, {
        method: 'POST',
        headers: API_CONFIG.webhook.headers,
        body: JSON.stringify(webhookMessage),
      });

      if (!response.ok) {
        throw new Error('Failed to send update to webhook');
      }

      const data = await response.json();
      if (data[0]?.output) {
        await addMessage({ 
          role: 'assistant', 
          content: data[0].output 
        });
      }

      setIsEditing(false);
    } catch (error) {
      console.error('Error updating challenge:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInputClick = () => {
    if (!currentChallenge) {
      navigate('/new-challenge');
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const target = e.target;
    setInput(target.value);
    target.style.height = 'auto';
    target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const renderMessage = (message: MessageType) => {
    if (message.content.includes('<upgrade-plan-button>')) {
      return (
        <div className="space-y-4">
          <p>{message.content.split('<upgrade-plan-button>')[0]}</p>
          <Link
            to="/plans"
            className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-bold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
          >
            Atualizar Plano
          </Link>
        </div>
      );
    }

    if (message.content.startsWith('<startup-button>')) {
      try {
        const buttonData = JSON.parse(message.content.replace('<startup-button>', '').replace('</startup-button>', ''));
        const formattedDate = format(new Date(buttonData.createdAt), "d 'de' MMMM 'de' yyyy", { locale: ptBR });
        
        return (
          <div className="flex justify-center w-full">
            <button
              onClick={() => navigate('/startups')}
              className="w-[90%] bg-gradient-to-r from-blue-900 to-purple-900 hover:from-blue-800 hover:to-purple-800 text-white rounded-lg p-4 flex items-center gap-3 transition-colors"
            >
              <Rocket className="text-blue-400" size={24} />
              <div className="flex-1 text-left">
                <h3 className="font-medium">{buttonData.title}</h3>
                <p className="text-sm text-gray-300">{formattedDate}</p>
              </div>
            </button>
          </div>
        );
      } catch (error) {
        console.error('Error parsing startup button data:', error);
        return <p className="text-red-500">Error displaying message</p>;
      }
    }

    return <p className="whitespace-pre-wrap">{message.content}</p>;
  };

  const visibleMessages = messages.filter(message => !message.hidden);

  return (
    <div className="flex flex-col flex-1 h-full overflow-hidden bg-black">
      <div className="flex flex-col p-3 border-b border-border">
        <div className="flex items-center justify-between">
          <button 
            onClick={toggleSidebar}
            className="w-menu-button h-menu-button flex items-center justify-center text-gray-300 hover:text-white focus:outline-none bg-gray-800 rounded-lg border-2 border-gray-700 hover:border-gray-600 transition-all duration-300 animate-pulse-slow"
          >
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-2 flex-1 ml-4">
            <FolderOpen size={20} className="text-gray-400" />
            {isEditing ? (
              <input
                type="text"
                value={editData.title}
                onChange={(e) => setEditData(prev => ({ ...prev, title: e.target.value }))}
                className="bg-gray-800 text-white px-2 py-1 rounded flex-1"
              />
            ) : (
              <h2 className="text-lg font-medium">{currentChallenge?.title}</h2>
            )}
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="text-gray-400 hover:text-white"
              >
                <Pencil size={16} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {startupLists.slice(0, showAllStartups ? undefined : MAX_VISIBLE_STARTUPS).map((list) => (
                <Link
                  key={list.id}
                  to="/startups"
                  className="relative group"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-900 flex items-center justify-center border-2 border-black hover:border-blue-500 transition-colors">
                    <Rocket size={16} className="text-blue-400" />
                  </div>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-xs text-white rounded opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity">
                    Ver startups
                  </div>
                </Link>
              ))}
              {!showAllStartups && startupLists.length > MAX_VISIBLE_STARTUPS && (
                <button
                  onClick={() => setShowAllStartups(true)}
                  className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center border-2 border-black hover:border-gray-700 transition-colors text-gray-400 hover:text-white text-xs font-medium"
                >
                  +{startupLists.length - MAX_VISIBLE_STARTUPS}
                </button>
              )}
            </div>
            <span className="text-gray-500">•</span>
            <span className="text-sm text-gray-400">
              {currentChallenge && format(new Date(currentChallenge.createdAt), "dd/MM/yyyy", { locale: ptBR })}
            </span>
          </div>
        </div>
        {currentChallenge && (
          <div className="text-gray-400 text-sm mt-2">
            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={editData.description}
                  onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-gray-800 text-white px-2 py-1 rounded resize-none"
                  rows={3}
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1 text-sm text-gray-300 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleEditSubmit}
                    className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className={`${isDescriptionExpanded ? '' : 'line-clamp-2'}`}>
                  {currentChallenge.description}
                </p>
                {currentChallenge.description.length > 150 && (
                  <button
                    onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                    className="text-blue-400 hover:text-blue-300 mt-1 flex items-center gap-1"
                  >
                    {isDescriptionExpanded ? (
                      <>
                        <ChevronUp size={16} />
                        <span>Ver menos</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown size={16} />
                        <span>Ler mais</span>
                      </>
                    )}
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar">
        {visibleMessages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-3xl rounded-lg p-4 ${
                message.role === 'user'
                  ? 'bg-blue-900 text-white ml-8'
                  : 'bg-gray-800 text-gray-100 mr-8'
              }`}
            >
              {message.role === 'assistant' ? (
                <div className="flex items-center mb-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-semibold mr-2">
                    AI
                  </div>
                  <span className="font-medium">Genie</span>
                </div>
              ) : (
                <div className="flex items-center mb-2 justify-end">
                  <span className="font-medium mr-2">{userName}</span>
                  <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs font-semibold">
                    {userInitials}
                  </div>
                </div>
              )}
              {renderMessage(message)}
            </div>
          </div>
        ))}
        {isLoading && responseDelay > 0 && (
          <div className="flex justify-start">
            <div className="max-w-3xl rounded-lg p-4 bg-gray-800 text-gray-100 mr-8">
              <LoadingStates />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-border p-4">
        <form onSubmit={handleSubmit} className="relative max-w-3xl mx-auto">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            onClick={handleInputClick}
            placeholder={currentChallenge ? "Digite uma mensagem..." : "Selecione um desafio para começar"}
            className="w-full py-3 pl-4 pr-12 bg-gray-800 border border-gray-700 rounded-lg resize-none overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-500 max-h-[200px] text-gray-100"
            rows={1}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className={`absolute right-2 bottom-2.5 p-1.5 rounded-md ${
              input.trim() && !isLoading ? 'text-blue-500 hover:bg-gray-700' : 'text-gray-500'
            } transition-colors`}
          >
            <SendHorizontal size={20} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;