import { MemoryManager } from '../src/memory-manager';

describe('Central memory backups', () => {
  describe('buildBackupName', () => {
    test('formats as ddmmyyyy_memory.db', () => {
      expect(MemoryManager.buildBackupName(new Date(2026, 0, 5))).toBe('05012026_memory.db');
      expect(MemoryManager.buildBackupName(new Date(2026, 11, 31))).toBe('31122026_memory.db');
    });
  });

  describe('parseBackupName', () => {
    test('parses valid backup names', () => {
      const date = MemoryManager.parseBackupName('23082026_memory.db');
      expect(date).toEqual(new Date(2026, 7, 23));
    });

    test('rejects invalid names', () => {
      expect(MemoryManager.parseBackupName('random.db')).toBeNull();
      expect(MemoryManager.parseBackupName('memory.db')).toBeNull();
      expect(MemoryManager.parseBackupName('99202026_memory.db')).toBeNull();
    });
  });

  describe('selectBackupsToPrune', () => {
    const names = [
      '01012026_memory.db',
      '02012026_memory.db',
      '03012026_memory.db',
      '04012026_memory.db',
    ];

    test('keeps the newest maxKeep backups', () => {
      const stale = MemoryManager.selectBackupsToPrune(names, 2);
      expect(stale).toEqual(['01012026_memory.db', '02012026_memory.db']);
    });

    test('returns nothing when under the limit', () => {
      expect(MemoryManager.selectBackupsToPrune(names, 10)).toEqual([]);
    });

    test('ignores files without valid backup names', () => {
      const withNoise = [...names, 'notes.txt', 'memory.db'];
      const stale = MemoryManager.selectBackupsToPrune(withNoise, 1);
      expect(stale).toEqual(['01012026_memory.db', '02012026_memory.db', '03012026_memory.db']);
    });

    test('handles empty input', () => {
      expect(MemoryManager.selectBackupsToPrune([], 7)).toEqual([]);
    });
  });
});
