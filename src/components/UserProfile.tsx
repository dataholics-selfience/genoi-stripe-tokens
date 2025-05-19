import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserType, TokenUsageType } from '../types';

interface UserProfileProps {
  hideText?: boolean;
}

const UserProfile = ({ hideText = false }: UserProfileProps) => {
  const [userData, setUserData] = useState<UserType | null>(null);
  const [tokenUsage, setTokenUsage] = useState<TokenUsageType | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!auth.currentUser) return;
      
      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data() as UserType);
        }

        const tokenDoc = await getDoc(doc(db, 'tokenUsage', auth.currentUser.uid));
        if (tokenDoc.exists()) {
          setTokenUsage(tokenDoc.data() as TokenUsageType);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, []);

  if (!userData) return null;

  const initials = userData.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex items-center space-x-3">
      <div className="w-9 h-9 rounded-full bg-blue-900 flex items-center justify-center text-white font-semibold shadow-lg hover:bg-blue-800 transition-colors cursor-pointer">
        {initials}
      </div>
      {!hideText && (
        <div>
          <div className="text-sm font-medium">{userData.name.split(' ')[0]}</div>
          <div className="text-xs">
            <span className="text-gray-400">{userData.plan || 'Padawan'}</span>
            {tokenUsage && (
              <span className="text-blue-400 ml-2">
                {tokenUsage.totalTokens - tokenUsage.usedTokens} tokens
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;