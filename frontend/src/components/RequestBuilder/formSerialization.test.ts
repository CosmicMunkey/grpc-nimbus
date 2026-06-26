import test from 'node:test';
import assert from 'node:assert/strict';

import { FieldSchema } from '../../types';
import { collectPopulatedPaths, fieldMaskPathsFromValue, FormVal, fromJson, toJson } from './formSerialization';


const requestSchema: FieldSchema[] = [
  {
    name: 'book',
    jsonName: 'book',
    number: 1,
    type: 'message',
    isRepeated: false,
    isMap: false,
    fields: [
      {
        name: 'title',
        jsonName: 'title',
        number: 1,
        type: 'string',
        isRepeated: false,
        isMap: false,
      },
      {
        name: 'genre',
        jsonName: 'genre',
        number: 2,
        type: 'enum',
        isRepeated: false,
        isMap: false,
        enumValues: [
          { name: 'BOOK_GENRE_UNSPECIFIED', number: 0 },
          { name: 'BOOK_GENRE_FICTION', number: 1 },
          { name: 'BOOK_GENRE_NON_FICTION', number: 2 },
          { name: 'BOOK_GENRE_BIOGRAPHY', number: 3 },
        ],
      },
      {
        name: 'in_print',
        jsonName: 'inPrint',
        number: 3,
        type: 'bool',
        isRepeated: false,
        isMap: false,
      },
      {
        name: 'page_count',
        jsonName: 'pageCount',
        number: 4,
        type: 'int64',
        isRepeated: false,
        isMap: false,
      },
      {
        name: 'publisher',
        jsonName: 'publisher',
        number: 5,
        type: 'message',
        isRepeated: false,
        isMap: false,
        fields: [
          {
            name: 'name',
            jsonName: 'name',
            number: 1,
            type: 'string',
            isRepeated: false,
            isMap: false,
          },
          {
            name: 'country',
            jsonName: 'country',
            number: 2,
            type: 'string',
            isRepeated: false,
            isMap: false,
          },
        ],
      },
      {
        name: 'tags',
        jsonName: 'tags',
        number: 6,
        type: 'string',
        isRepeated: false,
        isMap: true,
      },
    ],
  },
  {
    name: 'update_mask',
    jsonName: 'updateMask',
    number: 2,
    type: 'message',
    isRepeated: false,
    isMap: false,
    isFieldMask: true,
    fields: [
      {
        name: 'paths',
        jsonName: 'paths',
        number: 1,
        type: 'string',
        isRepeated: true,
        isMap: false,
      },
    ],
  },
];

test('toJson serializes FieldMask objects as JSON object with paths array (jsonpb format)', () => {
  const form: FormVal = {
    book: { title: 'Dune' },
    updateMask: { paths: ['book.title', 'author'] },
  };

  assert.equal(
    toJson(form, requestSchema),
    JSON.stringify({ book: { title: 'Dune' }, updateMask: { paths: ['book.title', 'author'] } }, null, 2),
  );
});

test('toJson serializes FieldMask with rich fields correctly as JSON object with paths array', () => {
  const form: FormVal = {
    book: {
      title: 'Dune',
      genre: 'BOOK_GENRE_FICTION',
      inPrint: true,
      pageCount: 600,
      publisher: {
        name: 'Chilton Books',
        country: 'US',
      },
      tags: { 'sci-fi': 'classic' },
    },
    updateMask: {
      paths: [
        'book.title',
        'book.genre',
        'book.inPrint',
        'book.pageCount',
        'book.publisher.name',
        'book.publisher.country',
        'book.tags',
      ],
    },
  };

  assert.equal(
    toJson(form, requestSchema),
    JSON.stringify(
      {
        book: {
          title: 'Dune',
          genre: 'BOOK_GENRE_FICTION',
          inPrint: true,
          pageCount: 600,
          publisher: {
            name: 'Chilton Books',
            country: 'US',
          },
          tags: { 'sci-fi': 'classic' },
        },
        updateMask: { paths: ['book.title', 'book.genre', 'book.inPrint', 'book.pageCount', 'book.publisher.name', 'book.publisher.country', 'book.tags'] },
      },
      null,
      2,
    ),
  );
});

test('toJson omits empty FieldMask values', () => {
  const form: FormVal = {
    book: { title: 'Dune' },
    updateMask: { paths: [] },
  };

  assert.equal(
    toJson(form, requestSchema),
    JSON.stringify({ book: { title: 'Dune' } }, null, 2),
  );
});

test('fromJson keeps JSON object FieldMask format intact for round-trip', () => {
  assert.deepEqual(
    fromJson('{"updateMask":{"paths":["book.title","author"]}}'),
    { updateMask: { paths: ['book.title', 'author'] } },
  );
});

