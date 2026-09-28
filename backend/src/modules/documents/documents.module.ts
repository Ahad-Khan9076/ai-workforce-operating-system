import { Global, Module } from '@nestjs/common';
import { FileStorageService } from './storage/storage.interface.js';
import { UrlFileStorageService } from './storage/url-file-storage.service.js';

@Global()
@Module({
  providers: [
    {
      provide: FileStorageService,
      useClass: UrlFileStorageService,
    },
  ],
  exports: [FileStorageService],
})
export class DocumentsModule {}
