import { describe, it } from 'node:test';
import assert from 'node:assert';
import { renderToStaticMarkup } from 'react-dom/server';
import { App } from './App';

describe('Prompt Lens web interface', () => {
  it('offers date navigation without search or memory claims', () => {
    const markup = renderToStaticMarkup(<App />);

    assert.match(markup, />TODAY</);
    assert.match(markup, />7D</);
    assert.doesNotMatch(markup, /search/i);
    assert.doesNotMatch(markup, /\bRAM\b|process memory|50\s*MB/i);
  });
});
