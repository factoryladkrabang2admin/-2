import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  LogIn, 
  User, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  Check, 
  ShieldCheck, 
  Lock
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  AdminUserAccount, 
  authenticateStaffOrAdmin
} from '../data/mockData';
import { realtimeHub } from '../services/realtimeService';
import { ActivityItem } from '../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: AdminUserAccount) => void;
  isDismissible?: boolean;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  isDismissible = true,
}) => {
  const { language } = useLanguage();
  const usernameInputRef = useRef<HTMLInputElement>(null);

  // Login form state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const prevOpenRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Reset modal state when modal opens
  useEffect(() => {
    if (isOpen && !prevOpenRef.current) {
      setErrorMsg(null);
      setIsSuccess(false);
      setSuccessMessage('');
      setLoginUsername('');
      setLoginPassword('');
      setTimeout(() => {
        usernameInputRef.current?.focus();
      }, 100);
    }
    prevOpenRef.current = isOpen;
  }, [isOpen]);

  // Handle ESC key press
  useEffect(() => {
    if (!isOpen || !isDismissible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDismissible]);

  if (!isOpen) return null;

  // Handle Login Submit
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const inputUser = loginUsername.trim();
    const inputPass = loginPassword.trim();

    if (!inputUser || !inputPass) {
      setErrorMsg(
        language === 'th' 
          ? 'กรุณากรอกรหัสพนักงาน/ชื่อผู้ใช้ และรหัสผ่าน' 
          : 'Please enter employee ID/username and password'
      );
      return;
    }

    const authResult = authenticateStaffOrAdmin(inputUser, inputPass);

    if (authResult.success && authResult.user) {
      const user = authResult.user;
      setIsSuccess(true);
      setSuccessMessage(
        language === 'th' 
          ? `ยินดีต้อนรับคุณ ${user.name || user.username}` 
          : `Welcome ${user.name || user.username}`
      );

      // Record activity
      const newActivity: ActivityItem = {
        id: `act-login-${Date.now()}`,
        type: 'member_joined',
        user: user.name || user.username,
        title: language === 'th' ? 'เข้าสู่ระบบสำเร็จ' : 'Signed in successfully',
        highlightText: user.employeeId ? `[รหัส ${user.employeeId}]` : `@${user.username}`,
        subtitle: user.role || 'พนักงาน',
        timestamp: language === 'th' ? 'เมื่อสักครู่' : 'Just now',
        badgeType: 'success',
      };
      const currentActivities = realtimeHub.getStoredActivities();
      realtimeHub.saveActivities([newActivity, ...currentActivities]);

      setTimeout(() => {
        onLoginSuccess(user);
        onClose();
        setIsSuccess(false);
      }, 400);
    } else {
      if (authResult.error === 'INCORRECT_PASSWORD') {
        setErrorMsg(
          language === 'th'
            ? 'รหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง'
            : 'Incorrect password. Please verify and try again.'
        );
      } else {
        setErrorMsg(
          language === 'th'
            ? 'ไม่พบข้อมูลรหัสพนักงานหรือชื่อผู้ใช้นี้ในระบบ'
            : 'Employee ID or Username not found.'
        );
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="fixed inset-0"
        onClick={isDismissible ? onClose : undefined}
      />
      <div className="relative bg-white rounded-2xl max-w-md w-full shadow-2xl border border-[#e2e8f0] overflow-hidden z-10 animate-in zoom-in-95 duration-150 max-h-[94vh] flex flex-col">
        
        {/* Top Header */}
        <div className="bg-gradient-to-r from-[#002045] to-[#003366] p-5 text-white relative shrink-0">
          {isDismissible && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/70 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-[#66affe] shadow-inner shrink-0">
              <LogIn className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                {language === 'th' ? 'เข้าสู่ระบบพนักงาน' : 'Employee Sign In'}
              </h3>
              <p className="text-xs text-[#adc7f7]">
                {language === 'th' ? 'ระบบบริหารจัดการ ธุรการลาดกระบัง 2' : 'Ladkrabang 2 Administrative System'}
              </p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          {/* Error Message Alert */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-700 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span className="leading-relaxed font-medium">{errorMsg}</span>
            </div>
          )}

          {/* Success Message Alert */}
          {isSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-700 font-bold animate-in fade-in">
              <Check className="w-4 h-4 shrink-0 text-emerald-600 stroke-[3]" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* LOGIN FORM */}
          <form onSubmit={handleLoginSubmit} noValidate className="space-y-4">
            {/* Username / Employee ID Field */}
            <div>
              <label className="block text-xs font-bold text-[#1a1c1c] mb-1.5">
                {language === 'th' ? 'รหัสพนักงาน หรือ ชื่อผู้ใช้งาน' : 'Employee ID or Username'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#74777f]">
                  <User className="w-4 h-4" />
                </div>
                <input
                  ref={usernameInputRef}
                  type="text"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder={language === 'th' ? 'กรอกรหัสพนักงาน หรือ ชื่อผู้ใช้งาน' : 'Enter Employee ID or Username'}
                  className="w-full pl-9 pr-3 py-2.5 border border-[#c4c6cf] rounded-xl text-xs font-semibold text-[#002045] outline-hidden focus:border-[#0061a5] focus:ring-2 focus:ring-[#0061a5]/20 transition-all bg-white"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-bold text-[#1a1c1c] mb-1.5">
                {language === 'th' ? 'รหัสผ่าน (Password)' : 'Password'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#74777f]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder={language === 'th' ? 'กรอกรหัสผ่าน' : 'Enter Password'}
                  className="w-full pl-9 pr-10 py-2.5 border border-[#c4c6cf] rounded-xl text-xs font-bold tracking-wider text-[#002045] outline-hidden focus:border-[#0061a5] focus:ring-2 focus:ring-[#0061a5]/20 transition-all bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#74777f] hover:text-[#002045] cursor-pointer"
                >
                  {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember & Security badge */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-[#43474e]">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-[#c4c6cf] text-[#0061a5] focus:ring-[#0061a5]"
                />
                <span>{language === 'th' ? 'จดจำการเข้าสู่ระบบ' : 'Remember me'}</span>
              </label>
              <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>{language === 'th' ? 'ระบบความปลอดภัย' : 'Secure'}</span>
              </span>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSuccess}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
                  isSuccess
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gradient-to-r from-[#0061a5] to-[#004b80] hover:from-[#00518a] hover:to-[#003b66] text-white active:scale-[0.99]'
                }`}
              >
                {isSuccess ? (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>{language === 'th' ? 'เข้าสู่ระบบสำเร็จ...' : 'Signed in successfully...'}</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>{language === 'th' ? 'เข้าสู่ระบบ' : 'Sign In'}</span>
                  </>
                )}
              </button>
            </div>

            {/* Close Button if dismissible */}
            {isDismissible && (
              <div className="text-center pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs text-slate-500 hover:text-slate-800 hover:underline cursor-pointer py-1 px-3 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  {language === 'th' ? 'เข้าใช้งานทั่วไป / ปิดหน้าต่างนี้' : 'Continue as Guest / Close'}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};
