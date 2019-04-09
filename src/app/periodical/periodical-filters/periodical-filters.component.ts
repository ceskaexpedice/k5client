import { PeriodicalService } from './../../services/periodical.service';
import { Component, OnInit } from '@angular/core';
import { AnalyticsService } from '../../services/analytics.service';

@Component({
  selector: 'app-periodical-filters',
  templateUrl: './periodical-filters.component.html'
})
export class PeriodicalFiltersComponent implements OnInit {

  yearFrom: number;
  yearTo: number;

  constructor(public periodicalService: PeriodicalService, public analytics: AnalyticsService) {
  }

  ngOnInit() {

    this.yearFrom = this.periodicalService.query.from;
    if(this.yearFrom==0) {this.yearFrom=1612;}
    this.yearTo = this.periodicalService.query.to;

    setTimeout(() => {
              if(this.periodicalService.minYear!=null && (this.yearFrom==0 || this.yearFrom==1612)) {this.yearFrom = this.periodicalService.minYear;}
        }, 1000);
  }


  onYearFromValueChanged() {

    if (!this.yearFrom || this.yearFrom < 0) {
      this.yearFrom = 0;
      if(this.periodicalService.minYear!=null) {this.yearFrom = this.periodicalService.minYear;}
    } else if (this.yearFrom > this.yearTo) {
      this.yearFrom = this.yearTo;
    }
  }

  onYearToValueChanged() {
    const currentYear = (new Date()).getFullYear();
    if (!this.yearTo || this.yearTo > currentYear) {
      this.yearTo = currentYear;
    } else if (this.yearTo < this.yearFrom) {
      this.yearTo = this.yearFrom;
    }
  }

  applyYearRange() {
    this.analytics.sendEvent('periodical', 'year', this.yearFrom + '-' + this.yearTo);
    this.periodicalService.setYearRange(this.yearFrom, this.yearTo);
  }





}
