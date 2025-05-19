import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
import Layout from './components/Layout';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import ForgotPassword from './components/auth/ForgotPassword';
import UserManagement from './components/UserProfile/UserManagement';
import NewChallenge from './components/NewChallenge';
import Plans from './components/Plans';
import EmailVerification from './components/auth/EmailVerification';
import AccountDeleted from './components/AccountDeleted';
import StartupList from './components/StartupList';
import PlanSuccess from './components/PlanSuccess';

function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Check if user is disabled in Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists() && userDoc.data().disabled) {
            await signOut(auth);
            setUser(null);
          } else {
            setUser(user);
          }
        } catch (error) {
          console.error('Error checking user status:', error);
          setUser(user);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="h-screen bg-black flex items-center justify-center">
      <div className="text-white">Carregando...</div>
    </div>;
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />
        <Route path="/forgot-password" element={!user ? <ForgotPassword /> : <Navigate to="/" />} />
        <Route path="/verify-email" element={<EmailVerification />} />
        <Route path="/profile" element={user?.emailVerified ? <UserManagement /> : <Navigate to="/verify-email" />} />
        <Route path="/new-challenge" element={user?.emailVerified ? <NewChallenge /> : <Navigate to="/verify-email" />} />
        <Route path="/plans" element={<Plans />} />
        <Route path="/startups" element={user?.emailVerified ? <StartupList /> : <Navigate to="/verify-email" />} />
        <Route path="/account-deleted" element={<AccountDeleted />} />
        <Route path="/success/:planId" element={<PlanSuccess />} />
        <Route path="/" element={user?.emailVerified ? <Layout /> : <Navigate to="/verify-email" />} />
      </Routes>
    </Router>
  );
}

export default App