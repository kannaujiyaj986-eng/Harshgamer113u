import React from 'react';
import { HelpCircle, Keyboard, Smartphone, Sparkles, X } from 'lucide-react';

interface HowToPlayModalProps {
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ onClose }) => {
  return (
    <div
      onClick={onClose}
      className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-slate-950/85 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[88vh] w-full max-w-2xl flex-col rounded-2xl border border-white/15 bg-slate-900 p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-sky-400" />
            <h2 className="font-display text-xl font-bold tracking-wider text-white">
              HOW TO PLAY CARFLY
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Guide"
            title="Close Guide"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-400/50 bg-rose-500/20 text-rose-100 hover:bg-rose-500/40 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="carfly-scroll mt-4 flex-1 space-y-4 overflow-y-auto pr-1 text-sm text-slate-300">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-white/10 bg-slate-950/75 p-4">
              <div className="flex items-center gap-2 font-display text-sm font-bold text-sky-300 mb-2">
                <Keyboard className="h-4 w-4" />
                <span>DESKTOP CONTROLS</span>
              </div>
              <ul className="space-y-1.5 text-xs">
                <li><strong className="text-white">W / ↑</strong> — Gas / Accelerate</li>
                <li><strong className="text-white">S / ↓</strong> — Brake (Hold at stop for Reverse)</li>
                <li><strong className="text-white">A / D or ← / →</strong> — Steer Left &amp; Right</li>
                <li><strong className="text-white">SPACE</strong> — Activate Nitro Boost</li>
                <li><strong className="text-white">C</strong> — Switch Camera (4 Views)</li>
                <li><strong className="text-white">R</strong> — Reset Car to Track</li>
                <li><strong className="text-white">ESC</strong> — Pause Race</li>
              </ul>
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-950/75 p-4">
              <div className="flex items-center gap-2 font-display text-sm font-bold text-emerald-300 mb-2">
                <Smartphone className="h-4 w-4" />
                <span>MOBILE LANDSCAPE CONTROLS</span>
              </div>
              <ul className="space-y-1.5 text-xs">
                <li><strong className="text-white">LEFT / RIGHT (Bottom-Left)</strong> — Smooth steering &amp; corner drifting</li>
                <li><strong className="text-white">GAS (Bottom-Right)</strong> — Smooth throttle acceleration</li>
                <li><strong className="text-white">BRAKE / REV (Bottom-Right)</strong> — Decelerate or hold to reverse</li>
                <li><strong className="text-white">NITRO (Bottom-Right)</strong> — High-speed exhaust boost</li>
              </ul>
            </div>
          </div>

          <div className="rounded-xl border border-sky-400/20 bg-sky-500/10 p-4">
            <div className="flex items-center gap-2 font-display text-sm font-bold text-white mb-1.5">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span>PRO RACING TIPS</span>
            </div>
            <p className="text-xs leading-relaxed text-slate-300">
              Steer hard at high speed to trigger a <strong className="text-cyan-300">Power Drift</strong> — drifting refills your Nitro meter faster and awards bonus coins at the finish line! Hit glowing <strong className="text-sky-300">Boost Strips</strong> and Nitro Gates on the asphalt for instant bursts of speed, upgrade your car in the <strong className="text-white">3D Garage</strong> or <strong className="text-emerald-300">Store</strong>, and conquer all 100 levels to win the <strong className="text-amber-300">Golden CARFLY Champion Car</strong>!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
