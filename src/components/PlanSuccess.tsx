import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { deleteUser, signOut } from 'firebase/auth';
import { auth, db } from '../firebase';

const planSuccessUrls = {
  'w2x6y9z4a7b1c5d8e3f2g4h': 'mestre-yoda',
  'j8k2m9n4p5q7r3s6t1v8w2x': 'jedi',
  'h5g9f3d7c1b4n8m2k6l9p4q': 'mestre-jedi'
};

const PlanSuccess = () => {
  const { planId } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const handlePlanSuccess = async () => {
      if (!auth.currentUser) {
        navigate('/login');
        return;
      }

      try {
        // Check if planId is valid
        const actualPlanId = planSuccessUrls[planId as keyof typeof planSuccessUrls];
        if (!actualPlanId) {
          setError('URL de sucesso inválida');
          return;
        }

        // Check if user has already hired this plan
        const planHiredRef = doc(db, 'planHired', auth.currentUser.uid);
        const planHiredDoc = await getDoc(planHiredRef);

        if (planHiredDoc.exists()) {
          // User has already hired a plan - handle potential fraud
          const userData = await getDoc(doc(db, 'users', auth.currentUser.uid));
          
          // Create fraud record
          await setDoc(doc(collection(db, 'potentialFraud'), auth.currentUser.uid), {
            uid: auth.currentUser.uid,
            email: auth.currentUser.email,
            planId: actualPlanId,
            previousPlan: planHiredDoc.data().planId,
            userData: userData.data(),
            detectedAt: new Date().toISOString()
          });

          // Update planHired status
          await setDoc(planHiredRef, {
            hired: false,
            email: auth.currentUser.email,
            uid: auth.currentUser.uid,
            updatedAt: new Date().toISOString()
          }, { merge: true });

          // Delete user account
          await deleteUser(auth.currentUser);
          navigate('/account-deleted', { 
            state: { email: auth.currentUser.email } 
          });
          return;
        }

        // Record new plan hire
        await setDoc(planHiredRef, {
          hired: true,
          email: auth.currentUser.email,
          uid: auth.currentUser.uid,
          planId: actualPlanId,
          hiredAt: new Date().toISOString()
        });

        // Update user's plan in users collection
        await setDoc(doc(db, 'users', auth.currentUser.uid), {
          plan: actualPlanId.charAt(0).toUpperCase() + actualPlanId.slice(1).replace('-', ' ')
        }, { merge: true });

        // Navigate to home
        navigate('/');
      } catch (error) {
        console.error('Error processing plan success:', error);
        setError('Erro ao processar compra do plano');
      }
    };

    handlePlanSuccess();
  }, [planId, navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-red-900/50 text-red-200 p-4 rounded-md">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="text-white">Processando sua compra...</div>
      </div>
    </div>
  );
};

export default PlanSuccess;