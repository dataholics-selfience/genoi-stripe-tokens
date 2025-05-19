import { useState, useEffect } from 'react';
import { Brain, Rocket, Search, Code, ListChecks } from 'lucide-react';

const loadingStates = [
  {
    icon: Brain,
    text: 'Trabalhando desafio com base de milhares de startups'
  },
  {
    icon: ListChecks,
    text: 'Fazendo um short list das melhores startups pro desafio'
  },
  {
    icon: Search,
    text: 'Realizando uma pesquisa de mercado a respeito do desafio'
  },
  {
    icon: Code,
    text: 'Programando as POCs com as Startups'
  },
  {
    icon: Rocket,
    text: 'Finalizando a lista de melhores startups'
  }
];

export const LoadingStates = () => {
  const [currentState, setCurrentState] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentState((prev) => (prev + 1) % loadingStates.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const CurrentIcon = loadingStates[currentState].icon;

  return (
    <div className="flex items-center gap-3 text-blue-400 animate-pulse">
      <CurrentIcon className="w-6 h-6" />
      <span>{loadingStates[currentState].text}</span>
    </div>
  );
};