import { describe, expect, it } from 'vitest';
import { listPropertiesQuerySchema } from '../../src/modules/properties/properties.schemas.js';

describe('listPropertiesQuerySchema', () => {
  it('keeps deleted properties excluded when includeDeleted is false', () => {
    expect(listPropertiesQuerySchema.parse({ includeDeleted: 'false' }).includeDeleted).toBe(false);
  });

  it('includes deleted properties only when requested', () => {
    expect(listPropertiesQuerySchema.parse({ includeDeleted: 'true' }).includeDeleted).toBe(true);
  });
});