import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  User, 
  Mail, 
  Shield, 
  Check, 
  Camera, 
  KeyRound, 
  Eye, 
  EyeOff, 
  Lock, 
  LogOut, 
  Image as ImageIcon,
  Upload,
  Sparkles,
  RefreshCw,
  Link as LinkIcon
} from 'lucide-react';
import { CURRENT_USER_AVATAR, DEFAULT_ADMIN_USER, AdminUserAccount, saveUpdatedUserCredentials } from '../data/mockData';
import { useLanguage } from '../contexts/LanguageContext';
import { AVATAR_PRESETS } from '../data/avatarPresets';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: AdminUserAccount;
  onUpdateUser?: (updated: AdminUserAccount) => void;
  onLogout?: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ 
  isOpen, 
  onClose, 
  currentUser = DEFAULT_ADMIN_USER,
  onUpdateUser,
  onLogout 
}) => {
  const { language } = useLanguage();
  const [userAccount, setUserAccount] = useState<AdminUserAccount>(currentUser);

  const [username, setUsername] = useState(currentUser.username);
  const [name, setName] = useState(currentUser.name);
  const [role, setRole] = useState(currentUser.role);
  const [password, setPassword] = useState(currentUser.password);
  const [avatarUrl, setAvatarUrl] = useState<string>(currentUser.avatarUrl || '');
  const [showPassword, setShowPassword] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen && !prevOpenRef.current) {
      setUserAccount(currentUser);
      setUsername(currentUser.username);
      setName(currentUser.name);
      setRole(currentUser.role);
      setPassword(currentUser.password);
      setAvatarUrl(currentUser.avatarUrl || '');
      setCustomUrlInput('');
      setShowAvatarPicker(false);
    }
    prevOpenRef.current = isOpen;
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      alert(language === 'th' ? 'กรุณาเลือกไฟล์ภาพขนาดไม่เกิน 3MB' : 'Image must be under 3MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatarUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyCustomUrl = () => {
    if (customUrlInput.trim()) {
      setAvatarUrl(customUrlInput.trim());
      setCustomUrlInput('');
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: AdminUserAccount = {
      username: username.trim() || userAccount.username,
      name: name.trim() || userAccount.name,
      email: userAccount.email || '',
      role: role.trim() || userAccount.role,
      password: password || userAccount.password,
      employeeId: userAccount.employeeId,
      avatarUrl: avatarUrl || undefined,
      lastLogin: 'Active Session',
      isAdmin: userAccount.isAdmin,
      canEdit: userAccount.canEdit,
      permissions: userAccount.permissions,
    };
    setUserAccount(updated);
    saveUpdatedUserCredentials(updated);
    if (onUpdateUser) {
      onUpdateUser(updated);
    }
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-xs" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-[#e2e8f0] overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#e2e8f0] flex items-center justify-between bg-[#f9f9f9] shrink-0">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-[#002045]" />
            <h3 className="text-base font-bold text-[#1a1c1c]">
              {language === 'th' ? 'ข้อมูลโปรไฟล์ผู้ใช้งาน (User Profile)' : 'User Profile'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#74777f] hover:text-[#1a1c1c] p-1 rounded-md hover:bg-[#e8e8e8] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
          {/* Avatar Profile Section */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
            <div className="flex items-center gap-4">
              <div className="relative group shrink-0">
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#0061a5]/40 bg-[#002045] flex items-center justify-center text-white font-extrabold text-xl shadow-md">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={name || username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="tracking-tighter uppercase">{(name || username).slice(0, 2)}</span>
                  )}
                </div>
                {/* Change photo button trigger */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-1.5 bg-[#0061a5] hover:bg-[#002045] text-white rounded-full border-2 border-white shadow-sm cursor-pointer transition-all hover:scale-110"
                  title={language === 'th' ? 'อัปโหลดรูปโปรไฟล์' : 'Upload photo'}
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-bold text-sm text-[#1a1c1c] truncate">{name || username}</p>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full border border-emerald-200">
                    <Shield className="w-3 h-3 text-emerald-600" />
                    {role || (language === 'th' ? 'ผู้ใช้งานระบบ' : 'Member')}
                  </span>
                </div>
                <p className="text-[#74777f] text-xs font-mono mt-0.5">@{username}</p>
                
                {/* Action Buttons for Avatar */}
                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-white hover:bg-slate-100 border border-slate-300 text-[#002045] rounded-lg shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#0061a5]" />
                    <span>{language === 'th' ? (showAvatarPicker ? 'ปิดตัวเลือกรูป' : 'เลือกรูปโปรไฟล์') : (showAvatarPicker ? 'Hide Avatars' : 'Choose Avatar')}</span>
                  </button>
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={() => setAvatarUrl('')}
                      className="px-2 py-1 text-[11px] font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    >
                      {language === 'th' ? 'ใช้ตัวอักษรย่อ' : 'Use Initials'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Collapsible Avatar Picker & URL input */}
            {showAvatarPicker && (
              <div className="pt-3 border-t border-slate-200 space-y-3 animate-in fade-in duration-150">
                <div>
                  <p className="text-[11px] font-semibold text-[#43474e] mb-2 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-[#0061a5]" />
                    <span>{language === 'th' ? 'เลือกรูปภาพโปรไฟล์สำเร็จรูป:' : 'Select preset avatar:'}</span>
                  </p>
                  <div className="grid grid-cols-6 gap-2">
                    {AVATAR_PRESETS.map((preset) => {
                      const isSelected = avatarUrl === preset.url;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setAvatarUrl(preset.url)}
                          className={`relative group rounded-xl overflow-hidden aspect-square border-2 transition-all p-0.5 cursor-pointer ${
                            isSelected
                              ? 'border-[#0061a5] ring-2 ring-[#0061a5]/30 scale-105 shadow-sm'
                              : 'border-slate-200 hover:border-[#0061a5]/50 hover:scale-105'
                          }`}
                          title={preset.name}
                        >
                          <img
                            src={preset.url}
                            alt={preset.name}
                            className="w-full h-full object-cover rounded-lg"
                          />
                          {isSelected && (
                            <div className="absolute inset-0 bg-[#0061a5]/40 flex items-center justify-center rounded-lg">
                              <Check className="w-4 h-4 text-white stroke-[3]" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Direct Image URL input or Upload */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <LinkIcon className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="url"
                      value={customUrlInput}
                      onChange={(e) => setCustomUrlInput(e.target.value)}
                      placeholder={language === 'th' ? 'วางลิงก์รูปภาพ URL...' : 'Paste image URL...'}
                      className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs outline-hidden focus:border-[#0061a5]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyCustomUrl}
                    disabled={!customUrlInput.trim()}
                    className="px-3 py-1.5 bg-[#0061a5] hover:bg-[#002045] disabled:opacity-40 text-white font-semibold rounded-lg text-xs cursor-pointer transition-all"
                  >
                    {language === 'th' ? 'ใช้รูปนี้' : 'Apply'}
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-[#002045] font-semibold rounded-lg text-xs flex items-center gap-1 cursor-pointer transition-all shrink-0"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{language === 'th' ? 'อัปโหลดไฟล์' : 'Upload'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Account Credentials Section (Username & Password) */}
          <div className="p-4 bg-sky-50/60 border border-sky-200/80 rounded-2xl space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#0061a5]" />
                <h4 className="font-bold text-xs text-[#002045]">
                  {language === 'th' ? 'ข้อมูลการเข้าสู่ระบบ (Username & Password)' : 'Login Credentials'}
                </h4>
              </div>
              {userAccount.employeeId && (
                <span className="text-[11px] font-mono font-bold bg-white px-2 py-0.5 rounded-md border border-sky-200 text-[#0061a5]">
                  {language === 'th' ? `รหัสพนักงาน: ${userAccount.employeeId}` : `ID: ${userAccount.employeeId}`}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-[#1a1c1c] mb-1">
                  {language === 'th' ? 'ชื่อผู้ใช้ (Username)' : 'Username'} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-[#74777f]">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    placeholder={userAccount.employeeId || 'username'}
                    className="w-full pl-8 pr-3 py-2 border border-[#c4c6cf] rounded-xl text-xs font-mono font-bold text-[#002045] outline-hidden focus:border-[#0061a5] focus:ring-2 focus:ring-[#0061a5]/20 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#1a1c1c] mb-1">
                  {language === 'th' ? 'รหัสผ่าน (Password)' : 'Password'} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-[#74777f]">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full pl-8 pr-9 py-2 border border-[#c4c6cf] rounded-xl text-xs font-mono font-bold tracking-wider text-[#002045] outline-hidden focus:border-[#0061a5] focus:ring-2 focus:ring-[#0061a5]/20 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[#74777f] hover:text-[#002045] p-1 cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              {language === 'th' 
                ? '💡 สามารถเปลี่ยนชื่อผู้ใช้ (Username) และรหัสผ่าน (Password) ได้ตลอดเวลา และกดบันทึกข้อมูลด้านล่าง'
                : '💡 You can customize your username and password anytime and save below.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[#1a1c1c] mb-1">
                {language === 'th' ? 'ชื่อที่แสดง (Display Name)' : 'Display Name'}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-[#c4c6cf] rounded-xl text-xs outline-hidden focus:border-[#0061a5] bg-white font-medium"
              />
            </div>
            <div>
              <label className="block font-semibold text-[#1a1c1c] mb-1">
                {language === 'th' ? 'ตำแหน่ง / แผนก (Role / Department)' : 'Role / Department'}
              </label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 border border-[#c4c6cf] rounded-xl text-xs outline-hidden focus:border-[#0061a5] bg-white font-medium"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-[#e2e8f0] flex items-center justify-between gap-2 shrink-0">
            {onLogout ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                className="px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{language === 'th' ? 'ออกจากระบบ' : 'Sign Out'}</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 font-semibold text-[#43474e] hover:bg-[#f3f3f4] rounded-lg text-xs cursor-pointer transition-colors"
              >
                {language === 'th' ? 'ยกเลิก' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-5 py-2 font-semibold bg-[#0061a5] hover:bg-[#002045] text-white rounded-lg shadow-sm flex items-center gap-1.5 text-xs cursor-pointer transition-all"
              >
                {saved ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{language === 'th' ? 'บันทึกสำเร็จ' : 'Saved'}</span>
                  </>
                ) : (
                  <span>{language === 'th' ? 'บันทึกข้อมูลโปรไฟล์' : 'Update Profile'}</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
