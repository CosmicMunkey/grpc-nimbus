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

test('toJson serializes FieldMask objects as protobuf JSON strings', () => {
  const form: FormVal = {
    book: { title: 'Dune' },
    updateMask: { paths: ['book.title', 'author'] },
  };

  assert.equal(
    toJson(form, requestSchema),
    JSON.stringify({ book: { title: 'Dune' }, updateMask: 'book.title,author' }, null, 2),
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
