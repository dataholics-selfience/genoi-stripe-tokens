import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TokenUsageChartProps {
  totalTokens: number;
  usedTokens: number;
}

const plans = [
  { name: 'Padawan', tokens: 100, stripeLink: '' },
  { name: 'Jedi', tokens: 1000, stripeLink: 'https://buy.stripe.com/28o02b9gT77u1XO14r' },
  { name: 'Mestre Jedi', tokens: 3000, stripeLink: 'https://buy.stripe.com/5kA3en0Kn3Vi7i8eVg' },
  { name: 'Mestre Yoda', tokens: 11000, stripeLink: 'https://buy.stripe.com/bIY2ajgJlajGdGw28t' }
];

const TokenUsageChart = ({ totalTokens, usedTokens }: TokenUsageChartProps) => {
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [renewalDate, setRenewalDate] = useState<Date | null>(null);
  const percentage = Math.min((usedTokens / totalTokens) * 100, 100);
  const remainingTokens = totalTokens - usedTokens;

  useEffect(() => {
    const fetchUserData = async () => {
      if (!auth.currentUser) return;
      
      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          setCurrentPlan(userDoc.data().plan);
        }

        const tokenDoc = await getDoc(doc(db, 'tokenUsage', auth.currentUser.uid));
        if (tokenDoc.exists()) {
          const lastUpdated = new Date(tokenDoc.data().lastUpdated);
          setRenewalDate(addDays(lastUpdated, 30));
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, []);

  const getNextPlan = () => {
    if (!currentPlan) return null;
    const currentPlanIndex = plans.findIndex(p => 
      p.name.toLowerCase() === currentPlan.toLowerCase().replace(' ', '-')
    );
    return plans[currentPlanIndex + 1] || null;
  };

  const nextPlan = getNextPlan();
  const formattedRenewalDate = renewalDate 
    ? format(renewalDate, "dd 'de' MMMM", { locale: ptBR })
    : null;

  return (
    <div className="relative pt-1">
      <div className="overflow-hidden h-2 text-xs flex rounded-full bg-gray-700">
        <div
          style={{ width: `${percentage}%` }}
          className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center transition-all bg-blue-900"
        />
      </div>
      <div className="mt-4 text-center">
        <div className="text-sm text-gray-400">
          {remainingTokens} tokens restantes
          {currentPlan === 'Mestre Yoda' ? (
            <a
              href={plans[3].stripeLink}
              className="text-blue-400 hover:text-blue-300 ml-2 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              Renove agora seu plano Mestre Yoda
            </a>
          ) : nextPlan && (
            <a
              href={nextPlan.stripeLink}
              className="text-blue-400 hover:text-blue-300 ml-2 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              Contrate mais {nextPlan.tokens} tokens
            </a>
          )}
        </div>
        {formattedRenewalDate && (
          <div className="mt-2 text-sm text-gray-500">
            Franquia será renovada em {formattedRenewalDate}
          </div>
        )}
      </div>
    </div>
  );
};

export default TokenUsageChart;