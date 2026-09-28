import { BadRequestException, Injectable } from '@nestjs/common';
import {
  FileStorageService,
  type StoredFileReference,
} from './storage.interface.js';

@Injectable()
export class UrlFileStorageService extends FileStorageService {
  validateExternalUrl(fileUrl: string) {
    try {
      const url = new URL(fileUrl);
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('invalid protocol');
      }
    } catch {
      throw new BadRequestException('fileUrl must be a valid http(s) URL');
    }
  }

  async resolveFileUrl(input: {
    fileUrl?: string;
    storageKey?: string;
  }): Promise<StoredFileReference> {
    if (input.fileUrl) {
      this.validateExternalUrl(input.fileUrl);
      return {
        fileUrl: input.fileUrl,
        storageKey: input.storageKey ?? input.fileUrl,
      };
    }

    if (input.storageKey) {
      return {
        storageKey: input.storageKey,
        fileUrl: input.storageKey,
      };
    }

    throw new BadRequestException('fileUrl or storageKey is required');
  }
}
