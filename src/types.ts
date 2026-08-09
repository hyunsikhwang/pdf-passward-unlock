export interface FileDetail {
  name: string;
  size: number;
  type: string;
  lastModified: number;
}

export type DecryptionStep = 
  | 'idle' 
  | 'analyzing' 
  | 'need_password' 
  | 'ready' 
  | 'rendering' 
  | 'completed' 
  | 'error';

export interface PageRenderStatus {
  pageNumber: number;
  status: 'pending' | 'rendering' | 'done' | 'failed';
  thumbnailUrl?: string;
}

export interface BatchFile {
  id: string;
  name: string;
  size: number;
  rawBuffer: ArrayBuffer;
  step: DecryptionStep;
  password?: string;
  pdfDoc?: any;
  numPages?: number;
  completedPages?: number;
  errorMsg?: string | null;
  downloadUrl?: string | null;
  wrongPasswordSubmitted?: boolean;
  decryptedBlob?: Blob;
}

export type RenderQuality = 'draft' | 'standard' | 'high' | 'ultra';

export const QUALITY_PRESETS: Record<RenderQuality, { scale: number; label: string; desc: string }> = {
  draft: { scale: 1.0, label: '일반 (1.0x)', desc: '가장 빠른 속도, 작은 파일 크기' },
  standard: { scale: 1.5, label: '보통 (1.5x)', desc: '화질과 용량의 최적 균형 (기본 권장)' },
  high: { scale: 2.0, label: '고화질 (2.0x)', desc: '선명한 텍스트, 모니터 가독성 추천' },
  ultra: { scale: 3.0, label: '초고화질 (3.0x)', desc: '인쇄용 선명도, 상대적으로 큰 파일 크기' },
};
