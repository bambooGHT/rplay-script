import { } from 'crypto-js';
declare global {
  var userData: {
    oid: string;
    token: string;
  };
  const showDirectoryPicker: (value: any) => Promise<FileSystemDirectoryHandle>;
  interface XMLHttpRequest {
    _url: string;
  }
}