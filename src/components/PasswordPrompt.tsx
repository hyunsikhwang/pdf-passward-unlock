import React, { useState } from 'react';
import { KeyRound, Eye, EyeOff, ShieldAlert } from 'lucide-react';

interface PasswordPromptProps {
  onSubmit: (password: string) => void;
  isLoading: boolean;
  isIncorrect: boolean;
}

export default function PasswordPrompt({ onSubmit, isLoading, isIncorrect }: PasswordPromptProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    onSubmit(password);
  };

  return (
    <div id="password-prompt-section" className="bg-[#111113] border border-white/5 bg-linear-to-b from-white/[0.02] to-transparent rounded-2xl p-5 sm:p-6 space-y-4">
      <div className="flex items-start space-x-3">
        <div className="p-2.5 rounded-xl bg-[#38BDF8]/10 text-[#38BDF8] border border-[#38BDF8]/20 flex-shrink-0">
          <KeyRound className="w-5.5 h-5.5" />
        </div>
        <div>
          <h3 className="font-sans font-black text-[#F8FAFC] text-sm sm:text-base uppercase tracking-tight">
            비밀번호 입력 요망 <span className="text-[#38BDF8]">REQUIRED</span>
          </h3>
          <p className="font-sans text-xs sm:text-sm text-[#94A3B8] mt-1 leading-relaxed">
            해당 문서는 강력하게 암호화되어 보호받고 있습니다. 정상적인 콘텐츠 처리 및 잠금 해제 스크립트 진행을 위해 원본의 비밀번호를 입력해주세요.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4.5 font-sans">
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="비밀번호(Password)를 입력하세요"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            className={`w-full px-5 py-4 bg-[#1E1E22] border text-white text-sm font-semibold rounded-xl focus:ring-4 focus:ring-[#38BDF8]/20 focus:border-[#38BDF8] focus:outline-hidden transition-all pr-12 ${
              isIncorrect 
                ? 'border-rose-500/50 ring-rose-900/10 placeholder-rose-400' 
                : 'border-white/10'
            }`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-0.5"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
          </button>
        </div>

        {isIncorrect && (
          <div className="flex items-center space-x-1.5 text-xs text-rose-400">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>비밀번호가 불일치합니다. 정확한 문자열인지 대소문자를 확인하세요.</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !password.trim()}
          className="w-full flex items-center justify-center space-x-2 bg-[#38BDF8] hover:bg-[#38BDF8]/90 disabled:bg-[#38BDF8]/30 disabled:text-black/50 text-[#0A0A0B] rounded-xl py-3.5 px-4 text-xs font-black uppercase tracking-wider shadow-xs hover:shadow-md active:scale-[0.98] transition-all duration-150 cursor-pointer disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              <span>암호 검증 중...</span>
            </div>
          ) : (
            <span>해제 및 복원 준비 완료</span>
          )}
        </button>
      </form>
    </div>
  );
}
