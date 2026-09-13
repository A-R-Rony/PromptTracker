import React from 'react';
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { render } from 'ink-testing-library';
import { Header } from '../../src/ui/Header.js';
import { Footer } from '../../src/ui/Footer.js';
import { SessionList } from '../../src/ui/SessionList.js';
import { SessionMetadata } from '@prompttracker/core';

describe('Prompt Lens terminal interface', () => {
  it('offers date and scope navigation without search or memory claims', () => {
    const { lastFrame, cleanup } = render(
      <>
        <Header
          projectName="All Projects"
          isAllProjects
          datePreset="all"
          dateLabel="All Dates"
          totalPrompts={3}
          totalTokens={120}
          totalCost={0.02}
        />
        <Footer currentScreen="list" />
      </>
    );

    const frame = lastFrame() ?? '';
    assert.match(frame, /Date/);
    assert.match(frame, /Scope/);
    assert.doesNotMatch(frame, /Search|\[\/\]/i);
    assert.doesNotMatch(frame, /\bRAM\b|process memory|50\s*MB/i);
    cleanup();
  });

  it('renders full project name in header without premature truncation at 20 characters', () => {
    const { lastFrame, cleanup } = render(
      <Header
        projectName="Project: PromptTracker"
        isAllProjects={false}
        datePreset="all"
        dateLabel="All Dates"
        totalPrompts={18}
        totalTokens={1782588}
        totalCost={4.0075}
      />
    );

    const frame = lastFrame() ?? '';
    assert.match(frame, /Project: PromptTracker/);
    assert.match(frame, /Est\. Tokens:/);
    assert.match(frame, /Est\. Cost:/);
    assert.doesNotMatch(frame, /PromptTr\.\.\./);
    cleanup();
  });

  it('renders prompt summary in SessionList without arbitrary 50-character truncation', () => {
    const sampleSession: SessionMetadata = {
      id: 'ag-1',
      toolSource: 'codex',
      projectName: 'Prompt Engine',
      projectPath: 'd:/PetProjects/PromptTracker',
      timestamp: '2026-09-13T12:00:00Z',
      date: '2026-09-13',
      model: 'gpt-4o',
      totalTokens: { input: 60000, output: 1083, total: 61083, isEstimated: true, source: 'estimated_heuristic' },
      estimatedCostUsd: 0.0361,
      turnCount: 2,
      hasCachedContent: false,
      ingestionState: 'metadata-only'
    };

    const { lastFrame, cleanup } = render(
      <SessionList
        sessions={[sampleSession]}
        selectedIndex={0}
        maxVisible={10}
      />
    );

    const frame = lastFrame() ?? '';
    assert.match(frame, /Prompt Engine \[PromptTracker\]/);
    assert.doesNotMatch(frame, /Prompt Engine\.\.\./);
    cleanup();
  });
});
