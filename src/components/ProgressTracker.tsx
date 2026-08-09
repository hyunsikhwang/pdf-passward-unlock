import React from 'react';
import { CheckCircle, AlertCircle, Sparkles, Loader } from 'lucide-react';
import { PageRenderStatus, RenderQuality, QUALITY_PRESETS } from '../types';

interface ProgressTrackerProps {
  pages: PageRenderStatus[];
  quality: RenderQuality;
  onQualityChange: (quality: RenderQuality) => void;
  onStartDecrypt: () => void;
  status: 'ready' | 'rendering' | 'completed' | 'error';
  errorMessage: string | null;
  downloadUrl: string | null;
  fileName: string;
  onReset: () => void;
}

export default function ProgressTracker({
  pages,
  quality,
  onQualityChange,
  onStartDecrypt,
  status,
  errorMessage,
  downloadUrl,
  fileName,
  onReset,
}: ProgressTrackerProps) {
  const totalPages = pages.length;
  const completedPages = pages.filter((p) => p.status === 'done').length;
  const progressPercent = totalPages > 0 ? Math.round((completedPages / totalPages) * 100) : 0;

  const currentRenderingPage = pages.find((p) => p.status === 'rendering')?.pageNumber;

  // Generate cleaned filename (remove password or prepend [unlocked])
  const getOutputFileName = () => {
    const baseName = fileName.replace(/\.[^/.]+$/, '');
    return `${baseName}_unlocked.pdf`;
  };

  return (
    <div id="progress-tracker-section" className="bg-[#111113] border border-white/5 rounded-2xl p-5 sm:p-6 space-y-6">
      {status === 'ready' && (
        <div className="space-y-5">
          <div className="p-3.5 bg-white/[0.02] rounded-xl border border-white/5">
            <h4 className="font-sans font-black text-[#F8FAFC] text-xs sm:text-sm flex items-center space-x-1.5 mb-1 uppercase tracking-tight">
              <Sparkles className="w-4 h-4 text-[#38BDF8]" />
              <span>복원 이미지 해상도 보정 프리셋</span>
            </h4>
            <p className="font-sans text-[11px] sm:text-xs text-[#94A3B8] leading-normal">
              이 유틸리티는 브라우저 내부 백그라운드 엔진을 이용해 기기 내부에서 모든 페이지를 암호화 해제한 뒤 보강된 고화질 표준 PDF 화소로 재구축합니다. 배율이 올라갈수록 선명도는 상승하나 파일 크기가 커집니다.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(Object.keys(QUALITY_PRESETS) as RenderQuality[]).map((key) => {
              const preset = QUALITY_PRESETS[key];
              const isSelected = quality === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onQualityChange(key)}
                  className={`text-left p-3.5 rounded-xl border font-sans pointer transition-all duration-150 relative overflow-hidden ${
                    isSelected
                      ? 'border-[#38BDF8] bg-[#38BDF8]/5 ring-2 ring-[#38BDF8]/10'
                      : 'border-white/5 hover:border-white/15 bg-white/[0.01]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-white text-sm">{preset.label}</span>
                    <input
                      type="radio"
                      checked={isSelected}
                      readOnly
                      className="w-4 h-4 text-[#38BDF8] focus:ring-[#38BDF8] border-slate-700 bg-slate-800"
                    />
                  </div>
                  <p className="text-[#94A3B8] mt-1.5 text-xs leading-normal">{preset.desc}</p>
                </button>
              );
            })}
          </div>

          <button
            onClick={onStartDecrypt}
            className="w-full flex items-center justify-center space-x-2 bg-[#38BDF8] hover:bg-[#38BDF8]/90 text-black rounded-xl py-3.5 px-4 text-xs font-black uppercase tracking-wider shadow-xs hover:shadow-md transition-all duration-150 cursor-pointer"
          >
            <span>비밀번호 영구 해제 및 고품질 PDF 구축</span>
          </button>
        </div>
      )}

      {status === 'rendering' && (
        <div className="space-y-5 animate-fade-in">
          {/* Active Status Display */}
          <div className="flex justify-between items-end font-sans">
            <div>
              <p className="text-[10px] text-[#38BDF8] font-bold uppercase tracking-widest">DECRYPTING PROCESS</p>
              <h4 className="font-bold text-[#F8FAFC] mt-1 text-sm sm:text-base">
                {currentRenderingPage 
                  ? `페이지 ${currentRenderingPage} 암호 제거 및 드로잉 중...` 
                  : 'PDF 어셈블 및 파일 무압축 구축 중...'}
              </h4>
            </div>
            <span className="font-mono text-xs font-extrabold text-[#38BDF8] bg-[#38BDF8]/10 border border-[#38BDF8]/20 px-2 py-1 rounded-md">
              {progressPercent}%
            </span>
          </div>

          {/* Progress Bar Container */}
          <div className="w-full bg-white/[0.08] h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-[#38BDF8] h-full rounded-full transition-all duration-350 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Thumbnail preview grid */}
          <div className="space-y-2.5">
            <p className="font-sans text-[11px] sm:text-xs text-[#94A3B8] font-medium">로컬 샌드박스 드로잉 상황판 ({completedPages} / {totalPages} 완료)</p>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 bg-[#1E1E22] border border-white/5 rounded-xl p-3 max-h-48 overflow-y-auto">
              {pages.map((p) => (
                <div
                  key={p.pageNumber}
                  className={`aspect-[3/4] relative rounded-lg border flex flex-col items-center justify-center overflow-hidden transition-all duration-150 ${
                    p.status === 'done'
                      ? 'border-emerald-500/30 bg-emerald-950/20'
                      : p.status === 'rendering'
                      ? 'border-[#38BDF8] bg-[#38BDF8]/5 shadow-sm ring-1 ring-[#38BDF8]/10'
                      : 'border-white/5 bg-white/[0.01]'
                  }`}
                >
                  {p.thumbnailUrl ? (
                    <img
                      src={p.thumbnailUrl}
                      alt={`Page ${p.pageNumber}`}
                      className="w-full h-full object-cover animate-fade-in"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="font-mono text-[10px] sm:text-xs text-slate-500 font-bold">
                      {p.pageNumber}
                    </span>
                  )}

                  {/* Rendering loader spinner */}
                  {p.status === 'rendering' && (
                    <div className="absolute inset-0 bg-[#38BDF8]/10 flex items-center justify-center backdrop-blur-[0.5px]">
                      <Loader className="w-4 h-4 text-[#38BDF8] animate-spin" />
                    </div>
                  )}

                  {/* Completed Checkmark */}
                  {p.status === 'done' && (
                    <div className="absolute top-1 right-1 bg-emerald-500 text-black rounded-full p-0.5 shadow-sm">
                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {status === 'completed' && (
        <div className="text-center py-4 space-y-5 animate-fade-in">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2">
            <CheckCircle className="w-7 h-7" />
          </div>

          <div className="font-sans">
            <h3 className="font-black text-[#F8FAFC] text-base sm:text-lg uppercase">비밀번호 해제가 완료되었습니다</h3>
            <p className="text-[#94A3B8] text-xs sm:text-sm mt-1.5 max-w-sm mx-auto leading-relaxed">
              문서의 영구 잠금 해동 작업이 끝났습니다. 이제 어느 기기 및 뷰어에서나 비밀번호 입력의 패널티 없이 프리하게 액세스 할 수 있습니다.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row sm:space-x-3 space-y-2.5 sm:space-y-0 justify-center font-sans">
            <a
              href={downloadUrl || '#'}
              download={getOutputFileName()}
              className="flex-1 max-w-xs mx-auto sm:max-w-none flex items-center justify-center space-x-2 bg-[#38BDF8] hover:bg-[#38BDF8]/90 text-black rounded-xl py-3 px-5 text-xs font-black uppercase tracking-wider transition-all duration-150 active:scale-[0.98] cursor-pointer text-center"
            >
              <span>언락된 PDF 다운로드</span>
            </a>
            <button
              onClick={onReset}
              className="flex-shrink-0 flex items-center justify-center space-x-1 border border-white/10 hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.05] text-white rounded-xl py-3 px-5 text-xs font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer"
            >
              <span>다른 문서 처리</span>
            </button>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="text-center py-4 space-y-4 animate-fade-in">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/25 mb-2">
            <AlertCircle className="w-7 h-7" />
          </div>

          <div className="font-sans">
            <h3 className="font-bold text-white text-lg">에러 코드가 검출되었습니다</h3>
            <p className="text-rose-400 text-xs sm:text-sm mt-2 bg-rose-950/20 border border-rose-900/30 p-3 rounded-xl max-w-md mx-auto leading-relaxed">
              {errorMessage || 'PDF 파일 및 보안 헤더 추출 시퀀스에 상호 호환될 수 없는 오류가 감증되었습니다.'}
            </p>
          </div>

          <div className="pt-2 font-sans">
            <button
              onClick={onReset}
              className="bg-white hover:bg-slate-100 text-[#0A0A0B] rounded-xl py-2.5 px-6 text-xs font-black uppercase tracking-wider shadow-sm transition-all duration-150 active:scale-[0.98] cursor-pointer"
            >
              작업 리셋 및 홈으로 이동
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
