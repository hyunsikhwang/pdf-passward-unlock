import React, { useState } from 'react';
import { BatchFile, RenderQuality, QUALITY_PRESETS } from '../types';
import { Eye, EyeOff, KeyRound, CheckCircle2, Lock, FileText, AlertCircle, Download, Sparkles, Loader, ArrowRight, ShieldCheck, Trash2 } from 'lucide-react';
import JSZip from 'jszip';

interface BatchListProps {
  files: BatchFile[];
  onVerifyPassword: (id: string, password: string) => Promise<void>;
  onRemoveFile: (id: string) => void;
  quality: RenderQuality;
  onQualityChange: (quality: RenderQuality) => void;
  onStartBatchDecrypt: () => void;
  isProcessing: boolean;
  onResetAll: () => void;
}

export default function BatchList({
  files,
  onVerifyPassword,
  onRemoveFile,
  quality,
  onQualityChange,
  onStartBatchDecrypt,
  isProcessing,
  onResetAll,
}: BatchListProps) {
  const [globalPassword, setGlobalPassword] = useState('');
  const [showGlobalPassword, setShowGlobalPassword] = useState(false);
  const [isApplyingGlobal, setIsApplyingGlobal] = useState(false);
  const [isZipping, setIsZipping] = useState(false);

  // Individual row password states
  const [rowPasswords, setRowPasswords] = useState<Record<string, string>>({});
  const [rowShowPasswords, setRowShowPasswords] = useState<Record<string, boolean>>({});
  const [rowVerifying, setRowVerifying] = useState<Record<string, boolean>>({});

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Safe filename generator
  const getOutputFileName = (originalName: string) => {
    const baseName = originalName.replace(/\.[^/.]+$/, '');
    return `${baseName}_unlocked.pdf`;
  };

  // Apply global password to all files that need password and aren't ready/processing yet
  const handleApplyGlobalPassword = async () => {
    if (!globalPassword.trim()) return;
    setIsApplyingGlobal(true);

    const targetFiles = files.filter(f => f.step === 'need_password');
    for (const file of targetFiles) {
      try {
        await onVerifyPassword(file.id, globalPassword);
      } catch (err) {
        console.error('Global password verification failed for:', file.name, err);
      }
    }

    setIsApplyingGlobal(false);
    setGlobalPassword('');
  };

  // Verify passenger for single row
  const handleVerifyRowPassword = async (id: string) => {
    const pwd = rowPasswords[id] || '';
    if (!pwd.trim()) return;

    setRowVerifying(prev => ({ ...prev, [id]: true }));
    try {
      await onVerifyPassword(id, pwd);
    } catch (err) {
      console.error(err);
    } finally {
      setRowVerifying(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleDownloadAll = async () => {
    const completedFiles = files.filter(f => f.step === 'completed');
    if (completedFiles.length === 0) return;

    // 만약 완료된 파일이 딱 1개라면 바로 PDF로 다운로드합니다.
    if (completedFiles.length === 1) {
      const file = completedFiles[0];
      if (file.downloadUrl) {
        const link = document.createElement('a');
        link.href = file.downloadUrl;
        link.download = getOutputFileName(file.name);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      return;
    }

    // 2개 이상의 여러 파일인 경우 ZIP 파일로 묶어서 다운로드 처리합니다.
    setIsZipping(true);
    try {
      const zip = new JSZip();
      const nameCounts: Record<string, number> = {};

      for (const file of completedFiles) {
        let blob = file.decryptedBlob;
        
        // State에 blob이 유실되었을 경우를 대비한 Fallback 로직
        if (!blob && file.downloadUrl) {
          try {
            const res = await fetch(file.downloadUrl);
            blob = await res.blob();
          } catch (e) {
            console.error('Blob fetch failed:', e);
          }
        }

        if (blob) {
          let targetName = getOutputFileName(file.name);
          
          // ZIP 내부에서 파일 이름이 충돌되지 않도록 중복 인덱싱 처리
          if (nameCounts[targetName]) {
            nameCounts[targetName]++;
            const baseName = targetName.replace(/\.[^/.]+$/, '');
            targetName = `${baseName} (${nameCounts[targetName]}).pdf`;
          } else {
            nameCounts[targetName] = 1;
          }

          zip.file(targetName, blob);
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipUrl = URL.createObjectURL(zipBlob);
      
      const link = document.createElement('a');
      link.href = zipUrl;
      link.download = 'unlocked_pdfs.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setTimeout(() => URL.revokeObjectURL(zipUrl), 10000);
    } catch (err) {
      console.error('Failed to craft ZIP archive:', err);
      alert('여러개 파일을 압축 파일(ZIP)로 만드는 과정에서 오류가 발생했습니다.');
    } finally {
      setIsZipping(false);
    }
  };

  const readyToDecryptCount = files.filter(f => f.step === 'ready').length;
  const needPasswordCount = files.filter(f => f.step === 'need_password').length;
  const completedCount = files.filter(f => f.step === 'completed').length;
  const isAnyDelivered = files.some(f => f.step === 'completed');

  return (
    <div id="batch-list-container" className="space-y-6 animate-fade-in font-sans">
      
      {/* Applying Global Password Widget for Convenient UI */}
      {needPasswordCount > 1 && !isProcessing && (
        <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 space-y-3">
          <div className="flex items-center space-x-2 text-sky-600">
            <KeyRound className="w-4.5 h-4.5" />
            <h4 className="text-xs sm:text-sm font-black uppercase tracking-tight text-slate-800">공통 비밀번호 일괄 인증</h4>
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500">
            업로드된 잠긴 PDF 파일들이 모두 동일한 암호를 소유하는 경우, 아래에 한 번 입력하는 것으로 일괄 자동 인증을 진행할 수 있습니다.
          </p>
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <input
                type={showGlobalPassword ? 'text' : 'password'}
                placeholder="공통 비밀번호 입력"
                value={globalPassword}
                onChange={(e) => setGlobalPassword(e.target.value)}
                disabled={isApplyingGlobal}
                className="w-full px-4.5 py-2.5 bg-white border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={() => setShowGlobalPassword(!showGlobalPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                tabIndex={-1}
              >
                {showGlobalPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <button
              onClick={handleApplyGlobalPassword}
              disabled={isApplyingGlobal || !globalPassword.trim()}
              className="px-4.5 py-2.5 bg-sky-600 disabled:bg-slate-200 hover:bg-sky-700 text-white disabled:text-slate-400 font-extrabold text-xs rounded-xl shadow-2xs transition-all cursor-pointer whitespace-nowrap"
            >
              {isApplyingGlobal ? '일괄 검증 중...' : '일괄 적용'}
            </button>
          </div>
        </div>
      )}

      {/* Files List Panel */}
      <div className="bg-slate-50/50 border border-slate-200 rounded-2xl overflow-hidden">
        <div className="border-b border-slate-200 px-4 sm:px-5 py-3.5 bg-slate-100/70 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FilesIconCount count={files.length} />
          </div>
          {isAnyDelivered && (
            <button
              onClick={handleDownloadAll}
              disabled={isZipping}
              className="text-[11px] font-black text-sky-700 hover:bg-sky-100 disabled:opacity-50 disabled:cursor-not-allowed border border-sky-300 bg-sky-50 px-2.5 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer uppercase"
            >
              {isZipping ? (
                <>
                  <Loader className="w-3.5 h-3.5 animate-spin text-sky-600" />
                  <span>ZIP 압축 중...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>{completedCount > 1 ? '완료 전체 다운로드 (ZIP)' : '완료 파일 다운로드'}</span>
                </>
              )}
            </button>
          )}
        </div>

        <div className="divide-y divide-slate-200 max-h-96 overflow-y-auto">
          {files.map((file) => {
            const rowPwd = rowPasswords[file.id] || '';
            const rowShow = rowShowPasswords[file.id] || false;
            const verifying = rowVerifying[file.id] || false;
            const progressPercent = file.numPages 
              ? Math.round(((file.completedPages || 0) / file.numPages) * 100) 
              : 0;

            return (
              <div key={file.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white hover:bg-slate-50/80 transition-colors">
                
                {/* Left Area: File Info & State Badges */}
                <div className="min-w-0 flex items-start space-x-3.5">
                  <div className={`p-2.5 rounded-xl border flex-shrink-0 ${
                    file.step === 'completed'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                      : file.step === 'ready'
                      ? 'border-sky-200 bg-sky-50 text-sky-600'
                      : 'border-slate-200 bg-slate-100 text-slate-500'
                  }`}>
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-slate-900 truncate max-w-xs sm:max-w-md md:max-w-lg">
                      {file.name}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                      <span className="font-mono text-[10px] text-slate-500">
                        용량: {formatFileSize(file.size)}
                      </span>
                      {file.numPages !== undefined && (
                        <>
                          <span className="text-slate-300 text-[9px]">•</span>
                          <span className="font-sans text-[10px] text-slate-500">
                            {file.numPages} 페이지
                          </span>
                        </>
                      )}
                      
                      {/* Interactive step badges */}
                      {file.step === 'analyzing' && (
                        <span className="flex items-center space-x-1 font-sans text-[9px] font-black text-sky-700 bg-sky-50 border border-sky-200 rounded-md px-1.5 py-0.5 animate-pulse uppercase tracking-wider">
                          <Loader className="w-2.5 h-2.5 animate-spin" />
                          <span>분석 중</span>
                        </span>
                      )}
                      {file.step === 'need_password' && (
                        <span className="flex items-center space-x-1 font-sans text-[9px] font-black text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-1.5 py-0.5 uppercase tracking-wider">
                          <Lock className="w-2.5 h-2.5" />
                          <span>비밀번호 검출</span>
                        </span>
                      )}
                      {file.step === 'ready' && (
                        <span className="flex items-center space-x-1 font-sans text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-1.5 py-0.5 uppercase tracking-wider">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          <span>해제 준비됨</span>
                        </span>
                      )}
                      {file.step === 'rendering' && (
                        <span className="flex items-center space-x-1 font-sans text-[9px] font-black text-sky-700 bg-sky-50 border border-sky-200 rounded-md px-1.5 py-0.5 uppercase tracking-wider animate-pulse">
                          <Loader className="w-2.5 h-2.5 animate-spin" />
                          <span>잠금 해제 해상도 가공 중 ({file.completedPages || 0}/{file.numPages}p)</span>
                        </span>
                      )}
                      {file.step === 'completed' && (
                        <span className="flex items-center space-x-1 font-sans text-[9px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-1.5 py-0.5 uppercase tracking-wider">
                          <ShieldCheck className="w-2.5 h-2.5" />
                          <span>해제 완료</span>
                        </span>
                      )}
                      {file.step === 'error' && (
                        <span className="flex items-center space-x-1 font-sans text-[9px] font-black text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-1.5 py-0.5 uppercase tracking-wider">
                          <AlertCircle className="w-2.5 h-2.5" />
                          <span>처리 실패</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Area: Actions / Security Inputs */}
                <div className="flex-shrink-0 flex items-center justify-end sm:justify-start">
                  
                  {/* Password Entry Row */}
                  {file.step === 'need_password' && !isProcessing && (
                    <div className="flex items-center space-x-2 w-full sm:w-auto">
                      <div className="relative">
                        <input
                          type={rowShow ? 'text' : 'password'}
                          placeholder="암호 입력"
                          value={rowPwd}
                          onChange={(e) => {
                            const val = e.target.value;
                            setRowPasswords(prev => ({ ...prev, [file.id]: val }));
                          }}
                          disabled={verifying}
                          className={`w-32 px-3 py-1.5 bg-white border text-xs text-slate-900 rounded-lg focus:ring-1 focus:ring-sky-500 focus:outline-hidden pr-8 ${
                            file.wrongPasswordSubmitted ? 'border-rose-500 placeholder-rose-400' : 'border-slate-300'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setRowShowPasswords(prev => ({ ...prev, [file.id]: !rowShow }))}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                        >
                          {rowShow ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <button
                        onClick={() => handleVerifyRowPassword(file.id)}
                        disabled={verifying || !rowPwd.trim()}
                        className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-[10px] uppercase tracking-wide rounded-lg cursor-pointer transition-all disabled:opacity-40"
                      >
                        {verifying ? '인증...' : '확인'}
                      </button>
                      
                      <button
                        onClick={() => onRemoveFile(file.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title="제거"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Rendering Progress Bar */}
                  {file.step === 'rendering' && (
                    <div className="w-full sm:w-40 space-y-1.5">
                      <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-sky-600 h-full rounded-full transition-all duration-200"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <p className="text-right font-mono text-[9px] text-sky-600 font-semibold">{progressPercent}%</p>
                    </div>
                  )}

                  {/* Ready to decrypt status */}
                  {file.step === 'ready' && !isProcessing && (
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">완료 준비됨</span>
                      <button
                        onClick={() => onRemoveFile(file.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title="제거"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Download options */}
                  {file.step === 'completed' && file.downloadUrl && (
                    <a
                      href={file.downloadUrl}
                      download={getOutputFileName(file.name)}
                      className="inline-flex items-center space-x-1.5 text-xs font-black text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-300 px-3.5 py-1.75 rounded-lg transition-all"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>다운로드</span>
                    </a>
                  )}

                  {/* Error retry option */}
                  {file.step === 'error' && !isProcessing && (
                    <div className="flex items-center space-x-2">
                      <p className="text-rose-600 text-[11px] font-medium max-w-[120px] truncate" title={file.errorMsg || ''}>
                        {file.errorMsg || '가공 에러'}
                      </p>
                      <button
                        onClick={() => onRemoveFile(file.id)}
                        className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 border border-rose-300 text-rose-800 font-extrabold text-[10px] uppercase tracking-wide rounded-lg transition-all cursor-pointer"
                      >
                        삭제
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Settings (Resolution quality) & Main trigger button */}
      {!isProcessing && files.some(f => f.step === 'ready' || f.step === 'need_password') && (
        <div className="space-y-5">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <h4 className="font-sans font-black text-slate-900 text-xs sm:text-sm flex items-center space-x-1.5 mb-1 uppercase tracking-tight">
              <Sparkles className="w-4 h-4 text-sky-600" />
              <span>일괄 복원 해상도 보정 프리셋 (Resolution Quality)</span>
            </h4>
            <p className="font-sans text-[11px] text-slate-500 leading-normal">
              배율이 올라갈수록 해제된 PDF 내부 폼과 글자들이 더욱 정밀하게 복원되나, 가공 속도가 소폭 조정되고 다운로드 파일 크기가 증가할 수 있습니다.
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
                  className={`text-left p-3.5 rounded-xl border font-sans cursor-pointer transition-all duration-150 relative overflow-hidden ${
                    isSelected
                      ? 'border-sky-500 bg-sky-50/70 ring-2 ring-sky-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-slate-900 text-sm">{preset.label}</span>
                    <input
                      type="radio"
                      checked={isSelected}
                      readOnly
                      className="w-4 h-4 text-sky-600 focus:ring-sky-500"
                    />
                  </div>
                  <p className="text-slate-500 mt-1.5 text-xs leading-normal">{preset.desc}</p>
                </button>
              );
            })}
          </div>

          {readyToDecryptCount > 0 ? (
            <button
              onClick={onStartBatchDecrypt}
              className="w-full flex items-center justify-center space-x-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl py-3.5 px-4 text-xs font-black uppercase tracking-wider shadow-md shadow-sky-600/20 transition-all duration-150 cursor-pointer"
            >
              <span>{readyToDecryptCount}개의 문서 일괄 잠금 해제 시작 ({readyToDecryptCount} Documents)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-center">
              <p className="text-amber-800 font-sans font-bold text-xs">
                {needPasswordCount}개의 문서에 각각 암호를 입력하여 '해제 완료 가능 대기' 상태로 전환하세요.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Completed overall screen view */}
      {completedCount > 0 && !isProcessing && (
        <div className="p-5 border border-emerald-200 bg-emerald-50/80 rounded-2xl text-center space-y-3.5">
          <p className="text-emerald-900 font-bold text-sm">
            🎉 총 {completedCount}개의 문서의 암호를 영구 해제 및 재가공 완료했습니다!
          </p>
          <div className="flex justify-center space-x-3.5">
            <button
              onClick={handleDownloadAll}
              disabled={isZipping}
              className="flex items-center space-x-2 bg-sky-600 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed hover:bg-sky-700 text-white rounded-xl py-2.5 px-5 text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm"
            >
              {isZipping ? (
                <>
                  <Loader className="w-3.5 h-3.5 animate-spin" />
                  <span>ZIP 압축 저장 중...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>{completedCount > 1 ? '해제 완료된 모든 파일 압축 저장 (ZIP)' : '해제 완료된 파일 저장'}</span>
                </>
              )}
            </button>
            <button
              onClick={onResetAll}
              className="border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-700 rounded-xl py-2.5 px-5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-2xs"
            >
              처음으로 리셋 (Reset)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FilesIconCount({ count }: { count: number }) {
  return (
    <div className="flex items-center space-x-2 font-sans">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
      </span>
      <span className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
        파일 처리 대기 리스트 ({count}개 등록됨)
      </span>
    </div>
  );
}
