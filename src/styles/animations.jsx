// Flow Animation Styles
import React from "react";

const AnimStyles = () => (
  <style>{`
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(16px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes rowSlideIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes pulseGlow {
      0%, 100% { opacity: 0.4; transform: scale(1); }
      50% { opacity: 1; transform: scale(1.4); }
    }
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    @keyframes breathe {
      0%, 100% { opacity: 0.03; }
      50% { opacity: 0.06; }
    }
    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-3px); }
    }

    .flow-card, .flow-glass {
      animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
    }
    .flow-card:hover, .flow-glass:hover {
      border-color: ${c.borderHover} !important;
      transform: translateY(-2px);
      box-shadow: 0 12px 40px rgba(0,0,0,0.15);
    }
    .flow-row {
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .flow-row:hover {
      background: ${c.surfaceAlt} !important;
      transform: translateX(2px);
    }
    .flow-row:hover td:first-child {
      background: ${c.surfaceAlt} !important;
    }
    .flow-row:active {
      transform: translateX(0) scale(0.995);
    }
    .flow-btn {
      transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .flow-btn:hover {
      transform: translateY(-1px);
      filter: brightness(1.15);
      box-shadow: 0 4px 12px ${c.bg}60;
    }
    .flow-btn:active {
      transform: translateY(0) scale(0.96);
    }
    .flow-person-card {
      animation: fadeInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .flow-person-card:hover {
      border-color: ${c.accent}40 !important;
      transform: translateY(-2px);
      box-shadow: 0 8px 24px ${c.bg}60;
    }
    .flow-phase-card {
      transition: all 0.2s ease;
    }
    .flow-phase-card:hover {
      transform: translateY(-1px) !important;
      box-shadow: 0 2px 8px ${c.bg}30;
      border-color: ${c.borderHover} !important;
    }
    .flow-phase-card:active {
      transform: translateY(0px) scale(0.99) !important;
    }
    .flow-expand {
      animation: slideDown 0.25s cubic-bezier(0.16, 1, 0.3, 1) both;
    }
    .flow-pulse {
      animation: pulseGlow 2.5s ease-in-out infinite;
    }
    .flow-float {
      animation: float 3s ease-in-out infinite;
    }
    .flow-input {
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .flow-input:focus {
      border-color: ${c.accent} !important;
      box-shadow: 0 0 0 3px ${c.accentDim}, 0 2px 8px ${c.bg}40;
    }
    .flow-stagger > * {
      animation: fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
    }
    .flow-stagger > *:nth-child(1) { animation-delay: 0s; }
    .flow-stagger > *:nth-child(2) { animation-delay: 0.05s; }
    .flow-stagger > *:nth-child(3) { animation-delay: 0.1s; }
    .flow-stagger > *:nth-child(4) { animation-delay: 0.15s; }
    .flow-stagger > *:nth-child(5) { animation-delay: 0.2s; }
    .flow-stagger > *:nth-child(6) { animation-delay: 0.25s; }
    .flow-stagger > *:nth-child(7) { animation-delay: 0.3s; }
    .flow-stagger > *:nth-child(8) { animation-delay: 0.35s; }
    .flow-stagger > *:nth-child(9) { animation-delay: 0.4s; }
    .flow-stagger > *:nth-child(10) { animation-delay: 0.45s; }

    /* Subtle background */
    .flow-bg {
      position: relative;
    }
    .flow-bg::before {
      content: '';
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background-image: 
        radial-gradient(ellipse 600px 400px at 10% 10%, ${c.accent}0C 0%, transparent 70%),
        radial-gradient(ellipse 500px 500px at 90% 90%, ${c.blue}0A 0%, transparent 70%),
        radial-gradient(ellipse 400px 300px at 50% 40%, ${c.purple}08 0%, transparent 60%);
      pointer-events: none;
      z-index: 0;
      animation: breathe 10s ease-in-out infinite;
    }
    .flow-bg::after {
      content: '';
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background-image: 
        repeating-linear-gradient(0deg, transparent, transparent 60px, ${c.border}08 60px, ${c.border}08 61px),
        repeating-linear-gradient(90deg, transparent, transparent 60px, ${c.border}08 60px, ${c.border}08 61px);
      pointer-events: none;
      z-index: 0;
    }
    .flow-bg > * {
      position: relative;
      z-index: 1;
    }

    /* Smooth page transitions */
    .flow-page {
      animation: fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    /* Hover underline animation for links */
    .flow-link {
      position: relative;
      text-decoration: none !important;
    }
    .flow-link::after {
      content: '';
      position: absolute;
      bottom: -1px;
      left: 0;
      width: 0;
      height: 1px;
      background: currentColor;
      transition: width 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .flow-link:hover::after {
      width: 100%;
    }

    /* Custom scrollbar */
    * { scrollbar-width: thin; scrollbar-color: ${c.border} transparent; }
    *::-webkit-scrollbar { width: 5px; height: 5px; }
    *::-webkit-scrollbar-track { background: transparent; }
    *::-webkit-scrollbar-thumb { background: ${c.border}; border-radius: 3px; }
    *::-webkit-scrollbar-thumb:hover { background: ${c.borderHover}; }
    ::selection { background: ${c.accentMid}; color: ${c.text}; }
    input::placeholder, textarea::placeholder { color: ${c.textDim}; opacity: 0.6; }

    /* Nav button hover */
    .flow-nav:hover {
      background: ${c.surfaceAlt} !important;
    }
  `}</style>
);

