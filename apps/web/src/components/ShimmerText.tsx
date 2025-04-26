"use client";

interface ShimmerTextProps {
  text?: string;
  visible?: boolean;
}

export function ShimmerText({
  text = "Thinking",
  visible = true
}: ShimmerTextProps) {
  if (!visible) return null;

  return (
    <div className="my-2 pl-2">
      <div className="shimmer-text text-[15px] text-gray-800 font-medium">
        {text}
      </div>
      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: -200px 0;
          }
          100% {
            background-position: 200px 0;
          }
        }
        .shimmer-text {
          background: linear-gradient(
            90deg,
            rgba(80, 80, 90, 0.4) 15%, 
            rgba(255, 255, 255, 1) 25%,
            rgba(80, 80, 90, 0.4) 35%
          );
          background-size: 400px 100%;
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 1.8s infinite linear;
          display: inline-block;
          letter-spacing: 0.01em;
        }
      `}</style>
    </div>
  );
}
