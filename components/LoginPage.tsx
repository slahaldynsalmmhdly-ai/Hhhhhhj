
import React, { useState } from 'react';
import { API_BASE_URL } from '../constants';
import { Lock, Mail, ArrowLeft, X, User, Building2, ChevronRight, Check, ArrowRight, Globe } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface LoginPageProps {
  onLoginSuccess: (token: string) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const { t, language, setLanguage } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Registration State
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [registerStep, setRegisterStep] = useState<'type' | 'form'>('type');
  const [registerType, setRegisterType] = useState<'individual' | 'company'>('individual');
  
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');
  const [regConfirmPass, setRegConfirmPass] = useState('');
  const [agreedToPolicy, setAgreedToPolicy] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.token) {
        setTimeout(() => {
            localStorage.setItem('token', data.token);
            const userObj = data.user || {};
            const userId = userObj._id || userObj.id || data.userId || data.id;
            
            if (userId) {
              localStorage.setItem('userId', userId);
              localStorage.setItem('userName', userObj.name || 'مستخدم');
              localStorage.setItem('userEmail', userObj.email || '');
              localStorage.setItem('userAvatar', userObj.avatar || '');
              localStorage.setItem('username', userObj.username || '');
            }
            onLoginSuccess(data.token);
        }, 1000);
      } else {
        setError(data.message || 'Login failed. Please check credentials.');
        setIsLoading(false);
      }
    } catch (err) {
      setError('Connection error.');
      setIsLoading(false);
    }
  };

  const handleRegisterTypeSelect = (type: 'individual' | 'company') => {
    setRegisterType(type);
    setRegisterStep('form');
  };

  const handleRegisterSubmit = async () => {
    if (!regName || !regEmail || !regPass || !regConfirmPass) {
        alert("Please fill all fields");
        return;
    }
    if (regPass !== regConfirmPass) {
        alert("Passwords do not match");
        return;
    }
    if (!agreedToPolicy) {
        alert("You must agree to privacy policy");
        return;
    }

    setIsRegistering(true);
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: regName,
                email: regEmail,
                password: regPass,
                userType: registerType // 'individual' or 'company'
            })
        });

        const data = await response.json();

        if (response.ok && data.token) {
            // Auto Login Logic
            localStorage.setItem('token', data.token);
            const userObj = data.user || {};
            const userId = userObj._id || userObj.id;
            if (userId) {
                localStorage.setItem('userId', userId);
                localStorage.setItem('userName', userObj.name || regName);
                localStorage.setItem('userEmail', userObj.email || regEmail);
            }
            onLoginSuccess(data.token);
        } else {
            alert(data.message || "Registration failed");
        }
    } catch (e) {
        alert("Connection error");
    } finally {
        setIsRegistering(false);
    }
  };

  const getPlaceholderName = () => {
      switch(registerType) {
          case 'company': return t('register_company_name_placeholder');
          default: return t('register_name_placeholder');
      }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 relative">
      
      {/* Language Toggle Button */}
      <div className={`absolute top-6 z-10 ${language === 'ar' ? 'left-6' : 'right-6'}`}>
        <button 
            onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
            className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold py-2 px-4 rounded-full transition-all shadow-sm border border-gray-100"
        >
            {language === 'ar' ? (
                <>
                    <span className="text-sm">English</span>
                    <ArrowLeft size={16} />
                </>
            ) : (
                <>
                    <span className="text-sm">العربية</span>
                    <ArrowRight size={16} />
                </>
            )}
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-[4px] border-gray-100"></div>
              <div className="absolute inset-0 rounded-full border-[4px] border-t-blue-600 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
            </div>
            <p className="mt-6 text-gray-800 font-bold text-sm">{t('logging_in')}</p>
        </div>
      ) : (
        <div className="w-full max-w-sm animate-in fade-in duration-500">
          
          <div className="text-center mb-12">
            <h1 className="text-3xl font-black text-gray-900 mb-2">{t('login_title')}</h1>
            <p className="text-gray-500 text-sm font-medium">{t('login_subtitle')}</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            
            <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 px-1">{t('email_label')}</label>
                <div className="relative group">
                    <div className={`absolute inset-y-0 ${language === 'ar' ? 'right-0 pr-4' : 'left-0 pl-4'} flex items-center pointer-events-none`}>
                        <Mail size={20} className="text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                    </div>
                    <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`block w-full py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all font-bold text-sm ${language === 'ar' ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4 text-left'}`}
                        placeholder={t('email_placeholder')}
                        dir="ltr"
                    />
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 px-1">{t('password_label')}</label>
                <div className="relative group">
                    <div className={`absolute inset-y-0 ${language === 'ar' ? 'right-0 pr-4' : 'left-0 pl-4'} flex items-center pointer-events-none`}>
                        <Lock size={20} className="text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                    </div>
                    <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`block w-full py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all font-bold text-sm ${language === 'ar' ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4 text-left'}`}
                        placeholder="••••••••"
                        dir="ltr"
                    />
                </div>
            </div>

            {error && (
              <div className="py-3 px-4 rounded-xl bg-red-50 text-red-600 text-xs font-bold text-center border border-red-100">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 bg-black text-white rounded-xl font-bold text-base hover:bg-gray-900 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 mt-4"
            >
              <span>{t('login_button')}</span>
              {language === 'ar' ? <ArrowLeft size={18} /> : <ArrowRight size={18} />}
            </button>
          </form>

          <div className="mt-8 flex flex-col items-center gap-3">
             <button 
               onClick={() => setIsRegisterOpen(true)}
               className="text-sm font-bold text-blue-600 hover:text-blue-700 hover:underline transition-colors"
             >
               {t('create_new_account')}
             </button>
             
             <a href="#" className="text-xs text-gray-400 hover:text-gray-600 transition-colors font-medium">{t('forgot_password')}</a>
          </div>
        </div>
      )}

      {/* Registration Bottom Sheet */}
      {isRegisterOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={() => setIsRegisterOpen(false)}
            />
            
            {/* Sheet */}
            <div className="bg-white w-full max-w-md rounded-t-3xl p-6 relative z-10 animate-in slide-in-from-bottom duration-300 max-h-[85vh] overflow-y-auto no-scrollbar">
                
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-black text-gray-900">
                        {registerStep === 'type' ? t('register_title') : t('register_subtitle')}
                    </h2>
                    <button onClick={() => setIsRegisterOpen(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
                        <X size={20} className="text-gray-600" />
                    </button>
                </div>

                {registerStep === 'type' ? (
                    <div className="space-y-3">
                        <p className="text-sm text-gray-500 font-bold mb-4">{t('register_choose_type')}</p>
                        
                        <button 
                            onClick={() => handleRegisterTypeSelect('individual')}
                            className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 hover:border-blue-500 hover:bg-blue-50 transition-all group"
                        >
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                                <User size={24} />
                            </div>
                            <div className={`flex-1 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                                <h3 className="font-bold text-gray-800">{t('register_individual_title')}</h3>
                                <p className="text-xs text-gray-500 mt-0.5">{t('register_individual_desc')}</p>
                            </div>
                            <ChevronRight className={`text-gray-300 ${language === 'ar' ? 'rotate-180' : ''}`} />
                        </button>

                        <button 
                            onClick={() => handleRegisterTypeSelect('company')}
                            className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 hover:border-purple-500 hover:bg-purple-50 transition-all group"
                        >
                            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
                                <Building2 size={24} />
                            </div>
                            <div className={`flex-1 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                                <h3 className="font-bold text-gray-800">{t('register_commercial_title')}</h3>
                                <p className="text-xs text-gray-500 mt-0.5">{t('register_commercial_desc')}</p>
                            </div>
                            <ChevronRight className={`text-gray-300 ${language === 'ar' ? 'rotate-180' : ''}`} />
                        </button>
                    </div>
                ) : (
                    <div className={`space-y-4 animate-in ${language === 'ar' ? 'slide-in-from-right' : 'slide-in-from-left'} duration-300`}>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1.5">{getPlaceholderName()}</label>
                            <input 
                                type="text"
                                value={regName}
                                onChange={(e) => setRegName(e.target.value)}
                                className={`w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-blue-500 focus:bg-white focus:outline-none transition-all font-bold text-sm ${language === 'ar' ? 'text-right' : 'text-left'}`}
                                placeholder={getPlaceholderName()}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1.5">{t('email_label')}</label>
                            <input 
                                type="email"
                                value={regEmail}
                                onChange={(e) => setRegEmail(e.target.value)}
                                className={`w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-blue-500 focus:bg-white focus:outline-none transition-all font-bold text-sm dir-ltr ${language === 'ar' ? 'text-right' : 'text-left'}`}
                                placeholder="example@mail.com"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1.5">{t('password_label')}</label>
                            <input 
                                type="password"
                                value={regPass}
                                onChange={(e) => setRegPass(e.target.value)}
                                className={`w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-blue-500 focus:bg-white focus:outline-none transition-all font-bold text-sm ${language === 'ar' ? 'text-right' : 'text-left'}`}
                                placeholder="••••••••"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1.5">{t('confirm_password')}</label>
                            <input 
                                type="password"
                                value={regConfirmPass}
                                onChange={(e) => setRegConfirmPass(e.target.value)}
                                className={`w-full p-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-blue-500 focus:bg-white focus:outline-none transition-all font-bold text-sm ${language === 'ar' ? 'text-right' : 'text-left'}`}
                                placeholder="••••••••"
                            />
                        </div>

                        <div className="flex items-center gap-2 mt-2">
                            <div 
                                onClick={() => setAgreedToPolicy(!agreedToPolicy)}
                                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center cursor-pointer transition-colors ${agreedToPolicy ? 'bg-black border-black' : 'border-gray-300'}`}
                            >
                                {agreedToPolicy && <Check size={14} className="text-white" strokeWidth={3} />}
                            </div>
                            <span className="text-xs font-bold text-gray-600">{t('i_agree_to')} <span className="text-blue-600 underline">{t('privacy_policy_link')}</span></span>
                        </div>

                        <button 
                            onClick={handleRegisterSubmit}
                            disabled={isRegistering}
                            className="w-full py-3.5 bg-black text-white rounded-xl font-bold text-base hover:bg-gray-900 active:scale-[0.98] transition-all mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isRegistering ? t('registering') : t('register_button')}
                        </button>
                        
                        <button 
                            onClick={() => setRegisterStep('type')}
                            className="w-full py-2 text-gray-500 text-sm font-bold hover:text-gray-800"
                        >
                            {t('back')}
                        </button>
                    </div>
                )}

            </div>
        </div>
      )}

    </div>
  );
};

export default LoginPage;
