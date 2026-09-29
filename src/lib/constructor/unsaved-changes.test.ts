import { changedPageIds, serializeDesign } from './unsaved-changes';

const home = { id: 'home', name: 'Inicio', sections: [] };
const config = { pages: [home], theme: { color: 'blue' }, currentPageId: 'home', sections: [] };

test('editor selection and legacy mirror do not mark the design dirty', () => {
  expect(serializeDesign({ ...config, currentPageId: 'about', sections: ['mirror'] })).toBe(serializeDesign(config));
});

test('new and modified pages are marked, unchanged pages are not', () => {
  const saved = serializeDesign(config);
  expect([...changedPageIds([home, { id: 'about' }], saved)]).toEqual(['about']);
  expect([...changedPageIds([{ ...home, name: 'Home' }], saved)]).toEqual(['home']);
  expect([...changedPageIds([home], saved)]).toEqual([]);
});

test('theme changes and deleted pages remain pending globally', () => {
  expect(serializeDesign({ ...config, theme: { color: 'red' } })).not.toBe(serializeDesign(config));
  expect(serializeDesign({ ...config, pages: [] })).not.toBe(serializeDesign(config));
});

test('saving a snapshot leaves subsequent edits pending', () => {
  const submitted = serializeDesign(config);
  const edited = { ...config, pages: [home, { id: 'about' }] };
  expect(serializeDesign(edited)).not.toBe(submitted);
  expect([...changedPageIds(edited.pages, submitted)]).toEqual(['about']);
  expect([...changedPageIds(edited.pages, serializeDesign(edited))]).toEqual([]);
});