test('fieldMaskPathsFromValue parses both paths-array and legacy comma-string formats', () => {
  assert.deepEqual(fieldMaskPathsFromValue({ paths: ['book.title', 'author'] }), ['book.title', 'author']);
  // Legacy: comma-string (for backwards-compat with saved requests from old versions)
  assert.deepEqual(fieldMaskPathsFromValue('book.title, author'), ['book.title', 'author']);
});

test('toJson maps wrapper types to their primitive values', () => {
  const wrapperSchema: FieldSchema[] = [
    {
      name: 'active',
      jsonName: 'active',
      number: 1,
      type: 'bool_value',
      isRepeated: false,
      isMap: false,
    },
    {
      name: 'title',
      jsonName: 'title',
      number: 2,
      type: 'string_value',
      isRepeated: false,
      isMap: false,
    },
    {
      name: 'count',
      jsonName: 'count',
      number: 3,
      type: 'int32_value',
      isRepeated: false,
      isMap: false,
    }
  ];

  const form: FormVal = {
    active: true,
    title: 'Hello',
    count: 123,
  };

  assert.equal(
    toJson(form, wrapperSchema),
    JSON.stringify({ active: true, title: 'Hello', count: 123 }, null, 2),
  );
});

// ─── collectPopulatedPaths tests (AIP-134 snake_case paths) ──────────────────

// Schema with fields whose name (snake_case) and jsonName (camelCase) differ,
// to explicitly verify that paths use f.name, not f.jsonName.
const updateBookSchema: FieldSchema[] = [
  {
    name: 'book',
    jsonName: 'book',
    number: 1,
    type: 'message',
    isRepeated: false,
    isMap: false,
    fields: [
      {
        name: 'title',
        jsonName: 'title',
        number: 1,
        type: 'string',
        isRepeated: false,
        isMap: false,
      },
      {
        // proto name is snake_case, JSON name is camelCase
        name: 'page_count',
        jsonName: 'pageCount',
        number: 2,
        type: 'int32',
        isRepeated: false,
        isMap: false,
      },
      {
        name: 'in_print',
        jsonName: 'inPrint',
        number: 3,
        type: 'bool',
        isRepeated: false,
        isMap: false,
      },
      {
        name: 'publisher',
        jsonName: 'publisher',
        number: 4,
        type: 'message',
        isRepeated: false,
        isMap: false,
        fields: [
          {
            name: 'publisher_name',
            jsonName: 'publisherName',
            number: 1,
            type: 'string',
            isRepeated: false,
            isMap: false,
          },
        ],
      },
    ],
  },
  {
    // The FieldMask field itself must be skipped when collecting paths.
    name: 'update_mask',
    jsonName: 'updateMask',
    number: 2,
    type: 'message',
    isRepeated: false,
    isMap: false,
    isFieldMask: true,
    fields: [{ name: 'paths', jsonName: 'paths', number: 1, type: 'string', isRepeated: true, isMap: false }],
  },
];

test('collectPopulatedPaths uses snake_case proto field names (AIP-134)', () => {
  const form: FormVal = {
    // Form keys are jsonName (camelCase), but paths must be snake_case.
    book: {
      title: 'Dune',
      pageCount: 412,
      inPrint: true,
    },
    updateMask: { paths: [] },
  };

  const paths = collectPopulatedPaths(form, updateBookSchema);
  assert.deepEqual(paths, ['book.title', 'book.page_count', 'book.in_print']);
});

test('collectPopulatedPaths emits nested snake_case paths for sub-messages', () => {
  const form: FormVal = {
    book: {
      title: 'Dune',
      publisher: { publisherName: 'Chilton Books' },
    },
    updateMask: null,
  };

  const paths = collectPopulatedPaths(form, updateBookSchema);
  assert.deepEqual(paths, ['book.title', 'book.publisher.publisher_name']);
});

test('collectPopulatedPaths skips isFieldMask fields', () => {
  const form: FormVal = {
    book: { title: 'Dune' },
    // updateMask is populated, but must be excluded because isFieldMask=true.
    updateMask: { paths: ['book.title'] },
  };

  const paths = collectPopulatedPaths(form, updateBookSchema);
  assert.deepEqual(paths, ['book.title']);
});

test('collectPopulatedPaths excludes zero/default values by default (clearing semantics)', () => {
  const form: FormVal = {
    book: {
      title: 'Dune',
      pageCount: 0,   // default — excluded unless includeDefaults=true
      inPrint: false, // default — excluded unless includeDefaults=true
    },
    updateMask: null,
  };

  const paths = collectPopulatedPaths(form, updateBookSchema);
  assert.deepEqual(paths, ['book.title']);
});

test('collectPopulatedPaths includes zero/default values when includeDefaults=true', () => {
  const form: FormVal = {
    book: {
      title: 'Dune',
      pageCount: 0,   // included because includeDefaults=true
      inPrint: false, // included because includeDefaults=true
    },
    updateMask: null,
  };

  const paths = collectPopulatedPaths(form, updateBookSchema, '', new Set(), true);
  assert.deepEqual(paths, ['book.title', 'book.page_count', 'book.in_print']);
});
