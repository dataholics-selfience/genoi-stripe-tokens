import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Baby, Swords, SwordIcon, Sparkles, ArrowLeft } from 'lucide-react';
import { auth } from '../config/firebase';

const plans = [
  {
    id: 'padawan',
    name: 'Padawan',
    icon: Baby,
    description: 'Plano para iniciantes que estão começando no caminho da inovação',
    tokens: 100,
    price: 0,
    highlight: false,
    stripeLink: ''
  },
  {
    id: 'jedi',
    name: 'Jedi',
    icon: SwordIcon,
    description: 'Plano para o guerreiro que está aprendendo as artes da inovação por IA',
    tokens: 1000,
    price: 600,
    highlight: true,
    stripeLink: import.meta.env.VITE_PLAN_JEDI_URL
  },
  {
    id: 'mestre-jedi',
    name: 'Mestre Jedi',
    icon: Swords,
    description: 'Plano para o Jedi que se superou, e agora pode derrotar as forças da inércia inovativa',
    tokens: 3000,
    price: 1800,
    highlight: false,
    stripeLink: import.meta.env.VITE_PLAN_MESTRE_JEDI_URL
  },
  {
    id: 'mestre-yoda',
    name: 'Mestre Yoda',
    icon: Sparkles,
    description: 'Plano para o inovador que enfrentou batalhas e está preparado para defender as forças da disrupção',
    tokens: 11000,
    price: 6000,
    highlight: false,
    stripeLink: import.meta.env.VITE_PLAN_MESTRE_YODA_URL
  }
];

const Plans = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');

  const handleSelectPlan = async (planId: string) => {
    try {
      if (!auth.currentUser) {
        navigate('/login');
        return;
      }

      const selectedPlan = plans.find(p => p.id === planId);
      if (!selectedPlan) return;

      if (planId === 'padawan') {
        setError('O plano Padawan é o plano inicial e não pode ser contratado. Por favor, escolha outro plano.');
        return;
      }

      // Only redirect to Stripe checkout
      if (selectedPlan.stripeLink) {
        window.location.href = selectedPlan.stripeLink;
      }
    } catch (error) {
      setError('Erro ao selecionar plano. Tente novamente.');
    }
  };

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center mb-12">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-300 hover:text-white mr-4"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="text-center flex-1">
            <h1 className="text-4xl font-bold text-white mb-4">Escolha seu plano</h1>
            <p className="text-gray-400 text-lg">Desbloqueie o poder da inovação com nossos planos personalizados</p>
          </div>
          <div className="w-8" />
        </div>

        {error && (
          <div className="text-red-500 text-center mb-4">{error}</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const isPadawan = plan.id === 'padawan';
            return (
              <div
                key={plan.id}
                className={`relative bg-gray-800 rounded-xl p-6 ${
                  plan.highlight ? 'ring-2 ring-blue-500 transform hover:scale-105' : 'hover:bg-gray-700'
                } transition-all duration-300`}
              >
                {plan.highlight && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-4 py-1 rounded-full text-sm">
                    Mais popular
                  </div>
                )}
                
                <div className="flex justify-center mb-6">
                  <div className="p-3 bg-blue-900 rounded-full">
                    <Icon size={32} className="text-white" />
                  </div>
                </div>

                <h3 className="text-xl font-bold text-white text-center mb-4">{plan.name}</h3>
                <p className="text-gray-400 text-center mb-6 h-24">{plan.description}</p>
                
                <div className="text-center mb-6">
                  <div className="text-3xl font-bold text-white mb-2">
                    {plan.price === 0 ? 'Grátis' : `R$ ${plan.price}`}
                  </div>
                  <div className="text-blue-400">{plan.tokens} tokens</div>
                </div>

                <button
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={isPadawan}
                  className={`block w-full py-3 px-4 rounded-lg text-white text-center font-bold transition-colors flex items-center justify-center gap-2 ${
                    isPadawan 
                      ? 'bg-gray-600 cursor-not-allowed opacity-50' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  <SwordIcon size={20} />
                  <span>{isPadawan ? 'Plano inicial' : 'Começar agora'}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Plans;