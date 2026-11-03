import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail 
} from 'firebase/auth';
import { auth } from '../firebase';

const ALLOWED_EMAILS = ['jas60523@gmail.com', 'yoshiki840417@gmail.com'];

interface LoginProps {
  onLoginSuccess: () => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [step, setStep] = useState<'email' | 'password'>('email');
  const [error, setError] = useState('');
  const [resetSuccessMsg, setResetSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCheckEmail = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResetSuccessMsg('');
    
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError('請輸入電子郵件');
      return;
    }
    
    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      setError('請輸入正確的電子郵件格式');
      return;
    }

    if (!ALLOWED_EMAILS.includes(normalizedEmail)) {
      setError('此帳號不在允許名單內');
      return;
    }

    setStep('password');
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResetSuccessMsg('');

    if (!password) {
      setError('請輸入密碼');
      return;
    }

    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      if (isSignUp) {
        if (password !== confirmPassword) {
          setError('確認密碼不一致');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('密碼長度至少需要 6 位');
          setLoading(false);
          return;
        }
        
        try {
          await createUserWithEmailAndPassword(auth, normalizedEmail, password);
          onLoginSuccess();
          return;
        } catch (createErr: any) {
          // If the email already exists in Auth, seamlessly try signing in
          if (createErr.code === 'auth/email-already-in-use') {
            try {
              await signInWithEmailAndPassword(auth, normalizedEmail, password);
              onLoginSuccess();
              return;
            } catch {
              setIsSignUp(false);
              setError('此帳號先前已設定過密碼。若忘記密碼，請點擊下方「忘記密碼」重設。');
              setLoading(false);
              return;
            }
          }
          throw createErr;
        }
      } else {
        // Standard Sign In
        try {
          await signInWithEmailAndPassword(auth, normalizedEmail, password);
          onLoginSuccess();
          return;
        } catch (signInErr: any) {
          if (signInErr.code === 'auth/user-not-found') {
            // User doesn't exist yet in Auth, switch to first-time setup
            setIsSignUp(true);
            setError('此帳號尚未設定登入密碼，請於下方設定專屬密碼');
            setLoading(false);
            return;
          } else if (
            signInErr.code === 'auth/wrong-password' || 
            signInErr.code === 'auth/invalid-credential'
          ) {
            setError('密碼錯誤，請重新輸入。若忘記密碼，可點擊下方「忘記密碼」重設。');
            setLoading(false);
            return;
          }
          throw signInErr;
        }
      }
    } catch (err: any) {
      setError(err.message || '登入失敗，請檢查帳號密碼');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError('請先輸入電子郵件');
      return;
    }
    setLoading(true);
    setError('');
    setResetSuccessMsg('');

    try {
      await sendPasswordResetEmail(auth, normalizedEmail);
      setResetSuccessMsg(`已寄送密碼重設信件至 ${normalizedEmail}，請查看信箱完成重設後再進行登入。`);
    } catch (err: any) {
      setError('寄送密碼重設信失敗，請確認網路連線或稍後再試。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-400/10 blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-400/10 blur-[100px]" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white/80 backdrop-blur-xl border border-white/50 shadow-2xl rounded-3xl p-8 relative z-10"
      >
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl shadow-lg shadow-cyan-500/30 flex items-center justify-center text-4xl mx-auto mb-4">
            🏋️‍♂️
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Jason Huang 課程系統</h1>
          <p className="text-slate-500 mt-2 text-sm">
            {step === 'email' ? '請登入以繼續使用' : (isSignUp ? '設定您的專屬密碼' : '請輸入密碼以登入')}
          </p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-2xl text-xs sm:text-sm mb-6 flex items-start shadow-sm"
          >
            <div className="w-5 h-5 bg-red-100 text-red-600 rounded-md flex items-center justify-center mr-2.5 text-xs font-bold shrink-0 mt-0.5">
              !
            </div>
            <div className="leading-relaxed">{error}</div>
          </motion.div>
        )}

        {resetSuccessMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-2xl text-xs sm:text-sm mb-6 flex items-start shadow-sm"
          >
            <div className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-md flex items-center justify-center mr-2.5 text-xs font-bold shrink-0 mt-0.5">
              ✓
            </div>
            <div className="leading-relaxed">{resetSuccessMsg}</div>
          </motion.div>
        )}

        {step === 'email' ? (
          <form onSubmit={handleCheckEmail} noValidate className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">電子郵件</label>
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all shadow-sm"
                placeholder="your@email.com"
                autoFocus
              />
            </div>
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-cyan-500 text-white font-bold rounded-xl py-4 active:scale-95 transition-all shadow-lg shadow-cyan-500/30 hover:bg-cyan-400 disabled:opacity-50 flex items-center justify-center cursor-pointer"
            >
              下一步
            </button>
          </form>
        ) : (
          <form onSubmit={handleAuth} noValidate className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600 truncate mr-2">{email}</span>
              <button 
                type="button" 
                onClick={() => { setStep('email'); setError(''); setResetSuccessMsg(''); }}
                className="text-xs text-cyan-600 font-bold hover:underline shrink-0 cursor-pointer"
              >
                修改帳號
              </button>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {isSignUp ? '設定新密碼' : '密碼'}
              </label>
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all shadow-sm"
                placeholder={isSignUp ? '至少 6 位字元' : '請輸入密碼'}
                autoFocus
              />
            </div>

            {isSignUp && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">確認新密碼</label>
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all shadow-sm"
                  placeholder="請再次輸入密碼"
                />
                <p className="text-[11px] text-slate-400 mt-1.5">這是首次設定密碼，完成後即可以此密碼登入。</p>
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-cyan-500 text-white font-bold rounded-xl py-4 active:scale-95 transition-all shadow-lg shadow-cyan-500/30 hover:bg-cyan-400 disabled:opacity-50 flex items-center justify-center cursor-pointer"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                isSignUp ? '設定密碼並登入' : '登入'
              )}
            </button>

            {/* Helper links: Toggle between login / first-time setup and Forgot Password */}
            <div className="pt-2 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError('');
                  setResetSuccessMsg('');
                }}
                className="text-slate-500 hover:text-cyan-600 font-medium transition-colors cursor-pointer"
              >
                {isSignUp ? '已有密碼？點此登入' : '首次使用？點此設定密碼'}
              </button>

              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-cyan-600 hover:text-cyan-700 font-bold transition-colors cursor-pointer"
              >
                忘記密碼？
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
