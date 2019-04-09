import { Component, OnInit, Input } from '@angular/core';
import { MzBaseModal } from 'ngx-materialize';

@Component({
  selector: 'app-dialog-ocr',
  templateUrl: './dialog-ocr.component.html'
})
export class DialogOcrComponent extends MzBaseModal {
  @Input() ocr: string;
  @Input() ocr2: string;
  @Input() citation: string;
  @Input() error: boolean;

}
