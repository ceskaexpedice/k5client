import { SearchService } from './../../services/search.service';
import { Component, OnInit, Input } from '@angular/core';
import { CollectionService } from '../../services/collection.service';
import { AppSettings } from '../../services/app-settings';
import { AnalyticsService } from '../../services/analytics.service';

@Component({
  selector: 'app-search-filters',
  templateUrl: './search-filters.component.html'
})
export class SearchFiltersComponent implements OnInit {
  @Input() collapsedFilter: boolean;

  yearFrom: number;
  yearTo: number;
  filters: string[];

  constructor(public searchService: SearchService,
              public collectionService: CollectionService,
              public analytics: AnalyticsService,
              private appSettings: AppSettings) {
  }

  ngOnInit() {
    this.yearFrom = this.searchService.query.from;
    this.yearTo = this.searchService.query.to;
    this.filters = this.appSettings.filters;
  }

  onYearFromValueChanged() {
    if (!this.yearFrom || this.yearFrom < 0) {
      this.yearFrom = 0;
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
    this.analytics.sendEvent('search', 'year', this.yearFrom + '-' + this.yearTo);
    this.searchService.setYearRange(this.yearFrom, this.yearTo);
  }

}
