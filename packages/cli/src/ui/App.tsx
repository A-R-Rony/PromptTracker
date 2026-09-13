import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { PromptTurn, SessionMetadata, SessionStorageManager, exportSessionToMarkdown, withTurns } from '@prompttracker/core';
import { filterSessionsByDate, DateFilterOptions } from '../dateFilter.js';
import { Header } from './Header.js';
import { SessionList } from './SessionList.js';
import { SessionDetail } from './SessionDetail.js';
import { Footer } from './Footer.js';
import { exec } from 'child_process';

interface AppProps {
  initialSessions: SessionMetadata[];
  allSessions: SessionMetadata[];
  initialScopeLabel: string;
  storageManager: SessionStorageManager;
  loadTurns?: (session: SessionMetadata) => Promise<PromptTurn[]>;
}

export const App: React.FC<AppProps> = ({
  initialSessions,
  allSessions,
  initialScopeLabel,
  storageManager,
  loadTurns
}) => {
  const { exit } = useApp();

  // Resize listener to trigger clean screen repaint
  const [, setTerminalDimensions] = useState<{ columns: number; rows: number }>({
    columns: process.stdout.columns || 80,
    rows: process.stdout.rows || 24,
  });

  useEffect(() => {
    const onResize = () => {
      if (process.stdout.isTTY) {
        process.stdout.write('\x1b[2J\x1b[H');
      }
      setTerminalDimensions({
        columns: process.stdout.columns || 80,
        rows: process.stdout.rows || 24,
      });
    };

    process.stdout.on('resize', onResize);
    return () => {
      process.stdout.off('resize', onResize);
    };
  }, []);

  // Navigation Screen State
  const [currentScreen, setCurrentScreen] = useState<'list' | 'detail'>('list');
  const [isAllProjects, setIsAllProjects] = useState<boolean>(!initialScopeLabel.startsWith('Project:'));
  const [activeDatePreset, setActiveDatePreset] = useState<'today' | 'yesterday' | '7d' | '30d' | 'all'>('all');
  const [dateFilter, setDateFilter] = useState<DateFilterOptions>({ preset: 'all' });
  const [dateLabel, setDateLabel] = useState<string>('All Dates');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [turnScrollIndex, setTurnScrollIndex] = useState<number>(0);
  const [loadedTurns, setLoadedTurns] = useState<PromptTurn[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Active pool of sessions depending on scope toggle
  const sessionPool = isAllProjects ? allSessions : initialSessions;

  // Filtered sessions
  const filteredSessions = useMemo(() => {
    return filterSessionsByDate(sessionPool, dateFilter).filtered;
  }, [sessionPool, dateFilter]);

  // Aggregate metrics
  const totalPrompts = useMemo(
    () => filteredSessions.reduce((acc, s) => acc + s.turnCount, 0),
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
    if (!selectedSession) {
      setLoadedTurns([]);
      return;
    }
    let cancelled = false;
    const loader = (async () => {
      if (loadTurns) return loadTurns(selectedSession);
      return storageManager.loadFullTurns(selectedSession);
    })();
    loader
      .then(fullTurns => { if (!cancelled) setLoadedTurns(fullTurns); })
      .catch(() => { if (!cancelled) setLoadedTurns([]); });
    return () => { cancelled = true; };
  }, [selectedSession, storageManager, loadTurns]);

  // Keep index within bounds
  useEffect(() => {
    if (selectedIndex >= filteredSessions.length && filteredSessions.length > 0) {
      setSelectedIndex(filteredSessions.length - 1);
    }
  }, [filteredSessions.length, selectedIndex]);

  const openInEditor = (session: SessionMetadata) => {
    const completeSession = withTurns(session, loadedTurns);
    const mdPath = exportSessionToMarkdown(completeSession);
    const cmd = process.platform === 'win32' ? `start "" "${mdPath}"` : `open "${mdPath}"`;
    exec(cmd, (err) => {
      if (err) exec(`code "${mdPath}"`);
    });
    setStatusMessage(`🔥 Launched Editor with full session: ${mdPath}`);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Key navigation
  useInput((input, key) => {
    // Global Quit
    if (input === 'q') {
      exit();
      return;
    }

    // Screen 2 (Detail View) Keys
    if (currentScreen === 'detail') {
      if (key.escape || input === 'b') {
        setCurrentScreen('list');
        setTurnScrollIndex(0);
        return;
      }

      if (key.return || input === 'o') {
        if (selectedSession) {
          openInEditor(selectedSession);
        }
        return;
      }

      if (key.upArrow || input === 'k') {
        setTurnScrollIndex((prev) => Math.max(0, prev - 1));
        return;
      }

      if (key.downArrow || input === 'j') {
        setTurnScrollIndex((prev) => Math.min(Math.max(0, loadedTurns.length - 1), prev + 1));
        return;
      }

      if (key.pageUp) {
        setTurnScrollIndex((prev) => Math.max(0, prev - 4));
        return;
      }

      if (key.pageDown) {
        setTurnScrollIndex((prev) => Math.min(Math.max(0, loadedTurns.length - 1), prev + 4));
        return;
      }

      return;
    }

    // Screen 1 (List View) Keys
    if (key.return) {
      if (selectedSession) {
        setCurrentScreen('detail');
        setTurnScrollIndex(0);
      }
      return;
    }

    if (input === 'a') {
      setIsAllProjects((prev) => !prev);
      setSelectedIndex(0);
      return;
    }

    // Direct Date Preset Filters: 1-5
    if (['1', '2', '3', '4', '5'].includes(input)) {
      const map: Record<string, 'today' | 'yesterday' | '7d' | '30d' | 'all'> = {
        '1': 'today',
        '2': 'yesterday',
        '3': '7d',
        '4': '30d',
        '5': 'all',
      };
      const p = map[input];
      setActiveDatePreset(p);
      const res = filterSessionsByDate(sessionPool, { preset: p });
      setDateFilter({ preset: p });
      setDateLabel(res.label);
      setSelectedIndex(0);
      return;
    }

    // Open in IDE directly from list
    if (input === 'o' && selectedSession) {
      openInEditor(selectedSession);
      return;
    }

    if (key.upArrow || input === 'k') {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredSessions.length - 1));
      return;
    }

    if (key.downArrow || input === 'j') {
      setSelectedIndex((prev) => (prev < filteredSessions.length - 1 ? prev + 1 : 0));
      return;
    }
  });

  const currentScope = isAllProjects ? 'All Projects (Global)' : initialScopeLabel;

  return (
    <Box flexDirection="column" width="100%">
      {/* Top Header Summary with Date Filter Pills */}
      <Header
        projectName={currentScope}
        isAllProjects={isAllProjects}
        datePreset={activeDatePreset}
        dateLabel={dateLabel}
        totalPrompts={totalPrompts}
        totalTokens={totalTokens}
        totalCost={totalCost}
      />

      {/* Main View: Screen 1 (List) OR Screen 2 (Detail) */}
      {currentScreen === 'list' ? (
        <SessionList
          sessions={filteredSessions}
          selectedIndex={selectedIndex}
          maxVisible={10}
        />
      ) : selectedSession ? (
        <SessionDetail
          session={selectedSession}
          turns={loadedTurns}
          scrollIndex={turnScrollIndex}
          maxVisibleTurns={8}
        />
      ) : null}

      {/* Feedback status message */}
      {statusMessage && (
        <Box paddingX={1}>
          <Text color="greenBright" bold>
            {statusMessage}
          </Text>
        </Box>
      )}

      {/* Bottom Action Footer */}
      <Footer currentScreen={currentScreen} />
    </Box>
  );
};
