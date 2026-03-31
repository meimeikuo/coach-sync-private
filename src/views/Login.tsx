import React, { useState } from 'react';
import { motion } from 'motion/react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, fetchSignInMethodsForEmail } from 'firebase/auth';
import { auth } from '../firebase';

const ALLOWED_EMAILS = ['jas60523@gmail.com', 'yoshiki840417@gmail.com'];

interface LoginProps {
  onLoginSuccess: () => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [step, setStep] = useState<'email' | 'password'>('email');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCheckEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
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

    setLoading(true);
    try {
      // Check if user exists in Firebase Auth
      const methods = await fetchSignInMethodsForEmail(auth, normalizedEmail);
      if (methods.length === 0) {
        setIsFirstTime(true);
      } else {
        setIsFirstTime(false);
      }
      setStep('password');
    } catch (err: any) {
      console.error('Check email error:', err);
      // Fallback: assume not first time if check fails (e.g. due to security settings)
      setIsFirstTime(false);
      setStep('password');
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password) {
      setError('請輸入密碼');
      return;
    }

    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      if (isFirstTime) {
        if (password !== confirmPassword) {
          throw new Error('密碼不一致');
        }
        if (password.length < 6) {
          throw new Error('密碼長度至少 6 位');
        }
        
        await createUserWithEmailAndPassword(auth, normalizedEmail, password);
      } else {
        await signInWithEmailAndPassword(auth, normalizedEmail, password);
      }
      onLoginSuccess();
    } catch (err: any) {
      console.error('Auth error:', err);
      
      // If email already in use, try signing in instead
      if (err.code === 'auth/email-already-in-use') {
        try {
          await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
          onLoginSuccess();
          return;
        } catch (signInErr: any) {
          setError('密碼錯誤');
          setLoading(false);
          return;
        }
      }

      let message = '登入失敗，請檢查帳號密碼';
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        message = '密碼錯誤';
      } else if (err.code === 'auth/user-not-found') {
        message = '此帳號尚未註冊';
      } else if (err.message) {
        message = err.message;
      }
      setError(message);
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
          <p className="text-slate-500 mt-2">
            {step === 'email' ? '請登入以繼續使用' : (isFirstTime ? '設定您的專屬密碼' : '請輸入密碼')}
          </p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-2xl text-sm mb-6 flex items-center shadow-sm"
          >
            <div className="w-6 h-6 bg-red-100 text-red-600 rounded-lg flex items-center justify-center mr-3 text-xs font-bold">
              !
            </div>
            {error}
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
              />
            </div>
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-cyan-500 text-white font-bold rounded-xl py-4 active:scale-95 transition-all shadow-lg shadow-cyan-500/30 hover:bg-cyan-400 disabled:opacity-50 flex items-center justify-center"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                '下一步'
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleAuth} noValidate className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500">{email}</span>
              <button 
                type="button" 
                onClick={() => setStep('email')}
                className="text-xs text-cyan-600 font-bold hover:underline"
              >
                修改帳號
              </button>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {isFirstTime ? '設定新密碼' : '請輸入密碼'}
              </label>
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all shadow-sm"
              />
            </div>

            {isFirstTime && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">確認新密碼</label>
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all shadow-sm"
                />
                <p className="text-[10px] text-slate-400 mt-2">這是您第一次登入，請設定您的專屬密碼。</p>
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-cyan-500 text-white font-bold rounded-xl py-4 active:scale-95 transition-all shadow-lg shadow-cyan-500/30 hover:bg-cyan-400 disabled:opacity-50 flex items-center justify-center"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                isFirstTime ? '設定密碼並登入' : '登入'
              )}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
