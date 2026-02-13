import { useState, useEffect, useRef, ReactNode, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface LazyWidgetProps {
  children: ReactNode;
  height?: string;
  className?: string;
}

export function LazyWidget({ children, height = 'h-48', className = '' }: LazyWidgetProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (!isVisible) {
    return (
      <div ref={ref} className={`${height} ${className}`}>
        <Skeleton className="w-full h-full rounded-lg" />
      </div>
    );
  }

  return <div className={className}>{children}</div>;
}
