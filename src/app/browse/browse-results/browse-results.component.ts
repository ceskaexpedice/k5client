import { AppSettings } from './../../services/app-settings';
import { BrowseService } from './../../services/browse.service';
import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'app-browse-results',
  templateUrl: './browse-results.component.html'
})
export class BrowseResultsComponent implements OnInit {

  constructor(public browseService: BrowseService, public appSettings: AppSettings) {
  }

  ngOnInit() {
  }
/*
 replaceChar(text:string, oldString:string, newString:string){
   while(text!=text.replace(oldString,newString)) {
     text=text.replace(oldString, newString);
   }
   return text;
 }

  replaceHTMLEntities(text): string {
    text=this.replaceChar(text, '&lt;','<');
    text=this.replaceChar(text, '&gt;','>');
    text=this.replaceChar(text, '&quot;','');
    text=this.replaceChar(text, '&apos;',"'");
    return text;
  }

  encodeUrlEntities(text) :string {
    text=this.replaceChar(text, '&lt;',"%3C");
    text=this.replaceChar(text, '&gt;',"%3E");
    text=this.replaceChar(text, '&quot;',"");
    text=this.replaceChar(text, '&apos;',"");
    return text;
  }
*/
//test na HTML entity - kvuli chybnemu zobrazovani
 containsHTMLEntities(text): boolean {
    if(text.match(/&lt;/g)) { return true; }
    else if(text.match(/&gt;/g)) { return true; }
    else if(text.match(/&quot;/g)) { return true; }
    else if(text.match(/&apos;/g)) { return true; }
    else { return false; }
 }

  getParams(value: string) {
    const params = {};
    params[this.browseService.query.category] = value;
    return params;
  }

}
