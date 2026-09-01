import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import TextInput from 'ink-text-input';
import { NormalizedSession, PromptTurn, SessionStorageManager, exportSessionToMarkdown } from '@prompttracker/core';
import { filterSessionsByDate, DateFilterOptions } from '../dateFilter.js';
import { Header } from './Header.js';
import { SessionList } from './SessionList.js';
import { SessionDetail } from './SessionDetail.js';
import { Footer } from './Footer.js';
import { exec } from 'child_process';

interface AppProps {
  initialSessions: NormalizedSession[];
  rawAllSessions: NormalizedSession[];
  initialScopeLabel: string;
  storageManager: SessionStorageManager;
}

export const App: React.FC<AppProps> = ({
  initialSessions,
  rawAllSessions,
  initialScopeLabel,
  storageManager,
}) => {
  const { exit } = useApp();

  // Navigation Screen State
  const [currentScreen, setCurrentScreen] = useState<'list' | 'detail'>('list');
  const [isAllProjects, setIsAllProjects] = useState<boolean>(!initialScopeLabel.startsWith('Project:'));
  const [activeDatePreset, setActiveDatePreset] = useState<'today' | 'yesterday' | '7d' | '30d' | 'all'>('all');
  const [dateFilter, setDateFilter] = useState<DateFilterOptions>({ preset: 'all' });
  const [dateLabel, setDateLabel] = useState<string>('All Dates');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchActive, setIsSearchActive] = useState<boolean>(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [turnScrollIndex, setTurnScrollIndex] = useState<number>(0);
  const [expandedTurns, setExpandedTurns] = useState<Set<number>>(new Set());
  const [loadedTurns, setLoadedTurns] = useState<PromptTurn[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Active pool of sessions depending on scope toggle
  const sessionPool = isAllProjects ? rawAllSessions : initialSessions;

  // Filtered sessions
  const filteredSessions = useMemo(() => {
    const dateRes = filterSessionsByDate(sessionPool, dateFilter);
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
  }, [sessionPool, dateFilter, searchQuery]);

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

  // Keep index within bounds
  useEffect(() => {
    if (selectedIndex >= filteredSessions.length && filteredSessions.length > 0) {
      setSelectedIndex(filteredSessions.length - 1);
    }
  }, [filteredSessions.length, selectedIndex]);

  // Key navigation
  useInput((input, key) => {
    // Search input handler
    if (isSearchActive) {
      if (key.escape || key.return) {
        setIsSearchActive(false);
      }
      return;
    }

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

      if (key.upArrow || input === 'k') {
        setTurnScrollIndex((prev) => Math.max(0, prev - 1));
        return;
      }

      if (key.downArrow || input === 'j') {
        setTurnScrollIndex((prev) => Math.min(Math.max(0, loadedTurns.length - 1), prev + 1));
        return;
      }

      if (key.pageUp) {
        setTurnScrollIndex((prev) => Math.max(0, prev - 3));
        return;
      }

      if (key.pageDown) {
        setTurnScrollIndex((prev) => Math.min(Math.max(0, loadedTurns.length - 1), prev + 3));
        return;
      }

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

      if (input === 'o' && selectedSession) {
        selectedSession.turns = loadedTurns;
        const mdPath = exportSessionToMarkdown(selectedSession);
        const cmd = process.platform === 'win32' ? `start "" "${mdPath}"` : `open "${mdPath}"`;
        exec(cmd, (err) => {
          if (err) exec(`code "${mdPath}"`);
        });
        setStatusMessage(`🔥 Launched Editor with: ${mdPath}`);
        setTimeout(() => setStatusMessage(null), 4000);
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

    if (input === '/') {
      setIsSearchActive(true);
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

    // Open directly in IDE from list
    if (input === 'o' && selectedSession) {
      selectedSession.turns = loadedTurns;
      const mdPath = exportSessionToMarkdown(selectedSession);
      const cmd = process.platform === 'win32' ? `start "" "${mdPath}"` : `open "${mdPath}"`;
      exec(cmd, (err) => {
        if (err) exec(`code "${mdPath}"`);
      });
      setStatusMessage(`🔥 Launched Editor with: ${mdPath}`);
      setTimeout(() => setStatusMessage(null), 4000);
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

  const memStats = storageManager.getMemoryUsageSummary();
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
        memoryUsageMb={memStats.currentMb}
      />

      {/* Search Bar if Active or Filtered */}
      {(isSearchActive || searchQuery) && (
        <Box borderStyle="single" borderColor="cyan" paddingX={1} marginBottom={0} width="100%">
          <Text bold color="cyan">
            {'🔍 Search: '}
          </Text>
          {isSearchActive ? (
            <TextInput
              value={searchQuery}
              onChange={setSearchQuery}
              onSubmit={() => setIsSearchActive(false)}
              placeholder="Type keyword to filter prompts & projects (Press Enter to apply)..."
            />
          ) : (
            <Text color="yellowBright">{`"${searchQuery}" (Press / to edit, Esc to clear)`}</Text>
          )}
        </Box>
      )}

      {/* Main View: Screen 1 (List) OR Screen 2 (Detail) */}
      {currentScreen === 'list' ? (
        <SessionList
          sessions={filteredSessions}
          selectedIndex={selectedIndex}
          maxVisible={15}
        />
      ) : selectedSession ? (
        <SessionDetail
          session={selectedSession}
          turns={loadedTurns}
          scrollIndex={turnScrollIndex}
          expandedTurns={expandedTurns}
          maxVisibleTurns={5}
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
      <Footer
        currentScreen={currentScreen}
        isSearchActive={isSearchActive}
        searchQuery={searchQuery}
      />
    </Box>
  );
};
