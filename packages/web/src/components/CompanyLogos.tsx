import React from 'react';

export const CompanyLogos = {
  GoogleGemini: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 24C12 17.3726 6.62742 12 0 12C6.62742 12 12 6.62742 12 0C12 6.62742 17.3726 12 24 12C17.3726 12 12 17.3726 12 24Z" fill="url(#gemini_grad)" />
      <defs>
        <linearGradient id="gemini_grad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1BA1E3" />
          <stop offset="0.5" stopColor="#5474ED" />
          <stop offset="1" stopColor="#C465DB" />
        </linearGradient>
      </defs>
    </svg>
  ),
  Anthropic: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M13.8 3L22 21H17.4L15.8 17.4H8.2L6.6 21H2L10.2 3H13.8ZM12 8.7L9.6 13.9H14.4L12 8.7Z" fill="#D97706" />
    </svg>
  ),
  OpenAI: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#10A37F' }}>
      <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.5045 4.5045 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.6667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0743a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.4593a.7948.7948 0 0 0-.3927.6813l-.0048 6.7224zm1.1448-2.6074l2.548-1.472a.79.79 0 0 1 .7901 0l2.548 1.472v2.944a.79.79 0 0 1-.7901 0l-2.548-1.472a.79.79 0 0 1-.7901 0l-2.548-1.472v-2.944z" />
    </svg>
  ),
  Kiro: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="6" fill="#F59E0B" />
      <path d="M7 6H10.5V11L14.5 6H18L13 12L18.5 18H14.5L10.5 13V18H7V6Z" fill="#090D16" />
    </svg>
  ),
  OpenCode: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="6" fill="#F43F5E" />
      <path d="M10 8L6 12L10 16M14 8L18 12L14 16" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  PromptLensLogo: () => (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="logo_bg" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00F2FE" />
          <stop offset="1" stopColor="#00F5A0" />
        </linearGradient>
        <linearGradient id="lens_glass" x1="5" y1="5" x2="19" y2="19" gradientUnits="userSpaceOnUse">
          <stop stopColor="#38BDF8" stopOpacity="0.4" />
          <stop offset="1" stopColor="#00F2FE" stopOpacity="0.1" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="8" stroke="url(#logo_bg)" strokeWidth="2.5" fill="url(#lens_glass)" />
      <path d="M18 18L24 24" stroke="url(#logo_bg)" strokeWidth="3" strokeLinecap="round" />
      <path d="M9 12H15M12 9V15" stroke="#00F2FE" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  CopyIcon: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
  ),
  CheckIcon: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
  ),
  ShieldIcon: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00F2FE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
    </svg>
  ),
  ZapIcon: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FACC15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
    </svg>
  ),
  DatabaseIcon: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00F5A0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
    </svg>
  )
};
