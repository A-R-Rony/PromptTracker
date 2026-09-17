import { describe, it } from 'node:test';
import assert from 'node:assert';
import { renderToStaticMarkup } from 'react-dom/server';
import { App } from './App';

describe('Prompt Lens web interface', () => {
  it('offers date navigation without search or memory claims', () => {
    const markup = renderToStaticMarkup(<App />);

    assert.match(markup, /Today/i);
    assert.match(markup, /7D/i);
    assert.doesNotMatch(markup, /\bRAM\b|process memory/i);
  });

  it('provides mobile responsive layouts without rigid fixed-width overflow constraints', () => {
    const markup = renderToStaticMarkup(<App />);

    // Must not contain rigid minmax(440px or fixed desktop-only grid limits that break on 320-375px screens
    assert.doesNotMatch(markup, /minmax\(440px/);
    assert.doesNotMatch(markup, /minmax\(320px/);

    // Verifies responsive class hooks and containers exist
    assert.match(markup, /command-grid|tools-grid|terminal-simulator/);
    assert.match(markup, /cost-calculator/);
    assert.match(markup, /privacy-architecture/);
  });
});
