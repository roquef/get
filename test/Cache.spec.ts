import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import * as sanitize from 'sanitize-filename';

import { Cache } from '../src/Cache';

describe('Cache', () => {
  let cacheDir: string;
  let cache: Cache;

  const dummyUrl = 'dummy://';
  const sanitizedDummyUrl = sanitize(dummyUrl);

  beforeEach(async () => {
    cacheDir = await fs.mkdtemp(path.resolve(os.tmpdir(), 'electron-download-spec-'));
    cache = new Cache(cacheDir);
  });

  afterEach(() => fs.remove(cacheDir));

  describe('getPathForFileInCache()', () => {
    it('should return null for a file not in the cache', async () => {
      expect(await cache.getPathForFileInCache(dummyUrl, 'test.txt')).toBeNull();
    });

    it('should return an absolute path for a file in the cache', async () => {
      const cachePath = path.resolve(cacheDir, sanitizedDummyUrl, 'test.txt');
      await fs.outputFile(cachePath, 'dummy data');
      expect(await cache.getPathForFileInCache(dummyUrl, 'test.txt')).toEqual(cachePath);
    });
  });

  describe('putFileInCache()', () => {
    it('should throw an error if the provided file path does not exist', async () => {
      const fakePath = path.resolve(__dirname, 'fake.file');
      await expect(cache.putFileInCache(dummyUrl, fakePath, 'fake.file')).rejects.toHaveProperty(
        'message',
        `ENOENT: no such file or directory, stat '${fakePath}'`,
      );
    });

    it('should delete the original file', async () => {
      const originalPath = path.resolve(cacheDir, sanitizedDummyUrl, 'original.txt');
      await fs.outputFile(originalPath, 'dummy data');
      await cache.putFileInCache(dummyUrl, originalPath, 'test.txt');
      expect(await fs.pathExists(originalPath)).toEqual(false);
    });

    it('should create a new file in the cache with exactly the same content', async () => {
      const originalPath = path.resolve(cacheDir, sanitizedDummyUrl, 'original.txt');
      await fs.outputFile(originalPath, 'example content');
      const cachePath = await cache.putFileInCache(dummyUrl, originalPath, 'test.txt');
      expect(cachePath.startsWith(cacheDir)).toEqual(true);
      expect(await fs.readFile(cachePath, 'utf8')).toEqual('example content');
    });

    it('should overwrite the file if it already exists in cache', async () => {
      const originalPath = path.resolve(cacheDir, 'original.txt');
      await fs.outputFile(originalPath, 'example content');
      await fs.outputFile(path.resolve(cacheDir, sanitizedDummyUrl, 'test.txt'), 'bad content');
      const cachePath = await cache.putFileInCache(dummyUrl, originalPath, 'test.txt');
      expect(cachePath.startsWith(cacheDir)).toEqual(true);
      expect(await fs.readFile(cachePath, 'utf8')).toEqual('example content');
    });
  });
});
