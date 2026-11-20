import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let readable = 'حدث خطأ غير متوقع أثناء معالجة البيانات.';
    try {
      const parsed = JSON.parse(error.message) as { error?: string; operationType?: string };
      if (parsed && parsed.error) {
        if (parsed.error.toLowerCase().includes('quota exceeded')) {
          readable = 'تم بلوغ الحد اليومي المجاني لقاعدة البيانات. يرجى المحاولة لاحقاً.';
        } else if (parsed.error.toLowerCase().includes('permission')) {
          readable = 'تعذر إتمام العملية بسبب صلاحيات الوصول. يرجى تسجيل الدخول بحساب موثق والمحاولة مجدداً.';
        } else {
          readable = 'تعذر الاتصال بقاعدة البيانات حالياً. يرجى المحاولة مجدداً.';
        }
      }
    } catch {
      if (error.message) {
        readable = error.message;
      }
    }
    return { hasError: true, message: readable };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught application error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          dir="rtl"
          className="min-h-screen bg-[#09090B] text-zinc-100 flex items-center justify-center p-6"
        >
          <div className="max-w-md w-full rounded-xl border border-zinc-800 bg-[#131316] p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-[#DC2626]/15 border border-[#DC2626]/30 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6 text-[#DC2626]" />
            </div>
            <h1 className="font-display text-xl font-bold text-white">
              تعذر إتمام الطلب
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed">{this.state.message}</p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, message: '' })}
              className="min-h-[42px] inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] text-xs font-bold text-white transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>إعادة المحاولة</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
