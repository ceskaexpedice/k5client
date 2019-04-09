import { DomSanitizer } from '@angular/platform-browser';
import { KrameriusApiService } from './../../../services/kramerius-api.service';
import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-result-card',
  templateUrl: './result-card.component.html',
  styleUrls: ['./result-card.component.scss']
})
export class ResultCardComponent implements OnInit {
  @Input() item;

  constructor(private krameriusApiService: KrameriusApiService,
              private _sanitizer: DomSanitizer) { }

  ngOnInit() {
  }

  getThumb() {
    const url = this.krameriusApiService.getThumbUrl(this.item.PID);
    return this._sanitizer.bypassSecurityTrustStyle(`url(${url})`);
  }

  getUrl() {
    if (this.item['fedora.model'] === 'periodical') {
      return `/periodical/${this.item['PID']}`;
    } else {
      return `/view/${this.item['PID']}`;
    }
  }

}
