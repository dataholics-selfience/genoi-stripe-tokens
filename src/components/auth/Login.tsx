import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebase';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth, 
        email.trim().toLowerCase(), 
        password.trim()
      );
      const user = userCredential.user;

      if (!user) {
        throw new Error('No user data available');
      }

      // Check if email is verified
      if (!user.emailVerified) {
        setError('Por favor, verifique seu email antes de fazer login.');
        await auth.signOut();
        navigate('/verify-email');
        return;
      }

      navigate('/');
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.code === 'auth/invalid-credential') {
        setError('Email ou senha incorretos. Verifique se digitou corretamente, incluindo maiúsculas e minúsculas.');
      } else if (error.code === 'auth/user-disabled') {
        setError('Esta conta foi desativada. Entre em contato com o suporte.');
      } else if (error.code === 'auth/too-many-requests') {
        setError('Muitas tentativas de login. Por favor, tente novamente mais tarde.');
      } else if (error.code === 'auth/network-request-failed') {
        setError('Erro de conexão. Verifique sua internet e tente novamente.');
      } else {
        setError('Erro ao fazer login. Por favor, tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <img src="https://genoi.net/wp-content/uploads/2024/12/Logo-gen.OI-Novo-1-2048x1035.png" alt="Genie Logo" className="mx-auto h-24" />
          <h2 className="mt-6 text-3xl font-bold text-white">Login</h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && <div className="text-red-500 text-center bg-red-900/20 p-3 rounded-md">{error}</div>}
          <div className="space-y-4">
            <div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Email"
              />
            </div>
            <div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Senha"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-4 bg-blue-900 hover:bg-blue-800 rounded-md text-white text-lg font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <Link to="/forgot-password" className="text-sm text-blue-400 hover:text-blue-500">
              Esqueceu a senha?
            </Link>
            <Link to="/register" className="text-lg text-blue-400 hover:text-blue-500 font-medium uppercase">
              CRIAR CONTA
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;