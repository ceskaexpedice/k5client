import { Component, OnInit, Input, OnChanges, SimpleChanges, ElementRef, HostListener, forwardRef, Output, EventEmitter } from '@angular/core';
import {
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  setYear,
  eachDay,
  getDate,
  getMonth,
  getYear,
  isSameDay,
  isSameMonth,
  isSameYear,
  format,
  getDay,
  subDays,
  addDays,
  setDay
} from 'date-fns';
import { ISlimScrollOptions } from 'ngx-slimscroll';
import { AppSettings } from '../services/app-settings';

@Component({
  selector: 'ng-datepicker',
  templateUrl: 'ng-datepicker.component.html',
  styleUrls: ['ng-datepicker.component.scss']
})
export class NgDatepickerComponent implements OnInit {
  @Input() date: Date;
  @Input() activeDays: number[];
  @Input() daysUrl;
  scrollOptions: ISlimScrollOptions;
  days: {
    date: Date;
    day: number;
    month: number;
    year: number;
    inThisMonth: boolean;
    isActive: boolean;
  }[];

  constructor(private elementRef: ElementRef, public appSettings: AppSettings) {
    this.scrollOptions = {
      barBackground: '#DFE3E9',
      gridBackground: '#FFFFFF',
      barBorderRadius: '3',
      gridBorderRadius: '3',
      barWidth: '6',
      gridWidth: '6',
      barMargin: '0',
      gridMargin: '0'
    };
  }

  ngOnInit() {
    this.init();
  }

  init(): void {
    const start = startOfMonth(this.date);
    const end = endOfMonth(this.date);
    this.days = eachDay(start, end).map(date => {
      return {
        date: date,
        day: getDate(date),
        month: getMonth(date),
        year: getYear(date),
        uuid: this.daysUrl[date.getDate() + ''],
        inThisMonth: true,
        isActive: this.activeDays.indexOf(date.getDate()) > -1
      };
    });
    let pre = getDay(start);
    if (pre === 0) {
      pre = 7;
    }
    for (let i = 1; i <= pre - 1; i++) {
      const date = subDays(start, i);
      this.days.unshift({
        date: date,
        day: getDate(date),
        month: getMonth(date),
        year: getYear(date),
        inThisMonth: false,
        isActive: false
      });
    }

    for (let i = 1; i < 42 - getDay(end); i++) {
      const date = addDays(end, i);
      this.days.push({
        date: date,
        day: getDate(date),
        month: getMonth(date),
        year: getYear(date),
        inThisMonth: false,
        isActive: false
      });
    }



  }

}
