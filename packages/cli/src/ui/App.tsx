import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import TextInput from 'ink-text-input';
import { NormalizedSession, PromptTurn, SessionStorageManager, exportSessionToMarkdown } from '@prompttracker/core';
import { filterSessionsByDate, DateFilterOptions } from '../dateFilter.js';
import { Header } from './Header.js';
import { SessionList } from './SessionList.js';
import { SessionDetail } from './SessionDetail.js';
import { DateFilterModal } from './DateFilterModal.js';
import { Footer } from './Footer.js';
import { exec } from 'child_process';

interface AppProps {
  initialSessions: NormalizedSession[];
  scopeLabel: string;
  storageManager: SessionStorageManager;
  onOpenInIDE?: (filePath: string) => void;
}

export const App: React.FC<AppProps> = ({
  initialSessions,
  scopeLabel,
  storageManager,
}) => {
  const { exit } = useApp();

  // State
  const [allSessions] = useState<NormalizedSession[]>(initialSessions);
  const [dateFilter, setDateFilter] = useState<DateFilterOptions>({ preset: 'all' });
  const [dateLabel, setDateLabel] = useState<string>('All Dates');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchActive, setIsSearchActive] = useState<boolean>(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [activePane, setActivePane] = useState<'sessions' | 'details'>('sessions');
  const [isDateModalOpen, setIsDateModalOpen] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [expandedTurns, setExpandedTurns] = useState<Set<number>>(new Set());
  const [loadedTurns, setLoadedTurns] = useState<PromptTurn[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Filtered sessions by date & search query
  const filteredSessions = useMemo(() => {
    const dateRes = filterSessionsByDate(allSessions, dateFilter);
    let list = dateRes.filtered;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((s) => {
        const matchProject = (s.projectName || '').toLowerCase().includes(q);
        const matchTool = (s.toolSource || '').toLowerCase().includes(q);
        const matchModel = (s.model || '').toLowerCase().includes(q);
        const matchTurns = s.turns?.some(
          (t) =>
            t.userPrompt.toLowerCase().includes(q) ||
            (t.assistantSummary && t.assistantSummary.toLowerCase().includes(q))
        );
        return matchProject || matchTool || matchModel || matchTurns;
      });
    }
    return list;
  }, [allSessions, dateFilter, searchQuery]);

  // Aggregate metrics
  const totalPrompts = useMemo(
    () => filteredSessions.reduce((acc, s) => acc + (s.turns?.length || 0), 0),
    [filteredSessions]
  );
  const totalTokens = useMemo(
    () => filteredSessions.reduce((acc, s) => acc + s.totalTokens.total, 0),
    [filteredSessions]
  );
  const totalCost = useMemo(
    () => filteredSessions.reduce((acc, s) => acc + s.estimatedCostUsd, 0),
    [filteredSessions]
  );

  const selectedSession = filteredSessions[selectedIndex] || null;

  // Load turns when selected session changes
  useEffect(() => {
    if (selectedSession) {
      const fullTurns = storageManager.loadFullTurns(selectedSession);
      setLoadedTurns(fullTurns);
    } else {
      setLoadedTurns([]);
    }
  }, [selectedSession, storageManager]);

  // Ensure selected index is in bounds
  useEffect(() => {
    if (selectedIndex >= filteredSessions.length && filteredSessions.length > 0) {
      setSelectedIndex(filteredSessions.length - 1);
    }
  }, [filteredSessions.length, selectedIndex]);

  // Keyboard navigation & Shortcuts
  useInput((input, key) => {
    // If date modal is open, DateFilterModal handles input
    if (isDateModalOpen) return;

    // Search input handling
    if (isSearchActive) {
      if (key.escape || key.return) {
        setIsSearchActive(false);
      }
      return;
    }

    // Global Hotkeys
    if (input === 'q' || key.escape) {
      exit();
      return;
    }

    if (input === '/') {
      setIsSearchActive(true);
      return;
    }

    if (input === 'd') {
      setIsDateModalOpen(true);
      return;
    }

    if (key.tab) {
      setActivePane((prev) => (prev === 'sessions' ? 'details' : 'sessions'));
      return;
    }

    if (input === 'f') {
      setIsFullscreen((prev) => !prev);
      return;
    }

    // Expand/collapse turn details
    if (input === ' ') {
      if (loadedTurns.length > 0) {
        setExpandedTurns((prev) => {
          const next = new Set(prev);
          if (next.size > 0) {
            next.clear();
          } else {
            loadedTurns.forEach((t) => next.add(t.turnIndex));
          }
          return next;
        });
      }
      return;
    }

    // Open session in IDE / Markdown export
    if (input === 'o' && selectedSession) {
      selectedSession.turns = loadedTurns;
      const mdPath = exportSessionToMarkdown(selectedSession);
      const cmd = process.platform === 'win32' ? `start "" "${mdPath}"` : `open "${mdPath}"`;
      exec(cmd, (err) => {
        if (err) exec(`code "${mdPath}"`);
      });
      setStatusMessage(`🔥 Opened in IDE: ${mdPath}`);
      setTimeout(() => setStatusMessage(null), 4000);
      return;
    }

    // Arrow keys & j/k navigation
    if (key.upArrow || input === 'k') {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredSessions.length - 1));
      return;
    }

    if (key.downArrow || input === 'j') {
      setSelectedIndex((prev) => (prev < filteredSessions.length - 1 ? prev + 1 : 0));
      return;
    }
  });

  const handleDatePresetSelect = (preset: 'today' | 'yesterday' | '7d' | '30d' | 'all') => {
    const res = filterSessionsByDate(allSessions, { preset });
    setDateFilter({ preset });
    setDateLabel(res.label);
    setIsDateModalOpen(false);
    setSelectedIndex(0);
  };

  const memStats = storageManager.getMemoryUsageSummary();

  return (
    <Box flexDirection="column" width="100%">
      {/* Top Header Summary */}
      <Header
        projectName={scopeLabel}
        dateLabel={dateLabel}
        totalPrompts={totalPrompts}
        totalTokens={totalTokens}
        totalCost={totalCost}
        memoryUsageMb={memStats.currentMb}
      />

      {/* Search Bar if Active or Filtered */}
      {(isSearchActive || searchQuery) && (
        <Box borderStyle="single" borderColor="cyan" paddingX={1} marginBottom={0}>
          <Text bold color="cyan">
            {'🔍 Search: '}
          </Text>
          {isSearchActive ? (
            <TextInput
              value={searchQuery}
              onChange={setSearchQuery}
              onSubmit={() => setIsSearchActive(false)}
              placeholder="Type keyword to filter prompts & projects (Press Enter to close)..."
            />
          ) : (
            <Text color="yellowBright">{`"${searchQuery}" (Press / to edit, Esc to clear)`}</Text>
          )}
        </Box>
      )}

      {/* Main Split Layout or Fullscreen Detail */}
      {isDateModalOpen ? (
        <Box justifyContent="center" marginY={1}>
          <DateFilterModal
            currentPreset={dateFilter.preset || 'all'}
            onSelectPreset={handleDatePresetSelect}
            onClose={() => setIsDateModalOpen(false)}
          />
        </Box>
      ) : isFullscreen ? (
        <SessionDetail
          session={selectedSession}
          turns={loadedTurns}
          isFocused={true}
          expandedTurns={expandedTurns}
          scrollOffset={0}
        />
      ) : (
        <Box flexDirection="row" minHeight={16}>
          <Box width="42%">
            <SessionList
              sessions={filteredSessions}
              selectedIndex={selectedIndex}
              isFocused={activePane === 'sessions'}
              maxVisible={14}
            />
          </Box>
          <Box width="58%" marginLeft={1}>
            <SessionDetail
              session={selectedSession}
              turns={loadedTurns}
              isFocused={activePane === 'details'}
              expandedTurns={expandedTurns}
              scrollOffset={0}
            />
          </Box>
        </Box>
      )}

      {/* Status Bar / Feedback */}
      {statusMessage && (
        <Box paddingX={1}>
          <Text color="greenBright" bold>
            {statusMessage}
          </Text>
        </Box>
      )}

      {/* Footer Navigation Bar */}
      <Footer
        isSearchActive={isSearchActive}
        searchQuery={searchQuery}
        isDetailsFocused={activePane === 'details'}
        isFullscreen={isFullscreen}
      />
    </Box>
  );
};
