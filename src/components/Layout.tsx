import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, where } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import Sidebar from './Sidebar';
import ChatInterface from './ChatInterface';
import { MessageType, ChallengeType } from '../types';

const welcomeMessages = [
  "Olá. Eu sou a Genie, sua agente de inovação aberta turbinada por IA! Crie agora um novo desafio e irei pesquisar em uma base de milhares de startups globais!",
  "Oi. Sou Genie, sua gênia IA do mundo da inovação! Vim aqui te conectar com milhares de startups. Descreva agora seu desafio!",
  "Bem-vindo! Sou a Genie, sua parceira em inovação. Vamos explorar juntos o universo das startups mais inovadoras do mundo?",
  "Olá! Como sua assistente de inovação, estou aqui para ajudar você a encontrar as melhores startups para seu desafio. Vamos começar?",
  "Oi! Sou Genie, sua guia no ecossistema global de startups. Pronta para transformar seu desafio em oportunidades!",
  "Prazer em conhecê-lo! Sou a Genie, especialista em conectar desafios corporativos com soluções inovadoras. Vamos criar seu primeiro desafio?",
  "Olá! Como sua consultora de inovação digital, estou aqui para ajudar você a descobrir startups incríveis. Vamos começar?",
  "Bem-vindo ao futuro da inovação! Sou a Genie, e vou ajudar você a encontrar as startups mais promissoras para seu negócio.",
  "Oi! Sou sua parceira Genie, especializada em matchmaking entre empresas e startups. Pronta para começar essa jornada?",
  "Olá! Como sua mentora em inovação aberta, estou aqui para guiar você pelo ecossistema global de startups. Vamos criar seu desafio?",
  "Bem-vindo! Sou a Genie, sua conexão com o mundo das startups. Vamos transformar seus desafios em oportunidades de inovação?",
  "Oi! Como sua consultora Genie, estou aqui para ajudar você a navegar pelo universo das startups. Pronta para começar?",
  "Olá! Sou a Genie, sua especialista em inovação. Vamos descobrir juntos as startups que podem revolucionar seu negócio?",
  "Bem-vindo ao hub de inovação! Sou a Genie, e estou aqui para conectar você com as startups mais disruptivas do mercado."
];

const Layout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [challenges, setChallenges] = useState<ChallengeType[]>([]);
  const [currentChallengeId, setCurrentChallengeId] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    const challengesQuery = query(
      collection(db, 'challenges'),
      where('userId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeChallenges = onSnapshot(challengesQuery, (snapshot) => {
      const newChallenges = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChallengeType[];
      setChallenges(newChallenges);

      if (newChallenges.length === 0) {
        const randomMessage = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: randomMessage,
          timestamp: new Date().toISOString()
        }]);
      } else if (!currentChallengeId) {
        setCurrentChallengeId(newChallenges[0].id);
      }
    });

    return () => unsubscribeChallenges();
  }, []);

  useEffect(() => {
    if (!auth.currentUser || !currentChallengeId) return;

    const q = query(
      collection(db, 'messages'),
      where('challengeId', '==', currentChallengeId),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MessageType[];
      setMessages(newMessages);
    });

    return () => unsubscribe();
  }, [currentChallengeId]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const addMessage = async (message: Omit<MessageType, 'id' | 'timestamp'>) => {
    if (!auth.currentUser || !currentChallengeId) {
      navigate('/new-challenge');
      return;
    }

    const currentChallenge = challenges.find(c => c.id === currentChallengeId);
    if (!currentChallenge) return;

    const newMessage = {
      ...message,
      timestamp: new Date().toISOString(),
      userId: auth.currentUser.uid,
      challengeId: currentChallengeId
    };

    await addDoc(collection(db, 'messages'), newMessage);
  };

  const selectChallenge = (challengeId: string) => {
    setCurrentChallengeId(challengeId);
    setIsSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-black text-gray-100">
      <Sidebar 
        isOpen={isSidebarOpen} 
        toggleSidebar={toggleSidebar}
        challenges={challenges}
        currentChallengeId={currentChallengeId}
        onSelectChallenge={selectChallenge}
      />
      <ChatInterface 
        messages={messages} 
        addMessage={addMessage} 
        toggleSidebar={toggleSidebar}
        isSidebarOpen={isSidebarOpen}
        currentChallenge={challenges.find(c => c.id === currentChallengeId)}
      />
    </div>
  );
};

export default Layout;