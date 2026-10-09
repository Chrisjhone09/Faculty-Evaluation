import { Component, Input } from '@angular/core';
import {
  LucideDynamicIcon, LucideLayoutDashboard, LucideUsers, LucideBuilding2, LucideBookOpen,
  LucideLayers, LucideClipboardList, LucideCalendar, LucideChartColumn, LucideStar,
  LucideMessageSquare, LucideFlag, LucideSearch, LucideFilter, LucidePlus, LucidePencil,
  LucideTrash2, LucideCheck, LucideX, LucideChevronDown, LucideChevronRight, LucideChevronLeft,
  LucideArrowLeft, LucideArrowUp, LucideArrowDown, LucideArrowUpDown, LucideMenu, LucideLogOut,
  LucideUpload, LucideDownload, LucideTriangleAlert, LucideCircleAlert, LucideInfo,
  LucideCircleCheck, LucideClock, LucideSparkles, LucideEye, LucideEyeOff,
  LucideExternalLink, LucideInbox, LucideGraduationCap, LucideEllipsis, LucideRefreshCw, LucideCamera,
} from '@lucide/angular';

const ICONS = {
  dashboard: LucideLayoutDashboard, users: LucideUsers, building: LucideBuilding2,
  book: LucideBookOpen, layers: LucideLayers, clipboard: LucideClipboardList,
  calendar: LucideCalendar, chart: LucideChartColumn, star: LucideStar,
  message: LucideMessageSquare, flag: LucideFlag, search: LucideSearch, filter: LucideFilter,
  plus: LucidePlus, edit: LucidePencil, trash: LucideTrash2, check: LucideCheck, x: LucideX,
  'chevron-down': LucideChevronDown, 'chevron-right': LucideChevronRight,
  'chevron-left': LucideChevronLeft, 'arrow-left': LucideArrowLeft, 'arrow-up': LucideArrowUp,
  'arrow-down': LucideArrowDown, sort: LucideArrowUpDown, menu: LucideMenu, logout: LucideLogOut,
  upload: LucideUpload, download: LucideDownload, 'alert-triangle': LucideTriangleAlert,
  'alert-circle': LucideCircleAlert, info: LucideInfo, 'check-circle': LucideCircleCheck,
  clock: LucideClock, sparkles: LucideSparkles, eye: LucideEye, 'eye-off': LucideEyeOff,
  external: LucideExternalLink, inbox: LucideInbox, graduation: LucideGraduationCap,
  more: LucideEllipsis, refresh: LucideRefreshCw, camera: LucideCamera,
};
export type IconName = keyof typeof ICONS;

@Component({
  selector: 'app-icon',
  imports: [LucideDynamicIcon],
  template: `
    <svg [lucideIcon]="icons[name]" [size]="sizes[size]" [attr.aria-hidden]="label ? null : 'true'"
      [attr.role]="label ? 'img' : null" [attr.aria-label]="label"></svg>
  `,
  styles: [':host { display: inline-flex; flex-shrink: 0; align-items: center; }'],
})
export class Icon {
  @Input({ required: true }) name: IconName = 'info';
  @Input() size: 'sm' | 'md' | 'lg' | 'xl' = 'md';
  @Input() label?: string;
  protected readonly icons = ICONS;
  protected readonly sizes = { sm: 14, md: 16, lg: 20, xl: 24 };
}
