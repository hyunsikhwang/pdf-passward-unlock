import React from 'react';

export default function Header() {
  return (
    <div id="app-header" className="mb-6 sm:mb-8 text-left">
      <h2 className="font-sans text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mb-2 uppercase">
        문서 암호 해제하기 <span className="text-sky-600">UNLOCK</span>
      </h2>
      <p className="font-sans text-sm text-slate-600 leading-relaxed max-w-md">
        PDF 파일의 보안 제한을 영구적으로 제거합니다. 모든 업로드 및 복원 작업은 사용자 브라우저 내에서 100% 로컬로 안전하게 수행됩니다.
      </p>
    </div>
  );
}
