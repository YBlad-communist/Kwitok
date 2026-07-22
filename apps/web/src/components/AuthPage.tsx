import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AuthPage() {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4" style={{ background: '#14211E' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: '36px', color: '#EFE9D8' }}>Квиток</h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(239,233,216,0.5)' }}>трекер подписок</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-sm p-6" style={{ background: '#EFE9D8' }}>
          <h2 className="text-lg font-semibold mb-4" style={{ color: '#14211E', fontFamily: "'Fraunces', serif" }}>
            {isLogin ? 'Вход' : 'Регистрация'}
          </h2>

          {error && (
            <div className="text-sm mb-4 px-3 py-2 rounded-sm" style={{ background: 'rgba(181,68,46,0.15)', color: '#B5442E' }}>
              {error}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="text-xs uppercase tracking-wide opacity-60 block mb-1" style={{ color: '#14211E' }}>Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
                placeholder="you@example.com"
                className="w-full px-3 py-2 rounded-sm outline-none text-sm"
                style={{ background: '#E4DCC6', border: '1px solid rgba(20,33,30,0.15)', color: '#14211E' }}
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide opacity-60 block mb-1" style={{ color: '#14211E' }}>Пароль</label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                required
                minLength={6}
                placeholder="минимум 6 символов"
                className="w-full px-3 py-2 rounded-sm outline-none text-sm"
                style={{ background: '#E4DCC6', border: '1px solid rgba(20,33,30,0.15)', color: '#14211E' }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full mt-4 py-2.5 rounded-sm text-sm font-medium transition-transform hover:scale-[1.02] disabled:opacity-40"
            style={{ background: '#C9A227', color: '#14211E' }}
          >
            {busy ? 'Загрузка...' : isLogin ? 'Войти' : 'Создать аккаунт'}
          </button>

          <p className="text-xs text-center mt-4" style={{ color: 'rgba(20,33,30,0.5)' }}>
            {isLogin ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}{' '}
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className="underline hover:no-underline"
              style={{ color: '#14211E' }}
            >
              {isLogin ? 'Зарегистрироваться' : 'Войти'}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
