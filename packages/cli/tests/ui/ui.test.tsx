import React from 'react';
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { render } from 'ink-testing-library';
import { Header } from '../../src/ui/Header.js';
import { Footer } from '../../src/ui/Footer.js';

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
});
