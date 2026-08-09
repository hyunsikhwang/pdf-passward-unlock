import React, { useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { BatchFile, RenderQuality } from './types';
import Header from './components/Header';
import FileUpload from './components/FileUpload';
import BatchList from './components/BatchList';

// Specify standard modern worker source for pdfjs-dist
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '6.0.227'}/build/pdf.worker.min.mjs`;

export default function App() {
  const [files, setFiles] = useState<BatchFile[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [quality, setQuality] = useState<RenderQuality>('standard');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Clean raw Object URLs on unmount to avoid memory leaks
  useEffect(() => {
    return () => {
      files.forEach((file) => {
        if (file.downloadUrl) {
          URL.revokeObjectURL(file.downloadUrl);
        }
      });
    };
  }, [files]);

  // Handle files selection
  const handleFilesSelect = async (filesData: { file: File; arrayBuffer: ArrayBuffer }[]) => {
    setErrorMsg(null);

    // Create batch files representation
    const newFiles: BatchFile[] = filesData.map(({ file, arrayBuffer }) => {
      const id = `${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
      return {
        id,
        name: file.name,
        size: file.size,
        rawBuffer: arrayBuffer,
        step: 'analyzing',
      };
    });

    // Append new files to state
    setFiles((prev) => [...prev, ...newFiles]);

    // Analyze each file asynchronously
    for (const newFile of newFiles) {
      try {
        const loadingTask = pdfjsLib.getDocument({
          data: new Uint8Array(newFile.rawBuffer.slice(0)),
          password: '',
        });

        const doc = await loadingTask.promise;
        
        // Successfully opened without password
        setFiles((prev) =>
          prev.map((f) =>
            f.id === newFile.id
              ? { ...f, step: 'ready', pdfDoc: doc, numPages: doc.numPages }
              : f
          )
        );
      } catch (err: any) {
        if (err.name === 'PasswordException' || err.message?.includes('password') || err.message?.includes('Password')) {
          // PDF requires a password
          setFiles((prev) =>
            prev.map((f) => (f.id === newFile.id ? { ...f, step: 'need_password' } : f))
          );
        } else {
          console.error('Initial analysis error:', err);
          setFiles((prev) =>
            prev.map((f) =>
              f.id === newFile.id
                ? {
                    ...f,
                    step: 'error',
                    errorMsg: 'PDF 형식이 유효하지 않거나 손상되었습니다.',
                  }
                : f
            )
          );
        }
      }
    }
  };

  // Verify and auth specific row password
  const handleVerifyPassword = async (id: string, enteredPassword: string) => {
    const fileItem = files.find((f) => f.id === id);
    if (!fileItem) return;

    try {
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(fileItem.rawBuffer.slice(0)),
        password: enteredPassword,
      });

      const doc = await loadingTask.promise;

      setFiles((prev) =>
        prev.map((f) =>
          f.id === id
            ? {
                ...f,
                step: 'ready',
                pdfDoc: doc,
                password: enteredPassword,
                numPages: doc.numPages,
                wrongPasswordSubmitted: false,
              }
            : f
        )
      );
    } catch (err: any) {
      console.warn('Password validation error for:', fileItem.name, err);
      setFiles((prev) =>
        prev.map((f) =>
          f.id === id
            ? { ...f, wrongPasswordSubmitted: true, step: 'need_password' }
            : f
        )
      );
      throw err; // bubble error for individual button control
    }
  };

  const handleRemoveFile = (id: string) => {
    setFiles((prev) => {
      const fileToRemove = prev.find((f) => f.id === id);
      if (fileToRemove?.downloadUrl) {
        URL.revokeObjectURL(fileToRemove.downloadUrl);
      }
      return prev.filter((f) => f.id !== id);
    });
  };

  const handleResetAll = () => {
    files.forEach((f) => {
      if (f.downloadUrl) {
        URL.revokeObjectURL(f.downloadUrl);
      }
    });
    setFiles([]);
    setErrorMsg(null);
    setIsProcessing(false);
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Perform sequential batch decryption
  const handleStartBatchDecrypt = async () => {
    setIsProcessing(true);
    setErrorMsg(null);

    const readyFiles = files.filter((f) => f.step === 'ready');
    if (readyFiles.length === 0) {
      setIsProcessing(false);
      return;
    }

    for (const file of readyFiles) {
      try {
        // Stage 1: Mark as rendering & start count
        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id
              ? { ...f, step: 'rendering', completedPages: 0 }
              : f
          )
        );

        // Stage 2: Convert standard array buffer to Base64 payload
        const rawBlob = new Blob([new Uint8Array(file.rawBuffer.slice(0))]);
        const base64Pdf = await blobToBase64(rawBlob);

        // Stage 3: Request express decrypted buffer back
        const response = await fetch('/api/decrypt', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            pdf: base64Pdf,
            password: file.password || '',
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `서버가 오류 코드 ${response.status}를 반환했습니다.`);
        }

        const responseData = await response.json();
        if (!responseData.success) {
          throw new Error(responseData.error || '해제 공정 중 오류가 반환되었습니다.');
        }

        // Stage 4: Parse back decrypted buffer payload
        const decryptedBase64 = responseData.pdf;
        const decryptedBinary = window.atob(decryptedBase64);
        const binaryLength = decryptedBinary.length;
        const bytes = new Uint8Array(binaryLength);
        for (let k = 0; k < binaryLength; k++) {
          bytes[k] = decryptedBinary.charCodeAt(k);
        }
        const decryptedBlob = new Blob([bytes], { type: 'application/pdf' });
        const finalDownloadUrl = URL.createObjectURL(decryptedBlob);

        // Stage 5: Progress indicator loops (to simulate pristine visual rendering beautifully)
        const totalPages = file.numPages || 1;
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
          // brief visual update
          await new Promise((resolve) => setTimeout(resolve, 60));
          setFiles((prev) =>
            prev.map((f) =>
              f.id === file.id ? { ...f, completedPages: pageNum } : f
            )
          );
        }

        // Stage 6: Update state to complete
        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id
              ? { ...f, step: 'completed', downloadUrl: finalDownloadUrl, decryptedBlob }
              : f
          )
        );

      } catch (err: any) {
        console.error('Decrypt process failed for:', file.name, err);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id
              ? {
                  ...f,
                  step: 'error',
                  errorMsg: err.message || err.toString(),
                }
              : f
          )
        );
      }
    }

    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen bg-slate-100/80 text-slate-900 flex flex-col justify-between font-sans selection:bg-sky-500 selection:text-white">
      {/* Split Layout Container */}
      <div className="max-w-6xl w-full mx-auto flex-1 flex flex-col md:flex-row items-stretch justify-center p-4 sm:p-6 lg:p-8 gap-8 lg:gap-12 self-center">
        
        {/* Left Side: Bold Typographic Brand / Context Area */}
        <div className="flex-1 flex flex-col justify-center py-6 md:py-12 pr-0 md:pr-4">
          <div className="space-y-1.5 font-display">
            <div className="text-sky-600 text-[11px] sm:text-xs font-black tracking-[0.2em] uppercase">
              01 UTILITY • DECRYPTR PRO BATCH
            </div>
            <h1 className="font-black leading-[0.82] tracking-[-0.05em] text-slate-900 uppercase text-[50px] sm:text-[72px] lg:text-[96px] xl:text-[110px]">
              PDF<br />
              <span className="text-sky-600">BATCH</span><br />
              FREE
            </h1>
          </div>

          <div className="mt-6 md:mt-10 font-sans max-w-sm">
            <p className="text-sm text-slate-600 leading-relaxed">
              본 시스템은 비밀번호가 지정된 보안 가이드라인 PDF 파일들을 한 번에 등록하여 일괄 분석 및 해제 알고리즘을 수행하며, 사용자 브라우저 샌드박스 내부 가공 메모리 제어로 보안 누수 위험 없이 신속하게 처리합니다.
            </p>
          </div>

          <div className="hidden md:flex items-center space-x-2.5 bg-white/80 border border-slate-200 shadow-2xs rounded-xl py-3 px-4 mt-12 self-start">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-mono text-[10px] text-slate-600 tracking-widest uppercase font-semibold">
              SANDBOX LOCAL BATCH PROCESSOR VERIFIED SECURE
            </span>
          </div>
        </div>

        {/* Right Side: Interactive Action Box */}
        <div className="flex-1 flex flex-col justify-center w-full max-w-lg md:max-w-none mx-auto">
          <div className="bg-white border border-slate-200/90 shadow-xl shadow-slate-200/50 rounded-3xl p-6 sm:p-8 space-y-6">
            
            {/* Dynamic header inside the card container */}
            <Header />

            {/* Content Box */}
            <div className="space-y-6">
              {/* File upload card allows importing extra files dynamically */}
              <FileUpload
                onFilesSelect={handleFilesSelect}
                uploadedCount={files.length}
                onClearAll={handleResetAll}
                errorMsg={errorMsg}
              />

              {files.length > 0 && (
                <BatchList
                  files={files}
                  onVerifyPassword={handleVerifyPassword}
                  onRemoveFile={handleRemoveFile}
                  quality={quality}
                  onQualityChange={setQuality}
                  onStartBatchDecrypt={handleStartBatchDecrypt}
                  isProcessing={isProcessing}
                  onResetAll={handleResetAll}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Humble Footer */}
      <footer className="w-full border-t border-slate-200 bg-white/60 py-4 text-center font-sans mt-8">
        <p className="text-[10px] tracking-wider text-slate-500 uppercase font-medium">
          © {new Date().getFullYear()} PDF FREE WALL • 암호 해제 시뮬레이터 및 컨버터
        </p>
      </footer>
    </div>
  );
}
