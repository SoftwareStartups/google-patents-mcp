// declarations.d.ts
declare module 'winston' {
    interface Logger {
      error(message: string, ...meta: any[]): Logger;
      warn(message: string, ...meta: any[]): Logger;
      info(message: string, ...meta: any[]): Logger;
      http(message: string, ...meta: any[]): Logger;
      verbose(message: string, ...meta: any[]): Logger;
      debug(message: string, ...meta: any[]): Logger;
      silly(message: string, ...meta: any[]): Logger;
      // 他のメソッドシグネチャも必要に応じて追加
    }
  }