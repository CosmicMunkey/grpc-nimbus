import test from 'node:test';
import assert from 'node:assert/strict';

import { FieldSchema } from '../../types';
import { fieldMaskPathsFromValue, FormVal, fromJson, toJson } from './formSerialization';

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

test('toJson serializes FieldMask objects as comma-separated string (protobuf JSON)', () => {
  const form: FormVal = {
    book: { title: 'Dune' },
    updateMask: { paths: ['book.title', 'author'] },
  };

  assert.equal(
    toJson(form, requestSchema),
    JSON.stringify({ book: { title: 'Dune' }, updateMask: 'book.title,author' }, null, 2),
  );
});

test('toJson serializes FieldMask with rich fields correctly as comma-separated string', () => {
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
        updateMask: 'book.title,book.genre,book.inPrint,book.pageCount,book.publisher.name,book.publisher.country,book.tags',
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

test('fromJson keeps protobuf JSON FieldMask strings intact', () => {
  assert.deepEqual(
    fromJson('{"updateMask":"book.title,author"}'),
    { updateMask: 'book.title,author' },
  );
});

test('fieldMaskPathsFromValue parses protobuf JSON FieldMask strings for the editor', () => {
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

