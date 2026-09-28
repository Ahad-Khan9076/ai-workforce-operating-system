export interface StoredFileReference {
  storageKey: string;
  fileUrl: string;
}

export abstract class FileStorageService {
  abstract resolveFileUrl(input: {
    fileUrl?: string;
    storageKey?: string;
  }): Promise<StoredFileReference>;

  abstract validateExternalUrl(fileUrl: string): void;
}
