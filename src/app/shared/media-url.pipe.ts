import { Pipe, PipeTransform } from '@angular/core';
import { mediaUrl } from '../core/media-url.util';

@Pipe({ name: 'mediaUrl', standalone: true })
export class MediaUrlPipe implements PipeTransform {
  transform(path: string | null | undefined, width?: number): string {
    return mediaUrl(path, width);
  }
}
