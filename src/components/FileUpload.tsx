import React, { useRef, useState } from 'react';
import { UploadCloud, Files, AlertTriangle } from 'lucide-react';

interface FileUploadProps {
  onFilesSelect: (filesData: { file: File; arrayBuffer: ArrayBuffer }[]) => void;
  uploadedCount: number;
  onClearAll: () => void;
  errorMsg: string | null;
}

export default function FileUpload({ onFilesSelect, uploadedCount, onClearAll, errorMsg }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = async (files: FileList) => {
    const pdfFiles = Array.from(files).filter(
      (file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    );

    if (pdfFiles.length === 0) {
      alert('선택된 유효한 PDF 파일이 없습니다.');
      return;
    }

    const loadedData: { file: File; arrayBuffer: ArrayBuffer }[] = [];
    for (const file of pdfFiles) {
      try {
        const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            if (e.target?.result instanceof ArrayBuffer) {
              resolve(e.target.result);
            } else {
              reject(new Error('파일을 읽는 도중 오류가 발생했습니다.'));
            }
          };
          reader.onerror = () => reject(reader.error);
          reader.readAsArrayBuffer(file);
        });
        loadedData.push({ file, arrayBuffer });
      } catch (err) {
        console.error('File load error for:', file.name, err);
      }
    }

    if (loadedData.length > 0) {
      onFilesSelect(loadedData);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
    e.target.value = '';
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    fileInputRef.current?.click();
  };

  return (
    <div id="file-upload-section" className="space-y-4">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleInputChange}
        accept=".pdf,application/pdf"
        multiple
        className="hidden"
      />

      {uploadedCount === 0 ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={triggerFileInput}
          className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 sm:p-12 cursor-pointer transition-all duration-300 ${
            isDragging
              ? 'border-sky-500 bg-sky-50 scale-[0.99]'
              : 'border-slate-300 hover:border-sky-500 hover:bg-sky-50/40 bg-slate-50/50'
          }`}
        >
          <div className="p-4 rounded-full bg-sky-100/80 text-sky-600 hover:scale-110 transition-transform duration-200 mb-4 border border-sky-200">
            <UploadCloud className="w-8 h-8" />
          </div>
          <div className="text-center font-sans w-full px-4">
            <p className="font-extrabold text-slate-800 text-sm sm:text-base tracking-tight uppercase">
              여러개의 PDF 파일을 선택하거나 드래그앤드롭 하세요
            </p>
            <p className="mt-2 text-xs text-slate-500">
              일괄처리 지원 • 브라우저 로컬 암호 해제 공정
            </p>
          </div>
        </div>
      ) : (
        <div className="relative border-l-4 border-sky-500 bg-sky-50/80 border border-slate-200 rounded-r-xl p-4 flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center space-x-3.5 min-w-0">
            <div className="flex-shrink-0 p-2.5 rounded-lg bg-white text-sky-600 border border-sky-200 shadow-2xs">
              <Files className="w-5.5 h-5.5" />
            </div>
            <div className="min-w-0">
              <p className="font-sans font-bold text-slate-900 truncate text-sm sm:text-base">
                {uploadedCount}개의 PDF 파일 등록됨
              </p>
              <p className="font-mono text-[11px] text-sky-600 mt-0.5 font-semibold">
                일괄 분석 준비 완료
              </p>
            </div>
          </div>
          <button
            onClick={onClearAll}
            className="flex-shrink-0 text-[11px] font-black text-slate-600 hover:text-slate-900 hover:bg-white border border-slate-200 bg-white/60 px-3 py-1.5 rounded-md transition-all duration-150 font-sans uppercase tracking-wider cursor-pointer"
          >
            모두 비우기
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-start space-x-2.5 p-3.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-800 text-xs sm:text-sm font-sans animate-shake">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
}
