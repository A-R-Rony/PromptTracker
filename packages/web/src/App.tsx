import React from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { TerminalSimulator } from './components/TerminalSimulator';
import { ToolScannersGrid } from './components/ToolScannersGrid';
import { CostCalculator } from './components/CostCalculator';
import { PrivacyArchitecture } from './components/PrivacyArchitecture';
import { SideNavigation } from './components/SideNavigation';
import { Footer } from './components/Footer';

export const App: React.FC = () => {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <SideNavigation />
      <main style={{ flex: 1 }}>
        <Hero />
        <TerminalSimulator />
        <ToolScannersGrid />
        <CostCalculator />
        <PrivacyArchitecture />
      </main>
      <Footer />
    </div>
  );
};
