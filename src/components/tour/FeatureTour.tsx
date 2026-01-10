import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export interface TourStep {
  id: string;
  target: string; // CSS selector
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  route?: string; // Optional route to navigate to
}

interface FeatureTourProps {
  steps: TourStep[];
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function FeatureTour({ steps, isOpen, onClose, onComplete }: FeatureTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });

  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  const updatePosition = useCallback(() => {
    if (!step) return;

    const target = document.querySelector(step.target);
    if (target) {
      const rect = target.getBoundingClientRect();
      setTargetRect(rect);

      // Calculate tooltip position
      const tooltipWidth = 360;
      const tooltipHeight = 200;
      const padding = 16;
      const offset = 12;

      let top = 0;
      let left = 0;

      const position = step.position || 'bottom';

      switch (position) {
        case 'top':
          top = rect.top - tooltipHeight - offset;
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
          break;
        case 'bottom':
          top = rect.bottom + offset;
          left = rect.left + rect.width / 2 - tooltipWidth / 2;
          break;
        case 'left':
          top = rect.top + rect.height / 2 - tooltipHeight / 2;
          left = rect.left - tooltipWidth - offset;
          break;
        case 'right':
          top = rect.top + rect.height / 2 - tooltipHeight / 2;
          left = rect.right + offset;
          break;
      }

      // Keep tooltip in viewport
      left = Math.max(padding, Math.min(left, window.innerWidth - tooltipWidth - padding));
      top = Math.max(padding, Math.min(top, window.innerHeight - tooltipHeight - padding));

      setTooltipPosition({ top, left });
    } else {
      setTargetRect(null);
    }
  }, [step]);

  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    const handleResize = () => updatePosition();
    const handleScroll = () => updatePosition();

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);

    // Observe DOM changes
    const observer = new MutationObserver(updatePosition);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
      observer.disconnect();
    };
  }, [isOpen, currentStep, updatePosition]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999]">
      {/* Overlay with spotlight effect */}
      <div className="absolute inset-0 bg-black/60 transition-opacity duration-300" />
      
      {/* Spotlight cutout */}
      {targetRect && (
        <div
          className="absolute transition-all duration-300 ease-out"
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)',
            borderRadius: '8px',
            pointerEvents: 'none',
          }}
        >
          {/* Animated border */}
          <div className="absolute inset-0 rounded-lg border-2 border-primary animate-pulse" />
        </div>
      )}

      {/* Tooltip Card */}
      <Card
        className={cn(
          "absolute w-[360px] shadow-2xl transition-all duration-300 ease-out",
          "border-primary/20 bg-card"
        )}
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left,
        }}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">{step?.title}</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleSkip}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Schritt {currentStep + 1} von {steps.length}</span>
          </div>
        </CardHeader>

        <CardContent className="pb-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {step?.content}
          </p>
        </CardContent>

        <CardFooter className="flex flex-col gap-3 pt-0">
          <Progress value={progress} className="h-1" />
          
          <div className="flex items-center justify-between w-full">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="text-muted-foreground"
            >
              Tour überspringen
            </Button>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrev}
                disabled={currentStep === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Zurück
              </Button>
              <Button size="sm" onClick={handleNext}>
                {currentStep === steps.length - 1 ? (
                  'Tour beenden'
                ) : (
                  <>
                    Weiter
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>,
    document.body
  );
}
